"use client";

import React from "react";
import { Clock, ExternalLink, Edit2, Trash2, Share2 } from "lucide-react";
import { useImageViewer } from "@/utils/image-viewer-store";
import { isImageUrl } from "@/utils/file";
import { renderMarkdown } from "@/utils/markdown";

interface TimeLogCardProps {
  log: any;
  project: any;
  tasks: any[];
  onEdit: (log: any) => void;
  onDelete: (logId: string) => void;
  onSelect?: (log: any) => void;
  onShare?: (log: any) => void;
}

export const getProjectColorBadge = (projName: string) => {
  const colors = [
    "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "bg-rose-500/15 text-rose-300 border-rose-500/30",
    "bg-violet-500/15 text-violet-300 border-violet-500/30",
    "bg-sky-500/15 text-sky-300 border-sky-500/30",
  ];
  let hash = 0;
  for (let i = 0; i < projName.length; i++) {
    hash = projName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

export const getTaskColorBadge = (taskTitle: string) => {
  const colors = [
    "bg-sky-500/10 text-sky-400 border-sky-500/25",
    "bg-purple-500/10 text-purple-400 border-purple-500/25",
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
    "bg-teal-500/10 text-teal-400 border-teal-500/25",
    "bg-orange-500/10 text-orange-400 border-orange-500/25",
  ];
  let hash = 0;
  for (let i = 0; i < taskTitle.length; i++) {
    hash = taskTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

export function TimeLogCard({
  log,
  project,
  tasks,
  onEdit,
  onDelete,
  onSelect,
  onShare,
}: TimeLogCardProps) {
  const getFriendlyDuration = (start: Date, end: Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

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
      onClick={() => onSelect?.(log)}
      className="glass-card rounded-xl p-unit-4 flex flex-col justify-between hover:border-primary/60 hover:shadow-lg transition-all group relative cursor-pointer min-h-[190px] border border-outline-variant/40"
    >
      {/* Top row: Project Badge + Actions */}
      <div className="flex items-center justify-between mb-unit-3 gap-2">
        {project ? (
          <span className={`px-2 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(project.name)}`}>
            {project.name}
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] rounded font-bold uppercase tracking-wider">
            Unassigned
          </span>
        )}

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(log);
              }}
              className={`p-1 hover:bg-surface-container-high rounded transition-colors ${log.is_public ? "text-primary hover:text-primary-hover" : "text-outline hover:text-primary"}`}
              title={log.is_public ? "Copy Share Link (Shared)" : "Copy Share Link"}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(log);
            }}
            className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors"
            title="Edit Log"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(log.id);
            }}
            className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-error transition-colors"
            title="Delete Log"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 mb-unit-3">
        <h3 className="font-headline-sm text-lg font-bold text-on-surface leading-snug group-hover:text-primary transition-colors truncate">
          {log.title}
        </h3>
        
        {/* Time range + Duration */}
        <div className="flex items-center gap-1.5 mt-1.5 text-body-sm font-medium">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono-timer text-on-surface-variant text-[12.5px] tracking-tight">
            {formattedTimeRange}
          </span>
          <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded font-bold">
            {getFriendlyDuration(log.start_time, log.end_time)}
          </span>
        </div>

        {log.description && (
          <div className="text-body-sm text-outline mt-2 line-clamp-2 leading-relaxed">
            {renderMarkdown(log.description)}
          </div>
        )}

        {/* Tasks Badges - Colorful */}
        {log.tasks && log.tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {log.tasks.map((tId: string) => {
              const taskObj = tasks?.find((t: any) => t.id === tId);
              const taskTitle = taskObj?.title || `Task-${tId.slice(0, 4)}`;
              return (
                <span
                  key={tId}
                  className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${getTaskColorBadge(taskTitle)}`}
                >
                  #{taskTitle}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Evidences Proof row */}
      {log.evidence && log.evidence.length > 0 && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-outline-variant/30 flex-wrap">
          {(() => {
            const imageList = log.evidence
              .filter((e: any) => e.mime_type ? e.mime_type.startsWith("image/") : isImageUrl(e.file_url))
              .map((e: any) => e.file_url);

            return log.evidence.map((ev: any, idx: number) => {
              const isImg = ev.mime_type ? ev.mime_type.startsWith("image/") : isImageUrl(ev.file_url);
              return (
                <div
                  key={idx}
                  className="h-6 flex items-center gap-1.5 px-2 bg-surface-container-lowest/80 border border-outline-variant rounded hover:border-primary transition-colors cursor-pointer text-[10px] text-outline hover:text-on-surface"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isImg) {
                      const imgIdx = imageList.indexOf(ev.file_url);
                      useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                    } else {
                      window.open(ev.file_url, "_blank");
                    }
                  }}
                  title={`View Proof: ${ev.file_name}`}
                >
                  <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate max-w-[120px] font-mono-timer">{ev.file_name}</span>
                </div>
              );
            });
          })()}
        </div>
      )}

    </div>
  );
}
