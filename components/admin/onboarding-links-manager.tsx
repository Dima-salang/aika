"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Trash2, Copy, Check, X, ShieldAlert, Key } from "lucide-react";
import { toast } from "sonner";

interface OnboardingLinksManagerProps {
  initialData?: any[];
  initialOrgs?: any[];
  initialTeams?: any[];
}

export function OnboardingLinksManager({
  initialData,
  initialOrgs,
  initialTeams,
}: OnboardingLinksManagerProps) {
  const { data: tokens, isLoading, refetch } = trpc.admin.getJoinTokens.useQuery({}, {
    initialData,
  });

  const { data: orgs } = trpc.admin.getOrgs.useQuery(undefined, {
    initialData: initialOrgs,
  });

  const { data: teams } = trpc.admin.getTeams.useQuery(undefined, {
    initialData: initialTeams,
  });

  const { data: session } = trpc.healthCheck.useQuery(); // Just to get a trigger, but actually we can get session from authClient or layout. We'll pass createdBy as session.user.id on submission.
  const createToken = trpc.admin.createJoinToken.useMutation({
    onSuccess: () => {
      refetch();
      setIsFormOpen(false);
      resetForm();
      toast.success("Magic onboarding link generated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate magic link");
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form values
  const [orgId, setOrgId] = useState(orgs?.[0]?.id || "");
  const [teamId, setTeamId] = useState<string>("");
  const [expiresPreset, setExpiresPreset] = useState("86400"); // Default 1 day
  const [maxUses, setMaxUses] = useState<string>("");
  const [autoJoin, setAutoJoin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setOrgId(orgs?.[0]?.id || "");
    setTeamId("");
    setExpiresPreset("86400");
    setMaxUses("");
    setAutoJoin(false);
    setErrorMsg(null);
  };

  const handleCopyLink = (tokenId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const inviteLink = `${origin}/join?token=${tokenId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Get current session user id
    let currentUserId = "admin-user"; // Fallback
    try {
      const sessRes = await fetch("/api/auth/get-session");
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData?.user?.id) {
          currentUserId = sessData.user.id;
        }
      }
    } catch (err) {}

    try {
      await createToken.mutateAsync({
        organizationId: orgId,
        teamId: teamId || null,
        createdBy: currentUserId,
        expiresInSeconds: parseInt(expiresPreset),
        maxUses: maxUses ? parseInt(maxUses) : null,
        autoJoin,
      });
    } catch (err) {
      setErrorMsg((err as Error)?.message || "Failed to generate secure onboarding link.");
    }
  };

  const filteredTeams = teams?.filter((t) => t.organization_id === orgId && !t.deleted_at) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Secure Onboarding Links</h2>
          <p className="text-body-sm text-outline">
            Generate cryptographically secure magic links that allow prospective employees to request join access or enroll instantly.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Generate Magic Link
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4"
        >
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">Configure Onboarding Link</h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-error-container/30 border border-error-container/50 text-error text-xs rounded-lg flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Workspace Scope</label>
              <select
                required
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setTeamId("");
                }}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="" disabled>Select Organization</option>
                {orgs?.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Team Assignment (Optional)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">None (Workspace-level only)</option>
                {filteredTeams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Expiration Preset</label>
              <select
                value={expiresPreset}
                onChange={(e) => setExpiresPreset(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="3600">1 Hour</option>
                <option value="86400">24 Hours (1 Day)</option>
                <option value="604800">7 Days</option>
                <option value="2592000">30 Days</option>
                <option value="31536000">365 Days (1 Year)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Max Usage Limit (Optional)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 5 (Unlimited if empty)"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="autoJoinToggle"
                checked={autoJoin}
                onChange={(e) => setAutoJoin(e.target.checked)}
                className="h-4 w-4 border-outline-variant rounded text-primary focus:ring-primary"
              />
              <label htmlFor="autoJoinToggle" className="text-xs font-bold text-on-surface cursor-pointer select-none">
                Bypass approval queue (Instant Enrollment via auto-join)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createToken.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
            >
              {createToken.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Generate Link
            </button>
          </div>
        </form>
      )}

      {isLoading && !tokens ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Organization</th>
                <th className="p-3">Team Scope</th>
                <th className="p-3">Expires At</th>
                <th className="p-3">Auto Join</th>
                <th className="p-3">Uses / Max</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tokens?.map((t: any) => {
                const orgName = orgs?.find((o: any) => o.id === t.organizationId)?.name || t.organizationId;
                const teamName = teams?.find((team: any) => team.id === t.teamId)?.name || "Entire Workspace";
                const isExpired = new Date() > new Date(t.expiresAt);

                return (
                  <tr key={t.id} className="hover:bg-surface-container-highest/20 transition-colors">
                    <td className="p-3 font-bold">{orgName}</td>
                    <td className="p-3 font-semibold text-on-surface-variant">{teamName}</td>
                    <td className="p-3 text-on-surface-variant font-mono-timer">
                      {new Date(t.expiresAt).toLocaleDateString()} {new Date(t.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isExpired && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-error-container/30 text-error text-[8px] font-bold border border-error-container/40">Expired</span>
                      )}
                    </td>
                    <td className="p-3">
                      {t.autoJoin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Instant Join</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Requires Approval</span>
                      )}
                    </td>
                    <td className="p-3 font-mono-timer font-semibold">
                      {t.usesCount} / {t.maxUses !== null ? t.maxUses : "∞"}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleCopyLink(t.id)}
                        className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block cursor-pointer"
                        title="Copy Magic Link"
                      >
                        {copiedId === t.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tokens?.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-outline">No secure onboarding links generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
