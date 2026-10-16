import { and, eq, sql } from "drizzle-orm";
import { catalogSpecificationDefinitions, catalogSpecificationTemplateEntries, catalogSpecificationTemplates } from "../../../infrastructure/persistence/schema";
import type { SpecificationDefinition, SpecificationTemplateEntry } from "../../../reference-data/domain/catalog-reference-data";
import { ProductSpecificationValue } from "../../../types/product-specification-value.value-object";
import type { PublicProductShareResourcePort, PublicProductShareResourceState } from "../../ports/public-product-share-unit-of-work.port";
import type { PublicProductShareTuple } from "../../ports/public-product-share-grant-repository.port";
import { PublicSharePersistenceFailure } from "../../ports/public-share-persistence-failure";
import { publicShareIdentity, type PublicShareTransaction } from "./public-share-persistence";

export class PostgreSqlPublicProductShareResource implements PublicProductShareResourcePort {
  constructor(private readonly transaction: PublicShareTransaction) {}
  async lockProductParent(workspaceId: string, productId: string): Promise<boolean> {
    const result = await this.transaction.execute(sql`SELECT product_id FROM catalog_products
      WHERE workspace_id=${workspaceId} AND product_id=${productId} FOR UPDATE`);
    return result.rows.length === 1;
  }
  async existsInScope(tuple: PublicProductShareTuple): Promise<boolean> {
    const result = await this.transaction.execute(sql`SELECT p.product_id FROM catalog_products p
      JOIN workspace_branch_references br ON br.workspace_id=p.workspace_id AND br.branch_id=${tuple.branchId}
      WHERE p.workspace_id=${tuple.workspaceId} AND p.product_id=${tuple.productId}`);
    return result.rows.length === 1;
  }
  async readCurrent(tuple: PublicProductShareTuple): Promise<PublicProductShareResourceState | null> {
    const result = await this.transaction.execute<Record<string, unknown>>(sql`
      SELECT p.product_name,p.lifecycle_state,p.product_type_id,br.status AS branch_status,
        bl.listing_status,p.retail_price_minor::text,p.retail_price_currency,
        po.amount_minor::text AS branch_retail_minor,po.currency AS branch_retail_currency
      FROM catalog_products p
      JOIN workspace_branch_references br ON br.workspace_id=p.workspace_id AND br.branch_id=${tuple.branchId}
      LEFT JOIN catalog_branch_product_listings bl ON bl.workspace_id=p.workspace_id AND bl.product_id=p.product_id AND bl.branch_id=br.branch_id
      LEFT JOIN catalog_product_branch_price_overrides po ON po.workspace_id=p.workspace_id AND po.product_id=p.product_id AND po.branch_id=br.branch_id AND po.price_type='Retail'
      WHERE p.workspace_id=${tuple.workspaceId} AND p.product_id=${tuple.productId}`);
    const row = result.rows[0];
    if (!row) return null;
    if (!['Draft','Published','Archived'].includes(row.lifecycle_state as string)
      || !['Active','Inactive'].includes(row.branch_status as string)
      || (row.product_name !== null && typeof row.product_name !== 'string')
      || (row.listing_status !== null && !['Listed','Unlisted'].includes(row.listing_status as string))) throw new PublicSharePersistenceFailure('IntegrityFailure');
    const price = (amount: unknown, currency: unknown) => {
      if (amount === null && currency === null) return null;
      if (typeof amount !== 'string' || !/^(0|[1-9][0-9]*)$/.test(amount) || BigInt(amount) > BigInt(Number.MAX_SAFE_INTEGER)
        || typeof currency !== 'string') throw new PublicSharePersistenceFailure('IntegrityFailure');
      return { amountMinor: BigInt(amount), currency };
    };
    const templates = row.product_type_id === null ? [] : await this.transaction.select().from(catalogSpecificationTemplates)
      .where(and(eq(catalogSpecificationTemplates.workspaceId, tuple.workspaceId), eq(catalogSpecificationTemplates.productTypeId, publicShareIdentity(row.product_type_id))));
    if (templates.length > 1) throw new PublicSharePersistenceFailure('IntegrityFailure');
    const templateRow = templates[0];
    const entries = templateRow ? await this.transaction.select().from(catalogSpecificationTemplateEntries).where(and(
      eq(catalogSpecificationTemplateEntries.workspaceId, tuple.workspaceId), eq(catalogSpecificationTemplateEntries.specificationTemplateId, templateRow.specificationTemplateId))) : [];
    const definitions = templateRow ? await this.transaction.select({ definition: catalogSpecificationDefinitions }).from(catalogSpecificationTemplateEntries)
      .innerJoin(catalogSpecificationDefinitions, and(eq(catalogSpecificationDefinitions.workspaceId, catalogSpecificationTemplateEntries.workspaceId),
        eq(catalogSpecificationDefinitions.specificationDefinitionId, catalogSpecificationTemplateEntries.specificationDefinitionId)))
      .where(and(eq(catalogSpecificationTemplateEntries.workspaceId, tuple.workspaceId), eq(catalogSpecificationTemplateEntries.specificationTemplateId, templateRow.specificationTemplateId))) : [];
    // Filter current/public/same-Workspace candidates before interpreting persisted values.
    const values = await this.transaction.execute<Record<string, unknown>>(sql`SELECT v.specification_field_id,v.value_type,v.text_value,v.number_value,v.boolean_value
      FROM catalog_product_specification_values v
      JOIN catalog_specification_templates t ON t.workspace_id=v.workspace_id AND t.product_type_id=${row.product_type_id}
      JOIN catalog_specification_template_entries e ON e.workspace_id=t.workspace_id AND e.specification_template_id=t.specification_template_id
        AND e.specification_definition_id=v.specification_field_id AND e.public_visibility='public'
      JOIN catalog_specification_definitions d ON d.workspace_id=e.workspace_id AND d.specification_definition_id=e.specification_definition_id AND d.status='Active'
      WHERE v.workspace_id=${tuple.workspaceId} AND v.product_id=${tuple.productId} ORDER BY v.position`);
    const specificationValues = values.rows.flatMap((value) => {
      if ([value.text_value, value.number_value, value.boolean_value].filter((item) => item !== null).length !== 1) return [];
      let semantic: string | number | boolean;
      if (value.value_type === 'string' && typeof value.text_value === 'string') semantic = value.text_value;
      else if (value.value_type === 'boolean' && typeof value.boolean_value === 'boolean') semantic = value.boolean_value;
      else if (value.value_type === 'number' && typeof value.number_value === 'string') {
        semantic = Number(value.number_value);
        if (!Number.isFinite(semantic) || String(semantic) !== value.number_value) return [];
      } else return [];
      return [ProductSpecificationValue.create({ specificationFieldId: publicShareIdentity(value.specification_field_id), value: semantic })];
    });
    return { productName: row.product_name as string | null, productLifecycle: row.lifecycle_state as PublicProductShareResourceState['productLifecycle'],
      branchStatus: row.branch_status as PublicProductShareResourceState['branchStatus'], listed: row.listing_status === 'Listed',
      workspaceRetail: price(row.retail_price_minor, row.retail_price_currency), branchRetail: price(row.branch_retail_minor, row.branch_retail_currency),
      template: templateRow ? { workspaceId: templateRow.workspaceId, id: templateRow.specificationTemplateId, productTypeId: templateRow.productTypeId,
        version: templateRow.version, createdAt: templateRow.createdAt, updatedAt: templateRow.updatedAt,
        entries: entries.map((entry): SpecificationTemplateEntry => ({ specificationDefinitionId: entry.specificationDefinitionId, sortOrder: entry.sortOrder,
          required: entry.required, publicVisibility: entry.publicVisibility as SpecificationTemplateEntry['publicVisibility'] })) } : null,
      definitions: definitions.map(({ definition }): SpecificationDefinition => ({ ...definition, id: definition.specificationDefinitionId,
        status: definition.status as SpecificationDefinition['status'], valueType: definition.valueType as SpecificationDefinition['valueType'] })), specificationValues };
  }
}
