import React, { useMemo } from 'react';
import { Card, COLORS } from '../ui';
import { daysBetween, yearStart, yearEnd, fmtDate, clamp, today } from '../lib';
import type { NormalizedProject } from '../types';

type Props = {
  projects: NormalizedProject[];
  bounds: { minStart: Date; maxEnd: Date; totalDays: number };
  yearOnly: boolean;
  year: number;
};

function monthTicks(minStart: Date, maxEnd: Date) {
  const ticks: { d: Date; pct: number; label: string }[] = [];
  const start = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
  let d = start;
  for (let i = 0; i < 48; i++) { // guard
    if (d > maxEnd) break;
    const pct = (daysBetween(minStart, d) / Math.max(1, daysBetween(minStart, maxEnd))) * 100;
    const label = d.toLocaleString('de-DE', { month: 'short' });
    ticks.push({ d: new Date(d), pct, label });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return ticks;
}

const statusColor = (status: string) =>
  status === 'done' ? COLORS.slate : status === 'planned' ? COLORS.amber : COLORS.blue;

const Timeline: React.FC<Props> = ({ projects, bounds, yearOnly, year }) => {
  const inRange = today >= bounds.minStart && today <= bounds.maxEnd;
  const todayPct = inRange
    ? clamp(Math.round((daysBetween(bounds.minStart, today) / Math.max(1, bounds.totalDays)) * 100), 0, 100)
    : null;
  const ticks = useMemo(() => monthTicks(bounds.minStart, bounds.maxEnd), [bounds.minStart, bounds.maxEnd]);

  return (
    <Card title="Zeitachse (Gantt-ähnlich)">
      {/* Legende */}
      <div className="flex justify-end mb-2 gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded" style={{ backgroundColor: COLORS.blue }} />
          <span>Laufend</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-3 rounded"
            style={{
              backgroundColor: COLORS.amber,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(245,158,11,0.45) 0, rgba(245,158,11,0.45) 6px, rgba(245,158,11,0.15) 6px, rgba(245,158,11,0.15) 12px)'
            }}
          />
          <span>Geplant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded opacity-70" style={{ backgroundColor: COLORS.slate }} />
          <span>Abgeschlossen</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-3 rounded border border-white/70" style={{ backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <span>Fortschritt</span>
        </div>
      </div>

      <div className="space-y-3">
        {projects.map((p) => {
          const s = yearOnly ? new Date(Math.max(yearStart(year).getTime(), p.startD.getTime())) : p.startD;
          const e = yearOnly ? new Date(Math.min(yearEnd(year).getTime(), p.endD.getTime())) : p.endD;
          const startOffset = Math.round((daysBetween(bounds.minStart, s) / bounds.totalDays) * 100);
          const widthPct = Math.max(1, Math.round((daysBetween(s, e) / bounds.totalDays) * 100));
          const color = statusColor(p.statusNorm);
          const isPlanned = p.statusNorm === 'planned';
          const isDone = p.statusNorm === 'done';
          const barTitle = `${p.title} • ${fmtDate(s)} – ${fmtDate(e)} • Status: ${p.statusNorm} • Fortschritt: ${clamp(p.progress, 0, 100)}%`;

          return (
            <div key={p.id} className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <div className="font-medium">{p.title}</div>
                <div className="text-slate-500">{fmtDate(s)} – {fmtDate(e)}</div>
              </div>
              <div className="w-full h-6 bg-slate-100 rounded relative overflow-hidden ring-1 ring-slate-200">
                {/* Heute-Marker je Zeile */}
                {todayPct !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-rose-500/80" style={{ left: `${todayPct}%` }} aria-hidden />
                )}
                {/* Projekt-Balken */}
                <div
                  className="h-6 rounded relative ring-1 ring-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  style={{
                    marginLeft: `${startOffset}%`,
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    opacity: isDone ? 0.75 : 1,
                    backgroundImage: isPlanned
                      ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.45) 0, rgba(245,158,11,0.45) 6px, rgba(245,158,11,0.15) 6px, rgba(245,158,11,0.15) 12px)'
                      : undefined,
                  }}
                  title={barTitle}
                  tabIndex={0}
                  aria-label={barTitle}
                >
                  {p.statusNorm !== 'planned' && (
                    <div
                      className="absolute top-0 left-0 h-full rounded border-l border-white/70"
                      style={{ width: `${clamp(p.progress, 0, 100)}%`, backgroundColor: 'rgba(255,255,255,0.35)' }}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Untere Zeitachse mit Monatsticks + Heute-Label */}
      <div className="relative mt-4 h-10">
        <div className="absolute left-0 right-0 top-0 h-px bg-slate-200" aria-hidden />
        {ticks.map((t) => (
          <div key={t.d.toISOString()} className="absolute" style={{ left: `${clamp(Math.round(t.pct), 0, 100)}%` }}>
            <div className="h-2 w-px bg-slate-300" />
            <div className="text-[10px] text-slate-500 mt-1 -translate-x-1/2 select-none">{t.label}</div>
          </div>
        ))}
        {todayPct !== null && (
          <div className="absolute top-[-2px] bottom-0 w-[2px] bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]" style={{ left: `${todayPct}%` }}>
            <div className="absolute -top-5 -left-3 text-[10px] text-rose-600 font-medium select-none">Heute</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Timeline;

