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
      | "DesktopExportFailed"
      | "BundleFailed",
  ) {
    super(message);
    this.name = "TaskReviewError";
  }
}
