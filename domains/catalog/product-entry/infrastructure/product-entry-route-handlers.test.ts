import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "../../../../app/api/catalog/product-entry-submissions/route";
import {
  GET as GET_MEDIA,
  POST as POST_MEDIA,
} from "../../../../app/api/catalog/product-entry-submissions/[submissionId]/media/route";
import { PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS } from "./product-entry-media-multipart-policy";

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

  it("keeps Product Entry Media POST and GET fail-closed in Production before multipart or database access", async () => {
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
      process.env.QSC_TRUSTED_ACTOR_ID = "must-not-be-trusted";
      process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS = "catalog.product-entry-media.upload";
      const params = { params: Promise.resolve({ submissionId: "submission-a" }) };
      const post = await POST_MEDIA(new Request("http://localhost/api/catalog/product-entry-submissions/submission-a/media", {
        method: "POST",
        body: "not multipart",
      }), params);
      const get = await GET_MEDIA(new Request("http://localhost/api/catalog/product-entry-submissions/submission-a/media"), params);
      for (const response of [post, get]) {
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), {
          type: "AuthenticationContextUnavailable",
          code: "AUTHENTICATION_CONTEXT_UNAVAILABLE",
        });
      }
    } finally {
      restoreEnvironmentValue("NODE_ENV", previous.nodeEnvironment);
      restoreEnvironmentValue("DATABASE_URL", previous.databaseUrl);
      restoreEnvironmentValue("QSC_TRUSTED_WORKSPACE_ID", previous.workspaceId);
      restoreEnvironmentValue("QSC_TRUSTED_ACTOR_ID", previous.actorId);
      restoreEnvironmentValue("QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS", previous.permissions);
    }
  });

  it("rejects an oversized Content-Length before multipart parsing or opening the Media application", async () => {
    const previous = {
      nodeEnvironment: process.env.NODE_ENV,
      workspaceId: process.env.QSC_TRUSTED_WORKSPACE_ID,
      actorId: process.env.QSC_TRUSTED_ACTOR_ID,
      permissions: process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS,
    };
    let formDataCalls = 0;
    try {
      restoreEnvironmentValue("NODE_ENV", "development");
      process.env.QSC_TRUSTED_WORKSPACE_ID = "trusted-workspace";
      process.env.QSC_TRUSTED_ACTOR_ID = "trusted-actor";
      process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS = "catalog.product-entry-media.upload";
      const request = {
        headers: new Headers({
          "content-type": "multipart/form-data; boundary=qsc-test",
          "content-length": String(PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS.maximumContentLengthBytes + 1),
        }),
        formData: async () => {
          formDataCalls += 1;
          throw new Error("multipart parser must not run");
        },
      } as unknown as Request;
      const response = await POST_MEDIA(request, {
        params: Promise.resolve({ submissionId: "submission-a" }),
      });
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        type: "InvalidRequest",
        code: "SOURCE_TOO_LARGE",
        operationId: null,
      });
      assert.equal(formDataCalls, 0);
    } finally {
      restoreEnvironmentValue("NODE_ENV", previous.nodeEnvironment);
      restoreEnvironmentValue("QSC_TRUSTED_WORKSPACE_ID", previous.workspaceId);
      restoreEnvironmentValue("QSC_TRUSTED_ACTOR_ID", previous.actorId);
      restoreEnvironmentValue("QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS", previous.permissions);
    }
  });

  it("bounds multipart entry count before reading file bytes or opening the Media application", async () => {
    const previous = {
      nodeEnvironment: process.env.NODE_ENV,
      workspaceId: process.env.QSC_TRUSTED_WORKSPACE_ID,
      actorId: process.env.QSC_TRUSTED_ACTOR_ID,
      permissions: process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS,
    };
    const formData = new FormData();
    try {
      restoreEnvironmentValue("NODE_ENV", "development");
      process.env.QSC_TRUSTED_WORKSPACE_ID = "trusted-workspace";
      process.env.QSC_TRUSTED_ACTOR_ID = "trusted-actor";
      process.env.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS = "catalog.product-entry-media.upload";
      for (let index = 0; index <= PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS.maximumEntries; index += 1) {
        formData.append(`source:operation-${index}`, new Blob([new Uint8Array([1])]), `${index}.png`);
      }
      const request = {
        headers: new Headers({ "content-type": "multipart/form-data; boundary=qsc-test" }),
        formData: async () => formData,
      } as unknown as Request;
      const response = await POST_MEDIA(request, {
        params: Promise.resolve({ submissionId: "submission-a" }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        type: "InvalidRequest",
        code: "MULTIPART_ENTRY_LIMIT_EXCEEDED",
      });
    } finally {
      restoreEnvironmentValue("NODE_ENV", previous.nodeEnvironment);
      restoreEnvironmentValue("QSC_TRUSTED_WORKSPACE_ID", previous.workspaceId);
      restoreEnvironmentValue("QSC_TRUSTED_ACTOR_ID", previous.actorId);
      restoreEnvironmentValue("QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS", previous.permissions);
    }
  });
});
