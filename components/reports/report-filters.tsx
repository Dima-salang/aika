"use client";

import React, { useEffect } from "react";

interface ReportFiltersProps {
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  teamFilter: string;
  setTeamFilter: (team: string) => void;
  userTeams: any[] | undefined;
  showTeamSelect: boolean;
  groupBy: "day" | "week" | "month" | "year";
  setGroupBy: (val: "day" | "week" | "month" | "year") => void;
}

export function ReportFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  teamFilter,
  setTeamFilter,
  userTeams,
  showTeamSelect,
  groupBy,
  setGroupBy,
}: ReportFiltersProps) {
  // Preset handler
  const applyPreset = (preset: "this-week" | "last-week" | "this-month" | "last-month" | "this-year" | "all-time") => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "this-week": {
        const day = today.getDay();
        const diff = today.getDate() - (day === 0 ? 6 : day - 1); // Monday
        start = new Date(today.setDate(diff));
        end = new Date();
        break;
      }
      case "last-week": {
        const day = today.getDay();
        const mondayDiff = today.getDate() - (day === 0 ? 6 : day - 1) - 7;
        start = new Date(today.setDate(mondayDiff));
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case "this-month": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      }
      case "last-month": {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      case "this-year": {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date();
        break;
      }
      case "all-time": {
        start = new Date("2020-01-01");
        end = new Date();
        break;
      }
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Set default range to "This Month" on mount if empty
  useEffect(() => {
    if (!startDate && !endDate) {
      applyPreset("this-month");
    }
  }, []);

  return (
    <div className="glass-card rounded-xl p-4 bg-surface-container-low text-on-surface border border-outline-variant space-y-4 shadow-sm select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Preset Pickers */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "This Week", value: "this-week" },
            { label: "Last Week", value: "last-week" },
            { label: "This Month", value: "this-month" },
            { label: "Last Month", value: "last-month" },
            { label: "This Year", value: "this-year" },
            { label: "All Time", value: "all-time" },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => applyPreset(preset.value as any)}
              className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Workspace Team Filters */}
        {showTeamSelect && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Scope:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold p-1.5 pr-6 text-on-surface focus:outline-none focus:border-primary cursor-pointer active:scale-95"
            >
              <option value="all">All Teams (Personal)</option>
              <option value="null">Personal View Only</option>
              {userTeams &&
                userTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
        {/* Manual Date Input Range */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0">Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-lg p-1.5 text-on-surface focus:outline-none focus:border-primary font-mono-timer text-xs cursor-pointer hover:bg-surface-container-high transition-colors"
          />
          <span className="text-outline/60 font-normal">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-lg p-1.5 text-on-surface focus:outline-none focus:border-primary font-mono-timer text-xs cursor-pointer hover:bg-surface-container-high transition-colors"
          />
        </div>

        {/* Aggregation Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0">Group By:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold p-1.5 pr-6 text-on-surface focus:outline-none focus:border-primary cursor-pointer active:scale-95"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
    </div>
  );
}
