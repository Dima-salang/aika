"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Check, X, ShieldAlert, UserCheck, UserX, Clock } from "lucide-react";
import { toast } from "sonner";

interface JoinRequestsManagerProps {
  initialData?: any[];
  initialUsers?: any[];
  initialOrgs?: any[];
  initialTeams?: any[];
}

export function JoinRequestsManager({
  initialData,
  initialUsers,
  initialOrgs,
  initialTeams,
}: JoinRequestsManagerProps) {
  const { data: requests, isLoading, refetch } = trpc.admin.getJoinRequests.useQuery({}, {
    initialData,
  });

  const { data: users } = trpc.admin.getUsers.useQuery(undefined, {
    initialData: initialUsers,
  });

  const { data: orgs } = trpc.admin.getOrgs.useQuery(undefined, {
    initialData: initialOrgs,
  });

  const { data: teams } = trpc.admin.getTeams.useQuery(undefined, {
    initialData: initialTeams,
  });

  const reviewRequest = trpc.admin.reviewJoinRequest.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Join request reviewed successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process review");
    }
  });

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReview = async (requestId: string, status: "approved" | "rejected") => {
    setErrorMsg(null);
    setProcessingId(requestId);

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
      await reviewRequest.mutateAsync({
        requestId,
        status,
        adminId: currentUserId,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process approval decision.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Join Approval Queue</h2>
          <p className="text-body-sm text-outline">
            Review and approve or reject inbound workspace requests submitted by employees via secure magic links.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-error-container/30 border border-error-container/50 text-error text-xs rounded-lg flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading && !requests ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">User Details</th>
                <th className="p-3">Target Workspace</th>
                <th className="p-3">Target Team Scope</th>
                <th className="p-3">Submitted At</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {requests?.map((r: any) => {
                const targetUser = users?.find((u: any) => u.id === r.userId);
                const orgName = orgs?.find((o: any) => o.id === r.organizationId)?.name || r.organizationId;
                const teamName = teams?.find((t: any) => t.id === r.teamId)?.name || "Entire Workspace";

                return (
                  <tr key={r.id} className="hover:bg-surface-container-highest/20 transition-colors">
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-bold">{targetUser?.name || "Unknown User"}</span>
                        <span className="text-[10px] text-on-surface-variant font-mono-timer">{targetUser?.email || r.userId}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-on-surface-variant">{orgName}</td>
                    <td className="p-3 font-semibold text-on-surface-variant">{teamName}</td>
                    <td className="p-3 text-on-surface-variant font-mono-timer">
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      {r.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" /> Pending Review
                        </span>
                      )}
                      {r.status === "approved" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-fit">
                          <UserCheck className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/30 text-error border border-error-container/50 flex items-center gap-1 w-fit">
                          <UserX className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={processingId === r.id}
                            onClick={() => handleReview(r.id, "approved")}
                            className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {processingId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Approve
                          </button>
                          <button
                            disabled={processingId === r.id}
                            onClick={() => handleReview(r.id, "rejected")}
                            className="px-2 py-1 bg-error-container/30 text-error border border-error-container/50 rounded hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests?.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-outline">No pending join requests in queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
