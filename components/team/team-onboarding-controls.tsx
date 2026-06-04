"use client";

import React, { useState } from "react";
import { Plus, X, Sparkles, Loader2, Key, Check, Copy, Clock } from "lucide-react";

interface TeamOnboardingControlsProps {
  userId: string;
  organizationId: string;
  activeTeamId: string;
  tokens: any[];
  tokensLoading: boolean;
  requests: any[];
  requestsLoading: boolean;
  onGenerateToken: (expiresInSeconds: number, maxUses: number | null, autoJoin: boolean) => Promise<void>;
  isGeneratingToken: boolean;
  onReviewRequest: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  isReviewingRequest: boolean;
  processingId: string | null;
  onCopyLink: (link: string) => void;
  copiedId: string | null;
  generatedLink: string | null;
  onCloseGeneratedLink: () => void;
}

export function TeamOnboardingControls({
  userId,
  organizationId,
  activeTeamId,
  tokens,
  tokensLoading,
  requests,
  requestsLoading,
  onGenerateToken,
  isGeneratingToken,
  onReviewRequest,
  isReviewingRequest,
  processingId,
  onCopyLink,
  copiedId,
  generatedLink,
  onCloseGeneratedLink,
}: TeamOnboardingControlsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expiresPreset, setExpiresPreset] = useState("86400"); // 1 day
  const [maxUses, setMaxUses] = useState<string>("");
  const [autoJoin, setAutoJoin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onGenerateToken(
        parseInt(expiresPreset),
        maxUses ? parseInt(maxUses) : null,
        autoJoin
      );
      setIsFormOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate link.");
    }
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
        <div>
          <h3 className="text-sm font-black text-on-surface">Team Onboarding Controls</h3>
          <p className="text-[11px] text-outline">Generate secure registration keys and manage pending approvals for this team.</p>
        </div>
        <button
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            onCloseGeneratedLink();
            setErrorMsg(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Generate Invite Link
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="rounded-xl p-4 bg-surface-container-lowest border border-outline-variant space-y-4">
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
                id="autoJoinToggleTeamDash"
                checked={autoJoin}
                onChange={(e) => setAutoJoin(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-primary border-outline-variant"
              />
              <label htmlFor="autoJoinToggleTeamDash" className="text-[11px] font-bold text-on-surface cursor-pointer select-none">
                Bypass approval (Auto Join)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="submit"
              disabled={isGeneratingToken}
              className="px-3 py-1 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 cursor-pointer"
            >
              {isGeneratingToken && <Loader2 className="h-3 w-3 animate-spin" />}
              Generate Secure Token
            </button>
          </div>
        </form>
      )}

      {generatedLink && (
        <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 text-green-400 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider">Magic Link Generated Successfully!</span>
            <button onClick={onCloseGeneratedLink} className="text-green-400 hover:text-green-200 cursor-pointer">
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
              onClick={() => onCopyLink(generatedLink)}
              className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 flex items-center gap-1 cursor-pointer"
            >
              {copiedId === generatedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === generatedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Links Table */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> Active Invite Links ({tokens?.length || 0})
          </h5>
          {tokensLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-outline" />
            </div>
          ) : (
            <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest max-h-[200px] overflow-y-auto">
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
                            onClick={() => onCopyLink(linkStr)}
                            className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface cursor-pointer inline-block"
                            title="Copy Invite Link"
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

        {/* Pending Requests Queue */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Requests ({requests?.filter((r: any) => r.status === "pending").length || 0})
          </h5>
          {requestsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-outline" />
            </div>
          ) : (
            <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest max-h-[200px] overflow-y-auto">
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
                            disabled={isReviewingRequest && processingId === r.id}
                            onClick={() => onReviewRequest(r.id, "approved")}
                            className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Check className="h-2.5 w-2.5" /> Approve
                          </button>
                          <button
                            disabled={isReviewingRequest && processingId === r.id}
                            onClick={() => onReviewRequest(r.id, "rejected")}
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
                      <td colSpan={2} className="p-4 text-center text-outline text-[11px]">No pending join requests.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
