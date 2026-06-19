import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileEvidence } from "@/components/timer/time-log-dialog";

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

interface PreferenceState {
  latestProjectId: string;
  setLatestProjectId: (projectId: string) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      latestProjectId: "",
      setLatestProjectId: (projectId) => set({ latestProjectId: projectId }),
    }),
    {
      name: "aika-preference-store",
    }
  )
);

import type { CreateLogInput } from "@/db/schema";

export type TimeLogDraft = Omit<
  CreateLogInput,
  "userId" | "organizationId" | "teamId" | "projectId" | "startTime" | "endTime" | "evidence" | "taskIds"
> & {
  projectId: string;
  selectedTasks: string[];
  evidenceList: FileEvidence[];
  isPublic: boolean;
  startTime: string;
  endTime: string;
};

interface TimeLogDraftState {
  drafts: Record<string, TimeLogDraft>;
  setDraft: (logKey: string, draft: Partial<TimeLogDraft>) => void;
  clearDraft: (logKey: string) => void;
}

export const useTimeLogDraftStore = create<TimeLogDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (logKey, draft) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [logKey]: {
              ...(state.drafts[logKey] || {
                title: "",
                description: "",
                projectId: "",
                selectedTasks: [],
                evidenceList: [],
                isPublic: false,
                startTime: "",
                endTime: "",
              }),
              ...draft,
            },
          },
        })),
      clearDraft: (logKey) =>
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[logKey];
          return { drafts: newDrafts };
        }),
    }),
    {
      name: "aika-time-log-draft-store",
    }
  )
);

