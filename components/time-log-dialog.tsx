"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, UploadCloud, X, Calendar, Clock, ClipboardList, Check, Sparkles, Folder } from "lucide-react";

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
  tasks: Array<{ id: string; title: string; updated_at?: any }>;
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

  // 1. Sort the tasks so recently updated ones appear first in descending order
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [tasks]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface dark:bg-[#131315] border border-outline-variant rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-unit-6 py-unit-4 border-b border-outline-variant bg-surface-container-lowest select-none">
          <div className="flex items-center gap-unit-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-body-lg font-headline-sm font-bold text-on-surface">
                {initialLog ? "Edit Time Log" : "Log Work Session"}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                Maintain accurate records of logged effort and attach necessary work proof.
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
 
        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-unit-6 py-unit-5 space-y-6 custom-scrollbar">
          {error && (
            <div className="p-3.5 rounded-lg bg-error-container border border-error/20 text-error text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}
 
          {/* Section 1: Core Identification */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="log-title" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
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
                <Label htmlFor="log-project" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Project
                </Label>
                <select
                  id="log-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
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
              <Label htmlFor="log-desc" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Detailed Work Description
              </Label>
              <textarea
                id="log-desc"
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-all"
                placeholder="e.g., Implemented smooth micro-animations and color token sync on the main dashboard cards to enhance overall aesthetics..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Precise Time Window */}
          <div className="p-4 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase text-outline tracking-wider flex items-center gap-1.5 select-none">
              <Clock className="h-3.5 w-3.5 text-primary" /> Logged Time Interval
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="log-start" className="text-[10.5px] font-bold text-on-surface-variant block">
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
                <Label htmlFor="log-end" className="text-[10.5px] font-bold text-on-surface-variant block">
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
  
          {/* Section 3: Context & Evidences */}
          <div className="space-y-4">
            {/* Linked Tasks checklist (descending update order) */}
            {sortedTasks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-outline" /> Link Related Tasks (Recently updated first)
                </Label>
                <div className="max-h-36 overflow-y-auto border border-outline-variant/80 rounded-lg p-2 space-y-1.5 bg-surface-container-low/40 custom-scrollbar">
                  {sortedTasks.map((t) => {
                    const isChecked = selectedTasks.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-surface-container-high text-left text-xs transition-colors duration-100"
                      >
                        <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-primary border-primary text-on-primary shadow-sm' 
                            : 'border-outline bg-surface-container-lowest'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3.5]" />}
                        </div>
                        <span className="text-on-surface font-semibold truncate flex-1">{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
  
            {/* Evidence Upload Area */}
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Attach Screen Evidence Proof
              </Label>
              
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="group cursor-pointer border border-dashed border-outline-variant hover:border-primary rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 bg-surface-container-low hover:bg-primary/[1%] transition-all duration-300 select-none"
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
                <div className="text-center">
                  <span className="text-xs font-bold text-on-surface">
                    Click to select screenshots
                  </span>{" "}
                  <span className="text-xs text-outline font-medium">or drag them here</span>
                </div>
                <p className="text-[10px] text-outline font-medium">PNG or JPEG format up to 10MB</p>
              </div>
  
              {/* Previews */}
              {evidenceList.length > 0 && (
                <div className="grid grid-cols-4 gap-3 pt-1">
                  {evidenceList.map((ev, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square border border-outline-variant rounded-lg overflow-hidden group/item shadow-md"
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
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
 
        {/* Footer */}
        <div className="px-unit-6 py-unit-4 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container-lowest">
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
          <Button onClick={handleSubmit} className="rounded-lg text-xs bg-primary text-on-primary font-bold hover:opacity-90 h-9 cursor-pointer" disabled={loading}>
            {loading ? "Saving..." : initialLog ? "Apply Update" : "Save Log Entry"}
          </Button>
        </div>
 
      </div>
    </div>
  );
}
