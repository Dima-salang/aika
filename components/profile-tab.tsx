"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { trpc } from "@/utils/trpc";
import { useConfirmStore } from "@/lib/store";
import { toast } from "sonner";

export function ProfileTab() {
  const { session, refetchSession } = useAuth();
  const { showConfirm } = useConfirmStore();
  const userId = session?.user?.id || "";

  const disconnectNotionMutation = trpc.disconnectNotion.useMutation({
    onSuccess: async () => {
      await refetchSession();
      toast.success("Successfully disconnected from Notion.");
    },
  });

  const resetNotionDatabaseMutation = trpc.resetNotionDatabase.useMutation({
    onSuccess: async () => {
      await refetchSession();
      toast.success("Successfully reset Notion database linkage.");
    },
  });

  if (!session) return null;

  return (
    <div className="glass-card rounded-xl p-unit-6 bg-surface-container-low text-on-surface border border-outline-variant">
      <div className="mb-unit-4 border-b border-outline-variant pb-unit-2">
        <h3 className="text-headline-sm font-headline-sm font-bold flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined">person</span> My Profile
        </h3>
        <p className="text-body-sm text-outline mt-1">Your account particulars synced through Better Auth.</p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
          {session.user.image ? (
            <img src={session.user.image} alt={session.user.name} className="h-14 w-14 rounded-full" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase">
              {session.user.name.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="text-body-md font-extrabold">{session.user.name}</h4>
            <p className="text-body-sm text-outline">{session.user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] text-outline font-bold uppercase block">User ID</span>
            <p className="font-mono-timer bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant truncate">
              {session.user.id}
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-outline font-bold uppercase block">Created At</span>
            <p className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant">
              {new Date(session.user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-outline-variant pt-6 space-y-4">
          <div>
            <h4 className="text-body-md font-extrabold flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-[20px]">sync</span> Integrations
            </h4>
            <p className="text-body-sm text-outline mt-1">Connect third-party apps to streamline your tracking.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E3E2E0] dark:bg-[#37352F] flex items-center justify-center text-xl font-black text-black dark:text-white">
                N
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-body-sm font-bold text-on-surface">Notion Sync</h5>
                  <div className="group relative cursor-pointer inline-flex">
                    <span className="material-symbols-outlined text-[16px] text-outline hover:text-primary transition-colors">help_outline</span>
                    <div className="absolute left-1/2 bottom-full mb-2.5 -translate-x-1/2 w-72 p-4 bg-surface-container-high dark:bg-[#18181b] text-[11px] rounded-2xl shadow-2xl border border-outline-variant text-on-surface opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none">
                      <div className="font-extrabold text-primary mb-1 flex items-center gap-1">
                        About Notion Sync
                      </div>
                      <p className="text-outline leading-relaxed mb-2.5">
                        Automatically mirrors your logged sessions, tasks, durations, and metadata to your Notion workspace.
                      </p>
                      <div className="font-bold text-on-surface mb-1">Setup Steps:</div>
                      <ol className="list-decimal list-inside text-outline space-y-1">
                        <li>Click <strong>Connect Notion</strong> to authorize.</li>
                        <li>Share/select at least one page.</li>
                        <li>An <strong>Aika Time Logs</strong> database will automatically be linked under the page.</li>
                        <li>All time logs will be stored in the database.</li>
                        <li>You can plug in the database as a data source in your pages.</li>
                      </ol>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-surface-container-high dark:border-t-[#18181b]"></div>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-outline">
                  {session.user.notion_workspace_name
                    ? `Connected to: ${session.user.notion_workspace_name}`
                    : "Sync logged time to your Notion workspace."}
                </p>
              </div>
            </div>

            {session.user.notion_workspace_name ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    showConfirm({
                      title: "Disconnect from Notion?",
                      description: "Are you sure you want to disconnect from Notion? Syncing will stop.",
                      onConfirm: async () => {
                        await disconnectNotionMutation.mutateAsync({ userId: session.user.id });
                      }
                    });
                  }}
                  disabled={disconnectNotionMutation.isPending}
                  className="w-full sm:w-auto rounded-lg text-body-sm px-4 py-2 font-bold border border-red-500/30 hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-50"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => {
                    showConfirm({
                      title: "Reset Database Link?",
                      description: "Are you sure you want to reset the database linkage? This will clear the linked database ID, forcing a new database creation on next reconnect.",
                      onConfirm: async () => {
                        await resetNotionDatabaseMutation.mutateAsync({ userId: session.user.id });
                      }
                    });
                  }}
                  disabled={resetNotionDatabaseMutation.isPending}
                  className="w-full sm:w-auto rounded-lg text-body-sm px-4 py-2 font-bold border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors disabled:opacity-50"
                >
                  Reset Database Link
                </button>
              </div>
            ) : (
              <a
                href="/api/integrations/notion/connect"
                className="w-full sm:w-auto text-center rounded-lg text-body-sm px-4 py-2 font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors"
              >
                Connect Notion
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
