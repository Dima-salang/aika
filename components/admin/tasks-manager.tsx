"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface TasksManagerProps {
  initialData?: any[];
  initialUsers?: any[];
  initialOrgs?: any[];
  initialProjects?: any[];
  initialTeams?: any[];
}

export function TasksManager({ initialData, initialUsers, initialOrgs, initialProjects, initialTeams }: TasksManagerProps) {
  const { data: tasks, isLoading, refetch } = trpc.admin.getTasks.useQuery(undefined, {
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

  const createTask = trpc.admin.createTask.useMutation({
    onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); toast.success("Task created successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to create task"); }
  });
  const updateTask = trpc.admin.updateTask.useMutation({
    onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); toast.success("Task updated successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to update task"); }
  });
  const deleteTask = trpc.admin.deleteTask.useMutation({
    onSuccess: () => { refetch(); toast.success("Task deleted successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to delete task"); }
  });

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form values
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [orgId, setOrgId] = useState("org-default");
  const [projectId, setProjectId] = useState("");
  const [teamId, setTeamId] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setAssigneeId(users?.[0]?.id || "");
    setOrgId(orgs?.[0]?.id || "org-default");
    setProjectId("");
    setTeamId("");
    setEditingId(null);
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status as any);
    setPriority((task.priority || "medium") as any);
    setAssigneeId(task.user_id);
    setOrgId(task.organization_id);
    setProjectId(task.project_id || "");
    setTeamId(task.team_id || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAssigneeId = assigneeId || users?.[0]?.id;
    if (!finalAssigneeId) {
      alert("Error: At least one user must exist in the database to assign a task.");
      return;
    }
    const payload = {
      title,
      description,
      status,
      priority,
      user_id: finalAssigneeId,
      organization_id: orgId,
      project_id: projectId || null,
      team_id: teamId || null,
    };
    if (editingId) {
      await updateTask.mutateAsync({ id: editingId, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete/archive this task?")) {
      await deleteTask.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Tasks</h2>
          <p className="text-body-sm text-outline">Manage tasks backlog, active workflows status, due logs, and workload assignees.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Task
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit Task Backlog Properties" : "Create New Backlog Task"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Task Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Refactor API endpoints"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Task Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optimize Postgres connection pool leaks..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Workflow Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="todo">To Do Backlog</option>
                <option value="in_progress">Active Progress</option>
                <option value="done">Completed Task</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Priority Rank</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Select Assignee...</option>
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
              <label className="text-[10px] font-bold text-outline uppercase block">Linked Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">No project link</option>
                {projects?.filter((p: any) => p.organization_id === orgId && !p.deleted_at).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Linked Team/Squad (Optional)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">No squad limit</option>
                {teams?.filter((t: any) => t.organization_id === orgId && !t.deleted_at).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
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
              disabled={createTask.isPending || updateTask.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createTask.isPending || updateTask.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !tasks ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Task Title</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tasks?.map((t: any) => (
                <tr key={t.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3">
                    <div className="font-bold">{t.title}</div>
                    <div className="text-[10px] text-outline truncate max-w-xs">{t.description || "No description."}</div>
                  </td>
                  <td className="p-3 text-on-surface-variant font-medium">
                    {users?.find((u: any) => u.id === t.user_id)?.name || "User ID: " + t.user_id}
                  </td>
                  <td className="p-3">
                    {t.status === "done" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Done</span>
                    ) : t.status === "in_progress" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">In Progress</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant border border-outline-variant">To Do</span>
                    )}
                  </td>
                  <td className="p-3">
                    {t.priority === "high" ? (
                      <span className="text-red-400 font-bold">!!! High</span>
                    ) : t.priority === "medium" ? (
                      <span className="text-tertiary font-bold">!! Medium</span>
                    ) : (
                      <span className="text-outline font-bold">! Low</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button onClick={() => handleEdit(t)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {!t.deleted_at && (
                      <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Delete Task">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {tasks?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-outline">No tasks discovered in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
