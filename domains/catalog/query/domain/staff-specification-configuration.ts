import { configurationJson, freezeConfiguration, type PortableSpecificationManifest } from "./portable-specification-configuration";

/** Existing approved configuration only; codes are scoped identities, not global UUIDs. */
export const STAFF_SPECIFICATION_CONFIGURATION = freezeConfiguration({
  "version": 1,
  "name": "staff-catalog-specifications-v1",
  "definitions": [
    {
      "code": "qa-memory",
      "displayName": "Memory / الذاكرة",
      "valueType": "Number",
      "unit": "GB",
      "sortOrder": 0,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-cpu",
      "displayName": "CPU / المعالج",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-channels",
      "displayName": "Channels / القنوات",
      "valueType": "Number",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-display",
      "displayName": "Display / الشاشة",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-gpu",
      "displayName": "GPU / الرسوميات",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-lens",
      "displayName": "Lens / العدسة",
      "valueType": "Number",
      "unit": "mm",
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-model",
      "displayName": "Model / الموديل",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-outdoor",
      "displayName": "Outdoor / خارجي",
      "valueType": "Boolean",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-recordresolution",
      "displayName": "Recording resolution / دقة التسجيل",
      "valueType": "Number",
      "unit": "MP",
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-resolution",
      "displayName": "Resolution / الدقة",
      "valueType": "Number",
      "unit": "MP",
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-storage",
      "displayName": "Storage / التخزين",
      "valueType": "Number",
      "unit": "GB",
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "qa-discovery-technology",
      "displayName": "Technology / التقنية",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 10,
      "creation": "require-existing"
    },
    {
      "code": "cpu-generation",
      "displayName": "CPU Generation / جيل المعالج",
      "valueType": "Number",
      "unit": null,
      "sortOrder": 100,
      "creation": "approved-missing"
    },
    {
      "code": "ram-ddr-type",
      "displayName": "RAM DDR Type / نوع ذاكرة الرام",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 101,
      "creation": "approved-missing"
    },
    {
      "code": "storage-technology",
      "displayName": "Storage Technology / تقنية التخزين",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 102,
      "creation": "approved-missing"
    },
    {
      "code": "gpu-memory",
      "displayName": "GPU Memory / ذاكرة الرسوميات",
      "valueType": "Number",
      "unit": "GB",
      "sortOrder": 103,
      "creation": "approved-missing"
    },
    {
      "code": "operating-system",
      "displayName": "Operating System / نظام التشغيل",
      "valueType": "Text",
      "unit": null,
      "sortOrder": 104,
      "creation": "approved-missing"
    }
  ],
  "productTypes": [
    {
      "code": "qa-business",
      "bindings": [
        {
          "definitionCode": "qa-memory",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "business",
          "أعمال"
        ],
        "fields": [
          {
            "definitionCode": "qa-memory",
            "groupId": "memory",
            "cardPriority": 1,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "ram",
                "memory",
                "رام",
                "الذاكرة"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          }
        ]
      }
    },
    {
      "code": "qa-discovery-analogcamera",
      "bindings": [
        {
          "definitionCode": "qa-discovery-technology",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-resolution",
          "sortOrder": 1,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-lens",
          "sortOrder": 2,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-outdoor",
          "sortOrder": 3,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "analog camera",
          "كاميرا تناظرية",
          "camera",
          "كاميرا"
        ],
        "fields": [
          {
            "definitionCode": "qa-discovery-technology",
            "groupId": "technology",
            "cardPriority": 3,
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "Analog",
                  "value": "Analog"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-resolution",
            "groupId": "imaging",
            "cardPriority": 1,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "resolution",
                "الدقة"
              ],
              "unitAliases": [
                "ميجا"
              ],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": true
            }
          },
          {
            "definitionCode": "qa-discovery-lens",
            "groupId": "optics",
            "cardPriority": 4,
            "importantInDetails": false,
            "filterable": false
          },
          {
            "definitionCode": "qa-discovery-outdoor",
            "groupId": "placement",
            "cardPriority": 2,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "outdoor",
                  "value": true
                },
                {
                  "phrase": "خارجية",
                  "value": true
                },
                {
                  "phrase": "خارجي",
                  "value": true
                },
                {
                  "phrase": "outdoor true",
                  "value": true
                },
                {
                  "phrase": "outdoor false",
                  "value": false
                },
                {
                  "phrase": "خارجي نعم",
                  "value": true
                },
                {
                  "phrase": "خارجي لا",
                  "value": false
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          }
        ]
      }
    },
    {
      "code": "qa-discovery-dvr",
      "bindings": [
        {
          "definitionCode": "qa-discovery-technology",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-channels",
          "sortOrder": 1,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-recordresolution",
          "sortOrder": 2,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "dvr",
          "مسجل تناظري",
          "recorder",
          "جهاز تسجيل"
        ],
        "fields": [
          {
            "definitionCode": "qa-discovery-technology",
            "groupId": "technology",
            "cardPriority": 3,
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "Analog / DVR",
                  "value": "Analog / DVR"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-channels",
            "groupId": "recording",
            "cardPriority": 1,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "channel",
                "channels",
                "قناة",
                "قنوات",
                "القنوات"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-recordresolution",
            "groupId": "recording",
            "cardPriority": 2,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "recording resolution",
                "دقة التسجيل"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          }
        ]
      }
    },
    {
      "code": "qa-discovery-ipcamera",
      "bindings": [
        {
          "definitionCode": "qa-discovery-technology",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-resolution",
          "sortOrder": 1,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-lens",
          "sortOrder": 2,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-outdoor",
          "sortOrder": 3,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "ip camera",
          "كاميرا شبكية",
          "camera",
          "كاميرا"
        ],
        "fields": [
          {
            "definitionCode": "qa-discovery-technology",
            "groupId": "technology",
            "cardPriority": 3,
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "IP",
                  "value": "IP"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-resolution",
            "groupId": "imaging",
            "cardPriority": 1,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "resolution",
                "الدقة"
              ],
              "unitAliases": [
                "ميجا"
              ],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": true
            }
          },
          {
            "definitionCode": "qa-discovery-lens",
            "groupId": "optics",
            "cardPriority": 4,
            "importantInDetails": false,
            "filterable": false
          },
          {
            "definitionCode": "qa-discovery-outdoor",
            "groupId": "placement",
            "cardPriority": 2,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "outdoor",
                  "value": true
                },
                {
                  "phrase": "خارجية",
                  "value": true
                },
                {
                  "phrase": "خارجي",
                  "value": true
                },
                {
                  "phrase": "outdoor true",
                  "value": true
                },
                {
                  "phrase": "outdoor false",
                  "value": false
                },
                {
                  "phrase": "خارجي نعم",
                  "value": true
                },
                {
                  "phrase": "خارجي لا",
                  "value": false
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          }
        ]
      }
    },
    {
      "code": "qa-discovery-laptop",
      "bindings": [
        {
          "definitionCode": "qa-discovery-model",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-cpu",
          "sortOrder": 1,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-memory",
          "sortOrder": 2,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-storage",
          "sortOrder": 3,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-gpu",
          "sortOrder": 4,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-display",
          "sortOrder": 5,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "cpu-generation",
          "sortOrder": 6,
          "required": false,
          "publicVisibility": "internal",
          "creation": "approved-missing"
        },
        {
          "definitionCode": "ram-ddr-type",
          "sortOrder": 7,
          "required": false,
          "publicVisibility": "internal",
          "creation": "approved-missing"
        },
        {
          "definitionCode": "storage-technology",
          "sortOrder": 8,
          "required": false,
          "publicVisibility": "internal",
          "creation": "approved-missing"
        },
        {
          "definitionCode": "gpu-memory",
          "sortOrder": 9,
          "required": false,
          "publicVisibility": "internal",
          "creation": "approved-missing"
        },
        {
          "definitionCode": "operating-system",
          "sortOrder": 10,
          "required": false,
          "publicVisibility": "internal",
          "creation": "approved-missing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "laptop",
          "لابتوب",
          "حاسوب محمول"
        ],
        "structuredDeviceClassAliases": [
          {
            "phrase": "gaming",
            "value": "gaming"
          },
          {
            "phrase": "ألعاب",
            "value": "gaming"
          }
        ],
        "identityModelDefinitionCode": "qa-discovery-model",
        "fields": [
          {
            "definitionCode": "qa-discovery-model",
            "groupId": "identity",
            "importantInDetails": false,
            "filterable": false
          },
          {
            "definitionCode": "qa-discovery-cpu",
            "groupId": "processor",
            "cardPriority": 1,
            "importantInDetails": true,
            "displayLabel": {
              "en": "Processor",
              "ar": "المعالج"
            },
            "filterable": true,
            "structured": {
              "aliases": [
                "processor",
                "cpu",
                "المعالج"
              ],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "Intel Core i7-1255U",
                  "value": "Intel Core i7-1255U"
                },
                {
                  "phrase": "AMD Ryzen 7 QA",
                  "value": "AMD Ryzen 7 QA"
                },
                {
                  "phrase": "Intel Core i7 QA",
                  "value": "Intel Core i7 QA"
                },
                {
                  "phrase": "Intel Core i5 QA",
                  "value": "Intel Core i5 QA"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-memory",
            "combineWithCode": "ram-ddr-type",
            "groupId": "memory",
            "cardPriority": 2,
            "importantInDetails": true,
            "displayLabel": {
              "en": "Memory (RAM)",
              "ar": "الذاكرة (الرام)"
            },
            "filterable": true,
            "structured": {
              "aliases": [
                "ram",
                "memory",
                "رام",
                "الذاكرة"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            },
            "combineSeparator": " "
          },
          {
            "definitionCode": "qa-discovery-storage",
            "combineWithCode": "storage-technology",
            "groupId": "storage",
            "cardPriority": 3,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "storage",
                "التخزين"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            },
            "combineSeparator": " "
          },
          {
            "definitionCode": "qa-discovery-gpu",
            "combineWithCode": "gpu-memory",
            "groupId": "graphics",
            "cardPriority": 4,
            "importantInDetails": false,
            "displayLabel": {
              "en": "Graphics (GPU)",
              "ar": "الرسومات (كرت الشاشة)"
            },
            "combineSeparator": " — ",
            "filterable": true,
            "structured": {
              "aliases": [
                "gpu",
                "graphics",
                "الرسوميات"
              ],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "NVIDIA RTX 4060",
                  "value": "NVIDIA RTX 4060"
                },
                {
                  "phrase": "NVIDIA RTX 3050",
                  "value": "NVIDIA RTX 3050"
                },
                {
                  "phrase": "Intel integrated QA",
                  "value": "Intel integrated QA"
                },
                {
                  "phrase": "Intel Iris Xe QA",
                  "value": "Intel Iris Xe QA"
                },
                {
                  "phrase": "RTX 4060",
                  "value": "NVIDIA RTX 4060"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-display",
            "groupId": "display",
            "cardPriority": 5,
            "importantInDetails": false,
            "filterable": false
          },
          {
            "definitionCode": "cpu-generation",
            "groupId": "processor",
            "importantInDetails": false,
            "format": "generation",
            "filterable": true,
            "structured": {
              "aliases": [
                "gen",
                "generation",
                "cpu generation",
                "جيل",
                "جيل المعالج"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": true,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "ram-ddr-type",
            "groupId": "memory",
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [
                "ddr",
                "نوع ذاكرة الرام"
              ],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "DDR5",
                  "value": "DDR5"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "storage-technology",
            "groupId": "storage",
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [
                "storage technology",
                "تقنية التخزين"
              ],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "NVMe SSD",
                  "value": "NVMe SSD"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "gpu-memory",
            "groupId": "graphics",
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [
                "gpu memory",
                "ذاكرة الرسوميات"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "operating-system",
            "groupId": "identity",
            "importantInDetails": false,
            "filterable": false
          }
        ]
      }
    },
    {
      "code": "qa-discovery-nvr",
      "bindings": [
        {
          "definitionCode": "qa-discovery-technology",
          "sortOrder": 0,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-channels",
          "sortOrder": 1,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        },
        {
          "definitionCode": "qa-discovery-recordresolution",
          "sortOrder": 2,
          "required": true,
          "publicVisibility": "internal",
          "creation": "require-existing"
        }
      ],
      "presentation": {
        "groups": [
          {
            "id": "identity",
            "label": {
              "en": "Identity",
              "ar": "الهوية"
            }
          },
          {
            "id": "processor",
            "label": {
              "en": "Processor",
              "ar": "المعالج"
            }
          },
          {
            "id": "memory",
            "label": {
              "en": "Memory",
              "ar": "الذاكرة"
            }
          },
          {
            "id": "storage",
            "label": {
              "en": "Storage",
              "ar": "التخزين"
            }
          },
          {
            "id": "graphics",
            "label": {
              "en": "Graphics",
              "ar": "الرسوميات"
            }
          },
          {
            "id": "display",
            "label": {
              "en": "Display",
              "ar": "الشاشة"
            }
          },
          {
            "id": "imaging",
            "label": {
              "en": "Imaging",
              "ar": "التصوير"
            }
          },
          {
            "id": "placement",
            "label": {
              "en": "Placement",
              "ar": "موضع الاستخدام"
            }
          },
          {
            "id": "optics",
            "label": {
              "en": "Optics",
              "ar": "البصريات"
            }
          },
          {
            "id": "recording",
            "label": {
              "en": "Recording",
              "ar": "التسجيل"
            }
          },
          {
            "id": "technology",
            "label": {
              "en": "Technology",
              "ar": "التقنية"
            }
          }
        ],
        "structuredAliases": [
          "nvr",
          "مسجل شبكي",
          "recorder",
          "جهاز تسجيل"
        ],
        "fields": [
          {
            "definitionCode": "qa-discovery-technology",
            "groupId": "technology",
            "cardPriority": 3,
            "importantInDetails": false,
            "filterable": true,
            "structured": {
              "aliases": [],
              "unitAliases": [],
              "valueAliases": [
                {
                  "phrase": "IP / NVR",
                  "value": "IP / NVR"
                }
              ],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-channels",
            "groupId": "recording",
            "cardPriority": 1,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "channel",
                "channels",
                "قناة",
                "قنوات",
                "القنوات"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          },
          {
            "definitionCode": "qa-discovery-recordresolution",
            "groupId": "recording",
            "cardPriority": 2,
            "importantInDetails": true,
            "filterable": true,
            "structured": {
              "aliases": [
                "recording resolution",
                "دقة التسجيل"
              ],
              "unitAliases": [],
              "valueAliases": [],
              "ordinal": false,
              "unitOnly": false
            }
          }
        ]
      }
    }
  ]
} satisfies PortableSpecificationManifest);

/** New entries, aliases or semantic changes require a reviewed new manifest revision. */
export function parseApprovedSpecificationManifest(value: unknown): PortableSpecificationManifest {
  if (configurationJson(value) !== configurationJson(STAFF_SPECIFICATION_CONFIGURATION)) throw new Error("UnapprovedPortableSpecificationManifest");
  return STAFF_SPECIFICATION_CONFIGURATION;
}
