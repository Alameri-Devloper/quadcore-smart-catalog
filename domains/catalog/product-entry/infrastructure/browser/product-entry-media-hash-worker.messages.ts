export interface ProductEntryMediaHashWorkerRequest {
  readonly requestId: string;
  readonly operationId: string;
  readonly file: File;
}

export type ProductEntryMediaHashWorkerResponse =
  | {
      readonly type: "Hashed";
      readonly requestId: string;
      readonly operationId: string;
      readonly sha256: string;
      readonly byteLength: number;
    }
  | {
      readonly type: "Failed";
      readonly requestId: string;
      readonly operationId: string;
    };

