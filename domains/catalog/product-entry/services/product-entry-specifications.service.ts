import { SpecificationFieldService } from "@/domains/catalog/services/specification-field.service";
import { SpecificationTemplateService } from "@/domains/catalog/services/specification-template.service";
import { SpecificationOptionSetService } from "@/domains/catalog/services/specification-option-set.service";
import { SpecificationOptionService } from "@/domains/catalog/services/specification-option.service";
import type { SpecificationFieldType } from "@/domains/catalog/types/specification-field.entity";
import type { SpecificationOptionValue } from "@/domains/catalog/types/specification-option.entity";
import type { SpecificationValue } from "@/domains/catalog/types/specification-value.entity";

export interface ProductEntrySpecificationsContext {
  companyId: string;
  workspaceId: string;
  categoryId: string | null;
  deviceClassId: string | null;
  categoryRequiresDeviceClass: boolean;
}

export interface ProductEntrySpecificationOptionDecision {
  optionId: string;
  code: string;
  value: SpecificationOptionValue;
  label: string;
  description?: string;
  sortOrder: number;
}

export interface ProductEntrySpecificationFieldDecision {
  specificationFieldId: string;
  code: string;
  label: string;
  fieldType: SpecificationFieldType;
  required: boolean;
  sortOrder: number;
  specificationOptionSetId?: string;
  options: readonly ProductEntrySpecificationOptionDecision[];
  helpText?: string;
  configurationError?: string;
}

export type ProductEntrySpecificationsResolution =
  | { status: "invalid-context"; templateId: null; fields: [] }
  | { status: "missing-template"; templateId: null; fields: [] }
  | {
      status: "resolved";
      templateId: string;
      fields: ProductEntrySpecificationFieldDecision[];
    };

export interface ProductEntrySpecificationValidationIssue {
  code: string;
  specificationFieldId?: string;
  message: string;
}

export interface ProductEntryRequiredSpecificationsCompletion {
  completed: number;
  required: number;
}

const hasValue = (value: SpecificationValue | undefined): boolean =>
  value !== undefined &&
  (typeof value !== "string" || value.trim().length > 0);

export const ProductEntrySpecificationsService = {
  async resolve(
    context: ProductEntrySpecificationsContext,
  ): Promise<ProductEntrySpecificationsResolution> {
    if (
      !context.categoryId ||
      (context.categoryRequiresDeviceClass && !context.deviceClassId)
    ) {
      return { status: "invalid-context", templateId: null, fields: [] };
    }

    const template = SpecificationTemplateService.getTemplate(
      context.categoryId,
      context.categoryRequiresDeviceClass
        ? (context.deviceClassId ?? undefined)
        : undefined,
    );

    if (
      !template ||
      !template.isActive ||
      template.companyId !== context.companyId ||
      template.workspaceId !== context.workspaceId
    ) {
      return { status: "missing-template", templateId: null, fields: [] };
    }

    const fieldsById = new Map(
      SpecificationFieldService.getSpecificationFieldsByWorkspace(
        context.workspaceId,
      )
        .filter(
          (field) =>
            field.companyId === context.companyId && field.isActive,
        )
        .map((field) => [field.id, field]),
    );

    const fields = SpecificationTemplateService.getTemplateFields(template.id)
      .filter(
        (templateField) =>
          templateField.isActive &&
          templateField.companyId === context.companyId &&
          templateField.workspaceId === context.workspaceId,
      )
      .flatMap((templateField) => {
        const field = fieldsById.get(templateField.specificationFieldId);
        if (!field) return [];

        const optionSet = field.fieldType === "select" && field.specificationOptionSetId
          ? SpecificationOptionSetService.getActiveById(
              field.specificationOptionSetId,
              context.companyId,
              context.workspaceId,
            )
          : undefined;
        const options = optionSet
          ? SpecificationOptionService.getActiveByOptionSetId(
              optionSet.id,
              context.companyId,
              context.workspaceId,
            ).map((option) => ({
              optionId: option.id,
              code: option.code,
              value: option.value,
              label: option.label,
              description: option.description,
              sortOrder: option.sortOrder,
            }))
          : [];
        const invalidNonSelectRelationship =
          field.fieldType !== "select" && Boolean(field.specificationOptionSetId);
        const invalidSelectRelationship =
          field.fieldType === "select" && (!optionSet || options.length === 0);
        return [{
          specificationFieldId: field.id,
          code: field.code,
          label: field.label,
          fieldType: field.fieldType,
          required: templateField.isRequired,
          sortOrder: templateField.sortOrder,
          specificationOptionSetId: optionSet?.id,
          options,
          configurationError:
            invalidNonSelectRelationship || invalidSelectRelationship
              ? `${field.label} is not configured correctly.`
              : undefined,
        }];
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return { status: "resolved", templateId: template.id, fields };
  },

  validateValues(
    resolution: ProductEntrySpecificationsResolution,
    values: Readonly<Record<string, SpecificationValue>>,
  ): ProductEntrySpecificationValidationIssue[] {
    if (resolution.status === "invalid-context") {
      return [{
        code: "specifications-context",
        message: "Review the previous product decisions before entering specifications.",
      }];
    }
    if (resolution.status === "missing-template") {
      return [{
        code: "specifications-template-missing",
        message: "No specification template is configured for this product type.",
      }];
    }

    const fieldsById = new Map(
      resolution.fields.map((field) => [field.specificationFieldId, field]),
    );
    const issues: ProductEntrySpecificationValidationIssue[] = [];

    Object.keys(values).forEach((specificationFieldId) => {
      if (!fieldsById.has(specificationFieldId)) {
        issues.push({
          code: "specification-outside-template",
          specificationFieldId,
          message: "Some saved specifications no longer match the selected product type. Review the highlighted fields.",
        });
      }
    });

    resolution.fields.forEach((field) => {
      const value = values[field.specificationFieldId];
      if (field.configurationError) {
        issues.push({
          code: "specification-configuration",
          specificationFieldId: field.specificationFieldId,
          message: field.configurationError,
        });
        return;
      }
      if (field.required && !hasValue(value)) {
        const verb = field.fieldType === "select" || field.fieldType === "boolean"
          ? "Choose"
          : "Enter";
        issues.push({
          code: "required",
          specificationFieldId: field.specificationFieldId,
          message: `${verb} a value for ${field.label}.`,
        });
        return;
      }
      if (value === undefined) return;
      if (field.fieldType === "number" &&
          (typeof value !== "number" || !Number.isFinite(value))) {
        issues.push({
          code: "specification-number",
          specificationFieldId: field.specificationFieldId,
          message: `Enter a valid number for ${field.label}.`,
        });
      }
      if (field.fieldType === "select" &&
          !field.options.some((option) => Object.is(option.value, value))) {
        issues.push({
          code: "specification-select",
          specificationFieldId: field.specificationFieldId,
          message: `The selected ${field.label} is no longer available.`,
        });
      }
      if (field.fieldType === "boolean" && typeof value !== "boolean") {
        issues.push({
          code: "specification-boolean",
          specificationFieldId: field.specificationFieldId,
          message: `Choose Yes or No for ${field.label}.`,
        });
      }
      if (field.fieldType === "text" && typeof value !== "string") {
        issues.push({
          code: "specification-text",
          specificationFieldId: field.specificationFieldId,
          message: `Enter a valid value for ${field.label}.`,
        });
      }
    });

    return issues;
  },

  getRequiredCompletion(
    resolution: ProductEntrySpecificationsResolution | null,
    values: Readonly<Record<string, SpecificationValue>>,
  ): ProductEntryRequiredSpecificationsCompletion | null {
    if (resolution?.status !== "resolved") return null;
    const requiredFields = resolution.fields.filter((field) => field.required);
    const invalidFieldIds = new Set(
      this.validateValues(resolution, values)
        .flatMap((issue) => issue.specificationFieldId ? [issue.specificationFieldId] : []),
    );
    return {
      completed: requiredFields.filter((field) =>
        hasValue(values[field.specificationFieldId]) &&
        !invalidFieldIds.has(field.specificationFieldId),
      ).length,
      required: requiredFields.length,
    };
  },
};
