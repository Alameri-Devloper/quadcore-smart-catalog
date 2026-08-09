const requireIdentifier = (value: string, label: string): string => {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error(`${label} must be a non-empty canonical identifier.`);
  }
  return value;
};

export class WorkspaceId {
  private constructor(readonly value: string) {}

  static create(value: string): WorkspaceId {
    return Object.freeze(new WorkspaceId(requireIdentifier(value, "WorkspaceId")));
  }

  equals(other: WorkspaceId): boolean {
    return this.value === other.value;
  }
}

export class ActorId {
  private constructor(readonly value: string) {}

  static create(value: string): ActorId {
    return Object.freeze(new ActorId(requireIdentifier(value, "ActorId")));
  }

  equals(other: ActorId): boolean {
    return this.value === other.value;
  }
}

export class ChallengeId {
  private constructor(readonly value: string) {}

  static create(value: string): ChallengeId {
    return Object.freeze(new ChallengeId(requireIdentifier(value, "ChallengeId")));
  }

  equals(other: ChallengeId): boolean {
    return this.value === other.value;
  }
}
