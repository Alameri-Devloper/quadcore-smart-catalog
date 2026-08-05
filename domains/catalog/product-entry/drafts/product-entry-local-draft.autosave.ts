import { productEntryLocalDraftStorageKey } from "./product-entry-local-draft.store";
import type {
  ProductEntryLocalDraftIdentity,
  ProductEntryLocalDraftSaveInput,
  SaveProductEntryLocalDraftResult,
} from "./product-entry-local-draft.types";

export interface ProductEntryLocalDraftVisibilitySource {
  readonly visibilityState: string;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

interface AutosaveEntry {
  latest: ProductEntryLocalDraftSaveInput;
  version: number;
  lastEnqueuedVersion: number;
  timer: ReturnType<typeof setTimeout> | null;
  chain: Promise<void>;
}

export interface ProductEntryLocalDraftAutosaveOptions {
  readonly debounceMs?: number;
  readonly onResult?: (result: SaveProductEntryLocalDraftResult) => void;
}

export class ProductEntryLocalDraftAutosaveCoordinator {
  private readonly entries = new Map<string, AutosaveEntry>();
  private readonly debounceMs: number;
  private disposed = false;

  constructor(
    private readonly save: (
      input: ProductEntryLocalDraftSaveInput,
    ) => Promise<SaveProductEntryLocalDraftResult>,
    private readonly options: ProductEntryLocalDraftAutosaveOptions = {},
  ) {
    const debounceMs = options.debounceMs ?? 500;
    if (!Number.isSafeInteger(debounceMs) || debounceMs < 0) {
      throw new Error("Product Entry local draft debounce must be a non-negative integer.");
    }
    this.debounceMs = debounceMs;
  }

  schedule(input: ProductEntryLocalDraftSaveInput): void {
    if (this.disposed) return;
    const key = productEntryLocalDraftStorageKey(input.identity);
    const entry = this.entries.get(key) ?? {
      latest: input,
      version: 0,
      lastEnqueuedVersion: 0,
      timer: null,
      chain: Promise.resolve(),
    };
    entry.latest = input;
    entry.version += 1;
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      this.enqueue(entry);
    }, this.debounceMs);
    this.entries.set(key, entry);
  }

  async flush(identity: ProductEntryLocalDraftIdentity): Promise<void> {
    const entry = this.entries.get(productEntryLocalDraftStorageKey(identity));
    if (!entry) return;
    if (entry.timer !== null) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    this.enqueue(entry);
    await entry.chain;
  }

  async flushAll(): Promise<void> {
    await Promise.all([...this.entries.values()].map(async (entry) => {
      if (entry.timer !== null) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      this.enqueue(entry);
      await entry.chain;
    }));
  }

  attachVisibilityFlush(source: ProductEntryLocalDraftVisibilitySource): () => void {
    const listener = () => {
      if (source.visibilityState === "hidden") void this.flushAll();
    };
    source.addEventListener("visibilitychange", listener);
    let attached = true;
    return () => {
      if (!attached) return;
      attached = false;
      source.removeEventListener("visibilitychange", listener);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.entries.values()) {
      if (entry.timer !== null) clearTimeout(entry.timer);
      entry.timer = null;
    }
  }

  private enqueue(entry: AutosaveEntry): void {
    if (this.disposed || entry.lastEnqueuedVersion === entry.version) return;
    const version = entry.version;
    const input = entry.latest;
    entry.lastEnqueuedVersion = version;
    entry.chain = entry.chain.then(async () => {
      if (this.disposed || version < entry.version) return;
      try {
        const result = await this.save(input);
        this.options.onResult?.(result);
      } catch {
        this.options.onResult?.({
          type: "Rejected",
          code: "LOCAL_DRAFT_STORAGE_UNAVAILABLE",
        });
      }
    });
  }
}
