import assert from "node:assert/strict";
import { test } from "node:test";
import { detectSecretMaterial } from "../detect-secret-material";
import { sanitizeTextEvidence } from "../sanitize-text-evidence";

test("sanitizes credential URLs, bearer and package tokens, keys, and assignments", () => {
  const github = `ghp_${"A".repeat(30)}`;
  const npm = `npm_${"B".repeat(30)}`;
  const privateKey = `-----BEGIN ${"PRIVATE"} KEY-----\nraw-key\n-----END ${"PRIVATE"} KEY-----`;
  const authorization = `${"Author"}ization: Bearer bearer-secret`;
  const credentialUrl = `${"postgresql"}://${"user"}:${"secret"}@localhost/db`;
  const assignment = `${"DATABASE_"}PASSWORD=secret-value`;
  const raw = `${credentialUrl}\n${authorization}\n${github}\n${npm}\n${privateKey}\n${assignment}`;
  const result = sanitizeTextEvidence(raw);
  for (const secret of ["secret@", "bearer-secret", github, npm, "raw-key", "secret-value"]) {
    assert.equal(result.text.includes(secret), false);
  }
  assert.ok(result.byCategory.PASSWORD > 0);
  assert.ok(result.byCategory.PRIVATE_KEY > 0);
});

test("source detector reports categories without returning matched values", () => {
  const token = `ghp_${"C".repeat(30)}`;
  assert.deepEqual(detectSecretMaterial(token), ["GITHUB_TOKEN"]);
  assert.equal(detectSecretMaterial("ordinary source").length, 0);
});
