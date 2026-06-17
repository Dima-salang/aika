"use client";

export function OrgTab() {
  return (
    <div className="glass-card rounded-xl p-unit-6 bg-surface-container-low text-on-surface border border-outline-variant">
      <div className="mb-unit-4 border-b border-outline-variant pb-unit-2">
        <h3 className="text-headline-sm font-headline-sm font-bold flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined">work</span> My Organization
        </h3>
        <p className="text-body-sm text-outline mt-1">Your active organization domain workspace.</p>
      </div>
      <div className="space-y-4">
        <div className="text-center p-8 border border-dashed border-outline-variant rounded-xl">
          <p className="text-outline text-body-sm mb-4 max-w-sm mx-auto font-medium">
            Access team directories and scale organizational control with Better Auth Tenant modules.
          </p>
          <button className="rounded-lg text-body-sm px-unit-4 py-2 font-bold border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-2 mx-auto">
            Manage Workspace <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        </div>
      </div>
    </div>
  );
}
