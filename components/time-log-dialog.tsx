"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, UploadCloud, X, Calendar, Clock, ClipboardList, Check, Sparkles } from "lucide-react";

interface FileEvidence {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string; // used for local image visual display
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
  tasks: Array<{ id: string; title: string }>;
  projects: Array<{ id: string; name: string }>;
  initialLog?: any; // If editing
}

export function TimeLogDialog({ isOpen, onClose, onSubmit, tasks, projects, initialLog }: TimeLogDialogProps) {
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
  
  // Track open session initialization to avoid resetting on tick re-renders
  const hasInitializedRef = useRef(false);

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
      
      // format to datetime-local string
      const offset = start.getTimezoneOffset() * 60000;
      const localStart = new Date(start.getTime() - offset).toISOString().slice(0, 16);
      const localEnd = new Date(end.getTime() - offset).toISOString().slice(0, 16);
      
      setStartTime(localStart);
      setEndTime(localEnd);
      setProjectId(initialLog.project_id || "");
      setSelectedTasks(initialLog.tasks || []);
      
      // Convert saved evidence or mock it
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
      // Set sensible defaults for new log
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-surface-container border border-outline-variant rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-unit-6 py-unit-4 border-b border-outline-variant">
          <div className="flex items-center gap-unit-3">
            <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-body-lg font-headline-sm font-bold text-on-surface">
                {initialLog ? "Edit Time Log" : "Log My Hours"}
              </h3>
              <p className="text-[11px] text-outline font-medium">
                Tell us what you worked on and show us your work.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
 
        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-unit-6 py-unit-4 space-y-unit-4">
          {error && (
            <div className="p-3.5 rounded bg-error-container border border-error/20 text-error text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}
 
          {/* Task Title */}
          <div className="space-y-1.5">
            <Label htmlFor="log-title" className="text-xs font-bold text-on-surface-variant">
              Task Title
            </Label>
            <Input
              id="log-title"
              type="text"
              className="bg-surface-container-low border-outline-variant text-xs rounded"
              placeholder="e.g. Design System Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="log-desc" className="text-xs font-bold text-on-surface-variant">
              Detailed Description (optional)
            </Label>
            <textarea
              id="log-desc"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-all duration-200"
              placeholder="e.g. Refining the linear-style visual language and token mapping."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
 
          {/* Start and End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-start" className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> When did you start?
              </Label>
              <Input
                id="log-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-surface-container-low border-outline-variant text-xs rounded"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-end" className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-tertiary" /> When did you stop?
              </Label>
              <Input
                id="log-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-surface-container-low border-outline-variant text-xs rounded"
                required
              />
            </div>
          </div>
 
          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="log-project" className="text-xs font-bold text-on-surface-variant">
                Project (optional)
              </Label>
              <select
                id="log-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 px-3 py-1.5 text-xs rounded border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200"
              >
                <option value="" className="bg-surface">None / No Project</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id} className="bg-surface">
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          )}
 
          {/* Tasks Linked checklist */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-outline" /> Select the tasks you worked on
              </Label>
              <div className="max-h-32 overflow-y-auto border border-outline-variant rounded p-2.5 space-y-1 bg-surface-container-low/50">
                {tasks.map((t) => {
                  const isChecked = selectedTasks.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-container-high text-left text-xs transition-colors duration-150"
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-primary border-primary text-on-primary shadow-sm' 
                          : 'border-outline bg-surface-container-lowest'
                      }`}>
                        {isChecked && <Check className="h-2.5 w-2.5 stroke-[3.5]" />}
                      </div>
                      <span className="text-on-surface font-semibold truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
 
          {/* Evidence Upload Area */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-on-surface-variant">
              Upload screenshots / proof of your work
            </Label>
            
            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="group cursor-pointer border border-dashed border-outline-variant hover:border-primary rounded p-6 flex flex-col items-center justify-center gap-2 bg-surface-container-low hover:bg-primary/[1%] transition-all duration-300"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div className="h-10 w-10 rounded-full bg-surface-container-high flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-300">
                <UploadCloud className="h-5 w-5 text-outline" />
              </div>
              <div className="text-center mt-1">
                <span className="text-xs font-bold text-on-surface">
                  Click to select photos
                </span>{" "}
                <span className="text-xs text-outline">or drag them here</span>
              </div>
              <p className="text-[10px] text-outline font-medium">Images up to 10MB each</p>
            </div>
 
            {/* Evidence Previews */}
            {evidenceList.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {evidenceList.map((ev, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square border border-outline-variant rounded overflow-hidden group/item shadow-sm"
                  >
                    <img
                      src={ev.previewUrl}
                      alt={ev.fileName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeEvidence(idx)}
                        className="p-1 rounded bg-white text-black hover:bg-zinc-100 shadow transition-all duration-150"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
 
        {/* Footer */}
        <div className="px-unit-6 py-unit-4 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container-low">
          <Button variant="outline" type="button" className="rounded text-xs font-semibold" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="rounded text-xs bg-primary text-on-primary font-bold hover:opacity-90" disabled={loading}>
            {loading ? "Saving..." : initialLog ? "Apply Update" : "Save Log"}
          </Button>
        </div>
 
      </div>
    </div>
  );
}
