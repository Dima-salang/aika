"use client";

import React from "react";
import { Clock, Loader2 } from "lucide-react";

interface TeamTimelineFeedProps {
  timeline: any[];
  timelineLoading: boolean;
}

export function TeamTimelineFeed({ timeline, timelineLoading }: TeamTimelineFeedProps) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 shadow-sm space-y-6">
      <h3 className="text-sm font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        <Clock className="h-4 w-4 text-primary" /> Team Member Clocking Activity
      </h3>

      {timelineLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : timeline && timeline.length > 0 ? (
        <div className="relative pl-6 border-l border-outline-variant/60 space-y-6 py-2 ml-3">
          {timeline.map((log: any) => {
            const durationMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
            const durationHrs = (durationMs / 3600000).toFixed(2);
            
            return (
              <div key={log.id} className="relative group animate-in fade-in duration-300">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-outline-variant bg-surface group-hover:border-primary transition-colors flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-outline group-hover:bg-primary transition-colors" />
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 hover:border-outline transition-all space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      {log.userImage ? (
                        <img src={log.userImage} alt={log.userName} className="h-7 w-7 rounded-full" />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {log.userName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-extrabold text-on-surface">{log.userName}</span>
                        <span className="text-[10px] text-outline ml-2 font-medium">({log.userEmail})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/40 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {durationHrs} hrs logged
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-on-surface">{log.title || "Untitled Activity"}</h6>
                    <p className="text-xs text-on-surface-variant whitespace-pre-wrap">{log.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-[10px] text-outline font-semibold border-t border-outline-variant/20">
                    <div>
                      <span className="uppercase block text-[8px] tracking-wider mb-0.5 text-outline">Clock In</span>
                      <span className="font-mono-timer text-on-surface-variant">
                        {new Date(log.start_time).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="uppercase block text-[8px] tracking-wider mb-0.5 text-outline">Clock Out</span>
                      <span className="font-mono-timer text-on-surface-variant">
                        {new Date(log.end_time).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Proofs */}
                  {log.evidence && log.evidence.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold uppercase text-outline tracking-wider block">Attached Proofs ({log.evidence.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {log.evidence.map((ev: any) => (
                          <a
                            key={ev.id}
                            href={ev.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="relative h-12 w-12 border border-outline-variant rounded overflow-hidden hover:scale-105 active:scale-95 transition-all block shadow-sm group/ev"
                          >
                            <img src={ev.file_url} alt={ev.file_name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center transition-all">
                              <span className="material-symbols-outlined text-white text-[14px]">open_in_new</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-outline-variant rounded-xl">
          <p className="text-outline text-xs font-semibold">No activity logs recorded for this team yet.</p>
        </div>
      )}
    </div>
  );
}
