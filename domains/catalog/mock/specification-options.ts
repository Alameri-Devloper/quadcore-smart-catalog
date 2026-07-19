import type { SpecificationOptionEntity, SpecificationOptionValue } from "@/domains/catalog/types/specification-option.entity";

const timestamp = new Date().toISOString();
const scope = { companyId: "COMP-001", workspaceId: "WS-001", isActive: true, createdAt: timestamp, updatedAt: timestamp } as const;
const options = (setId: string, prefix: string, entries: readonly (SpecificationOptionValue | readonly [SpecificationOptionValue, string])[], description?: string): SpecificationOptionEntity[] => entries.map((entry, index) => {
  const [value, label] = Array.isArray(entry) ? entry : [entry, String(entry)];
  return { ...scope, id: `so-${prefix}-${index + 1}`, specificationOptionSetId: setId, code: `${prefix}-${String(value).toLowerCase().replaceAll(" ", "-")}`, value, label: String(label), description, sortOrder: index + 1 };
});

export const specificationOptions: SpecificationOptionEntity[] = [
  ...options("sos-001", "ram-capacity", [4, 8, 16, 24, 32, 64].map((value) => [value, `${value} GB`] as const), "Capacity measured in gigabytes."),
  ...options("sos-002", "ram-type", ["DDR4", "DDR5", "LPDDR5", "LPDDR5X"]),
  ...options("sos-003", "os", [["windows-11-home", "Windows 11 Home"], ["windows-11-pro", "Windows 11 Pro"], ["freedos", "FreeDOS"], ["ubuntu", "Ubuntu"], ["none", "No Operating System"]]),
  ...options("sos-004", "camera-resolution", [2, 4, 5, 6, 8, 12].map((value) => [value, `${value} MP`] as const), "Resolution measured in megapixels."),
  ...options("sos-005", "storage-type", ["HDD", "SATA SSD", "NVMe SSD", "eMMC"]),
  ...options("sos-006", "storage-capacity", [128, 256, 512, 1000, 2000, 4000].map((value) => [value, value >= 1000 ? `${value / 1000} TB` : `${value} GB`] as const)),
  ...options("sos-007", "screen-size", [13.3, 14, 15.6, 16, 17.3].map((value) => [value, `${value} in`] as const)),
  ...options("sos-008", "refresh-rate", [60, 90, 120, 144, 165, 240].map((value) => [value, `${value} Hz`] as const)),
  ...options("sos-009", "keyboard-layout", [["en", "English"], ["ar-en", "Arabic / English"]]),
  ...options("sos-010", "camera-technology", [["ip", "IP"], ["analog-hd", "Analog HD"], ["wifi", "Wi-Fi"]]),
  ...options("sos-011", "camera-form-factor", ["Dome", "Bullet", "Turret", "PTZ", "Fisheye", "Cube"]),
  ...options("sos-012", "installation-environment", [["indoor", "Indoor"], ["outdoor", "Outdoor"], ["indoor-outdoor", "Indoor / Outdoor"]]),
  ...options("sos-013", "lens-type", [["fixed", "Fixed"], ["varifocal", "Varifocal"], ["motorized-varifocal", "Motorized Varifocal"]]),
  ...options("sos-014", "lens-size", ["2.8 mm", "3.6 mm", "4 mm", "6 mm", "8 mm", "2.7–13.5 mm", "2.8–12 mm", "5–50 mm"]),
  ...options("sos-015", "weather-protection", ["IP65", "IP66", "IP67", "IP68"]),
];
