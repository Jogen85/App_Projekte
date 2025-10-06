import React from 'react';
import { daysBetween, clamp, getToday } from '../lib';
import { COLORS } from '../ui';
import type { NormalizedProject } from '../types';

type Props = {
  projects: NormalizedProject[];
  bounds: { minStart: Date; maxEnd: Date; totalDays: number };
  yearOnly: boolean;
  year: number;
};

const statusColor = (status: string) =>
  status === 'done' ? '#334155' : status === 'planned' ? COLORS.amber : COLORS.blue;

const TimelineCompact: React.FC<Props> = ({ projects, bounds }) => {
  const now = getToday();
  const inRange = now >= bounds.minStart && now <= bounds.maxEnd;
  const todayPct = inRange
    ? clamp(Math.round((daysBetween(bounds.minStart, now) / Math.max(1, bounds.totalDays)) * 100), 0, 100)
    : null;

  return (
    <div className="w-full h-kpi flex flex-col justify-center">
      <div className="space-y-1.5">
        {projects.slice(0, 4).map((p) => {
          const startOffset = Math.round((daysBetween(bounds.minStart, p.startD) / bounds.totalDays) * 100);
          const widthPct = Math.max(2, Math.round((daysBetween(p.startD, p.endD) / bounds.totalDays) * 100));
          const color = statusColor(p.statusNorm);
          const isPlanned = p.statusNorm === 'planned';

          return (
            <div key={p.id} className="w-full h-4 bg-slate-100 rounded-sm relative overflow-hidden">
              <div
                className="h-4 rounded-sm"
                style={{
                  marginLeft: `${startOffset}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  backgroundImage: isPlanned
                    ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.45) 0, rgba(245,158,11,0.45) 4px, rgba(245,158,11,0.15) 4px, rgba(245,158,11,0.15) 8px)'
                    : undefined,
                }}
                title={p.title}
              >
                {p.statusNorm === 'active' && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-sm"
                    style={{ width: `${clamp(p.progress, 0, 100)}%`, backgroundColor: 'rgba(96,165,250,0.85)' }}
                  />
                )}
              </div>
              {todayPct !== null && (
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-rose-600"
                  style={{ left: `${todayPct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      {projects.length > 4 && (
        <div className="text-[10px] text-slate-400 text-right mt-1">+{projects.length - 4} weitere</div>
      )}
    </div>
  );
};

export default TimelineCompact;
