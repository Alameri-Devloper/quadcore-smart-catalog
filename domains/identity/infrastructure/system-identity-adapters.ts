import { randomUUID } from "node:crypto";
import type { IdentityClock, IdentityIdentifierGenerator, SessionIdentifierGenerator } from "../application/ports";

export class SystemIdentityClock implements IdentityClock {
  now(): Date { return new Date(); }
}

export class RandomIdentityIdentifierGenerator implements IdentityIdentifierGenerator {
  workspaceId(): string { return randomUUID(); }
  actorId(): string { return randomUUID(); }
  challengeId(): string { return randomUUID(); }
}

export class RandomSessionIdentifierGenerator implements SessionIdentifierGenerator {
  sessionId(): string { return randomUUID(); }
}
