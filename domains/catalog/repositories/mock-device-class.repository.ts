import { deviceClasses } from "@/domains/catalog/mock/device-classes";
import { IDeviceClassRepository } from "@/domains/catalog/repositories/device-class.repository.interface";
import { DeviceClassEntity } from "@/domains/catalog/types/device-class.entity";

export const MockDeviceClassRepository: IDeviceClassRepository = {
  getAll(): DeviceClassEntity[] {
    return deviceClasses;
  },

  getActive(): DeviceClassEntity[] {
    return deviceClasses.filter((deviceClass) => deviceClass.isActive);
  },

  getByWorkspaceId(workspaceId: string): DeviceClassEntity[] {
    return deviceClasses.filter(
      (deviceClass) =>
        deviceClass.workspaceId === workspaceId && deviceClass.isActive,
    );
  },

  getById(id: string): DeviceClassEntity | undefined {
    return deviceClasses.find((deviceClass) => deviceClass.id === id);
  },
};
