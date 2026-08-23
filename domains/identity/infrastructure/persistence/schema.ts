import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaceBranchReferences, workspaces } from "../../../workspace/infrastructure/persistence/schema";

export const identityAccounts = pgTable(
  "identity_accounts",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    username: text("username").notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_accounts_pk", columns: [table.workspaceId, table.actorId] }),
    foreignKey({
      name: "identity_accounts_workspace_fk",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.workspaceId],
    }).onDelete("restrict"),
    uniqueIndex("identity_accounts_workspace_username_uq").on(table.workspaceId, table.normalizedUsername),
    index("identity_accounts_login_lookup_idx").on(table.workspaceId, table.normalizedUsername, table.status),
    check("identity_accounts_username", sql`${table.username} ~ '^[A-Za-z0-9._-]{3,64}$'`),
    check("identity_accounts_normalized_username", sql`${table.normalizedUsername} ~ '^[a-z0-9._-]{3,64}$' AND ${table.normalizedUsername} = lower(${table.username})`),
    check("identity_accounts_status", sql`${table.status} IN ('PendingActivation','Active','Suspended')`),
    check("identity_accounts_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const identityPasswordCredentials = pgTable(
  "identity_password_credentials",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordLifecycle: text("password_lifecycle").notNull(),
    passwordVersion: bigint("password_version", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_password_credentials_pk", columns: [table.workspaceId, table.actorId] }),
    foreignKey({
      name: "identity_password_credentials_account_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityAccounts.workspaceId, identityAccounts.actorId],
    }).onDelete("cascade"),
    check("identity_password_credentials_hash", sql`length(${table.passwordHash}) BETWEEN 1 AND 1024`),
    check("identity_password_credentials_lifecycle", sql`${table.passwordLifecycle} IN ('Temporary','Permanent')`),
    check("identity_password_credentials_version", sql`${table.passwordVersion} BETWEEN 1 AND 9007199254740991`),
    check("identity_password_credentials_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const identityLoginProtection = pgTable(
  "identity_login_protection",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    failedAttemptCount: integer("failed_attempt_count").notNull(),
    failureWindowStartedAt: timestamp("failure_window_started_at", { withTimezone: true, mode: "date" }),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
    lockLevel: integer("lock_level").notNull(),
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_login_protection_pk", columns: [table.workspaceId, table.actorId] }),
    foreignKey({
      name: "identity_login_protection_account_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityAccounts.workspaceId, identityAccounts.actorId],
    }).onDelete("cascade"),
    index("identity_login_protection_locked_idx").on(table.workspaceId, table.lockedUntil),
    check("identity_login_protection_attempts", sql`${table.failedAttemptCount} BETWEEN 0 AND 4`),
    check("identity_login_protection_level", sql`${table.lockLevel} >= 0`),
    check("identity_login_protection_window_pair", sql`(${table.failedAttemptCount} = 0 AND ${table.failureWindowStartedAt} IS NULL) OR (${table.failedAttemptCount} > 0 AND ${table.failureWindowStartedAt} IS NOT NULL)`),
  ],
);

export const identityMemberProfiles = pgTable(
  "identity_member_profiles",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    displayName: text("display_name").notNull(),
    recoveryPhone: text("recovery_phone").notNull(),
    recoveryContactVersion: bigint("recovery_contact_version", { mode: "number" }).notNull(),
    locale: text("locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_member_profiles_pk", columns: [table.workspaceId, table.actorId] }),
    foreignKey({
      name: "identity_member_profiles_account_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityAccounts.workspaceId, identityAccounts.actorId],
    }).onDelete("restrict"),
    check("identity_member_profiles_display_name", sql`btrim(${table.displayName}) <> ''`),
    check("identity_member_profiles_phone", sql`${table.recoveryPhone} ~ '^\\+[1-9][0-9]{7,14}$'`),
    uniqueIndex("identity_member_profiles_workspace_phone_uq").on(table.workspaceId, table.recoveryPhone),
    check("identity_member_profiles_locale", sql`${table.locale} IN ('ar','en')`),
    check("identity_member_profiles_version", sql`${table.recoveryContactVersion} BETWEEN 1 AND 9007199254740991`),
    check("identity_member_profiles_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const identityMemberships = pgTable(
  "identity_memberships",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    role: text("role").notNull(),
    branchScope: text("branch_scope").notNull(),
    authorizationVersion: bigint("authorization_version", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_memberships_pk", columns: [table.workspaceId, table.actorId] }),
    foreignKey({
      name: "identity_memberships_profile_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityMemberProfiles.workspaceId, identityMemberProfiles.actorId],
    }).onDelete("restrict"),
    index("identity_memberships_role_idx").on(table.workspaceId, table.role),
    check("identity_memberships_role", sql`${table.role} IN ('Owner','Staff')`),
    check("identity_memberships_branch_scope", sql`${table.branchScope} IN ('AllBranches','SelectedBranches')`),
    check("identity_memberships_owner_scope", sql`${table.role} <> 'Owner' OR ${table.branchScope} = 'AllBranches'`),
    check("identity_memberships_authorization_version", sql`${table.authorizationVersion} BETWEEN 1 AND 9007199254740991`),
    check("identity_memberships_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const identityMembershipPermissions = pgTable(
  "identity_membership_permissions",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    permissionCode: text("permission_code").notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_membership_permissions_pk", columns: [table.workspaceId, table.actorId, table.permissionCode] }),
    foreignKey({
      name: "identity_membership_permissions_membership_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityMemberships.workspaceId, identityMemberships.actorId],
    }).onDelete("cascade"),
    check("identity_membership_permissions_known_code", sql`${table.permissionCode} IN (
      'catalog.referenceData.view','catalog.referenceData.manage',
      'catalog.product.create','catalog.product.edit','catalog.product-entry-submission.read',
      'catalog.product-entry-media.upload','catalog.product.reference-cost.read','catalog.products.view',
      'catalog.products.create','catalog.products.edit','catalog.products.archive','catalog.productEntry.submit',
      'catalog.productMedia.upload','catalog.productMedia.retry','catalog.productMedia.reconciliation.manage',
      'catalog.productMedia.source.replace','catalog.sharing.create','catalog.sharing.aiRecommendation.generate',
      'pricing.view','pricing.manage','pricing.wholesale.view','pricing.branchOverride.manage',
      'referenceCost.view','referenceCost.manage','referenceCost.branchOverride.manage',
      'inventory.availability.view','inventory.quantity.view','inventory.receive','inventory.issue',
      'inventory.reserve','inventory.transfer','inventory.damage','inventory.adjust',
      'workspace.settings.view','workspace.settings.manage','workspace.audit.view','workspace.branches.view'
    )`),
  ],
);

export const identityMembershipBranches = pgTable(
  "identity_membership_branches",
  {
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    branchId: text("branch_id").notNull(),
  },
  (table) => [
    primaryKey({ name: "identity_membership_branches_pk", columns: [table.workspaceId, table.actorId, table.branchId] }),
    foreignKey({
      name: "identity_membership_branches_membership_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityMemberships.workspaceId, identityMemberships.actorId],
    }).onDelete("cascade"),
    foreignKey({
      name: "identity_membership_branches_reference_fk",
      columns: [table.workspaceId, table.branchId],
      foreignColumns: [workspaceBranchReferences.workspaceId, workspaceBranchReferences.branchId],
    }).onDelete("restrict"),
  ],
);

export const identitySessions = pgTable(
  "identity_sessions",
  {
    workspaceId: text("workspace_id").notNull(),
    sessionId: text("session_id").notNull(),
    digest: text("token_hash").notNull(),
    digestKeyVersion: integer("token_key_version").notNull(),
    actorId: text("actor_id").notNull(),
    sessionClass: text("session_class").notNull(),
    authorizationVersion: bigint("authorization_version", { mode: "number" }).notNull(),
    passwordVersion: bigint("password_version", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull(),
    idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true, mode: "date" }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    primaryKey({ name: "identity_sessions_pk", columns: [table.workspaceId, table.sessionId] }),
    uniqueIndex("identity_sessions_token_hash_uq").on(table.digest),
    foreignKey({
      name: "identity_sessions_account_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityAccounts.workspaceId, identityAccounts.actorId],
    }).onDelete("cascade"),
    foreignKey({
      name: "identity_sessions_credential_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityPasswordCredentials.workspaceId, identityPasswordCredentials.actorId],
    }).onDelete("cascade"),
    foreignKey({
      name: "identity_sessions_membership_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityMemberships.workspaceId, identityMemberships.actorId],
    }).onDelete("cascade"),
    index("identity_sessions_token_lookup_idx").on(table.digestKeyVersion, table.digest),
    index("identity_sessions_actor_revocation_idx").on(table.workspaceId, table.actorId, table.revokedAt),
    index("identity_sessions_idle_cleanup_idx").on(table.idleExpiresAt),
    index("identity_sessions_absolute_cleanup_idx").on(table.absoluteExpiresAt),
    index("identity_sessions_revoked_cleanup_idx").on(table.revokedAt),
    check("identity_sessions_digest", sql`length(${table.digest}) = 64 AND ${table.digest} ~ '^[a-f0-9]{64}$' AND ${table.digestKeyVersion} >= 1`),
    check("identity_sessions_class", sql`${table.sessionClass} IN ('Restricted','Full')`),
    check("identity_sessions_versions", sql`${table.authorizationVersion} BETWEEN 1 AND 9007199254740991 AND ${table.passwordVersion} BETWEEN 1 AND 9007199254740991`),
    check("identity_sessions_expiry", sql`${table.createdAt} <= ${table.lastSeenAt} AND ${table.lastSeenAt} < ${table.idleExpiresAt} AND ${table.idleExpiresAt} <= ${table.absoluteExpiresAt}`),
    check("identity_sessions_revocation_pair", sql`(${table.revokedAt} IS NULL AND ${table.revocationReason} IS NULL) OR (${table.revokedAt} IS NOT NULL AND ${table.revocationReason} IS NOT NULL)`),
    check("identity_sessions_revocation_reason", sql`${table.revocationReason} IS NULL OR ${table.revocationReason} IN ('Logout','PasswordChanged','OwnerPasswordReset','RecoveryCompleted','AccountSuspended','AuthorizationChanged','ReplacedByNewSession','Expired','AdministrativeRevocation')`),
  ],
);

export const identityPasswordRecoveryChallenges = pgTable(
  "identity_password_recovery_challenges",
  {
    workspaceId: text("workspace_id").notNull(),
    challengeId: text("challenge_id").notNull(),
    actorId: text("actor_id").notNull(),
    channel: text("channel").notNull(),
    destinationVersion: bigint("destination_version", { mode: "number" }).notNull(),
    digest: text("digest").notNull(),
    digestKeyVersion: integer("digest_key_version").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    primaryKey({ name: "identity_password_recovery_challenges_pk", columns: [table.workspaceId, table.challengeId] }),
    uniqueIndex("identity_password_recovery_challenges_public_reference_uq").on(table.challengeId),
    foreignKey({
      name: "identity_password_recovery_challenges_account_fk",
      columns: [table.workspaceId, table.actorId],
      foreignColumns: [identityAccounts.workspaceId, identityAccounts.actorId],
    }).onDelete("cascade"),
    uniqueIndex("identity_password_recovery_challenges_one_open_uq")
      .on(table.workspaceId, table.actorId)
      .where(sql`${table.status} IN ('Active','Verified')`),
    index("identity_password_recovery_challenges_actor_idx").on(table.workspaceId, table.actorId, table.createdAt),
    index("identity_password_recovery_challenges_expiry_idx").on(table.workspaceId, table.status, table.expiresAt),
    check("identity_password_recovery_challenges_channel", sql`${table.channel} = 'PrimaryRecoveryContact'`),
    check("identity_password_recovery_challenges_destination_version", sql`${table.destinationVersion} BETWEEN 1 AND 9007199254740991`),
    check("identity_password_recovery_challenges_digest", sql`length(${table.digest}) = 64 AND ${table.digest} ~ '^[a-f0-9]{64}$' AND ${table.digestKeyVersion} >= 1`),
    check("identity_password_recovery_challenges_status", sql`${table.status} IN ('Active','Verified','Consumed','Invalidated','Expired')`),
    check("identity_password_recovery_challenges_attempts", sql`${table.attemptCount} BETWEEN 0 AND 5`),
    check("identity_password_recovery_challenges_expiry", sql`${table.expiresAt} > ${table.createdAt}`),
    check("identity_password_recovery_challenges_status_timestamps", sql`
      (${table.status} = 'Active' AND ${table.verifiedAt} IS NULL AND ${table.consumedAt} IS NULL AND ${table.invalidatedAt} IS NULL) OR
      (${table.status} = 'Verified' AND ${table.verifiedAt} IS NOT NULL AND ${table.consumedAt} IS NULL AND ${table.invalidatedAt} IS NULL) OR
      (${table.status} = 'Consumed' AND ${table.verifiedAt} IS NOT NULL AND ${table.consumedAt} IS NOT NULL AND ${table.invalidatedAt} IS NULL) OR
      (${table.status} = 'Invalidated' AND ${table.consumedAt} IS NULL AND ${table.invalidatedAt} IS NOT NULL) OR
      (${table.status} = 'Expired' AND ${table.consumedAt} IS NULL)
    `),
  ],
);
