"use client";

import React, { useState } from "react";
import { trpc } from "@/utils/trpc";
import { useLayoutStore } from "@/lib/store";
import { toast } from "sonner";
import { 
  FolderDot, 
  Plus, 
  FolderPlus, 
  Trash2, 
  Clock, 
  User, 
  Filter, 
  CheckCircle2, 
  Play, 
  Edit3, 
  Loader2,
  X,
  LayoutGrid,
  List
} from "lucide-react";
import { useConfirmStore } from "@/lib/store";

interface ProjectsTasksTabProps {
  userId: string;
  organizationId: string;
  onSelectTask?: (task: any) => void;
}

export function ProjectsTasksTab({ userId, organizationId, onSelectTask }: ProjectsTasksTabProps) {
  const { viewMode, setViewMode } = useLayoutStore();

  const { showConfirm } = useConfirmStore();

  // Queries
  const { data: projects, refetch: refetchProjects, isLoading: loadingProjects } = trpc.getProjects.useQuery(
    { organizationId }
  );
  
  const { data: tasks, refetch: refetchTasks, isLoading: loadingTasks } = trpc.getTasks.useQuery(
    { userId }
  );

  const { data: users } = trpc.admin.getUsers.useQuery();
  const { data: rawLogs } = trpc.getUserLogs.useQuery({ userId, organizationId });

  // Mutations
  const createProject = trpc.admin.createProject.useMutation({
    onSuccess: () => {
      refetchProjects();
      setIsNewProjectOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
      toast.success("Project instantiated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create project.");
    }
  });

  const deleteProject = trpc.admin.deleteProject.useMutation({
    onSuccess: () => {
      refetchProjects();
      if (selectedProjectId) {
        setSelectedProjectId(projects?.[0]?.id || "");
      }
      toast.success("Project archived successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to archive project.");
    }
  });

  const createTask = trpc.admin.createTask.useMutation({
    onSuccess: () => {
      refetchTasks();
      setIsNewTaskOpen(false);
      resetTaskForm();
      toast.success("Task backlog item created!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create task.");
    }
  });

  const updateTask = trpc.admin.updateTask.useMutation({
    onSuccess: () => {
      refetchTasks();
      setIsNewTaskOpen(false);
      resetTaskForm();
      toast.success("Task updated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update task.");
    }
  });

  const deleteTask = trpc.admin.deleteTask.useMutation({
    onSuccess: () => {
      refetchTasks();
      toast.success("Task deleted successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete task.");
    }
  });

  // UI State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Task form values
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<"backlog" | "todo" | "in_progress" | "done">("todo");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskAssignee, setTaskAssignee] = useState("");

  // Local Form Errors
  const [formError, setFormError] = useState<string | null>(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Drag & Drop visual state indicators
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDesc("");
    setTaskStatus("todo");
    setTaskPriority("medium");
    setTaskAssignee(userId);
    setEditingTaskId(null);
    setFormError(null);
  };

  React.useEffect(() => {
    const handleGlobalNewTask = () => {
      resetTaskForm();
      setIsNewTaskOpen(true);
    };
    window.addEventListener("aika-new-task", handleGlobalNewTask);
    return () => window.removeEventListener("aika-new-task", handleGlobalNewTask);
  }, [projects, userId]);

  const handleEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskStatus(task.status as any);
    setTaskPriority((task.priority || "medium") as any);
    setTaskAssignee(task.user_id);
    setIsNewTaskOpen(true);
    setFormError(null);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }

    const activeProjects = projects?.filter((p: any) => !p.deleted_at) || [];
    const currentProjectId = selectedProjectId || activeProjects[0]?.id || "";

    const payload = {
      title: taskTitle,
      description: taskDesc,
      status: taskStatus,
      priority: taskPriority,
      user_id: taskAssignee || userId,
      organization_id: organizationId,
      project_id: currentProjectId || null,
      team_id: null,
    };

    try {
      if (editingTaskId) {
        await updateTask.mutateAsync({
          id: editingTaskId,
          ...payload
        });
      } else {
        await createTask.mutateAsync(payload);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to submit task. Please check parameters.");
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setTimeout(() => setDraggingTaskId(taskId), 0);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setActiveDropCol(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: "backlog" | "todo" | "in_progress" | "done") => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks?.find((t: any) => t.id === taskId);
    setDraggingTaskId(null);
    setActiveDropCol(null);
    if (task && task.status !== status) {
      await updateTask.mutateAsync({
        id: task.id,
        title: task.title,
        description: task.description,
        status,
        priority: (task.priority || "medium") as any,
        user_id: task.user_id,
        organization_id: task.organization_id,
        project_id: task.project_id,
        team_id: task.team_id,
      });
      toast.info(`Task status updated to ${status}!`);
    }
  };

  // Select active project if none selected yet
  const activeProjects = projects?.filter((p: any) => !p.deleted_at) || [];
  const currentProjectId = selectedProjectId || activeProjects[0]?.id || "";
  const currentProject = projects?.find((p: any) => p.id === currentProjectId);

  // Filter tasks for active project
  const projectTasks = tasks?.filter((t: any) => {
    if (t.project_id !== currentProjectId) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  }) || [];

  // Group tasks by status
  const backlogTasks = projectTasks.filter((t: any) => t.status === "backlog");
  const todoTasks = projectTasks.filter((t: any) => t.status === "todo");
  const inProgressTasks = projectTasks.filter((t: any) => t.status === "in_progress");
  const doneTasks = projectTasks.filter((t: any) => t.status === "done");

  // Project Logged Time Helper
  const getProjectTime = (projId: string) => {
    const logs = rawLogs?.filter((l: any) => l.project_id === projId) || [];
    const totalMs = logs.reduce((acc, log) => {
      const diff = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const requestConfirmation = (title: string, description: string, onConfirm: () => void) => {
    showConfirm({ title, description, onConfirm });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)] overflow-hidden w-full">
      
      {/* Left Pane: Project List */}
      <section className="w-full lg:w-60 border-r border-outline-variant flex flex-col bg-surface-container-lowest shrink-0" aria-label="Project Scope Catalog">
        <div className="p-unit-3 flex justify-between items-center border-b border-outline-variant/30">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <FolderDot className="h-3.5 w-3.5 text-primary" /> Projects
          </h2>
          <button 
            onClick={() => setIsNewProjectOpen(true)}
            className="text-primary hover:bg-primary/10 p-1 rounded transition-all active:scale-95" 
            title="New Project"
            aria-label="Create New Project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Add Project Inline Form */}
        {isNewProjectOpen && (
          <div className="p-unit-3 bg-surface-container-low border-b border-outline-variant/30 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-outline">Project Name</label>
              <input 
                type="text" 
                placeholder="e.g. Mobile Application"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-[11px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-outline">Description</label>
              <input 
                type="text" 
                placeholder="Brief details..."
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-[11px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button 
                onClick={() => setIsNewProjectOpen(false)}
                className="px-2 py-0.5 text-[10px] font-bold border border-outline-variant rounded hover:bg-surface-container-high text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newProjectName.trim()) {
                    toast.warning("Project name cannot be empty.");
                    return;
                  }
                  await createProject.mutateAsync({
                    name: newProjectName,
                    description: newProjectDesc,
                    organization_id: organizationId,
                    userId
                  });

                }}
                disabled={createProject.isPending}
                className="px-2 py-0.5 text-[10px] font-bold bg-primary text-on-primary rounded hover:brightness-105 flex items-center gap-1"
              >
                {createProject.isPending && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingProjects ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-outline" />
            </div>
          ) : (
            projects?.map((project: any) => {
              const isSelected = project.id === currentProjectId;
              const hasDeleted = !!project.deleted_at;
              return (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`p-unit-3 border-b border-outline-variant/10 cursor-pointer transition-all relative group flex flex-col ${
                    isSelected 
                      ? "bg-secondary-container/10 border-l-2 border-l-primary" 
                      : "hover:bg-surface-container-low"
                  }`}
                  role="button"
                  aria-selected={isSelected}
                  tabIndex={0}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold truncate max-w-[140px] ${isSelected ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                      {project.name}
                    </span>
                    {!hasDeleted && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          requestConfirmation(
                            "Archive this project scope?",
                            "Archiving a project will remove it from the primary display list, but its logged hours are preserved.",
                            () => deleteProject.mutateAsync({ id: project.id })
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-error-container/20 rounded text-outline hover:text-red-400 transition-all inline-block focus:opacity-100"
                        title="Archive Project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  
                  {project.description && (
                    <p className="text-[10px] text-outline truncate max-w-[160px] mt-0.5">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-mono-timer mt-1">
                    <Clock className="h-3 w-3 text-outline" />
                    <span>{getProjectTime(project.id)}</span>
                  </div>
                </div>
              );
            })
          )}
          {projects?.length === 0 && (
            <div className="p-unit-4 text-center text-outline text-[11px]">
              No projects. Click Plus to create one!
            </div>
          )}
        </div>
      </section>

      {/* Right Pane: Tasks Board */}
      <section className="flex-1 flex flex-col bg-surface min-w-0 overflow-hidden" aria-label="Deliverables Workspace">
        {currentProject ? (
          <>
            {/* Detail Header with View Switcher */}
            <div className="p-unit-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-unit-3 shrink-0">
              <div>
                <div className="flex items-center gap-unit-1.5 text-on-surface-variant text-[11px] mb-unit-1">
                  <span>Projects</span>
                  <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  <span className="text-primary font-semibold">{currentProject.name}</span>
                </div>
                <h2 className="text-body-lg font-extrabold text-on-surface">
                  {currentProject.description || "Active Deliverables"}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant">
                  <button
                    onClick={() => setViewMode("kanban")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "kanban" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    title="Kanban Board View"
                    aria-label="Kanban Board View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    title="Tabular List View"
                    aria-label="Tabular List View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 border border-outline-variant rounded-lg bg-surface-container-low text-xs">
                  <Filter className="h-3 w-3 text-outline" />
                  <select 
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-[11px] text-on-surface-variant font-medium cursor-pointer"
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low Rank</option>
                    <option value="medium">Medium Rank</option>
                    <option value="high">High Rank</option>
                  </select>
                </div>

                <button 
                  onClick={() => {
                    resetTaskForm();
                    setIsNewTaskOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </button>
              </div>
            </div>

            {/* Scrollable Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {viewMode === "kanban" ? (
                /* KANBAN BOARD VIEW */
                <div className="flex-1 flex flex-col overflow-hidden p-unit-4 gap-unit-4 animate-in fade-in duration-300">
                  {/* Kanban Columns */}
                  <div className="flex-1 flex gap-unit-4 overflow-x-auto pb-unit-2 custom-scrollbar min-h-0">
                    {[
                      { id: "todo", title: "To Do", tasks: todoTasks },
                      { id: "in_progress", title: "In Progress", tasks: inProgressTasks },
                      { id: "done", title: "Completed", tasks: doneTasks }
                    ].map((col) => (
                      <div 
                        key={col.id}
                        className={`flex-shrink-0 w-80 flex flex-col h-full transition-all duration-300 ${
                          activeDropCol === col.id ? "scale-[1.01]" : ""
                        }`}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setActiveDropCol(col.id)}
                        onDragLeave={(e) => {
                          if (activeDropCol === col.id) setActiveDropCol(null);
                        }}
                        onDrop={(e) => handleDrop(e, col.id as any)}
                      >
                        <div className="flex items-center justify-between mb-unit-3 px-unit-1">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{col.title}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
                            {col.tasks.length}
                          </span>
                        </div>

                        {/* Column Container Zone with absolute pointer isolation during drag state mapping */}
                        <div className={`flex-1 space-y-unit-2 overflow-y-auto custom-scrollbar p-2 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-[150px] ${
                          activeDropCol === col.id 
                            ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(192,193,255,0.15)] scale-[1.002]" 
                            : "bg-surface-container-lowest/30 border-outline-variant/30"
                        } ${draggingTaskId ? "[&>*]:pointer-events-none" : ""}`}>
                          {col.tasks.map((task: any) => (
                            <div 
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => onSelectTask?.(task)}
                              className={`p-unit-3 border rounded-lg hover:border-outline hover:shadow-md hover:-translate-y-[2px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary pointer-events-auto ${
                                draggingTaskId === task.id 
                                  ? "opacity-30 scale-95 border-primary border-dashed bg-surface-container-high shadow-inner" 
                                  : "bg-surface-container-low border-outline-variant"
                              }`}
                              tabIndex={0}
                            >
                              <div className="flex justify-between items-start mb-unit-1">
                                <span className={`text-xs font-bold text-on-surface group-hover:text-primary transition-colors ${col.id === 'done' ? 'line-through decoration-outline opacity-80' : ''}`}>
                                  {task.title}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTask(task);
                                    }}
                                    className="p-0.5 hover:bg-surface-container-high rounded text-outline hover:text-on-surface cursor-pointer"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestConfirmation(
                                        "Delete task permanently?",
                                        `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
                                        () => deleteTask.mutateAsync({ id: task.id })
                                      );
                                    }} 
                                    className="p-0.5 hover:bg-error-container/20 rounded text-outline hover:text-red-400 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-[11px] text-on-surface-variant mb-unit-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/10">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full bg-secondary-container flex items-center justify-center text-[8px] font-bold text-on-secondary-container border border-outline-variant">
                                    {users?.find((u: any) => u.id === task.user_id)?.name?.slice(0, 2).toUpperCase() || "ME"}
                                  </div>
                                  <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    task.priority === "high" ? "bg-error-container/20 text-error" : "bg-surface-container-high text-on-surface-variant"
                                  }`}>
                                    {task.priority || "MEDIUM"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {col.tasks.length === 0 && (
                            <div className="h-full flex items-center justify-center text-outline text-[10px] text-center p-6">
                              Drag tasks here
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Independent Scrollable Backlog Panel */}
                  <div 
                    className={`border-t pt-unit-3 flex flex-col shrink-0 h-44 rounded-xl p-3 border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      activeDropCol === "backlog" 
                        ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(192,193,255,0.15)] scale-[1.002]" 
                        : "bg-surface-container-lowest/20 border-outline-variant/30"
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => setActiveDropCol("backlog")}
                    onDragLeave={() => {
                      if (activeDropCol === "backlog") setActiveDropCol(null);
                    }}
                    onDrop={(e) => handleDrop(e, "backlog")}
                  >
                    <div className="flex items-center justify-between mb-unit-2 px-unit-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Project Backlog</h3>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
                          {backlogTasks.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-outline font-semibold">Drag tasks back and forth here</span>
                    </div>

                    {/* Isolated layout space matching the columns configuration */}
                    <div className={`flex-1 overflow-x-auto flex gap-unit-3 pb-unit-1 custom-scrollbar items-center ${draggingTaskId ? "[&>*]:pointer-events-none" : ""}`}>
                      {backlogTasks.map((task: any) => (
                        <div 
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectTask?.(task)}
                          className={`flex-shrink-0 w-64 p-unit-3 border rounded-lg hover:border-outline hover:shadow-md hover:-translate-y-[2px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary pointer-events-auto ${
                            draggingTaskId === task.id 
                              ? "opacity-30 scale-95 border-primary border-dashed bg-surface-container-high shadow-inner" 
                              : "bg-surface-container-low border-outline-variant"
                          }`}
                          tabIndex={0}
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate max-w-[140px]">
                              {task.title}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}
                                className="p-0.5 hover:bg-surface-container-high rounded text-outline hover:text-on-surface cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestConfirmation(
                                    "Delete task permanently?",
                                    `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
                                    () => deleteTask.mutateAsync({ id: task.id })
                                  );
                                }} 
                                className="p-0.5 hover:bg-error-container/20 rounded text-outline hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-on-surface-variant line-clamp-1 mb-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center text-[9px] text-outline">
                            <span>Priority: <span className="font-bold uppercase text-on-surface-variant">{task.priority || "MEDIUM"}</span></span>
                            <div className="w-4 h-4 rounded-full bg-secondary-container flex items-center justify-center text-[7px] font-bold text-on-secondary-container border border-outline-variant">
                              {users?.find((u: any) => u.id === task.user_id)?.name?.slice(0, 2).toUpperCase() || "ME"}
                            </div>
                          </div>
                        </div>
                      ))}
                      {backlogTasks.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-outline text-[11px] border border-dashed border-outline-variant/30 rounded-lg p-4">
                          Backlog list is empty. Drag tasks here to unprioritize them.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* TABULAR LIST VIEW */
                <div className="flex-1 overflow-y-auto p-unit-4 custom-scrollbar animate-in fade-in duration-300">
                  <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-left" role="table">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          <th className="p-unit-3" role="columnheader">Task Title</th>
                          <th className="p-unit-3" role="columnheader">Status</th>
                          <th className="p-unit-3" role="columnheader">Priority</th>
                          <th className="p-unit-3" role="columnheader">Assignee</th>
                          <th className="p-unit-3 text-right" role="columnheader">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {projectTasks.map((task: any) => (
                          <tr
                            key={task.id}
                            onClick={() => onSelectTask?.(task)}
                            className="hover:bg-surface-container-lowest/50 hover:text-primary transition-colors cursor-pointer"
                          >
                            <td className="p-unit-3 font-bold text-on-surface">
                              <div className="flex flex-col">
                                <span className={task.status === 'done' ? 'line-through decoration-outline opacity-80' : ''}>
                                  {task.title}
                                </span>
                                {task.description && (
                                  <span className="text-[10px] text-outline font-normal line-clamp-1 mt-0.5">
                                    {task.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-unit-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                task.status === "done" ? "bg-green-500/15 text-green-400" :
                                task.status === "in_progress" ? "bg-primary/20 text-primary" :
                                task.status === "backlog" ? "bg-surface-container-highest text-outline" : "bg-secondary-container/20 text-on-secondary-container"
                              }`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="p-unit-3">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                task.priority === "high" ? "bg-error-container/20 text-error" : "bg-surface-container-high text-on-surface-variant"
                              }`}>
                                {task.priority || "MEDIUM"}
                              </span>
                            </td>
                            <td className="p-unit-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-secondary-container flex items-center justify-center text-[8px] font-bold text-on-secondary-container border border-outline-variant">
                                  {users?.find((u: any) => u.id === task.user_id)?.name?.slice(0, 2).toUpperCase() || "ME"}
                                </div>
                                <span className="text-[11px] font-medium text-on-surface-variant">
                                  {users?.find((u: any) => u.id === task.user_id)?.name || "Me"}
                                </span>
                              </div>
                            </td>
                            <td className="p-unit-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTask(task);
                                  }}
                                  className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-on-surface cursor-pointer"
                                  aria-label="Edit Task"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestConfirmation(
                                      "Delete task permanently?",
                                      `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
                                      () => deleteTask.mutateAsync({ id: task.id })
                                    );
                                  }} 
                                  className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400"
                                  aria-label="Delete Task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {projectTasks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-outline font-medium">
                              No tasks in this project scope. Click Add Task to instantiate deliverables!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Collapsed Metric Footer */}
              <div className="px-unit-4 py-unit-2 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-xs shrink-0 font-medium">
                <span className="text-on-surface-variant flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Active scope tracked time
                </span>
                <span className="font-mono-timer font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {getProjectTime(currentProjectId)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4">
            <FolderPlus className="h-12 w-12 text-outline animate-pulse" />
            <h3 className="text-headline-sm font-bold">No projects instantiated</h3>
            <p className="text-outline text-body-sm max-w-sm">
              Create a new project scope in the left pane to begin building tasks boards and tracking time deliverables!
            </p>
          </div>
        )}
      </section>

      {/* Task Modal Dialogue Dialog */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="bg-surface border border-outline-variant rounded-xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
              <h3 className="text-headline-sm font-bold text-on-surface" id="dialog-title">
                {editingTaskId ? "Edit Task Backlog Properties" : "Create New Backlog Task"}
              </h3>
              <button 
                onClick={() => setIsNewTaskOpen(false)}
                className="text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Close dialog"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-error-container/30 border border-error-container text-error rounded-lg font-semibold" role="alert">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block" htmlFor="form-title">Task Title</label>
                <input 
                  type="text" 
                  id="form-title"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Refactor API endpoints"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block" htmlFor="form-desc">Task Description</label>
                <textarea 
                  rows={3}
                  id="form-desc"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Analyze DB leaks, connections and transaction lock locks..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase block" htmlFor="form-status">Status</label>
                  <select 
                    id="form-status"
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value as any)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium bg-surface-container-low"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase block" htmlFor="form-priority">Priority</label>
                  <select 
                    id="form-priority"
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as any)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium bg-surface-container-low"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase block" htmlFor="form-assignee">Assignee</label>
                <select 
                  id="form-assignee"
                  value={taskAssignee}
                  onChange={e => setTaskAssignee(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium bg-surface-container-low"
                >
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
                <button 
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-3.5 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createTask.isPending || updateTask.isPending}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {(createTask.isPending || updateTask.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTaskId ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}