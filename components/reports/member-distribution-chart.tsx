"use client";

import React from "react";
import { MemberWorkloadItem } from "@/services/core/ReportService";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface MemberDistributionChartProps {
  workload: MemberWorkloadItem[];
}

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#ef4444", "#6366f1"];

export function MemberDistributionChart({ workload }: MemberDistributionChartProps) {
  // ponytail: filter out members with 0 hours
  const chartData = workload.filter((item) => item.totalHours > 0);
  const totalHours = chartData.reduce((acc, curr) => acc + curr.totalHours, 0);

  if (chartData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant flex flex-col items-center justify-center text-center h-[280px]">
        <span className="material-symbols-outlined text-outline text-[40px] mb-2">group_off</span>
        <h4 className="text-body-md font-extrabold">No Member Data</h4>
        <p className="text-body-sm text-outline mt-1">There are no hours logged by members for this range.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant flex flex-col justify-between h-[280px] shadow-sm select-none">
      <div className="mb-2">
        <h4 className="text-[10px] uppercase font-bold text-outline tracking-wider">
          Member Time Distribution
        </h4>
        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Contribution by team members</p>
      </div>

      <div className="h-24 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="totalHours"
              nameKey="userName"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={42}
              paddingAngle={2}
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--bg-surface, #fff)" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const pct = totalHours > 0 ? (data.totalHours / totalHours) * 100 : 0;
                  return (
                    <div className="bg-surface-container-high border border-outline-variant px-2.5 py-1.5 rounded-xl shadow-xl text-xs font-bold text-on-surface">
                      <p>{data.userName}</p>
                      <p className="text-primary mt-0.5">{data.totalHours.toFixed(2)} hrs ({pct.toFixed(0)}%)</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
        {chartData.map((member, idx) => {
          const color = COLORS[idx % COLORS.length];
          const pct = totalHours > 0 ? (member.totalHours / totalHours) * 100 : 0;
          return (
            <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
                  {member.userName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono-timer font-bold text-on-surface">{member.totalHours.toFixed(2)}h</span>
                <span className="text-outline/60 text-[9px] font-normal font-mono-timer">({pct.toFixed(0)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
