import { randomUUID } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPlatformDatabaseConnection } from '../../../../shared/infrastructure/persistence/database';
import { assertSafeIntegrationTestDatabaseUrl } from '../../infrastructure/persistence/integration-test-database-safety';
import { PublicProductShareLifecycle } from '../application/public-product-share.use-cases';
import { PostgreSqlPublicProductShareUnitOfWork } from '../infrastructure/persistence/postgresql-public-product-share-unit-of-work';
import { createPublicShareCryptoRuntime } from '../infrastructure/public-share-crypto-runtime';
import { environment } from '../infrastructure/crypto/public-share-crypto.test-fixtures';
import { publicShareActor } from './public-share-lifecycle.fixture';
import { publicShareDriverError } from '../infrastructure/persistence/public-share-persistence';
import type { PublicProductShareUnitOfWork } from '../ports/public-product-share-unit-of-work.port';

export const publicSharePostgresFixture = (name: string) => {
  const target = process.env.TEST_DATABASE_URL;
  assertSafeIntegrationTestDatabaseUrl(target, process.env.DATABASE_URL);
  const url = new URL(target!); url.searchParams.set('application_name', name);
  const connection = createPlatformDatabaseConnection(url.toString());
  const unitOfWork = new PostgreSqlPublicProductShareUnitOfWork(connection.database);
  const runtime = createPublicShareCryptoRuntime(environment());
  const lifecycleFor = (work: PublicProductShareUnitOfWork = unitOfWork) => new PublicProductShareLifecycle(work, { now: () => new Date('2026-10-12T16:00:00Z') }, { next: randomUUID }, runtime);
  const execute = async (query: SQL) => {
    try { return await connection.database.execute(query); }
    catch (error) { const driver = publicShareDriverError(error); throw new Error(`SyntheticFixtureQueryFailed:${typeof driver?.code === 'string' ? driver.code : 'unknown'}`); }
  };
  const seed = async () => {
    await execute(sql`TRUNCATE TABLE workspaces, catalog_products CASCADE`);
    await execute(sql`
      INSERT INTO workspaces(workspace_id,company_id,workspace_code,display_name,password_recovery_policy,created_at,updated_at) VALUES
        ('p4-workspace','p4-company','p4-workspace','P4','OwnerManagedOnly','2026-01-01','2026-01-01'),
        ('p4-foreign','p4-company','p4-foreign','Foreign','OwnerManagedOnly','2026-01-01','2026-01-01');
      INSERT INTO workspace_branch_references(workspace_id,branch_id,code,display_name,status,sort_order,revision,created_at,updated_at) VALUES
        ('p4-workspace','p4-branch','p4-branch','Branch','Active',0,1,'2026-01-01','2026-01-01'),
        ('p4-workspace','p4-branch-2','p4-branch-2','Branch 2','Active',1,1,'2026-01-01','2026-01-01'),
        ('p4-foreign','p4-foreign-branch','p4-foreign-branch','Foreign','Active',0,1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_departments(workspace_id,department_id,code,display_name,status,sort_order,version,created_at,updated_at) VALUES
        ('p4-workspace','p4-department','p4-department','Department','Active',0,1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_categories(workspace_id,category_id,department_id,code,display_name,status,sort_order,version,created_at,updated_at) VALUES
        ('p4-workspace','p4-category','p4-department','p4-category','Category','Active',0,1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_product_types(workspace_id,product_type_id,category_id,code,display_name,status,sort_order,version,created_at,updated_at) VALUES
        ('p4-workspace','p4-type','p4-category','p4-type','Type','Active',0,1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_products(workspace_id,product_id,catalog_id,lifecycle_state,revision,created_at,updated_at,has_classification,category_id,product_type_id,has_commercial_details,product_name,retail_price_minor,retail_price_currency) VALUES
        ('p4-workspace','p4-product','p4-catalog','Published',1,'2026-01-01','2026-01-01',true,'p4-category','p4-type',true,'منتج Product',0,'USD'),
        ('p4-foreign','p4-foreign-product','p4-catalog','Published',1,'2026-01-01','2026-01-01',false,NULL,NULL,true,'Foreign',1,'USD');
      INSERT INTO catalog_branch_product_listings(workspace_id,branch_id,product_id,listing_status,revision,created_at,updated_at) VALUES
        ('p4-workspace','p4-branch','p4-product','Listed',1,'2026-01-01','2026-01-01'),
        ('p4-workspace','p4-branch-2','p4-product','Listed',1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_specification_definitions(workspace_id,specification_definition_id,code,display_name,status,sort_order,version,created_at,updated_at,value_type,unit) VALUES
        ('p4-workspace','p4-spec','p4-spec','Specification','Active',0,1,'2026-01-01','2026-01-01','Text',NULL);
      INSERT INTO catalog_specification_templates(workspace_id,specification_template_id,product_type_id,version,created_at,updated_at) VALUES
        ('p4-workspace','p4-template','p4-type',1,'2026-01-01','2026-01-01');
      INSERT INTO catalog_specification_template_entries(workspace_id,specification_template_id,specification_definition_id,sort_order,required,public_visibility) VALUES
        ('p4-workspace','p4-template','p4-spec',0,false,'public');
      INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,text_value) VALUES
        ('p4-workspace','p4-product','p4-spec',0,'string','Actual value');`);
  };
  const counts = async () => (await execute(sql`SELECT count(*)::int AS total, count(*) FILTER(WHERE revoked_at IS NULL)::int AS active FROM catalog_public_product_share_grants`)).rows[0] as { total: number; active: number };
  const auditTypes = async () => (await execute(sql`SELECT event_type FROM security_audit_events ORDER BY occurred_at,audit_id`)).rows.map((row) => row.event_type as string);
  return { connection, unitOfWork, runtime, lifecycleFor, lifecycle: lifecycleFor(), seed, execute, counts, auditTypes,
    migrate: () => migrate(connection.database, { migrationsFolder: 'drizzle' }),
    command: { context: publicShareActor(), productId: 'p4-product', branchId: 'p4-branch' } };
};
