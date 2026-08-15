"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { identityApiClient } from "../identity-api.client";
import type { ApiResult, BranchReferenceView, BranchScopeDraft, MemberDetailsView, PermissionDefinitionView, SafeActorView } from "../identity-presentation.types";
import { generateTemporaryPassword, isBranchScopeDraftValid, isE164Phone, passwordValidationCode } from "../identity-presentation.utils";
import { ProtectedPage, useSessionExpiryRedirect } from "../components/auth-guard";
import { BranchScopeSelector, ConfirmationField, DetailSection, LabeledValue, MemberStatusBadge, PermissionSelector, RoleBadge, TemporaryPasswordControl, TemporaryPasswordOnce } from "../components/member-components";
import { AsyncButton, Card, FormField, PageHeading, PresentationShell, StatusMessage, failureMessageKey, formSubmit, usePageI18n } from "../components/presentation-shell";

const formatDate = (value: string | null): string | null => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : null;

const MemberDetailsContent = ({ actor, actorId }: { readonly actor: SafeActorView; readonly actorId: string }) => {
  const i18n = usePageI18n();
  const router = useRouter();
  const redirectExpired = useSessionExpiryRedirect();
  const [member, setMember] = useState<MemberDetailsView | null>(null);
  const [permissions, setPermissions] = useState<readonly PermissionDefinitionView[]>([]);
  const [branches, setBranches] = useState<readonly BranchReferenceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [memberLocale, setMemberLocale] = useState<"ar" | "en">("ar");
  const [phone, setPhone] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<readonly string[]>([]);
  const [branchDraft, setBranchDraft] = useState<BranchScopeDraft>({ type: "AllBranches", branchIds: [] });
  const [reviewPermissions, setReviewPermissions] = useState(false);
  const [reviewBranches, setReviewBranches] = useState(false);
  const [message, setMessage] = useState<{ readonly kind: "success" | "error" | "warning"; readonly text: string; readonly reviewCurrent?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [promoteConfirmed, setPromoteConfirmed] = useState(false);
  const [demoteConfirmed, setDemoteConfirmed] = useState(false);
  const [suspendConfirmed, setSuspendConfirmed] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [shownTemporaryPassword, setShownTemporaryPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    const [memberResult, registryResult, branchResult] = await Promise.all([identityApiClient.member(actorId), identityApiClient.permissions(), identityApiClient.branchReferences()]);
    const failed = [memberResult, registryResult, branchResult].find((result) => !result.ok);
    if (failed && !failed.ok && failed.kind === "Unauthorized") { redirectExpired(); return; }
    if (!memberResult.ok) { setLoadError(memberResult.kind === "NotFound" ? "memberNotFound" : memberResult.kind === "Forbidden" ? "forbidden" : "unavailable"); setLoading(false); return; }
    if (!registryResult.ok || !branchResult.ok) { setLoadError("unavailable"); setLoading(false); return; }
    const value = memberResult.value;
    setMember(value); setPermissions(registryResult.value); setBranches(branchResult.value);
    setDisplayName(value.displayName); setMemberLocale(value.locale); setPhone(value.whatsappPhoneE164);
    setPermissionDraft(value.role === "Staff" ? value.permissionCodes : []);
    setBranchDraft({ type: value.branchScope, branchIds: value.branchIds });
    setLoading(false);
  }, [actorId, redirectExpired]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const mutate = async (name: string, operation: Promise<ApiResult<unknown>>, options?: { readonly authorizationChange?: boolean; readonly revealPassword?: boolean }) => {
    setSubmitting(name); setMessage(null);
    const result = await operation;
    setSubmitting(null);
    if (!result.ok && result.kind === "Unauthorized") { redirectExpired(); return; }
    if (!result.ok) {
      setMessage({
        kind: result.kind === "Conflict" ? "warning" : "error",
        text: i18n.t(failureMessageKey(result.kind, result.code)),
        ...(result.kind === "Conflict" ? { reviewCurrent: true } : {}),
      });
      return;
    }
    if (options?.revealPassword) setShownTemporaryPassword(temporaryPassword);
    setTemporaryPassword(""); setReviewPermissions(false); setReviewBranches(false);
    setMessage({ kind: "success", text: i18n.t("saved") });
    if (options?.authorizationChange && actorId === actor.actorId) { router.replace("/login?expired=1"); return; }
    await load();
  };

  if (loading) return <PresentationShell i18n={i18n} actor={actor} compact><StatusMessage kind="info">{i18n.t("loading")}</StatusMessage></PresentationShell>;
  if (!member || loadError) return <PresentationShell i18n={i18n} actor={actor} compact><StatusMessage kind="error">{i18n.t(loadError ?? "unavailable")} <button className="text-button" type="button" onClick={() => void load()}>{i18n.t("refresh")}</button></StatusMessage></PresentationShell>;

  const passwordError = temporaryPassword ? passwordValidationCode(temporaryPassword) : null;
  const staffScopeValid = isBranchScopeDraftValid(branchDraft);
  return (
    <PresentationShell i18n={i18n} actor={actor}>
      <PageHeading eyebrow={i18n.t("memberManagement")} title={member.displayName} description={`@${member.username}`} actions={<Link className="button button--secondary" href="/members">{i18n.t("backToMembers")}</Link>} />
      {message ? <StatusMessage kind={message.kind}>{message.text} {message.reviewCurrent ? <button className="text-button" type="button" onClick={() => { setMessage(null); void load(); }}>{i18n.t("reviewCurrentData")}</button> : null}</StatusMessage> : null}
      {shownTemporaryPassword ? <Card><TemporaryPasswordOnce password={shownTemporaryPassword} i18n={i18n} /><button type="button" className="button button--quiet" onClick={() => setShownTemporaryPassword(null)}>{i18n.t("cancel")}</button></Card> : null}
      <div className="detail-layout">
        <Card>
          <DetailSection title={i18n.t("account")}>
            <dl className="details-grid"><LabeledValue label={i18n.t("username")} technical><span dir="ltr">{member.username}</span></LabeledValue><LabeledValue label={i18n.t("role")}><RoleBadge role={member.role} i18n={i18n} /></LabeledValue><LabeledValue label={i18n.t("status")}><MemberStatusBadge status={member.accountStatus} i18n={i18n} /></LabeledValue><LabeledValue label={i18n.t("temporaryPasswordRequired")}>{member.passwordChangeRequired ? (i18n.locale === "ar" ? "نعم" : "Yes") : (i18n.locale === "ar" ? "لا" : "No")}</LabeledValue><LabeledValue label={i18n.t("createdAt")} technical>{formatDate(member.createdAt)}</LabeledValue></dl>
          </DetailSection>
        </Card>
        <Card>
          <DetailSection title={i18n.t("profile")}>
            <form className="form-stack" onSubmit={formSubmit(() => mutate("profile", identityApiClient.updateProfile(actorId, { displayName, locale: memberLocale, expectedProfileRevision: member.profileRevision })))}>
              <div className="responsive-form-grid"><FormField id="editDisplayName" label={i18n.t("displayName")}><input id="editDisplayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></FormField><FormField id="editLocale" label={i18n.t("locale")}><select id="editLocale" value={memberLocale} onChange={(event) => setMemberLocale(event.target.value as "ar" | "en")}><option value="ar">العربية</option><option value="en">English</option></select></FormField></div>
              <AsyncButton type="submit" submitting={submitting === "profile"}>{i18n.t("save")}</AsyncButton>
            </form>
          </DetailSection>
        </Card>
        <Card>
          <DetailSection title={i18n.t("whatsapp")} description={i18n.t("whatsappSecurity")}>
            <dl className="details-grid"><LabeledValue label={i18n.t("currentNumber")} technical><span dir="ltr">{member.whatsappPhoneE164}</span></LabeledValue></dl>
            <form className="form-stack" onSubmit={formSubmit(() => { if (!isE164Phone(phone)) { setMessage({ kind: "error", text: i18n.t("invalidPhone") }); return; } return mutate("whatsapp", identityApiClient.updateWhatsApp(actorId, phone, member.recoveryContactRevision)); })}>
              <FormField id="newWhatsapp" label={i18n.t("newNumber")} hint={i18n.t("whatsappHint")}><input id="newWhatsapp" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField>
              <AsyncButton type="submit" submitting={submitting === "whatsapp"}>{i18n.t("save")}</AsyncButton>
            </form>
          </DetailSection>
        </Card>
        <Card className="detail-layout__wide">
          <DetailSection title={i18n.t("rolePermissions")} description={member.role === "Owner" ? i18n.t("ownerAccessExplanation") : i18n.t("sessionsRevoked")}>
            {member.role === "Owner" ? <StatusMessage kind="info">{i18n.t("ownerAccessExplanation")}</StatusMessage> : <form className="form-stack" onSubmit={formSubmit(() => reviewPermissions ? mutate("permissions", identityApiClient.updatePermissions(actorId, permissionDraft, member.authorizationRevision), { authorizationChange: true }) : setReviewPermissions(true))}><PermissionSelector definitions={permissions} selected={permissionDraft} onChange={(codes) => { setPermissionDraft(codes); setReviewPermissions(false); }} i18n={i18n} />{reviewPermissions ? <StatusMessage kind="warning">{i18n.t("sessionsRevoked")} {i18n.locale === "ar" ? `سيتم حفظ ${permissionDraft.length} صلاحية.` : `${permissionDraft.length} permissions will be saved.`}</StatusMessage> : null}<AsyncButton type="submit" submitting={submitting === "permissions"}>{i18n.t(reviewPermissions ? "savePermissions" : "reviewChanges")}</AsyncButton></form>}
          </DetailSection>
        </Card>
        <Card className="detail-layout__wide">
          <DetailSection title={i18n.t("branchScope")} description={member.role === "Owner" ? i18n.t("ownerAccessExplanation") : i18n.t("sessionsRevoked")}>
            {member.role === "Owner" ? <StatusMessage kind="info">{i18n.t("allBranches")}</StatusMessage> : <form className="form-stack" onSubmit={formSubmit(() => { if (!isBranchScopeDraftValid(branchDraft)) { setMessage({ kind: "error", text: i18n.t("branchRequired") }); return; } return reviewBranches ? mutate("branches", identityApiClient.updateBranchScope(actorId, branchDraft, member.authorizationRevision), { authorizationChange: true }) : setReviewBranches(true); })}><BranchScopeSelector scope={branchDraft} references={branches} onChange={(scope) => { setBranchDraft(scope); setReviewBranches(false); }} i18n={i18n} />{reviewBranches ? <StatusMessage kind="warning">{i18n.t("sessionsRevoked")}</StatusMessage> : null}<AsyncButton type="submit" submitting={submitting === "branches"}>{i18n.t(reviewBranches ? "saveBranchScope" : "reviewChanges")}</AsyncButton></form>}
          </DetailSection>
        </Card>
        <Card className="detail-layout__wide">
          <DetailSection title={i18n.t("securityLifecycle")}>
            <div className="lifecycle-grid">
              {member.role === "Staff" ? <details className="action-panel"><summary>{i18n.t("promote")}</summary><p>{i18n.t("promoteExplanation")}</p><ConfirmationField checked={promoteConfirmed} onChange={setPromoteConfirmed} i18n={i18n} /><AsyncButton type="button" disabled={!promoteConfirmed} submitting={submitting === "promote"} onClick={() => void mutate("promote", identityApiClient.promote(actorId, member.authorizationRevision), { authorizationChange: true })}>{i18n.t("promote")}</AsyncButton></details> : null}
              {member.role === "Owner" ? <details className="action-panel"><summary>{i18n.t("demote")}</summary><p>{i18n.t("demoteExplanation")}</p><PermissionSelector definitions={permissions} selected={permissionDraft} onChange={setPermissionDraft} i18n={i18n} /><BranchScopeSelector scope={branchDraft} references={branches} onChange={setBranchDraft} i18n={i18n} error={!staffScopeValid ? i18n.t("branchRequired") : null} /><ConfirmationField checked={demoteConfirmed} onChange={setDemoteConfirmed} i18n={i18n} /><AsyncButton type="button" disabled={!demoteConfirmed || !staffScopeValid} submitting={submitting === "demote"} onClick={() => void mutate("demote", identityApiClient.demote(actorId, permissionDraft, branchDraft, member.authorizationRevision), { authorizationChange: true })}>{i18n.t("demote")}</AsyncButton></details> : null}
              {member.accountStatus !== "Suspended" ? <details className="action-panel action-panel--danger"><summary>{i18n.t("suspendMember")}</summary><p>{i18n.t("suspendExplanation")}</p><ConfirmationField checked={suspendConfirmed} onChange={setSuspendConfirmed} i18n={i18n} /><AsyncButton type="button" disabled={!suspendConfirmed} submitting={submitting === "suspend"} onClick={() => void mutate("suspend", identityApiClient.suspend(actorId), { authorizationChange: true })}>{i18n.t("suspendMember")}</AsyncButton></details> : <details className="action-panel"><summary>{i18n.t("reactivate")}</summary><p>{i18n.t("reactivateExplanation")}</p><TemporaryPasswordControl id="reactivationPassword" value={temporaryPassword} onChange={setTemporaryPassword} onGenerate={() => setTemporaryPassword(generateTemporaryPassword())} i18n={i18n} error={passwordError ? i18n.t(passwordError === "PasswordLength" ? "passwordLength" : "passwordAllSpace") : null} /><AsyncButton type="button" disabled={Boolean(passwordError) || !temporaryPassword} submitting={submitting === "reactivate"} onClick={() => void mutate("reactivate", identityApiClient.reactivate(actorId, temporaryPassword), { revealPassword: true })}>{i18n.t("reactivate")}</AsyncButton></details>}
              {member.accountStatus !== "Suspended" ? <details className="action-panel"><summary>{i18n.t("resetPassword")}</summary><p>{i18n.t("resetExplanation")}</p><TemporaryPasswordControl id="resetPassword" value={temporaryPassword} onChange={setTemporaryPassword} onGenerate={() => setTemporaryPassword(generateTemporaryPassword())} i18n={i18n} error={passwordError ? i18n.t(passwordError === "PasswordLength" ? "passwordLength" : "passwordAllSpace") : null} /><AsyncButton type="button" disabled={Boolean(passwordError) || !temporaryPassword} submitting={submitting === "reset"} onClick={() => void mutate("reset", identityApiClient.resetPassword(actorId, temporaryPassword), { revealPassword: true })}>{i18n.t("resetPassword")}</AsyncButton></details> : null}
            </div>
          </DetailSection>
        </Card>
      </div>
    </PresentationShell>
  );
};

export const MemberDetailsPage = () => {
  const params = useParams<{ actorId: string }>();
  const actorId = Array.isArray(params.actorId) ? params.actorId[0] ?? "" : params.actorId;
  return <ProtectedPage ownerOnly>{(actor) => <MemberDetailsContent actor={actor} actorId={actorId} />}</ProtectedPage>;
};
