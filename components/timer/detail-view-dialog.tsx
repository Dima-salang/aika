"use client";

import React from "react";
import { X, Calendar, Clock, ClipboardList, ExternalLink, Tag, AlertCircle, FileText, Share2 } from "lucide-react";
import { getProjectColorBadge, getTaskColorBadge } from "./time-log-card";
import { useImageViewer } from "@/utils/image-viewer-store";
import { renderMarkdown } from "@/utils/markdown";

interface DetailViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLog?: any;
  selectedTask?: any;
  projects: any[];
  tasks: any[];
  onShareLog?: (log: any) => void;
}

export function DetailViewDialog({
  isOpen,
  onClose,
  selectedLog,
  selectedTask,
  projects = [],
  tasks = [],
  onShareLog,
}: DetailViewDialogProps) {
  const dismissBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        dismissBtnRef.current?.focus();
      }, 50);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getFriendlyDuration = (start: Date, end: Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const projectObj = selectedLog
    ? projects.find((p) => p.id === selectedLog.project_id)
    : selectedTask
      ? projects.find((p) => p.id === selectedTask.project_id)
      : null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-surface dark:bg-[#131315] border border-outline-variant rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-unit-6 py-unit-4 border-b border-outline-variant bg-surface-container-lowest select-none">
          <div className="flex items-center gap-unit-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {selectedLog ? <Clock className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-body-lg font-headline-sm font-bold text-on-surface">
                {selectedLog ? "Time Log Details" : "Task Details"}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                Detailed metadata inspect panel.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-unit-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">

          {selectedLog && (
            <div className="space-y-5">
              {/* Title & Project */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {projectObj ? (
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(projectObj.name)}`}>
                      {projectObj.name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] rounded font-bold uppercase tracking-wider">
                      Unassigned
                    </span>
                  )}
                  <span className="text-[10px] text-outline uppercase font-mono-timer tracking-wider">
                    Log #{selectedLog.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl text-on-surface font-extrabold leading-snug">
                    {selectedLog.title}
                  </h3>
                  {onShareLog && (
                    <button
                      onClick={() => onShareLog(selectedLog)}
                      className={`p-1.5 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer shrink-0 ${selectedLog.is_public ? "text-primary border-primary/30 bg-primary/5" : "text-outline hover:text-primary"}`}
                      title={selectedLog.is_public ? "Copy Share Link (Shared)" : "Copy Share Link"}
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Time Window Details */}
              <div className="p-4 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-outline uppercase text-[10px] tracking-wider">Interval Duration</span>
                  <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold text-body-sm">
                    {getFriendlyDuration(selectedLog.start_time, selectedLog.end_time)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3 text-xs select-none">
                  <div className="space-y-1">
                    <span className="text-outline text-[10px] uppercase font-bold block">Start Time</span>
                    <span className="font-mono-timer text-on-surface font-semibold">
                      {new Date(selectedLog.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-outline text-[10px] uppercase font-bold block">End Time</span>
                    <span className="font-mono-timer text-on-surface font-semibold">
                      {new Date(selectedLog.end_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLog.description && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Description Notes</span>
                  <div className="bg-surface-container-low/25 border border-outline-variant/30 p-3 rounded-lg text-body-sm text-on-surface leading-relaxed">
                    {renderMarkdown(selectedLog.description)}
                  </div>
                </div>
              )}

              {/* Connected Tasks */}
              {selectedLog.tasks && selectedLog.tasks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Linked Tasks</span>
                  <div className="flex flex-col gap-2">
                    {selectedLog.tasks.map((taskItem: any) => {
                      const tId = typeof taskItem === "string" ? taskItem : taskItem?.id;
                      if (!tId) return null;
                      const taskObj = tasks.find((t) => t.id === tId);
                      const taskTitle = taskObj?.title || (typeof taskItem === "object" ? taskItem.title : `Task-${tId.slice(0, 4)}`);
                      return (
                        <div
                          key={tId}
                          className="flex items-center gap-2 p-2 bg-surface-container-low/50 hover:bg-surface-container border border-outline-variant/50 rounded-lg text-xs font-semibold"
                        >
                          <span className={`px-2 py-0.5 text-[9px] rounded border font-medium ${getTaskColorBadge(taskTitle)}`}>
                            #{taskTitle}
                          </span>
                          {taskObj?.status && (
                            <span className="px-1.5 py-0.2 bg-zinc-500/10 text-outline text-[9px] rounded border border-outline-variant uppercase font-extrabold shrink-0 select-none">
                              {taskObj.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evidence */}
              {selectedLog.evidence && selectedLog.evidence.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Evidence Files</span>
                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const imageList = selectedLog.evidence
                        .filter((e: any) => e.mime_type?.startsWith("image/"))
                        .map((e: any) => e.file_url);

                      return selectedLog.evidence.map((ev: any, idx: number) => {
                        const isImage = ev.mime_type?.startsWith("image/");
                        return (
                          <div
                            key={idx}
                            className="group relative border border-outline-variant rounded-lg overflow-hidden aspect-video shadow-md cursor-pointer bg-zinc-950 flex flex-col justify-center items-center"
                            onClick={() => {
                              if (isImage) {
                                const imgIdx = imageList.indexOf(ev.file_url);
                                useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                              } else {
                                window.open(ev.file_url, "_blank");
                              }
                            }}
                          >
                            {isImage ? (
                              <img
                                src={ev.file_url}
                                alt={ev.file_name}
                                className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 text-center text-on-surface">
                                <FileText className="h-7 w-7 text-primary mb-1" />
                                <span className="text-[10px] font-bold truncate max-w-[140px] px-1 block">{ev.file_name}</span>
                                <span className="text-[8px] text-outline mt-0.5">{(ev.file_size / 1024).toFixed(0)} KB</span>
                              </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 p-1.5 bg-black/70 border-t border-outline-variant/35 backdrop-blur-sm flex items-center justify-between text-[10px] text-outline select-none">
                              <span className="truncate max-w-[120px] font-mono-timer text-on-surface font-semibold">{ev.file_name}</span>
                              <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTask && (
            <div className="space-y-5">
              {/* Title & Project */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {projectObj ? (
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(projectObj.name)}`}>
                      {projectObj.name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] rounded font-bold uppercase tracking-wider">
                      No Project
                    </span>
                  )}
                  <span className="text-[10px] text-outline uppercase font-mono-timer tracking-wider">
                    Task #{selectedTask.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="text-xl text-on-surface font-extrabold leading-snug">
                  {selectedTask.title}
                </h3>
              </div>

              {/* Status and Priority Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl select-none">
                <div className="space-y-1">
                  <span className="text-outline text-[10px] uppercase font-bold block">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] border uppercase font-extrabold inline-block ${selectedTask.status === "done"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : selectedTask.status === "in_progress"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                    }`}>
                    {selectedTask.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-outline text-[10px] uppercase font-bold block">Priority</span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] border uppercase font-extrabold inline-block ${selectedTask.priority === "high"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : selectedTask.priority === "medium"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                    }`}>
                    {selectedTask.priority || "none"}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Description</span>
                  <div className="bg-surface-container-low/25 border border-outline-variant/30 p-3 rounded-lg text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-xs select-none">
                <div className="space-y-1">
                  <span className="text-outline text-[10px] uppercase font-bold block">Created At</span>
                  <span className="bg-surface-container-low px-2 py-1.5 border border-outline-variant/50 rounded-lg font-semibold block truncate">
                    {new Date(selectedTask.created_at || selectedTask.createdAt).toLocaleString()}
                  </span>
                </div>
                {selectedTask.due_date && (
                  <div className="space-y-1">
                    <span className="text-outline text-[10px] uppercase font-bold block">Due Date</span>
                    <span className="bg-surface-container-low px-2 py-1.5 border border-outline-variant/50 rounded-lg font-semibold block truncate">
                      {new Date(selectedTask.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-unit-6 py-unit-4 border-t border-outline-variant flex items-center justify-end bg-surface-container-lowest">
          <button
            ref={dismissBtnRef}
            onClick={onClose}
            className="rounded-lg text-xs font-semibold px-4 py-2 border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer select-none"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
