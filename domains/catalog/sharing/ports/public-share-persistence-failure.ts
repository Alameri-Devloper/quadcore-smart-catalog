// Technology-neutral failure classes; no driver payload, cause, SQL or values.
export class PublicSharePersistenceFailure extends Error {
  constructor(readonly kind: "IntegrityFailure" | "ServiceUnavailable" | "SerializationConflict" | "DeadlockConflict") {
    super(kind);
    this.name = "PublicSharePersistenceFailure";
  }
}
