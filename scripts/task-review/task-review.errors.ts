export class TaskReviewError extends Error {
  public constructor(
    message: string,
    public readonly code:
      | "InvalidArguments"
      | "RepositoryResolutionFailed"
      | "UnsafePath"
      | "SecretDetectedInSource"
      | "VerificationFailed"
      | "WorkingTreeChangedDuringVerification"
      | "WorkingTreeChangedDuringBundleCreation"
      | "ArtifactPreparationFailed"
      | "ArtifactPublicationFailed"
      | "ArtifactPublicationPartialFailure"
      | "DesktopExportFailed"
      | "BundleFailed",
  ) {
    super(message);
    this.name = "TaskReviewError";
  }
}

export class ArtifactPublicationPartialFailure extends TaskReviewError {
  public readonly operation = "publish-review-artifacts" as const;
  public readonly reconciliationRequired = true as const;

  public constructor() {
    super("Review artifact publication requires reconciliation.", "ArtifactPublicationPartialFailure");
    this.name = "ArtifactPublicationPartialFailure";
  }
}
