import type {SpecificationFilterDefinition,SpecificationFilterOption} from "../../domain/catalog-specification-filters";
import type { CatalogSpecificationPresentationContext, CatalogSpecificationDefinitionProjection } from "../../domain/catalog-specification-presentation";
import { sql, type SQL } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type {
  CatalogDetailsRepositoryQuery, CatalogHierarchyFilter, CatalogLifecycleScope, CatalogQueryRepository, CatalogSearchRepositoryQuery,
} from "../../ports/catalog-query-repository.port";
import type {
  CatalogClassificationProjection, CatalogFilterOptionsProjection, CatalogMediaStorageProjection, CatalogMoneyProjection, CatalogProductDetailsProjection,
  CatalogProductProjection, CatalogProductSearchRow, CatalogReferenceProjection, CatalogSpecificationProjection,
} from "../../domain/catalog-query";

type Row = Record<string, unknown>;
const text = (row: Row, key: string): string | null => row[key] === null || row[key] === undefined ? null : String(row[key]);
const ref = (row: Row, prefix: string): CatalogReferenceProjection | null => { const id = text(row, `${prefix}_id`); return id ? Object.freeze({ id, displayName: text(row, `${prefix}_name`) ?? id }) : null; };
const bigint = (row: Row, key: string): bigint => BigInt(text(row, key) ?? "0");
const money = (row: Row, prefix: string): CatalogMoneyProjection | null => { const amount = text(row, `${prefix}_minor`), currency = text(row, `${prefix}_currency`); return amount !== null && currency ? Object.freeze({ amountMinor: BigInt(amount), currency, source: text(row, `${prefix}_source`) === "BranchOverride" ? "BranchOverride" : "WorkspaceBase" }) : null; };
const classification = (row: Row): CatalogClassificationProjection => Object.freeze({
  department: ref(row, "department"), category: ref(row, "category"), productType: ref(row, "product_type"), brand: ref(row, "brand"),
  deviceClass: text(row, "device_class_id"), condition: text(row, "condition_id"), supplyStatus: ref(row, "supply_status"),
});
const product = (row: Row): CatalogProductProjection => Object.freeze({
  productId: String(row.product_id), productCode: text(row, "product_code"), productName: text(row, "product_name"), lifecycle: String(row.lifecycle_state) as CatalogProductProjection["lifecycle"],
  createdAt: new Date(String(row.created_at)), updatedAt: new Date(String(row.updated_at)), classification: classification(row),
  mainMedia: row.main_media_id ? Object.freeze({ mediaId: String(row.main_media_id), altText: text(row, "main_media_alt"), position: Number(row.main_media_position), isMain: true }) : null,
  listingStatus: (text(row, "listing_status") ?? "NotConfigured") as CatalogProductProjection["listingStatus"],
  inventory: Object.freeze({ available: bigint(row, "available_quantity"), onHand: bigint(row, "on_hand_quantity"), reserved: bigint(row, "reserved_quantity"), damaged: bigint(row, "damaged_quantity") }),
  retail: money(row, "retail"), wholesale: money(row, "wholesale"), referenceCost: money(row, "reference_cost"),
});

const projected = (workspaceId: string, branchId: string | null, searchText: string, visibility: { readonly retail:boolean; readonly wholesale:boolean; readonly availability:boolean; readonly quantity:boolean; readonly referenceCost:boolean }) => sql`
  SELECT p.product_id, p.product_code, p.product_name, p.lifecycle_state, p.created_at, p.updated_at,
    p.device_class_id, p.condition_id,
    c.category_id, c.display_name AS category_name, d.department_id, d.display_name AS department_name,
    pt.product_type_id, pt.display_name AS product_type_name, b.brand_id, b.display_name AS brand_name,
    ss.supply_status_id, ss.display_name AS supply_status_name,
    mi.product_image_id AS main_media_id, mi.alt_text AS main_media_alt, mi.position AS main_media_position,
    COALESCE(bl.listing_status, 'NotConfigured') AS listing_status,
    CASE WHEN ${visibility.quantity} THEN COALESCE(ib.on_hand_quantity, 0)::text ELSE '0' END AS on_hand_quantity,
    CASE WHEN ${visibility.quantity} THEN COALESCE(ib.reserved_quantity, 0)::text ELSE '0' END AS reserved_quantity,
    CASE WHEN ${visibility.quantity} THEN COALESCE(ib.damaged_quantity, 0)::text ELSE '0' END AS damaged_quantity,
    CASE WHEN ${visibility.availability} THEN (COALESCE(ib.on_hand_quantity, 0)-COALESCE(ib.reserved_quantity, 0)-COALESCE(ib.damaged_quantity, 0))::text ELSE '0' END AS available_quantity,
    CASE WHEN ${visibility.retail} THEN COALESCE(ro.amount_minor, p.retail_price_minor)::text END AS retail_minor,
    CASE WHEN ${visibility.retail} THEN COALESCE(ro.currency, p.retail_price_currency) END AS retail_currency,
    CASE WHEN ro.amount_minor IS NOT NULL THEN 'BranchOverride' ELSE 'WorkspaceBase' END AS retail_source,
    CASE WHEN ${visibility.wholesale} THEN COALESCE(wo.amount_minor, p.wholesale_price_minor)::text END AS wholesale_minor,
    CASE WHEN ${visibility.wholesale} THEN COALESCE(wo.currency, p.wholesale_price_currency) END AS wholesale_currency,
    CASE WHEN wo.amount_minor IS NOT NULL THEN 'BranchOverride' ELSE 'WorkspaceBase' END AS wholesale_source,
    CASE WHEN ${visibility.referenceCost} THEN COALESCE(rco.amount_minor, rc.amount_minor)::text END AS reference_cost_minor,
    CASE WHEN ${visibility.referenceCost} THEN COALESCE(rco.currency, rc.currency) END AS reference_cost_currency,
    CASE WHEN rco.amount_minor IS NOT NULL THEN 'BranchOverride' ELSE 'WorkspaceBase' END AS reference_cost_source,
    CASE WHEN lower(COALESCE(p.product_code,'')) = lower(query.q) THEN 1000
      WHEN lower(COALESCE(p.product_name,'')) = lower(query.q) THEN 900
      WHEN left(lower(COALESCE(p.product_code,'')),length(query.q)) = lower(query.q) THEN 850
      WHEN left(lower(COALESCE(p.product_name,'')),length(query.q)) = lower(query.q) THEN 800
      WHEN lower(COALESCE(b.display_name,'')) = lower(query.q) OR lower(COALESCE(c.display_name,'')) = lower(query.q) OR lower(COALESCE(pt.display_name,'')) = lower(query.q) THEN 700
      WHEN left(lower(COALESCE(b.display_name,'')),length(query.q)) = lower(query.q) OR left(lower(COALESCE(c.display_name,'')),length(query.q)) = lower(query.q) OR left(lower(COALESCE(pt.display_name,'')),length(query.q)) = lower(query.q) THEN 650
      ELSE (ts_rank(to_tsvector('simple', concat_ws(' ',p.product_name,p.product_code,b.display_name,c.display_name,pt.display_name)), plainto_tsquery('simple',query.q))*100
        + greatest(similarity(lower(COALESCE(p.product_name,'')),lower(query.q)), similarity(lower(COALESCE(p.product_code,'')),lower(query.q)))*10) END AS relevance_score
  FROM catalog_products p
  CROSS JOIN (SELECT ${searchText}::text AS q) query
  LEFT JOIN catalog_categories c ON c.workspace_id=p.workspace_id AND c.category_id=p.category_id
  LEFT JOIN catalog_departments d ON d.workspace_id=c.workspace_id AND d.department_id=c.department_id
  LEFT JOIN catalog_product_types pt ON pt.workspace_id=p.workspace_id AND pt.product_type_id=p.product_type_id
  LEFT JOIN catalog_brands b ON b.workspace_id=p.workspace_id AND b.brand_id=p.brand_id
  LEFT JOIN catalog_supply_statuses ss ON ss.workspace_id=p.workspace_id AND ss.supply_status_id=p.availability_status_id
  LEFT JOIN LATERAL (SELECT i.product_image_id,i.alt_text,i.position FROM catalog_product_images i WHERE i.workspace_id=p.workspace_id AND i.product_id=p.product_id AND i.is_main=true LIMIT 1) mi ON true
  LEFT JOIN catalog_branch_product_listings bl ON bl.workspace_id=p.workspace_id AND bl.product_id=p.product_id AND bl.branch_id=${branchId}
  LEFT JOIN inventory_balances ib ON ib.workspace_id=p.workspace_id AND ib.product_id=p.product_id AND ib.branch_id=${branchId}
  LEFT JOIN catalog_product_branch_price_overrides ro ON ro.workspace_id=p.workspace_id AND ro.product_id=p.product_id AND ro.branch_id=${branchId} AND ro.price_type='Retail'
  LEFT JOIN catalog_product_branch_price_overrides wo ON wo.workspace_id=p.workspace_id AND wo.product_id=p.product_id AND wo.branch_id=${branchId} AND wo.price_type='Wholesale'
  LEFT JOIN catalog_product_reference_costs rc ON rc.workspace_id=p.workspace_id AND rc.product_id=p.product_id
  LEFT JOIN catalog_product_branch_price_overrides rco ON rco.workspace_id=p.workspace_id AND rco.product_id=p.product_id AND rco.branch_id=${branchId} AND rco.price_type='ReferenceCost'
  WHERE p.workspace_id=${workspaceId}`;

const and = (parts: SQL[]) => parts.length ? sql` AND ${sql.join(parts, sql` AND `)}` : sql``;
const lifecyclePredicate = (scope: CatalogLifecycleScope): SQL => scope.type === "Exact"
  ? sql`lifecycle_state=${scope.lifecycle}`
  : scope.lifecycles.length === 0
    ? sql`false`
    : sql`(lifecycle_state IN (${sql.join(scope.lifecycles.map((lifecycle) => sql`${lifecycle}`), sql`, `)}))`;
const searchMatch = (q: string) => q ? sql`(lower(COALESCE(product_code,''))=${q.toLowerCase()} OR left(lower(COALESCE(product_code,'')),length(${q}))=${q.toLowerCase()} OR left(lower(COALESCE(product_name,'')),length(${q}))=${q.toLowerCase()} OR left(lower(COALESCE(brand_name,'')),length(${q}))=${q.toLowerCase()} OR left(lower(COALESCE(category_name,'')),length(${q}))=${q.toLowerCase()} OR left(lower(COALESCE(product_type_name,'')),length(${q}))=${q.toLowerCase()} OR to_tsvector('simple',COALESCE(product_name,'') || ' ' || COALESCE(product_code,'')) @@ plainto_tsquery('simple',${q}) OR to_tsvector('simple',concat_ws(' ',brand_name,category_name,product_type_name)) @@ plainto_tsquery('simple',${q}) OR similarity(lower(COALESCE(product_name,'')),${q.toLowerCase()}) >= 0.2 OR similarity(lower(COALESCE(product_code,'')),${q.toLowerCase()}) >= 0.2)` : sql`true`;

const catalogPredicates=(query:CatalogSearchRepositoryQuery):SQL[]=>{
    const f=query.filters, predicates: SQL[]=[lifecyclePredicate(query.lifecycleScope), searchMatch(query.searchText)];
    if(f.departmentId)predicates.push(sql`department_id=${f.departmentId}`); if(f.categoryId)predicates.push(sql`category_id=${f.categoryId}`); if(f.productTypeId)predicates.push(sql`product_type_id=${f.productTypeId}`); if(f.brandId)predicates.push(sql`brand_id=${f.brandId}`);
    if(f.deviceClass)predicates.push(sql`device_class_id=${f.deviceClass}`); if(f.condition)predicates.push(sql`condition_id=${f.condition}`); if(f.supplyStatusId)predicates.push(sql`supply_status_id=${f.supplyStatusId}`);
    if(f.listing && f.listing!=="Any")predicates.push(sql`listing_status=${f.listing}`); if(f.stock)predicates.push(f.stock==="InStock"?sql`available_quantity::bigint>0`:sql`available_quantity::bigint=0`);
    if(f.retailCurrency)predicates.push(query.sort.startsWith("retail-price")&&f.minRetailPrice===undefined&&f.maxRetailPrice===undefined?sql`(retail_currency=${f.retailCurrency} OR retail_minor IS NULL)`:sql`retail_currency=${f.retailCurrency}`); if(f.minRetailPrice!==undefined)predicates.push(sql`retail_minor::bigint>=${f.minRetailPrice}`); if(f.maxRetailPrice!==undefined)predicates.push(sql`retail_minor::bigint<=${f.maxRetailPrice}`);

    if(f.brandIds?.length)predicates.push(sql`brand_id IN (${sql.join(f.brandIds.map(id=>sql`${id}`),sql`,`)})`);
    for(const filter of f.specificationFilters ?? []){
      const values=sql.join(filter.values.map(v=>sql`${v}`),sql`,`);
      const match=filter.valueType==="Number" ? sql`(CASE WHEN v.value_type='number' AND v.number_value ~ '^-?[0-9]+([.][0-9]+)?([eE][+-]?[0-9]{1,3})?$' THEN v.number_value::numeric END) IN (${sql.join(filter.values.map(v=>sql`${v}::numeric`),sql`,`)})` : filter.valueType==="Boolean" ? sql`v.value_type='boolean' AND v.boolean_value IN (${values})` : sql`v.value_type='string' AND v.text_value COLLATE "C" IN (${values})`;
      predicates.push(sql`EXISTS(SELECT 1 FROM catalog_product_specification_values v JOIN catalog_products sp ON sp.workspace_id=v.workspace_id AND sp.product_id=v.product_id WHERE v.workspace_id=${query.workspaceId} AND v.product_id=projected.product_id AND sp.product_type_id=${f.productTypeId} AND v.specification_field_id=${filter.specificationDefinitionId} AND ${match})`);
    }
return predicates;
};

export class PostgreSqlCatalogQueryRepository implements CatalogQueryRepository {
  constructor(private readonly database: PlatformDatabase) {}
  async getSpecificationFilterDefinitions(workspaceId:string,productTypeId:string,allowedIds:readonly string[]):Promise<readonly SpecificationFilterDefinition[]> {
    if(!allowedIds.length)return [];
    const rows=await this.database.execute<Row>(sql`SELECT d.specification_definition_id,d.display_name,d.value_type,d.unit,e.sort_order
      FROM catalog_product_types pt
      JOIN catalog_categories c ON c.workspace_id=pt.workspace_id AND c.category_id=pt.category_id AND c.status='Active'
      JOIN catalog_departments dept ON dept.workspace_id=c.workspace_id AND dept.department_id=c.department_id AND dept.status='Active'
      JOIN catalog_specification_templates t ON t.workspace_id=pt.workspace_id AND t.product_type_id=pt.product_type_id
      JOIN catalog_specification_template_entries e ON e.workspace_id=t.workspace_id AND e.specification_template_id=t.specification_template_id
      JOIN catalog_specification_definitions d ON d.workspace_id=e.workspace_id AND d.specification_definition_id=e.specification_definition_id AND d.status='Active'
      WHERE pt.workspace_id=${workspaceId} AND pt.product_type_id=${productTypeId} AND pt.status='Active' AND d.specification_definition_id IN (${sql.join(allowedIds.map(id=>sql`${id}`),sql`,`)})
      ORDER BY e.sort_order,d.specification_definition_id`);
    return Object.freeze(rows.rows.map(r=>Object.freeze({specificationDefinitionId:String(r.specification_definition_id),displayName:String(r.display_name),valueType:String(r.value_type) as SpecificationFilterDefinition["valueType"],unit:text(r,"unit"),sortOrder:Number(r.sort_order)})));
  }
  async getSpecificationFilterValues(query:CatalogSearchRepositoryQuery,definitions:readonly SpecificationFilterDefinition[]):Promise<readonly SpecificationFilterOption[]> {
    if(!definitions.length)return [];
    const base=projected(query.workspaceId,query.branchId,query.searchText,{...query.visibility,referenceCost:false});
    const predicates=catalogPredicates({...query,filters:{...query.filters,specificationFilters:undefined}});
    const result=await this.database.execute<Row>(sql`WITH projected AS (${base}), authorized AS (SELECT product_id FROM projected WHERE true${and(predicates)}),
      distinct_values AS (
        SELECT DISTINCT v.specification_field_id,v.value_type,CASE v.value_type WHEN 'boolean' THEN v.boolean_value::text WHEN 'number' THEN (CASE WHEN v.number_value ~ '^-?[0-9]+([.][0-9]+)?([eE][+-]?[0-9]{1,3})?$' THEN v.number_value::numeric END)::text ELSE v.text_value END AS value
        FROM authorized a JOIN catalog_product_specification_values v ON v.workspace_id=${query.workspaceId} AND v.product_id=a.product_id
        WHERE v.specification_field_id IN (${sql.join(definitions.map(d=>sql`${d.specificationDefinitionId}`),sql`,`)})
      ), ranked AS (SELECT *,row_number() OVER(PARTITION BY specification_field_id ORDER BY value COLLATE "C") AS n FROM distinct_values WHERE value IS NOT NULL AND value<>'')
      SELECT * FROM ranked WHERE n<=101 ORDER BY specification_field_id,n`);
    return Object.freeze(definitions.map(d=>{
      const rows=result.rows.filter(r=>r.specification_field_id===d.specificationDefinitionId && r.value_type===(d.valueType==="Number"?"number":d.valueType==="Boolean"?"boolean":"string"));
      return Object.freeze({...d,values:Object.freeze(rows.slice(0,100).map(r=>d.valueType==="Boolean"?r.value==="true":String(r.value))),truncated:rows.length>100});
    }));
  }

  async branchExists(workspaceId: string, branchId: string): Promise<boolean> {
    const rows = await this.database.execute<{ found: boolean }>(sql`SELECT EXISTS(SELECT 1 FROM workspace_branch_references WHERE workspace_id=${workspaceId} AND branch_id=${branchId} AND status='Active') AS found`); return rows.rows[0]?.found === true;
  }
  async hierarchyIsValid(workspaceId: string, filter: CatalogHierarchyFilter): Promise<boolean> {
    const ids = [filter.departmentId, filter.categoryId, filter.productTypeId, filter.brandId, filter.supplyStatusId]; if (ids.every((value) => value === undefined)) return true;
    const rows = await this.database.execute<{ valid: boolean }>(sql`SELECT
      (${filter.departmentId ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM catalog_departments d WHERE d.workspace_id=${workspaceId} AND d.department_id=${filter.departmentId ?? null} AND d.status='Active')) AND
      (${filter.categoryId ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM catalog_categories c JOIN catalog_departments d ON d.workspace_id=c.workspace_id AND d.department_id=c.department_id WHERE c.workspace_id=${workspaceId} AND c.category_id=${filter.categoryId ?? null} AND c.status='Active' AND d.status='Active' AND (${filter.departmentId ?? null}::text IS NULL OR c.department_id=${filter.departmentId ?? null}))) AND
      (${filter.productTypeId ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM catalog_product_types pt JOIN catalog_categories c ON c.workspace_id=pt.workspace_id AND c.category_id=pt.category_id JOIN catalog_departments d ON d.workspace_id=c.workspace_id AND d.department_id=c.department_id WHERE pt.workspace_id=${workspaceId} AND pt.product_type_id=${filter.productTypeId ?? null} AND pt.status='Active' AND c.status='Active' AND d.status='Active' AND (${filter.categoryId ?? null}::text IS NULL OR pt.category_id=${filter.categoryId ?? null}) AND (${filter.departmentId ?? null}::text IS NULL OR c.department_id=${filter.departmentId ?? null}))) AND
      (${filter.brandId ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM catalog_brands b WHERE b.workspace_id=${workspaceId} AND b.brand_id=${filter.brandId ?? null} AND b.status='Active')) AND
      (${filter.supplyStatusId ?? null}::text IS NULL OR EXISTS(SELECT 1 FROM catalog_supply_statuses s WHERE s.workspace_id=${workspaceId} AND s.supply_status_id=${filter.supplyStatusId ?? null} AND s.status='Active')) AS valid`); return rows.rows[0]?.valid === true;
  }
  async search(query: CatalogSearchRepositoryQuery): Promise<readonly CatalogProductSearchRow[]> {
    const predicates=catalogPredicates(query);
    const asc=query.sort==="name-asc"||query.sort==="retail-price-asc"; const value = query.cursor?.value;
    if(query.cursor){ const id=query.cursor.productId; if(query.sort==="relevance")predicates.push(sql`(relevance_score<${Number(value)} OR (relevance_score=${Number(value)} AND product_id>${id}))`); else if(query.sort==="newest")predicates.push(sql`(created_at<${value}::timestamptz OR (created_at=${value}::timestamptz AND product_id>${id}))`); else if(query.sort.startsWith("name"))predicates.push(asc?sql`(lower(COALESCE(product_name,''))>${value} OR (lower(COALESCE(product_name,''))=${value} AND product_id>${id}))`:sql`(lower(COALESCE(product_name,''))<${value} OR (lower(COALESCE(product_name,''))=${value} AND product_id>${id}))`); else if(query.cursor.nullRank===1)predicates.push(sql`retail_minor IS NULL AND product_id>${id}`);else predicates.push(asc?sql`(retail_minor IS NULL OR retail_minor::bigint>${value}::bigint OR (retail_minor::bigint=${value}::bigint AND product_id>${id}))`:sql`(retail_minor IS NULL OR retail_minor::bigint<${value}::bigint OR (retail_minor::bigint=${value}::bigint AND product_id>${id}))`); }
    const order=query.sort==="relevance"?sql`relevance_score DESC,product_id ASC`:query.sort==="newest"?sql`created_at DESC,product_id ASC`:query.sort==="name-asc"?sql`lower(COALESCE(product_name,'')) ASC,product_id ASC`:query.sort==="name-desc"?sql`lower(COALESCE(product_name,'')) DESC,product_id ASC`:query.sort==="retail-price-asc"?sql`retail_minor::bigint ASC NULLS LAST,product_id ASC`:sql`retail_minor::bigint DESC NULLS LAST,product_id ASC`;
    const base=projected(query.workspaceId,query.branchId,query.searchText,{...query.visibility,referenceCost:false}); const statement=sql`WITH projected AS (${base}) SELECT * FROM projected WHERE true${and(predicates)} ORDER BY ${order} LIMIT ${query.limit}`;
    const result=await this.database.execute<Row>(statement); return Object.freeze(result.rows.map((row)=>{const p=product(row); const cursor=query.sort==="relevance"?{productId:p.productId,value:String(row.relevance_score)}:query.sort==="newest"?{productId:p.productId,value:p.createdAt.toISOString()}:query.sort.startsWith("name")?{productId:p.productId,value:(p.productName??"").toLowerCase()}:{productId:p.productId,value:text(row,"retail_minor")??"0",nullRank:(text(row,"retail_minor")===null?1:0) as 0|1}; return Object.freeze({product:p,cursor:Object.freeze(cursor)}); }));
  }
  async getSpecificationPresentation(workspaceId: string, productIds: readonly string[]): Promise<readonly CatalogSpecificationPresentationContext[]> {
    if (!productIds.length) return Object.freeze([]);
    const ids = sql.join(productIds.map((id) => sql`${id}`), sql`, `);
    const values = await this.database.execute<Row>(sql`SELECT p.product_id,p.product_type_id,v.specification_field_id,COALESCE(d.display_name,v.specification_field_id) AS display_name,CASE v.value_type WHEN 'string' THEN 'Text' WHEN 'number' THEN 'Number' ELSE 'Boolean' END AS value_type,d.unit,COALESCE(v.text_value,v.number_value,v.boolean_value::text) AS value,v.boolean_value,v.position AS sort_order
      FROM catalog_products p LEFT JOIN catalog_product_specification_values v ON v.workspace_id=p.workspace_id AND v.product_id=p.product_id
      LEFT JOIN catalog_specification_definitions d ON d.workspace_id=v.workspace_id AND d.specification_definition_id=v.specification_field_id
      WHERE p.workspace_id=${workspaceId} AND p.product_id IN (${ids}) ORDER BY p.product_id,v.position,v.specification_field_id`);
    const metadata = await this.database.execute<Row>(sql`SELECT p.product_id,d.specification_definition_id,d.display_name,d.value_type,d.unit,e.sort_order
      FROM catalog_products p JOIN catalog_product_types pt ON pt.workspace_id=p.workspace_id AND pt.product_type_id=p.product_type_id AND pt.status='Active'
      JOIN catalog_categories c ON c.workspace_id=pt.workspace_id AND c.category_id=pt.category_id AND c.status='Active'
      JOIN catalog_departments dept ON dept.workspace_id=c.workspace_id AND dept.department_id=c.department_id AND dept.status='Active'
      JOIN catalog_specification_templates t ON t.workspace_id=p.workspace_id AND t.product_type_id=p.product_type_id
      JOIN catalog_specification_template_entries e ON e.workspace_id=t.workspace_id AND e.specification_template_id=t.specification_template_id
      JOIN catalog_specification_definitions d ON d.workspace_id=e.workspace_id AND d.specification_definition_id=e.specification_definition_id AND d.status='Active'
      WHERE p.workspace_id=${workspaceId} AND p.product_id IN (${ids}) ORDER BY p.product_id,e.sort_order,d.specification_definition_id`);
    const contexts = new Map<string, { productId: string; productTypeId: string | null; specifications: CatalogSpecificationProjection[]; definitions: CatalogSpecificationDefinitionProjection[] }>();
    for (const row of values.rows) {
      const productId = String(row.product_id);
      let context = contexts.get(productId);
      if (!context) { context = { productId, productTypeId: text(row, "product_type_id"), specifications: [], definitions: [] }; contexts.set(productId, context); }
      if (row.specification_field_id !== null) context.specifications.push(Object.freeze({ specificationDefinitionId: String(row.specification_field_id), displayName: String(row.display_name), valueType: String(row.value_type) as CatalogSpecificationProjection["valueType"], unit: text(row, "unit"), value: String(row.value_type) === "Boolean" ? row.boolean_value === true : String(row.value), sortOrder: Number(row.sort_order) }));
    }
    for (const row of metadata.rows) contexts.get(String(row.product_id))?.definitions.push(Object.freeze({ specificationDefinitionId: String(row.specification_definition_id), displayName: String(row.display_name), valueType: String(row.value_type) as CatalogSpecificationProjection["valueType"], unit: text(row, "unit"), sortOrder: Number(row.sort_order) }));
    return Object.freeze([...contexts.values()].map((context) => Object.freeze({ ...context, specifications: Object.freeze(context.specifications), definitions: Object.freeze(context.definitions) })));
  }
  async getDetails(query: CatalogDetailsRepositoryQuery): Promise<CatalogProductDetailsProjection|null> {
    const base=projected(query.workspaceId,query.branchId,"",query.visibility); const result=await this.database.execute<Row>(sql`WITH projected AS (${base}) SELECT * FROM projected WHERE product_id=${query.productId}`); if(!result.rows[0])return null;
    const mediaResult=await this.database.execute<Row>(sql`SELECT product_image_id,alt_text,position,is_main FROM catalog_product_images WHERE workspace_id=${query.workspaceId} AND product_id=${query.productId} ORDER BY position,product_image_id`);
    const specificationResult=await this.database.execute<Row>(sql`SELECT v.specification_field_id,COALESCE(d.display_name,v.specification_field_id) AS display_name,CASE v.value_type WHEN 'string' THEN 'Text' WHEN 'number' THEN 'Number' ELSE 'Boolean' END AS value_type,d.unit,COALESCE(v.text_value,v.number_value,v.boolean_value::text) AS value,v.boolean_value,v.position AS sort_order FROM catalog_product_specification_values v LEFT JOIN catalog_specification_definitions d ON d.workspace_id=v.workspace_id AND d.specification_definition_id=v.specification_field_id WHERE v.workspace_id=${query.workspaceId} AND v.product_id=${query.productId} ORDER BY v.position,v.specification_field_id`);
    const specifications=specificationResult.rows.map((row):CatalogSpecificationProjection=>Object.freeze({specificationDefinitionId:String(row.specification_field_id),displayName:String(row.display_name),valueType:String(row.value_type) as CatalogSpecificationProjection["valueType"],unit:text(row,"unit"),value:String(row.value_type)==="Boolean"?row.boolean_value===true:String(row.value),sortOrder:Number(row.sort_order)}));
    return Object.freeze({...product(result.rows[0]),media:Object.freeze(mediaResult.rows.map((row)=>Object.freeze({mediaId:String(row.product_image_id),altText:text(row,"alt_text"),position:Number(row.position),isMain:row.is_main===true}))),specifications:Object.freeze(specifications)});
  }
  async getFilterOptions(workspaceId:string,allowedBranchIds:readonly string[]|null=null):Promise<CatalogFilterOptionsProjection>{
    const branchScope=allowedBranchIds===null?sql`true`:allowedBranchIds.length===0?sql`false`:sql`branch_id IN (${sql.join(allowedBranchIds.map((branchId)=>sql`${branchId}`),sql`,`)})`;
    const [departments,categories,productTypes,brands,supplyStatuses,branches,conditions,currencies]=await Promise.all([
      this.database.execute<Row>(sql`SELECT department_id AS id,display_name FROM catalog_departments WHERE workspace_id=${workspaceId} AND status='Active' ORDER BY sort_order,display_name,department_id`),
      this.database.execute<Row>(sql`SELECT c.category_id AS id,c.display_name,c.department_id AS parent_id FROM catalog_categories c JOIN catalog_departments d ON d.workspace_id=c.workspace_id AND d.department_id=c.department_id WHERE c.workspace_id=${workspaceId} AND c.status='Active' AND d.status='Active' ORDER BY c.sort_order,c.display_name,c.category_id`),
      this.database.execute<Row>(sql`SELECT pt.product_type_id AS id,pt.display_name,pt.category_id AS parent_id FROM catalog_product_types pt JOIN catalog_categories c ON c.workspace_id=pt.workspace_id AND c.category_id=pt.category_id JOIN catalog_departments d ON d.workspace_id=c.workspace_id AND d.department_id=c.department_id WHERE pt.workspace_id=${workspaceId} AND pt.status='Active' AND c.status='Active' AND d.status='Active' ORDER BY pt.sort_order,pt.display_name,pt.product_type_id`),
      this.database.execute<Row>(sql`SELECT brand_id AS id,display_name FROM catalog_brands WHERE workspace_id=${workspaceId} AND status='Active' ORDER BY sort_order,display_name,brand_id`),
      this.database.execute<Row>(sql`SELECT supply_status_id AS id,display_name FROM catalog_supply_statuses WHERE workspace_id=${workspaceId} AND status='Active' ORDER BY sort_order,display_name,supply_status_id`),
      this.database.execute<Row>(sql`SELECT branch_id AS id,display_name FROM workspace_branch_references WHERE workspace_id=${workspaceId} AND status='Active' AND ${branchScope} ORDER BY sort_order,display_name,branch_id`),
      this.database.execute<Row>(sql`SELECT condition_code FROM workspace_condition_availability WHERE workspace_id=${workspaceId} AND enabled=true ORDER BY sort_order,condition_code`),
      this.database.execute<Row>(sql`SELECT currency_code FROM workspace_currency_availability WHERE workspace_id=${workspaceId} AND enabled=true ORDER BY sort_order,currency_code`),
    ]);
    const map=(rows:readonly Row[])=>Object.freeze(rows.map((row)=>Object.freeze({id:String(row.id),displayName:String(row.display_name),...(row.parent_id?{parentId:String(row.parent_id)}:{})})));
    return Object.freeze({departments:map(departments.rows),categories:map(categories.rows),productTypes:map(productTypes.rows),brands:map(brands.rows),supplyStatuses:map(supplyStatuses.rows),branches:map(branches.rows),enabledConditions:Object.freeze(conditions.rows.map((row)=>String(row.condition_code))),enabledCurrencies:Object.freeze(currencies.rows.map((row)=>String(row.currency_code)))});
  }
  async getMedia(workspaceId:string,productId:string,mediaId:string):Promise<CatalogMediaStorageProjection|null>{
    const result=await this.database.execute<Row>(sql`
      SELECT p.product_id,p.lifecycle_state,i.product_image_id AS media_id,i.storage_key,i.checksum_sha256,i.mime_type,mr.storage_root_key
      FROM catalog_products p
      JOIN catalog_product_images i ON i.workspace_id=p.workspace_id AND i.product_id=p.product_id AND i.product_image_id=${mediaId}
      JOIN catalog_product_media_roots mr ON mr.workspace_id=p.workspace_id AND mr.product_id=p.product_id
      WHERE p.workspace_id=${workspaceId} AND p.product_id=${productId} AND i.mime_type='image/webp' AND i.checksum_sha256 IS NOT NULL
      LIMIT 1
    `);
    const row=result.rows[0];
    return row?Object.freeze({productId:String(row.product_id),mediaId:String(row.media_id),lifecycle:String(row.lifecycle_state) as CatalogMediaStorageProjection["lifecycle"],storageRootKey:String(row.storage_root_key),storageKey:String(row.storage_key),checksumSha256:String(row.checksum_sha256),mimeType:"image/webp" as const}):null;
  }
}
