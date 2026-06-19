"use client";

interface ShortcutsHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelpDialog({ isOpen, onClose }: ShortcutsHelpDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-surface dark:bg-[#121214] border border-outline-variant rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">keyboard</span>
            <h3 className="text-headline-sm font-extrabold text-on-surface">Power User Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <p className="text-outline font-medium">Use these premium hotkeys to navigate Aika instantly like a pro developer.</p>

          <div className="grid grid-cols-1 gap-3">
            {/* Actions category */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-primary tracking-wider">Quick Actions</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface font-semibold">Toggle Active Timer (Clock in/out)</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                    <span className="text-outline text-[10px]">+</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">T</kbd>
                    <span className="text-outline text-[10px]">or</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">T</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface font-semibold">Focus Search Input</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">⌘</kbd>
                    <span className="text-outline text-[10px]">+</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">K</kbd>
                    <span className="text-outline text-[10px]">or</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">/</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface font-semibold">Log Hours (Manual Creation)</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                    <span className="text-outline text-[10px]">+</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">N</kbd>
                    <span className="text-outline text-[10px]">or</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">N</kbd>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface font-semibold">Instantiate New Deliverable Task</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">Alt</kbd>
                    <span className="text-outline text-[10px]">+</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">C</kbd>
                    <span className="text-outline text-[10px]">or</span>
                    <kbd className="px-1.5 py-0.5 bg-surface-container-high border border-outline-variant text-[10px] font-bold rounded">C</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Category */}
            <div className="space-y-2 pt-1">
              <h4 className="text-[10px] uppercase font-bold text-primary tracking-wider">Navigation Tabs</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface-variant">Dashboard</span>
                  <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">1</kbd></span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface-variant">Time Logs</span>
                  <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">2</kbd></span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface-variant">Projects/Tasks</span>
                  <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">3</kbd></span>
                </div>
                <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-lg border border-outline-variant/40">
                  <span className="text-on-surface-variant">Profile</span>
                  <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant">4</kbd></span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/20 mt-1">
              <span className="text-primary font-semibold">Toggle Keyboard Shortcuts Guide</span>
              <span className="flex items-center gap-0.5"><kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">?</kbd> <span className="text-[10px] text-outline">or</span> <kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">Alt</kbd>+<kbd className="px-1 bg-surface-container-high text-[9px] font-bold rounded border border-outline-variant text-primary">H</kbd></span>
            </div>
          </div>
        </div>

        <div className="pt-2 text-center text-[10px] text-outline border-t border-outline-variant/30 flex justify-between items-center">
          <span>Press <kbd className="px-1 bg-surface-container-high rounded border border-outline-variant">Esc</kbd> to close any modal</span>
          <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-[12px]">flash_on</span> Designed for quick navigation</span>
        </div>
      </div>
    </div>
  );
}
