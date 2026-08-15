"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { identityApiClient } from "../identity-api.client";
import type { AsyncViewState, CommunicationSettingsView, MemberListView, SafeActorView } from "../identity-presentation.types";
import { communicationSettingsAfterConfirmedSave, isE164Phone } from "../identity-presentation.utils";
import { ProtectedPage, useSessionExpiryRedirect } from "../components/auth-guard";
import { MemberStatusBadge, RoleBadge } from "../components/member-components";
import { AsyncButton, Card, FormField, PageHeading, PresentationShell, StatusMessage, failureMessageKey, formSubmit, usePageI18n } from "../components/presentation-shell";

const branchSummary = (member: MemberListView, locale: "ar" | "en") => member.branchScope === "AllBranches"
  ? (locale === "ar" ? "كل الفروع" : "All branches")
  : locale === "ar" ? `${member.branchIds.length} فرع محدد` : `${member.branchIds.length} selected branches`;

const CommunicationSettings = () => {
  const i18n = usePageI18n();
  const redirectExpired = useSessionExpiryRedirect();
  const [settings, setSettings] = useState<CommunicationSettingsView | null>(null);
  const [state, setState] = useState<AsyncViewState>("Loading");
  const [message, setMessage] = useState<string | null>(null);
  const loadSettings = useCallback(() => {
    setState("Loading");
    setMessage(null);
    void identityApiClient.communicationSettings().then((result) => {
      if (result.ok) { setSettings(result.value); setState("Ready"); }
      else if (result.kind === "Unauthorized") redirectExpired();
      else setState(result.kind === "Forbidden" ? "Forbidden" : "Unavailable");
    });
  }, [redirectExpired]);
  useEffect(() => {
    const timer = window.setTimeout(loadSettings, 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  const save = async () => {
    if (!settings || !isE164Phone(settings.defaultWhatsAppPhoneE164)) { setMessage(i18n.t("invalidPhone")); return; }
    setState("Submitting"); setMessage(null);
    const result = await identityApiClient.updateCommunicationSettings(settings);
    if (!result.ok && result.kind === "Unauthorized") { redirectExpired(); return; }
    if (!result.ok) {
      setState(result.kind === "Conflict" ? "Conflict" : "ValidationError");
      setMessage(i18n.t(result.kind === "Conflict" ? "settingsConflict" : failureMessageKey(result.kind, result.code)));
      return;
    }
    setSettings(communicationSettingsAfterConfirmedSave(settings, result));
    setState("Success"); setMessage(i18n.t("saved"));
  };

  return (
    <Card>
      <details className="settings-disclosure">
        <summary><span>{i18n.t("communicationSettings")}</span><span aria-hidden="true">＋</span></summary>
        {state === "Loading" ? <StatusMessage kind="info">{i18n.t("loading")}</StatusMessage> : null}
        {state === "Unavailable" || state === "Forbidden" ? <StatusMessage kind="error">{i18n.t(state === "Forbidden" ? "forbidden" : "unavailable")}</StatusMessage> : null}
        {settings && !["Loading", "Unavailable", "Forbidden"].includes(state) ? (
          <form className="form-stack settings-form" onSubmit={formSubmit(save)}>
            {message ? <StatusMessage kind={state === "Success" ? "success" : state === "Conflict" ? "warning" : "error"}>{message} {state === "Conflict" ? <button className="text-button" type="button" onClick={loadSettings}>{i18n.t("reviewCurrentData")}</button> : null}</StatusMessage> : null}
            <FormField id="defaultWhatsApp" label={i18n.t("defaultWhatsApp")} hint={i18n.t("whatsappHint")}>
              <input id="defaultWhatsApp" dir="ltr" value={settings.defaultWhatsAppPhoneE164} onChange={(event) => setSettings({ ...settings, defaultWhatsAppPhoneE164: event.target.value })} />
            </FormField>
            <FormField id="recoveryPolicy" label={i18n.t("recoveryPolicy")}>
              <select id="recoveryPolicy" value={settings.passwordRecoveryPolicy} onChange={(event) => setSettings({ ...settings, passwordRecoveryPolicy: event.target.value as CommunicationSettingsView["passwordRecoveryPolicy"] })}>
                <option value="OwnerManagedOnly">{i18n.t("ownerManagedOnly")}</option>
                <option value="WhatsAppOtpWithOwnerFallback">{i18n.t("whatsappFallback")}</option>
              </select>
            </FormField>
            <p className="field-hint">{i18n.locale === "ar" ? "لا تتضمن هذه الإعدادات بيانات اعتماد مزود واتساب." : "These settings do not include WhatsApp provider credentials."}</p>
            <AsyncButton type="submit" submitting={state === "Submitting"}>{state === "Submitting" ? i18n.t("submitting") : i18n.t("save")}</AsyncButton>
          </form>
        ) : null}
      </details>
    </Card>
  );
};

const MembersContent = ({ actor }: { readonly actor: SafeActorView }) => {
  const i18n = usePageI18n();
  const redirectExpired = useSessionExpiryRedirect();
  const [members, setMembers] = useState<readonly MemberListView[]>([]);
  const [state, setState] = useState<AsyncViewState>("Loading");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const load = useCallback(() => {
    setState("Loading");
    void identityApiClient.members().then((result) => {
      if (!result.ok && result.kind === "Unauthorized") { redirectExpired(); return; }
      if (!result.ok) { setState(result.kind === "Forbidden" ? "Forbidden" : "Unavailable"); return; }
      setMembers(result.value); setState(result.value.length === 0 ? "Empty" : "Ready");
    });
  }, [redirectExpired]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => members.filter((member) => {
    const query = search.toLocaleLowerCase("en");
    return (!query || member.displayName.toLocaleLowerCase("en").includes(query) || member.username.toLocaleLowerCase("en").includes(query))
      && (!role || member.role === role) && (!status || member.accountStatus === status);
  }), [members, role, search, status]);

  return (
    <PresentationShell i18n={i18n} actor={actor}>
      <PageHeading title={i18n.t("memberManagement")} description={i18n.t("memberManagementIntro")} actions={<Link className="button button--primary" href="/members/new">{i18n.t("newMember")}</Link>} />
      <CommunicationSettings />
      <Card>
        <div className="filter-grid">
          <FormField id="memberSearch" label={i18n.t("searchMembers")}>
            <input id="memberSearch" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </FormField>
          <FormField id="roleFilter" label={i18n.t("role")}>
            <select id="roleFilter" value={role} onChange={(event) => setRole(event.target.value)}><option value="">{i18n.t("allRoles")}</option><option value="Owner">{i18n.t("owner")}</option><option value="Staff">{i18n.t("staff")}</option></select>
          </FormField>
          <FormField id="statusFilter" label={i18n.t("status")}>
            <select id="statusFilter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{i18n.t("allStatuses")}</option><option value="PendingActivation">{i18n.t("pendingActivation")}</option><option value="Active">{i18n.t("active")}</option><option value="Suspended">{i18n.t("suspended")}</option></select>
          </FormField>
        </div>
        {state === "Loading" ? <div className="skeleton-list" aria-label={i18n.t("loading")}><span /><span /><span /></div> : null}
        {state === "Forbidden" || state === "Unavailable" ? <StatusMessage kind="error">{i18n.t(state === "Forbidden" ? "forbidden" : "unavailable")} <button type="button" className="text-button" onClick={load}>{i18n.t("refresh")}</button></StatusMessage> : null}
        {state === "Empty" || (state === "Ready" && filtered.length === 0) ? <div className="empty-state"><strong>{i18n.t("noMembers")}</strong></div> : null}
        {state === "Ready" && filtered.length > 0 ? (
          <>
            <div className="member-cards">
              {filtered.map((member) => <article className="member-card" key={member.actorId}>
                <div className="member-card__heading"><div><h2>{member.displayName}</h2><p className="technical-value" dir="ltr">@{member.username}</p></div><MemberStatusBadge status={member.accountStatus} i18n={i18n} /></div>
                <div className="badge-row"><RoleBadge role={member.role} i18n={i18n} />{member.passwordChangeRequired ? <span className="badge badge--warning">{i18n.t("temporaryPasswordRequired")}</span> : null}</div>
                <dl className="member-card__details"><div><dt>{i18n.t("whatsapp")}</dt><dd dir="ltr">{member.whatsappPhoneE164}</dd></div><div><dt>{i18n.t("branchScope")}</dt><dd>{branchSummary(member, i18n.locale)}</dd></div></dl>
                <Link className="button button--secondary button--full" href={`/members/${encodeURIComponent(member.actorId)}`}>{i18n.t("viewDetails")}</Link>
              </article>)}
            </div>
            <div className="member-table-wrap"><table className="member-table"><thead><tr><th>{i18n.t("displayName")}</th><th>{i18n.t("role")}</th><th>{i18n.t("status")}</th><th>{i18n.t("whatsapp")}</th><th>{i18n.t("branchScope")}</th><th><span className="sr-only">{i18n.t("viewDetails")}</span></th></tr></thead><tbody>{filtered.map((member) => <tr key={member.actorId}><td><strong>{member.displayName}</strong><small dir="ltr">@{member.username}</small></td><td><RoleBadge role={member.role} i18n={i18n} /></td><td><MemberStatusBadge status={member.accountStatus} i18n={i18n} />{member.passwordChangeRequired ? <small>{i18n.t("temporaryPasswordRequired")}</small> : null}</td><td dir="ltr">{member.whatsappPhoneE164}</td><td>{branchSummary(member, i18n.locale)}</td><td><Link className="text-button" href={`/members/${encodeURIComponent(member.actorId)}`}>{i18n.t("viewDetails")}</Link></td></tr>)}</tbody></table></div>
          </>
        ) : null}
      </Card>
    </PresentationShell>
  );
};

export const MembersPage = () => <ProtectedPage ownerOnly>{(actor) => <MembersContent actor={actor} />}</ProtectedPage>;
