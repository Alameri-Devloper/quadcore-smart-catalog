import { PostgreSqlPublicShareKeyVersionInspector } from "./postgresql-public-share-key-version-inspector";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { PublicShareReadSnapshotPort, PublicShareReadContext } from "../../ports/public-share-resolution.port";
import { PostgreSqlPublicProductShareGrantRepository } from "./postgresql-public-product-share-grant.repository";
import { PostgreSqlPublicProductShareResource } from "./postgresql-public-product-share-resource";
import { PostgreSqlPublicShareCurrentMain } from "./postgresql-public-share-current-main";
import { publicShareDatabaseFailure } from "./public-share-persistence";

export class PostgreSqlPublicShareReadSnapshot implements PublicShareReadSnapshotPort {
  constructor(private readonly database: PlatformDatabase) {}
  async execute<T>(work: (context: PublicShareReadContext) => Promise<T>): Promise<T> {
    try {
      return await this.database.transaction(transaction => work(Object.freeze({
        keys: new PostgreSqlPublicShareKeyVersionInspector(transaction),
        grants: new PostgreSqlPublicProductShareGrantRepository(transaction),
        resources: new PostgreSqlPublicProductShareResource(transaction),
        media: new PostgreSqlPublicShareCurrentMain(transaction),
      })), { isolationLevel: "repeatable read", accessMode: "read only" });
    } catch (error) { throw publicShareDatabaseFailure(error); }
  }
}