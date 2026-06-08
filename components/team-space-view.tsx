"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { 
  Loader2, 
  Users,
  Clock, 
  ShieldAlert,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { TeamMembersTable } from "./team/team-members-table";
import { TeamOnboardingControls } from "./team/team-onboarding-controls";
import { TeamTimelineFeed } from "./team/team-timeline-feed";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamSpaceViewProps {
  userId: string;
  organizationId: string;
  activeTeamId: string | null;
}

export function TeamSpaceView({ userId, organizationId, activeTeamId: propActiveTeamId }: TeamSpaceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "members" | "manage">("feed");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = trpc.getMyManageProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: userTeams, isLoading: userTeamsLoading } = trpc.getUserTeams.useQuery(
    { userId, organizationId },
    { enabled: !!userId && !!organizationId }
  );

  const activeTeamId = selectedTeamId || propActiveTeamId || userTeams?.[0]?.id || "";

  // Queries
  const { data: members, refetch: refetchMembers, isLoading: membersLoading } = trpc.getTeamMembers.useQuery(
    { userId, teamId: activeTeamId },
    { enabled: !!activeTeamId }
  );

  const { data: tokens, refetch: refetchTokens, isLoading: tokensLoading } = trpc.admin.getJoinTokens.useQuery(
    { organizationId, teamId: activeTeamId || undefined },
    { enabled: !!activeTeamId }
  );

  const { data: requests, refetch: refetchRequests, isLoading: requestsLoading } = trpc.admin.getJoinRequests.useQuery(
    { organizationId, teamId: activeTeamId || undefined },
    { enabled: !!activeTeamId }
  );

  const { data: teamTimeline, isLoading: timelineLoading } = trpc.getTeamTimeline.useQuery(
    { userId, teamId: activeTeamId },
    { enabled: !!activeTeamId }
  );

  // Determine user leadership status
  const currentUserMember = members?.find((m) => m.userId === userId);
  const isLeader = currentUserMember?.role === "leader" || profile?.managedOrgs?.some(o => o.id === organizationId);

  // Mutations
  const removeMemberMutation = trpc.removeTeamMember.useMutation({
    onSuccess: () => {
      refetchMembers();
      toast.success("Member successfully removed from team.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove member.");
    }
  });

  const createToken = trpc.admin.createJoinToken.useMutation({
    onSuccess: (data) => {
      refetchTokens();
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      if (data?.id) {
        setGeneratedLink(`${origin}/join?token=${data.id}`);
      }
      toast.success("Invitation link generated!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate link.");
    },
  });

  const reviewRequest = trpc.admin.reviewJoinRequest.useMutation({
    onSuccess: () => {
      refetchRequests();
      refetchMembers();
      toast.success("Request reviewed successfully.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process request.");
    }
  });

  const handleGenerateToken = async (expiresInSeconds: number, maxUses: number | null, autoJoin: boolean) => {
    await createToken.mutateAsync({
      organizationId,
      teamId: activeTeamId || null,
      createdBy: userId,
      expiresInSeconds,
      maxUses,
      autoJoin,
    });
  };

  const handleReviewRequest = async (requestId: string, status: "approved" | "rejected") => {
    setProcessingId(requestId);
    try {
      await reviewRequest.mutateAsync({
        requestId,
        status,
        adminId: userId,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(link);
    toast.info("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveMember = (memberUserId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from this team?`)) {
      removeMemberMutation.mutate({ userId, teamId: activeTeamId, memberIdToRemove: memberUserId });
    }
  };

  if (profileLoading || userTeamsLoading) {
    return (
      <div className="flex-1 flex flex-col bg-surface-container-lowest h-screen overflow-hidden">
        {/* Skeleton Header */}
        <header className="p-unit-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-unit-3 shrink-0">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-9.5 w-36 rounded-lg" />
          </div>
        </header>

        {/* Skeleton Content Body */}
        <div className="flex-1 p-unit-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (propActiveTeamId === null) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4 bg-surface-container-lowest h-[calc(100vh-3rem)]">
        <Users className="h-16 w-16 text-outline/50 animate-pulse" />
        <h3 className="text-headline-md font-bold text-on-surface">Personal View Active</h3>
        <p className="text-outline text-body-sm max-w-md mx-auto leading-relaxed">
          You are currently using Aika in Personal View. 
          To access team directories and activity feeds, please select a team from the workspace switcher at the top of the sidebar.
        </p>
      </div>
    );
  }

  if (!userTeams || userTeams.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4 bg-surface-container-lowest h-[calc(100vh-3rem)]">
        <Users className="h-16 w-16 text-outline/50 animate-pulse" />
        <h3 className="text-headline-md font-bold text-on-surface">No Teams Joined</h3>
        <p className="text-outline text-body-sm max-w-md mx-auto leading-relaxed">
          You are currently not listed as a member of any teams in this organization workspace. 
          Contact your owner or administrator to invite you to teams.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-container-lowest h-screen overflow-hidden">
      
      {/* Header with Selector */}
      <header className="p-unit-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-unit-3 shrink-0">
        <div>
          <h2 className="text-headline-md font-black text-on-surface flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Team Space
          </h2>
          <p className="text-body-sm text-outline mt-0.5">
            View staff timelines, active directories, and onboard new members for your team.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-1 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant">
            <button
              onClick={() => setActiveSubTab("feed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === "feed"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Activity Feed
            </button>
            <button
              onClick={() => setActiveSubTab("members")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSubTab === "members"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Team Members
            </button>
            {isLeader && (
              <button
                onClick={() => setActiveSubTab("manage")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeSubTab === "manage"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <Settings className="h-3.5 w-3.5" /> Management
              </button>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={activeTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setGeneratedLink(null);
                // Switch tab back if we shift teams and are no longer a leader in the new team
                if (activeSubTab === "manage") {
                  setActiveSubTab("feed");
                }
              }}
              className="bg-surface border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface font-bold focus:outline-none focus:border-primary cursor-pointer shadow-sm animate-in fade-in"
            >
              {userTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Workspace Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-unit-6 space-y-6 pb-12">
        {activeSubTab === "feed" && (
          <TeamTimelineFeed
            timeline={teamTimeline || []}
            timelineLoading={timelineLoading}
            members={members || []}
          />
        )}
        {activeSubTab === "members" && (
          <TeamMembersTable
            members={members || []}
            membersLoading={membersLoading}
            onRemoveMember={isLeader ? handleRemoveMember : undefined}
            isRemoving={removeMemberMutation.isPending}
          />
        )}
        {activeSubTab === "manage" && isLeader && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <TeamOnboardingControls
              userId={userId}
              organizationId={organizationId}
              activeTeamId={activeTeamId}
              tokens={tokens || []}
              tokensLoading={tokensLoading}
              requests={requests || []}
              requestsLoading={requestsLoading}
              onGenerateToken={handleGenerateToken}
              isGeneratingToken={createToken.isPending}
              onReviewRequest={handleReviewRequest}
              isReviewingRequest={reviewRequest.isPending}
              processingId={processingId}
              onCopyLink={handleCopyLink}
              copiedId={copiedId}
              generatedLink={generatedLink}
              onCloseGeneratedLink={() => setGeneratedLink(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
