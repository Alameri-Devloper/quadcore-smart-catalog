import type { SpecificationOptionSetEntity } from "@/domains/catalog/types/specification-option-set.entity";

const timestamp = new Date().toISOString();
const scope = { companyId: "COMP-001", workspaceId: "WS-001", isActive: true, createdAt: timestamp, updatedAt: timestamp } as const;
const set = (id: string, code: string, name: string, label: string, description?: string): SpecificationOptionSetEntity => ({ ...scope, id, code, name, label, description });

export const specificationOptionSets: SpecificationOptionSetEntity[] = [
  set("sos-001", "RAM_CAPACITY", "ram-capacity", "RAM Capacity", "Normalized RAM capacity in gigabytes."),
  set("sos-002", "RAM_TYPE", "ram-type", "RAM Type"),
  set("sos-003", "OPERATING_SYSTEM", "operating-system", "Operating System"),
  set("sos-004", "CAMERA_RESOLUTION", "camera-resolution", "Camera Resolution", "Normalized camera resolution in megapixels."),
  set("sos-005", "STORAGE_TYPE", "storage-type", "Storage Type"),
  set("sos-006", "STORAGE_CAPACITY", "storage-capacity", "Storage Capacity", "Normalized storage capacity in gigabytes."),
  set("sos-007", "SCREEN_SIZE", "screen-size", "Screen Size", "Common diagonal screen sizes in inches."),
  set("sos-008", "REFRESH_RATE", "refresh-rate", "Refresh Rate", "Common screen refresh rates in hertz."),
  set("sos-009", "KEYBOARD_LAYOUT", "keyboard-layout", "Keyboard Layout"),
  set("sos-010", "CAMERA_TECHNOLOGY", "camera-technology", "Camera Technology"),
  set("sos-011", "CAMERA_FORM_FACTOR", "camera-form-factor", "Camera Form Factor"),
  set("sos-012", "INSTALLATION_ENVIRONMENT", "installation-environment", "Installation Environment"),
  set("sos-013", "LENS_TYPE", "lens-type", "Lens Type"),
  set("sos-014", "LENS_SIZE", "lens-size", "Lens Size"),
  set("sos-015", "WEATHER_PROTECTION", "weather-protection", "Weather Protection Rating"),
];
