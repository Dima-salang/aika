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
      className={`h-screen bg-surface-container-low dark:bg-surface-dim border-l border-outline-variant flex flex-col p-unit-6 shrink-0 overflow-y-auto transition-all duration-300 z-30 ${
        collapsed ? "w-16 p-unit-3" : "w-80"
      }`}
      aria-label="Timer Control Panel"
    >
      {/* Header and Toggle Button */}
      <div className="flex items-center justify-between mb-unit-6 min-h-[32px]">
        {!collapsed && (
          <label className="font-label-md text-[10px] uppercase tracking-widest text-primary font-bold animate-in fade-in duration-200">
            {runningTimer ? "Clocked In" : "Clock In"}
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
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-95 ${
              runningTimer ? "bg-error text-on-error" : "bg-primary text-on-primary"
            }`}
            aria-label={runningTimer ? "Clock Out" : "Clock In"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {runningTimer ? "stop" : "play_arrow"}
            </span>
          </button>

          {runningTimer && onDiscardTimer && (
            <button
              onClick={onDiscardTimer}
              className="h-10 w-10 rounded-full bg-surface-container-high text-error border border-outline-variant flex items-center justify-center transition-all hover:bg-error/10 active:scale-95"
              aria-label="Discard Clock In"
              title="Discard Clock In"
            >
              <span className="material-symbols-outlined text-[20px]">
                delete
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Expanded Full View */
        <div className="space-y-unit-6 animate-in fade-in duration-200">
          <div className="space-y-unit-4">
            <input
              className="w-full bg-transparent border-none text-headline-sm font-headline-sm p-0 focus:ring-0 placeholder:text-surface-container-highest text-on-surface focus:outline-none"
              id="task-input"
              aria-label="What are you working on?"
              placeholder="Refactoring authentication middleware..."
              type="text"
              value={runningTimer ? (runningTimer.description || "") : timerDesc}
              onChange={(e) => {
                if (!runningTimer) setTimerDesc(e.target.value);
              }}
            />
            <div className="flex flex-col gap-unit-2 pt-unit-2">
              {projects && projects.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-high rounded border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px] text-outline" data-icon="folder">
                    folder
                  </span>
                  <select
                    value={runningTimer ? (runningTimer.project_id || "") : timerProjId}
                    onChange={(e) => {
                      if (!runningTimer) {
                        setTimerProjId(e.target.value);
                        setLatestProjectId(e.target.value);
                      }
                    }}
                    aria-label="Select Project"
                    className="bg-transparent border-none text-label-md text-on-surface-variant font-medium focus:ring-0 focus:outline-none cursor-pointer py-0.5 w-full bg-surface-container-high"
                  >
                    <option value="" className="bg-surface">No Project</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id} className="bg-surface">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={() => {
                  setEditingLog(null);
                  setIsDialogOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-container-high rounded border border-outline-variant hover:border-primary transition-colors group w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary" data-icon="sell">
                  sell
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant">Link Tasks</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-unit-4 border-t border-outline-variant pt-unit-6">
            <div 
              className="font-mono-timer text-headline-lg font-extrabold tracking-tighter tabular-nums text-on-surface" 
              id="timer-display"
              aria-live="polite"
            >
              {runningTimer ? formatDuration(timerSeconds) : "00:00:00"}
            </div>
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
                className={`w-full py-3 ${
                  runningTimer ? "bg-error text-on-error" : "bg-primary text-on-primary"
                } rounded-lg font-headline-sm flex items-center justify-center gap-unit-2 hover:brightness-110 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(192,193,255,0.2)]`}
                id="main-timer-btn"
              >
                <span className="material-symbols-outlined">
                  {runningTimer ? "stop" : "play_arrow"}
                </span>
                {runningTimer ? "Clock Out" : "Clock In"}
              </button>
              
              {runningTimer && onDiscardTimer && (
                <button
                  type="button"
                  onClick={onDiscardTimer}
                  className="w-full py-2 bg-surface-container-high border border-outline-variant hover:border-error hover:text-error text-on-surface-variant rounded-lg font-label-md text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                  Discard Clock-in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
