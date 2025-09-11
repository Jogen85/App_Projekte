import React from 'react';
import { Card, COLORS } from '../ui';
import { daysBetween, yearStart, yearEnd, fmtDate, clamp } from '../lib';
import type { NormalizedProject } from '../types';

type Props = {
  projects: NormalizedProject[];
  bounds: { minStart: Date; maxEnd: Date; totalDays: number };
  yearOnly: boolean;
  year: number;
};

const Timeline: React.FC<Props> = ({ projects, bounds, yearOnly, year }) => {
  return (
    <Card title="Zeitachse (Gantt‑ähnlich)">
      <div className="space-y-3">
        {projects.map((p) => {
          const s = yearOnly ? new Date(Math.max(yearStart(year).getTime(), p.startD.getTime())) : p.startD;
          const e = yearOnly ? new Date(Math.min(yearEnd(year).getTime(), p.endD.getTime())) : p.endD;
          const startOffset = Math.round((daysBetween(bounds.minStart, s) / bounds.totalDays) * 100);
          const widthPct = Math.max(1, Math.round((daysBetween(s, e) / bounds.totalDays) * 100));
          const color = p.statusNorm === 'done' ? COLORS.slate : p.statusNorm === 'planned' ? COLORS.amber : COLORS.blue;
          return (
            <div key={p.id} className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium">{p.title}</div>
                <div className="text-slate-500">{fmtDate(s)} – {fmtDate(e)}</div>
              </div>
              <div className="w-full h-6 bg-slate-100 rounded">
                <div className="h-6 rounded relative" style={{ marginLeft: `${startOffset}%`, width: `${widthPct}%`, backgroundColor: color }} title={`${fmtDate(s)} – ${fmtDate(e)}`}>
                  {p.statusNorm !== 'planned' && (<div className="absolute top-0 left-0 h-6 bg-black/10 rounded" style={{ width: `${clamp(p.progress, 0, 100)}%` }} aria-hidden />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default Timeline;

