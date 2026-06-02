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
  const [activeTab, setActiveTab] = useState<"logs" | "profile" | "org" | "projects">("logs");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Timer States
  const [timerDesc, setTimerDesc] = useState("");
  const [timerProjId, setTimerProjId] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  // Theme State
  const [isDark, setIsDark] = useState(false);

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
                <ProjectsTasksTab userId={userId} organizationId={organizationId} />
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

    </div>
  );
}
