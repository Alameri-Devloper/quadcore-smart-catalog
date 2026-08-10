import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { ChallengeId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { WorkspaceBootstrapUseCase } from "./workspace-bootstrap.use-case";
import { ActivateAccountUseCase } from "./account-lifecycle.use-cases";
import {
  ChangeWorkspaceMemberBranchScopeUseCase,
  ChangeWorkspaceMemberPermissionsUseCase,
  CreateWorkspaceMemberUseCase,
  DemoteWorkspaceOwnerToStaffUseCase,
  GetWorkspaceCommunicationSettingsUseCase,
  GetWorkspaceMemberDetailsUseCase,
  ListWorkspaceMembersUseCase,
  PromoteWorkspaceMemberToOwnerUseCase,
  ReactivateWorkspaceMemberUseCase,
  SuspendWorkspaceMemberUseCase,
  UpdateWorkspaceMemberProfileUseCase,
  UpdateWorkspaceMemberWhatsAppUseCase,
  UpdateWorkspaceCommunicationSettingsUseCase,
} from "./member-administration.use-cases";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher } from "./ports";
import { PasswordHash } from "../domain/password";
import { ownerEffectivePermissionCodes } from "../domain/permission";
import { ServerSession } from "../domain/session";
import { PasswordRecoveryChallenge } from "../domain/password-recovery-challenge";
import { InMemoryIdentityUnitOfWork } from "../mock/in-memory-identity-unit-of-work";

class TestClock implements IdentityClock {
  constructor(private value = new Date("2026-08-09T00:00:00.000Z")) {}
  now(): Date { return new Date(this.value); }
  tick(): void { this.value = new Date(this.value.getTime() + 1); }
}

class TestIdentifiers implements IdentityIdentifierGenerator {
  workspace = 0; actor = 0; challenge = 0;
  workspaceId(): string { return `workspace-${++this.workspace}`; }
  actorId(): string { return `actor-${++this.actor}`; }
  challengeId(): string { return `challenge-${++this.challenge}`; }
}

class TestHasher implements PasswordHasher {
  async hash(value: string): Promise<PasswordHash> {
    return PasswordHash.rehydrate(`test$${createHash("sha256").update(value).digest("hex")}`);
  }
  async verify(value: string, hash: PasswordHash): Promise<boolean> { return (await this.hash(value)).value === hash.value; }
  needsRehash(): boolean { return false; }
}

const bootstrapInput = (code: string, phone: string) => ({
  companyId: `company-${code}`,
  workspaceCode: code,
  workspaceDisplayName: `Workspace ${code}`,
  ownerUsername: `owner.${code}`,
  ownerDisplayName: "Initial Owner",
  ownerRecoveryPhone: phone,
  temporaryPassword: "Owner temporary 123",
});

const fixture = () => {
  const unitOfWork = new InMemoryIdentityUnitOfWork();
  const clock = new TestClock();
  const identifiers = new TestIdentifiers();
  const hasher = new TestHasher();
  return {
    unitOfWork, clock, identifiers, hasher,
    bootstrap: new WorkspaceBootstrapUseCase(unitOfWork, hasher, clock, identifiers),
    activate: new ActivateAccountUseCase(unitOfWork, hasher, clock),
    create: new CreateWorkspaceMemberUseCase(unitOfWork, hasher, clock, identifiers),
    profile: new UpdateWorkspaceMemberProfileUseCase(unitOfWork, clock),
    whatsapp: new UpdateWorkspaceMemberWhatsAppUseCase(unitOfWork, clock),
    permissions: new ChangeWorkspaceMemberPermissionsUseCase(unitOfWork, clock),
    branches: new ChangeWorkspaceMemberBranchScopeUseCase(unitOfWork, clock),
    promote: new PromoteWorkspaceMemberToOwnerUseCase(unitOfWork, clock),
    demote: new DemoteWorkspaceOwnerToStaffUseCase(unitOfWork, clock),
    suspend: new SuspendWorkspaceMemberUseCase(unitOfWork, clock),
    reactivate: new ReactivateWorkspaceMemberUseCase(unitOfWork, hasher, clock),
    list: new ListWorkspaceMembersUseCase(unitOfWork),
    details: new GetWorkspaceMemberDetailsUseCase(unitOfWork),
    getSettings: new GetWorkspaceCommunicationSettingsUseCase(unitOfWork),
    updateSettings: new UpdateWorkspaceCommunicationSettingsUseCase(unitOfWork, clock),
  };
};

const ownerContext = (workspaceId: string, actorId: string): TrustedActorContext => Object.freeze({
  workspaceId, actorId, role: "Owner", permissions: ownerEffectivePermissionCodes(),
  branchScope: Object.freeze({ type: "AllBranches" as const }), authorizationVersion: 1,
});

const activate = async (test: ReturnType<typeof fixture>, workspaceId: string, actorId: string, password: string) => {
  test.clock.tick();
  assert.ok((await test.activate.execute({ workspaceId, actorId, newPermanentPassword: password })).ok);
};

describe("Owner-managed Workspace members", () => {
  it("creates Staff with normalized permissions, selected Branch IDs, profile, and temporary credential", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    await activate(test, owner.value.workspaceId, owner.value.actorId, "Owner permanent 123");
    const workspaceId = WorkspaceId.create(owner.value.workspaceId);
    test.unitOfWork.state.branchReferences.set(`${owner.value.workspaceId}\0branch-a`, Object.freeze({
      workspaceId, branchId: "branch-a", status: "Active",
    }));
    test.clock.tick();
    const created = await test.create.execute({
      context: ownerContext(owner.value.workspaceId, owner.value.actorId),
      username: "staff.one", displayName: "Catalog Staff", whatsappPhoneE164: "+967722222222", locale: "en",
      role: "Staff", permissionCodes: ["pricing.view", "catalog.product.create"],
      branchScope: { type: "SelectedBranches", branchIds: ["branch-a"] }, temporaryPassword: "Staff temporary 123",
    });
    assert.ok(created.ok);
    if (!created.ok) return;
    const membership = test.unitOfWork.state.memberships.get(`${owner.value.workspaceId}\0${created.value.actorId}`)!;
    const credential = test.unitOfWork.state.credentials.get(`${owner.value.workspaceId}\0${created.value.actorId}`)!;
    assert.deepEqual(membership.permissionCodes, ["catalog.product.create", "pricing.view"]);
    assert.deepEqual(membership.branchIds, ["branch-a"]);
    assert.equal(membership.branchScope, "SelectedBranches");
    assert.equal(credential.lifecycle, "Temporary");
    assert.equal(test.unitOfWork.state.accounts.get(`${owner.value.workspaceId}\0${created.value.actorId}`)!.status, "PendingActivation");
    assert.equal(JSON.stringify(test.unitOfWork.state.audits).includes("Staff temporary 123"), false);
  });

  it("enforces permission/Branch validation and Workspace-scoped WhatsApp uniqueness", async () => {
    const test = fixture();
    const first = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    const second = await test.bootstrap.execute(bootstrapInput("store-02", "+967711111111"));
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    const context = ownerContext(first.value.workspaceId, first.value.actorId);
    assert.deepEqual(await test.create.execute({
      context, username: "staff.one", displayName: "Staff", whatsappPhoneE164: "+967711111111", locale: "ar",
      role: "Staff", permissionCodes: [], branchScope: { type: "AllBranches" }, temporaryPassword: "Staff temporary 123",
    }), { ok: false, error: "WhatsAppAlreadyInUse" });
    assert.deepEqual(await test.create.execute({
      context, username: "staff.two", displayName: "Staff", whatsappPhoneE164: "+967733333333", locale: "ar",
      role: "Staff", permissionCodes: ["unknown.permission"], branchScope: { type: "AllBranches" }, temporaryPassword: "Staff temporary 123",
    }), { ok: false, error: "InvalidPermissionCode" });
    assert.deepEqual(await test.create.execute({
      context, username: "staff.three", displayName: "Staff", whatsappPhoneE164: "+967744444444", locale: "ar",
      role: "Staff", permissionCodes: [], branchScope: { type: "SelectedBranches", branchIds: [] }, temporaryPassword: "Staff temporary 123",
    }), { ok: false, error: "InvalidBranchScope" });
  });

  it("scopes selected Branch validation to the trusted Workspace without disclosing foreign references", async () => {
    const test = fixture();
    const first = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    const second = await test.bootstrap.execute(bootstrapInput("store-02", "+967722222222"));
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    const firstWorkspaceId = WorkspaceId.create(first.value.workspaceId);
    const secondWorkspaceId = WorkspaceId.create(second.value.workspaceId);
    test.unitOfWork.state.branchReferences.set(`${first.value.workspaceId}\0branch-01`, Object.freeze({
      workspaceId: firstWorkspaceId, branchId: "branch-01", status: "Active",
    }));
    test.unitOfWork.state.branchReferences.set(`${second.value.workspaceId}\0branch-01`, Object.freeze({
      workspaceId: secondWorkspaceId, branchId: "branch-01", status: "Active",
    }));
    test.unitOfWork.state.branchReferences.set(`${second.value.workspaceId}\0foreign-only-branch`, Object.freeze({
      workspaceId: secondWorkspaceId, branchId: "foreign-only-branch", status: "Active",
    }));
    test.unitOfWork.state.branchReferences.set(`${first.value.workspaceId}\0inactive-branch`, Object.freeze({
      workspaceId: firstWorkspaceId, branchId: "inactive-branch", status: "Inactive",
    }));
    const createSelected = (username: string, phone: string, branchId: string) => test.create.execute({
      context: ownerContext(first.value.workspaceId, first.value.actorId),
      username,
      displayName: username,
      whatsappPhoneE164: phone,
      locale: "en",
      role: "Staff",
      permissionCodes: [],
      branchScope: { type: "SelectedBranches", branchIds: [branchId] },
      temporaryPassword: "Staff temporary 123",
    });

    assert.ok((await createSelected("staff.same", "+967733333331", "branch-01")).ok);
    assert.deepEqual(await createSelected("staff.foreign", "+967733333332", "foreign-only-branch"), {
      ok: false, error: "BranchNotFound",
    });
    assert.deepEqual(await createSelected("staff.missing", "+967733333333", "missing-branch"), {
      ok: false, error: "BranchNotFound",
    });
    assert.deepEqual(await createSelected("staff.inactive", "+967733333334", "inactive-branch"), {
      ok: false, error: "BranchInactive",
    });
  });

  it("increments authorization once, revokes sessions, and derives Owner permissions after promotion", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const context = ownerContext(owner.value.workspaceId, owner.value.actorId);
    const staff = await test.create.execute({
      context, username: "staff.one", displayName: "Staff", whatsappPhoneE164: "+967722222222", locale: "ar",
      role: "Staff", permissionCodes: ["catalog.product.create"], branchScope: { type: "AllBranches" }, temporaryPassword: "Staff temporary 123",
    });
    assert.ok(staff.ok);
    if (!staff.ok) return;
    const key = `${owner.value.workspaceId}\0${staff.value.actorId}`;
    const membership = test.unitOfWork.state.memberships.get(key)!;
    const credential = test.unitOfWork.state.credentials.get(key)!;
    test.unitOfWork.state.sessions.set(`${owner.value.workspaceId}\0session-a`, ServerSession.create({
      workspaceId: membership.workspaceId,
      sessionId: SessionId.create("session-a"),
      digest: { value: "a".repeat(64), keyVersion: 1 },
      actorId: membership.actorId,
      sessionClass: "Restricted",
      authorizationVersion: 1,
      passwordVersion: credential.passwordVersion,
      createdAt: test.clock.now(),
    }));
    test.clock.tick();
    assert.deepEqual(await test.permissions.execute({
      context, targetActorId: staff.value.actorId, permissionCodes: ["pricing.view"],
    }), { ok: true, value: { authorizationVersion: 2, revokedSessionCount: 1 } });
    assert.equal(test.unitOfWork.state.sessions.get(`${owner.value.workspaceId}\0session-a`)!.revocationReason, "AuthorizationChanged");
    test.unitOfWork.state.branchReferences.set(`${owner.value.workspaceId}\0branch-a`, Object.freeze({
      workspaceId: WorkspaceId.create(owner.value.workspaceId), branchId: "branch-a", status: "Active",
    }));
    test.unitOfWork.state.sessions.set(`${owner.value.workspaceId}\0session-b`, ServerSession.create({
      workspaceId: membership.workspaceId,
      sessionId: SessionId.create("session-b"),
      digest: { value: "b".repeat(64), keyVersion: 1 },
      actorId: membership.actorId,
      sessionClass: "Restricted",
      authorizationVersion: 2,
      passwordVersion: credential.passwordVersion,
      createdAt: test.clock.now(),
    }));
    test.clock.tick();
    assert.deepEqual(await test.branches.execute({
      context, targetActorId: staff.value.actorId,
      branchScope: { type: "SelectedBranches", branchIds: ["branch-a"] },
    }), { ok: true, value: { authorizationVersion: 3, revokedSessionCount: 1 } });
    test.clock.tick();
    const promoted = await test.promote.execute({ context, targetActorId: staff.value.actorId });
    assert.ok(promoted.ok);
    const details = await test.details.execute({ context, targetActorId: staff.value.actorId });
    assert.ok(details.ok);
    if (!details.ok) return;
    assert.equal(details.value.role, "Owner");
    assert.deepEqual(details.value.permissionCodes, ownerEffectivePermissionCodes());
    assert.deepEqual(test.unitOfWork.state.memberships.get(key)!.permissionCodes, []);
  });

  it("protects the last Active Owner and reactivates a suspended member with a new Temporary credential", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    await activate(test, owner.value.workspaceId, owner.value.actorId, "Owner permanent 123");
    const context = ownerContext(owner.value.workspaceId, owner.value.actorId);
    assert.deepEqual(await test.suspend.execute({ context, targetActorId: owner.value.actorId }), {
      ok: false, error: "LastActiveOwnerProtected",
    });
    const staff = await test.create.execute({
      context, username: "staff.one", displayName: "Staff", whatsappPhoneE164: "+967722222222", locale: "ar",
      role: "Staff", permissionCodes: [], branchScope: { type: "AllBranches" }, temporaryPassword: "Staff temporary 123",
    });
    assert.ok(staff.ok);
    if (!staff.ok) return;
    await activate(test, owner.value.workspaceId, staff.value.actorId, "Staff permanent 123");
    test.clock.tick();
    assert.ok((await test.suspend.execute({ context, targetActorId: staff.value.actorId })).ok);
    const actorKey = `${owner.value.workspaceId}\0${staff.value.actorId}`;
    const previousVersion = test.unitOfWork.state.credentials.get(actorKey)!.passwordVersion;
    test.clock.tick();
    const reactivated = await test.reactivate.execute({
      context, targetActorId: staff.value.actorId, newTemporaryPassword: "Replacement temporary 123",
    });
    assert.ok(reactivated.ok);
    assert.equal(test.unitOfWork.state.accounts.get(actorKey)!.status, "Active");
    assert.equal(test.unitOfWork.state.credentials.get(actorKey)!.lifecycle, "Temporary");
    assert.equal(test.unitOfWork.state.credentials.get(actorKey)!.passwordVersion, previousVersion + 1);
  });

  it("updates profile/WhatsApp without authorization drift or phone-only session revocation", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const context = ownerContext(owner.value.workspaceId, owner.value.actorId);
    const memberKey = `${owner.value.workspaceId}\0${owner.value.actorId}`;
    const ownerMembership = test.unitOfWork.state.memberships.get(memberKey)!;
    const ownerCredential = test.unitOfWork.state.credentials.get(memberKey)!;
    test.unitOfWork.state.sessions.set(`${owner.value.workspaceId}\0profile-session`, ServerSession.create({
      workspaceId: ownerMembership.workspaceId,
      sessionId: SessionId.create("profile-session"),
      digest: { value: "c".repeat(64), keyVersion: 1 },
      actorId: ownerMembership.actorId,
      sessionClass: "Restricted",
      authorizationVersion: ownerMembership.authorizationVersion,
      passwordVersion: ownerCredential.passwordVersion,
      createdAt: test.clock.now(),
    }));
    test.unitOfWork.state.challenges.set(`${owner.value.workspaceId}\0challenge-phone`, PasswordRecoveryChallenge.create({
      workspaceId: ownerMembership.workspaceId,
      challengeId: ChallengeId.create("challenge-phone"),
      actorId: ownerMembership.actorId,
      channel: "PrimaryRecoveryContact",
      destinationVersion: 1,
      digest: { value: "d".repeat(64), keyVersion: 1 },
      createdAt: test.clock.now(),
    }));
    const before = test.unitOfWork.state.memberships.get(`${owner.value.workspaceId}\0${owner.value.actorId}`)!.authorizationVersion;
    test.clock.tick();
    assert.ok((await test.profile.execute({ context, targetActorId: owner.value.actorId, displayName: "Renamed Owner", locale: "en" })).ok);
    test.clock.tick();
    const changed = await test.whatsapp.execute({ context, targetActorId: owner.value.actorId, whatsappPhoneE164: "+967733333333" });
    assert.deepEqual(changed, { ok: true, value: { recoveryContactVersion: 2 } });
    assert.equal(test.unitOfWork.state.memberships.get(`${owner.value.workspaceId}\0${owner.value.actorId}`)!.authorizationVersion, before);
    assert.equal(test.unitOfWork.state.sessions.get(`${owner.value.workspaceId}\0profile-session`)!.revokedAt, null);
    assert.equal(test.unitOfWork.state.challenges.get(`${owner.value.workspaceId}\0challenge-phone`)!.status, "Invalidated");
    const listed = await test.list.execute({ context });
    assert.ok(listed.ok);
    if (!listed.ok) return;
    assert.equal(listed.value[0]!.displayName, "Renamed Owner");
    assert.equal(listed.value[0]!.whatsappPhoneE164, "+967733333333");
  });

  it("requires explicit safe Staff state and protects the last Owner during demotion", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    await activate(test, owner.value.workspaceId, owner.value.actorId, "Owner permanent 123");
    const context = ownerContext(owner.value.workspaceId, owner.value.actorId);
    assert.deepEqual(await test.demote.execute({
      context, targetActorId: owner.value.actorId, permissionCodes: ["catalog.product.create"], branchScope: { type: "AllBranches" },
    }), { ok: false, error: "LastActiveOwnerProtected" });
  });

  it("updates Workspace communication settings without rewriting member WhatsApp profiles", async () => {
    const test = fixture();
    const owner = await test.bootstrap.execute(bootstrapInput("store-01", "+967711111111"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const context = ownerContext(owner.value.workspaceId, owner.value.actorId);
    test.clock.tick();
    assert.ok((await test.updateSettings.execute({
      context,
      defaultWhatsAppPhoneE164: "+967799999999",
      passwordRecoveryPolicy: "OwnerManagedOnly",
    })).ok);
    const settings = await test.getSettings.execute({ context });
    assert.ok(settings.ok);
    if (!settings.ok) return;
    assert.equal(settings.value.defaultWhatsAppPhoneE164, "+967799999999");
    assert.equal(settings.value.passwordRecoveryPolicy, "OwnerManagedOnly");
    assert.equal(
      test.unitOfWork.state.profiles.get(`${owner.value.workspaceId}\0${owner.value.actorId}`)!.recoveryPhone.value,
      "+967711111111",
    );
  });
});
