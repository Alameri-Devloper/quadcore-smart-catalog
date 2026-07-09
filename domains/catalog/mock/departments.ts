import { DepartmentEntity } from "@/domains/catalog/types/department.entity";

export const departments: DepartmentEntity[] = [
  {
    id: "dep-001",
    code: "DEP-001",
    companyId: "COMP-001",

    name: "Computers",
    description: "Computers and laptops",
    workspaceId: "WS-001",

    icon: "💻",

    sortOrder: 1,

    isActive: true,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  {
    id: "dep-002",
    code: "DEP-002",
    companyId: "COMP-001",

    name: "Security",
    description: "CCTV and security systems",
    workspaceId: "WS-001",

    icon: "📹",

    sortOrder: 2,

    isActive: true,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  {
    id: "dep-003",
    code: "DEP-003",
    companyId: "COMP-001",

    name: "Networking",
    description: "Networking equipment",
    workspaceId: "WS-001",

    icon: "🌐",

    sortOrder: 3,

    isActive: true,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
