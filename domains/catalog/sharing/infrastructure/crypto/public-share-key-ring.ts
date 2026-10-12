import { validatePublicSharePositiveVersion } from "../../domain/public-share-values";

export interface PublicShareKeyEntry {
  readonly version: number;
  readonly bytes: Uint8Array;
}

// Infrastructure-only; ECMAScript private fields also prevent diagnostic serialization.
export class PublicShareKeyRing {
  readonly #keys: ReadonlyMap<number, Buffer>;
  readonly #activeVersion: number;
  readonly purpose: "lookup" | "encryption";

  constructor(purpose: "lookup" | "encryption", entries: readonly PublicShareKeyEntry[], activeVersion: number) {
    try {
      validatePublicSharePositiveVersion(activeVersion);
      if ((purpose !== "lookup" && purpose !== "encryption") || entries.length < 1 || entries.length > 8
        || new Set(entries.map(({ version }) => version)).size !== entries.length) throw new Error();
      for (const entry of entries) {
        validatePublicSharePositiveVersion(entry.version);
        if (!(entry.bytes instanceof Uint8Array)
          || (purpose === "lookup" ? entry.bytes.length < 32 : entry.bytes.length !== 32)) throw new Error();
      }
      this.#keys = new Map(entries.map(({ version, bytes }) => [version, Buffer.from(bytes)]));
      if (!this.#keys.has(activeVersion)) throw new Error();
      this.#activeVersion = activeVersion;
      this.purpose = purpose;
    } catch { throw new Error("PublicShareKeyRingInvalid"); }
  }

  get activeVersion(): number { return this.#activeVersion; }
  versions(): readonly number[] { return Object.freeze([...this.#keys.keys()].sort((a, b) => a - b)); }
  key(version: number): Buffer | undefined {
    const bytes = this.#keys.get(version);
    return bytes ? Buffer.from(bytes) : undefined;
  }
  sharesMaterialWith(other: PublicShareKeyRing): boolean {
    return [...this.#keys.values()].some((bytes) => [...other.#keys.values()].some((candidate) => bytes.equals(candidate)));
  }
}
