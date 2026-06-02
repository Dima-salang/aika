"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";

interface ProjectsManagerProps {
  initialData?: any[];
  initialOrgs?: any[];
  initialTeams?: any[];
}

export function ProjectsManager({ initialData, initialOrgs, initialTeams }: ProjectsManagerProps) {
  const { data: projects, isLoading, refetch } = trpc.admin.getProjects.useQuery(undefined, {
    initialData,
  });
  const { data: orgs } = trpc.admin.getOrgs.useQuery(undefined, {
    initialData: initialOrgs,
  });
  const { data: teams } = trpc.admin.getTeams.useQuery(undefined, {
    initialData: initialTeams,
  });

  const createProject = trpc.admin.createProject.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const updateProject = trpc.admin.updateProject.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const deleteProject = trpc.admin.deleteProject.useMutation({ onSuccess: () => { refetch(); } });

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form values
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orgId, setOrgId] = useState("org-default");
  const [teamId, setTeamId] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setOrgId(orgs?.[0]?.id || "org-default");
    setTeamId("");
    setEditingId(null);
  };

  const handleEdit = (project: any) => {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description || "");
    setOrgId(project.organization_id);
    setTeamId(project.team_id || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateProject.mutateAsync({ id: editingId, name, description, organization_id: orgId, team_id: teamId || null });
    } else {
      await createProject.mutateAsync({ name, description, organization_id: orgId, team_id: teamId || null });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Projects</h2>
          <p className="text-body-sm text-outline">Manage software projects, operational scopes, tasks targets, and client agreements.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Project
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit Project Properties" : "Create New Project"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Project Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Infrastructure Modernization"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Parent Workspace Scope</label>
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
              <label className="text-[10px] font-bold text-outline uppercase block">Owning Squad/Team (Optional)</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">No specific team allocation (Shared)</option>
                {teams?.filter((t: any) => t.organization_id === orgId && !t.deleted_at).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Brief Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rebuilding standard pipeline structures..."
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
              disabled={createProject.isPending || updateProject.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createProject.isPending || updateProject.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !projects ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Project</th>
                <th className="p-3">Scope / Organization</th>
                <th className="p-3">Assigned Squad</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {projects?.map((p: any) => (
                <tr key={p.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[10px] text-outline truncate max-w-xs">{p.description || "No description provided."}</div>
                  </td>
                  <td className="p-3 text-on-surface-variant font-mono-timer">
                    {orgs?.find((o: any) => o.id === p.organization_id)?.name || p.organization_id}
                  </td>
                  <td className="p-3 text-on-surface-variant">
                    {p.team_id ? (teams?.find((t: any) => t.id === p.team_id)?.name || "Squad ID: " + p.team_id) : "Shared Workspace"}
                  </td>
                  <td className="p-3">
                    {p.deleted_at ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/30 text-error border border-error-container/50">Archived</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button onClick={() => handleEdit(p)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {!p.deleted_at && (
                      <button onClick={() => handleDelete(p.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Archive Project">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {projects?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-outline">No projects discovered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
