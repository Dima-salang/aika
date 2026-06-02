"use client";

import React from "react";
import { Edit2, Trash2, Clock, Tag, ExternalLink } from "lucide-react";

interface TimeLogCardProps {
  log: any;
  project: any;
  tasks: any[];
  onEdit: (log: any) => void;
  onDelete: (logId: string) => void;
}

export function TimeLogCard({
  log,
  project,
  tasks,
  onEdit,
  onDelete,
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
    <div className="glass-card rounded-xl p-unit-4 flex flex-col justify-between hover:border-primary/60 transition-all group relative">
      <div className="flex items-start justify-between gap-2 mb-unit-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono-timer text-body-sm text-outline tracking-tight font-medium">
            {formattedTimeRange}
          </span>
          <span className="font-label-md text-on-surface-variant font-bold text-[13px]">
            {getFriendlyDuration(log.start_time, log.end_time)}
          </span>
        </div>
        {project && (
          <span className="px-1.5 py-0.5 bg-secondary-container/30 text-secondary text-[10px] rounded border border-secondary/20 font-bold uppercase tracking-wider">
            {project.name}
          </span>
        )}
      </div>

      <div className="flex-1 mb-unit-3">
        <span className="font-body-md text-on-surface font-semibold block mb-1">
          {log.title}
        </span>
        {log.description && (
          <p className="text-body-sm text-outline group-hover:text-on-surface-variant transition-colors mb-2">
            {log.description}
          </p>
        )}

        {log.tasks && log.tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {log.tasks.map((tId: string) => {
              const taskObj = tasks?.find((t: any) => t.id === tId);
              return (
                <span
                  key={tId}
                  className="px-1.5 py-0.2 bg-surface-container-highest text-outline text-[10px] rounded border border-outline-variant font-medium"
                >
                  #{taskObj?.title || `Task-${tId.slice(0, 4)}`}
                </span>
              );
            })}
          </div>
        )}

        {log.evidence && log.evidence.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {log.evidence.map((ev: any, idx: number) => (
              <div
                key={idx}
                className="h-6 flex items-center gap-1.5 px-2 bg-surface-container-lowest/80 border border-outline-variant rounded hover:border-primary transition-colors cursor-pointer text-[10px] text-outline hover:text-on-surface"
                onClick={() => window.open(ev.file_url, "_blank")}
                title={`View Proof: ${ev.file_name}`}
              >
                <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate max-w-[120px] font-mono-timer">{ev.file_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-outline-variant/60 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(log)}
          className="material-symbols-outlined text-[18px] text-outline hover:text-primary transition-colors p-1 hover:bg-surface-container-high rounded"
          title="Edit Log"
        >
          edit
        </button>
        <button
          onClick={() => onDelete(log.id)}
          className="material-symbols-outlined text-[18px] text-outline hover:text-error transition-colors p-1 hover:bg-surface-container-high rounded"
          title="Delete Log"
        >
          delete
        </button>
      </div>
    </div>
  );
}
