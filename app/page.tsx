"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { TimeLogDialog } from "@/components/time-log-dialog";
import { TimeLogsList } from "@/components/time-logs-list";
import { Sidebar } from "@/components/sidebar";
import { TimerSidebar } from "@/components/timer-sidebar";
import { Header } from "@/components/header";
import { Heatmap } from "@/components/heatmap";
import { WeeklyChart } from "@/components/weekly-chart";
import { ProjectsTasksTab } from "@/components/projects-tasks-tab";
import { DashboardView } from "@/components/dashboard-view";
import { DetailViewDialog } from "@/components/detail-view-dialog";
import { DashboardManageControls } from "@/components/admin/dashboard-manage-controls";

import {
  Loader2,
  User,
  Building2,
  Play,
  Square,
  Plus,
  Search,
  ExternalLink,
  Sparkles,
  BarChart3,
  CalendarDays,
  FolderDot,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // Dashboard & Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "profile" | "org" | "projects">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

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

  // tRPC Queries & Mutations
  const userId = session?.user?.id || "";
  const organizationId = "org-default"; // Fallback organization ID

  const { data: rawLogs, refetch: refetchLogs } = trpc.getUserLogs.useQuery(
    { userId, organizationId },
    { enabled: !!userId }
  );
  
  const { data: tasks } = trpc.getTasks.useQuery(
    { userId },
    { enabled: !!userId }
  );
  
  const { data: projects } = trpc.getProjects.useQuery(
    { organizationId },
    { enabled: !!userId }
  );

  const { data: runningTimer, refetch: refetchTimer } = trpc.getRunningTimer.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const startTimerMutation = trpc.startTimer.useMutation({
    onSuccess: () => {
      refetchTimer();
      setTimerDesc("");
    },
  });

  const stopTimerMutation = trpc.stopTimer.useMutation({
    onSuccess: () => {
      refetchTimer();
      refetchLogs();
    },
  });

  const createLogMutation = trpc.createLog.useMutation({
    onSuccess: () => {
      refetchLogs();
    },
  });

  const updateLogMutation = trpc.updateLog.useMutation({
    onSuccess: () => {
      refetchLogs();
    },
  });

  const deleteLogMutation = trpc.deleteLog.useMutation({
    onSuccess: () => {
      refetchLogs();
    },
  });

  // Theme Sync
  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);
  }, []);

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

      // Global shortcuts (Work even inside input fields)
      
      // CMD/CTRL + K: Focus Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) {
          searchInput.focus();
          // Select search text for quick overwrite
          (searchInput as HTMLInputElement).select();
        }
        return;
      }

      // Alt + H or ?: Toggle Keyboard Shortcut Help Overlay
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

      // Escape: Close all overlays/dialogs
      if (e.key === "Escape") {
        setIsDialogOpen(false);
        setIsDetailOpen(false);
        setIsShortcutsOpen(false);
        setEditingLog(null);
        return;
      }

      // If user is focused on an input, do not trigger single-key or Alt navigation shortcuts
      if (isInput) return;

      // /: Focus Search (when not in input)
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Alt + T or T: Toggle Timer
      if ((e.altKey && e.key.toLowerCase() === "t") || e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (runningTimer) {
          // Trigger stop dialog
          setIsDialogOpen(true);
        } else {
          handleStartTimer();
        }
        return;
      }

      // Alt + N or N: Create New Log
      if ((e.altKey && e.key.toLowerCase() === "n") || e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingLog(null);
        setIsDialogOpen(true);
        return;
      }

      // Alt + C or C: Create New Task (redirect to projects & trigger event)
      if ((e.altKey && e.key.toLowerCase() === "c") || e.key.toLowerCase() === "c") {
        e.preventDefault();
        setActiveTab("projects");
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("aika-new-task"));
        }, 80);
        return;
      }

      // Navigation shortcuts: Alt + [1-5]
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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

  // Format Helper
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartTimer = async () => {
    if (!userId) return;
    await startTimerMutation.mutateAsync({
      userId,
      projectId: timerProjId || null,
      description: timerDesc || "Work session",
    });
  };

  const handleStopTimerWithEvidence = async (evidenceData: any) => {
    if (!userId) return;
    await stopTimerMutation.mutateAsync({
      userId,
      organizationId,
      teamId: null,
      taskIds: evidenceData.taskIds,
      evidence: evidenceData.evidence,
      projectId: evidenceData.projectId,
      title: evidenceData.title,
      description: evidenceData.description || runningTimer?.description || "Timer-logged hours",
    });
  };

  const handleDialogSubmit = async (data: any) => {
    if (editingLog) {
      await updateLogMutation.mutateAsync({
        logId: editingLog.id,
        userId,
        input: {
          organizationId,
          projectId: data.projectId,
          startTime: data.startTime,
          endTime: data.endTime,
          title: data.title,
          description: data.description,
          taskIds: data.taskIds,
          evidence: data.evidence,
        },
      });
    } else {
      await createLogMutation.mutateAsync({
        userId,
        organizationId,
        projectId: data.projectId,
        startTime: data.startTime,
        endTime: data.endTime,
        title: data.title,
        description: data.description,
        taskIds: data.taskIds,
        evidence: data.evidence,
      });
    }
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLogMutation.mutateAsync({
      logId,
      userId,
    });
  };

  if (isPending) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-[#0c0c0e]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-100" />
          <p className="text-zinc-500 text-sm font-semibold tracking-wide">Syncing session...</p>
        </div>
      </div>
    );
  }

  // Filter logs
  const filteredLogs = (rawLogs || []).filter((log: any) => {
    const q = searchQuery.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      (log.tasks && log.tasks.some((tId: string) => tId.toLowerCase().includes(q)))
    );
  });

  // Calculate stats
  const totalLoggedMs = (rawLogs || []).reduce((acc: number, log: any) => {
    const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  const totalLoggedHours = (totalLoggedMs / 3600000).toFixed(1);
  const uniqueProjectsCount = new Set((rawLogs || []).map((l: any) => l.project_id).filter(Boolean)).size;
  const sessionsCount = (rawLogs || []).length;

  // Group logs by Day
  const logsByDay: { [key: string]: any[] } = {};
  filteredLogs.forEach((log: any) => {
    const dateStr = new Date(log.start_time).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    if (!logsByDay[dateStr]) logsByDay[dateStr] = [];
    logsByDay[dateStr].push(log);
  });

  return (
    <div className="relative min-h-screen w-full flex bg-surface-container-lowest text-on-surface overflow-hidden font-sans">
      
      {session ? (
        <>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            session={session}
            handleSignOut={handleSignOut}
            isDark={isDark}
            toggleTheme={toggleTheme}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
          />

          {/* Main Content & Right Sidebar Workspace Container */}
          <div className="flex-1 flex overflow-hidden h-screen w-full">
            {/* Main Content Canvas */}
            <main className="flex-1 flex flex-col bg-surface-container-lowest overflow-hidden h-screen">
              {activeTab !== "projects" && (
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
                />
              )}

              {activeTab === "projects" ? (
                <ProjectsTasksTab
                  userId={userId}
                  organizationId={organizationId}
                  onSelectTask={(task) => {
                    setDetailTask(task);
                    setDetailLog(null);
                    setIsDetailOpen(true);
                  }}
                />
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
                />
              ) : (
                /* Scrollable Main Area */
                <section className="flex-1 overflow-y-auto custom-scrollbar p-unit-6 max-w-container-max mx-auto w-full">
                  {activeTab === "logs" && (
                    <div className="space-y-6">
                      {/* Top Analytics Panel (GitHub heatmap and Weekly progression side-by-side) */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <Heatmap logs={rawLogs || []} />
                        <WeeklyChart logs={rawLogs || []} />
                      </div>

                      {/* Timeline logs */}
                      <div>
                        <TimeLogsList
                          logsByDay={logsByDay}
                          projects={projects || []}
                          tasks={tasks || []}
                          onEdit={(log) => {
                            setEditingLog(log);
                            setIsDialogOpen(true);
                          }}
                          onDelete={handleDeleteLog}
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
                        />
                      </div>
                    </div>
                  )}

                {/* Profile Panel */}
                {activeTab === "profile" && (
                  <div className="glass-card rounded-xl p-unit-6 bg-surface-container-low text-on-surface border border-outline-variant">
                    <div className="mb-unit-4 border-b border-outline-variant pb-unit-2">
                      <h3 className="text-headline-sm font-headline-sm font-bold flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined">person</span> My Profile
                      </h3>
                      <p className="text-body-sm text-outline mt-1">Your account particulars synced through Better Auth.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
                        {session.user.image ? (
                          <img src={session.user.image} alt={session.user.name} className="h-14 w-14 rounded-full" />
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase">
                            {session.user.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-body-md font-extrabold">{session.user.name}</h4>
                          <p className="text-body-sm text-outline">{session.user.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-outline font-bold uppercase block">User ID</span>
                          <p className="font-mono-timer bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant truncate">
                            {session.user.id}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-outline font-bold uppercase block">Created At</span>
                          <p className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant">
                            {new Date(session.user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Org Panel */}
                {activeTab === "org" && (
                  <div className="glass-card rounded-xl p-unit-6 bg-surface-container-low text-on-surface border border-outline-variant">
                    <div className="mb-unit-4 border-b border-outline-variant pb-unit-2">
                      <h3 className="text-headline-sm font-headline-sm font-bold flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined">work</span> My Organization
                      </h3>
                      <p className="text-body-sm text-outline mt-1">Your active organization domain workspace.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center p-8 border border-dashed border-outline-variant rounded-xl">
                        <p className="text-outline text-body-sm mb-4 max-w-sm mx-auto font-medium">
                          Access team directories and scale organizational control with Better Auth Tenant modules.
                        </p>
                        <button className="rounded-lg text-body-sm px-unit-4 py-2 font-bold border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-2 mx-auto">
                          Manage Workspace <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </button>
                      </div>

                      <DashboardManageControls userId={userId} />
                    </div>
                  </div>
                )}
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
            />
          </div>
        </>
      ) : (
        // Welcome Page
        <main className="z-10 flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col justify-center items-center">
          <div className="max-w-2xl text-center space-y-8 py-16 animate-in fade-in zoom-in duration-300">
            <h1 className="text-5xl font-black tracking-tight leading-none text-on-surface sm:text-6xl bg-gradient-to-r from-on-surface via-outline to-on-surface bg-clip-text text-transparent">
              Aika Time & Tasks
            </h1>
            <p className="text-lg text-outline max-w-lg mx-auto font-medium leading-relaxed">
              A beautifully type-safe, elegant time logging and team management platform built on Next.js 16 and fully secured with Better Auth.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth">
                <button className="rounded-full shadow-lg font-bold bg-primary text-on-primary hover:opacity-90 px-unit-6 py-3 text-body-lg transition-all active:scale-[0.98]">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </main>
      )}

      {/* Manual Creation / Update dialog */}
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
      />

      {/* Dynamic Detail inspector dialog for tasks & logs */}
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
      />

      {/* Keyboard Shortcuts Helper Modal */}
      {isShortcutsOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
          role="dialog" 
          aria-modal="true"
          onClick={() => setIsShortcutsOpen(false)}
        >
          <div 
            className="bg-surface dark:bg-[#121214] border border-outline-variant rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">keyboard</span>
                <h3 className="text-headline-sm font-extrabold text-on-surface">Power User Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setIsShortcutsOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-outline font-medium">Use these premium hotkeys to navigate Aika instantly like a pro developer.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Actions category */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-primary tracking-wider">Quick Actions</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface font-semibold">Toggle Active Timer (Clock in/out)</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                        <span className="text-outline text-[10px]">+</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">T</kbd>
                        <span className="text-outline text-[10px]">or</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">T</kbd>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface font-semibold">Focus Search Input</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">⌘</kbd>
                        <span className="text-outline text-[10px]">+</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">K</kbd>
                        <span className="text-outline text-[10px]">or</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">/</kbd>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface font-semibold">Log Hours (Manual Creation)</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                        <span className="text-outline text-[10px]">+</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">N</kbd>
                        <span className="text-outline text-[10px]">or</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">N</kbd>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface font-semibold">Instantiate New Deliverable Task</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                        <span className="text-outline text-[10px]">+</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">C</kbd>
                        <span className="text-outline text-[10px]">or</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">C</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Category */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-[10px] uppercase font-bold text-primary tracking-wider">Navigation Tabs</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface-variant">Dashboard</span>
                      <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">1</kbd></span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface-variant">Time Logs</span>
                      <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">2</kbd></span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface-variant">Projects/Tasks</span>
                      <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">3</kbd></span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                      <span className="text-on-surface-variant">Profile</span>
                      <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">4</kbd></span>
                    </div>
                  </div>
                </div>

                {/* Help */}
                <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/20 mt-1">
                  <span className="text-primary font-semibold">Toggle Keyboard Shortcuts Guide</span>
                  <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">?</kbd> <span className="text-[10px] text-outline">or</span> <kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">H</kbd></span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center text-[10px] text-outline border-t border-outline-variant/30 flex justify-between items-center">
              <span>Press <kbd className="px-1 bg-surface-container-high rounded border border-outline-variant">Esc</kbd> to close any modal</span>
              <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-[12px]">flash_on</span> Designed for quick navigation</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
