import React, { useMemo } from 'react';
import type { NormalizedProject } from '../types';
import { getToday, daysBetween, fmtDate } from '../lib';

export type ProgressDeltaProps = {
  projects: NormalizedProject[];
  height?: number;
  onSelectCategory?: (cat: 'behind' | 'ontrack' | 'ahead') => void;
  selectedCategory?: 'behind' | 'ontrack' | 'ahead' | null;
  tolerance?: number; // +/- percentage points for on-track band
  onChangeTolerance?: (t: number) => void;
  onSelectProject?: (id: string) => void;
};

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export default function ProgressDelta({ projects, height = 190, onSelectCategory, selectedCategory = null, tolerance = 10, onChangeTolerance, onSelectProject }: ProgressDeltaProps) {
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
    const top3 = [...list].sort((a, b) => a.delta - b.delta).slice(0, 3);
    return { behind, ontrack, ahead, top3 };
  }, [projects, tolerance]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-3 gap-2 text-center mb-2 flex-shrink-0">
        <button type="button" onClick={() => onSelectCategory?.('behind')} className={`rounded-md py-2 transition-colors ${selectedCategory==='behind' ? 'ring-2 ring-red-400 bg-red-100 text-red-800' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
          <div className="text-xs">Hinter Plan</div>
          <div className="text-lg font-semibold">{data.behind.length}</div>
        </button>
        <button type="button" onClick={() => onSelectCategory?.('ontrack')} className={`rounded-md py-2 transition-colors ${selectedCategory==='ontrack' ? 'ring-2 ring-amber-400 bg-amber-100 text-amber-800' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
          <div className="text-xs">Im Plan</div>
          <div className="text-lg font-semibold">{data.ontrack.length}</div>
        </button>
        <button type="button" onClick={() => onSelectCategory?.('ahead')} className={`rounded-md py-2 transition-colors ${selectedCategory==='ahead' ? 'ring-2 ring-green-400 bg-green-100 text-green-800' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          <div className="text-xs">Vor Plan</div>
          <div className="text-lg font-semibold">{data.ahead.length}</div>
        </button>
      </div>
      <div className="flex items-center justify-end mb-2 flex-shrink-0">
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

      <div className="text-xs text-slate-600 mb-1 flex-shrink-0">Top 3 Verzögerungen</div>
      <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {data.top3.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelectProject?.(p.id)} className="w-full flex items-center justify-between gap-3 text-left hover:bg-slate-50 rounded px-1 py-1">
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-800">{p.title}</div>
              <div className="text-xs text-slate-500">Fällig: {fmtDate(p.end)} • {p.daysLeft} Tage</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: p.delta < -10 ? '#dc2626' : p.delta > 10 ? '#16a34a' : '#334155' }}>{p.delta.toFixed(1)}%</div>
              <div className="text-[11px] text-slate-500">Soll {Math.round(p.soll)}% • Ist {Math.round(p.ist)}%</div>
            </div>
          </button>
        ))}
        {!data.top3.length && (
          <div className="text-xs text-slate-500">Keine Projekte mit Verzögerung.</div>
        )}
      </div>
    </div>
  );
}
