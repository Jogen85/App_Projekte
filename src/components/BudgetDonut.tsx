import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { COLORS } from '../ui';

type Props = {
  spent: number;
  remaining: number;
  height?: number; // px height for the tile chart area
  yearBudget?: number | null; // Jahresbudget falls konfiguriert
  projectBudgetSum?: number; // Summe der Projektbudgets
};

export const BudgetDonut: React.FC<Props> = ({ spent, remaining, yearBudget, projectBudgetSum }) => {
  const spentSafe = Math.max(0, spent);
  const budgetPlanned = spentSafe + remaining; // Original budget
  const isOverBudget = remaining < 0;

  // Bei Überschreitung: Zeige vollen Kreis (100% = Budget) + Überschreitungs-Segment
  const overspend = isOverBudget ? Math.abs(remaining) : 0;
  const spentWithinBudget = isOverBudget ? budgetPlanned : spentSafe;
  const remainingSafe = Math.max(0, remaining);

  // Neue Logik: Verbleibend = wichtig (grün/gelb/rot), Ausgegeben = neutral (blau)
  const remainingPct = (remainingSafe / Math.max(1, budgetPlanned)) * 100;
  const spentPct = Math.round((spentSafe / Math.max(1, budgetPlanned)) * 100);

  const remainingColor = remainingPct > 20 ? COLORS.green   // >20% frei = gut
                       : remainingPct > 10 ? COLORS.amber   // 10-20% frei = Warnung
                       : COLORS.red;                         // <10% frei = kritisch
  const spentColor = COLORS.blue;  // immer blau (neutral)
  const overspendColor = '#991b1b'; // red-800 for overspend

  const data = isOverBudget
    ? [
        { name: 'Ausgegeben', value: spentWithinBudget },
        { name: 'Überschreitung', value: overspend },
      ]
    : [
        { name: 'Verbleibend', value: remainingSafe },
        { name: 'Ausgegeben', value: spentSafe },
      ];

  const total = budgetPlanned + overspend;
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  const chartHeight = 150;
  const outer = 60;
  const inner = 40;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const name = String(item.name).toLowerCase();
      let pct: number;

      if (name.includes('überschreitung')) {
        pct = Math.round((overspend / Math.max(1, total)) * 100);
      } else if (name.includes('verbleibend')) {
        pct = Math.round((remainingSafe / Math.max(1, total)) * 100);
      } else {
        pct = isOverBudget
          ? Math.round((spentWithinBudget / Math.max(1, total)) * 100)
          : Math.round((spentSafe / Math.max(1, total)) * 100);
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
    <div className="w-full h-full flex flex-col overflow-hidden" role="img" aria-label={`Budget Donut, Ausgegeben ${spentPct} Prozent${isOverBudget ? ', Überschreitung' : ''}`}>
      <div className="relative flex-shrink-0" style={{ height: chartHeight, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={outer} innerRadius={inner} strokeWidth={0} isAnimationActive animationDuration={700}>
              <Cell fill={isOverBudget ? spentColor : remainingColor} />
              <Cell fill={isOverBudget ? overspendColor : spentColor} />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 mt-2">
        {isOverBudget && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-red-800">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Budget überschritten: {fmt(overspend)} ({Math.round((overspend / budgetPlanned) * 100)}%)</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-xs flex-shrink-0">
          {isOverBudget ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
                <span className="text-slate-700">{"Ausgegeben"}</span>
                <span className="text-slate-500">{fmt(spentSafe)} ({spentPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: overspendColor }} aria-hidden />
                <span className="text-slate-700">{"Überschreitung"}</span>
                <span className="text-red-600 font-medium">{fmt(overspend)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: remainingColor }} aria-hidden />
                <span className="text-slate-700 font-medium">{"Verbleibend"}</span>
                <span className="text-slate-800 font-medium">{fmt(remainingSafe)} ({Math.round(remainingPct)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
                <span className="text-slate-700">{"Ausgegeben"}</span>
                <span className="text-slate-500">{fmt(spentSafe)} ({spentPct}%)</span>
              </div>
            </>
          )}
        </div>

        {yearBudget !== null && yearBudget !== undefined && projectBudgetSum !== undefined && (
          <div className="flex items-center justify-center text-xs text-slate-600 mt-2 flex-shrink-0">
            <span className="font-medium">Projektbudgets geplant:</span>
            <span className="ml-1">{fmt(projectBudgetSum)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetDonut;
