"use client";

import React from "react";
import { MemberWorkloadItem } from "@/services/core/ReportService";

interface WorkloadTableProps {
  workload: MemberWorkloadItem[];
}

export function WorkloadTable({ workload }: WorkloadTableProps) {
  if (workload.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 bg-surface-container-low text-on-surface border border-outline-variant text-center">
        <span className="material-symbols-outlined text-[36px] text-outline mb-1">group_off</span>
        <h4 className="text-body-md font-extrabold text-on-surface">No Members Found</h4>
        <p className="text-body-sm text-outline mt-0.5">No time logs recorded by members in this team.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl bg-surface-container-low text-on-surface border border-outline-variant overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 border-b border-outline-variant/60">
        <h4 className="text-[10px] uppercase font-bold text-outline tracking-wider">
          Member Workload Distribution
        </h4>
        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
          Leader overview of team contributions
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/60 text-outline uppercase tracking-wider text-[10px] font-bold">
              <th className="p-3">Member</th>
              <th className="p-3 text-center">Total Hours</th>
              <th className="p-3 text-center">Total Sessions</th>
              <th className="p-3 text-center">Unique Tasks</th>
              <th className="p-3 text-center">Avg Session Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 font-semibold">
            {workload.map((member) => (
              <tr key={member.userId} className="hover:bg-surface-container/20 transition-colors">
                <td className="p-3 whitespace-nowrap">
                  <div className="text-on-surface font-extrabold">{member.userName}</div>
                  <div className="text-outline text-[10px] font-medium">{member.userEmail}</div>
                </td>
                <td className="p-3 text-center font-mono-timer font-bold text-on-surface">
                  {member.totalHours.toFixed(2)}h
                </td>
                <td className="p-3 text-center font-mono-timer text-on-surface-variant">
                  {member.totalSessions}
                </td>
                <td className="p-3 text-center font-mono-timer text-on-surface-variant">
                  {member.tasksCompleted}
                </td>
                <td className="p-3 text-center font-mono-timer text-on-surface-variant">
                  {member.averageSessionHours.toFixed(2)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
