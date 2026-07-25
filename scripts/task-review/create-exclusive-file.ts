import { closeSync, openSync, readFileSync, writeFileSync } from "node:fs";

export type TemporaryArtifactCreated = (path: string) => void;

export function writeFileExclusive(
  path: string,
  data: string | NodeJS.ArrayBufferView,
  onCreated?: TemporaryArtifactCreated,
): void {
  const descriptor = openSync(path, "wx");
  try {
    onCreated?.(path);
    writeFileSync(descriptor, data);
  } finally {
    closeSync(descriptor);
  }
}

export function copyFileExclusive(
  sourcePath: string,
  destinationPath: string,
  onCreated?: TemporaryArtifactCreated,
): void {
  writeFileExclusive(destinationPath, readFileSync(sourcePath), onCreated);
}
