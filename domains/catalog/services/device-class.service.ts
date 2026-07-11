import { MockDeviceClassRepository } from "@/domains/catalog/repositories/mock-device-class.repository";

export const DeviceClassService = {
  getDeviceClasses() {
    return MockDeviceClassRepository.getActive();
  },

  getDeviceClassesByWorkspace(workspaceId: string) {
    return MockDeviceClassRepository.getByWorkspaceId(workspaceId);
  },

  getDeviceClassById(id: string) {
    return MockDeviceClassRepository.getById(id);
  },
};
