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
  type AcceptProductEntryLocalDraftResult,
  type CreateProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftHeadlessContract,
  type ProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftMutationResult,
  type ProductEntryLocalDraftRestoreDecision,
  type ProductEntryLocalDraftSaveInput,
} from "./product-entry-local-draft.types";

export class ProductEntryLocalDraftController
  implements ProductEntryLocalDraftHeadlessContract {
  private state: ProductEntryLocalDraftHeadlessContract["draftState"] = "Idle";
  private decision: ProductEntryLocalDraftRestoreDecision | null = null;
  private readonly autosave: ProductEntryLocalDraftAutosaveCoordinator;

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
    this.autosave.schedule(input);
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
    }
    return result;
  }

  async startNewProduct(
    identity: CreateProductEntryLocalDraftIdentity,
  ): Promise<CreateProductEntryLocalDraftIdentity | null> {
    const next = await this.sessions.startNewProduct(identity);
    if (next) {
      this.state = "Idle";
      this.decision = null;
    }
    return next;
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
  }
}
