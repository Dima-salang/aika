import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LayoutState {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  viewMode: "kanban" | "list";
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setViewMode: (mode: "kanban" | "list") => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: false,
      viewMode: "kanban",
      toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarCollapsed: !state.rightSidebarCollapsed })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLeftSidebarCollapsed: (collapsed) => set({ leftSidebarCollapsed: collapsed }),
      setRightSidebarCollapsed: (collapsed) => set({ rightSidebarCollapsed: collapsed }),
    }),
    {
      name: "aika-layout-store",
    }
  )
);

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: (() => void) | null;
  showConfirm: (options: { title: string; description: string; onConfirm: () => void }) => void;
  hideConfirm: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  open: false,
  title: "",
  description: "",
  onConfirm: null,
  showConfirm: ({ title, description, onConfirm }) =>
    set({ open: true, title, description, onConfirm }),
  hideConfirm: () => set({ open: false, onConfirm: null }),
}));
