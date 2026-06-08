"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Clock, CalendarDays, ExternalLink, List, LayoutGrid, PlayCircle, Folder, Tag } from "lucide-react";
import { TimeLogCard, getProjectColorBadge, getTaskColorBadge } from "./time-log-card";
import { toast } from "sonner";
import { useConfirmStore } from "@/lib/store";

interface TimeLogsListProps {
  logsByDay: { [key: string]: any[] };
  projects: any[];
  tasks: any[];
  onEdit: (log: any) => void;
  onDelete: (logId: string) => Promise<void>;
  searchQuery: string;
  onManualLog?: () => void;
  onSelect?: (log: any) => void;
}

export function TimeLogsList({
  logsByDay,
  projects,
  tasks,
  onEdit,
  onDelete,
  searchQuery,
  onManualLog,
  onSelect,
}: TimeLogsListProps) {
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const { showConfirm } = useConfirmStore();

  const getFriendlyDuration = (start: Date, end: Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getDayTotalHours = (logs: any[]) => {
    const totalMs = logs.reduce((acc, log) => {
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    const minutes = Math.floor(totalMs / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleDelete = async (logId: string) => {
    try {
      await onDelete(logId);
      toast.success("Time log entry deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete log.");
    }
  };

  if (Object.keys(logsByDay).length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950/20">
        <Clock className="h-7 w-7 mx-auto text-zinc-350 dark:text-zinc-650 mb-2" />
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No hours logged yet</h4>
        <p className="text-[11px] text-zinc-405 max-w-xs mx-auto mt-0.5 font-medium">
          Start the timer on the right or add a manual log entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Mode Selector */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
        <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
          Logs Feed <span className="text-outline font-normal text-body-md">Activity Journal</span>
        </h2>
        <div className="flex items-center gap-3">
          {onManualLog && (
            <button
              onClick={onManualLog}
              className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[14px]" data-icon="add">add</span>
              Log Time
            </button>
          )}
          <div className="flex items-center gap-2 bg-surface-container-low dark:bg-surface-dim p-0.5 rounded-lg border border-outline-variant">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold px-0.5">List</span>
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${
                viewMode === "card"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold px-0.5">Card</span>
            </button>
          </div>
        </div>
      </div>

      {Object.keys(logsByDay).map((dayStr) => {
        const dayLogs = logsByDay[dayStr];
        return (
          <div key={dayStr} className="space-y-3">
            
            {/* Header with date info and total hours */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                {dayStr}
              </span>
              <span className="text-[10px] text-on-surface-variant font-extrabold uppercase bg-surface-container/60 px-2.5 py-0.5 rounded border border-outline-variant">
                Total: {getDayTotalHours(dayLogs)}
              </span>
            </div>

            {viewMode === "list" ? (
              /* Precision high-density list feed modeled after the HTML mockup */
              <div className="space-y-2">
                {dayLogs.map((log) => {
                  const projectObj = projects?.find((p: any) => p.id === log.project_id);
                  const formattedTimeRange = `${new Date(log.start_time).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })} - ${new Date(log.end_time).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}`;

                  return (
                    <div
                      key={log.id}
                      onClick={() => onSelect?.(log)}
                      className="group flex items-center justify-between p-unit-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-lg transition-all cursor-pointer hover:shadow-md"
                    >
                      <div className="flex items-center gap-unit-6 flex-1 min-w-0">
                        {/* Time & Duration columns */}
                        <div className="flex flex-col gap-0.5 min-w-[110px] shrink-0 text-left">
                          <span className="font-mono-timer text-body-sm text-outline tracking-tight">
                            {formattedTimeRange}
                          </span>
                          <span className="font-label-md text-on-surface-variant font-semibold">
                            {getFriendlyDuration(log.start_time, log.end_time)}
                          </span>
                        </div>

                        {/* Title, tags, description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-unit-2 mb-1 flex-wrap">
                            <span className="font-body-md text-on-surface font-bold group-hover:text-primary transition-colors truncate max-w-[280px]">
                              {log.title}
                            </span>
                            {projectObj && (
                              <span className={`px-1.5 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(projectObj.name)}`}>
                                {projectObj.name}
                              </span>
                            )}
                            
                            {/* Associated tasks */}
                            {log.tasks && log.tasks.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {log.tasks.map((tId: string) => {
                                  const taskObj = tasks?.find((t: any) => t.id === tId);
                                  const taskTitle = taskObj?.title || `Task-${tId.slice(0, 4)}`;
                                  return (
                                    <span
                                      key={tId}
                                      className={`px-1.5 py-0.2 text-[10px] rounded border font-medium tracking-tight ${getTaskColorBadge(taskTitle)}`}
                                    >
                                      #{taskTitle}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {log.description && (
                            <p className="text-body-sm text-outline group-hover:text-on-surface-variant transition-colors mb-1">
                              {log.description}
                            </p>
                          )}
                        </div>
                          
                          {/* Evidence proof url thumbnail inline if present */}
                          {log.evidence && log.evidence.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              {log.evidence.map((ev: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="h-6 flex items-center gap-1.5 px-2 bg-surface-container-lowest/80 border border-outline-variant rounded hover:border-primary transition-colors cursor-pointer text-[10px] text-outline hover:text-on-surface"
                                  onClick={() => window.open(ev.file_url, "_blank")}
                                  title={`View Proof: ${ev.file_name}`}
                                >
                                  <Clock className="h-3 w-3 text-primary shrink-0" />
                                  <span className="truncate max-w-[120px] font-mono-timer">{ev.file_name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      {/* Right hover action buttons */}
                      <div className="flex items-center gap-unit-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(log);
                          }}
                          className="material-symbols-outlined text-outline hover:text-primary transition-colors p-1 hover:bg-surface-container-high rounded"
                          title="Edit Log"
                        >
                          edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm({
                              title: "Delete time log entry?",
                              description: `Are you sure you want to delete the time log "${log.title}"? This action cannot be undone.`,
                              onConfirm: () => handleDelete(log.id)
                            });
                          }}
                          className="material-symbols-outlined text-outline hover:text-error transition-colors p-1 hover:bg-surface-container-high rounded"
                          title="Delete Log"
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Premium bento-style card grid for log items using TimeLogCard component */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-unit-4">
                {dayLogs.map((log) => {
                  const projectObj = projects?.find((p: any) => p.id === log.project_id);
                  return (
                    <TimeLogCard
                      key={log.id}
                      log={log}
                      project={projectObj}
                      tasks={tasks}
                      onEdit={onEdit}
                      onDelete={(id) => {
                        showConfirm({
                          title: "Delete time log entry?",
                          description: `Are you sure you want to delete the time log "${log.title}"? This action cannot be undone.`,
                          onConfirm: () => handleDelete(id)
                        });
                      }}
                      onSelect={onSelect}
                    />
                  );
                })}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
