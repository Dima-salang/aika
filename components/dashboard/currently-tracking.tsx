"use client";

import React from "react";

interface CurrentlyTrackingProps {
  runningTimer: any;
  runningProject: any;
  timerSeconds: number;
  formatDuration: (seconds: number) => string;
  handleStartTimer: () => void;
  setIsDialogOpen: (isOpen: boolean) => void;
}

export function CurrentlyTracking({
  runningTimer,
  runningProject,
  timerSeconds,
  formatDuration,
  handleStartTimer,
  setIsDialogOpen,
}: CurrentlyTrackingProps) {
  return (
    <div className="col-span-12 lg:col-span-4 bg-surface-container-low border border-outline-variant p-unit-4 rounded-lg flex flex-col justify-between relative overflow-hidden group">
      {runningTimer && (
        <div className="absolute top-0 right-0 p-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="font-label-md text-[10px] uppercase tracking-wider text-primary">
          Currently Tracking
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface mt-1 truncate">
          {runningTimer ? runningTimer.description : "No Active Timer"}
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {runningTimer ? `${runningProject?.name || "Internal"} · Session` : "Ready to log some productive hours?"}
        </p>
      </div>

      <div className="mt-8 flex items-end justify-between">
        <div className="font-mono-timer text-3xl font-medium text-on-surface">
          {runningTimer ? formatDuration(timerSeconds) : "00:00:00"}
        </div>
        
        {runningTimer ? (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="bg-error-container text-on-error-container p-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer active:scale-95"
            title="Stop Timer & Log Time"
          >
            <span className="material-symbols-outlined font-bold text-[20px]" data-icon="stop">
              stop
            </span>
          </button>
        ) : (
          <button
            onClick={handleStartTimer}
            className="bg-primary text-on-primary p-2 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer active:scale-95"
            title="Start New Timer"
          >
            <span className="material-symbols-outlined font-bold text-[20px]" data-icon="play_arrow">
              play_arrow
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
