import React, { useMemo } from 'react';
import type { NormalizedProject } from '../types';
import { getToday, daysBetween, fmtDate } from '../lib';

export type ProjectDelaysProps = {
  projects: NormalizedProject[];
  tolerance?: number;
  onSelectProject?: (id: string) => void;
};

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export default function ProjectDelays({ projects, tolerance = 10, onSelectProject }: ProjectDelaysProps) {
  const delays = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      soll: number;
      ist: number;
      delta: number;
      end: Date;
      daysLeft: number;
    }> = [];

    const t = getToday();
    const activeProjects = projects.filter(p => p.statusNorm === 'active');

    for (const p of activeProjects) {
      if (!p.startD || !p.endD) continue;
      const total = Math.max(1, daysBetween(p.startD, p.endD));
      let elapsed = daysBetween(p.startD, t);
      if (t < p.startD) elapsed = 0;
      if (t > p.endD) elapsed = total;
      const soll = clamp((elapsed / total) * 100);
      const ist = clamp(p.progress || 0);
      const delta = Math.round((ist - soll) * 10) / 10;
      const daysLeft = Math.max(0, daysBetween(t, p.endD));

      // Nur verzögerte Projekte (delta < -tolerance)
      const tol = Math.max(0, Math.min(50, tolerance));
      if (delta < -tol) {
        list.push({ id: p.id, title: p.title, soll, ist, delta, end: p.endD, daysLeft });
      }
    }

    // Sortiere nach Delta (schlechteste zuerst)
    return list.sort((a, b) => a.delta - b.delta);
  }, [projects, tolerance]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="text-sm text-slate-600 mb-2 flex-shrink-0">
        {delays.length > 0 ? `${delays.length} verzögerte${delays.length === 1 ? 's' : ''} Projekt${delays.length === 1 ? '' : 'e'}` : 'Keine Verzögerungen'}
      </div>
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {delays.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProject?.(p.id)}
            className="w-full flex items-center justify-between gap-3 text-left hover:bg-slate-50 rounded px-2 py-2 border border-slate-200"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-slate-800 font-medium">{p.title}</div>
              <div className="text-xs text-slate-500">Fällig: {fmtDate(p.end)} • {p.daysLeft} Tage</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-red-600">{p.delta.toFixed(1)}%</div>
              <div className="text-[11px] text-slate-500">Soll {Math.round(p.soll)}% • Ist {Math.round(p.ist)}%</div>
            </div>
          </button>
        ))}
        {delays.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-8">
            Alle laufenden Projekte im Plan! 🎉
          </div>
        )}
      </div>
    </div>
  );
}
