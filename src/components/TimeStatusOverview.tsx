import React from 'react';
import { daysBetween, getToday } from '../lib';
import type { NormalizedProject } from '../types';

type Props = {
  projects: NormalizedProject[];
  height?: number;
};

const TimeStatusOverview: React.FC<Props> = ({ projects, height = 190 }) => {
  const today = getToday();
  const activeProjects = projects.filter((p) => p.statusNorm === 'active');

  const categorizeProject = (p: NormalizedProject): 'green' | 'amber' | 'red' => {
    const totalDays = Math.max(1, daysBetween(p.startD, p.endD));
    const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(p.startD, today)));
    const expectedProgress = (elapsedDays / totalDays) * 100;
    const actualProgress = p.progress || 0;
    const delta = actualProgress - expectedProgress;
    const daysLeft = Math.round((p.endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Red: Overdue OR severely behind (>15pp)
    if (daysLeft < 0 && actualProgress < 100) return 'red';
    if (delta < -15) return 'red';

    // Amber: Behind schedule (>5pp)
    if (delta < -5) return 'amber';

    // Green: On track or ahead
    return 'green';
  };

  const statusCounts = activeProjects.reduce(
    (acc, p) => {
      const status = categorizeProject(p);
      acc[status]++;
      return acc;
    },
    { green: 0, amber: 0, red: 0 }
  );

  const total = activeProjects.length;

  return (
    <div className="w-full flex flex-col justify-center" style={{ height }}>
      {total === 0 ? (
        <div className="text-sm text-slate-500 text-center">Keine laufenden Projekte</div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-green-500 shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{statusCounts.green}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 font-medium">Im Plan</div>
              <div className="text-xs text-slate-500">{total > 0 ? Math.round((statusCounts.green / total) * 100) : 0}%</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-amber-500 shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{statusCounts.amber}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 font-medium">Verzug</div>
              <div className="text-xs text-slate-500">{total > 0 ? Math.round((statusCounts.amber / total) * 100) : 0}%</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-red-500 shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{statusCounts.red}</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 font-medium">Kritisch</div>
              <div className="text-xs text-slate-500">{total > 0 ? Math.round((statusCounts.red / total) * 100) : 0}%</div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Gesamt: {total} {total === 1 ? 'Projekt' : 'Projekte'}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeStatusOverview;
