"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "@/utils/trpc";
import { calculateDurationHours } from "@/utils/time";
import { ReportFilters } from "./report-filters";
import { MetricCards } from "./metric-cards";
import { ProjectDistributionChart } from "./project-distribution-chart";
import { MemberDistributionChart } from "./member-distribution-chart";
import { TimelineChart } from "./timeline-chart";
import { ReportsLogsTable } from "./reports-logs-table";
import { WorkloadTable } from "./workload-table";
import { DetailViewDialog } from "../timer/detail-view-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { Heatmap } from "@/components/ui-components/heatmap";
import { DetailedReportLog } from "@/services/core/ReportService";

interface ReportsViewProps {
  activeOrg: any;
  session: any;
}

export function ReportsView({ activeOrg, session }: ReportsViewProps) {
  const userId = session?.user?.id || "";
  const orgId = activeOrg?.id || "org-default";

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [teamReportId, setTeamReportId] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"personal" | "team">("personal");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "year">("day");
  const [memberFilter, setMemberFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<DetailedReportLog | null>(null);

  // Automatically update Group By scale when selected range changes
  React.useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 8) {
        setGroupBy("day");
      } else if (diffDays <= 62) {
        setGroupBy("week");
      } else if (diffDays <= 366) {
        setGroupBy("month");
      } else {
        setGroupBy("year");
      }
    }
  }, [startDate, endDate]);

  // Reset member filter when switching teams or view mode
  React.useEffect(() => {
    setMemberFilter("all");
  }, [teamReportId, activeSubTab]);

  // Fetch list of user's teams in active Org
  const { data: userTeams } = trpc.getUserTeams.useQuery(
    { userId, organizationId: orgId },
    { enabled: !!userId }
  );

  // Check if user has permission to view Team Reports (Leader, Org Admin/Owner, Global Admin)
  const isGlobalAdmin = session?.user?.is_admin === true;
  const isOrgAdmin = activeOrg?.role === "admin" || activeOrg?.role === "owner" || activeOrg?.role === "system_admin";
  const managedTeamIds = useMemo(() => {
    if (!userTeams) return new Set<string>();
    return new Set<string>(userTeams.map((t) => t.id));
  }, [userTeams]);

  // tRPC query to get managed profile (tells us managedOrgs and managedTeams where user is leader)
  const { data: managedProfile } = trpc.getMyManageProfile.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const isLeader = useMemo(() => {
    if (isGlobalAdmin || isOrgAdmin) return true;
    return (managedProfile?.managedTeams && managedProfile.managedTeams.length > 0) || false;
  }, [managedProfile, isGlobalAdmin, isOrgAdmin]);

  // Set default team for Team Report once loaded
  React.useEffect(() => {
    if (managedProfile?.managedTeams && managedProfile.managedTeams.length > 0 && !teamReportId) {
      setTeamReportId(managedProfile.managedTeams[0].id);
    } else if (userTeams && userTeams.length > 0 && !teamReportId) {
      setTeamReportId(userTeams[0].id);
    }
  }, [managedProfile, userTeams]);

  // Personal Report Query
  const { data: personalReport, isPending: personalPending } = trpc.getPersonalReport.useQuery(
    {
      userId,
      organizationId: orgId,
      teamIdFilter: teamFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: !!userId && activeSubTab === "personal" }
  );

  // Team Report Query
  const { data: teamReport, isPending: teamPending } = trpc.getTeamReport.useQuery(
    {
      requestingUserId: userId,
      organizationId: orgId,
      teamId: teamReportId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    { enabled: !!userId && activeSubTab === "team" && !!teamReportId }
  );

  const isLoading = activeSubTab === "personal" ? personalPending : teamPending;

  const activeReport = useMemo(() => {
    const report = activeSubTab === "personal" ? personalReport : teamReport;
    if (!report) return null;

    const mappedLogs = (report.logs || []).map((log: any) => ({
      ...log,
      startTime: new Date(log.startTime),
      endTime: new Date(log.endTime),
    }));

    return {
      ...report,
      logs: mappedLogs,
    } as any;
  }, [personalReport, teamReport, activeSubTab]);

  // Filter logs by selected member if team view
  const filteredReport = useMemo(() => {
    if (!activeReport) return null;
    if (activeSubTab === "personal" || memberFilter === "all") {
      return activeReport;
    }

    const filteredLogs = activeReport.logs.filter((log: any) => log.userId === memberFilter);

    const totalSeconds = filteredLogs.reduce((acc: number, log: any) => acc + log.duration, 0);
    const totalHours = calculateDurationHours(totalSeconds);
    const totalSessions = filteredLogs.length;
    const averageSessionHours = totalSessions > 0 ? totalHours / totalSessions : 0;
    const activeProjects = new Set(filteredLogs.map((l: any) => l.projectName).filter(Boolean)).size;

    const kpis = {
      totalHours: Number(totalHours.toFixed(2)),
      totalSessions,
      averageSessionHours: Number(averageSessionHours.toFixed(2)),
      activeProjects,
    };

    const projectMap = new Map<string, { name: string; seconds: number }>();
    let totalProjSeconds = 0;
    filteredLogs.forEach((log: any) => {
      totalProjSeconds += log.duration;
      const projName = log.projectName || "No Project";
      const current = projectMap.get(projName) || { name: projName, seconds: 0 };
      current.seconds += log.duration;
      projectMap.set(projName, current);
    });

    const projectDistribution = Array.from(projectMap.values()).map((p) => {
      const hours = calculateDurationHours(p.seconds);
      const percentage = totalProjSeconds > 0 ? (p.seconds / totalProjSeconds) * 100 : 0;
      return {
        projectId: null,
        projectName: p.name,
        hours: Number(hours.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
      };
    }).sort((a, b) => b.hours - a.hours);

    return {
      ...activeReport,
      kpis,
      projectDistribution,
      logs: filteredLogs,
    };
  }, [activeReport, memberFilter, activeSubTab]);

  const aggregatedChartData = useMemo(() => {
    if (!filteredReport || !filteredReport.logs) return [];
    const logs = filteredReport.logs;
    const map = new Map<string, { label: string; tooltipLabel: string; hours: number; sortKey: string }>();

    // Pre-populate keys if custom range is selected to prevent gaps
    if (startDate && endDate && groupBy === "day") {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 90) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
          const formattedDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          map.set(dateStr, {
            label: `${weekday}, ${formattedDate}`,
            tooltipLabel: d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
            hours: 0,
            sortKey: dateStr,
          });
        }
      }
    }

    logs.forEach((log: any) => {
      const start = new Date(log.startTime);
      const hours = calculateDurationHours(log.duration);
      if (hours <= 0) return;

      if (groupBy === "day") {
        const dateStr = start.toISOString().split("T")[0];
        const weekday = start.toLocaleDateString(undefined, { weekday: "short" });
        const formattedDate = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const label = `${weekday}, ${formattedDate}`;
        const current = map.get(dateStr) || {
          label,
          tooltipLabel: start.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          hours: 0,
          sortKey: dateStr
        };
        current.hours += hours;
        map.set(dateStr, current);
      } else if (groupBy === "week") {
        const day = start.getDay();
        const diff = start.getDate() - (day === 0 ? 6 : day - 1);
        const mon = new Date(start);
        mon.setDate(diff);
        mon.setHours(0, 0, 0, 0);

        const weekKey = mon.toISOString().split("T")[0];
        const label = `Wk of ${mon.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

        const monEnd = new Date(mon);
        monEnd.setDate(mon.getDate() + 6);
        const tooltipLabel = `Week: ${mon.toLocaleDateString()} - ${monEnd.toLocaleDateString()}`;

        const current = map.get(weekKey) || { label, tooltipLabel, hours: 0, sortKey: weekKey };
        current.hours += hours;
        map.set(weekKey, current);
      } else if (groupBy === "month") {
        const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
        const label = start.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
        const tooltipLabel = start.toLocaleDateString(undefined, { month: "long", year: "numeric" });

        const current = map.get(monthKey) || { label, tooltipLabel, hours: 0, sortKey: monthKey };
        current.hours += hours;
        map.set(monthKey, current);
      } else if (groupBy === "year") {
        const yearKey = `${start.getFullYear()}`;
        const label = yearKey;
        const tooltipLabel = `Year ${yearKey}`;

        const current = map.get(yearKey) || { label, tooltipLabel, hours: 0, sortKey: yearKey };
        current.hours += hours;
        map.set(yearKey, current);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((item) => ({
        label: item.label,
        tooltipLabel: item.tooltipLabel,
        hours: Number(item.hours.toFixed(2)),
      }));
  }, [filteredReport, groupBy, startDate, endDate]);

  const dialogLog = useMemo(() => {
    if (!selectedLog) return null;
    return {
      id: selectedLog.id,
      title: selectedLog.title,
      description: selectedLog.description,
      start_time: selectedLog.startTime,
      end_time: selectedLog.endTime,
      duration: selectedLog.duration,
      is_public: (selectedLog as any).is_public || false,
      project_id: selectedLog.projectName,
      tasks: selectedLog.taskTitles.map((t) => ({ id: t, title: t })),
      evidence: selectedLog.evidenceUrls.map((url) => ({ file_url: url, file_name: "evidence", mime_type: "image/jpeg" })),
    };
  }, [selectedLog]);

  const dialogProjects = useMemo(() => {
    if (!selectedLog || !selectedLog.projectName) return [];
    return [{ id: selectedLog.projectName, name: selectedLog.projectName }];
  }, [selectedLog]);

  // CSV Export Action
  const handleExportCSV = () => {
    if (!filteredReport || filteredReport.logs.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,User,User Email,Title,Description,Project,Duration (Hrs),Evidence Links\n";

    filteredReport.logs.forEach((log: any) => {
      const date = new Date(log.startTime).toLocaleDateString();
      const time = `${new Date(log.startTime).toLocaleTimeString()} - ${new Date(log.endTime).toLocaleTimeString()}`;
      const name = `"${log.userName.replace(/"/g, '""')}"`;
      const email = `"${log.userEmail.replace(/"/g, '""')}"`;
      const title = `"${log.title.replace(/"/g, '""')}"`;
      const desc = `"${log.description.replace(/"/g, '""')}"`;
      const proj = `"${(log.projectName || "No Project").replace(/"/g, '""')}"`;
      const duration = calculateDurationHours(log.duration).toFixed(2);
      const links = `"${log.evidenceUrls.join("; ")}"`;

      csvContent += `${date},${time},${name},${email},${title},${desc},${proj},${duration},${links}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `${activeSubTab}_report_${startDate || "start"}_to_${endDate || "end"}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Print Action
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-grow flex flex-col p-6 space-y-6 max-w-container-max mx-auto w-full h-full overflow-y-auto custom-scrollbar print:p-0 print:bg-white print:text-black">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 print:hidden">
        <div>
          <h2 className="text-headline-md font-extrabold tracking-tight text-on-surface">
            Reports & Analytics
          </h2>
          <p className="text-body-sm text-outline mt-0.5">
            Analyze time allocations, workload metrics, and document evidence.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!activeReport || activeReport.logs.length === 0}
            className="rounded-lg text-xs font-bold px-4 py-2 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface hover:text-primary transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!activeReport || activeReport.logs.length === 0}
            className="rounded-lg text-xs font-bold px-4 py-2 bg-primary text-on-primary hover:opacity-90 transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">print</span> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Sub tabs picker (Personal vs Team) */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/40 pb-0.5 print:hidden">
        <button
          onClick={() => setActiveSubTab("personal")}
          className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${activeSubTab === "personal"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
        >
          Personal Report
        </button>

        {isLeader && (
          <button
            onClick={() => setActiveSubTab("team")}
            className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${activeSubTab === "team"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
          >
            Team Report
          </button>
        )}
      </div>
      {/* Activity Heatmap */}
      <div className="print:hidden w-full">
        <Heatmap logs={filteredReport?.logs || []} className="max-w-none" weeksToShow={53} />
      </div>

      {/* Filter panel */}
      <div className="print:hidden">
        <ReportFilters
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          teamFilter={activeSubTab === "personal" ? teamFilter : teamReportId}
          setTeamFilter={activeSubTab === "personal" ? setTeamFilter : setTeamReportId}
          userTeams={
            activeSubTab === "personal"
              ? userTeams
              : managedProfile?.managedTeams || userTeams
          }
          showTeamSelect={true}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          memberFilter={memberFilter}
          setMemberFilter={setMemberFilter}
          members={
            activeSubTab === "team" && activeReport && "workload" in activeReport
              ? activeReport.workload.map((w: any) => ({ userId: w.userId, userName: w.userName }))
              : undefined
          }
        />
      </div>

      {/* Report Content Panel */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : filteredReport ? (
        <div className="space-y-6 print:space-y-4">

          {/* Printable Header */}
          <div className="hidden print:block border-b border-black pb-4 mb-4">
            <h1 className="text-3xl font-black">{activeSubTab === "personal" ? "Personal Work Report" : "Team Work Report"}</h1>
            <p className="text-sm mt-1">
              Active Organization: {activeOrg?.name || "Default Workspace"} | Generated on {new Date().toLocaleDateString()}
            </p>
            <p className="text-sm font-semibold">
              Period: {startDate || "All time"} to {endDate || "Today"}
            </p>
          </div>

          {/* Metric KPI cards */}
          <MetricCards kpis={filteredReport.kpis} />

          {/* Daily Hour Distribution Row */}
          <div className="grid grid-cols-1 gap-6">
            <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant flex flex-col justify-between h-[280px]">
              <div>
                <h4 className="text-[10px] uppercase font-bold text-outline tracking-wider">
                  Daily Hour Distribution
                </h4>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Time logged per day</p>
              </div>

              {/* Recharts Bar Chart */}
              {aggregatedChartData.length > 0 ? (
                <div className="h-44 w-full mt-4 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-neutral-800" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#888888"
                        fontSize={9}
                        fontWeight="semibold"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={10}
                        fontWeight="semibold"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}h`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length && payload[0].value !== undefined) {
                            const val = typeof payload[0].value === "number" ? payload[0].value.toFixed(2) : String(payload[0].value);
                            return (
                              <div className="bg-surface-container-high border border-outline-variant px-3 py-2 rounded-xl shadow-xl text-xs font-semibold text-on-surface">
                                <p className="font-mono-timer text-outline">{payload[0].payload?.tooltipLabel}</p>
                                <p className="font-bold text-primary mt-0.5">{val} hrs</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="hours" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center flex-1">
                  <span className="material-symbols-outlined text-outline text-[32px]">bar_chart</span>
                  <span className="text-xs text-outline mt-1 font-semibold">No daily tracking data</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Distribution pie segment chart */}
            <div className={activeSubTab === "personal" ? "md:col-span-2" : ""}>
              <ProjectDistributionChart distribution={filteredReport.projectDistribution} />
            </div>

            {/* Member Distribution Chart (Team report only) */}
            {activeSubTab === "team" && activeReport && "workload" in activeReport && (
              <MemberDistributionChart workload={activeReport.workload} />
            )}
          </div>

          {/* Timeline Chart (Dynamic date range columns & Lanes) */}
          <TimelineChart
            logs={filteredReport.logs}
            startDate={startDate}
            endDate={endDate}
            isTeam={activeSubTab === "team"}
            onLogClick={setSelectedLog}
          />

          {/* Workload Table (Visible only in Team Subtab) */}
          {activeSubTab === "team" && activeReport && "workload" in activeReport && (
            <WorkloadTable workload={activeReport.workload} />
          )}

          {/* Detailed logs table */}
          <ReportsLogsTable logs={filteredReport.logs} />
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 bg-surface-container-low text-on-surface border border-outline-variant text-center">
          <span className="material-symbols-outlined text-[48px] text-outline mb-2">query_stats</span>
          <h3 className="text-body-lg font-extrabold">Generate Report</h3>
          <p className="text-body-sm text-outline mt-1">Select filters above to load the analytics dashboard.</p>
        </div>
      )}

      <DetailViewDialog
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        selectedLog={dialogLog}
        projects={dialogProjects}
        tasks={dialogLog?.tasks || []}
      />
    </div>
  );
}
