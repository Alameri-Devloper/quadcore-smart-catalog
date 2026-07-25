import { ProductMediaFinalKey, ProductMediaStorageRootKey } from "./product-media-keys";

export type ProductMediaSlot =
  | { readonly type: "Main" }
  | { readonly type: "Gallery"; readonly slotNumber: number };

export const ProductMediaSlots = Object.freeze({
  main(): ProductMediaSlot {
    return Object.freeze({ type: "Main" });
  },
  gallery(slotNumber: number): ProductMediaSlot {
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 99) {
      throw new Error("Gallery slot number must be an integer from 1 through 99.");
    }
    return Object.freeze({ type: "Gallery", slotNumber });
  },
  fileName(slot: ProductMediaSlot): string {
    return slot.type === "Main" ? "main.webp" : `gallery-${String(slot.slotNumber).padStart(2, "0")}.webp`;
  },
  storageKey(root: ProductMediaStorageRootKey, slot: ProductMediaSlot): ProductMediaFinalKey {
    return ProductMediaFinalKey.fromSlot(root, slot);
  },
});
