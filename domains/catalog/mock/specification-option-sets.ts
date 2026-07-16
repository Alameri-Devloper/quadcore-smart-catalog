import type { SpecificationOptionSetEntity } from "@/domains/catalog/types/specification-option-set.entity";

const timestamp = new Date().toISOString();

export const specificationOptionSets: SpecificationOptionSetEntity[] = [
  { id: "sos-001", code: "RAM_CAPACITY", companyId: "COMP-001", workspaceId: "WS-001", name: "ram-capacity", label: "RAM Capacity", description: "Normalized RAM capacity in gigabytes.", isActive: true, createdAt: timestamp, updatedAt: timestamp },
  { id: "sos-002", code: "RAM_TYPE", companyId: "COMP-001", workspaceId: "WS-001", name: "ram-type", label: "RAM Type", isActive: true, createdAt: timestamp, updatedAt: timestamp },
  { id: "sos-003", code: "OPERATING_SYSTEM", companyId: "COMP-001", workspaceId: "WS-001", name: "operating-system", label: "Operating System", isActive: true, createdAt: timestamp, updatedAt: timestamp },
  { id: "sos-004", code: "CAMERA_RESOLUTION", companyId: "COMP-001", workspaceId: "WS-001", name: "camera-resolution", label: "Camera Resolution", description: "Normalized camera resolution in megapixels.", isActive: true, createdAt: timestamp, updatedAt: timestamp },
];
