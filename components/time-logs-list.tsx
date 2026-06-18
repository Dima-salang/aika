"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Clock, CalendarDays, ExternalLink, List, LayoutGrid, PlayCircle, Folder, Tag, Loader2, Filter } from "lucide-react";
import { TimeLogCard } from "./time-log-card";
import { ActivityLogItem } from "@/components/team/activity-log-item";
import { getLogDurationSeconds, formatDuration } from "@/utils/time";
import { toast } from "sonner";
import { useConfirmStore } from "@/lib/store";
import { ImportExportDialog } from "./import-export-dialog";

interface TimeLogsListProps {
  logsByDay: { [key: string]: any[] };
  projects: any[];
  tasks: any[];
  onEdit: (log: any) => void;
  onDelete: (logId: string) => Promise<void>;
  searchQuery: string;
  onManualLog?: () => void;
  onSelect?: (log: any) => void;
  onShare?: (log: any) => void;
  isMutating?: boolean;
  isLoading?: boolean;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  selectedProjectId?: string;
  setSelectedProjectId?: (id: string) => void;
  startDateFilter?: string;
  setStartDateFilter?: (date: string) => void;
  endDateFilter?: string;
  setEndDateFilter?: (date: string) => void;
  onClearFilters?: () => void;
  userId: string;
  organizationId: string;
  teamId: string | null;
  onRefreshLogs: () => void;
  rawLogs: any[];
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
  onShare,
  isMutating = false,
  isLoading = false,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  selectedProjectId = "all",
  setSelectedProjectId,
  startDateFilter = "",
  setStartDateFilter,
  endDateFilter = "",
  setEndDateFilter,
  onClearFilters,
  userId,
  organizationId,
  teamId,
  onRefreshLogs,
  rawLogs,
}: TimeLogsListProps) {
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const { showConfirm } = useConfirmStore();
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !fetchNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getFriendlyDuration = (log: any) => {
    return formatDuration(getLogDurationSeconds(log));
  };

  const getDayTotalHours = (logs: any[]) => {
    const totalSeconds = logs.reduce((acc, log) => {
      return acc + getLogDurationSeconds(log);
    }, 0);
    return formatDuration(totalSeconds);
  };

  const handleDelete = async (logId: string) => {
    try {
      await onDelete(logId);
      toast.success("Time log entry deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete log.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-outline-variant">
        <h2 className="font-headline-sm text-headline-sm flex flex-wrap items-baseline gap-2">
          Logs Feed <span className="text-outline font-normal text-body-md">Activity Journal</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {onManualLog && (
            <>
              <button
                onClick={() => setIsImportExportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[14px]">file_upload</span>
                Import/Export
              </button>
              <button
                onClick={onManualLog}
                className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded border border-outline-variant transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[14px]" data-icon="add">add</span>
                Log Time
              </button>
            </>
          )}
          <div className="flex items-center gap-2 bg-surface-container-low dark:bg-surface-dim p-0.5 rounded-lg border border-outline-variant">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === "list"
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
              className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === "card"
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

      {/* Advanced Filter Toolbar */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filter Logs
          </span>
          {(searchQuery || (selectedProjectId !== "all") || startDateFilter || endDateFilter) && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Project dropdown */}
          {setSelectedProjectId && (
            <div>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          {setStartDateFilter && (
            <div className="relative">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              />
            </div>
          )}

          {/* End Date */}
          {setEndDateFilter && (
            <div className="relative">
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-unit-4 bg-surface-container-low border border-outline-variant rounded-lg">
              <div className="flex items-center gap-unit-6 flex-1">
                <div className="space-y-1.5 min-w-[110px]">
                  <div className="h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-3.5 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(logsByDay).length === 0 ? (
        <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950/20 animate-in fade-in duration-200">
          <Clock className="h-7 w-7 mx-auto text-zinc-350 dark:text-zinc-650 mb-2" />
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No hours logged yet</h4>
          <p className="text-[11px] text-zinc-405 max-w-xs mx-auto mt-0.5 font-medium">
            Start the timer on the right or add a manual log entry.
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {Object.keys(logsByDay).map((dayStr) => {
            const dayLogs = logsByDay[dayStr];
            return (
              <div key={dayStr} className="space-y-3">

                {viewMode === "card" && (
                  /* Header with date info and total hours for card grid */
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                      {dayStr}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-extrabold uppercase bg-surface-container/60 px-2.5 py-0.5 rounded border border-outline-variant">
                      Total: {getDayTotalHours(dayLogs)}
                    </span>
                  </div>
                )}

                {viewMode === "list" ? (
                  /* Precision high-density timeline stream layout consistent with feed but compact */
                  <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant pb-2">
                    {/* Timeline-style Day Header */}
                    <div className="relative pl-12 flex items-center justify-between gap-4">
                      <div className="absolute left-[11px] top-1.5 h-4 w-4 rounded-full border-2 border-outline-variant bg-surface flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                      <span className="text-[11px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        {dayStr}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-extrabold uppercase bg-surface-container/60 px-2.5 py-0.5 rounded border border-outline-variant mr-2">
                        Total: {getDayTotalHours(dayLogs)}
                      </span>
                    </div>

                    {isMutating && (
                      <div className="relative pl-12">
                        <div className="absolute left-[13px] top-4 h-3.5 w-3.5 rounded-full border-2 border-outline-variant bg-surface animate-pulse" />
                        <div className="flex items-center justify-between p-unit-4 bg-surface-container-low border border-outline-variant rounded-lg animate-pulse">
                          <div className="flex items-center gap-unit-6 flex-1">
                            <div className="space-y-1.5 min-w-[110px]">
                              <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                              <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {dayLogs.map((log) => {
                      const projectObj = projects?.find((p: any) => p.id === log.project_id);
                      const logTasks = (log.tasks || []).map((tId: string) => {
                        const taskObj = tasks?.find((t: any) => t.id === tId);
                        return {
                          id: tId,
                          title: taskObj?.title || `Task-${tId.slice(0, 4)}`
                        };
                      });

                      return (
                        <ActivityLogItem
                          key={log.id}
                          log={{
                            ...log,
                            projectName: projectObj?.name || null,
                            tasks: logTasks
                          }}
                          showUser={false}
                          showActions={true}
                          compact={true}
                          onEdit={onEdit}
                          onDelete={(id) => {
                            showConfirm({
                              title: "Delete time log entry?",
                              description: `Are you sure you want to delete the time log "${log.title}"? This action cannot be undone.`,
                              onConfirm: () => handleDelete(id)
                            });
                          }}
                          onSelect={onSelect}
                          onShare={onShare}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* Premium bento-style card grid for log items using TimeLogCard component */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-unit-4">
                    {isMutating && (
                      <div className="bg-surface-container-low border border-outline-variant p-unit-4 rounded-xl space-y-4 animate-pulse">
                        <div className="flex justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-3 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                          </div>
                          <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                          <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                      </div>
                    )}
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
                          onShare={onShare}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite scrolling sentinel and loader */}
      {isFetchingNextPage && (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={sentinelRef} className="h-2 w-full" />

      <ImportExportDialog
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        userId={userId}
        organizationId={organizationId}
        teamId={teamId}
        onSuccess={onRefreshLogs}
        currentLogs={rawLogs}
      />
    </div>
  );
}
