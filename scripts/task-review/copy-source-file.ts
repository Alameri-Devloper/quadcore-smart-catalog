import { copyFileSync, lstatSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { calculateFileSha256 } from "./calculate-sha256";
import { detectSecretMaterial, isLikelyText } from "./detect-secret-material";
import { TaskReviewError } from "./task-review.errors";

export function copySourceFile(repositoryRoot: string, bundleRoot: string, repositoryPath: string) {
  const source = join(repositoryRoot, ...repositoryPath.split("/"));
  if (lstatSync(source).isSymbolicLink()) throw new TaskReviewError(`Unsafe symbolic link: ${repositoryPath}`, "UnsafePath");
  const sourceBytes = readFileSync(source);
  const categories = isLikelyText(sourceBytes) ? detectSecretMaterial(sourceBytes.toString("utf8")) : [];
  if (categories.length > 0) {
    throw new TaskReviewError(`Suspected ${categories.join(", ")} material in source file: ${repositoryPath}`, "SecretDetectedInSource");
  }
  const destination = join(bundleRoot, "source-files", ...repositoryPath.split("/"));
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  const sourceSha256 = calculateFileSha256(source);
  const bundleSha256 = calculateFileSha256(destination);
  if (sourceSha256 !== bundleSha256) throw new TaskReviewError(`Source copy checksum mismatch: ${repositoryPath}`, "BundleFailed");
  return { sourceSha256, bundleSha256, destination };
}
