"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import dynamic from "next/dynamic";

const TimeLogDialog = dynamic(() => import("@/components/timer/time-log-dialog").then((m) => m.TimeLogDialog), { ssr: false });
const TimeLogsList = dynamic(() => import("@/components/timer/time-logs-list").then((m) => m.TimeLogsList), { ssr: false });
import { Sidebar } from "@/components/layout/sidebar";
import { TimerSidebar } from "@/components/timer/timer-sidebar";
import { Header } from "@/components/layout/header";
const Heatmap = dynamic(() => import("@/components/ui-components/heatmap").then((m) => m.Heatmap), { ssr: false });
const WeeklyChart = dynamic(() => import("@/components/ui-components/weekly-chart").then((m) => m.WeeklyChart), { ssr: false });
const ProjectsTasksTab = dynamic(() => import("@/components/dashboard/projects-tasks-tab").then((m) => m.ProjectsTasksTab), { ssr: false });
import { DashboardView } from "@/components/dashboard/dashboard-view";
const DetailViewDialog = dynamic(() => import("@/components/timer/detail-view-dialog").then((m) => m.DetailViewDialog), { ssr: false });
const TeamSpaceView = dynamic(() => import("@/components/team/team-space-view").then((m) => m.TeamSpaceView), { ssr: false });
const ReportsView = dynamic(() => import("@/components/reports/reports-view").then((m) => m.ReportsView), { ssr: false });
import { Skeleton } from "@/components/ui/skeleton";
const ProfileTab = dynamic(() => import("@/components/dashboard/profile-tab").then((m) => m.ProfileTab), { ssr: false });
const OrgTab = dynamic(() => import("@/components/dashboard/org-tab").then((m) => m.OrgTab), { ssr: false });
const ShortcutsHelpDialog = dynamic(() => import("@/components/ui-components/shortcuts-help-dialog").then((m) => m.ShortcutsHelpDialog), { ssr: false });
import { toast } from "sonner";
import { useConfirmStore, useTimeLogDraftStore } from "@/lib/store";

export default function Dashboard() {
  const router = useRouter();
  const { session, activeOrg, isLoading: isPending, refetchSession } = useAuth();
  const utils = trpc.useUtils();
  const { showConfirm } = useConfirmStore();

  // Dashboard & Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "profile" | "org" | "projects" | "team" | "reports">("dashboard");
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [logFilterProjectId, setLogFilterProjectId] = useState<string>("all");
  const [logFilterStartDate, setLogFilterStartDate] = useState<string>("");
  const [logFilterEndDate, setLogFilterEndDate] = useState<string>("");

  // Detailed view / dynamically inspect task or log
  const [detailLog, setDetailLog] = useState<any>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Timer States
  const [timerDesc, setTimerDesc] = useState("");
  const [timerProjId, setTimerProjId] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Theme State
  const [isDark, setIsDark] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Mobile Navigation State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth Redirect if no session
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  // tRPC Queries & Mutations
  const userId = session?.user?.id || "";
  const activeOrgId = activeOrg?.id || "org-default";
  const activeTeamId = (session?.session as any)?.activeTeamId || (session?.user as any)?.last_active_team_id || null;

  const { data: rawLogs, refetch: refetchLogs, isLoading: loadingLogs } = trpc.getUserLogs.useQuery(
    { userId, organizationId: activeOrgId, teamId: activeTeamId },
    { enabled: !!userId }
  );

  const {
    data: paginatedLogsData,
    fetchNextPage: fetchNextLogsPage,
    hasNextPage: hasNextLogsPage,
    isFetchingNextPage: isFetchingNextPage,
    isLoading: loadingPaginatedLogs,
    refetch: refetchPaginatedLogs,
  } = trpc.getUserLogsInfinite.useInfiniteQuery(
    {
      userId: userId || "",
      organizationId: activeOrgId,
      teamId: activeTeamId,
      search: searchQuery,
      projectId: logFilterProjectId !== "all" ? logFilterProjectId : undefined,
      startDate: logFilterStartDate ? new Date(logFilterStartDate) : undefined,
      endDate: logFilterEndDate ? new Date(logFilterEndDate) : undefined,
      limit: 10,
    },
    {
      enabled: !!userId,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
    }
  );

  const { data: tasks } = trpc.getTasks.useQuery(
    { userId, pagination: { limit: 1000, offset: 0 } },
    { enabled: !!userId }
  );

  const { data: projects } = trpc.getProjects.useQuery(
    { organizationId: activeOrgId, teamId: activeTeamId },
    { enabled: !!userId }
  );

  const { data: userTeams } = trpc.getUserTeams.useQuery(
    { userId, organizationId: activeOrgId },
    { enabled: !!userId && activeOrgId !== "org-default" }
  );

  const setActiveTeamMutation = trpc.setActiveTeam.useMutation({
    onSuccess: async () => {
      await refetchSession();
      utils.getProjects.invalidate();
      utils.getUserLogs.invalidate();
      utils.getUserLogsInfinite.invalidate();
      utils.getTasks.invalidate();
    }
  });

  // Load tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem("aika-active-tab");
    if (savedTab && ["dashboard", "logs", "profile", "org", "projects", "team", "reports"].includes(savedTab)) {
      setActiveTab(savedTab as any);
    }
  }, []);

  // Update localStorage helper
  const handleSetActiveTab = (
    tab: "dashboard" | "logs" | "profile" | "org" | "projects" | "team" | "reports",
    targetUserId: string | null = null
  ) => {
    localStorage.setItem("aika-active-tab", tab);
    setActiveTab(tab);
    setIsMobileSidebarOpen(false); // Close sidebar on mobile after choosing a tab
    setSelectedProfileUserId(targetUserId);
  };

  const prevOrgIdRef = useRef<string | null>(null);

  // Switch organizations/teams logic: auto-activate first team in new org
  useEffect(() => {
    if (activeOrg === undefined) return;

    if (userId && activeOrgId !== "org-default" && userTeams !== undefined) {
      const orgChanged = prevOrgIdRef.current !== null && prevOrgIdRef.current !== activeOrgId;
      prevOrgIdRef.current = activeOrgId;

      if (orgChanged && activeTeamId === null) {
        if (userTeams.length > 0) {
          localStorage.setItem("aika-active-tab", "team");
          setActiveTab("team");
          setActiveTeamMutation.mutate({ userId, teamId: userTeams[0].id });
        } else {
          localStorage.setItem("aika-active-tab", "dashboard");
          setActiveTab("dashboard");
        }
      }
    } else if (userId) {
      prevOrgIdRef.current = activeOrgId;
    }
  }, [userTeams, activeTeamId, activeOrgId, userId, activeOrg]);

  const { data: runningTimer, refetch: refetchTimer } = trpc.getRunningTimer.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const startTimerMutation = trpc.startTimer.useMutation({
    onSuccess: (data) => {
      utils.getRunningTimer.setData({ userId }, data);
      utils.getRunningTimer.invalidate({ userId });
      setTimerDesc("");
    },
  });

  const logsQueryKey = { userId, organizationId: activeOrgId, teamId: activeTeamId } as const;
  const logsInfiniteQueryKey = {
    userId: userId || "",
    organizationId: activeOrgId,
    teamId: activeTeamId,
    search: searchQuery,
    projectId: logFilterProjectId !== "all" ? logFilterProjectId : undefined,
    startDate: logFilterStartDate ? new Date(logFilterStartDate) : undefined,
    endDate: logFilterEndDate ? new Date(logFilterEndDate) : undefined,
    limit: 10,
  } as const;

  const patchBothLogCaches = (
    action: "create" | "update" | "delete",
    serverLog: any
  ) => {
    utils.getUserLogs.setData(logsQueryKey, (old) => {
      if (!old) return action === "create" ? [serverLog] : [];
      if (action === "create") {
        const exists = old.some((l) => l.id === serverLog.id);
        if (exists) return old.map((l) => (l.id === serverLog.id ? serverLog : l));
        return [serverLog, ...old];
      }
      if (action === "update") {
        return old.map((l) => (l.id === serverLog.id ? serverLog : l));
      }
      if (action === "delete") {
        return old.filter((l) => l.id !== serverLog.id);
      }
      return old;
    });

    utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, (old: any) => {
      if (!old) {
        if (action === "create") {
          return {
            pages: [{ items: [serverLog], nextCursor: null }],
            pageParams: [null],
          };
        }
        return old;
      }
      if (action === "create") {
        const updatedPages = [...old.pages];
        if (updatedPages.length > 0) {
          const exists = updatedPages[0].items.some((l: any) => l.id === serverLog.id);
          if (exists) {
            updatedPages[0] = {
              ...updatedPages[0],
              items: updatedPages[0].items.map((l: any) => (l.id === serverLog.id ? serverLog : l)),
            };
          } else {
            updatedPages[0] = {
              ...updatedPages[0],
              items: [serverLog, ...updatedPages[0].items],
            };
          }
        } else {
          updatedPages.push({ items: [serverLog], nextCursor: null });
        }
        return { ...old, pages: updatedPages };
      }
      if (action === "update") {
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((l: any) => (l.id === serverLog.id ? serverLog : l)),
          })),
        };
      }
      if (action === "delete") {
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((l: any) => l.id !== serverLog.id),
          })),
        };
      }
      return old;
    });
  };

  const stopTimerMutation = trpc.stopTimer.useMutation({
    onMutate: async (stopTimerInput) => {
      await utils.getRunningTimer.cancel({ userId });
      await utils.getUserLogs.cancel(logsQueryKey);
      await utils.getUserLogsInfinite.cancel(logsInfiniteQueryKey);

      const previousRunning = utils.getRunningTimer.getData({ userId });
      const previousLogs = utils.getUserLogs.getData(logsQueryKey);
      const previousInfiniteLogs = utils.getUserLogsInfinite.getInfiniteData(logsInfiniteQueryKey);

      utils.getRunningTimer.setData({ userId }, null);

      const startTime = previousRunning?.start_time ? new Date(previousRunning.start_time) : new Date();
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const optimisticLog: any = {
        id: stopTimerInput.logId || crypto.randomUUID(),
        user_id: stopTimerInput.userId,
        organization_id: stopTimerInput.organizationId,
        team_id: stopTimerInput.teamId || null,
        project_id: stopTimerInput.projectId || previousRunning?.project_id || null,
        start_time: startTime,
        end_time: endTime,
        title: stopTimerInput.title || stopTimerInput.description || previousRunning?.description || "Timer-logged hours",
        description: stopTimerInput.description || previousRunning?.description || "Logged via active running timer.",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        duration: duration > 0 ? duration : 0,
        is_public: false,
        tasks: stopTimerInput.taskIds || [],
        evidence: (stopTimerInput.evidence || []).map((ev: any, idx: number) => ({
          id: `opt-ev-${idx}-${Date.now()}`,
          time_log_id: stopTimerInput.logId,
          file_url: ev.fileUrl,
          file_key: ev.fileKey,
          file_name: ev.fileName,
          file_size: ev.fileSize,
          mime_type: ev.mimeType,
          created_at: new Date(),
          deleted_at: null,
        })),
        githubLinks: (stopTimerInput.githubLinks || []).map((link: any, idx: number) => ({
          id: `opt-git-${idx}-${Date.now()}`,
          time_log_id: stopTimerInput.logId,
          repo_name: link.repoName,
          link_type: link.linkType,
          entity_id: link.entityId,
          title: link.title,
          url: link.url,
          created_at: new Date(),
        })),
      };

      utils.getUserLogs.setData(logsQueryKey, (old) => {
        if (!old) return [optimisticLog];
        return [optimisticLog, ...old];
      });

      utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, (old: any) => {
        if (!old) {
          return {
            pages: [{ items: [optimisticLog], nextCursor: null }],
            pageParams: [null],
          };
        }
        const updatedPages = [...old.pages];
        if (updatedPages.length > 0) {
          updatedPages[0] = {
            ...updatedPages[0],
            items: [optimisticLog, ...updatedPages[0].items],
          };
        } else {
          updatedPages.push({ items: [optimisticLog], nextCursor: null });
        }
        return {
          ...old,
          pages: updatedPages,
        };
      });

      return { previousRunning, previousLogs, previousInfiniteLogs };
    },
    onError: (err, variables, context) => {
      if (context?.previousRunning !== undefined) {
        utils.getRunningTimer.setData({ userId }, context.previousRunning);
      }
      if (context?.previousLogs) {
        utils.getUserLogs.setData(logsQueryKey, context.previousLogs);
      }
      if (context?.previousInfiniteLogs) {
        utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, context.previousInfiniteLogs);
      }
      toast.error("Failed to stop timer.");
    },
    onSuccess: (serverLog) => {
      toast.success("Timer stopped and log created successfully!");
      setIsDialogOpen(false);
      setEditingLog(null);
      useTimeLogDraftStore.getState().clearDraft("new");
      if (serverLog) {
        patchBothLogCaches("create", serverLog);
      }
    },
    onSettled: () => {
      utils.getRunningTimer.invalidate({ userId });
    },
  });

  const createLogMutation = trpc.createLog.useMutation({
    onMutate: async (newLogInput) => {
      await utils.getUserLogs.cancel(logsQueryKey);
      await utils.getUserLogsInfinite.cancel(logsInfiniteQueryKey);

      const previousLogs = utils.getUserLogs.getData(logsQueryKey);
      const previousInfiniteLogs = utils.getUserLogsInfinite.getInfiniteData(logsInfiniteQueryKey);

      const optimisticLog: any = {
        id: newLogInput.id || crypto.randomUUID(),
        user_id: newLogInput.userId,
        organization_id: newLogInput.organizationId,
        team_id: newLogInput.teamId || null,
        project_id: newLogInput.projectId || null,
        start_time: newLogInput.startTime,
        end_time: newLogInput.endTime,
        title: newLogInput.title || "Untitled Task",
        description: newLogInput.description || "",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        duration: Math.floor((new Date(newLogInput.endTime as any).getTime() - new Date(newLogInput.startTime as any).getTime()) / 1000),
        is_public: newLogInput.isPublic || false,
        tasks: newLogInput.taskIds || [],
        evidence: (newLogInput.evidence || []).map((ev: any, idx: number) => ({
          id: `opt-ev-${idx}-${Date.now()}`,
          time_log_id: newLogInput.id,
          file_url: ev.fileUrl,
          file_key: ev.fileKey,
          file_name: ev.fileName,
          file_size: ev.fileSize,
          mime_type: ev.mimeType,
          created_at: new Date(),
          deleted_at: null,
        })),
        githubLinks: (newLogInput.githubLinks || []).map((link: any, idx: number) => ({
          id: `opt-git-${idx}-${Date.now()}`,
          time_log_id: newLogInput.id,
          repo_name: link.repoName,
          link_type: link.linkType,
          entity_id: link.entityId,
          title: link.title,
          url: link.url,
          created_at: new Date(),
        })),
      };

      utils.getUserLogs.setData(logsQueryKey, (old) => {
        if (!old) return [optimisticLog];
        return [optimisticLog, ...old];
      });

      utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, (old: any) => {
        if (!old) {
          return {
            pages: [{ items: [optimisticLog], nextCursor: null }],
            pageParams: [null],
          };
        }
        const updatedPages = [...old.pages];
        if (updatedPages.length > 0) {
          updatedPages[0] = {
            ...updatedPages[0],
            items: [optimisticLog, ...updatedPages[0].items],
          };
        } else {
          updatedPages.push({ items: [optimisticLog], nextCursor: null });
        }
        return {
          ...old,
          pages: updatedPages,
        };
      });

      return { previousLogs, previousInfiniteLogs };
    },
    onError: (err, newLog, context) => {
      if (context?.previousLogs) {
        utils.getUserLogs.setData(logsQueryKey, context.previousLogs);
      }
      if (context?.previousInfiniteLogs) {
        utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, context.previousInfiniteLogs);
      }
      toast.error("Failed to create log.");
    },
    onSuccess: (serverLog) => {
      setIsDialogOpen(false);
      setEditingLog(null);
      useTimeLogDraftStore.getState().clearDraft("new");
      if (serverLog) {
        patchBothLogCaches("create", serverLog);
      }
    },
  });

  const updateLogMutation = trpc.updateLog.useMutation({
    onMutate: async ({ logId, input }) => {
      await utils.getUserLogs.cancel(logsQueryKey);
      await utils.getUserLogsInfinite.cancel(logsInfiniteQueryKey);

      const previousLogs = utils.getUserLogs.getData(logsQueryKey);
      const previousInfiniteLogs = utils.getUserLogsInfinite.getInfiniteData(logsInfiniteQueryKey);

      const applyUpdates = (log: any) => {
        const updated = { ...log };
        if (input.projectId !== undefined) updated.project_id = input.projectId;
        if (input.startTime !== undefined) updated.start_time = input.startTime;
        if (input.endTime !== undefined) updated.end_time = input.endTime;
        if (input.title !== undefined) updated.title = input.title;
        if (input.description !== undefined) updated.description = input.description;
        if (input.taskIds !== undefined) updated.tasks = input.taskIds;
        if (input.isPublic !== undefined) updated.is_public = input.isPublic;
        if (input.evidence !== undefined) {
          updated.evidence = input.evidence.map((ev: any, idx: number) => ({
            id: ev.id || `opt-ev-${idx}-${Date.now()}`,
            time_log_id: logId,
            file_url: ev.fileUrl,
            file_key: ev.fileKey,
            file_name: ev.fileName,
            file_size: ev.fileSize,
            mime_type: ev.mimeType,
            created_at: new Date(),
            deleted_at: null,
          }));
        }
        if (input.githubLinks !== undefined) {
          updated.githubLinks = input.githubLinks.map((link: any, idx: number) => ({
            id: link.id || `opt-git-${idx}-${Date.now()}`,
            time_log_id: logId,
            repo_name: link.repoName,
            link_type: link.linkType,
            entity_id: link.entityId,
            title: link.title,
            url: link.url,
            created_at: new Date(),
          }));
        }
        if (updated.start_time && updated.end_time) {
          updated.duration = Math.floor((new Date(updated.end_time).getTime() - new Date(updated.start_time).getTime()) / 1000);
        }
        return updated;
      };

      utils.getUserLogs.setData(logsQueryKey, (old) => {
        if (!old) return old;
        return old.map((l) => (l.id === logId ? applyUpdates(l) : l));
      });

      utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((l: any) => (l.id === logId ? applyUpdates(l) : l)),
          })),
        };
      });

      return { previousLogs, previousInfiniteLogs };
    },
    onError: (err, variables, context) => {
      if (context?.previousLogs) {
        utils.getUserLogs.setData(logsQueryKey, context.previousLogs);
      }
      if (context?.previousInfiniteLogs) {
        utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, context.previousInfiniteLogs);
      }
      toast.error("Failed to update log.");
    },
    onSuccess: (serverLog) => {
      setIsDialogOpen(false);
      setEditingLog(null);
      if (serverLog) {
        useTimeLogDraftStore.getState().clearDraft(serverLog.id);
        patchBothLogCaches("update", serverLog);
      }
    },
  });

  const deleteLogMutation = trpc.deleteLog.useMutation({
    onMutate: async ({ logId }) => {
      await utils.getUserLogs.cancel(logsQueryKey);
      await utils.getUserLogsInfinite.cancel(logsInfiniteQueryKey);

      const previousLogs = utils.getUserLogs.getData(logsQueryKey);
      const previousInfiniteLogs = utils.getUserLogsInfinite.getInfiniteData(logsInfiniteQueryKey);

      utils.getUserLogs.setData(logsQueryKey, (old) => {
        if (!old) return [];
        return old.filter((l) => l.id !== logId);
      });

      utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((l: any) => l.id !== logId),
          })),
        };
      });

      return { previousLogs, previousInfiniteLogs };
    },
    onError: (err, variables, context) => {
      if (context?.previousLogs) {
        utils.getUserLogs.setData(logsQueryKey, context.previousLogs);
      }
      if (context?.previousInfiniteLogs) {
        utils.getUserLogsInfinite.setInfiniteData(logsInfiniteQueryKey, context.previousInfiniteLogs);
      }
      toast.error("Failed to delete log.");
    },
    onSuccess: (result, variables) => {
      patchBothLogCaches("delete", { id: variables.logId });
    },
  });

  const discardTimerMutation = trpc.discardTimer.useMutation({
    onSuccess: () => {
      utils.getRunningTimer.setData({ userId }, null);
      utils.getRunningTimer.invalidate({ userId });
      refetchTimer();
    },
    onError: (err) => {
      toast.error("Failed to discard timer");
      refetchTimer();
    },
  });

  const handleStartTimer = async () => {
    if (!userId) return;
    try {
      await startTimerMutation.mutateAsync({
        userId,
        projectId: timerProjId || null,
        description: timerDesc || "Work session",
      });
    } catch (e) {
      // Handled by onError callback
    }
  };

  const handleDiscardTimer = async () => {
    if (!userId) return;
    showConfirm({
      title: "Discard Clock-in Session?",
      description: "Are you sure you want to discard this clock-in session? All untracked time will be lost.",
      onConfirm: async () => {
        // Optimistically clear running timer cache immediately to stop the clock in the UI
        utils.getRunningTimer.setData({ userId }, null);
        try {
          await discardTimerMutation.mutateAsync({ userId });
          useTimeLogDraftStore.getState().clearDraft(editingLog?.id || "new");
          setIsDialogOpen(false);
        } catch (e) {
          // Restore running timer state on failure
          refetchTimer();
        }
      },
    });
  };

  // Theme Sync
  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);
  }, []);

  // Handle Notion OAuth callback redirection parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const integration = urlParams.get("integration");
      const status = urlParams.get("status");
      const message = urlParams.get("message");

      if (integration === "notion") {
        if (status === "success") {
          toast.success("Successfully integrated with Notion! 'Aika Time Logs' database has been auto-created.");
          refetchSession();
        } else if (status === "error") {
          toast.error(message || "Notion integration failed.");
        }
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [refetchSession]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningTimer?.start_time) {
      const start = new Date(runningTimer.start_time).getTime();
      const tick = () => {
        const diff = Math.floor((Date.now() - start) / 1000);
        setTimerSeconds(diff > 0 ? diff : 0);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  // Keyboard Shortcuts for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSetActiveTab("logs");
        setTimeout(() => {
          const searchInput = document.getElementById("global-search-input");
          if (searchInput) {
            searchInput.focus();
            (searchInput as HTMLInputElement).select();
          }
        }, 80);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
      if (!isInput && e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        setIsDialogOpen(false);
        setIsDetailOpen(false);
        setIsShortcutsOpen(false);
        setEditingLog(null);
        return;
      }

      if (isInput) return;

      if (e.key === "/") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSetActiveTab("logs");
        setTimeout(() => {
          const searchInput = document.getElementById("global-search-input");
          if (searchInput) {
            searchInput.focus();
            (searchInput as HTMLInputElement).select();
          }
        }, 80);
        return;
      }

      if ((e.altKey && e.key.toLowerCase() === "t") || e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (runningTimer) {
          setIsDialogOpen(true);
        } else {
          handleStartTimer();
        }
        return;
      }

      if ((e.altKey && e.key.toLowerCase() === "n") || e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingLog(null);
        setIsDialogOpen(true);
        return;
      }

      if ((e.altKey && e.key.toLowerCase() === "u") || e.key.toLowerCase() === "u") {
        e.preventDefault();
        setActiveTab("projects");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("aika-new-task"));
        }, 80);
        return;
      }

      if (e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("dashboard");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("logs");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("projects");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("profile");
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveTab("org");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [runningTimer, timerProjId, timerDesc, userId]);

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth");
        },
      },
    });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopTimerWithEvidence = async (evidenceData: any) => {
    if (!userId) return;
    const logId = crypto.randomUUID();
    await stopTimerMutation.mutateAsync({
      logId,
      userId,
      organizationId: activeOrgId,
      teamId: activeTeamId,
      taskIds: evidenceData.taskIds,
      evidence: evidenceData.evidence,
      projectId: evidenceData.projectId,
      title: evidenceData.title,
      description: evidenceData.description || runningTimer?.description || "Timer-logged hours",
      githubLinks: evidenceData.githubLinks,
    });
  };

  const handleDialogSubmit = async (data: any) => {
    try {
      if (editingLog) {
        await updateLogMutation.mutateAsync({
          logId: editingLog.id,
          userId,
          input: {
            organizationId: activeOrgId,
            teamId: activeTeamId,
            projectId: data.projectId,
            startTime: data.startTime,
            endTime: data.endTime,
            title: data.title,
            description: data.description,
            taskIds: data.taskIds,
            evidence: data.evidence,
            isPublic: data.isPublic,
            githubLinks: data.githubLinks,
          },
        });
      } else {
        const generatedId = crypto.randomUUID();
        await createLogMutation.mutateAsync({
          id: generatedId,
          userId,
          organizationId: activeOrgId,
          teamId: activeTeamId,
          projectId: data.projectId,
          startTime: data.startTime,
          endTime: data.endTime,
          title: data.title,
          description: data.description,
          taskIds: data.taskIds,
          evidence: data.evidence,
          isPublic: data.isPublic,
          githubLinks: data.githubLinks,
        });
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLogMutation.mutateAsync({
      logId,
      userId,
    });
  };

  const handleShareLog = async (log: any) => {
    try {
      const shareUrl = `${window.location.origin}/share/log/${log.id}`;
      await navigator.clipboard.writeText(shareUrl);

      if (!log.is_public) {
        await updateLogMutation.mutateAsync({
          logId: log.id,
          userId,
          input: {
            isPublic: true,
          },
        });
      }
      toast.success("Public share link copied to clipboard!");
    } catch (err: any) {
      toast.error("Failed to copy or share link: " + err.message);
    }
  };

  if (isPending || !session) {
    return (
      <div className="relative min-h-screen w-full flex bg-surface-container-lowest text-on-surface overflow-hidden font-sans">
        <aside className="w-sidebar-width h-screen bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant flex flex-col p-unit-4 gap-unit-6 shrink-0 animate-pulse">
          <div className="flex items-center gap-unit-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-24" />
          </div>
          <nav className="flex-1 space-y-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-unit-3 py-1">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </nav>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden h-screen bg-surface-container-lowest">
          <header className="h-16 border-b border-outline-variant flex items-center justify-between px-unit-6 shrink-0">
            <Skeleton className="h-5 w-64" />
          </header>
          <main className="flex-1 p-unit-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const filteredLogs = (rawLogs || []).filter((log: any) => {
    const q = searchQuery.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      (log.tasks && log.tasks.some((tId: string) => tId.toLowerCase().includes(q)))
    );
  });

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
    <div className="relative min-h-screen w-full flex bg-sidebar text-on-surface overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        session={session}
        handleSignOut={handleSignOut}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex p-3 gap-3 overflow-hidden h-screen w-full bg-sidebar">
        <main className="flex-1 flex flex-col bg-surface border border-outline-variant rounded-2xl overflow-hidden h-full shadow-sm">
          <Header
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isDark={isDark}
            toggleTheme={toggleTheme}
            runningTimer={runningTimer}
            handleStartTimer={handleStartTimer}
            setIsDialogOpen={setIsDialogOpen}
            setEditingLog={setEditingLog}
            session={session}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            projects={projects || []}
            timerProjId={timerProjId}
            setTimerProjId={setTimerProjId}
            timerDesc={timerDesc}
            setTimerDesc={setTimerDesc}
            timerSeconds={timerSeconds}
            formatDuration={formatDuration}
            stopTimerMutation={stopTimerMutation}
            handleStopTimerWithEvidence={handleStopTimerWithEvidence}
            handleDiscardTimer={handleDiscardTimer}
            startPending={startTimerMutation.isPending}
            activeTab={activeTab}
          />

          {activeTab === "projects" ? (
            <ProjectsTasksTab
              userId={userId}
              organizationId={activeOrgId}
              activeTeamId={activeTeamId}
              onSelectTask={(task) => {
                setDetailTask(task);
                setDetailLog(null);
                setIsDetailOpen(true);
              }}
            />
          ) : activeTab === "team" ? (
            <TeamSpaceView
              userId={userId}
              organizationId={activeOrgId}
              activeTeamId={activeTeamId}
              onSelectLog={(log) => {
                setDetailLog(log);
                setDetailTask(null);
                setIsDetailOpen(true);
              }}
              onShareLog={handleShareLog}
              onSelectUser={(uId) => {
                handleSetActiveTab("profile", uId);
              }}
            />
          ) : activeTab === "reports" ? (
            <ReportsView activeOrg={activeOrg} session={session} />
          ) : activeTab === "dashboard" ? (
            <DashboardView
              logs={rawLogs || []}
              projects={projects || []}
              tasks={tasks || []}
              runningTimer={runningTimer}
              handleStartTimer={handleStartTimer}
              handleStopTimer={handleStopTimerWithEvidence}
              setIsDialogOpen={setIsDialogOpen}
              timerSeconds={timerSeconds}
              formatDuration={formatDuration}
              onSelectLog={(log) => {
                setDetailLog(log);
                setDetailTask(null);
                setIsDetailOpen(true);
              }}
              startPending={startTimerMutation.isPending}
              stopPending={stopTimerMutation.isPending}
            />
          ) : (
            <section className="flex-1 overflow-y-auto custom-scrollbar p-unit-6 max-w-container-max mx-auto w-full">
              {activeTab === "logs" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Heatmap logs={rawLogs || []} />
                    <WeeklyChart logs={rawLogs || []} />
                  </div>

                  <div>
                    <TimeLogsList
                      logsByDay={paginatedLogsByDay}
                      projects={projects || []}
                      tasks={tasks || []}
                      onEdit={(log) => {
                        setEditingLog(log);
                        setIsDialogOpen(true);
                      }}
                      onDelete={handleDeleteLog}
                      onShare={handleShareLog}
                      searchQuery={searchQuery}
                      onManualLog={() => {
                        setEditingLog(null);
                        setIsDialogOpen(true);
                      }}
                      onSelect={(log) => {
                        setDetailLog(log);
                        setDetailTask(null);
                        setIsDetailOpen(true);
                      }}
                      isMutating={createLogMutation.isPending || stopTimerMutation.isPending}
                      isLoading={loadingPaginatedLogs}
                      fetchNextPage={fetchNextLogsPage}
                      hasNextPage={hasNextLogsPage}
                      isFetchingNextPage={isFetchingNextPage}
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
                      userId={userId}
                      organizationId={activeOrgId}
                      teamId={activeTeamId}
                      onRefreshLogs={() => {
                        refetchPaginatedLogs();
                      }}
                      rawLogs={rawLogs || []}
                    />
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                <ProfileTab
                  targetUserId={selectedProfileUserId || session.user.id}
                  onSelectLog={(log) => {
                    setDetailLog(log);
                    setDetailTask(null);
                    setIsDetailOpen(true);
                  }}
                  onEdit={(log) => {
                    setEditingLog(log);
                    setIsDialogOpen(true);
                  }}
                  onDelete={handleDeleteLog}
                  onShare={handleShareLog}
                />
              )}
              {activeTab === "org" && <OrgTab />}
            </section>
          )}
        </main>

        <TimerSidebar
          runningTimer={runningTimer}
          timerDesc={timerDesc}
          setTimerDesc={setTimerDesc}
          timerProjId={timerProjId}
          setTimerProjId={setTimerProjId}
          projects={projects || []}
          setEditingLog={setEditingLog}
          setIsDialogOpen={setIsDialogOpen}
          timerSeconds={timerSeconds}
          formatDuration={formatDuration}
          handleStartTimer={handleStartTimer}
          onDiscardTimer={handleDiscardTimer}
          startPending={startTimerMutation.isPending}
          stopPending={stopTimerMutation.isPending}
          discardPending={discardTimerMutation.isPending}
        />
      </div>

      <TimeLogDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingLog(null);
        }}
        onSubmit={async (data) => {
          if (runningTimer) {
            await handleStopTimerWithEvidence(data);
          } else {
            await handleDialogSubmit(data);
          }
        }}
        tasks={tasks || []}
        projects={projects || []}
        initialLog={editingLog || (runningTimer ? {
          description: runningTimer.description,
          start_time: runningTimer.start_time,
          end_time: new Date(),
          project_id: runningTimer.project_id,
        } : null)}
        isTimerStop={!!runningTimer && !editingLog}
        onDiscard={handleDiscardTimer}
        organizationId={activeOrgId}
      />

      <DetailViewDialog
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailLog(null);
          setDetailTask(null);
        }}
        selectedLog={detailLog}
        selectedTask={detailTask}
        projects={projects || []}
        tasks={tasks || []}
        onShareLog={handleShareLog}
      />

      <ShortcutsHelpDialog isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
