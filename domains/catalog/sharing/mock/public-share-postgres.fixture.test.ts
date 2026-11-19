import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool, Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { publicSharePostgresFixture } from "./public-share-postgres.fixture";

test("Synthetic PostgreSQL seed emits independent stored Wholesale values without a database connection", async context => {
  const prior = { test:process.env.TEST_DATABASE_URL, ssl:process.env.DATABASE_SSL };
  process.env.TEST_DATABASE_URL = "postgresql://synthetic@127.0.0.1:5432/qsc_p6_fixture_test_no_network";
  process.env.DATABASE_SSL = "false";
  const poolConnect = context.mock.method(Pool.prototype, "connect", () => { throw Error("NetworkForbiddenInPureFixtureTest"); });
  const clientConnect = context.mock.method(Client.prototype, "connect", () => { throw Error("NetworkForbiddenInPureFixtureTest"); });
  let fixture:ReturnType<typeof publicSharePostgresFixture>|undefined;
  try {
    fixture = publicSharePostgresFixture("pure-qa-seed-capture");
    const emitted:string[] = [], dialect = new PgDialect();
    context.mock.method(fixture.connection.database, "execute", async (query:SQL) => { emitted.push(dialect.sqlToQuery(query).sql); return {rows:[]}; });
    await fixture.seed();
    assert.equal(emitted.length, 2);
    const insert = emitted[1].match(/INSERT INTO catalog_products\(([^)]+)\) VALUES\s*([\s\S]*?);/); assert.ok(insert);
    const columns = insert[1].split(",");
    const rows = [...insert[2].matchAll(/\(([^()]*)\)/g)].map(match => match[1].split(","));
    assert.equal(rows.length, 2);
    const cell = (row:string[],column:string) => { const index=columns.indexOf(column); assert.ok(index>=0); return row[index].replace(/^\x27|\x27$/g,""); };
    assert.equal(cell(rows[0],"workspace_id"), "p4-workspace");
    assert.equal(cell(rows[0],"retail_price_minor"), "0");
    assert.equal(cell(rows[0],"wholesale_price_minor"), "73129");
    assert.equal(cell(rows[1],"workspace_id"), "p4-foreign");
    assert.equal(cell(rows[1],"wholesale_price_minor"), "86421");
    for (const row of rows) {
      assert.notEqual(cell(row,"retail_price_minor"), cell(row,"wholesale_price_minor"));
      assert.equal(cell(row,"retail_price_currency"), "USD");
      assert.equal(cell(row,"wholesale_price_currency"), "USD");
    }
    assert.equal(poolConnect.mock.callCount(), 0); assert.equal(clientConnect.mock.callCount(), 0);
  } finally {
    await fixture?.connection.close();
    if(prior.test===undefined)delete process.env.TEST_DATABASE_URL;else process.env.TEST_DATABASE_URL=prior.test;
    if(prior.ssl===undefined)delete process.env.DATABASE_SSL;else process.env.DATABASE_SSL=prior.ssl;
  }
});
