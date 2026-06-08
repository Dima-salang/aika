"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface NotificationsManagerProps {
  initialData?: any[];
  initialUsers?: any[];
}

export function NotificationsManager({ initialData, initialUsers }: NotificationsManagerProps) {
  const { data: notifications, isLoading, refetch } = trpc.admin.getNotifications.useQuery(undefined, {
    initialData,
  });
  const { data: users } = trpc.admin.getUsers.useQuery(undefined, {
    initialData: initialUsers,
  });

  const createNotification = trpc.admin.createNotification.useMutation({
    onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); toast.success("Notification sent successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to send notification"); }
  });
  const updateNotification = trpc.admin.updateNotification.useMutation({
    onSuccess: () => { refetch(); setIsFormOpen(false); resetForm(); toast.success("Notification updated successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to update notification"); }
  });
  const deleteNotification = trpc.admin.deleteNotification.useMutation({
    onSuccess: () => { refetch(); toast.success("Notification deleted successfully"); },
    onError: (err) => { toast.error(err.message || "Failed to delete notification"); }
  });

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form values
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"team_invitation" | "task_update" | "time_log" | "team_switch">("task_update");
  const [isRead, setIsRead] = useState(false);

  const resetForm = () => {
    setUserId(users?.[0]?.id || "");
    setTitle("");
    setMessage("");
    setType("task_update");
    setIsRead(false);
    setEditingId(null);
  };

  const handleEdit = (n: any) => {
    setEditingId(n.id);
    setUserId(n.user_id);
    setTitle(n.title);
    setMessage(n.message);
    setType(n.type as "team_invitation" | "task_update" | "time_log" | "team_switch");
    setIsRead(n.is_read || false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUserId = userId || users?.[0]?.id;
    if (!finalUserId) {
      alert("Error: At least one user must exist in the database to deliver a notification.");
      return;
    }
    const payload = {
      user_id: finalUserId,
      title,
      message,
      type,
    };
    if (editingId) {
      await updateNotification.mutateAsync({ id: editingId, ...payload, is_read: isRead });
    } else {
      await createNotification.mutateAsync(payload);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      await deleteNotification.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">Manage Notifications</h2>
          <p className="text-body-sm text-outline">Manage and dispatch system-wide push alerts, team switch reminders, or tasks notices.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Dispatch Alert
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="text-body-md font-bold text-on-surface">{editingId ? "Edit Notification Settings" : "Dispatch New Alert Notification"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Target User</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Select Target User...</option>
                {users?.filter((u: any) => !u.deleted_at).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Alert Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "team_invitation" | "task_update" | "time_log" | "team_switch")}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="task_update">Task Progress Notice</option>
                <option value="team_invitation">Team Membership Invite</option>
                <option value="time_log">Time Sheets Warning</option>
                <option value="team_switch">Workspace Shift Alert</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Notification Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Backlog Task Assigned"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-outline uppercase block">Notification Message Details</label>
              <input
                type="text"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Alice has assigned you to task pool standard..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {editingId && (
            <div className="flex items-center gap-2.5 bg-surface-container-highest/20 p-3 rounded-lg border border-outline-variant/50">
              <input
                type="checkbox"
                id="is-read"
                checked={isRead}
                onChange={(e) => setIsRead(e.target.checked)}
                className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 bg-surface"
              />
              <label htmlFor="is-read" className="text-xs font-bold text-on-surface cursor-pointer select-none">
                Mark as delivered/read by target member
              </label>
            </div>
          )}

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
              disabled={createNotification.isPending || updateNotification.isPending}
              className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1.5"
            >
              {(createNotification.isPending || updateNotification.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Dispatch Alert"}
            </button>
          </div>
        </form>
      )}

      {isLoading && !notifications ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-outline" />
        </div>
      ) : (
        <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low">
          <table className="w-full border-collapse text-left text-xs text-on-surface">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] uppercase font-bold text-outline">
                <th className="p-3">Notice Title / Details</th>
                <th className="p-3">Deliver User</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {notifications?.map((n: any) => (
                <tr key={n.id} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="p-3">
                    <div className="font-bold flex items-center gap-1.5">
                      {n.title}
                    </div>
                    <div className="text-[10px] text-outline truncate max-w-xs">{n.message}</div>
                  </td>
                  <td className="p-3 text-on-surface-variant font-medium">
                    {users?.find((u: any) => u.id === n.user_id)?.name || "User ID: " + n.user_id}
                  </td>
                  <td className="p-3 text-[10px] font-bold text-outline uppercase font-mono-timer">{n.type}</td>
                  <td className="p-3">
                    {n.is_read ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Read</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant border border-outline-variant">Sent</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button onClick={() => handleEdit(n)} className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface inline-block" title="Edit Properties">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {!n.deleted_at && (
                      <button onClick={() => handleDelete(n.id)} className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 inline-block" title="Delete Notice">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {notifications?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-outline">No alerts discovered in task delivery queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
