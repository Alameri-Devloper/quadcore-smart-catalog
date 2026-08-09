import { systemProductEntryClock } from "../../ports/product-entry-clock.port";
import { ProductEntryLocalDraftController } from "../product-entry-local-draft.controller";
import {
  AcceptProductEntryLocalDraftUseCase,
  DeleteProductEntryLocalDraftUseCase,
  GetRecoverableProductEntryLocalDraftUseCase,
  ProductEntryLocalDraftSessionService,
  SaveProductEntryLocalDraftUseCase,
  browserProductEntrySubmissionIdAllocator,
} from "../product-entry-local-draft.use-cases";
import { IndexedDbProductEntryLocalDraftStore } from "./indexeddb-product-entry-local-draft.store";

export interface BrowserProductEntryLocalDraftRuntime {
  readonly controller: ProductEntryLocalDraftController;
  readonly sessions: ProductEntryLocalDraftSessionService;
  close(): void;
}

export const createBrowserProductEntryLocalDraftRuntime = (): BrowserProductEntryLocalDraftRuntime => {
  const store = new IndexedDbProductEntryLocalDraftStore();
  const save = new SaveProductEntryLocalDraftUseCase(store, systemProductEntryClock);
  const get = new GetRecoverableProductEntryLocalDraftUseCase(store, systemProductEntryClock);
  const accept = new AcceptProductEntryLocalDraftUseCase();
  const remove = new DeleteProductEntryLocalDraftUseCase(store);
  const sessions = new ProductEntryLocalDraftSessionService(browserProductEntrySubmissionIdAllocator, store);
  const controller = new ProductEntryLocalDraftController(save, get, accept, remove, sessions);
  return {
    controller,
    sessions,
    close() {
      controller.dispose();
      store.close();
    },
  };
};
