import React from "react";
import { TrendingUp, CalendarDays, DollarSign, Target } from "lucide-react";

interface InsightsCardsProps {
  efficiency: string;
  streak: number;
  goalText: string;
}

export function InsightsCards({ efficiency, streak, goalText }: InsightsCardsProps) {
  return (
    <div className="grid grid-cols-12 gap-unit-4 mb-unit-8 select-none">
      
      <div className="col-span-12 md:col-span-4 h-24 bg-surface-container border border-outline-variant rounded-lg p-unit-4 flex items-center gap-unit-4">
        <div className="p-3 bg-primary/10 rounded-full text-primary flex items-center justify-center">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-on-surface-variant uppercase font-label-md">Efficiency</span>
          <span className="text-xl font-semibold text-on-surface">{efficiency}</span>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 h-24 bg-surface-container border border-outline-variant rounded-lg p-unit-4 flex items-center gap-unit-4">
        <div className="p-3 bg-secondary-container/30 rounded-full text-secondary flex items-center justify-center">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-on-surface-variant uppercase font-label-md">Streak</span>
          <span className="text-xl font-semibold text-on-surface">{streak} Days</span>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 h-24 bg-surface-container border border-outline-variant rounded-lg p-unit-4 flex items-center gap-unit-4">
        <div className="p-3 bg-primary-container/20 rounded-full text-primary flex items-center justify-center">
          <Target className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-on-surface-variant uppercase font-label-md">Goal</span>
          <span className="text-xl font-semibold text-on-surface">{goalText}</span>
        </div>
      </div>

    </div>
  );
}
