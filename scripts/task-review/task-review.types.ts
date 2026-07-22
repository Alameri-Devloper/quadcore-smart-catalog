export type ReviewFileGitState =
  | "Added"
  | "Modified"
  | "Deleted"
  | "Renamed"
  | "Copied"
  | "Untracked";

export interface TaskReviewArguments {
  readonly taskId: string;
  readonly reportPath: string;
  readonly output?: string;
  readonly baseRef?: string;
  readonly skippedCommandKeys: readonly string[];
  readonly desktopExport: boolean;
}

export interface TaskReviewCommandConfig {
  readonly key: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly required: boolean;
  readonly timeoutMs: number;
}

export interface TaskReviewVerificationResult {
  readonly key: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly required: boolean;
  readonly skipped: boolean;
  readonly skipReason: string | null;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly termination: "Exited" | "Signaled" | "TimedOut" | "SpawnFailed";
  readonly rawOutputHashes: {
    readonly stdoutSha256: string;
    readonly stderrSha256: string;
    readonly combinedSha256: string;
  };
  readonly bundledEvidence: {
    readonly path: string | null;
    readonly sanitizedSha256: string;
    readonly redactionCount: number;
  };
}

export interface TaskReviewChangedFile {
  readonly path: string;
  readonly state: ReviewFileGitState;
  readonly oldPath?: string;
  readonly copied: boolean;
  readonly sourceSha256?: string;
  readonly bundleSha256?: string;
}

export interface TaskReviewBundleFile {
  readonly path: string;
  readonly type: "SourceExact" | "EvidenceSanitized" | "Generated";
  readonly byteSize: number;
  readonly sha256: string;
  readonly originalSha256?: string;
}

export interface TaskReviewManifest {
  readonly schemaVersion: "1.1.0";
  readonly project: "Quadcore Smart Catalog";
  readonly taskId: string;
  readonly generatedAt: string;
  readonly platform: NodeJS.Platform;
  readonly nodeVersion: string;
  readonly repository: {
    readonly branch: string;
    readonly headCommit: string;
    readonly baseRef: string | null;
    readonly workingTreeClean: boolean;
    readonly initialFingerprintSha256: string;
    readonly finalFingerprintSha256: string;
  };
  readonly gitIntegrity: {
    readonly unstaged: GitIntegrityCheck;
    readonly staged: GitIntegrityCheck;
    readonly untracked: GitIntegrityCheck;
    readonly baseRef?: GitIntegrityCheck;
    readonly passed: boolean;
  };
  readonly report: {
    readonly repositoryPath: string;
    readonly sanitizedBundlePath: string;
    readonly sha256: string;
  };
  readonly changedFiles: readonly TaskReviewChangedFile[];
  readonly verification: readonly TaskReviewVerificationResult[];
  readonly redactions: {
    readonly total: number;
    readonly byCategory: Readonly<Record<string, number>>;
  };
  readonly bundleFiles: readonly TaskReviewBundleFile[];
  readonly integrityCoverage: {
    readonly rule: "AllArchivePayloadEntriesExceptManifest";
    readonly manifestPath: "manifest.json";
    readonly detachedArchiveChecksum: true;
  };
  readonly overallStatus:
    | "ReadyForReview"
    | "VerificationFailed"
    | "SecretDetectedInSource"
    | "BundleFailed";
}

export interface GitIntegrityCheck {
  readonly exitCode: number;
  readonly evidencePath: string;
  readonly passed: boolean;
}

export interface SanitizationResult {
  readonly text: string;
  readonly byCategory: Readonly<Record<string, number>>;
}

export interface RepositoryFingerprint {
  readonly sha256: string;
  readonly headCommit: string;
  readonly statusPorcelainSha256: string;
  readonly files: readonly { readonly path: string; readonly sha256: string | null }[];
}
