import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";
import { PERMISSION_REGISTRY, ownerEffectivePermissionCodes, validateStaffPermissionCodes, PERMISSION_TEMPLATES } from "../../../identity/domain/permission";
const permission = "catalog.sharing.publicLink.manage";
it("permission is sensitive Catalog, explicitly Staff-assignable, Owner-derived and absent from existing templates", () => {
  const entry = PERMISSION_REGISTRY.find((definition) => definition.code === permission); assert.ok(entry); assert.equal(entry.module, "Catalog"); assert.equal(entry.sensitive, true); assert.equal(entry.assignableToStaff, true);
  assert.ok(ownerEffectivePermissionCodes().includes(permission)); assert.deepEqual(validateStaffPermissionCodes([permission]), [permission]);
  for (const template of PERMISSION_TEMPLATES) assert.ok(!(template.permissionCodes as readonly string[]).includes(permission));
});
it("migration adds exactly one permission and preserves predecessor schema and journal lineage", () => {
  const previous = JSON.parse(readFileSync("drizzle/meta/0017_snapshot.json", "utf8")), current = JSON.parse(readFileSync("drizzle/meta/0018_snapshot.json", "utf8"));
  const oldCheck = previous.tables["public.identity_membership_permissions"].checkConstraints.identity_membership_permissions_known_code.value as string;
  const newCheck = current.tables["public.identity_membership_permissions"].checkConstraints.identity_membership_permissions_known_code.value as string;
  const codes = (value: string) => [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(codes(newCheck), [...codes(oldCheck), permission].sort()); assert.equal(current.prevId, previous.id);
  const normalized = structuredClone(current); normalized.id = previous.id; normalized.prevId = previous.prevId;
  normalized.tables["public.identity_membership_permissions"].checkConstraints.identity_membership_permissions_known_code.value = oldCheck;
  assert.deepEqual(normalized, previous);
  const sql = readFileSync("drizzle/0018_public_share_manage_permission.sql", "utf8");
  assert.doesNotMatch(sql, /INSERT|DELETE|UPDATE|DROP TABLE/i); assert.equal((sql.match(/ALTER TABLE/g) ?? []).length, 2);
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")); assert.equal(journal.entries.find((entry: {idx:number}) => entry.idx === 18).idx, 18); assert.equal(journal.entries.find((entry: {idx:number}) => entry.idx === 18).tag, "0018_public_share_manage_permission");
});
