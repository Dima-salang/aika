"use client";

import React, { useMemo } from "react";
import { DashboardHeader } from "./dashboard/dashboard-header";
import { CurrentlyTracking } from "./dashboard/currently-tracking";
import { WeeklyOverview } from "./dashboard/weekly-overview";
import { RecentActivities } from "./dashboard/recent-activities";
import { ProjectBreakdown } from "./dashboard/project-breakdown";
import { InsightsCards } from "./dashboard/insights-cards";

interface DashboardViewProps {
  logs: any[];
  projects: any[];
  tasks: any[];
  runningTimer: any;
  handleStartTimer: () => void;
  handleStopTimer: (evidenceData: any) => Promise<void>;
  setIsDialogOpen: (isOpen: boolean) => void;
  timerSeconds: number;
  formatDuration: (seconds: number) => string;
  onSelectLog?: (log: any) => void;
  startPending?: boolean;
  stopPending?: boolean;
}

export function DashboardView({
  logs = [],
  projects = [],
  tasks = [],
  runningTimer,
  handleStartTimer,
  handleStopTimer,
  setIsDialogOpen,
  timerSeconds,
  formatDuration,
  onSelectLog,
  startPending = false,
  stopPending = false,
}: DashboardViewProps) {
  // 1. Current Date
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  // 2. Weekly calculations
  const startOfWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const thisWeekLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log.start_time) return false;
      return new Date(log.start_time).getTime() >= startOfWeek.getTime();
    });
  }, [logs, startOfWeek]);

  const thisWeekHours = useMemo(() => {
    const totalMs = thisWeekLogs.reduce((acc, log) => {
      if (!log.start_time || !log.end_time) return acc;
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    return (totalMs / 3600000).toFixed(1);
  }, [thisWeekLogs]);

  // 3. Weekly Overview Chart Data
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyHours = useMemo(() => {
    const targetDates = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      return d.toDateString();
    });

    const hoursByDate: Record<string, number> = {};
    logs.forEach((log) => {
      if (!log.start_time || !log.end_time) return;
      const dateStr = new Date(log.start_time).toDateString();
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      if (diff > 0) {
        hoursByDate[dateStr] = (hoursByDate[dateStr] || 0) + diff / 3600000;
      }
    });

    return targetDates.map((dateString) => hoursByDate[dateString] || 0);
  }, [logs, startOfWeek]);

  const maxWeeklyHours = useMemo(() => {
    const max = Math.max(...weeklyHours, 8);
    return max;
  }, [weeklyHours]);

  // 4. Project Breakdown calculations
  const projectBreakdown = useMemo(() => {
    const hoursByProject: Record<string, number> = {};
    let totalMs = 0;

    thisWeekLogs.forEach((log) => {
      if (!log.start_time || !log.end_time) return;
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      if (diff > 0) {
        totalMs += diff;
        const projId = log.project_id || "other";
        hoursByProject[projId] = (hoursByProject[projId] || 0) + diff;
      }
    });

    const breakdownList = Object.entries(hoursByProject).map(([projId, ms]) => {
      const projObj = projects.find((p) => p.id === projId);
      const hours = ms / 3600000;
      return {
        id: projId,
        name: projObj ? projObj.name : projId === "other" ? "Other Tasks" : "Unassigned",
        hours: hours.toFixed(1) + "h",
        rawHours: hours,
        percentage: totalMs > 0 ? (ms / totalMs) * 100 : 0,
      };
    });

    return breakdownList.sort((a, b) => b.rawHours - a.rawHours).slice(0, 4);
  }, [thisWeekLogs, projects]);

  // 5. Recent Activities
  const recentActivities = useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 5);
  }, [logs]);

  // 6. Project details for running timer
  const runningProject = useMemo(() => {
    if (!runningTimer?.project_id) return null;
    return projects.find((p) => p.id === runningTimer.project_id);
  }, [runningTimer, projects]);

  // 7. Dynamic Stats for Insights Row
  const streak = useMemo(() => {
    if (!logs || logs.length === 0) return 0;
    const uniqueDates = Array.from(
      new Set(logs.map((log) => new Date(log.start_time).toDateString()))
    )
      .map((d) => new Date(d).getTime())
      .sort((a, b) => b - a); // descending

    let currentStreak = 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTime = today.getTime();

    const hasLoggedRecently = uniqueDates.some((time) => {
      const diff = Math.abs(lastTime - time);
      return diff <= oneDay * 2; // Allow today or yesterday/day-before to continue streak
    });

    if (!hasLoggedRecently) return 0;

    let expectedTime = uniqueDates[0];
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0 || uniqueDates[i] === expectedTime - oneDay) {
        currentStreak++;
        expectedTime = uniqueDates[i];
      } else if (uniqueDates[i] === expectedTime) {
        // Same day
      } else {
        break;
      }
    }
    return currentStreak || 1;
  }, [logs]);

  const efficiency = useMemo(() => {
    const hours = parseFloat(thisWeekHours);
    if (hours === 0) return "+0.0%";
    const pct = Math.min((hours / 40) * 100, 100);
    return `+${pct.toFixed(1)}%`;
  }, [thisWeekHours]);

  const goalText = useMemo(() => {
    const hours = parseFloat(thisWeekHours);
    if (hours >= 40) return "Reached";
    return `${Math.min((hours / 40) * 100, 100).toFixed(0)}%`;
  }, [thisWeekHours]);

  return (
    <section className="flex-1 overflow-y-auto custom-scrollbar p-unit-6 max-w-container-max mx-auto w-full flex flex-col gap-unit-6 animate-in fade-in duration-300">
      
      {/* 1. Welcome Header (Modular & SSR friendly) */}
      <DashboardHeader formattedDate={formattedDate} thisWeekHours={thisWeekHours} />

      {/* 2. Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-unit-4">
        
        {/* Currently Tracking (Priority Card) */}
        <CurrentlyTracking
          runningTimer={runningTimer}
          runningProject={runningProject}
          timerSeconds={timerSeconds}
          formatDuration={formatDuration}
          handleStartTimer={handleStartTimer}
          setIsDialogOpen={setIsDialogOpen}
          startPending={startPending}
          stopPending={stopPending}
        />

        {/* Weekly Overview Chart */}
        <WeeklyOverview
          daysOfWeek={daysOfWeek}
          weeklyHours={weeklyHours}
          maxWeeklyHours={maxWeeklyHours}
        />

        {/* Recent Activities List */}
        <RecentActivities
          recentActivities={recentActivities}
          projects={projects}
          onSelectLog={onSelectLog}
        />

        {/* Project Breakdown */}
        <ProjectBreakdown
          projectBreakdown={projectBreakdown}
          thisWeekHours={thisWeekHours}
        />

      </div>

      {/* 3. Secondary Row - Insights */}
      <InsightsCards
        efficiency={efficiency}
        streak={streak}
        goalText={goalText}
      />

    </section>
  );
}
