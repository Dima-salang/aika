"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

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
  const { weeklyHours, totalLoggedHours } = useMemo(() => {
    // Generate the exact date strings for this week to quickly filter metrics
    const targetDates = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      return d.toDateString();
    });

    // Reduce logs safely in one pass
    const hoursByDate: Record<string, number> = {};
    logs.forEach((log) => {
      const startTime = log.start_time || log.startTime;
      const endTime = log.end_time || log.endTime;
      if (!startTime || !endTime) return;
      const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
      if (diff > 0) {
        const dateStr = new Date(startTime).toDateString();
        hoursByDate[dateStr] = (hoursByDate[dateStr] || 0) + diff / 3600000;
      }
    });

    const hoursArray = targetDates.map((dateString) => hoursByDate[dateString] || 0);
    const total = hoursArray.reduce((acc, hrs) => acc + hrs, 0);

    return { weeklyHours: hoursArray, totalLoggedHours: total };
  }, [logs, startOfWeek]);

  const chartData = useMemo(() => {
    return daysOfWeek.map((day, idx) => ({
      name: day,
      hours: Number(weeklyHours[idx].toFixed(1)),
    }));
  }, [weeklyHours, daysOfWeek]);

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
      
      {/* Recharts Bar Chart Container */}
      <div className="h-20 w-full select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="currentColor"
              className="text-outline/60"
              fontSize={9}
              fontWeight="medium"
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <Tooltip
              cursor={{ fill: "rgba(192, 193, 255, 0.05)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded shadow-xl text-[10px] text-on-surface font-mono-timer font-medium">
                      {payload[0].value} hrs
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="hours"
              fill="var(--color-primary, #6366f1)"
              radius={[2, 2, 0, 0]}
              // ponytail: baseline visual indicator for 0 hour days
              minPointSize={3}
            />
          </BarChart>
        </ResponsiveContainer>
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