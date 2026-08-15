"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { identityApiClient } from "../identity-api.client";
import type { BranchReferenceView, BranchScopeDraft, PermissionDefinitionView, PermissionTemplateView, SafeActorView, WorkspaceRole } from "../identity-presentation.types";
import { generateTemporaryPassword, isBranchScopeDraftValid, isE164Phone, isUsernameDraftValid, passwordValidationCode } from "../identity-presentation.utils";
import { ProtectedPage, useSessionExpiryRedirect } from "../components/auth-guard";
import { BranchScopeSelector, PermissionSelector, TemporaryPasswordControl, TemporaryPasswordOnce } from "../components/member-components";
import { AsyncButton, Card, FormField, PageHeading, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";

const steps = ["memberInformation", "access", "branches", "temporaryPassword", "review"] as const;

const NewMemberContent = ({ actor }: { readonly actor: SafeActorView }) => {
  const i18n = usePageI18n();
  const redirectExpired = useSessionExpiryRedirect();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [memberLocale, setMemberLocale] = useState<"ar" | "en">("ar");
  const [role, setRole] = useState<WorkspaceRole>("Staff");
  const [permissions, setPermissions] = useState<readonly PermissionDefinitionView[]>([]);
  const [templates, setTemplates] = useState<readonly PermissionTemplateView[]>([]);
  const [branches, setBranches] = useState<readonly BranchReferenceView[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<readonly string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [branchScope, setBranchScope] = useState<BranchScopeDraft>({ type: "AllBranches", branchIds: [] });
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdActorId, setCreatedActorId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([identityApiClient.permissions(), identityApiClient.permissionTemplates(), identityApiClient.branchReferences()]).then(([registry, templateResult, branchResult]) => {
      if (!active) return;
      const failed = [registry, templateResult, branchResult].find((result) => !result.ok);
      if (failed && !failed.ok && failed.kind === "Unauthorized") { redirectExpired(); return; }
      if (!registry.ok || !templateResult.ok || !branchResult.ok) { setError(i18n.t("unavailable")); setLoading(false); return; }
      setPermissions(registry.value); setTemplates(templateResult.value); setBranches(branchResult.value);
      const standard = templateResult.value.find((item) => item.id === "standard-catalog-staff") ?? templateResult.value[0];
      if (standard) { setTemplateId(standard.id); setSelectedPermissions(standard.permissionCodes); }
      setLoading(false);
    });
    return () => { active = false; setTemporaryPassword(""); };
  }, [i18n, redirectExpired]);

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const selected = templates.find((item) => item.id === id);
    if (selected) setSelectedPermissions(selected.permissionCodes);
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!displayName) setError(i18n.t("fieldRequired"));
      else if (!isUsernameDraftValid(username)) setError(i18n.t("invalidUsername"));
      else if (!isE164Phone(phone)) setError(i18n.t("invalidPhone"));
      else { setError(null); return true; }
      return false;
    }
    if (step === 2 && role === "Staff" && !isBranchScopeDraftValid(branchScope)) { setError(i18n.t("branchRequired")); return false; }
    if (step === 3) {
      const validation = passwordValidationCode(temporaryPassword);
      if (validation) { setError(i18n.t(validation === "PasswordLength" ? "passwordLength" : "passwordAllSpace")); return false; }
    }
    setError(null); return true;
  };
  const next = () => { if (validateStep()) setStep((current) => Math.min(4, current + 1)); };
  const previous = () => { setError(null); setStep((current) => Math.max(0, current - 1)); };

  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true); setError(null);
    const result = await identityApiClient.createMember({
      username, displayName, whatsappPhoneE164: phone, locale: memberLocale, role,
      branchScope: role === "Owner" ? { type: "AllBranches", branchIds: [] } : branchScope,
      temporaryPassword,
      ...(role === "Staff" ? { permissionCodes: selectedPermissions } : {}),
    });
    setSubmitting(false);
    if (!result.ok && result.kind === "Unauthorized") { redirectExpired(); return; }
    if (!result.ok) { setError(result.kind === "Conflict" ? i18n.t("conflict") : i18n.t("validationError")); return; }
    setCreatedActorId(result.value.actorId);
  };

  if (createdActorId) return (
    <PresentationShell i18n={i18n} actor={actor} compact>
      <Card className="success-card"><StatusMessage kind="success">{i18n.t("createSuccess")}</StatusMessage><h1>{displayName}</h1><TemporaryPasswordOnce password={temporaryPassword} i18n={i18n} /><div className="button-row"><Link className="button button--primary" href={`/members/${encodeURIComponent(createdActorId)}`}>{i18n.t("viewDetails")}</Link><Link className="button button--secondary" href="/members">{i18n.t("backToMembers")}</Link></div></Card>
    </PresentationShell>
  );

  return (
    <PresentationShell i18n={i18n} actor={actor}>
      <PageHeading eyebrow={i18n.t("memberManagement")} title={i18n.t("newMember")} />
      <nav className="wizard-steps" aria-label={i18n.t("newMember")}><ol>{steps.map((item, index) => <li key={item} aria-current={index === step ? "step" : undefined} className={index < step ? "is-complete" : index === step ? "is-current" : ""}><span>{index + 1}</span><strong>{i18n.t(item)}</strong></li>)}</ol></nav>
      <Card className="wizard-card">
        {loading ? <StatusMessage kind="info">{i18n.t("loading")}</StatusMessage> : (
          <form onSubmit={formSubmit(step === 4 ? submit : next)} className="form-stack" noValidate>
            {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
            {step === 0 ? <div className="responsive-form-grid">
              <FormField id="displayName" label={i18n.t("displayName")}><input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></FormField>
              <FormField id="newUsername" label={i18n.t("username")} hint={i18n.t("usernameHint")}><input id="newUsername" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} required autoCapitalize="none" spellCheck={false} /></FormField>
              <FormField id="newWhatsapp" label={i18n.t("whatsapp")} hint={i18n.t("whatsappHint")}><input id="newWhatsapp" dir="ltr" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></FormField>
              <FormField id="memberLocale" label={i18n.t("locale")}><select id="memberLocale" value={memberLocale} onChange={(event) => setMemberLocale(event.target.value as "ar" | "en")}><option value="ar">العربية</option><option value="en">English</option></select></FormField>
              <FormField id="memberRole" label={i18n.t("role")}><select id="memberRole" value={role} onChange={(event) => { const nextRole = event.target.value as WorkspaceRole; setRole(nextRole); if (nextRole === "Owner") setBranchScope({ type: "AllBranches", branchIds: [] }); }}><option value="Staff">{i18n.t("staff")}</option><option value="Owner">{i18n.t("owner")}</option></select></FormField>
            </div> : null}
            {step === 1 ? role === "Owner" ? <StatusMessage kind="info">{i18n.t("ownerAccessExplanation")}</StatusMessage> : <div className="stack-lg">
              <FormField id="permissionTemplate" label={i18n.t("template")}><select id="permissionTemplate" value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>{templates.map((template) => <option value={template.id} key={template.id}>{template.id === "standard-catalog-staff" ? (i18n.locale === "ar" ? "موظف كتالوج قياسي" : "Standard Catalog Staff") : template.id}</option>)}</select></FormField>
              <p className="field-hint">{i18n.locale === "ar" ? "القالب قيمة ابتدائية فقط. يمكنك تعديل الصلاحيات قبل الإنشاء، ولن يبقى مرتبطًا بالعضو." : "The template is an initial default only. You can edit permissions before creation, and it will not remain attached."}</p>
              <PermissionSelector definitions={permissions} selected={selectedPermissions} onChange={setSelectedPermissions} i18n={i18n} />
            </div> : null}
            {step === 2 ? <BranchScopeSelector scope={role === "Owner" ? { type: "AllBranches", branchIds: [] } : branchScope} references={branches} onChange={setBranchScope} i18n={i18n} owner={role === "Owner"} error={error === i18n.t("branchRequired") ? error : null} /> : null}
            {step === 3 ? <TemporaryPasswordControl value={temporaryPassword} onChange={setTemporaryPassword} onGenerate={() => setTemporaryPassword(generateTemporaryPassword())} i18n={i18n} error={error} /> : null}
            {step === 4 ? <div className="review-grid"><ReviewValue label={i18n.t("displayName")} value={displayName} /><ReviewValue label={i18n.t("username")} value={username} technical /><ReviewValue label={i18n.t("whatsapp")} value={phone} technical /><ReviewValue label={i18n.t("locale")} value={memberLocale === "ar" ? "العربية" : "English"} /><ReviewValue label={i18n.t("role")} value={i18n.t(role === "Owner" ? "owner" : "staff")} /><ReviewValue label={i18n.t("permissions")} value={role === "Owner" ? i18n.t("ownerAccessExplanation") : String(selectedPermissions.length)} /><ReviewValue label={i18n.t("branchScope")} value={i18n.t(role === "Owner" || branchScope.type === "AllBranches" ? "allBranches" : "selectedBranches")} /></div> : null}
            <div className="wizard-actions"><button className="button button--secondary" type="button" onClick={previous} disabled={step === 0}>{i18n.t("previous")}</button><AsyncButton type="submit" submitting={submitting}>{step === 4 ? i18n.t("createMember") : i18n.t("next")}</AsyncButton></div>
          </form>
        )}
      </Card>
    </PresentationShell>
  );
};

const ReviewValue = ({ label, value, technical = false }: { readonly label: string; readonly value: string; readonly technical?: boolean }) => <div><dt>{label}</dt><dd className={technical ? "technical-value" : undefined}>{value}</dd></div>;

export const NewMemberPage = () => <ProtectedPage ownerOnly>{(actor) => <NewMemberContent actor={actor} />}</ProtectedPage>;
