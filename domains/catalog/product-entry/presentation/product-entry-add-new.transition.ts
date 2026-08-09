import type {
  CreateProductEntryLocalDraftIdentity,
  StartNewProductEntrySessionFailureCode,
  StartNewProductEntrySessionResult,
} from "../drafts/product-entry-local-draft.types";

export type ProductEntryAddNewTransitionResult =
  | { readonly type: "Started"; readonly identity: CreateProductEntryLocalDraftIdentity }
  | { readonly type: "Rejected"; readonly code: StartNewProductEntrySessionFailureCode }
  | { readonly type: "AlreadyInProgress" };

export class ProductEntryAddNewTransition {
  private inFlight = false;

  async execute(input: {
    readonly establishNextSession: () => Promise<StartNewProductEntrySessionResult>;
    readonly afterEstablished: (identity: CreateProductEntryLocalDraftIdentity) => void;
  }): Promise<ProductEntryAddNewTransitionResult> {
    if (this.inFlight) return { type: "AlreadyInProgress" };
    this.inFlight = true;
    try {
      const established = await input.establishNextSession()
        .catch((): StartNewProductEntrySessionResult => ({ type: "Rejected", code: "StorageUnavailable" }));
      if (established.type === "Rejected") return established;
      input.afterEstablished(established.identity);
      return established;
    } finally {
      this.inFlight = false;
    }
  }
}
