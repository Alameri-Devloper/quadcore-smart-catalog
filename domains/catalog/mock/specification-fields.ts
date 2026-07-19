import type { SpecificationFieldEntity, SpecificationFieldGuidance, SpecificationFieldType } from "@/domains/catalog/types/specification-field.entity";

const timestamp = new Date().toISOString();
const scope = { companyId: "COMP-001", workspaceId: "WS-001", isActive: true, createdAt: timestamp, updatedAt: timestamp } as const;
const field = (id: string, name: string, label: string, fieldType: SpecificationFieldType, sortOrder: number, guidance: SpecificationFieldGuidance, specificationOptionSetId?: string): SpecificationFieldEntity => ({
  ...scope, id, code: id, name, label, fieldType, sortOrder, guidance, specificationOptionSetId, isRequired: false, isFilterable: true,
});

export const specificationFields: SpecificationFieldEntity[] = [
  field("sf-001", "cpu", "CPU", "text", 1, { description: "Enter the confirmed processor model.", exampleValue: "Intel Core i7-13650HX", inputHint: "Use the manufacturer processor name and model." }),
  field("sf-002", "ramCapacity", "RAM Capacity", "select", 2, { description: "Choose the installed memory capacity.", exampleValue: "16 GB", unitLabel: "GB" }, "sos-001"),
  field("sf-003", "gpu", "GPU", "text", 3, { description: "Enter the confirmed graphics processor.", exampleValue: "NVIDIA GeForce RTX 4060" }),
  field("sf-004", "storageCapacity", "Storage Capacity", "select", 4, { description: "Choose the installed storage capacity.", exampleValue: "512 GB", unitLabel: "GB" }, "sos-006"),
  field("sf-005", "screenSize", "Screen Size", "select", 5, { description: "Choose the diagonal screen size.", exampleValue: "15.6 in", unitLabel: "in" }, "sos-007"),
  field("sf-006", "operatingSystem", "Operating System", "select", 6, { description: "Choose the operating system supplied with the product.", exampleValue: "Windows 11 Pro" }, "sos-003"),
  field("sf-007", "touchScreen", "Touch Screen", "boolean", 7, { description: "Confirm whether the display supports touch input." }),
  field("sf-008", "convertible360", "Convertible 360", "boolean", 8, { description: "Confirm whether the screen folds through 360 degrees." }),
  field("sf-009", "resolution", "Resolution", "select", 9, { description: "Choose the image resolution supported by the camera.", exampleValue: "4 MP", unitLabel: "MP" }, "sos-004"),
  field("sf-010", "lensType", "Lens Type", "select", 10, { description: "Choose whether the camera lens is fixed or adjustable.", exampleValue: "Fixed" }, "sos-013"),
  field("sf-012", "poe", "PoE", "boolean", 12, { description: "Confirm whether the camera supports Power over Ethernet." }),
  field("sf-013", "ramType", "RAM Type", "select", 13, { description: "Choose the installed memory technology.", exampleValue: "DDR5" }, "sos-002"),
  field("sf-014", "storageType", "Storage Type", "select", 14, { description: "Choose the installed storage technology.", exampleValue: "NVMe SSD" }, "sos-005"),
  field("sf-015", "refreshRate", "Refresh Rate", "select", 15, { description: "Choose how many times the screen refreshes each second.", exampleValue: "144 Hz", unitLabel: "Hz" }, "sos-008"),
  field("sf-016", "keyboardLayout", "Keyboard Layout", "select", 16, { description: "Choose the printed keyboard language layout.", exampleValue: "Arabic / English" }, "sos-009"),
  field("sf-017", "cameraTechnology", "Camera Technology", "select", 17, { description: "Choose how the camera carries video and connects to the surveillance system.", exampleValue: "IP" }, "sos-010"),
  field("sf-018", "cameraFormFactor", "Camera Form Factor", "select", 18, { description: "Choose the physical enclosure shape.", exampleValue: "Bullet" }, "sos-011"),
  field("sf-019", "installationEnvironment", "Installation Environment", "select", 19, { description: "Choose where the camera enclosure is designed to operate.", exampleValue: "Outdoor" }, "sos-012"),
  field("sf-020", "lensSize", "Lens Size", "select", 20, { description: "Choose the lens focal length or approved focal range.", exampleValue: "2.8 mm", unitLabel: "mm" }, "sos-014"),
  field("sf-021", "microphone", "Microphone", "boolean", 21, { description: "Confirm whether the camera has a built-in microphone." }),
  field("sf-022", "speaker", "Speaker", "boolean", 22, { description: "Confirm whether the camera has a built-in speaker." }),
  field("sf-023", "wifi", "Wi-Fi", "boolean", 23, { description: "Confirm whether the camera can connect through Wi-Fi." }),
  field("sf-024", "weatherProtectionRating", "Weather Protection Rating", "select", 24, { description: "Choose the enclosure protection rating.", exampleValue: "IP67" }, "sos-015"),
  field("sf-025", "sensorModel", "Sensor Model", "text", 25, { description: "Enter the official image sensor model when confirmed.", exampleValue: "1/2.9 in CMOS", inputHint: "Leave empty when the manufacturer does not provide it." }),
  field("sf-026", "nightVisionDistance", "Night Vision Distance", "number", 26, { description: "Enter the maximum infrared night-vision distance.", exampleValue: "30", unitLabel: "m", inputHint: "Enter a numeric distance only.", invalidExample: "Do not enter “30 meters”." }),
];
