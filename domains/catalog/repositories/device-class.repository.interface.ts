import { DeviceClassEntity } from "@/domains/catalog/types/device-class.entity";

export interface IDeviceClassRepository {
  getAll(): DeviceClassEntity[];

  getActive(): DeviceClassEntity[];

  getByWorkspaceId(workspaceId: string): DeviceClassEntity[];

  getById(id: string): DeviceClassEntity | undefined;
}
