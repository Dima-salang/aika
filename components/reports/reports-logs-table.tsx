"use client";

import React, { useState } from "react";
import { DetailedReportLog } from "@/services/core/ReportService";
import { calculateDurationHours } from "@/utils/time";

interface ReportsLogsTableProps {
  logs: DetailedReportLog[];
}

export function ReportsLogsTable({ logs }: ReportsLogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (logs.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 bg-surface-container-low text-on-surface border border-outline-variant text-center">
        <span className="material-symbols-outlined text-[48px] text-outline mb-2">event_busy</span>
        <h3 className="text-body-lg font-extrabold text-on-surface">No Logs Found</h3>
        <p className="text-body-sm text-outline mt-1">There are no work logs logged within the selected parameters.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getHours = (seconds: number) => {
    return calculateDurationHours(seconds).toFixed(2);
  };

  return (
    <div className="glass-card rounded-xl bg-surface-container-low text-on-surface border border-outline-variant overflow-hidden shadow-sm flex flex-col">
      <div className="p-unit-4 border-b border-outline-variant/60 flex items-center justify-between">
        <div>
          <h4 className="text-[10px] uppercase font-bold text-outline tracking-wider">
            Detailed Time Logs
          </h4>
          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
            Showing {paginatedLogs.length} of {logs.length} logs
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/60 text-outline uppercase tracking-wider text-[10px] font-bold">
              <th className="p-4">Date & Time</th>
              <th className="p-4">User</th>
              <th className="p-4">Title / Description</th>
              <th className="p-4">Project</th>
              <th className="p-4">Tasks</th>
              <th className="p-4 text-center">Duration</th>
              <th className="p-4">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 font-medium">
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="hover:bg-surface-container/20 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <div className="text-on-surface font-extrabold">{formatDate(log.startTime)}</div>
                  <div className="text-outline text-[11px] font-mono-timer mt-0.5">
                    {formatTime(log.startTime)} - {formatTime(log.endTime)}
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <div className="text-on-surface font-bold truncate max-w-[120px]">{log.userName}</div>
                  <div className="text-outline text-[10px] truncate max-w-[120px]">{log.userEmail}</div>
                </td>
                <td className="p-4 min-w-[200px]">
                  <div className="text-on-surface font-extrabold">{log.title}</div>
                  <div className="text-outline text-[11px] line-clamp-2 mt-0.5">{log.description}</div>
                </td>
                <td className="p-4 whitespace-nowrap">
                  {log.projectName ? (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded font-bold">
                      {log.projectName}
                    </span>
                  ) : (
                    <span className="text-outline/50 italic text-[11px]">No Project</span>
                  )}
                </td>
                <td className="p-4">
                  {log.taskTitles.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {log.taskTitles.map((task, idx) => (
                        <span key={idx} className="bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded text-[10px] border border-outline-variant/30 truncate max-w-[100px]" title={task}>
                          {task}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-outline/50 italic text-[11px]">—</span>
                  )}
                </td>
                <td className="p-4 text-center font-mono-timer font-bold text-on-surface whitespace-nowrap">
                  {getHours(log.duration)}h
                </td>
                <td className="p-4 whitespace-nowrap">
                  {log.evidenceUrls.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {log.evidenceUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded border border-outline-variant bg-surface hover:border-primary transition-all flex items-center justify-center text-primary group overflow-hidden"
                        >
                          <img
                            src={url}
                            alt="Evidence Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-outline/50 italic text-[11px]">No Evidence</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 bg-surface-container border-t border-outline-variant/60 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-50 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all select-none active:scale-[0.98]"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-outline">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-50 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-all select-none active:scale-[0.98]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
