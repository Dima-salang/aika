"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { calculateDurationHours } from "@/utils/time";
import { Loader2, Plus, Trash2, Copy, Check, X, ShieldAlert, Key, Sparkles, UserCheck, UserX, Clock, FileText } from "lucide-react";
import { useImageViewer } from "@/utils/image-viewer-store";
import { isImageUrl } from "@/utils/file";

interface DashboardManageControlsProps {
  userId: string;
}

export function DashboardManageControls({ userId }: DashboardManageControlsProps) {
  const { data: profile, isLoading: profileLoading } = trpc.getMyManageProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const [selectedEntity, setSelectedEntity] = useState<{ type: "org" | "team"; id: string } | null>(null);

  // Form & list states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresPreset, setExpiresPreset] = useState("86400"); // 1 day
  const [maxUses, setMaxUses] = useState<string>("");
  const [autoJoin, setAutoJoin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Queries scoped to selected entity
  const orgId = selectedEntity?.type === "org" ? selectedEntity.id : undefined;
  const teamId = selectedEntity?.type === "team" ? selectedEntity.id : undefined;

  // If a team is selected, we need to know its parent organizationId to create join tokens
  const selectedTeamObj = profile?.managedTeams?.find((t) => t.id === teamId);
  const resolvedOrgId = orgId || selectedTeamObj?.organization_id || "";

  const { data: tokens, refetch: refetchTokens, isLoading: tokensLoading } = trpc.admin.getJoinTokens.useQuery(
    { organizationId: resolvedOrgId || undefined, teamId: teamId || undefined },
    { enabled: !!resolvedOrgId }
  );

  const { data: requests, refetch: refetchRequests, isLoading: requestsLoading } = trpc.admin.getJoinRequests.useQuery(
    { organizationId: resolvedOrgId || undefined, teamId: teamId || undefined },
    { enabled: !!resolvedOrgId }
  );

  const { data: teamTimeline, isLoading: timelineLoading } = trpc.getTeamTimeline.useQuery(
    { userId, teamId: teamId || "" },
    { enabled: selectedEntity?.type === "team" && !!teamId }
  );

  const createToken = trpc.admin.createJoinToken.useMutation({
    onSuccess: (data) => {
      refetchTokens();
      setIsFormOpen(false);
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      if (data?.id) {
        setGeneratedLink(`${origin}/join?token=${data.id}`);
      }
      setErrorMsg(null);
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to generate link.");
    },
  });

  const reviewRequest = trpc.admin.reviewJoinRequest.useMutation({
    onSuccess: () => {
      refetchRequests();
    },
  });

  const handleReview = async (requestId: string, status: "approved" | "rejected") => {
    setErrorMsg(null);
    setProcessingId(requestId);
    try {
      await reviewRequest.mutateAsync({
        requestId,
        status,
        adminId: userId,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-outline" />
      </div>
    );
  }

  const hasManagedEntities = (profile?.managedOrgs?.length || 0) > 0 || (profile?.managedTeams?.length || 0) > 0;

  if (!hasManagedEntities) {
    return null;
  }

  // Set default entity if none selected
  if (!selectedEntity && profile) {
    if (profile.managedOrgs.length > 0) {
      setSelectedEntity({ type: "org", id: profile.managedOrgs[0].id });
    } else if (profile.managedTeams.length > 0) {
      setSelectedEntity({ type: "team", id: profile.managedTeams[0].id });
    }
  }

  return (
    <div className="mt-6 border-t border-outline-variant pt-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-body-md font-bold text-on-surface">Workspace Management</h4>
          <p className="text-[11px] text-outline">Manage onboarding flows and approval request queues for your teams.</p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedEntity ? `${selectedEntity.type}:${selectedEntity.id}` : ""}
            onChange={(e) => {
              const [type, id] = e.target.value.split(":");
              setSelectedEntity({ type: type as "org" | "team", id });
              setGeneratedLink(null);
              setIsFormOpen(false);
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            {profile?.managedOrgs?.map((o: any) => (
              <option key={o.id} value={`org:${o.id}`}>
                Workspace: {o.name}
              </option>
            ))}
            {profile?.managedTeams?.map((t: any) => (
              <option key={t.id} value={`team:${t.id}`}>
                Team Leader: {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              setGeneratedLink(null);
              setErrorMsg(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Generate Magic Link
          </button>
        </div>
      </div>

      {isFormOpen && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createToken.mutateAsync({
              organizationId: resolvedOrgId,
              teamId: teamId || null,
              createdBy: userId,
              expiresInSeconds: parseInt(expiresPreset),
              maxUses: maxUses ? parseInt(maxUses) : null,
              autoJoin,
            });
          }}
          className="rounded-xl p-4 bg-surface-container-lowest border border-outline-variant space-y-4"
        >
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h5 className="text-xs font-bold text-on-surface flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Configure Invitation Link
            </h5>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-outline hover:text-on-surface cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-error-container/30 border border-error-container/50 text-error text-[10px] font-bold rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-outline uppercase block">Link Expiration</label>
              <select
                value={expiresPreset}
                onChange={(e) => setExpiresPreset(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-1.5 text-xs text-on-surface focus:outline-none"
              >
                <option value="3600">1 Hour</option>
                <option value="86400">1 Day (24h)</option>
                <option value="604800">7 Days</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-outline uppercase block">Max Uses (Optional)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 5 (Unlimited if empty)"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-1.5 text-xs text-on-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 sm:pt-4">
              <input
                type="checkbox"
                id="autoJoinToggleDash"
                checked={autoJoin}
                onChange={(e) => setAutoJoin(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-primary border-outline-variant"
              />
              <label htmlFor="autoJoinToggleDash" className="text-[11px] font-bold text-on-surface cursor-pointer select-none">
                Bypass approval (Auto Join)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="submit"
              disabled={createToken.isPending}
              className="px-3 py-1 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 cursor-pointer"
            >
              {createToken.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Generate Secure Token
            </button>
          </div>
        </form>
      )}

      {generatedLink && (
        <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 text-green-400 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider">Magic Link Generated Successfully!</span>
            <button onClick={() => setGeneratedLink(null)} className="text-green-400 hover:text-green-200 cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={generatedLink}
              className="flex-1 bg-surface-container-lowest/50 border border-green-500/30 rounded-lg p-1.5 text-xs text-green-300 font-mono-timer focus:outline-none"
            />
            <button
              onClick={() => handleCopy(generatedLink)}
              className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 flex items-center gap-1 cursor-pointer"
            >
              {copiedId === generatedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === generatedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Magic Links List */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> Active Invite Links ({tokens?.length || 0})
          </h5>

          {tokensLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-outline" />
            </div>
          ) : (
            <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 border-b border-outline-variant text-[9px] uppercase font-bold text-outline">
                    <th className="p-2">Target Scope</th>
                    <th className="p-2">Uses</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {tokens?.map((t: any) => {
                    const scopeText = t.teamId ? "Team Scope" : "Workspace Scope";
                    const isExpired = new Date() > new Date(t.expiresAt);
                    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                    const linkStr = `${origin}/join?token=${t.id}`;

                    return (
                      <tr key={t.id} className="hover:bg-surface-container-low/50">
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className="font-bold">{scopeText}</span>
                            <span className="text-[9px] text-outline font-mono-timer truncate max-w-[140px]">{t.id}</span>
                          </div>
                        </td>
                        <td className="p-2 font-mono-timer">
                          {t.usesCount} / {t.maxUses !== null ? t.maxUses : "∞"}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleCopy(linkStr)}
                            className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface cursor-pointer inline-block"
                            title="Copy Magic Link"
                          >
                            {copiedId === linkStr ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tokens?.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-outline text-[11px]">No active invitation links.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Requests Queue */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Requests ({requests?.filter((r: any) => r.status === "pending").length || 0})
          </h5>

          {requestsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-outline" />
            </div>
          ) : (
            <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/50 border-b border-outline-variant text-[9px] uppercase font-bold text-outline">
                    <th className="p-2">User ID / Email</th>
                    <th className="p-2 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {requests?.filter((r: any) => r.status === "pending").map((r: any) => (
                    <tr key={r.id} className="hover:bg-surface-container-low/50">
                      <td className="p-2 font-mono-timer truncate max-w-[150px] font-bold">
                        {r.userId}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={processingId === r.id}
                            onClick={() => handleReview(r.id, "approved")}
                            className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Check className="h-2.5 w-2.5" /> Approve
                          </button>
                          <button
                            disabled={processingId === r.id}
                            onClick={() => handleReview(r.id, "rejected")}
                            className="px-1.5 py-0.5 bg-error-container/20 text-error border border-error-container/35 hover:bg-red-500 hover:text-white rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {requests?.filter((r: any) => r.status === "pending").length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-outline text-[11px]">No pending join requests in queue.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedEntity?.type === "team" && (
        <div className="border-t border-outline-variant pt-6 space-y-4">
          <h5 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Team Activity Timeline
          </h5>

          {timelineLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : teamTimeline && teamTimeline.length > 0 ? (
            <div className="relative pl-6 border-l border-outline-variant/60 space-y-8 py-2">
              {teamTimeline.map((log: any) => {
                const durationHrs = calculateDurationHours(log.duration).toFixed(2);
                
                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-outline-variant bg-surface group-hover:border-primary transition-colors flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-outline group-hover:bg-primary transition-colors" />
                    </div>

                    <div className="glass-card rounded-xl p-4 bg-surface-container-low border border-outline-variant/60 hover:border-outline-variant transition-all space-y-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          {log.userImage ? (
                            <img src={log.userImage} alt={log.userName} className="h-7 w-7 rounded-full" />
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {log.userName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-extrabold text-on-surface">{log.userName}</span>
                            <span className="text-[10px] text-outline ml-2 font-medium">({log.userEmail})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/40 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {durationHrs} hrs logged
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h6 className="text-xs font-bold text-on-surface">{log.title || "Untitled Activity"}</h6>
                        <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{log.description}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-[10px] text-outline font-semibold border-t border-outline-variant/20">
                        <div>
                          <span className="uppercase block text-[8px] tracking-wider mb-0.5">Clock In</span>
                          <span className="font-mono-timer text-on-surface-variant">
                            {new Date(log.start_time).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="uppercase block text-[8px] tracking-wider mb-0.5">Clock Out</span>
                          <span className="font-mono-timer text-on-surface-variant">
                            {new Date(log.end_time).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Document Evidence Proofs */}
                      {log.evidence && log.evidence.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-bold uppercase text-outline tracking-wider block">Attached Proofs ({log.evidence.length})</span>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const imageList = log.evidence
                                .filter((e: any) => e.mime_type ? e.mime_type.startsWith("image/") : isImageUrl(e.file_url))
                                .map((e: any) => e.file_url);

                              return log.evidence.map((ev: any) => {
                                const isImg = ev.mime_type ? ev.mime_type.startsWith("image/") : isImageUrl(ev.file_url);
                                return (
                                  <button
                                    key={ev.id}
                                    onClick={() => {
                                      if (isImg) {
                                        const imgIdx = imageList.indexOf(ev.file_url);
                                        useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                                      } else {
                                        window.open(ev.file_url, "_blank");
                                      }
                                    }}
                                    className="relative h-12 w-12 border border-outline-variant rounded overflow-hidden hover:scale-105 active:scale-95 transition-all block shadow-sm group/ev flex items-center justify-center bg-surface-container-high/40 cursor-pointer focus:outline-none"
                                  >
                                    {isImg ? (
                                      <img src={ev.file_url} alt={ev.file_name} className="h-full w-full object-cover" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-primary" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center transition-all">
                                      <span className="material-symbols-outlined text-white text-[14px]">open_in_new</span>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-outline-variant rounded-xl">
              <p className="text-outline text-xs font-semibold">No activity logs recorded for this team yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
