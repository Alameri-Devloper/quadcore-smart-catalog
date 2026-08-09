import {
  ProductEntryLocalDraftAutosaveCoordinator,
  type ProductEntryLocalDraftVisibilitySource,
} from "./product-entry-local-draft.autosave";
import {
  AcceptProductEntryLocalDraftUseCase,
  DeleteProductEntryLocalDraftUseCase,
  GetRecoverableProductEntryLocalDraftUseCase,
  ProductEntryLocalDraftSessionService,
  SaveProductEntryLocalDraftUseCase,
} from "./product-entry-local-draft.use-cases";
import {
  PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS,
  type EditProductEntryLocalDraftIdentity,
  type AcceptProductEntryLocalDraftResult,
  type CreateProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftHeadlessContract,
  type ProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftMutationResult,
  type ProductEntryLocalDraftRestoreDecision,
  type ProductEntryLocalDraftSaveInput,
  type StartNewProductEntrySessionResult,
} from "./product-entry-local-draft.types";

export class ProductEntryLocalDraftController
  implements ProductEntryLocalDraftHeadlessContract {
  private state: ProductEntryLocalDraftHeadlessContract["draftState"] = "Idle";
  private decision: ProductEntryLocalDraftRestoreDecision | null = null;
  private readonly autosave: ProductEntryLocalDraftAutosaveCoordinator;
  private readonly listeners = new Set<() => void>();

  constructor(
    saveDraft: SaveProductEntryLocalDraftUseCase,
    private readonly getRecoverableDraft: GetRecoverableProductEntryLocalDraftUseCase,
    private readonly acceptDraft: AcceptProductEntryLocalDraftUseCase,
    private readonly deleteDraft: DeleteProductEntryLocalDraftUseCase,
    private readonly sessions: ProductEntryLocalDraftSessionService,
    debounceMs = 500,
  ) {
    this.autosave = new ProductEntryLocalDraftAutosaveCoordinator(
      (input) => saveDraft.execute(input),
      {
        debounceMs,
        onResult: (result) => {
          this.state = result.type === "Saved" ? "Saved" : "Unavailable";
          this.notify();
        },
      },
    );
  }

  get draftState(): ProductEntryLocalDraftHeadlessContract["draftState"] {
    return this.state;
  }

  get restoreDecision(): ProductEntryLocalDraftRestoreDecision | null {
    return this.decision;
  }

  async checkForRecovery(
    identity: ProductEntryLocalDraftIdentity,
    currentProductRevision?: number,
  ): Promise<ProductEntryLocalDraftRestoreDecision> {
    this.decision = await this.getRecoverableDraft.execute(identity, currentProductRevision);
    return this.decision;
  }

  saveDraft(input: ProductEntryLocalDraftSaveInput): void {
    this.state = "Saving";
    this.notify();
    this.autosave.schedule(input);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  flushDraft(identity: ProductEntryLocalDraftIdentity): Promise<void> {
    return this.autosave.flush(identity);
  }

  async discardDraft(
    identity: ProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftMutationResult> {
    const result = await this.deleteDraft.execute(
      identity,
      PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.userDiscarded,
    );
    if (result.type === "Completed") {
      this.state = "Idle";
      this.decision = null;
      this.notify();
    }
    return result;
  }

  async startNewProduct(
    identity: CreateProductEntryLocalDraftIdentity,
  ): Promise<StartNewProductEntrySessionResult> {
    const result = await this.sessions.startNewProduct(identity);
    if (result.type === "Started") {
      this.state = "Idle";
      this.decision = null;
      this.notify();
    }
    return result;
  }

  resolveRestoreDecision(accept: boolean): AcceptProductEntryLocalDraftResult {
    if (!this.decision) return { type: "NotAccepted" };
    const result = this.acceptDraft.execute(this.decision, accept);
    if (!accept) this.decision = null;
    return result;
  }

  attachVisibilityFlush(source: ProductEntryLocalDraftVisibilitySource): () => void {
    return this.autosave.attachVisibilityFlush(source);
  }

  async flushBeforeNavigation(): Promise<void> {
    await this.autosave.flushAll();
  }

  async flushBeforePhaseOne(): Promise<void> {
    await this.autosave.flushAll();
  }

  dispose(): void {
    this.autosave.dispose();
    this.listeners.clear();
  }

  async completeEditDraft(
    identity: EditProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftMutationResult> {
    const result = await this.deleteDraft.execute(
      identity,
      PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.editSessionCompleted,
    );
    if (result.type === "Completed") {
      this.state = "Idle";
      this.decision = null;
      this.notify();
    }
    return result;
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
