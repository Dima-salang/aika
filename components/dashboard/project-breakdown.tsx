import React from "react";

interface ProjectBreakdownItem {
  id: string;
  name: string;
  hours: string;
  rawHours: number;
  percentage: number;
}

interface ProjectBreakdownProps {
  projectBreakdown: ProjectBreakdownItem[];
  thisWeekHours: string;
}

export function ProjectBreakdown({ projectBreakdown = [], thisWeekHours }: ProjectBreakdownProps) {
  return (
    <div className="col-span-12 lg:col-span-4 bg-surface-container-low border border-outline-variant p-unit-4 rounded-lg flex flex-col justify-between">
      <div>
        <span className="font-label-md text-label-md text-on-surface mb-unit-6 block select-none">
          Project Breakdown
        </span>
        <div className="flex flex-col gap-unit-4">
          {projectBreakdown.length === 0 ? (
            <div className="py-6 text-center text-on-surface-variant/70 text-body-sm">
              No weekly projects recorded.
            </div>
          ) : (
            projectBreakdown.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-body-sm font-medium">
                  <span>{item.name}</span>
                  <span className="text-on-surface-variant font-mono-timer">{item.hours}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-unit-6 pt-unit-4 border-t border-outline-variant flex items-center justify-between select-none">
        <div className="flex flex-col">
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase">
            Total Time
          </span>
          <span className="font-headline-sm text-headline-sm font-bold">
            {thisWeekHours}:00:00
          </span>
        </div>
        <div className="p-2 rounded-full border border-outline-variant hover:bg-surface-container-high cursor-pointer transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </div>
      </div>
    </div>
  );
}
