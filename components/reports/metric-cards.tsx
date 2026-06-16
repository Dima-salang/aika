"use client";

import React from "react";
import { ReportSummaryKPIs } from "@/services/ReportService";

interface MetricCardsProps {
  kpis: ReportSummaryKPIs;
}

export function MetricCards({ kpis }: MetricCardsProps) {
  const cards = [
    {
      label: "Total Tracked Time",
      value: `${kpis.totalHours.toFixed(2)}h`,
      icon: "schedule",
      description: "Total hours logged in range",
      color: "text-primary bg-primary/10",
    },
    {
      label: "Total Sessions",
      value: kpis.totalSessions,
      icon: "tag",
      description: "Count of tracked sessions",
      color: "text-secondary bg-secondary/10",
    },
    {
      label: "Avg Session Duration",
      value: `${kpis.averageSessionHours.toFixed(2)}h`,
      icon: "avg_time",
      description: "Average hours per session",
      color: "text-tertiary bg-tertiary/10",
    },
    {
      label: "Active Projects",
      value: kpis.activeProjects,
      icon: "folder",
      description: "Unique projects worked on",
      color: "text-success bg-green-500/10 dark:bg-green-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-card rounded-xl p-4 bg-surface-container-low text-on-surface border border-outline-variant flex items-center justify-between shadow-sm transition-all hover:scale-[1.01]"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">
              {card.label}
            </span>
            <div className="text-3xl font-black tracking-tight text-on-surface">
              {card.value}
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium block">
              {card.description}
            </span>
          </div>

          <div className={`p-3 rounded-xl ${card.color} flex items-center justify-center`}>
            <span className="material-symbols-outlined text-[24px]">
              {card.icon === "avg_time" ? "query_builder" : card.icon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
