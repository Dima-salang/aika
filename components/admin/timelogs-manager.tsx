"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X, Calendar } from "lucide-react";

interface TimeLogsManagerProps {
  initialData?: any[];
  initialUsers?: any[];
  initialOrgs?: any[];
  initialProjects?: any[];
  initialTeams?: any[];
}

export function TimeLogsManager({ initialData, initialUsers, initialOrgs, initialProjects, initialTeams }: TimeLogsManagerProps) {
  const { data: logs, isLoading, refetch } = trpc.admin.getTimeLogs.useQuery(undefined, {
    initialData,
  });
  const { data: users } = trpc.admin.getUsers.useQuery(undefined, {
    initialData: initialUsers,
  });
  const { data: orgs } = trpc.admin.getOrgs.useQuery(undefined, {
    initialData: initialOrgs,
  });
  const { data: projects } = trpc.admin.getProjects.useQuery(undefined, {
    initialData: initialProjects,
  });
  const { data: teams } = trpc.admin.getTeams.useQuery(undefined, {
    initialData: initialTeams,
  });

  const createLog = trpc.admin.createTimeLog.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const updateLog = trpc.admin.updateTimeLog.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const deleteLog = trpc.admin.deleteTimeLog.useMutation({ onSuccess: () => { refetch(); } });

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form values
  const [userId, setUserId] = useState("");
  const [orgId, setOrgId] = useState("org-default");
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setUserId(users?.[0]?.id || "");
    setOrgId(orgs?.[0]?.id || "org-default");
    setProjectId("");
    setTeamId("");
    const now = new Date();
    const formattedNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(formattedNow);
    setEndTime(formattedNow);
    setTitle("");
    setDescription("");
    setEditingId(null);
  };

  const handleEdit = (log: any) => {
    setEditingId(log.id);
    setUserId(log.user_id);
    setOrgId(log.organization_id);
    setProjectId(log.project_id || "");
    setTeamId(log.team_id || "");
    setStartTime(new Date(new Date(log.start_time).getTime() - new Date(log.start_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setEndTime(new Date(new Date(log.end_time).getTime() - new Date(log.end_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setTitle(log.title || "");
    setDescription(log.description || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUserId = userId || users?.[0]?.id;
    if (!finalUserId) {
      alert("Error: At least one user must exist in the database to log time.");
      return;
    }
    const payload = {
      user_id: finalUserId,
      organization_id: orgId,
      project_id: projectId || null,
      team_id: teamId || null,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      title,
      description,
    };
    if (editingId) {
      await updateLog.mutateAsync({ id: editingId, ...payload });
    } else {
      await createLog.mutateAsync(payload);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this logged session?")) {
      await deleteLog.mutateAsync({ id });
    }
  };

  const calculateHours = (start: any, end: any) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff > 0 ? (diff / 3600000).toFixed(2) : "0.00";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Time Logs</h2>
          <p className="text-body-sm text-outline">Manage recorded active time log sheets, modify incorrect clock events, and Link Projects.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Time Log
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit Recorded Time Log Entry" : "Manually Provision Time Log Sheet"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">User Member</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Select User...</option>
                {users?.filter((u: any) => !u.deleted_at).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Workspace Scope</label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                {orgs?.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Start Timestamp</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">End Timestamp</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Project Allocation (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">No Project allocated</option>
                {projects?.filter((p: any) => p.organization_id === orgId && !p.deleted_at).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Squad Allocation (Optional)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">No squad limits</option>
                {teams?.filter((t: any) => t.organization_id === orgId && !t.deleted_at).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Activity Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Server Database migrations"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Activity Description Details</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Implemented drizzle integration adapters..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLog.isPending || updateLog.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createLog.isPending || updateLog.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create Entry"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !logs ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Session Description</th>
                <th className="p-3">User</th>
                <th className="p-3">Timeline Interval</th>
                <th className="p-3">Duration (Hours)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs?.map((l: any) => (
                <tr key={l.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3">
                    <div className="font-bold">{l.title || "Logged Session"}</div>
                    <div className="text-[10px] text-outline truncate max-w-xs">{l.description}</div>
                  </td>
                  <td className="p-3 text-on-surface-variant font-medium">
                    {users?.find((u: any) => u.id === l.user_id)?.name || "User ID: " + l.user_id}
                  </td>
                  <td className="p-3 text-outline text-[11px] font-mono-timer space-y-0.5">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(l.start_time).toLocaleString()}</div>
                    <div>to {new Date(l.end_time).toLocaleString()}</div>
                  </td>
                  <td className="p-3 font-mono-timer font-bold text-on-surface">
                    {calculateHours(l.start_time, l.end_time)} hrs
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button onClick={() => handleEdit(l)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {!l.deleted_at && (
                      <button onClick={() => handleDelete(l.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Delete Log">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-outline">No logged work hours sheets discovered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
