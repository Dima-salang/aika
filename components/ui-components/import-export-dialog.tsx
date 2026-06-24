"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Info, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExcelStrategy } from "@/services/import-export/ExcelStrategy";
import { utils, write } from "xlsx";
import { ImportedLog } from "@/services/import-export/types";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  organizationId: string;
  teamId: string | null;
  onSuccess: () => void;
  currentLogs: any[]; // Logs in current page or all logs to export
}

export function ImportExportDialog({
  isOpen,
  onClose,
  userId,
  organizationId,
  teamId,
  onSuccess,
  currentLogs,
}: ImportExportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<{
    successCount: number;
    errors: Array<{ row: number; error: string }>;
    logs: ImportedLog[];
  } | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const importLogsMutation = trpc.importLogs.useMutation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        dropzoneRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Enter") {
        if (parsedResult && parsedResult.logs.length > 0 && !isSubmitting) {
          const activeTag = document.activeElement?.tagName.toLowerCase();
          if (activeTag !== "button") {
            e.preventDefault();
            handleConfirmImport();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, parsedResult, isSubmitting]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);
    setParsedResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      if (data) {
        try {
          const strategy = new ExcelStrategy();
          const result = await strategy.import(data as ArrayBuffer);
          setParsedResult(result);
        } catch (err: any) {
          toast.error(err.message || "Failed to parse file.");
          setFile(null);
        }
      }
      setIsParsing(false);
    };
    reader.onerror = () => {
      toast.error("Error reading file.");
      setIsParsing(false);
      setFile(null);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.logs.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await importLogsMutation.mutateAsync({
        userId,
        organizationId,
        teamId,
        logs: parsedResult.logs,
      });

      if (res) {
        const errorCount = res.errors.length;
        if (errorCount > 0) {
          toast.warning(`Imported ${res.successCount} logs. ${errorCount} failed.`);
        } else {
          toast.success(`Successfully imported all ${res.successCount} logs!`);
        }
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (format: "xlsx" | "csv") => {
    if (!currentLogs || currentLogs.length === 0) {
      toast.error("No logs available to export.");
      return;
    }

    try {
      const strategy = new ExcelStrategy();
      const buffer = await strategy.export(currentLogs, format);
      const blob = new Blob([new Uint8Array(buffer)], {
        type: format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `aika_logs_export.${format}`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Logs exported successfully as ${format.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export logs.");
    }
  };

  const downloadTemplate = () => {
    try {
      const templateData = [
        {
          "Title": "Feature Refactor",
          "Description": "Completed main layout redesign",
          "Start Time": "2026-06-17T10:00:00Z",
          "End Time": "2026-06-17T12:00:00Z",
          "Project Name": "Aika Web",
          "Task Titles": "Task-1",
          "Evidence URLs": "https://example.com/doc.pdf"
        }
      ];

      const worksheet = utils.json_to_sheet(templateData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Template");
      const buffer = write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "aika_logs_template.xlsx");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Spreadsheet template downloaded!");
    } catch (err: any) {
      toast.error("Failed to generate template.");
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="bg-surface border border-outline-variant rounded-xl w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-7xl h-[90vh] max-h-[950px] p-6 z-[100] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-outline-variant/30 pb-3">
          <DialogTitle className="text-body-lg font-extrabold text-on-surface flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import / Export Time Logs
          </DialogTitle>
          <DialogDescription className="text-xs text-outline mt-1">
            Import time log spreadsheet tables or export logged logs activity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Form Controls (Col-span-4) */}
          <div className="lg:col-span-4 space-y-5 overflow-y-auto pr-2 custom-scrollbar max-h-full">
            {/* Format Info & Template Section */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
              <h4 className="text-[11px] font-extrabold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="h-3.5 w-3.5" /> Column Schema Instructions
              </h4>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-on-surface-variant font-medium">
                <div>• <strong>Title</strong> <span className="text-[9px] text-red-500 font-bold">*</span></div>
                <div>• <strong>Description</strong> <span className="text-[9px] text-red-500 font-bold">*</span></div>
                <div>• <strong>Start Time</strong> <span className="text-[9px] text-red-500 font-bold">*</span></div>
                <div>• <strong>End Time</strong> <span className="text-[9px] text-red-500 font-bold">*</span></div>
                <div className="col-span-2">• <strong>Project Name</strong> <span className="text-[9px] text-outline font-bold">(Optional)</span></div>
                <div className="col-span-2">• <strong>Task Titles</strong> <span className="text-[9px] text-outline font-bold">(Optional, comma-split)</span></div>
                <div className="col-span-2">• <strong>Evidence URLs</strong> <span className="text-[9px] text-outline font-bold">(Optional, comma-split)</span></div>
              </div>
              <p className="text-[10px] text-outline pt-1 leading-relaxed">
                Dates can be ISO-8601 strings or native Excel datetime formats.
              </p>
              <button
                onClick={downloadTemplate}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 mt-1 cursor-pointer"
              >
                <Download className="h-3 w-3" /> Download Sample Excel Template
              </button>
            </div>

            {/* Import File Picker */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-on-surface">Import Spreadsheet</h5>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
                className="hidden"
              />
              <div
                ref={dropzoneRef}
                tabIndex={0}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isParsing) fileInputRef.current?.click();
                  }
                }}
                className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl p-5 text-center cursor-pointer transition-colors bg-surface-container-lowest hover:bg-primary/5 flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isParsing ? (
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                ) : (
                  <Upload className="h-7 w-7 text-outline" />
                )}
                <div className="text-xs font-extrabold text-on-surface">
                  {file ? file.name : "Choose CSV or XLSX File"}
                </div>
                <div className="text-[10px] text-outline">
                  {file ? "Click to change file" : "Drop files here or click to browse"}
                </div>
              </div>
            </div>

            {/* Export Panel */}
            <div className="border-t border-outline-variant/30 pt-4 space-y-3">
              <h5 className="text-xs font-bold text-on-surface">Export Logs</h5>
              <p className="text-[10px] text-outline leading-normal">
                Download your logged hours feed as structured spreadsheet sheets.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("xlsx")}
                  className="flex-1 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-on-surface text-xs font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="flex-1 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-on-surface text-xs font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> CSV (.csv)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview Panel (Col-span-8) */}
          <div className="lg:col-span-8 flex flex-col bg-surface-container-low border border-outline-variant rounded-xl p-4 h-full min-h-0">
            <h4 className="text-xs font-bold text-on-surface mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" />
              {parsedResult ? "Import Data Preview" : "Export Feed Preview"}
            </h4>

            {isParsing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-outline">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span>Parsing spreadsheet data...</span>
              </div>
            ) : parsedResult ? (
              /* Import Preview & Error Logs */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center bg-surface-container-lowest p-3 border border-outline-variant rounded-xl mb-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Valid: <strong className="text-green-500">{parsedResult.successCount}</strong> logs</span>
                  </div>
                  {parsedResult.errors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>Errors: <strong>{parsedResult.errors.length}</strong> rows</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                  {parsedResult.errors.map((err, idx) => (
                    <div key={`err-${idx}`} className="p-3 bg-red-500/5 border border-red-500/20 text-red-500 rounded-lg text-[10px] font-mono flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div><strong>Row {err.row}:</strong> {err.error}</div>
                    </div>
                  ))}

                  {parsedResult.logs.map((log, idx) => (
                    <div key={`log-${idx}`} className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg space-y-1 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-on-surface">{log.title}</span>
                        {log.projectName && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{log.projectName}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-outline line-clamp-2">{log.description}</p>
                      <div className="text-[10px] text-outline flex justify-between pt-1">
                        <span>Start: {new Date(log.startTime).toLocaleString()}</span>
                        <span>End: {new Date(log.endTime).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Export Preview */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="text-[11px] text-outline mb-2 font-medium">
                  Displaying feed ready to export ({currentLogs.length} logs):
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                  {currentLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-outline">
                      No logs in the current journal view.
                    </div>
                  ) : (
                    currentLogs.map((log, idx) => (
                      <div key={`exp-${idx}`} className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg space-y-1 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold text-on-surface">{log.title}</span>
                          {log.projectName && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{log.projectName}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-outline line-clamp-2">{log.description}</p>
                        <div className="text-[10px] text-outline flex justify-between pt-1">
                          <span>Start: {new Date(log.start_time).toLocaleString()}</span>
                          <span>End: {new Date(log.end_time).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-outline-variant/30 pt-3 flex gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={isSubmitting || !parsedResult || parsedResult.logs.length === 0}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all focus:outline-none disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
            Confirm Import ({parsedResult?.logs.length || 0})
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
