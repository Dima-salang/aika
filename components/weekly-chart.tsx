"use client";

import React, { useMemo } from "react";

interface WeeklyChartProps {
  logs: any[];
}

export function WeeklyChart({ logs }: WeeklyChartProps) {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyGoal = 40;

  // 1. Safe, non-mutating start-of-week calculation (Monday)
  const startOfWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    // Calculate distance back to Monday (if Sun = 0, go back 6 days)
    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
    
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // 2. High-performance lookup map + aggregated values calculation
  const { weeklyHours, totalLoggedHours, maxHours } = useMemo(() => {
    // Generate the exact date strings for this week to quickly filter metrics
    const targetDates = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      return d.toDateString();
    });

    // Reduce logs safely in one pass rather than iterative multi-filtering array sweeps
    const hoursByDate: Record<string, number> = {};
    logs.forEach((log) => {
      if (!log.start_time || !log.end_time) return;
      const dateStr = new Date(log.start_time).toDateString();
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      if (diff > 0) {
        hoursByDate[dateStr] = (hoursByDate[dateStr] || 0) + diff / 3600000;
      }
    });

    const hoursArray = targetDates.map((dateString) => hoursByDate[dateString] || 0);
    const total = hoursArray.reduce((acc, hrs) => acc + hrs, 0);
    const max = Math.max(...hoursArray, 8); // Scaled floor at 8h ceiling minimum

    return { weeklyHours: hoursArray, totalLoggedHours: total, maxHours: max };
  }, [logs, startOfWeek]);

  const goalPercentage = Math.min((totalLoggedHours / weeklyGoal) * 100, 100);

  return (
    <div className="glass-card rounded-xl p-unit-4 flex flex-col justify-between h-40 flex-1 min-w-[280px] group/chart">
      {/* Top Header Information Panel */}
      <div className="flex items-center justify-between mb-2 select-none">
        <span className="font-label-md text-[10px] uppercase text-outline tracking-wider block">
          Weekly Progress
        </span>
        <span className="font-mono-timer text-[11px] text-primary font-bold tracking-tight">
          {totalLoggedHours.toFixed(1)}h<span className="text-outline/50 font-normal mx-0.5">/</span>{weeklyGoal}h
        </span>
      </div>
      
      {/* Columns Alignment Grid */}
      <div className="flex items-end gap-2 h-20 w-full justify-between px-0.5 relative">
        {daysOfWeek.map((day, idx) => {
          const hours = weeklyHours[idx];
          const pct = (hours / maxHours) * 100;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group/col relative">
              
              {/* Sleek Custom Floating Tooltip (CSS Powered, Instant Trigger) */}
              <div className="absolute bottom-full mb-1.5 opacity-0 pointer-events-none translate-y-1 group-hover/col:opacity-100 group-hover/col:translate-y-0 transition-all duration-150 z-10 bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded shadow-xl text-[10px] text-on-surface whitespace-nowrap font-mono-timer font-medium">
                {hours.toFixed(1)} hrs
              </div>

              {/* Bar Wrapper Container */}
              <div className="w-full bg-surface-container-high/40 hover:bg-surface-container-high/70 rounded-t-sm relative h-full flex items-end overflow-hidden border border-outline-variant/20 transition-colors duration-200 cursor-pointer">
                <div
                  style={{ height: `${Math.max(pct, 4)}%` }} // 4% baseline so 0 hours shows a subtle indicators bar line
                  className={`w-full rounded-t-sm transition-all duration-500 ease-out origin-bottom ${
                    hours > 0 
                      ? "bg-primary group-hover/col:brightness-110 shadow-[0_0_12px_rgba(192,193,255,0.15)]" 
                      : "bg-outline-variant/30" // Clean inactive state styling indicator
                  }`}
                />
              </div>

              {/* Mon / Tue / Wed labels */}
              <span className="font-mono-timer text-[9px] font-medium text-outline uppercase tracking-wider transition-colors duration-200 group-hover/col:text-on-surface">
                {day}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Bottom Status Layout Bar */}
      <div className="flex justify-between items-center text-[11px] text-on-surface-variant font-medium mt-2 pt-1 border-t border-outline-variant/10 select-none">
        <span>Goal: {goalPercentage.toFixed(0)}% reached</span>
        <span className={totalLoggedHours >= weeklyGoal ? "text-primary font-semibold" : ""}>
          {totalLoggedHours >= weeklyGoal ? "Goal Achieved!" : `${(weeklyGoal - totalLoggedHours).toFixed(1)}h left`}
        </span>
      </div>
    </div>
  );
}