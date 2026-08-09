import { randomUUID } from "node:crypto";
import type { IdentityClock, IdentityIdentifierGenerator } from "../application/ports";

export class SystemIdentityClock implements IdentityClock {
  now(): Date { return new Date(); }
}

export class RandomIdentityIdentifierGenerator implements IdentityIdentifierGenerator {
  workspaceId(): string { return randomUUID(); }
  actorId(): string { return randomUUID(); }
  challengeId(): string { return randomUUID(); }
}
