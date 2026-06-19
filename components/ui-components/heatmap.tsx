"use client";

import React, { useMemo } from "react";

interface HeatmapProps {
  logs: any[];
  className?: string;
  weeksToShow?: number;
}

export function Heatmap({ logs, className = "max-w-xl", weeksToShow = 12 }: HeatmapProps) {
  // Compute the full calendar layout alignment
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();

    // GitHub grids align rows strictly to weekdays. 
    // Let's find the Saturday ending our current week to map backward cleanly.
    const currentDayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat
    const daysUntilSaturday = 6 - currentDayOfWeek;

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilSaturday);

    const totalDays = weeksToShow * 7;
    const daysList: Date[] = [];

    // Build the sequential list backwards so the bottom right square is Saturday
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      daysList.push(d);
    }

    // Chunk into weeks of 7 items each
    const structuredWeeks: Date[][] = [];
    for (let w = 0; w < weeksToShow; w++) {
      structuredWeeks.push(daysList.slice(w * 7, (w + 1) * 7));
    }

    // Build unique monthly labels positioned above their tracking point
    const labels: { text: string; colSpan: number }[] = [];
    let currentMonth = -1;
    let accumulatedCols = 0;

    structuredWeeks.forEach((week) => {
      // Look at the middle day of the week to tag its primary month location
      const midWeekMonth = week[3].getMonth();
      if (midWeekMonth !== currentMonth) {
        if (accumulatedCols > 0) {
          labels[labels.length - 1].colSpan = accumulatedCols;
        }
        const monthName = week[3].toLocaleDateString(undefined, { month: "short" });
        labels.push({ text: monthName, colSpan: 1 });
        currentMonth = midWeekMonth;
        accumulatedCols = 1;
      } else {
        accumulatedCols++;
      }
    });
    if (labels.length > 0) {
      labels[labels.length - 1].colSpan = accumulatedCols;
    }

    return { grid: structuredWeeks, monthLabels: labels };
  }, [weeksToShow]);

  // Fast hash-map to quickly query logs per date without O(N^2) filtering overhead inside loops
  const durationMap = useMemo(() => {
    const map: Record<string, number> = {};

    logs.forEach((log) => {
      const startTime = log.start_time || log.startTime;
      const endTime = log.end_time || log.endTime;
      if (!startTime || !endTime) return;
      const dateStr = new Date(startTime).toDateString();
      const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
      const hours = diff > 0 ? diff / 3600000 : 0;

      map[dateStr] = (map[dateStr] || 0) + hours;
    });

    return map;
  }, [logs]);

  const getColorClass = (hours: number) => {
    if (hours === 0) return "bg-surface-container-high border border-outline-variant/30";
    if (hours < 1) return "bg-primary/25 border border-primary/20";
    if (hours < 3) return "bg-primary/50 border border-primary/40";
    if (hours < 6) return "bg-primary/75 border border-primary/65";
    return "bg-primary text-on-primary";
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={`glass-card rounded-xl p-unit-4 flex flex-col justify-between min-h-[190px] w-full ${className}`}>
      {/* Top Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-label-md text-[10px] uppercase text-outline tracking-wider block">
          Activity Heatmap
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-outline">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-surface-container-high border border-outline-variant/30"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/25"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/50"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/75"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-primary"></div>
          <span>More</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar -mx-4 px-4 sm:-mx-0 sm:px-0">
        <div className="flex flex-col flex-1 justify-center min-w-[760px] pb-2">
          {/* Month Headings Row */}
          <div className="flex pl-7 w-full text-[10px] text-outline select-none mb-1">
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                style={{ width: `${(label.colSpan / weeksToShow) * 100}%` }}
                className="truncate"
              >
                {label.text}
              </div>
            ))}
          </div>

          {/* Grid Setup */}
          <div className="flex gap-2 items-start w-full">
            {/* Day of week side column labels (Alternating like GitHub) */}
            <div className="grid grid-rows-7 gap-1 text-[9px] text-outline pr-1 select-none h-[91px] leading-[10px] pt-[2px]">
              {dayLabels.map((dayName, idx) => (
                <span key={idx} className={idx % 2 === 1 ? "block" : "invisible"}>
                  {dayName}
                </span>
              ))}
            </div>

            {/* Grid Columns container */}
            <div className="flex gap-1 justify-between items-center w-full">
              {grid.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-rows-7 gap-1">
                  {week.map((day, dayIdx) => {
                    const hours = durationMap[day.toDateString()] || 0;
                    const colorClass = getColorClass(hours);

                    return (
                      <div
                        key={dayIdx}
                        className={`w-[10px] h-[10px] rounded-[2px] transition-all duration-200 hover:ring-1 hover:ring-primary cursor-pointer ${colorClass}`}
                        title={`${day.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}: ${hours.toFixed(1)} hrs logged`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}