"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { trpc } from "@/utils/trpc";
import { useConfirmStore } from "@/lib/store";
import { toast } from "sonner";
import { useImageViewer } from "@/utils/image-viewer-store";
import { TimeLogsList } from "@/components/timer/time-logs-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Image as ImageIcon, Info, Link2, ShieldAlert, FileText, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface ProfileTabProps {
  targetUserId?: string;
  onSelectLog?: (log: any) => void;
  onEdit?: (log: any) => void;
  onDelete?: (logId: string) => Promise<void>;
  onShare?: (log: any) => void;
}

export function ProfileTab({ targetUserId, onSelectLog, onEdit, onDelete, onShare }: ProfileTabProps) {
  const { session, activeOrg, refetchSession } = useAuth();
  const { showConfirm } = useConfirmStore();
  const currentUserId = session?.user?.id || "";
  const viewingUserId = targetUserId || currentUserId;
  const isSelf = viewingUserId === currentUserId;
  const organizationId = activeOrg?.id || "org-default";

  // Tab State: default to "logs" if team leader viewing member, otherwise "info"
  const isTeamLeaderViewing = !isSelf;
  const [activeSubTab, setActiveSubTab] = useState<"info" | "logs" | "evidence">(
    isTeamLeaderViewing ? "logs" : "info"
  );

  // Time Logs Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [logFilterProjectId, setLogFilterProjectId] = useState<string>("all");
  const [logFilterStartDate, setLogFilterStartDate] = useState<string>("");
  const [logFilterEndDate, setLogFilterEndDate] = useState<string>("");

  // Query Profile Details
  const { data: profileDetails, isLoading: loadingProfile, refetch: refetchProfileDetails } = trpc.getUserProfileDetails.useQuery(
    { userId: viewingUserId, callerId: currentUserId },
    { enabled: !!viewingUserId && !!currentUserId }
  );

  // Query paginated logs for the user if authorized
  const isAuthorized = profileDetails?.canViewPrivateData ?? false;
  const currentTab = isAuthorized ? activeSubTab : "info";

  const {
    data: paginatedLogsData,
    fetchNextPage: fetchNextLogsPage,
    hasNextPage: hasNextLogsPage,
    isFetchingNextPage: isFetchingNextLogsPage,
    isLoading: loadingPaginatedLogs,
    refetch: refetchPaginatedLogs,
  } = trpc.getUserLogsInfinite.useInfiniteQuery(
    {
      userId: viewingUserId,
      organizationId,
      search: searchQuery,
      projectId: logFilterProjectId !== "all" ? logFilterProjectId : undefined,
      startDate: logFilterStartDate ? new Date(logFilterStartDate) : undefined,
      endDate: logFilterEndDate ? new Date(logFilterEndDate) : undefined,
      limit: 10,
    },
    {
      enabled: isAuthorized && currentTab === "logs",
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
    }
  );

  // Fetch projects and tasks to populate filters and detail views
  const { data: projects } = trpc.getProjects.useQuery(
    { organizationId, teamId: null },
    { enabled: isAuthorized && currentTab === "logs" }
  );
  const { data: tasks } = trpc.getTasks.useQuery(
    { userId: viewingUserId },
    { enabled: isAuthorized && currentTab === "logs" }
  );

  const disconnectNotionMutation = trpc.disconnectNotion.useMutation({
    onSuccess: async () => {
      await refetchSession();
      toast.success("Successfully disconnected from Notion.");
    },
  });

  const resetNotionDatabaseMutation = trpc.resetNotionDatabase.useMutation({
    onSuccess: async () => {
      await refetchSession();
      toast.success("Successfully reset Notion database linkage.");
    },
  });

  const disconnectGithubMutation = trpc.disconnectGithub.useMutation({
    onSuccess: async () => {
      await refetchProfileDetails();
      toast.success("Successfully disconnected GitHub account linking.");
    },
  });

  const handleLinkGithub = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("github_linked", "true");
      await authClient.linkSocial({
        provider: "github",
        callbackURL: url.toString(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to link GitHub account.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("github_linked") === "true") {
        toast.success("Successfully linked GitHub account!");
        refetchProfileDetails();
        params.delete("github_linked");
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [refetchProfileDetails]);

  if (!session) return null;

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant flex items-center gap-4 animate-pulse">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileDetails) {
    return (
      <div className="p-8 text-center glass-card bg-surface-container-low border border-outline-variant rounded-xl flex flex-col items-center gap-3">
        <ShieldAlert className="h-12 w-12 text-outline/50" />
        <h3 className="text-headline-sm font-bold text-on-surface">Access Denied</h3>
        <p className="text-outline text-body-sm max-w-sm">
          You don't have permissions to view this user's profile detail page.
        </p>
      </div>
    );
  }

  const { user: targetUser, evidence } = profileDetails;

  const handleOpenEvidence = (ev: any) => {
    const imagesList = evidence.map((item: any) => ({
      url: item.file_url,
      title: item.time_log_title || "Document Evidence",
      description: item.time_log_description || "",
      mimeType: item.mime_type,
      fileName: item.file_name,
    }));
    const index = evidence.findIndex((item: any) => item.id === ev.id);
    useImageViewer.getState().open(imagesList, index >= 0 ? index : 0);
  };

  // Convert paginated logs to the structure needed by TimeLogsList
  const paginatedLogs = paginatedLogsData?.pages.flatMap((page) => page?.items || []) || [];
  const paginatedLogsByDay: { [key: string]: any[] } = {};
  paginatedLogs.forEach((log: any) => {
    const dateStr = new Date(log.start_time).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (!paginatedLogsByDay[dateStr]) paginatedLogsByDay[dateStr] = [];
    paginatedLogsByDay[dateStr].push(log);
  });

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {targetUser.image ? (
            <img src={targetUser.image} alt={targetUser.name ?? undefined} className="h-16 w-16 rounded-full border border-outline-variant" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase border border-outline-variant">
              {targetUser.name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-headline-sm font-headline-sm font-black text-on-surface">
                {targetUser.name || "Unknown User"}
              </h3>
              {isSelf && (
                <span className="px-2 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-black uppercase tracking-wider">
                  You
                </span>
              )}
            </div>
            <p className="text-body-sm text-outline mt-0.5">{targetUser.email}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">Member Since</span>
            <span className="font-bold text-on-surface-variant flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {new Date(targetUser.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      {isAuthorized && (
        <div className="flex gap-1.5 border-b border-outline-variant/60 pb-px">
          <button
            onClick={() => setActiveSubTab("info")}
            className={`px-4 py-2 text-xs font-black transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeSubTab === "info"
                ? "border-primary text-primary"
                : "border-transparent text-outline hover:text-on-surface-variant"
            }`}
          >
            <User className="h-3.5 w-3.5" /> Account Details
          </button>
          <button
            onClick={() => setActiveSubTab("logs")}
            className={`px-4 py-2 text-xs font-black transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeSubTab === "logs"
                ? "border-primary text-primary"
                : "border-transparent text-outline hover:text-on-surface-variant"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Time Logs
          </button>
          <button
            onClick={() => setActiveSubTab("evidence")}
            className={`px-4 py-2 text-xs font-black transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeSubTab === "evidence"
                ? "border-primary text-primary"
                : "border-transparent text-outline hover:text-on-surface-variant"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" /> Document Evidence
          </button>
        </div>
      )}

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* Panel 1: Account Info & Integrations */}
        {currentTab === "info" && (
          <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
              <div className="space-y-1.5">
                <span className="text-[10px] text-outline font-bold uppercase block tracking-wider">User ID</span>
                <p className="font-mono-timer bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant truncate">
                  {targetUser.id}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-outline font-bold uppercase block tracking-wider">Created At</span>
                <p className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant">
                  {new Date(targetUser.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {isSelf && (
              <div className="border-t border-outline-variant/60 pt-6 space-y-4">
                <div>
                  <h4 className="text-body-md font-extrabold flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-[20px]">sync</span> Integrations
                  </h4>
                  <p className="text-body-sm text-outline mt-1">Connect third-party apps to streamline your tracking.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E3E2E0] dark:bg-[#37352F] flex items-center justify-center text-xl font-black text-black dark:text-white">
                      N
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-body-sm font-bold text-on-surface">Notion Sync</h5>
                        <div className="group relative cursor-pointer inline-flex">
                          <span className="material-symbols-outlined text-[16px] text-outline hover:text-primary transition-colors">help_outline</span>
                          <div className="absolute left-1/2 bottom-full mb-2.5 -translate-x-1/2 w-72 p-4 bg-surface-container-high dark:bg-[#18181b] text-[11px] rounded-2xl shadow-2xl border border-outline-variant text-on-surface opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                            <div className="font-extrabold text-primary mb-1 flex items-center gap-1">
                              About Notion Sync
                            </div>
                            <p className="text-outline leading-relaxed mb-2.5">
                              Automatically mirrors your logged sessions, tasks, durations, and metadata to your Notion workspace.
                            </p>
                            <div className="font-bold text-on-surface mb-1">Setup Steps:</div>
                            <ol className="list-decimal list-inside text-outline space-y-1">
                              <li>Click <strong>Connect Notion</strong> to authorize.</li>
                              <li>Share/select at least one page.</li>
                              <li>An <strong>Aika Time Logs</strong> database will automatically be linked under the page.</li>
                              <li>All time logs will be stored in the database.</li>
                              <li>You can plug in the database as a data source in your pages.</li>
                            </ol>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-surface-container-high dark:border-t-[#18181b]"></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-outline">
                        {session.user.notion_workspace_name
                          ? `Connected to: ${session.user.notion_workspace_name}`
                          : "Sync logged time to your Notion workspace."}
                      </p>
                    </div>
                  </div>

                  {session.user.notion_workspace_name ? (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          showConfirm({
                            title: "Disconnect from Notion?",
                            description: "Are you sure you want to disconnect from Notion? Syncing will stop.",
                            onConfirm: async () => {
                              await disconnectNotionMutation.mutateAsync({ userId: session.user.id });
                            }
                          });
                        }}
                        disabled={disconnectNotionMutation.isPending}
                        className="w-full sm:w-auto rounded-lg text-body-sm px-4 py-2 font-bold border border-red-500/30 hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                      <button
                        onClick={() => {
                          showConfirm({
                            title: "Reset Database Link?",
                            description: "Are you sure you want to reset the database linkage? This will clear the linked database ID, forcing a new database creation on next reconnect.",
                            onConfirm: async () => {
                              await resetNotionDatabaseMutation.mutateAsync({ userId: session.user.id });
                            }
                          });
                        }}
                        disabled={resetNotionDatabaseMutation.isPending}
                        className="w-full sm:w-auto rounded-lg text-body-sm px-4 py-2 font-bold border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-50"
                      >
                        Reset Database Link
                      </button>
                    </div>
                  ) : (
                    <a
                      href="/api/integrations/notion/connect"
                      className="w-full sm:w-auto text-center rounded-lg text-body-sm px-4 py-2 font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                    >
                      Connect Notion
                    </a>
                  )}
                </div>

                {/* GitHub integration card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
                      <Github className="h-5 w-5 text-on-surface" />
                    </div>
                    <div>
                      <h5 className="text-body-sm font-bold text-on-surface">GitHub Connection</h5>
                      <p className="text-[11px] text-outline mt-0.5">
                        {profileDetails.isGithubConnected
                          ? "Linked and active. Commits and Pull Requests can be integrated with your time logs."
                          : "Link your GitHub account to directly attach commits and PRs to your time logs."}
                      </p>
                    </div>
                  </div>

                  {profileDetails.isGithubConnected ? (
                    <button
                      onClick={() => {
                        showConfirm({
                          title: "Disconnect GitHub?",
                          description: "Are you sure you want to disconnect GitHub? You will no longer be able to link recent commits or pull requests to your logs.",
                          onConfirm: async () => {
                            await disconnectGithubMutation.mutateAsync({ userId: viewingUserId });
                          }
                        });
                      }}
                      disabled={disconnectGithubMutation.isPending}
                      className="w-full sm:w-auto rounded-lg text-body-sm px-4 py-2 font-bold border border-red-500/30 hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleLinkGithub}
                      className="w-full sm:w-auto text-center rounded-lg text-body-sm px-4 py-2 font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Link GitHub
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel 2: Time Logs List */}
        {currentTab === "logs" && isAuthorized && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <TimeLogsList
              logsByDay={paginatedLogsByDay}
              projects={projects || []}
              tasks={tasks || []}
              onEdit={isSelf && onEdit ? onEdit : () => {}}
              onDelete={isSelf && onDelete ? onDelete : async () => {}}
              onShare={isSelf && onShare ? onShare : () => {}}
              searchQuery={searchQuery}
              onManualLog={undefined}
              onSelect={onSelectLog}
              isMutating={false}
              isLoading={loadingPaginatedLogs}
              fetchNextPage={fetchNextLogsPage}
              hasNextPage={!!hasNextLogsPage}
              isFetchingNextPage={isFetchingNextLogsPage}
              selectedProjectId={logFilterProjectId}
              setSelectedProjectId={setLogFilterProjectId}
              startDateFilter={logFilterStartDate}
              setStartDateFilter={setLogFilterStartDate}
              endDateFilter={logFilterEndDate}
              setEndDateFilter={setLogFilterEndDate}
              onClearFilters={() => {
                setSearchQuery("");
                setLogFilterProjectId("all");
                setLogFilterStartDate("");
                setLogFilterEndDate("");
              }}
              userId={viewingUserId}
              organizationId={organizationId}
              teamId={null}
              onRefreshLogs={() => {
                refetchPaginatedLogs();
              }}
              rawLogs={paginatedLogs}
            />
          </div>
        )}

        {/* Panel 3: Document Evidence Gallery */}
        {currentTab === "evidence" && isAuthorized && (
          <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant space-y-4 animate-in fade-in duration-200">
            <div>
              <h4 className="text-body-md font-extrabold flex items-center gap-2 text-on-surface">
                <ImageIcon className="h-5 w-5 text-primary" /> Document Evidence Gallery
              </h4>
              <p className="text-body-sm text-outline mt-0.5">
                Browse file attachments and pictures proving work for study or work sessions.
              </p>
            </div>

            {evidence.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-outline-variant/60 rounded-xl bg-surface-container-lowest/50 text-outline text-xs">
                No uploaded files or document evidences found for this user.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {evidence.map((ev: any) => {
                  const isImg = ev.mime_type ? ev.mime_type.startsWith("image/") : !!ev.file_url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleOpenEvidence(ev)}
                      className="group relative aspect-square bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300"
                    >
                      {isImg ? (
                        <img
                          src={ev.file_url}
                          alt={ev.file_name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-surface-container-highest/40 text-center p-4">
                          <FileText className="h-8 w-8 text-primary mb-2 animate-pulse" />
                          <span className="text-[10px] text-on-surface font-semibold truncate w-full text-center px-1">
                            {ev.file_name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <span className="text-[10px] text-zinc-100 font-extrabold truncate block">
                          {ev.file_name}
                        </span>
                        {ev.time_log_title && (
                          <span className="text-[8px] text-zinc-300 font-medium truncate flex items-center gap-0.5 mt-0.5">
                            <Link2 className="h-2 w-2" />
                            {ev.time_log_title}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
