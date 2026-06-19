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
  memberFilter?: string;
  setMemberFilter?: (member: string) => void;
  members?: { userId: string; userName: string }[];
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
  memberFilter,
  setMemberFilter,
  members,
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
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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
              className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors active:scale-95 flex-1 sm:flex-none text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Workspace Team Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {showTeamSelect && (
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 min-w-[120px]">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Scope:</span>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold p-1.5 pr-6 text-on-surface focus:outline-none focus:border-primary cursor-pointer active:scale-95 w-full"
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

          {/* Member Filter */}
          {members && setMemberFilter && (
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0 min-w-[120px]">
              <span className="text-[11px] font-bold text-outline uppercase tracking-wider">Member:</span>
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold p-1.5 pr-6 text-on-surface focus:outline-none focus:border-primary cursor-pointer active:scale-95 w-full"
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
        {/* Manual Date Input Range */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0">Range:</span>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg p-1.5 text-on-surface focus:outline-none focus:border-primary font-mono-timer text-xs cursor-pointer hover:bg-surface-container-high transition-colors flex-1 sm:flex-initial"
            />
            <span className="text-outline/60 font-normal shrink-0">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg p-1.5 text-on-surface focus:outline-none focus:border-primary font-mono-timer text-xs cursor-pointer hover:bg-surface-container-high transition-colors flex-1 sm:flex-initial"
            />
          </div>
        </div>

        {/* Aggregation Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-outline uppercase tracking-wider shrink-0">Group By:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold p-1.5 pr-6 text-on-surface focus:outline-none focus:border-primary cursor-pointer active:scale-95 w-full sm:w-auto"
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
