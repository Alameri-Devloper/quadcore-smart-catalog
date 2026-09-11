import type { BranchDraft, BranchFieldErrors, BranchManagementResult, BranchManagementState, BranchManagementView, WorkspaceBranchPort } from "./branch-management.types";

export const initialBranchManagementState = (): BranchManagementState => ({
  list: { type: "Idle" }, editor: { type: "Closed" }, pending: false, failure: null, fields: {}, saved: false,
});
const draftOf = (branch: BranchManagementView): BranchDraft => ({ code: branch.code, displayName: branch.displayName, sortOrder: String(branch.sortOrder), status: branch.status });
/** Form syntax only. The server validates and normalizes Branch business values. */
export const branchDraftErrors = (draft: BranchDraft, create: boolean): BranchFieldErrors => ({
  ...(create && !draft.code.trim() ? { code: "required" as const } : {}),
  ...(!draft.displayName.trim() ? { displayName: "required" as const } : {}),
  ...(!draft.sortOrder.trim() || !Number.isSafeInteger(Number(draft.sortOrder)) ? { sortOrder: "numberRequired" as const } : {}),
});

export class BranchManagementCoordinator {
  private state = initialBranchManagementState();
  private disposed = false;
  private expired = false;
  private listRequest?: AbortController;
  private editorRequest?: AbortController;
  private mutationRequest?: AbortController;
  constructor(private readonly port: WorkspaceBranchPort, private readonly callbacks: {
    readonly onChange: (state: BranchManagementState) => void;
    readonly onAuthenticationRequired: () => void;
  }) {}
  get snapshot() { return this.state; }
  private publish(patch: Partial<BranchManagementState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch };
    this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, active: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === active;
  }
  private authenticate<T>(result: BranchManagementResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.listRequest?.abort(); this.editorRequest?.abort(); this.mutationRequest?.abort();
    this.publish({ ...initialBranchManagementState(), list: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true;
    this.callbacks.onAuthenticationRequired();
    return true;
  }
  async loadList() {
    if (this.disposed || this.expired) return;
    this.listRequest?.abort();
    const request = this.listRequest = new AbortController();
    this.publish({ list: { type: "Loading" } });
    const result = await this.port.list(request.signal);
    if (!this.current(request, this.listRequest) || this.authenticate(result)) return;
    this.publish({ list: result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind } });
  }
  createDraft() {
    if (this.state.pending || this.disposed || this.expired) return;
    this.editorRequest?.abort();
    this.publish({ editor: { type: "Create", draft: { code: "", displayName: "", sortOrder: "0", status: "Active" } }, failure: null, fields: {}, saved: false });
  }
  async select(branchId: string) {
    if (this.state.pending || this.disposed || this.expired) return;
    this.editorRequest?.abort();
    this.publish({ editor: { type: "Edit", branchId, detail: { type: "Idle" }, draft: null, reviewRequired: false }, failure: null, fields: {}, saved: false });
    await this.loadDetail();
  }
  async loadDetail() {
    const editor = this.state.editor;
    if (editor.type !== "Edit" || this.disposed || this.expired) return;
    this.editorRequest?.abort();
    const request = this.editorRequest = new AbortController();
    this.publish({ editor: { ...editor, detail: { type: "Loading" } } });
    const result = await this.port.get(editor.branchId, request.signal);
    if (!this.current(request, this.editorRequest) || this.authenticate(result)) return;
    const current = this.state.editor;
    if (current.type !== "Edit" || current.branchId !== editor.branchId) return;
    this.publish({ editor: { ...current,
      detail: result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind },
      draft: current.draft ?? (result.ok ? draftOf(result.value) : null) } });
  }
  changeDraft(patch: Partial<Pick<BranchDraft, "code" | "displayName" | "sortOrder" | "status">>) {
    const editor = this.state.editor;
    if (this.state.pending || editor.type === "Closed" || !editor.draft) return;
    const draft = { ...editor.draft, ...patch, ...(editor.type === "Edit" ? { code: editor.draft.code } : {}) };
    this.publish({ editor: { ...editor, draft }, fields: {}, failure: null, saved: false });
  }
  cancel() {
    if (this.state.pending) return;
    this.editorRequest?.abort();
    this.publish({ editor: { type: "Closed" }, failure: null, fields: {}, saved: false });
  }
  reviewLatest() {
    const editor = this.state.editor;
    if (this.state.pending || editor.type !== "Edit" || editor.detail.type !== "Ready" || !editor.reviewRequired) return;
    this.publish({ editor: { ...editor, reviewRequired: false }, failure: null });
  }
  async submit() {
    const editor = this.state.editor;
    if (this.disposed || this.expired || this.state.pending || editor.type === "Closed" || !editor.draft) return;
    if (editor.type === "Edit" && (editor.detail.type !== "Ready" || editor.reviewRequired)) return;
    const expectedRevision = editor.type === "Edit" && editor.detail.type === "Ready" ? editor.detail.value.revision : null;
    const fields = branchDraftErrors(editor.draft, editor.type === "Create");
    if (Object.keys(fields).length) { this.publish({ fields, saved: false }); return; }
    const request = this.mutationRequest = new AbortController();
    this.publish({ pending: true, fields: {}, failure: null, saved: false });
    const draft = editor.draft;
    const result = editor.type === "Create"
      ? await this.port.create({ code: draft.code, displayName: draft.displayName, sortOrder: Number(draft.sortOrder) }, request.signal)
      : await this.port.update(editor.branchId, { displayName: draft.displayName, sortOrder: Number(draft.sortOrder), status: draft.status,
        expectedRevision: expectedRevision! }, request.signal);
    if (!this.current(request, this.mutationRequest) || this.authenticate(result)) return;
    if (result.ok) {
      // Never synthesize a revision or timestamp, or replay a completed write if refresh fails.
      this.publish({ saved: true, editor: editor.type === "Create" ? { type: "Closed" }
        : { ...editor, draft: null, detail: { type: "Idle" }, reviewRequired: false } });
      await Promise.all([this.loadList(), ...(editor.type === "Edit" ? [this.loadDetail()] : [])]);
    } else {
      this.publish({ failure: result.kind });
      if (editor.type === "Edit" && result.kind === "Conflict") {
        this.publish({ editor: { ...editor, detail: { type: "Idle" }, reviewRequired: true } });
        await this.loadDetail();
      }
    }
    if (this.current(request, this.mutationRequest)) this.publish({ pending: false });
  }
  dispose() {
    this.disposed = true;
    this.listRequest?.abort(); this.editorRequest?.abort(); this.mutationRequest?.abort();
    this.state = initialBranchManagementState();
  }
}
