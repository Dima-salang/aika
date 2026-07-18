"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X, ShieldAlert, Globe, Layers, ShieldCheck } from "lucide-react";
import { useConfirmStore } from "@/lib/store";
import { toast } from "sonner";

interface UsersManagerProps {
  initialData?: any[];
  canSetGlobalAdmin?: boolean;
}

export function UsersManager({ initialData, canSetGlobalAdmin = false }: UsersManagerProps) {
  const { data: users, isLoading, refetch } = trpc.admin.getUsers.useQuery(undefined, {
    initialData,
  });

  const { data: orgs } = trpc.admin.getOrgs.useQuery();
  const { data: teams } = trpc.admin.getTeams.useQuery();

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async (createdUser) => {
      // Create memberships as well
      if (createdUser && selectedOrgId) {
        await updateMemberships.mutateAsync({
          userId: createdUser.id,
          organizationId: selectedOrgId || null,
          orgRole: selectedOrgRole || null,
          teamId: selectedTeamId || null,
          teamRole: selectedTeamRole as "leader" | "member" | null,
        });
      }
      toast.success("User successfully registered!");
      refetch();
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create user.");
    }
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async (updatedUser) => {
      if (updatedUser) {
        await updateMemberships.mutateAsync({
          userId: updatedUser.id,
          organizationId: selectedOrgId || null,
          orgRole: selectedOrgRole || null,
          teamId: selectedTeamId || null,
          teamRole: selectedTeamRole as "leader" | "member" | null,
        });
      }
      toast.success("User properties successfully updated!");
      refetch();
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update user.");
    }
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User has been suspended.");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to suspend user.");
    }
  });

  const updateMemberships = trpc.admin.updateUserMemberships.useMutation();

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form values
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Memberships State
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgRole, setSelectedOrgRole] = useState("member");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamRole, setSelectedTeamRole] = useState("member");

  // Fetching editing user memberships
  const { data: userMemberships, refetch: refetchMemberships } = trpc.admin.getUserMemberships.useQuery(
    { userId: editingId || "" },
    { enabled: !!editingId }
  );

  useEffect(() => {
    if (userMemberships && editingId) {
      const activeOrg = userMemberships.orgMemberships?.[0];
      const activeTeam = userMemberships.teamMemberships?.[0];

      setSelectedOrgId(activeOrg?.organizationId || "");
      setSelectedOrgRole(activeOrg?.role || "member");
      setSelectedTeamId(activeTeam?.team_id || "");
      setSelectedTeamRole(activeTeam?.role || "member");
    }
  }, [userMemberships, editingId]);

  // Reset designated team if organization changes
  useEffect(() => {
    if (selectedOrgId) {
      const allowedTeams = teams?.filter((t: any) => t.organization_id === selectedOrgId && !t.deleted_at) || [];
      const isValid = allowedTeams.some((t: any) => t.id === selectedTeamId);
      if (!isValid) {
        setSelectedTeamId("");
      }
    } else {
      setSelectedTeamId("");
    }
  }, [selectedOrgId, teams]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setIsAdmin(false);
    setEditingId(null);
    setSelectedOrgId("");
    setSelectedOrgRole("member");
    setSelectedTeamId("");
    setSelectedTeamRole("member");
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setIsAdmin(user.is_admin || false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateUser.mutateAsync({
        id: editingId,
        name,
        email,
        ...(canSetGlobalAdmin ? { is_admin: isAdmin } : {}),
      });
    } else {
      await createUser.mutateAsync({
        name,
        email,
        ...(canSetGlobalAdmin ? { is_admin: isAdmin } : { is_admin: false }),
      });
    }
  };

  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const handleDelete = (id: string) => {
    showConfirm({
      title: "Suspend User Account?",
      description: "Are you sure you want to suspend this user? They will lose authentication rights to workspaces.",
      onConfirm: async () => {
        await deleteUser.mutateAsync({ id });
      }
    });
  };

  // Filter teams list dynamically based on the designated organization
  const filteredTeams = teams?.filter((t: any) => t.organization_id === selectedOrgId && !t.deleted_at) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Users</h2>
          <p className="text-body-sm text-outline">Create, edit, and audit system users and their administrative permissions.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add User
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-6">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit User Properties & Memberships" : "Create New User"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> 1. Core Profile
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Vance"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@aika.io"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Workspace Membership / Organization Designee */}
          <div className="space-y-4 pt-2 border-t border-outline-variant/50">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> 2. Workspace Organization Scope
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Designate Organization</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">-- No Organization (Default Guest) --</option>
                  {orgs?.map((org: any) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Organization Role</label>
                <select
                  value={selectedOrgRole}
                  onChange={(e) => setSelectedOrgRole(e.target.value)}
                  disabled={!selectedOrgId}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="member">Organization Member</option>
                  <option value="owner">Organization Owner</option>
                  <option value="admin">Organization Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Team Designation */}
          <div className="space-y-4 pt-2 border-t border-outline-variant/50">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> 3. inner Team Designation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Designate Team (Restricted to scope)</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={!selectedOrgId}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">-- No Team (General Member) --</option>
                  {filteredTeams.map((team: any) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                {!selectedOrgId && (
                  <span className="text-[9px] text-tertiary font-bold">Please select an organization first to list matching teams.</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block">Team Role</label>
                <select
                  value={selectedTeamRole}
                  onChange={(e) => setSelectedTeamRole(e.target.value)}
                  disabled={!selectedTeamId}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="member">Team Member</option>
                  <option value="leader">Team Leader</option>
                </select>
              </div>
            </div>
          </div>

          {/* Global Administrative Status */}
          <div className="flex items-center gap-2.5 bg-surface-container-highest/20 p-3 rounded-lg border border-outline-variant/50">
            <input
              type="checkbox"
              id="is-admin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 bg-surface"
            />
            <label htmlFor="is-admin" className="text-xs font-bold text-on-surface cursor-pointer select-none flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-tertiary" /> Assign Administrator Privileges (Global Console Admin)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/50">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending || updateUser.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createUser.isPending || updateUser.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !users ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Workspace Scope</th>
                <th className="p-3">Inner Squad / Team</th>
                <th className="p-3">Global Admin</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users?.map((u: any) => {
                return (
                  <UserRow
                    key={u.id}
                    user={u}
                    orgs={orgs}
                    teams={teams}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                  />
                );
              })}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-outline">No users discovered in system database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Separate component for rows to easily fetch dynamic live memberships without blocking
function UserRow({ user, orgs, teams, handleEdit, handleDelete }: { user: any; orgs: any; teams: any; handleEdit: any; handleDelete: any }) {
  const { data: memberships } = trpc.admin.getUserMemberships.useQuery({ userId: user.id });

  return (
    <tr className="hover:bg-surface-container-highest/20 transition-colors">
      <td className="p-3 font-bold">{user.name}</td>
      <td className="p-3 font-mono-timer text-on-surface-variant">{user.email}</td>
      <td className="p-3">
        <div className="flex flex-col gap-1.5">
          {memberships?.orgMemberships && memberships.orgMemberships.length > 0 ? (
            memberships.orgMemberships.map((m: any) => {
              const orgName = orgs?.find((o: any) => o.id === m.organizationId)?.name || m.organizationName || m.organizationId;
              return (
                <div key={m.organizationId} className="flex items-center gap-1.5">
                  <span className="font-extrabold truncate max-w-[120px]">{orgName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-secondary-container/40 text-on-secondary-container uppercase">{m.role}</span>
                </div>
              );
            })
          ) : (
            <span className="text-outline">None (Guest)</span>
          )}
        </div>
      </td>
      <td className="p-3">
        <div className="flex flex-col gap-1.5">
          {memberships?.teamMemberships && memberships.teamMemberships.length > 0 ? (
            memberships.teamMemberships.map((t: any) => {
              const teamName = teams?.find((team: any) => team.id === t.team_id)?.name || t.teamName || t.team_id;
              return (
                <div key={t.team_id} className="flex items-center gap-1.5">
                  <span className="truncate max-w-[120px]">{teamName}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-tertiary-container/30 text-tertiary uppercase">{t.role}</span>
                </div>
              );
            })
          ) : (
            <span className="text-outline">None</span>
          )}
        </div>
      </td>
      <td className="p-3">
        {user.is_admin ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-container/30 text-tertiary border border-tertiary-container/50">Admin</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant border border-outline-variant">User</span>
        )}
      </td>
      <td className="p-3">
        {user.deleted_at ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container/30 text-error border border-error-container/50">Suspended</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
        )}
      </td>
      <td className="p-3 text-right space-x-1.5">
        <button onClick={() => handleEdit(user)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        {!user.deleted_at && (
          <button onClick={() => handleDelete(user.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Delete/Suspend">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
