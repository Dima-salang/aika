"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { FileText, ExternalLink, ArrowLeft, ShieldAlert } from "lucide-react";
import { renderMarkdown } from "@/utils/markdown";
import { isImageUrl } from "@/utils/file";
import { useImageViewer } from "@/utils/image-viewer-store";
import { ImageViewer } from "@/components/ui-components/image-viewer";
import { getProjectColorBadge, getTaskColorBadge } from "@/components/timer/time-log-card";
import { getLogDurationSeconds } from "@/utils/time";

export default function SharedLogPage() {
  const params = useParams();
  const router = useRouter();
  const logId = params?.id as string;

  const { data: log, isLoading, error } = trpc.getLog.useQuery(
    { id: logId },
    { enabled: !!logId, retry: false }
  );

  // Fetch tasks and projects to display friendly names
  const { data: projects } = trpc.getProjects.useQuery(
    { organizationId: log?.organization_id || "org-default" },
    { enabled: !!log }
  );

  const { data: tasks } = trpc.getTasks.useQuery(
    { userId: log?.user_id || "" },
    { enabled: !!log }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-surface-container-lowest">
        <div className="max-w-xl w-full space-y-6 animate-pulse">
          <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="glass-card rounded-2xl p-8 space-y-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-3 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              </div>
            </div>
            <div className="h-7 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-surface-container-lowest text-on-surface">
        <div className="max-w-md w-full text-center space-y-6 glass-card p-8 rounded-2xl border border-outline-variant shadow-xl">
          <div className="h-14 w-14 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-on-surface">Private Log or Expired Link</h1>
            <p className="text-sm text-outline leading-relaxed">
              This log details sheet is private or does not exist. Share links must be explicitly enabled by the log owner.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:opacity-90 text-on-primary text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const projectObj = projects?.find((p) => p.id === log.project_id);
  const imageList = (log.evidence || [])
    .filter((e: any) => e.mime_type?.startsWith("image/") || isImageUrl(e.file_url))
    .map((e: any) => e.file_url);

  return (
    <div className="min-h-screen w-full bg-surface-container-lowest text-on-surface flex flex-col items-center justify-between p-4 md:p-8 font-sans">
      <div className="max-w-2xl w-full space-y-6">

        {/* Navigation / Header */}
        <div className="flex items-center justify-between select-none">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-bold rounded-lg border border-outline-variant/60 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <span className="text-[10px] text-outline font-bold uppercase tracking-wider">
            Shared Log
          </span>
        </div>

        {/* Main Card Sheet */}
        <div className="glass-card rounded-2xl border border-outline-variant/65 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">

          {/* Top Info Badges */}
          <div className="flex items-center justify-between gap-4 flex-wrap select-none">
            {projectObj ? (
              <span className={`px-2.5 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(projectObj.name)}`}>
                {projectObj.name}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[10px] rounded font-bold uppercase tracking-wider">
                No Project
              </span>
            )}
            <span className="text-[10px] text-outline uppercase font-mono-timer tracking-wider">
              Log #{log.id.slice(0, 8)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface leading-tight">
            {log.title}
          </h1>

          {/* Time & Duration Details */}
          <div className="p-4 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-outline uppercase text-[10px] tracking-wider">Duration</span>
              <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded font-bold text-body-sm">
                {getLogDurationSeconds(log)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3 text-xs select-none">
              <div className="space-y-1">
                <span className="text-outline text-[10px] uppercase font-bold block">Start Time</span>
                <span className="font-mono-timer text-on-surface font-semibold">
                  {new Date(log.start_time).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-outline text-[10px] uppercase font-bold block">End Time</span>
                <span className="font-mono-timer text-on-surface font-semibold">
                  {new Date(log.end_time).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Work description */}
          {log.description && (
            <div className="space-y-2">
              <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Description</span>
              <div className="bg-surface-container-low/20 border border-outline-variant/30 p-4 rounded-xl text-body-sm text-on-surface leading-relaxed">
                {renderMarkdown(log.description)}
              </div>
            </div>
          )}

          {/* Linked Kanban tasks */}
          {log.tasks && log.tasks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Tasks</span>
              <div className="flex flex-col gap-2">
                {log.tasks.map((tId: string) => {
                  const taskObj = tasks?.find((t) => t.id === tId);
                  const taskTitle = taskObj?.title || `Task-${tId.slice(0, 4)}`;
                  return (
                    <div
                      key={tId}
                      className="flex items-center justify-between p-2 bg-surface-container-low/55 border border-outline-variant/50 rounded-lg text-xs font-semibold"
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

          {/* Attached proofs / files */}
          {log.evidence && log.evidence.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-outline font-extrabold uppercase tracking-wider block">Attached Documents ({log.evidence.length})</span>
              <div className="grid grid-cols-2 gap-4">
                {log.evidence.map((ev: any, idx: number) => {
                  const isImg = ev.mime_type?.startsWith("image/") || isImageUrl(ev.file_url);
                  return (
                    <div
                      key={idx}
                      className="group relative border border-outline-variant/80 rounded-xl overflow-hidden aspect-video shadow-md cursor-pointer bg-zinc-950 flex flex-col justify-center items-center"
                      onClick={() => {
                        if (isImg) {
                          const imgIdx = imageList.indexOf(ev.file_url);
                          useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                        } else {
                          window.open(ev.file_url, "_blank");
                        }
                      }}
                    >
                      {isImg ? (
                        <img
                          src={ev.file_url}
                          alt={ev.file_name}
                          className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-on-surface select-none">
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
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 text-center text-[10px] text-outline select-none">
        <p>Tracked and verified on <span className="font-bold text-on-surface">Aika Workspace</span></p>
      </footer>

      {/* Image Previews Overlay */}
      <ImageViewer />
    </div>
  );
}
