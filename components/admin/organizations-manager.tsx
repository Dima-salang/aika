"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";

interface OrganizationsManagerProps {
  initialData?: any[];
}

export function OrganizationsManager({ initialData }: OrganizationsManagerProps) {
  const { data: orgs, isLoading, refetch } = trpc.admin.getOrgs.useQuery(undefined, {
    initialData,
  });
  const createOrg = trpc.admin.createOrg.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const updateOrg = trpc.admin.updateOrg.useMutation({ onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); } });
  const deleteOrg = trpc.admin.deleteOrg.useMutation({ onSuccess: () => { refetch(); } });

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form values
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [metadata, setMetadata] = useState("");

  const resetForm = () => {
    setName("");
    setSlug("");
    setMetadata("");
    setEditingId(null);
  };

  const handleEdit = (org: any) => {
    setEditingId(org.id);
    setName(org.name);
    setSlug(org.slug);
    setMetadata(org.metadata || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateOrg.mutateAsync({ id: editingId, name, slug, metadata });
    } else {
      await createOrg.mutateAsync({ name, slug, metadata });
    }
  };

  const handleDelete = async (id: string) => {
    if (id === "org-default") {
      alert("Error: Cannot delete the default workspace.");
      return;
    }
    if (confirm("Are you sure you want to hard-delete this organization? This may violate database relationships if active teams or members depend on it.")) {
      await deleteOrg.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Workspaces</h2>
          <p className="text-body-sm text-outline">Manage active organizational scopes, slugs, and system workspaces.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add Workspace
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit Workspace Properties" : "Create New Workspace"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingId) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                  }
                }}
                placeholder="e.g. Acme Corporation"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Slug Identifier</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="acme-corp"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface font-mono-timer focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-outline uppercase block">Metadata Configurations (JSON/Text)</label>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='{ "tier": "enterprise", "maxUsers": 200 }'
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface font-mono-timer focus:outline-none focus:border-primary"
            />
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
              disabled={createOrg.isPending || updateOrg.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createOrg.isPending || updateOrg.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create Workspace"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !orgs ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Workspace Name</th>
                <th className="p-3">Slug / Domain</th>
                <th className="p-3">Metadata</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {orgs?.map((o: any) => (
                <tr key={o.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3 font-bold">{o.name}</td>
                  <td className="p-3 font-mono-timer text-on-surface-variant">{o.slug}</td>
                  <td className="p-3 font-mono-timer text-outline truncate max-w-xs">{o.metadata || "None"}</td>
                  <td className="p-3 text-right space-x-1.5">
                    <button onClick={() => handleEdit(o)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {o.id !== "org-default" && (
                      <button onClick={() => handleDelete(o.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Hard Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {orgs?.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-outline">No organizations discovered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
