import type { SpecificationOptionEntity } from "@/domains/catalog/types/specification-option.entity";

const timestamp = new Date().toISOString();
const scope = { companyId: "COMP-001", workspaceId: "WS-001", isActive: true, createdAt: timestamp, updatedAt: timestamp } as const;

export const specificationOptions: SpecificationOptionEntity[] = [
  ...[4, 8, 16, 24, 32, 64].map((value, index) => ({ ...scope, id: `so-ram-capacity-${value}`, specificationOptionSetId: "sos-001", code: `ram-capacity-${value}-gb`, value, label: `${value} GB`, description: "Capacity measured in gigabytes.", sortOrder: index + 1 })),
  ...["DDR3", "DDR3L", "DDR4", "DDR5", "LPDDR4X", "LPDDR5", "LPDDR5X"].map((value, index) => ({ ...scope, id: `so-ram-type-${index + 1}`, specificationOptionSetId: "sos-002", code: `ram-type-${value.toLowerCase()}`, value, label: value, sortOrder: index + 1 })),
  ...[
    ["windows-11-home", "Windows 11 Home"],
    ["windows-11-pro", "Windows 11 Pro"],
    ["freedos", "FreeDOS"],
    ["ubuntu", "Ubuntu"],
    ["none", "No Operating System"],
  ].map(([value, label], index) => ({ ...scope, id: `so-os-${index + 1}`, specificationOptionSetId: "sos-003", code: `operating-system-${value}`, value, label, sortOrder: index + 1 })),
  ...[2, 4, 5, 6, 8].map((value, index) => ({ ...scope, id: `so-camera-resolution-${value}`, specificationOptionSetId: "sos-004", code: `camera-resolution-${value}-mp`, value, label: `${value} MP`, description: "Resolution measured in megapixels.", sortOrder: index + 1 })),
];
