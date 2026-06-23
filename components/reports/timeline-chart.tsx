"use client";

import React, { useMemo, useState } from "react";
import { DetailedReportLog } from "@/services/core/ReportService";
import { calculateDurationHours } from "@/utils/time";

interface TimelineChartProps {
  logs: DetailedReportLog[];
  startDate: string;
  endDate: string;
  isTeam: boolean;
  onLogClick: (log: DetailedReportLog) => void;
}

export function TimelineChart({ logs, startDate, endDate, isTeam, onLogClick }: TimelineChartProps) {
  // Get date range array
  const dateRange = useMemo(() => {
    if (logs.length === 0) return [];
    
    // Find min/max from logs if not provided
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    
    if (!start || !end) {
      const times = logs.map((l) => new Date(l.startTime).getTime());
      if (!start) start = new Date(Math.min(...times));
      if (!end) end = new Date(Math.max(...times));
    }
    
    // Normalize to midnight UTC
    const datesList: { key: string; label: string }[] = [];
    const curr = new Date(start);
    curr.setUTCHours(0, 0, 0, 0);
    const limit = new Date(end);
    limit.setUTCHours(23, 59, 59, 999);
    
    // Limit to max 90 days to prevent rendering overflow
    let count = 0;
    while (curr <= limit && count < 90) {
      const key = curr.toISOString().split("T")[0];
      datesList.push({
        key,
        label: curr.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
      });
      curr.setUTCDate(curr.getUTCDate() + 1);
      count++;
    }
    return datesList;
  }, [logs, startDate, endDate]);

  // Group logs by lane (Member name or Project name)
  const lanes = useMemo(() => {
    const laneMap = new Map<string, DetailedReportLog[]>();
    
    logs.forEach((log) => {
      const key = isTeam ? log.userName : (log.projectName || "No Project");
      const current = laneMap.get(key) || [];
      current.push(log);
      laneMap.set(key, current);
    });
    
    return Array.from(laneMap.entries()).map(([laneName, laneLogs]) => {
      // Map logs to days for quick lookup
      const dayLogsMap = new Map<string, DetailedReportLog[]>();
      laneLogs.forEach((log) => {
        const dayKey = new Date(log.startTime).toISOString().split("T")[0];
        const dayList = dayLogsMap.get(dayKey) || [];
        dayList.push(log);
        dayLogsMap.set(dayKey, dayList);
      });
      
      return {
        name: laneName,
        dayLogsMap,
      };
    });
  }, [logs, isTeam]);

  if (logs.length === 0 || dateRange.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant flex flex-col items-center justify-center text-center h-[200px]">
        <span className="material-symbols-outlined text-outline text-[40px] mb-2">timeline</span>
        <h4 className="text-body-md font-extrabold">No Timeline Data</h4>
        <p className="text-body-sm text-outline mt-1 font-medium">Add time logs to see them on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl bg-surface-container-low text-on-surface border border-outline-variant overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 border-b border-outline-variant/60">
        <h4 className="text-[10px] uppercase font-bold text-outline tracking-wider">
          {isTeam ? "Team Timeline View" : "Personal Activity Timeline"}
        </h4>
        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
          {isTeam ? "Visual work distribution across members" : "Your time allocation across projects"}
        </p>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-full w-max">
          {/* Header Row: Dates */}
          <div className="flex border-b border-outline-variant/60 bg-surface-container/40 pt-24">
            <div className="w-48 shrink-0 p-3 text-[10px] font-bold text-outline uppercase tracking-wider border-r border-outline-variant/40 flex items-end sticky left-0 z-10 bg-surface-container/95 backdrop-blur-sm">
              {isTeam ? "Team Member" : "Project"}
            </div>
            <div className="flex-grow flex divide-x divide-outline-variant/30 items-end">
              {dateRange.map((date) => (
                <div key={date.key} className="flex-1 min-w-[60px] text-center p-2 text-[9px] font-bold text-on-surface-variant font-mono-timer">
                  {date.label}
                </div>
              ))}
            </div>
          </div>

          {/* Lane Rows */}
          <div className="divide-y divide-outline-variant/40">
            {lanes.map((lane, index) => (
              <div key={index} className="flex hover:bg-surface-container/10 transition-colors">
                {/* Lane Name */}
                <div className="w-48 shrink-0 p-3 text-xs font-bold text-on-surface border-r border-outline-variant/40 truncate flex items-center bg-surface-container-low sticky left-0 z-10">
                  {lane.name}
                </div>
                
                {/* Lane Days */}
                <div className="flex-grow flex divide-x divide-outline-variant/30 relative items-stretch min-h-[72px]">
                  {dateRange.map((date) => {
                    const dayLogs = lane.dayLogsMap.get(date.key) || [];
                    const totalDayHours = dayLogs.reduce((acc, curr) => acc + calculateDurationHours(curr.duration), 0);
                    
                    return (
                      <div key={date.key} className="flex-1 min-w-[60px] p-1 flex flex-col justify-center relative group">
                        {dayLogs.length > 0 ? (
                          <div className="bg-primary/10 border border-primary/20 rounded-md p-1 flex flex-col justify-center items-center h-full text-[9px] font-extrabold text-primary select-none cursor-pointer hover:bg-primary/20 hover:border-primary/40 transition-all">
                            <span className="font-mono-timer">{totalDayHours.toFixed(1)}h</span>
                            <span className="text-[7px] font-normal text-outline/80 leading-none mt-0.5">{dayLogs.length} log{dayLogs.length > 1 ? "s" : ""}</span>
                            
                            {/* Hover tooltip for log list of the day */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full pb-3 hidden group-hover:block z-20 pointer-events-auto text-[11px] text-on-surface w-60 text-left">
                              <div className="bg-surface-container-high border border-outline-variant rounded-xl p-3 shadow-xl">
                                <p className="font-bold border-b border-outline-variant/60 pb-1 mb-1">{date.label} - {lane.name}</p>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                  {dayLogs.map((log) => (
                                    <div 
                                      key={log.id} 
                                      className="border-l-2 border-primary pl-1.5 cursor-pointer hover:bg-surface-container/60 p-1.5 rounded transition-all active:scale-[0.98]"
                                      onClick={() => onLogClick(log)}
                                    >
                                      <p className="font-extrabold text-on-surface-variant line-clamp-1 hover:text-primary transition-colors">{log.title}</p>
                                      <p className="text-[9px] font-medium text-outline font-mono-timer">
                                        {calculateDurationHours(log.duration).toFixed(2)}h
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <span className="text-[9px] text-outline/20 font-mono-timer">-</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
