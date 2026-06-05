"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AlertCircle, UploadCloud, X, Calendar, Clock, ClipboardList, Check, Sparkles, Folder, Kanban, Link as LinkIcon, Trash2 } from "lucide-react";

interface FileEvidence {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string;
}

interface TimeLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    startTime: Date;
    endTime: Date;
    title: string;
    description: string;
    projectId?: string | null;
    taskIds: string[];
    evidence: FileEvidence[];
  }) => Promise<void>;
  tasks: Array<{ id: string; title: string; project_id?: string | null; status: string; description?: string | null; updated_at?: any }>;
  projects: Array<{ id: string; name: string }>;
  initialLog?: any;
  isTimerStop?: boolean;
  onDiscard?: () => void;
}

export function TimeLogDialog({ isOpen, onClose, onSubmit, tasks = [], projects = [], initialLog, isTimerStop, onDiscard }: TimeLogDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [evidenceList, setEvidenceList] = useState<FileEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const hasInitializedRef = useRef(false);

  // Filter tasks based on selected project
  const projectTasks = useMemo(() => {
    if (!projectId) return [];
    return tasks.filter((t) => t.project_id === projectId);
  }, [tasks, projectId]);

  // Group filtered tasks by column
  const columns = useMemo(() => {
    const colBacklog = projectTasks.filter((t) => t.status === "backlog");
    const colTodo = projectTasks.filter((t) => t.status === "todo");
    const colInProgress = projectTasks.filter((t) => t.status === "in_progress");
    const colDone = projectTasks.filter((t) => t.status === "done");

    return [
      { id: "backlog", title: "Backlog", tasks: colBacklog },
      { id: "todo", title: "To Do", tasks: colTodo },
      { id: "in_progress", title: "In Progress", tasks: colInProgress },
      { id: "done", title: "Completed", tasks: colDone },
    ];
  }, [projectTasks]);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (initialLog) {
      setTitle(initialLog.title || "");
      setDescription(initialLog.description || "");
      
      const start = new Date(initialLog.start_time);
      const end = new Date(initialLog.end_time);
      
      const offset = start.getTimezoneOffset() * 60000;
      const localStart = new Date(start.getTime() - offset).toISOString().slice(0, 16);
      const localEnd = new Date(end.getTime() - offset).toISOString().slice(0, 16);
      
      setStartTime(localStart);
      setEndTime(localEnd);
      setProjectId(initialLog.project_id || "");
      setSelectedTasks(initialLog.tasks || []);
      
      if (initialLog.evidence) {
        setEvidenceList(
          initialLog.evidence.map((ev: any) => ({
            fileUrl: ev.file_url,
            fileKey: ev.file_key,
            fileName: ev.file_name,
            fileSize: ev.file_size,
            mimeType: ev.mime_type,
            previewUrl: ev.file_url,
          }))
        );
      } else {
        setEvidenceList([]);
      }
    } else {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const offset = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      const localOneHourAgo = new Date(oneHourAgo.getTime() - offset).toISOString().slice(0, 16);
      
      setTitle("");
      setDescription("");
      setStartTime(localOneHourAgo);
      setEndTime(localNow);
      setProjectId("");
      setSelectedTasks([]);
      setEvidenceList([]);
    }
    setError(null);
  }, [initialLog, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const newEvidence: FileEvidence[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith("image/")) {
        setError(`Please select an image file. Images only.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too big. Max size is 10MB.`);
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      newEvidence.push({
        fileUrl: `https://example.com/uploads/${crypto.randomUUID()}-${file.name}`,
        fileKey: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        previewUrl: localUrl,
      });
    }

    setEvidenceList((prev) => [...prev, ...newEvidence]);
  };

  const removeEvidence = (index: number) => {
    setEvidenceList((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please write a title for what you did.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Please set when you started and stopped.");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      setError("Start time must be before the end time.");
      return;
    }

    if (evidenceList.length === 0) {
      setError("Please upload at least one screenshot or proof photo of your work.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        startTime: start,
        endTime: end,
        title: title.trim(),
        description: description.trim(),
        projectId: projectId || null,
        taskIds: selectedTasks,
        evidence: evidenceList,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (destination.droppableId === "linked-tasks" && source.droppableId !== "linked-tasks") {
      setSelectedTasks((prev) => {
        if (prev.includes(draggableId)) return prev;
        return [...prev, draggableId];
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        
        <div className="relative w-full max-w-6xl h-[88vh] max-h-[900px] flex flex-col bg-surface dark:bg-[#131315] border border-outline-variant rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-unit-6 py-unit-4 border-b border-outline-variant bg-surface-container-lowest select-none shrink-0">
            <div className="flex items-center gap-unit-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-body-lg font-headline-sm font-bold text-on-surface">
                  {initialLog ? "Edit Time Log" : "Log Work Session"}
                </h2>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Maintain accurate records of logged effort, link tasks from the Kanban board, and attach proof.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
    
          {/* Horizontal Split Body */}
          <div className="flex-1 flex overflow-hidden min-h-0 bg-surface">
            
            {/* Left Column: Log Details Form */}
            <div className="w-1/2 overflow-y-auto px-unit-6 py-unit-5 space-y-6 border-r border-outline-variant/60 custom-scrollbar flex flex-col">
              <form id="time-log-form" onSubmit={handleSubmit} className="space-y-5 flex-1">
                {error && (
                  <div className="p-3.5 rounded-lg bg-error-container border border-error/20 text-error text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </div>
                )}
    
                {/* Core Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label htmlFor="log-title" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                        Task Title
                      </Label>
                      <Input
                        id="log-title"
                        type="text"
                        className="bg-surface-container-low border-outline-variant text-xs rounded-lg h-9"
                        placeholder="e.g., UI Refinements & Glassmorphism Updates"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="log-project" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                        Project
                      </Label>
                      <select
                        id="log-project"
                        value={projectId}
                        onChange={(e) => {
                          setProjectId(e.target.value);
                          setSelectedTasks([]); // Clear linked tasks when project changes
                        }}
                        className="w-full h-9 px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                      >
                        <option value="" className="bg-surface">No Project</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id} className="bg-surface">
                            {proj.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
    
                  <div className="space-y-1.5">
                    <Label htmlFor="log-desc" className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                      Detailed Work Description
                    </Label>
                    <textarea
                      id="log-desc"
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-all"
                      placeholder="e.g., Implemented smooth micro-animations and color token sync on the main dashboard cards to enhance overall aesthetics..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
    
                {/* Time Window */}
                <div className="p-4 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl space-y-3">
                  <h4 className="text-[9px] font-extrabold uppercase text-outline tracking-wider flex items-center gap-1.5 select-none">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Logged Time Interval
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="log-start" className="text-[10px] font-bold text-on-surface-variant block">
                        Start Date & Time
                      </Label>
                      <Input
                        id="log-start"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-surface-container-low border-outline-variant text-xs rounded-lg h-9 font-mono-timer"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="log-end" className="text-[10px] font-bold text-on-surface-variant block">
                        End Date & Time
                      </Label>
                      <Input
                        id="log-end"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-surface-container-low border-outline-variant text-xs rounded-lg h-9 font-mono-timer"
                        required
                      />
                    </div>
                  </div>
                </div>
    
                {/* Drag and Drop Drop Zone for Linked Tasks */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" /> Linked Tasks
                  </Label>
                  <Droppable droppableId="linked-tasks">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border border-dashed rounded-xl p-3.5 min-h-[90px] flex flex-col justify-center transition-all duration-200 ${
                          snapshot.isDraggingOver
                            ? "border-primary bg-primary/[3%] shadow-inner"
                            : "border-outline-variant bg-surface-container-low/30"
                        }`}
                      >
                        {selectedTasks.length === 0 ? (
                          <div className="text-center text-outline py-2 select-none">
                            <p className="text-[11px] font-medium">Drag tasks from the Kanban board here to link them.</p>
                            <p className="text-[9px] mt-0.5">Or simply click task cards in the columns to toggle linking.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                            {selectedTasks.map((tId) => {
                              const t = tasks.find((item) => item.id === tId);
                              const tTitle = t ? t.title : `Task-${tId.slice(0, 4)}`;
                              return (
                                <div
                                  key={tId}
                                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10.5px] font-semibold animate-in zoom-in-95 duration-100"
                                >
                                  <span className="truncate max-w-[130px]">{tTitle}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleTask(tId)}
                                    className="p-0.5 rounded-full hover:bg-primary/20 text-primary shrink-0 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
    
                {/* Evidence Upload */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">
                    Attach Screen Evidence Proof
                  </Label>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    className="group cursor-pointer border border-dashed border-outline-variant hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-surface-container-low hover:bg-primary/[1%] transition-all duration-300 select-none"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-300">
                      <UploadCloud className="h-4 w-4 text-outline" />
                    </div>
                    <div className="text-center text-[11px]">
                      <span className="font-bold text-on-surface">Click to select screenshots</span>{" "}
                      <span className="text-outline font-medium">or drag here</span>
                    </div>
                  </div>
      
                  {evidenceList.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {evidenceList.map((ev, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square border border-outline-variant rounded-lg overflow-hidden group/item shadow"
                        >
                          <img
                            src={ev.previewUrl}
                            alt={ev.fileName}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeEvidence(idx)}
                              className="p-1 rounded bg-white text-black hover:bg-zinc-100 shadow transition-all cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
    
            {/* Right Column: Kanban board */}
            <div className="w-1/2 flex flex-col bg-surface-container-lowest/40 p-unit-5 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                  <Kanban className="h-4 w-4 text-primary" /> Kanban Board
                </h3>
                {projectId && (
                  <span className="text-[10px] text-outline font-bold bg-surface-container-high px-2 py-0.5 rounded">
                    {projectTasks.length} Tasks
                  </span>
                )}
              </div>
    
              {!projectId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-outline-variant/60 rounded-xl bg-surface-container-low/10 select-none">
                  <Folder className="h-8 w-8 text-outline/65 mb-2 animate-bounce" />
                  <p className="text-[11px] font-bold text-on-surface-variant">Select a project scope</p>
                  <p className="text-[10px] text-outline max-w-[240px] mt-0.5 leading-relaxed">
                    Once you assign a project on the left form, the related tasks will populate here for drag-and-drop linking.
                  </p>
                </div>
              ) : projectTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-outline-variant/60 rounded-xl bg-surface-container-low/10 select-none">
                  <ClipboardList className="h-8 w-8 text-outline/65 mb-2" />
                  <p className="text-[11px] font-bold text-on-surface-variant">No tasks found</p>
                  <p className="text-[10px] text-outline max-w-[240px] mt-0.5 leading-relaxed">
                    There are no tasks associated with this project. Add some deliverables on the Projects board to log time against them.
                  </p>
                </div>
              ) : (
                /* Kanban Columns Board */
                <div className="flex-1 flex gap-3 overflow-x-auto pb-2 min-h-0 custom-scrollbar">
                  {columns.map((col) => (
                    <div key={col.id} className="flex-shrink-0 w-[170px] flex flex-col h-full bg-surface-container-low/40 border border-outline-variant/40 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-2 shrink-0 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant truncate">
                          {col.title}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant">
                          {col.tasks.length}
                        </span>
                      </div>
    
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 space-y-1.5 overflow-y-auto custom-scrollbar p-0.5 rounded-lg min-h-[100px] transition-colors ${
                              snapshot.isDraggingOver ? "bg-primary/5" : ""
                            }`}
                          >
                            {col.tasks.map((task, index) => {
                              const isLinked = selectedTasks.includes(task.id);
                              return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(providedDraggable, snapshotDraggable) => (
                                    <div
                                      ref={providedDraggable.innerRef}
                                      {...providedDraggable.draggableProps}
                                      {...providedDraggable.dragHandleProps}
                                      onClick={() => toggleTask(task.id)}
                                      className={`p-2 border rounded-lg hover:border-primary/50 cursor-pointer select-none transition-all text-left group ${
                                        isLinked
                                          ? "border-primary bg-primary/[4%] shadow-sm"
                                          : "bg-surface-container border-outline-variant"
                                      } ${
                                        snapshotDraggable.isDragging ? "shadow-md scale-[0.98] border-primary" : ""
                                      }`}
                                    >
                                      <div className="flex justify-between items-start gap-1">
                                        <p className={`text-[10.5px] font-semibold leading-snug text-on-surface break-words ${col.id === 'done' ? 'line-through decoration-outline/40 opacity-70' : ''}`}>
                                          {task.title}
                                        </p>
                                        <div className={`h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center transition-all ${
                                          isLinked 
                                            ? 'bg-primary border-primary text-on-primary' 
                                            : 'border-outline bg-surface-container-lowest'
                                        }`}>
                                          {isLinked && <Check className="h-2 w-2 stroke-[3.5]" />}
                                        </div>
                                      </div>
                                      {task.description && (
                                        <p className="text-[9px] text-outline line-clamp-2 mt-1 leading-normal">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              )}
            </div>
    
          </div>
    
          {/* Footer */}
          <div className="px-unit-6 py-unit-4 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container-lowest shrink-0">
            {isTimerStop && onDiscard && (
              <Button
                variant="outline"
                type="button"
                className="rounded-lg text-xs font-semibold h-9 text-error border-outline-variant hover:bg-error/10 hover:text-error mr-auto cursor-pointer"
                onClick={onDiscard}
                disabled={loading}
              >
                Discard Session
              </Button>
            )}
            <Button variant="outline" type="button" className="rounded-lg text-xs font-semibold h-9 cursor-pointer" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form="time-log-form" className="rounded-lg text-xs bg-primary text-on-primary font-bold hover:opacity-90 h-9 cursor-pointer" disabled={loading}>
              {loading ? "Saving..." : initialLog ? "Apply Update" : "Save Log Entry"}
            </Button>
          </div>
    
        </div>
      </div>
    </DragDropContext>
  );
}

