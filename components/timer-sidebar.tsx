"use client";

import React from "react";
import { useLayoutStore, usePreferenceStore } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TimerSidebarProps {
  runningTimer: any;
  timerDesc: string;
  setTimerDesc: (desc: string) => void;
  timerProjId: string;
  setTimerProjId: (projId: string) => void;
  projects: any[];
  setEditingLog: (log: any) => void;
  setIsDialogOpen: (open: boolean) => void;
  timerSeconds: number;
  formatDuration: (seconds: number) => string;
  handleStartTimer: () => void;
  onDiscardTimer?: () => void;
  startPending?: boolean;
  stopPending?: boolean;
  discardPending?: boolean;
}

export function TimerSidebar({
  runningTimer,
  timerDesc,
  setTimerDesc,
  timerProjId,
  setTimerProjId,
  projects,
  setEditingLog,
  setIsDialogOpen,
  timerSeconds,
  formatDuration,
  handleStartTimer,
  onDiscardTimer,
  startPending = false,
  stopPending = false,
  discardPending = false,
}: TimerSidebarProps) {
  const [mounted, setMounted] = React.useState(false);
  const { rightSidebarCollapsed, toggleRightSidebar } = useLayoutStore();
  const { latestProjectId, setLatestProjectId } = usePreferenceStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && !runningTimer && latestProjectId && !timerProjId) {
      setTimerProjId(latestProjectId);
    }
  }, [mounted, latestProjectId, timerProjId, runningTimer, setTimerProjId]);

  const collapsed = mounted ? rightSidebarCollapsed : false;

  return (
    <aside
      className={`h-screen bg-surface-container-low dark:bg-surface-dim border-l border-outline-variant hidden lg:flex flex-col p-unit-6 shrink-0 overflow-y-auto transition-all duration-300 z-30 ${collapsed ? "w-16 p-unit-3" : "w-80"
        }`}
      aria-label="Timer Control Panel"
    >
      {/* Header and Toggle Button */}
      <div className="flex items-center justify-between mb-unit-6 min-h-[32px] shrink-0">
        {!collapsed && (
          <label className="font-label-md text-[10px] uppercase tracking-widest text-primary font-bold animate-in fade-in duration-200">
            {runningTimer ? "Clocked In" : "Time Tracker"}
          </label>
        )}
        <button
          onClick={toggleRightSidebar}
          className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95 mx-auto"
          aria-label={collapsed ? "Expand Timer Panel" : "Collapse Timer Panel"}
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {collapsed ? (
        /* Collapsed Miniature View */
        <div className="flex flex-col items-center gap-unit-6 mt-unit-4 animate-in zoom-in-95 duration-200">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center relative group">
            <span className="material-symbols-outlined animate-pulse text-[22px]">
              {runningTimer ? "hourglass_top" : "play_circle"}
            </span>
            <div className="absolute right-12 top-1.5 scale-0 group-hover:scale-100 bg-surface-container-high text-on-surface text-xs rounded py-1 px-2 border border-outline-variant shadow-lg whitespace-nowrap transition-all z-40">
              {runningTimer ? `Running: ${formatDuration(timerSeconds)}` : "Clock In"}
            </div>
          </div>

          <button
            onClick={() => {
              if (runningTimer) {
                setEditingLog(null);
                setIsDialogOpen(true);
              } else {
                handleStartTimer();
              }
            }}
            disabled={startPending || stopPending || discardPending}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${runningTimer ? "bg-error text-on-error animate-pulse" : "bg-primary text-on-primary"
              }`}
            aria-label={runningTimer ? "Clock Out" : "Clock In"}
          >
            {startPending || stopPending ? (
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">
                {runningTimer ? "stop" : "play_arrow"}
              </span>
            )}
          </button>

          {runningTimer && onDiscardTimer && (
            <button
              onClick={onDiscardTimer}
              disabled={startPending || stopPending || discardPending}
              className="h-10 w-10 rounded-full bg-surface-container-high text-error border border-outline-variant flex items-center justify-center transition-all hover:bg-error/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Discard Clock In"
              title="Discard Clock In"
            >
              {discardPending ? (
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">
                  delete
                </span>
              )}
            </button>
          )}

          {!runningTimer && (
            <button
              onClick={() => {
                setEditingLog(null);
                setIsDialogOpen(true);
              }}
              disabled={startPending || stopPending || discardPending}
              className="h-10 w-10 rounded-full bg-surface-container-high text-on-surface border border-outline-variant flex items-center justify-center transition-all hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
              aria-label="Log Time Manually"
              title="Log Time Manually"
            >
              <span className="material-symbols-outlined text-[20px]">
                history
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Expanded Full View */
        <div className="space-y-6 flex-1 flex flex-col justify-between animate-in fade-in duration-200">

          <div className="space-y-6">
            {/* 1. Timer Display Console (Highly Prominent) */}
            <div className={`relative bg-surface-container-high dark:bg-[#111112] border rounded-2xl p-6 text-center transition-all duration-300 shadow-md ${runningTimer
                ? "border-primary/50 shadow-[0_0_20px_rgba(192,193,255,0.06)]"
                : "border-outline-variant/60"
              }`}>
              <span className="text-[10px] font-extrabold text-outline uppercase tracking-wider block mb-1">
                {runningTimer ? "ELAPSED SESSION" : "ELAPSED"}
              </span>

              <div
                className={`font-mono-timer text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-on-surface mb-4 selection:bg-transparent ${runningTimer ? "text-primary dark:text-indigo-400 animate-pulse" : ""
                  }`}
                id="timer-display"
                aria-live="polite"
              >
                {runningTimer ? formatDuration(timerSeconds) : "00:00:00"}
              </div>

              {/* Action Controls */}
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (runningTimer) {
                      setEditingLog(null);
                      setIsDialogOpen(true);
                    } else {
                      handleStartTimer();
                    }
                  }}
                  disabled={startPending || stopPending || discardPending}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${runningTimer
                      ? "bg-error text-on-error hover:opacity-90 active:scale-[0.98]"
                      : "bg-primary text-on-primary hover:opacity-95 active:scale-[0.98]"
                    }`}
                  id="main-timer-btn"
                >
                  {startPending || stopPending ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">
                      {runningTimer ? "stop" : "play_arrow"}
                    </span>
                  )}
                  {startPending ? "Clocking In..." : stopPending ? "Clocking Out..." : runningTimer ? "Clock Out & Log" : "Clock In Now"}
                </button>

                {runningTimer && onDiscardTimer && (
                  <button
                    type="button"
                    onClick={onDiscardTimer}
                    disabled={startPending || stopPending || discardPending}
                    className="w-full py-1.5 hover:bg-error/10 hover:text-error text-on-surface-variant rounded-lg font-semibold text-[10.5px] transition-all active:scale-[0.98] flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {discardPending ? (
                      <span className="material-symbols-outlined text-[14px] animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">
                        delete
                      </span>
                    )}
                    {discardPending ? "Discarding..." : "Discard Session"}
                  </button>
                )}
              </div>
            </div>

            {/* 2. Context Section */}
            <div className="bg-surface-container-low/40 border border-outline-variant/40 rounded-xl p-4 space-y-4">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider block border-b border-outline-variant/30 pb-1.5">
                Session Metadata
              </span>

              {/* Task Description */}
              <div className="space-y-1.5">
                <label htmlFor="task-input" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                  What are you working on?
                </label>
                {runningTimer ? (
                  <div className="text-xs text-on-surface font-semibold p-2 bg-surface-container rounded border border-outline-variant/40 bg-zinc-100/50 dark:bg-zinc-900/30">
                    {runningTimer.description || "Work session"}
                  </div>
                ) : (
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-lg text-xs p-2.5 focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline text-on-surface focus:outline-none font-medium"
                    id="task-input"
                    aria-label="What are you working on?"
                    placeholder="e.g. Refactoring middleware..."
                    type="text"
                    value={timerDesc}
                    onChange={(e) => setTimerDesc(e.target.value)}
                  />
                )}
              </div>

              {/* Project Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                  Project Scope
                </label>
                {runningTimer ? (
                  <div className="text-xs text-on-surface font-semibold p-2 bg-surface-container rounded border border-outline-variant/40 bg-zinc-100/50 dark:bg-zinc-900/30 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">folder</span>
                    {projects.find((p: any) => p.id === runningTimer.project_id)?.name || "No Project"}
                  </div>
                ) : (
                  projects && projects.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/80 rounded-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                      <span className="material-symbols-outlined text-[14px] text-outline">
                        folder
                      </span>
                      <select
                        value={timerProjId}
                        onChange={(e) => {
                          setTimerProjId(e.target.value);
                          setLatestProjectId(e.target.value);
                        }}
                        aria-label="Select Project"
                        className="bg-transparent border-none text-xs text-on-surface font-semibold focus:ring-0 focus:outline-none cursor-pointer py-0.5 w-full"
                      >
                        <option value="" className="bg-surface">No Project</option>
                        {projects.map((p: any) => (
                          <option key={p.id} value={p.id} className="bg-surface">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 3. Manual Logging Option */}
          {!runningTimer && (
            <div className="border-t border-outline-variant/40 pt-4 mt-auto">
              <button
                onClick={() => {
                  setEditingLog(null);
                  setIsDialogOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-primary/5 hover:text-primary hover:border-primary transition-all rounded-xl border border-outline-variant group w-full text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px]" data-icon="history">
                  history
                </span>
                <span>Log Time Manually</span>
              </button>
            </div>
          )}

        </div>
      )}
    </aside>
  );
}
