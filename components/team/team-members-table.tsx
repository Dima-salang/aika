"use client";

import React from "react";
import { Users, Shield, Trash2, Loader2 } from "lucide-react";

interface TeamMembersTableProps {
  members: any[];
  membersLoading: boolean;
  onRemoveMember?: (userId: string, name: string) => void;
  isRemoving?: boolean;
}

export function TeamMembersTable({
  members,
  membersLoading,
  onRemoveMember,
  isRemoving,
}: TeamMembersTableProps) {
  const teamLeaders = members.filter((m) => m.role === "leader");
  const teamMembersList = members.filter((m) => m.role === "member");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Team Members List */}
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
        <div className="border-b border-outline-variant/30 pb-3">
          <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
            <Users className="h-4 w-4 text-outline" /> Team Members ({teamMembersList.length})
          </h3>
        </div>
        {membersLoading ? (
          <div className="flex justify-center py-6 flex-1 items-center">
            <Loader2 className="h-5 w-5 animate-spin text-outline" />
          </div>
        ) : (
          <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest overflow-y-auto max-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-outline-variant text-[9px] uppercase font-bold text-outline">
                  <th className="p-3">Member Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {teamMembersList.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {m.userImage ? (
                          <img src={m.userImage} alt={m.userName} className="h-6 w-6 rounded-full" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase">
                            {m.userName.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-on-surface">{m.userName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-on-surface-variant font-mono-timer">{m.userEmail}</td>
                    <td className="p-3 text-right">
                      {onRemoveMember && (
                        <button
                          onClick={() => onRemoveMember(m.userId, m.userName)}
                          disabled={isRemoving}
                          className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 cursor-pointer transition-colors inline-block"
                          title="Remove Member from Team"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {teamMembersList.length === 0 && (
                  <tr role="row">
                    <td colSpan={3} className="p-6 text-center text-outline text-[11px]">
                      No members in this team. Generate an invitation link below to onboard staff!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Leaders List */}
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
        <div className="border-b border-outline-variant/30 pb-3">
          <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Team Leaders ({teamLeaders.length})
          </h3>
        </div>
        {membersLoading ? (
          <div className="flex justify-center py-6 flex-1 items-center">
            <Loader2 className="h-5 w-5 animate-spin text-outline" />
          </div>
        ) : (
          <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest overflow-y-auto max-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-outline-variant text-[9px] uppercase font-bold text-outline">
                  <th className="p-3">Leader Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {teamLeaders.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {m.userImage ? (
                          <img src={m.userImage} alt={m.userName} className="h-6 w-6 rounded-full" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] uppercase">
                            {m.userName.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-on-surface">{m.userName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-on-surface-variant font-mono-timer">{m.userEmail}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold uppercase">
                        Leader
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
