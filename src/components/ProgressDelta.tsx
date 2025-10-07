import React, { useMemo } from 'react';
import type { NormalizedProject } from '../types';
import { getToday, daysBetween } from '../lib';

export type ProgressDeltaProps = {
  projects: NormalizedProject[];
  height?: number;
  onSelectCategory?: (cat: 'behind' | 'ontrack' | 'ahead') => void;
  selectedCategory?: 'behind' | 'ontrack' | 'ahead' | null;
  tolerance?: number; // +/- percentage points for on-track band
  onChangeTolerance?: (t: number) => void;
};

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export default function ProgressDelta({ projects, height = 190, onSelectCategory, selectedCategory = null, tolerance = 10, onChangeTolerance }: ProgressDeltaProps) {
  const data = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      soll: number;
      ist: number;
      delta: number; // ist - soll (Prozentpunkte)
      end: Date;
      daysLeft: number;
      status: string;
    }> = [];

    const t = getToday();
    // Filter nur laufende Projekte (konsistent mit TimeStatusOverview)
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
      list.push({ id: p.id, title: p.title, soll, ist, delta, end: p.endD, daysLeft, status: p.statusNorm });
    }

    const tol = Math.max(0, Math.min(50, tolerance));
    const behind = list.filter(x => x.delta < -tol);
    const ontrack = list.filter(x => x.delta >= -tol && x.delta <= tol);
    const ahead = list.filter(x => x.delta > tol);

    // Berechne durchschnittliches Delta pro Kategorie
    const avgBehind = behind.length > 0 ? behind.reduce((sum, x) => sum + x.delta, 0) / behind.length : 0;
    const avgOntrack = ontrack.length > 0 ? ontrack.reduce((sum, x) => sum + x.delta, 0) / ontrack.length : 0;
    const avgAhead = ahead.length > 0 ? ahead.reduce((sum, x) => sum + x.delta, 0) / ahead.length : 0;

    return {
      behind,
      ontrack,
      ahead,
      avgBehind: Math.round(avgBehind * 10) / 10,
      avgOntrack: Math.round(avgOntrack * 10) / 10,
      avgAhead: Math.round(avgAhead * 10) / 10,
      total: list.length
    };
  }, [projects, tolerance]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden justify-center" style={{ minHeight: height }}>
      <div className="grid grid-cols-3 gap-3 text-center mb-3 flex-shrink-0">
        <button type="button" onClick={() => onSelectCategory?.('behind')} className={`rounded-md py-4 transition-colors ${selectedCategory==='behind' ? 'ring-2 ring-red-400 bg-red-100 text-red-800' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
          <div className="text-xs font-medium">Hinter Plan</div>
          <div className="text-2xl font-bold mt-1">{data.behind.length}</div>
          {data.behind.length > 0 && <div className="text-[11px] text-slate-500 mt-0.5">Ø {data.avgBehind.toFixed(1)}%</div>}
        </button>
        <button type="button" onClick={() => onSelectCategory?.('ontrack')} className={`rounded-md py-4 transition-colors ${selectedCategory==='ontrack' ? 'ring-2 ring-amber-400 bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
          <div className="text-xs font-medium">Im Plan</div>
          <div className="text-2xl font-bold mt-1">{data.ontrack.length}</div>
          {data.ontrack.length > 0 && <div className="text-[11px] text-slate-500 mt-0.5">Ø {data.avgOntrack >= 0 ? '+' : ''}{data.avgOntrack.toFixed(1)}%</div>}
        </button>
        <button type="button" onClick={() => onSelectCategory?.('ahead')} className={`rounded-md py-4 transition-colors ${selectedCategory==='ahead' ? 'ring-2 ring-green-400 bg-green-100 text-green-800' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          <div className="text-xs font-medium">Vor Plan</div>
          <div className="text-2xl font-bold mt-1">{data.ahead.length}</div>
          {data.ahead.length > 0 && <div className="text-[11px] text-slate-500 mt-0.5">Ø +{data.avgAhead.toFixed(1)}%</div>}
        </button>
      </div>
      <div className="flex items-center justify-center mb-3 flex-shrink-0">
        <label className="text-xs text-slate-600 mr-2">Toleranz ±</label>
        <input
          aria-label="Toleranz in Prozentpunkten"
          type="number"
          min={0}
          max={50}
          value={tolerance}
          onChange={(e) => onChangeTolerance?.(Number(e.target.value))}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
        />
        <span className="text-xs text-slate-600 ml-1">pp</span>
      </div>
      <div className="text-center text-sm text-slate-600 mb-2 flex-shrink-0">
        {data.total} laufende{data.total === 1 ? 's' : ''} Projekt{data.total === 1 ? '' : 'e'}
      </div>
      {/* Verteilungsbalken */}
      {data.total > 0 && (
        <div className="flex-shrink-0">
          <div className="flex h-3 rounded-full overflow-hidden border border-slate-200">
            {data.behind.length > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(data.behind.length / data.total) * 100}%` }}
                title={`Hinter Plan: ${Math.round((data.behind.length / data.total) * 100)}%`}
              />
            )}
            {data.ontrack.length > 0 && (
              <div
                className="bg-amber-500"
                style={{ width: `${(data.ontrack.length / data.total) * 100}%` }}
                title={`Im Plan: ${Math.round((data.ontrack.length / data.total) * 100)}%`}
              />
            )}
            {data.ahead.length > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${(data.ahead.length / data.total) * 100}%` }}
                title={`Vor Plan: ${Math.round((data.ahead.length / data.total) * 100)}%`}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{Math.round((data.behind.length / data.total) * 100)}% hinter</span>
            <span>{Math.round((data.ontrack.length / data.total) * 100)}% im</span>
            <span>{Math.round((data.ahead.length / data.total) * 100)}% vor Plan</span>
          </div>
        </div>
      )}
    </div>
  );
}
