import React from "react";

interface WeeklyOverviewProps {
  daysOfWeek: string[];
  weeklyHours: number[];
  maxWeeklyHours: number;
}

export function WeeklyOverview({ daysOfWeek, weeklyHours, maxWeeklyHours }: WeeklyOverviewProps) {
  return (
    <div className="col-span-12 lg:col-span-8 bg-surface-container-low border border-outline-variant p-unit-4 rounded-lg flex flex-col justify-between">
      <div className="flex justify-between items-center mb-unit-4">
        <span className="font-label-md text-label-md text-on-surface">Weekly Overview</span>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase">Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-outline-variant"></span>
            <span className="font-label-md text-[10px] text-on-surface-variant uppercase">Admin</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-between gap-unit-4 pt-unit-4 min-h-[140px] select-none">
        {daysOfWeek.map((day, idx) => {
          const hours = weeklyHours[idx];
          const pct = (hours / maxWeeklyHours) * 100;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-2 group/col relative">
              <div className="absolute bottom-full mb-1 opacity-0 pointer-events-none group-hover/col:opacity-100 transition-opacity bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded text-[10px] text-on-surface whitespace-nowrap font-mono-timer z-10">
                {hours.toFixed(1)} hrs
              </div>
              <div className="w-full bg-surface-container-high/40 rounded-t-sm relative h-28 flex items-end border border-outline-variant/15 overflow-hidden cursor-pointer">
                <div
                  style={{ height: `${Math.max(pct, 4)}%` }}
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    hours > 0 ? "bg-primary" : "bg-outline-variant/35"
                  }`}
                />
              </div>
              <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
