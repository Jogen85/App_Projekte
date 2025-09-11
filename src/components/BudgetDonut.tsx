import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { COLORS } from '../ui';

type Props = {
  spent: number;
  remaining: number;
  height?: number; // px height for the tile chart area
};

export const BudgetDonut: React.FC<Props> = ({ spent, remaining, height = 220 }) => {
  const spentSafe = Math.max(0, spent);
  const remSafe = Math.max(0, remaining);
  const total = Math.max(1, spentSafe + remSafe);
  const pct = Math.round((spentSafe / total) * 100);
  const data = [
    { name: 'Ausgegeben', value: spentSafe },
    { name: 'Verbleibend', value: remSafe },
  ];
  // Threshold coloring: <=90% green, <=105% amber, otherwise red
  const spentColor = spentSafe <= total * 0.9 ? COLORS.green
                   : spentSafe <= total * 1.05 ? COLORS.amber
                   : COLORS.red;
  const outer = Math.min(120, Math.floor(height * 0.42));
  const inner = Math.max(outer - 26, 20);
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="w-full" role="img" aria-label={`Budget Donut, ${pct}% ausgegeben`}>
      <div className="relative mx-auto" style={{ height, maxWidth: height + 60 }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="text-center">
            <div className="text-3xl font-bold leading-tight">{pct}%</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={outer} innerRadius={inner} strokeWidth={0} isAnimationActive animationDuration={700}>
              <Cell fill={spentColor} />
              <Cell fill={COLORS.slate} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
          <span className="text-slate-700">Ausgegeben</span>
          <span className="text-slate-500">{fmt(spentSafe)} ({pct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.slate }} aria-hidden />
          <span className="text-slate-700">Verbleibend</span>
          <span className="text-slate-500">{fmt(remSafe)}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetDonut;
