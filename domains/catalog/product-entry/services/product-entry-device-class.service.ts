import { DeviceClassService } from "@/domains/catalog/services/device-class.service";
import { SpecificationTemplateService } from "@/domains/catalog/services/specification-template.service";

export interface ProductEntryDeviceClassOption {
  id: string;
  name: string;
  description: string;
}

export type ProductEntryDeviceClassValidationCode =
  | "required"
  | "device-class-unavailable"
  | "device-class-workspace"
  | "device-class-incompatible";

export const ProductEntryDeviceClassService = {
  async getCompatibleDeviceClasses(input: {
    categoryId: string;
    companyId: string;
    workspaceId: string;
  }): Promise<ProductEntryDeviceClassOption[]> {
    return DeviceClassService.getDeviceClassesByWorkspace(input.workspaceId)
      .filter((deviceClass) =>
        deviceClass.companyId === input.companyId &&
        SpecificationTemplateService.getTemplate(input.categoryId, deviceClass.id),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((deviceClass) => ({
        id: deviceClass.id,
        name: deviceClass.name,
        description: deviceClass.description,
      }));
  },

  async validateSelection(input: {
    categoryId: string | null;
    deviceClassId: string | null;
    companyId: string;
    workspaceId: string;
  }): Promise<ProductEntryDeviceClassValidationCode | null> {
    if (!input.categoryId) return "device-class-incompatible";
    const compatible = await this.getCompatibleDeviceClasses({
      categoryId: input.categoryId,
      companyId: input.companyId,
      workspaceId: input.workspaceId,
    });
    if (compatible.length === 0) return null;
    if (!input.deviceClassId) return "required";

    const deviceClass = DeviceClassService.getDeviceClassById(input.deviceClassId);
    if (!deviceClass || !deviceClass.isActive) return "device-class-unavailable";
    if (deviceClass.companyId !== input.companyId || deviceClass.workspaceId !== input.workspaceId) {
      return "device-class-workspace";
    }
    return compatible.some((option) => option.id === input.deviceClassId)
      ? null
      : "device-class-incompatible";
  },
};
