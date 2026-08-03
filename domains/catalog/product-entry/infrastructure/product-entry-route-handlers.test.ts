import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "../../../../app/api/catalog/product-entry-submissions/route";

const restoreEnvironmentValue = (name: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

describe("Product Entry Route Handlers", () => {
  it("fails closed with a stable sanitized response in Production before database or audit access", async () => {
    const previous = {
      nodeEnvironment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      workspaceId: process.env.QSC_TRUSTED_WORKSPACE_ID,
      actorId: process.env.QSC_TRUSTED_ACTOR_ID,
      permissions: process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS,
    };
    try {
      restoreEnvironmentValue("NODE_ENV", "production");
      delete process.env.DATABASE_URL;
      process.env.QSC_TRUSTED_WORKSPACE_ID = "must-not-be-trusted";
      process.env.QSC_TRUSTED_ACTOR_ID = "must-not-be-audited";
      process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS = "catalog.product.create";

      const response = await POST(new Request("http://localhost/api/catalog/product-entry-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }));

      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        type: "AuthenticationContextUnavailable",
        code: "AUTHENTICATION_CONTEXT_UNAVAILABLE",
      });
    } finally {
      restoreEnvironmentValue("NODE_ENV", previous.nodeEnvironment);
      restoreEnvironmentValue("DATABASE_URL", previous.databaseUrl);
      restoreEnvironmentValue("QSC_TRUSTED_WORKSPACE_ID", previous.workspaceId);
      restoreEnvironmentValue("QSC_TRUSTED_ACTOR_ID", previous.actorId);
      restoreEnvironmentValue("QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS", previous.permissions);
    }
  });
});
