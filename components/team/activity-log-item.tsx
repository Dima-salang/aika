"use client";

import React from "react";
import { 
  Clock, 
  FileText, 
  ExternalLink, 
  Edit2, 
  Trash2,
  Calendar
} from "lucide-react";
import { useImageViewer } from "@/utils/image-viewer-store";
import { isImageUrl } from "@/utils/file";
import { renderMarkdown } from "@/utils/markdown";
import { formatDuration, getLogDurationSeconds } from "@/utils/time";

interface LogTask {
  id: string;
  title: string;
}

interface LogEvidence {
  id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
}

export interface ActivityLogItemData {
  id: string;
  title: string;
  description: string | null;
  start_time: Date | string;
  end_time: Date | string;
  projectName?: string | null;
  tasks?: LogTask[];
  evidence?: LogEvidence[];
  userName?: string;
  userEmail?: string;
  userImage?: string | null;
  userRole?: string;
  duration?: number;
}

interface ActivityLogItemProps {
  log: ActivityLogItemData;
  showUser?: boolean;
  showActions?: boolean;
  compact?: boolean;
  onEdit?: (log: any) => void;
  onDelete?: (logId: string) => void;
  onSelect?: (log: any) => void;
}

// Harmonious color palettes matching the tracker & feed pages
export const getProjectColorBadge = (projName: string) => {
  const colors = [
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-305 border-indigo-500/30 dark:border-indigo-500/20",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-305 border-emerald-500/30 dark:border-emerald-500/20",
    "bg-amber-500/10 text-amber-700 dark:text-amber-305 border-amber-500/30 dark:border-amber-500/20",
    "bg-rose-500/10 text-rose-700 dark:text-rose-305 border-rose-500/30 dark:border-rose-500/20",
    "bg-violet-500/10 text-violet-700 dark:text-violet-305 border-violet-500/30 dark:border-violet-500/20",
    "bg-sky-500/10 text-sky-700 dark:text-sky-305 border-sky-500/30 dark:border-sky-500/20",
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
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 dark:border-sky-500/20",
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 dark:border-cyan-500/20",
    "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 dark:border-teal-500/20",
    "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 dark:border-orange-500/20",
  ];
  let hash = 0;
  for (let i = 0; i < taskTitle.length; i++) {
    hash = taskTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

export function ActivityLogItem({
  log,
  showUser = false,
  showActions = false,
  compact = false,
  onEdit,
  onDelete,
  onSelect
}: ActivityLogItemProps) {
  const durationSeconds = getLogDurationSeconds(log);
  const durationFormatted = formatDuration(durationSeconds);

  const formattedTimeRange = `${new Date(log.start_time).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} - ${new Date(log.end_time).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;

  const imageList = (log.evidence || [])
    .filter((e) => e.mime_type ? e.mime_type.startsWith("image/") : isImageUrl(e.file_url))
    .map((e) => e.file_url);

  return (
    <div 
      onClick={() => onSelect?.(log)}
      className="relative pl-12 group animate-in fade-in duration-300"
    >
      {/* Timeline Dot */}
      <div className="absolute left-[13px] top-4 h-3.5 w-3.5 rounded-full border-2 border-outline-variant bg-surface group-hover:border-primary transition-colors flex items-center justify-center">
        <div className="h-1 w-1 rounded-full bg-outline group-hover:bg-primary transition-colors" />
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline hover:shadow-sm transition-all space-y-3.5 cursor-pointer">
        
        {/* Header (User profile details or compact time display) */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {showUser && log.userName ? (
            <div className="flex items-center gap-2.5">
              {log.userImage ? (
                <img src={log.userImage} alt={log.userName} className="h-7 w-7 rounded-full border border-outline-variant" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-outline-variant">
                  {log.userName.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface">{log.userName}</span>
                  {log.userRole && (
                    <span className={`text-[8px] uppercase px-1 py-0.2 rounded font-black ${
                      log.userRole === "leader" ? "bg-tertiary-container text-on-tertiary-container" : "bg-secondary-container text-on-secondary-container"
                    }`}>
                      {log.userRole}
                    </span>
                  )}
                </div>
                {log.userEmail && <span className="text-[9px] text-outline block leading-none mt-0.5">{log.userEmail}</span>}
              </div>
            </div>
          ) : (
            // If user details are not shown, show the compact time range in header
            <div className="flex items-center gap-1.5 text-body-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-mono-timer text-on-surface-variant text-[12px] tracking-tight">
                {formattedTimeRange}
              </span>
            </div>
          )}

          {/* Top Right Info: Duration Badge & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-surface-container-highest border border-outline-variant/60 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
              <Clock className="h-3 w-3" />
              <span className="font-mono-timer">{durationFormatted}</span>
            </div>

            {showActions && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(log);
                    }}
                    className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors"
                    title="Edit Log"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(log.id);
                    }}
                    className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-error transition-colors"
                    title="Delete Log"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title and descriptions */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
              {log.title || "Untitled Activity"}
            </h4>
            {log.projectName ? (
              <span className={`px-2 py-0.5 text-[9px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(log.projectName)}`}>
                {log.projectName}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-750 dark:text-zinc-400 border border-zinc-500/20 text-[9px] rounded font-bold uppercase tracking-wider">
                Unassigned
              </span>
            )}
          </div>
          {log.description && (
            <div className="text-xs text-on-surface-variant leading-relaxed">
              {renderMarkdown(log.description)}
            </div>
          )}
        </div>

        {/* Associated Tasks */}
        {log.tasks && log.tasks.length > 0 && (
          <div className="space-y-1 pt-0.5">
            <span className="text-[8px] font-extrabold uppercase text-outline tracking-wider block">Linked Tasks</span>
            <div className="flex flex-wrap gap-1">
              {log.tasks.map((task) => (
                <span 
                  key={task.id}
                  className={`px-2 py-0.5 text-[9px] rounded border font-semibold ${getTaskColorBadge(task.title)}`}
                >
                  #{task.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clock In / Out Displays (Full details shown only when NOT compact) */}
        {!compact && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/20">
            <div className="bg-surface-container-lowest/50 border border-outline-variant/40 rounded-lg p-2.5">
              <span className="uppercase block text-[7px] tracking-wider mb-0.5 text-outline font-bold">Clock In</span>
              <span className="font-mono-timer text-sm font-extrabold text-on-surface tracking-tight block">
                {new Date(log.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[9px] text-outline block mt-0.5">
                {new Date(log.start_time).toLocaleDateString()}
              </span>
            </div>

            <div className="bg-surface-container-lowest/50 border border-outline-variant/40 rounded-lg p-2.5">
              <span className="uppercase block text-[7px] tracking-wider mb-0.5 text-outline font-bold">Clock Out</span>
              <span className="font-mono-timer text-sm font-extrabold text-on-surface tracking-tight block">
                {new Date(log.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[9px] text-outline block mt-0.5">
                {new Date(log.end_time).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Evidence capture proofs */}
        {log.evidence && log.evidence.length > 0 && (
          <div className={`space-y-1.5 pt-2 border-t border-outline-variant/20`}>
            <span className="text-[8px] font-bold uppercase text-outline tracking-wider block">Attached Proofs ({log.evidence.length})</span>
            <div className="flex flex-wrap gap-2">
              {log.evidence.map((ev) => {
                const isImg = ev.mime_type ? ev.mime_type.startsWith("image/") : isImageUrl(ev.file_url);
                const sizeClass = compact ? "h-8 w-12" : "h-11 w-18";
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isImg) {
                        const imgIdx = imageList.indexOf(ev.file_url);
                        useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                      } else {
                        window.open(ev.file_url, "_blank");
                      }
                    }}
                    className={`relative ${sizeClass} border border-outline-variant rounded overflow-hidden hover:scale-105 active:scale-95 transition-all block shadow-sm group/ev cursor-pointer text-left focus:outline-none`}
                  >
                    {isImg ? (
                      <img src={ev.file_url} alt={ev.file_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-surface-container-high/40 text-[6px] text-center p-0.5 text-on-surface">
                        <FileText className="h-3 w-3 text-primary mb-0.5" />
                        <span className="truncate w-full font-bold px-0.5">{ev.file_name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center transition-all">
                      <ExternalLink className="h-3 w-3 text-white" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
