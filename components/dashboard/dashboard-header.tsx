import React from "react";

interface DashboardHeaderProps {
  formattedDate: string;
  thisWeekHours: string;
}

export function DashboardHeader({ formattedDate, thisWeekHours }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-1 select-none">
      <h1 className="font-headline-md text-headline-md text-on-surface">Dashboard</h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        {formattedDate} • You've logged {thisWeekHours}h this week.
      </p>
    </div>
  );
}
