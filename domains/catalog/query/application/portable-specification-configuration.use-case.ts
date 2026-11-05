import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { normalizeReferenceCode } from "../../reference-data/domain/catalog-reference-data";
import type { CatalogReferenceDataSnapshot } from "../../reference-data/ports/catalog-reference-data-unit-of-work.port";
import type { CatalogReferenceDataResult } from "../../reference-data/application/catalog-reference-data-result";
import type { CreateSpecificationDefinitionUseCase, ConfigureProductTypeSpecificationTemplateUseCase } from "../../reference-data/application/catalog-reference-data.use-cases";
import { configurationJson, freezeConfiguration, type PortableSpecificationManifest } from "../domain/portable-specification-configuration";
import { parseApprovedSpecificationManifest, STAFF_SPECIFICATION_CONFIGURATION } from "../domain/staff-specification-configuration";
import type { CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";

export type ConfigurationState = "EXISTS_MATCHING" | "MISSING" | "CONFLICT" | "UNRESOLVED_DEPENDENCY" | "NOT_AUTHORIZED";
export interface ConfigurationPlanRow {
  readonly recordType: "Workspace" | "ProductType" | "Definition" | "Binding" | "Profile" | "Manifest";
  readonly workspaceId: string;
  readonly productTypeCode?: string;
  readonly identity: string;
  readonly current: unknown;
  readonly desired: unknown;
  readonly status: ConfigurationState;
  readonly action: "NONE" | "CREATE" | "BIND" | "EMIT_PROFILE" | "BLOCK";
  readonly reason: string;
  readonly conflict: boolean;
}
export interface PortableConfigurationPlan {
  readonly mode: "dry-run" | "apply-isolated";
  readonly blocked: boolean;
  readonly rows: readonly ConfigurationPlanRow[];
  /** Candidate for the EXISTING runtime format; never installed here. */
  readonly candidateProfiles?: readonly CatalogSpecificationPresentationProfile[];
  readonly application?: { readonly status: "DISABLED" | "STOPPED_REPLAN_REQUIRED" | "PREPARED_NOT_INSTALLED"; readonly completed: readonly string[] };
}
export interface PortableConfigurationCommand {
  readonly context: TrustedActorContext;
  readonly workspaceId: string;
  /** Explicit mapping from approved source ProductType codes to existing target codes. */
  readonly productTypeCodes?: Readonly<Record<string, string>>;
  /** Explicit mapping to existing target definition codes; never rename records. */
  readonly definitionCodes?: Readonly<Record<string, string>>;
  readonly manifest?: unknown;
  /** Actual trusted runtime state. undefined means unknown, NOT empty. */
  readonly currentProfiles?: readonly CatalogSpecificationPresentationProfile[];
  readonly mode?: "dry-run" | "apply-isolated";
}
export interface ReferenceConfigurationReader {
  execute(command: { readonly context: TrustedActorContext; readonly includeInactive: true }): Promise<CatalogReferenceDataResult<CatalogReferenceDataSnapshot>>;
}
export interface IsolatedConfigurationWrites {
  readonly createDefinition: Pick<CreateSpecificationDefinitionUseCase, "execute">;
  readonly configureTemplate: Pick<ConfigureProductTypeSpecificationTemplateUseCase, "execute">;
}
const row = (workspaceId: string, recordType: ConfigurationPlanRow["recordType"], identity: string, status: ConfigurationState, action: ConfigurationPlanRow["action"], reason: string, current: unknown = null, desired: unknown = null, productTypeCode?: string): ConfigurationPlanRow =>
  ({ workspaceId, recordType, identity, status, action, reason, current, desired, ...(productTypeCode ? { productTypeCode } : {}), conflict: status === "CONFLICT" });
const plan = (rows: ConfigurationPlanRow[], candidateProfiles?: readonly CatalogSpecificationPresentationProfile[]): PortableConfigurationPlan =>
  freezeConfiguration({ mode: "dry-run", blocked: rows.some(r => r.action === "BLOCK"), rows, ...(candidateProfiles ? { candidateProfiles } : {}) });
const definitionState = (d: Omit<PortableSpecificationManifest["definitions"][number], "creation">) => ({ code: d.code, displayName: d.displayName, valueType: d.valueType, unit: d.unit, sortOrder: d.sortOrder });
const same = (a: unknown, b: unknown): boolean => configurationJson(a) === configurationJson(b);

function validateCommand(input: PortableConfigurationCommand): PortableSpecificationManifest {
  if (!input.workspaceId || input.workspaceId !== input.context.workspaceId) throw new Error("ExplicitWorkspaceMismatch");
  if (!["dry-run", "apply-isolated"].includes(input.mode ?? "dry-run")) throw new Error("InvalidMode");
  const manifest = parseApprovedSpecificationManifest(input.manifest === undefined ? STAFF_SPECIFICATION_CONFIGURATION : input.manifest);
  const codes = input.productTypeCodes ?? {};
  if (Object.keys(codes).some(k => !manifest.productTypes.some(t => t.code === k))) throw new Error("UnsupportedProductType");
  const resolved = manifest.productTypes.map(t => codes[t.code] ?? t.code);
  if (resolved.some(c => typeof c !== "string" || normalizeReferenceCode(c) !== c) || new Set(resolved).size !== resolved.length) throw new Error("AmbiguousProductTypeMapping");
  const definitions = input.definitionCodes ?? {};
  if (Object.keys(definitions).some(k => !manifest.definitions.some(d => d.code === k && d.creation === "require-existing"))) throw new Error("UnapprovedDefinitionMapping");
  const resolvedDefinitions = manifest.definitions.map(d => definitions[d.code] ?? d.code);
  if (resolvedDefinitions.some(c => typeof c !== "string" || normalizeReferenceCode(c) !== c) || new Set(resolvedDefinitions).size !== resolvedDefinitions.length) throw new Error("AmbiguousDefinitionMapping");
  return manifest;
}

function buildPlan(input: PortableConfigurationCommand, manifest: PortableSpecificationManifest, snapshot: CatalogReferenceDataSnapshot): PortableConfigurationPlan {
  const rows: ConfigurationPlanRow[] = [];
  const ws = input.workspaceId;
  const scopedRecords = [...snapshot.departments, ...snapshot.categories, ...snapshot.productTypes, ...snapshot.specificationDefinitions, ...snapshot.specificationTemplates];
  if (scopedRecords.some(r => r.workspaceId !== ws))
    return plan([row(ws, "Workspace", ws, "CONFLICT", "BLOCK", "Authoritative snapshot contains foreign Workspace records")]);
  rows.push(row(ws, "Workspace", ws, "EXISTS_MATCHING", "NONE", "Explicit target matches authenticated trusted Workspace", ws, ws));
  const definitions = new Map<string, string>();
  for (const desired of manifest.definitions) {
    const targetCode = input.definitionCodes?.[desired.code] ?? desired.code;
    const desiredState = definitionState({ ...desired, code: targetCode });
    const matches = snapshot.specificationDefinitions.filter(d => d.code === targetCode);
    const actual = matches[0];
    if (matches.length > 1) rows.push(row(ws, "Definition", desired.code, "CONFLICT", "BLOCK", "Ambiguous scoped code"));
    else if (!actual) rows.push(row(ws, "Definition", desired.code, "MISSING", desired.creation === "approved-missing" ? "CREATE" : "BLOCK", desired.creation === "approved-missing" ? "Approved optional definition may be created" : "Required existing definition; creation not approved", null, desiredState));
    else if (actual.status !== "Active" || !same(definitionState(actual), desiredState))
      rows.push(row(ws, "Definition", desired.code, "CONFLICT", "BLOCK", "Existing type/unit/label/order/status differs; never overwrite", { ...definitionState(actual), status: actual.status }, desiredState));
    else { definitions.set(desired.code, actual.id); rows.push(row(ws, "Definition", desired.code, "EXISTS_MATCHING", "NONE", "Scoped code and approved semantics match", definitionState(actual), desiredState)); }
  }
  const generated: CatalogSpecificationPresentationProfile[] = [];
  for (const desired of manifest.productTypes) {
    const targetCode = input.productTypeCodes?.[desired.code] ?? desired.code;
    const matches = snapshot.productTypes.filter(t => t.code === targetCode);
    const type = matches[0];
    const category = snapshot.categories.find(c => c.id === type?.categoryId && c.status === "Active");
    const parent = snapshot.departments.find(d => d.id === category?.departmentId && d.status === "Active");
    if (matches.length !== 1 || type.status !== "Active" || !category || !parent) {
      rows.push(row(ws, "ProductType", targetCode, matches.length > 1 ? "CONFLICT" : "UNRESOLVED_DEPENDENCY", "BLOCK", "One existing active ProductType with active scoped hierarchy is required", null, { code: targetCode }, desired.code)); continue;
    }
    rows.push(row(ws, "ProductType", targetCode, "EXISTS_MATCHING", "NONE", "Existing scoped ProductType resolved; no ProductType creation", { id: type.id, code: targetCode }, { code: targetCode }, desired.code));
    const templates = snapshot.specificationTemplates.filter(t => t.productTypeId === type.id);
    if (templates.length > 1) { rows.push(row(ws, "Binding", targetCode, "CONFLICT", "BLOCK", "Ambiguous template", null, null, desired.code)); continue; }
    const template = templates[0];
    for (const binding of desired.bindings) {
      const id = definitions.get(binding.definitionCode);
      const entries = template?.entries.filter(e => e.specificationDefinitionId === id) ?? [];
      const existing = entries[0];
      const expected = { sortOrder: binding.sortOrder, required: binding.required, publicVisibility: binding.publicVisibility };
      if (!id && binding.creation !== "approved-missing") rows.push(row(ws, "Binding", binding.definitionCode, "UNRESOLVED_DEPENDENCY", "BLOCK", "Required definition unresolved", null, expected, desired.code));
      else if (entries.length > 1 || (existing && !same({ sortOrder: existing.sortOrder, required: existing.required, publicVisibility: existing.publicVisibility }, expected)))
        rows.push(row(ws, "Binding", binding.definitionCode, "CONFLICT", "BLOCK", "Existing binding differs; no replacement or visibility changes", existing ?? null, expected, desired.code));
      else if (existing) rows.push(row(ws, "Binding", binding.definitionCode, "EXISTS_MATCHING", "NONE", "Existing binding preserved", expected, expected, desired.code));
      else if (template?.entries.some(e => e.sortOrder === binding.sortOrder))
        rows.push(row(ws, "Binding", binding.definitionCode, "CONFLICT", "BLOCK", "Approved position occupied by another binding", null, expected, desired.code));
      else rows.push(row(ws, "Binding", binding.definitionCode, "MISSING", binding.creation === "approved-missing" ? "BIND" : "BLOCK", binding.creation === "approved-missing" ? "Append approved optional binding after definition resolution" : "Required existing binding; creation not approved", null, expected, desired.code));
    }
    const current = input.currentProfiles?.filter(p => p.workspaceId === ws && p.productTypeId === type.id);
    if (!current) { rows.push(row(ws, "Profile", targetCode, "UNRESOLVED_DEPENDENCY", "BLOCK", "Actual trusted runtime profiles not supplied; unknown is not empty", null, null, desired.code)); continue; }
    if (current.length > 1) { rows.push(row(ws, "Profile", targetCode, "CONFLICT", "BLOCK", "Duplicate runtime scope", null, null, desired.code)); continue; }
    const { fields, identityModelDefinitionCode, ...settings } = desired.presentation;
    if (fields.some(f => !definitions.has(f.definitionCode) || (f.combineWithCode && !definitions.has(f.combineWithCode)))) {
      rows.push(row(ws, "Profile", targetCode, current.length ? "CONFLICT" : "MISSING", current.length ? "BLOCK" : "EMIT_PROFILE", current.length ? "Existing profile cannot be verified while definitions unresolved" : "Candidate waits for real target definition IDs", current[0] ?? null, settings, desired.code)); continue;
    }
    const profile: CatalogSpecificationPresentationProfile = {
      ...settings, workspaceId: ws, productTypeId: type.id,
      ...(identityModelDefinitionCode ? { identityModelDefinitionId: definitions.get(identityModelDefinitionCode)! } : {}),
      fields: fields.map(({ definitionCode, combineWithCode, ...rest }) => ({ ...rest, specificationDefinitionId: definitions.get(definitionCode)!, ...(combineWithCode ? { combineWith: definitions.get(combineWithCode)! } : {}) })),
    };
    if (current.length && !same(current[0], profile)) rows.push(row(ws, "Profile", targetCode, "CONFLICT", "BLOCK", "Existing presentation/filter/search configuration differs; no automatic overwrite", current[0], profile, desired.code));
    else {
      rows.push(row(ws, "Profile", targetCode, current.length ? "EXISTS_MATCHING" : "MISSING", current.length ? "NONE" : "EMIT_PROFILE", current.length ? "Trusted runtime profile matches" : "Generate existing runtime format only; installation requires separate authorization", current[0] ?? null, profile, desired.code));
      generated.push(profile);
    }
  }
  if (generated.length !== manifest.productTypes.length || rows.some(r => r.action === "BLOCK" || r.action === "CREATE" || r.action === "BIND")) return plan(rows);
  const selected = new Set(generated.map(p => p.productTypeId));
  return plan(rows, [...(input.currentProfiles ?? []).filter(p => p.workspaceId !== ws || !selected.has(p.productTypeId)), ...generated]);
}

/**
 * Application orchestration over existing authorized Reference Data use cases.
 * No SQL, new endpoint, startup hook or environment-file installation.
 * Writes are absent by default; only isolated verification composes the writer.
 * Each existing use case retains its own transaction; there is NO batch atomicity promise.
 */
export class PortableSpecificationConfigurationUseCase {
  constructor(private readonly reader: ReferenceConfigurationReader, private readonly isolatedVerificationWrites?: IsolatedConfigurationWrites) {}

  async execute(input: PortableConfigurationCommand): Promise<PortableConfigurationPlan> {
    let manifest: PortableSpecificationManifest;
    try { manifest = validateCommand(input); }
    catch { return plan([row(input.workspaceId, "Manifest", "staff-catalog-specifications-v1", input.workspaceId !== input.context.workspaceId ? "NOT_AUTHORIZED" : "CONFLICT", "BLOCK", "Invalid, ambiguous, unapproved manifest/mapping or explicit target mismatch")]); }
    const apply = input.mode === "apply-isolated";
    if (apply && !this.isolatedVerificationWrites)
      return { ...plan([row(input.workspaceId, "Workspace", input.workspaceId, "NOT_AUTHORIZED", "BLOCK", "Operational apply is disabled; only isolated verification may compose writes")]), mode: "apply-isolated", application: { status: "DISABLED", completed: [] } };
    const completed: string[] = [];
    const stopped = (before: PortableConfigurationPlan): PortableConfigurationPlan => ({ ...before, mode: "apply-isolated", blocked: true, application: { status: "STOPPED_REPLAN_REQUIRED", completed: [...completed] } });
    const read = () => this.reader.execute({ context: input.context, includeInactive: true });
    let initial: PortableConfigurationPlan | undefined;
    try {
      const loaded = await read();
      if (!loaded.ok) return plan([row(input.workspaceId, "Workspace", input.workspaceId, loaded.error === "Forbidden" ? "NOT_AUTHORIZED" : "UNRESOLVED_DEPENDENCY", "BLOCK", "Authorized reference read unavailable")]);
      initial = buildPlan(input, manifest, loaded.value);
      if (!apply || initial.blocked) return initial;
      const writer = this.isolatedVerificationWrites!;
      for (const desired of manifest.definitions) {
        if (!initial.rows.some(r => r.recordType === "Definition" && r.identity === desired.code && r.action === "CREATE")) continue;
        const created = await writer.createDefinition.execute({ context: input.context, ...definitionState(desired) });
        if (!created.ok) return stopped(initial);
        completed.push("Definition:" + desired.code);
      }
      for (const desired of manifest.productTypes) {
        const refreshed = await read();
        if (!refreshed.ok) return stopped(initial);
        const next = buildPlan(input, manifest, refreshed.value);
        if (next.blocked) return stopped(next);
        if (!next.rows.some(r => r.productTypeCode === desired.code && r.action === "BIND")) continue;
        const type = refreshed.value.productTypes.find(t => t.code === (input.productTypeCodes?.[desired.code] ?? desired.code))!;
        const template = refreshed.value.specificationTemplates.find(t => t.productTypeId === type.id);
        const entries = [...(template?.entries ?? [])];
        for (const binding of desired.bindings) {
          const definition = refreshed.value.specificationDefinitions.find(d => d.code === (input.definitionCodes?.[binding.definitionCode] ?? binding.definitionCode))!;
          if (!entries.some(e => e.specificationDefinitionId === definition.id))
            entries.push({ specificationDefinitionId: definition.id, sortOrder: binding.sortOrder, required: binding.required, publicVisibility: binding.publicVisibility });
        }
        const configured = await writer.configureTemplate.execute({ context: input.context, productTypeId: type.id, entries, ...(template ? { expectedVersion: template.version } : {}) });
        if (!configured.ok) return stopped(next);
        completed.push("Template:" + desired.code);
      }
      const after = await read();
      if (!after.ok) return stopped(initial);
      const verified = buildPlan(input, manifest, after.value);
      if (verified.blocked || !verified.candidateProfiles) return stopped(verified);
      return { ...verified, mode: "apply-isolated", application: { status: "PREPARED_NOT_INSTALLED", completed } };
    } catch {
      // Includes uniqueness races, persistence failure and potentially ambiguous commit.
      // Never retry/reconcile automatically or claim rollback; inspect via a fresh authorized plan.
      const unavailable = plan([row(input.workspaceId, "Workspace", input.workspaceId, "UNRESOLVED_DEPENDENCY", "BLOCK", "Reference operation failed; outcome not assumed")]);
      return apply ? stopped(initial ?? unavailable) : unavailable;
    }
  }
}
