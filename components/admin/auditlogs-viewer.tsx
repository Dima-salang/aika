"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Search, Terminal } from "lucide-react";

interface AuditLogsViewerProps {
  initialData?: any[];
  initialUsers?: any[];
}

export function AuditLogsViewer({ initialData, initialUsers }: AuditLogsViewerProps) {
  const { data: logs, isLoading } = trpc.admin.getAuditLogs.useQuery(undefined, {
    initialData,
  });
  const { data: users } = trpc.admin.getUsers.useQuery(undefined, {
    initialData: initialUsers,
  });
  const [filterQuery, setFilterQuery] = useState("");

  const filteredLogs = logs?.filter((l: any) => {
    const q = filterQuery.toLowerCase();
    return (
      (l.event && l.event.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.table_name && l.table_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Audit Mutation Trail</h2>
          <p className="text-body-sm text-outline">Immutable record of mutation events, table structural edits, and access traces.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-outline pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="bg-surface-container-low border border-outline-variant rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface w-full sm:w-60 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {isLoading && !logs ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Event Action</th>
                <th className="p-3">Table Scope</th>
                <th className="p-3">User Admin</th>
                <th className="p-3">Description Context</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono-timer text-[11px]">
              {filteredLogs?.map((l: any) => (
                <tr key={l.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3 font-bold text-primary flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-outline" /> {l.event}
                  </td>
                  <td className="p-3 text-on-surface-variant uppercase font-bold text-[10px]">{l.table_name || "SYSTEM"}</td>
                  <td className="p-3 text-on-surface font-medium">
                    {users?.find((u: any) => u.id === l.user_id)?.name || l.user_id || "Anonymous Client"}
                  </td>
                  <td className="p-3 text-outline max-w-sm truncate" title={l.description}>{l.description}</td>
                  <td className="p-3 text-outline-variant text-[10px]">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {filteredLogs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-outline">No mutation trail logs matching query discovered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
