"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AlertCircle, UploadCloud, X, Calendar, Clock, ClipboardList, Check, Sparkles, Folder, Kanban, Link as LinkIcon, Trash2, Loader2, FileText, Globe, Lock } from "lucide-react";
import { isSupportedMimeType, formatErrorMessage } from "@/utils/file";
import { useImageViewer } from "@/utils/image-viewer-store";
import { RichTextEditor } from "@/components/ui-components/rich-text-editor";
import { useTimeLogDraftStore } from "@/lib/store";

import type { CreateLogInput } from "@/db/schema";

export type FileEvidence = NonNullable<CreateLogInput["evidence"]>[number] & {
  previewUrl?: string;
};

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
    isPublic: boolean;
  }) => Promise<void>;
  tasks: Array<{ id: string; title: string; project_id?: string | null; status: string; description?: string | null; updated_at?: any }>;
  projects: Array<{ id: string; name: string }>;
  initialLog?: any;
  isTimerStop?: boolean;
  onDiscard?: () => void;
  organizationId?: string;
}

export function TimeLogDialog({ isOpen, onClose, onSubmit, tasks = [], projects = [], initialLog, isTimerStop, onDiscard, organizationId }: TimeLogDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [evidenceList, setEvidenceList] = useState<FileEvidence[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const skipSaveRef = useRef(false);
  const activeLogKeyRef = useRef<string>("new");
  const { drafts, setDraft, clearDraft } = useTimeLogDraftStore();

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

  const [lastInitialLogId, setLastInitialLogId] = useState<string | null>(null);
  const [lastIsOpen, setLastIsOpen] = useState(false);

  useEffect(() => {
    const initialId = initialLog?.id || null;
    if (isOpen && (!lastIsOpen || (initialId !== lastInitialLogId))) {
      setLastIsOpen(true);
      setLastInitialLogId(initialId);

      const currentKey = initialId || "new";
      activeLogKeyRef.current = currentKey;

      // determine the draft
      const draft = !initialLog ? drafts[currentKey] : null;
      if (draft) {
        // ponytail: restore from persisted draft
        setTitle(draft.title || "");
        setDescription(draft.description || "");
        setStartTime(draft.startTime || "");
        setEndTime(draft.endTime || "");
        setProjectId(draft.projectId || "");
        setSelectedTasks(draft.selectedTasks || []);
        setEvidenceList(draft.evidenceList || []);
        setIsPublic(draft.isPublic || false);
      } else {
        setTitle(initialLog?.title || "");
        setDescription(initialLog?.description || "");

        const start = initialLog ? new Date(initialLog.start_time) : new Date(Date.now() - 60 * 60 * 1000);
        const end = initialLog ? new Date(initialLog.end_time) : new Date();
        const offset = start.getTimezoneOffset() * 60000;
        setStartTime(new Date(start.getTime() - offset).toISOString().slice(0, 16));
        setEndTime(new Date(end.getTime() - offset).toISOString().slice(0, 16));

        setProjectId(initialLog?.project_id || "");
        setSelectedTasks((initialLog?.tasks || []).map((t: any) => typeof t === "string" ? t : t.id));

        if (initialLog?.evidence) {
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
        setIsPublic(initialLog?.is_public || false);
      }
      setError(null);
    } else if (!isOpen && lastIsOpen) {
      setLastIsOpen(false);
      setLastInitialLogId(null);
    }
  }, [isOpen, initialLog, lastIsOpen, lastInitialLogId, drafts]);

  useEffect(() => {
    // ponytail: auto-save fields as draft when closing/canceling
    if (!isOpen && lastIsOpen) {
      if (!skipSaveRef.current) {
        setDraft(activeLogKeyRef.current, {
          title,
          description,
          projectId,
          selectedTasks,
          evidenceList,
          isPublic,
          startTime,
          endTime,
        });
      }
      skipSaveRef.current = false;
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setProjectId("");
      setSelectedTasks([]);
      setEvidenceList([]);
      setIsPublic(false);
      setError(null);
    }
  }, [
    isOpen,
    lastIsOpen,
    title,
    description,
    projectId,
    selectedTasks,
    evidenceList,
    isPublic,
    startTime,
    endTime,
    setDraft,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (e.target instanceof HTMLElement) {
        const tagName = e.target.tagName.toLowerCase();
        const isMultiline = tagName === "textarea" || e.target.isContentEditable;
        
        if (!isMultiline || isCmdOrCtrl) {
          if (tagName !== "button" && tagName !== "select") {
            e.preventDefault();
            handleSubmit(e);
          }
        }
      }
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);

    const filesArray = Array.from(files);
    // Filter out unsupported files or files that are too large first to avoid server errors
    const validFiles: File[] = [];
    for (const file of filesArray) {
      if (!isSupportedMimeType(file.type)) {
        setError(`File ${file.name} has unsupported type.`);
        setIsUploading(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too big. Max size is 10MB.`);
        setIsUploading(false);
        return;
      }
      validFiles.push(file);
    }

    setUploadingFiles(validFiles.map((f) => ({ name: f.name, size: f.size })));

    try {
      const formData = new FormData();
      for (const file of validFiles) {
        formData.append("file", file);
      }
      formData.append("organizationId", organizationId || "org-default");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      const uploadedEvidence = data.files.map((fileData: any, idx: number) => {
        const originalFile = validFiles[idx];
        const isImage = originalFile.type.startsWith("image/");
        return {
          fileUrl: fileData.fileUrl,
          fileKey: fileData.fileKey,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          previewUrl: isImage ? URL.createObjectURL(originalFile) : undefined,
        };
      });

      setEvidenceList((prev) => [...prev, ...uploadedEvidence]);
    } catch (err: any) {
      setError(err.message || "Failed to upload files.");
    } finally {
      setUploadingFiles([]);
      setIsUploading(false);
    }
  };

  const removeEvidence = async (index: number) => {
    const ev = evidenceList[index];
    const initialUrls = new Set(
      (initialLog?.evidence || []).map((e: any) => e.file_url || e.fileUrl)
    );
    if (!initialUrls.has(ev.fileUrl)) {
      setIsDeleting(true);
      try {
        await fetch(`/api/upload?fileUrl=${encodeURIComponent(ev.fileUrl)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Failed to delete file:", err);
      } finally {
        setIsDeleting(false);
      }
    }

    setEvidenceList((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  };

  const deleteUploadedEvidence = async (evidences: FileEvidence[]) => {
    const initialUrls = new Set(
      (initialLog?.evidence || []).map((ev: any) => ev.file_url || ev.fileUrl)
    );
    const newEvidences = evidences.filter((ev) => !initialUrls.has(ev.fileUrl));

    if (newEvidences.length === 0) return;

    setIsDeleting(true);
    try {
      const fileUrls = newEvidences.map((ev) => ev.fileUrl);
      await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrls }),
      });
    } catch (err) {
      console.error("Failed to delete files in bulk:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please write a title for what you did.");
      return;
    }

    if (isUploading) {
      setError("Please wait for all file uploads to complete.");
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
        isPublic,
      });
      skipSaveRef.current = true;
      clearDraft(activeLogKeyRef.current);
      onClose();
    } catch (err: any) {
      setError(formatErrorMessage(err));
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
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-7xl h-[90vh] max-h-[950px] flex flex-col bg-surface dark:bg-[#131315] border border-outline-variant rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-unit-6 py-unit-4 border-b border-outline-variant bg-surface-container-lowest select-none shrink-0">
            <div className="flex items-center gap-unit-3">
              <div>
                <h2 className="text-body-lg font-headline-sm font-bold text-on-surface">
                  {initialLog ? "Edit Time Log" : "Log Work Session"}
                </h2>
                <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Maintain accurate records of logged effort, link tasks from the Kanban board, and attach proof.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`p-2 rounded-lg border transition-all cursor-pointer relative group flex items-center justify-center gap-1.5 text-xs font-semibold ${isPublic
                    ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                    : "bg-surface-container border-outline-variant text-outline hover:text-on-surface"
                  }`}
                aria-label={isPublic ? "Public Log" : "Private Log"}
              >
                {isPublic ? (
                  <>
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px]">Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span className="text-[10px]">Private</span>
                  </>
                )}
                {/* Tooltip */}
                <span className="absolute right-0 top-full mt-2 hidden group-hover:block bg-zinc-900 text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                  {isPublic
                    ? "Anyone with the link can view this log details"
                    : "Only organization/team members can view this log"}
                </span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Horizontal Split Body */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0 bg-surface">

            {/* Left Column: Log Details Form */}
            <div className="w-full lg:w-1/2 lg:overflow-y-auto px-4 py-4 sm:px-unit-6 sm:py-unit-6 space-y-6 sm:space-y-8 border-b lg:border-b-0 lg:border-r border-outline-variant/60 custom-scrollbar flex flex-col shrink-0">
              <form id="time-log-form" onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-7 flex-1">
                {error && (
                  <div className="p-3.5 rounded-lg bg-error-container border border-error/20 text-error text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Core Details */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="md:col-span-2 space-y-1">
                      <Input
                        ref={titleInputRef}
                        id="log-title"
                        type="text"
                        className="bg-transparent dark:bg-transparent border-none text-base font-semibold placeholder:text-outline/65 px-0 h-auto focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 shadow-none outline-none focus:bg-transparent dark:focus:bg-transparent"
                        placeholder="Log title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <select
                        id="log-project"
                        value={projectId}
                        onChange={(e) => {
                          setProjectId(e.target.value);
                          setSelectedTasks([]); // Clear linked tasks when project changes
                        }}
                        className="w-full bg-transparent border-none text-xs text-on-surface-variant font-medium px-0 py-1 focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="" className="bg-[#131315]">No Project</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id} className="bg-[#131315]">
                            {proj.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <RichTextEditor
                      key={initialLog?.id || "new"}
                      value={description}
                      onChange={(val) => setDescription(val)}
                      placeholder="Write a description, a task brief, or collect ideas..."
                    />
                  </div>
                </div>

                {/* Time Window */}
                <div className="pt-2 border-t border-outline-variant/30 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider w-16 shrink-0">Start</span>
                      <Input
                        id="log-start"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-transparent border-none text-xs font-mono-timer px-0 h-auto focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 shadow-none text-on-surface"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider w-16 shrink-0">End</span>
                      <Input
                        id="log-end"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="bg-transparent border-none text-xs font-mono-timer px-0 h-auto focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 shadow-none text-on-surface"
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
                        className={`border border-dashed rounded-xl p-3.5 min-h-[90px] flex flex-col justify-center transition-all duration-200 ${snapshot.isDraggingOver
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
                              const tIdStr = typeof tId === "string" ? tId : (tId as any)?.id || "";
                              const t = tasks.find((item) => item.id === tIdStr);
                              const tTitle = t ? t.title : `Task-${tIdStr.slice(0, 4)}`;
                              return (
                                <div
                                  key={tIdStr}
                                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10.5px] font-semibold animate-in zoom-in-95 duration-100"
                                >
                                  <span className="truncate max-w-[130px]">{tTitle}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleTask(tIdStr)}
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
                    Attach Screen Evidence Proof (Optional)
                  </Label>

                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!isUploading) handleFileUpload(e.dataTransfer.files);
                    }}
                    className={`group cursor-pointer border border-dashed border-outline-variant hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-surface-container-low hover:bg-primary/[1%] transition-all duration-300 select-none ${isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      disabled={isUploading}
                    />
                    <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-300">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4 text-outline" />
                      )}
                    </div>
                    <div className="text-center text-[11px]">
                      {isUploading ? (
                        <span className="font-bold text-primary">Uploading files...</span>
                      ) : (
                        <>
                          <span className="font-bold text-on-surface">Click to select files</span>{" "}
                          <span className="text-outline font-medium">or drag here</span>
                        </>
                      )}
                    </div>
                  </div>

                  {(evidenceList.length > 0 || uploadingFiles.length > 0) && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {evidenceList.map((ev, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square border border-outline-variant rounded-lg overflow-hidden group/item shadow bg-zinc-950 flex flex-col justify-center items-center"
                        >
                          {ev.mimeType.startsWith("image/") ? (
                            <img
                              src={ev.previewUrl || ev.fileUrl}
                              alt={ev.fileName}
                              className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                const imageList = evidenceList
                                  .filter((e) => e.mimeType.startsWith("image/"))
                                  .map((e) => e.previewUrl || e.fileUrl);
                                const imgIdx = imageList.indexOf(ev.previewUrl || ev.fileUrl);
                                useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                              }}
                            />
                          ) : (
                            <div
                              className="h-full w-full flex flex-col items-center justify-center bg-surface-container-high/40 p-2 text-center text-on-surface select-none cursor-pointer"
                              onClick={() => {
                                if (ev.fileUrl) window.open(ev.fileUrl, "_blank");
                              }}
                            >
                              <FileText className="h-6 w-6 text-primary mb-1" />
                              <span className="text-[9px] font-bold truncate w-full px-1">{ev.fileName}</span>
                              <span className="text-[7.5px] text-outline mt-0.5">{(ev.fileSize / 1024).toFixed(0)} KB</span>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={() => removeEvidence(idx)}
                              className="p-1 rounded-full bg-black/60 hover:bg-black/80 text-white shadow transition-all cursor-pointer"
                              title="Remove File"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {uploadingFiles.map((uf, idx) => (
                        <div
                          key={`uploading-${idx}`}
                          className="relative aspect-square border border-dashed border-outline-variant/60 rounded-lg overflow-hidden bg-surface-container-high/20 p-2 flex flex-col items-center justify-center text-center animate-pulse select-none"
                        >
                          <Loader2 className="h-5 w-5 text-primary animate-spin mb-1.5" />
                          <span className="text-[9px] font-bold text-outline truncate w-full px-1">{uf.name}</span>
                          <span className="text-[7.5px] text-outline/60 mt-0.5">{(uf.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Kanban board */}
            <div className="w-full lg:w-1/2 flex flex-col bg-surface-container-lowest/40 p-4 sm:p-unit-6 min-h-[450px] lg:min-h-0 overflow-hidden shrink-0 lg:shrink">
              <div className="flex items-center justify-between mb-5 shrink-0">
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
                <div className="flex-1 flex gap-4 overflow-x-auto pb-2 min-h-0 custom-scrollbar">
                  {columns.map((col) => (
                    <div key={col.id} className="flex-shrink-0 w-[185px] flex flex-col h-full bg-surface-container-low/40 border border-outline-variant/40 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
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
                            className={`flex-1 space-y-1.5 overflow-y-auto custom-scrollbar p-0.5 rounded-lg min-h-[100px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""
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
                                      style={providedDraggable.draggableProps.style as React.CSSProperties}
                                      onClick={() => toggleTask(task.id)}
                                      className={`p-2 border rounded-lg hover:border-primary/50 cursor-pointer select-none transition-all text-left group ${isLinked
                                          ? "border-primary bg-primary/[4%] shadow-sm"
                                          : "bg-surface-container border-outline-variant"
                                        } ${snapshotDraggable.isDragging ? "shadow-md scale-[0.98] border-primary" : ""
                                        }`}
                                    >
                                      <div className="flex justify-between items-start gap-1">
                                        <p className={`text-[10.5px] font-semibold leading-snug text-on-surface break-words ${col.id === 'done' ? 'line-through decoration-outline/40 opacity-70' : ''}`}>
                                          {task.title}
                                        </p>
                                        <div className={`h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center transition-all ${isLinked
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
                onClick={() => {
                  skipSaveRef.current = true;
                  clearDraft(activeLogKeyRef.current);
                  onDiscard();
                }}
                disabled={loading || isDeleting}
              >
                Discard Session
              </Button>
            )}
            <Button
              variant="outline"
              type="button"
              className="rounded-lg text-xs font-semibold h-9 border-outline-variant hover:bg-surface-container-high cursor-pointer text-outline hover:text-on-surface mr-auto"
              onClick={async () => {
                await deleteUploadedEvidence(evidenceList);
                setTitle("");
                setDescription("");
                setProjectId("");
                setSelectedTasks([]);
                setEvidenceList([]);
                setIsPublic(false);
                const start = initialLog ? new Date(initialLog.start_time) : new Date(Date.now() - 60 * 60 * 1000);
                const end = initialLog ? new Date(initialLog.end_time) : new Date();
                const offset = start.getTimezoneOffset() * 60000;
                setStartTime(new Date(start.getTime() - offset).toISOString().slice(0, 16));
                setEndTime(new Date(end.getTime() - offset).toISOString().slice(0, 16));
                clearDraft(activeLogKeyRef.current);
              }}
              disabled={loading || isDeleting}
            >
              {isDeleting ? "Clearing..." : "Clear Form"}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="rounded-lg text-xs font-semibold h-9 cursor-pointer"
              onClick={async () => {
                skipSaveRef.current = true;
                await deleteUploadedEvidence(evidenceList);
                clearDraft(activeLogKeyRef.current);
                onClose();
              }}
              disabled={loading || isDeleting}
            >
              {isDeleting ? "Canceling..." : "Cancel"}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="rounded-lg text-xs font-semibold h-9 border-outline-variant bg-surface-container-low hover:bg-surface-container-high cursor-pointer"
              onClick={() => {
                setDraft(activeLogKeyRef.current, {
                  title,
                  description,
                  projectId,
                  selectedTasks,
                  evidenceList,
                  isPublic,
                  startTime,
                  endTime,
                });
                onClose();
              }}
              disabled={loading || isDeleting}
            >
              Save Draft
            </Button>
            <Button type="submit" form="time-log-form" className="rounded-lg text-xs bg-primary text-on-primary font-bold hover:opacity-90 h-9 cursor-pointer" disabled={loading || isDeleting}>
              {loading ? "Saving..." : initialLog ? "Apply Update" : "Save Log Entry"}
            </Button>
          </div>

        </div>
      </div>
    </DragDropContext>
  );
}

