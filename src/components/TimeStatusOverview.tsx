import React from 'react';
import { daysBetween, getToday } from '../lib';
import type { NormalizedProject } from '../types';
import { ProgressBar } from '../ui';

type Props = {
  projects: NormalizedProject[];
  height?: number;
};

const TimeStatusOverview: React.FC<Props> = ({ projects, height = 190 }) => {
  const today = getToday();
  const activeProjects = projects.filter((p) => p.statusNorm === 'active');

  const getTimeStatus = (p: NormalizedProject): { label: string; color: string; daysLeft: number } => {
    const totalDays = Math.max(1, daysBetween(p.startD, p.endD));
    const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(p.startD, today)));
    const expectedProgress = (elapsedDays / totalDays) * 100;
    const actualProgress = p.progress || 0;
    const delta = actualProgress - expectedProgress;
    const daysLeft = Math.round((p.endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (Math.abs(delta) <= 10) {
      return { label: 'im Plan', color: 'text-green-600', daysLeft };
    }
    if (delta > 10) {
      return { label: 'voraus', color: 'text-blue-600', daysLeft };
    }
    return { label: 'Verzug', color: 'text-red-600', daysLeft };
  };

  return (
    <div className="w-full" style={{ height }}>
      <div className="overflow-y-auto h-full space-y-2">
        {activeProjects.length === 0 && (
          <div className="text-sm text-slate-500">Keine laufenden Projekte</div>
        )}
        {activeProjects.map((p) => {
          const status = getTimeStatus(p);
          const totalDays = Math.max(1, daysBetween(p.startD, p.endD));
          const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(p.startD, today)));
          const timeProgress = (elapsedDays / totalDays) * 100;

          return (
            <div key={p.id} className="flex items-center gap-2 text-xs border-b border-slate-100 pb-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate mb-1" title={p.title}>
                  {p.title}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar value={timeProgress} />
                  </div>
                  <span className={`font-medium ${status.color} whitespace-nowrap`}>
                    {status.label}
                  </span>
                  <span className="text-slate-500 whitespace-nowrap">
                    {status.daysLeft >= 0 ? `T-${status.daysLeft}` : `+${Math.abs(status.daysLeft)}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeStatusOverview;
