import React from "react";
import { getLogDurationSeconds, formatDuration } from "@/utils/time";

interface RecentActivitiesProps {
  recentActivities: any[];
  projects: any[];
  onSelectLog?: (log: any) => void;
}

export function RecentActivities({ recentActivities = [], projects = [], onSelectLog }: RecentActivitiesProps) {
  const getActivityIcon = (title: string, projectName?: string) => {
    const lowerTitle = title.toLowerCase();
    const lowerProj = (projectName || "").toLowerCase();

    if (lowerTitle.includes("design") || lowerTitle.includes("ui") || lowerTitle.includes("sketch") || lowerTitle.includes("refine")) {
      return { icon: "brush", colorClass: "bg-secondary-container/50 text-secondary" };
    }
    if (lowerTitle.includes("bug") || lowerTitle.includes("fix") || lowerTitle.includes("qa") || lowerTitle.includes("test")) {
      return { icon: "bug_report", colorClass: "bg-tertiary-container/30 text-tertiary" };
    }
    if (lowerTitle.includes("sync") || lowerTitle.includes("meeting") || lowerTitle.includes("call") || lowerTitle.includes("stakeholder")) {
      return { icon: "groups", colorClass: "bg-primary-container/20 text-primary" };
    }
    return { icon: "edit_note", colorClass: "bg-surface-container-highest text-on-surface-variant" };
  };

  return (
    <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      <div className="px-unit-4 py-unit-3 border-b border-outline-variant flex justify-between items-center bg-surface-container/80 select-none">
        <span className="font-label-md text-label-md text-on-surface">Recent Activities</span>
        <button className="text-primary font-label-md text-[11px] hover:underline cursor-pointer">
          View All
        </button>
      </div>
      <div className="flex flex-col divide-y divide-outline-variant/30">
        {recentActivities.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant/70 text-body-sm font-medium">
            No recent time logs found. Start logging hours to populate your activity feed!
          </div>
        ) : (
          recentActivities.map((log) => {
            const projectObj = projects.find((p) => p.id === log.project_id);
            const { icon, colorClass } = getActivityIcon(log.title || log.description, projectObj?.name);

            const durationSeconds = getLogDurationSeconds(log);
            const formattedDuration = formatDuration(durationSeconds);
            
            const logDate = new Date(log.start_time);
            const timeStr = logDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            
            return (
              <div
                key={log.id}
                onClick={() => onSelectLog?.(log)}
                className="flex items-center justify-between px-unit-4 py-unit-3 hover:bg-surface-container-high/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-unit-4 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {icon}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-md text-on-surface font-semibold truncate">
                      {log.title || log.description}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium truncate">
                      Project: {projectObj ? projectObj.name : "Unassigned"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 select-none">
                  <span className="font-mono-timer text-on-surface font-semibold">
                    {formattedDuration}
                  </span>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
