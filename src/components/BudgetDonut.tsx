import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { COLORS } from '../ui';

type Props = {
  spent: number;
  remaining: number;
  height?: number; // px height for the tile chart area
};

export const BudgetDonut: React.FC<Props> = ({ spent, remaining, height = 190 }) => {
  const spentSafe = Math.max(0, spent);
  const budgetPlanned = spentSafe + remaining; // Original budget
  const isOverBudget = remaining < 0;

  // Bei Überschreitung: Zeige vollen Kreis (100% = Budget) + Überschreitungs-Segment
  const overspend = isOverBudget ? Math.abs(remaining) : 0;
  const spentWithinBudget = isOverBudget ? budgetPlanned : spentSafe;
  const remainingSafe = Math.max(0, remaining);

  const data = isOverBudget
    ? [
        { name: 'Ausgegeben (Budget)', value: spentWithinBudget },
        { name: 'Überschreitung', value: overspend },
      ]
    : [
        { name: 'Ausgegeben', value: spentSafe },
        { name: 'Verbleibend', value: remainingSafe },
      ];

  const total = budgetPlanned + overspend;
  const spentPct = Math.round((spentSafe / Math.max(1, budgetPlanned)) * 100);

  // Threshold coloring based on percentage of planned budget
  const spentColor = spentPct <= 90 ? COLORS.green
                   : spentPct <= 105 ? COLORS.amber
                   : COLORS.red;
  const overspendColor = '#991b1b'; // red-800 for overspend

  const outer = Math.min(120, Math.floor(height * 0.42));
  const inner = Math.max(outer - 26, 20);
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const name = String(item.name).toLowerCase();
      let pct: number;

      if (name.includes('überschreitung')) {
        pct = Math.round((overspend / Math.max(1, total)) * 100);
      } else if (name.includes('ausgegeben')) {
        pct = isOverBudget
          ? Math.round((spentWithinBudget / Math.max(1, total)) * 100)
          : Math.round((spentSafe / Math.max(1, total)) * 100);
      } else {
        pct = Math.round((remainingSafe / Math.max(1, total)) * 100);
      }

      return (
        <div className="rounded-md bg-white px-2 py-1 text-xs shadow border border-slate-200">
          <div className="font-medium text-slate-700">{item.name}</div>
          <div className="text-slate-600">{pct}% • {fmt(item.value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" role="img" aria-label={`Budget Donut, Ausgegeben ${spentPct} Prozent${isOverBudget ? ', Überschreitung' : ''}`}>
      <div className="relative mx-auto" style={{ height, maxWidth: height + 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={outer} innerRadius={inner} strokeWidth={0} isAnimationActive animationDuration={700}>
              <Cell fill={spentColor} />
              <Cell fill={isOverBudget ? overspendColor : COLORS.slate} />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {isOverBudget && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-xs text-red-800">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Budget überschritten: {fmt(overspend)} ({Math.round((overspend / budgetPlanned) * 100)}%)</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
          <span className="text-slate-700">{"Ausgegeben"}</span>
          <span className="text-slate-500">{fmt(spentSafe)} ({spentPct}%)</span>
        </div>
        {isOverBudget ? (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: overspendColor }} aria-hidden />
            <span className="text-slate-700">{"Überschreitung"}</span>
            <span className="text-red-600 font-medium">{fmt(overspend)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.slate }} aria-hidden />
            <span className="text-slate-700">{"Verbleibend"}</span>
            <span className="text-slate-500">{fmt(remainingSafe)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetDonut;
