import React, { useMemo } from 'react';
import type { NormalizedProject } from '../types';
import { today, daysBetween, fmtDate } from '../lib';

export type ProgressDeltaProps = {
  projects: NormalizedProject[];
  height?: number;
  onSelectCategory?: (cat: 'behind' | 'ontrack' | 'ahead') => void;
  selectedCategory?: 'behind' | 'ontrack' | 'ahead' | null;
};

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export default function ProgressDelta({ projects, height = 190, onSelectCategory, selectedCategory = null }: ProgressDeltaProps) {
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

    const t = today;
    for (const p of projects) {
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

    const behind = list.filter(x => x.delta < -10);
    const ontrack = list.filter(x => x.delta >= -10 && x.delta <= 10);
    const ahead = list.filter(x => x.delta > 10);
    const top3 = [...list].sort((a, b) => a.delta - b.delta).slice(0, 3);
    return { behind, ontrack, ahead, top3 };
  }, [projects]);

  return (
    <div className="w-full" style={{ height }}>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
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

      <div className="text-xs text-slate-600 mb-1">Top 3 Verzögerungen</div>
      <div className="space-y-2 overflow-auto" style={{ maxHeight: height - 76 }}>
        {data.top3.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-800">{p.title}</div>
              <div className="text-xs text-slate-500">Fällig: {fmtDate(p.end)} • {p.daysLeft} Tage</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium" style={{ color: p.delta < -10 ? '#dc2626' : p.delta > 10 ? '#16a34a' : '#334155' }}>{p.delta.toFixed(1)} pp</div>
              <div className="text-[11px] text-slate-500">Soll {Math.round(p.soll)}% • Ist {Math.round(p.ist)}%</div>
            </div>
          </div>
        ))}
        {!data.top3.length && (
          <div className="text-xs text-slate-500">Keine Projekte mit Verzögerung.</div>
        )}
      </div>
    </div>
  );
}
