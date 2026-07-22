import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assertSafeIntegrationTestDatabaseUrl } from "./integration-test-database-safety";

const acceptedUrls = [
  "postgresql://user:password@127.0.0.1:5432/qsc_test",
  "postgresql://user:password@127.0.0.1:5432/qsc-r1-test",
  "postgresql://user:password@127.0.0.1:5432/test_qsc",
];

describe("integration-test database safety guard", () => {
  it("accepts database names containing a separate test token", () => {
    assert.deepEqual(
      acceptedUrls.map((url) => assertSafeIntegrationTestDatabaseUrl(url).databaseName),
      ["qsc_test", "qsc-r1-test", "test_qsc"],
    );
  });

  it("rejects missing, malformed, and non-PostgreSQL URLs", () => {
    assert.throws(() => assertSafeIntegrationTestDatabaseUrl(undefined), /required/);
    assert.throws(() => assertSafeIntegrationTestDatabaseUrl("not-a-url"), /valid PostgreSQL URL/);
    assert.throws(() => assertSafeIntegrationTestDatabaseUrl("mysql://user:secret@localhost/qsc_test"), /PostgreSQL protocol/);
  });

  it("rejects application-like names and test substrings that are not separate tokens", () => {
    for (const databaseName of ["qsc", "postgres", "production", "contest"]) {
      assert.throws(
        () => assertSafeIntegrationTestDatabaseUrl(`postgresql://user:secret@localhost/${databaseName}`),
        /separate test token/,
      );
    }
  });

  it("rejects the same normalized host, default port, and database as DATABASE_URL", () => {
    assert.throws(
      () => assertSafeIntegrationTestDatabaseUrl(
        "postgresql://test-user:test-password@LOCALHOST:5432/qsc_test",
        "postgresql://app-user:app-password@localhost/qsc_test",
      ),
      /must not target the application database/,
    );
  });

  it("canonicalizes loopback aliases while allowing distinct application and test database names", () => {
    const target = assertSafeIntegrationTestDatabaseUrl(
      "postgresql://test:secret@127.0.0.1:5432/qsc_test",
      "postgresql://app:secret@localhost:5432/qsc",
    );
    assert.equal(target.host, "loopback");
    assert.equal(target.databaseName, "qsc_test");
  });

  it("rejects loopback aliases that identify the same database name", () => {
    const aliasPairs = [
      ["localhost", "127.0.0.1"],
      ["localhost.", "127.0.0.2"],
      ["127.0.0.1", "[::1]"],
      ["[::1]", "[0:0:0:0:0:0:0:1]"],
      ["127.25.10.4", "[::ffff:127.0.0.9]"],
    ] as const;
    for (const [applicationHost, testHost] of aliasPairs) {
      assert.throws(
        () => assertSafeIntegrationTestDatabaseUrl(
          `postgresql://test:test-secret@${testHost}/qsc_test`,
          `postgresql://app:app-secret@${applicationHost}:5432/qsc_test`,
        ),
        /must not target the application database/,
      );
    }
  });

  it("rejects the same database name across different non-loopback hosts and credentials", () => {
    assert.throws(
      () => assertSafeIntegrationTestDatabaseUrl(
        "postgresql://test-user:test-secret@db-test.internal:5432/QSC_TEST",
        "postgresql://app-user:app-secret@DB-PRODUCTION.internal/qsc_test",
      ),
      /must not target the application database/,
    );
  });

  it("never includes supplied passwords in safety errors", () => {
    const passwords = ["test-password-should-not-leak", "application-password-should-not-leak"];
    const testUrl = `postgresql://user:${passwords[0]}@localhost/qsc_test`;
    const applicationUrl = `postgresql://user:${passwords[1]}@127.0.0.1/qsc_test`;
    let error: unknown;
    try {
      assertSafeIntegrationTestDatabaseUrl(
        testUrl,
        applicationUrl,
      );
    } catch (caught) {
      error = caught;
    }
    assert.ok(error instanceof Error);
    for (const password of passwords) assert.equal(error.message.includes(password), false);
    assert.equal(error.message.includes(testUrl), false);
    assert.equal(error.message.includes(applicationUrl), false);
  });

  it("keeps validation before connection construction and destructive setup", () => {
    const source = readFileSync(
      "domains/catalog/infrastructure/persistence/postgresql-product.repository.integration.test.ts",
      "utf8",
    );
    const guard = source.indexOf("assertSafeIntegrationTestDatabaseUrl(connectionUrl");
    const connection = source.indexOf("createCatalogDatabaseConnection(connectionUrl");
    const repository = source.indexOf("new PostgreSqlProductRepository");
    const migration = source.indexOf("migrate(connection.database");
    const truncate = source.indexOf("TRUNCATE TABLE catalog_products CASCADE");
    assert.ok(guard >= 0 && guard < connection);
    assert.ok(connection < repository && repository < migration && migration < truncate);
  });
});
