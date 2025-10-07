import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { COLORS } from '../ui';

type Props = {
  spent: number;
  remaining: number;
  height?: number; // px height for the tile chart area
  itCostsTotal?: number; // IT-Kosten Summe (laufende Kosten)
};

export const BudgetDonut: React.FC<Props> = ({ spent, remaining, itCostsTotal }) => {
  const itCosts = itCostsTotal || 0;
  const spentSafe = Math.max(0, spent);
  const budgetPlanned = spentSafe + remaining; // Original budget

  // Wenn IT-Kosten vorhanden: Jahresbudget - IT-Kosten - Projektausgaben = Verbleibend
  const adjustedRemaining = itCosts > 0 ? remaining - itCosts : remaining;
  const isOverBudget = adjustedRemaining < 0;

  // Bei Überschreitung: Zeige vollen Kreis (100% = Budget) + Überschreitungs-Segment
  const overspend = isOverBudget ? Math.abs(adjustedRemaining) : 0;
  const remainingSafe = Math.max(0, adjustedRemaining);

  // Neue Logik: 3 Segmente wenn IT-Kosten vorhanden
  const totalBudget = Math.max(1, budgetPlanned + itCosts);
  const remainingPct = (remainingSafe / totalBudget) * 100;
  const spentPct = Math.round((spentSafe / totalBudget) * 100);
  const itCostsPct = Math.round((itCosts / totalBudget) * 100);

  const remainingColor = remainingPct > 20 ? COLORS.green   // >20% frei = gut
                       : remainingPct > 10 ? COLORS.amber   // 10-20% frei = Warnung
                       : COLORS.red;                         // <10% frei = kritisch
  const spentColor = COLORS.blue;  // immer blau (neutral)
  const itCostsColor = '#6b7280'; // gray-500 (fixe Kosten)
  const overspendColor = '#991b1b'; // red-800 for overspend

  const data = isOverBudget
    ? itCosts > 0
      ? [
          { name: 'IT-Kosten (fix)', value: itCosts },
          { name: 'Projekte ausgegeben', value: spentSafe },
          { name: 'Überschreitung', value: overspend },
        ]
      : [
          { name: 'Ausgegeben', value: spentSafe },
          { name: 'Überschreitung', value: overspend },
        ]
    : itCosts > 0
      ? [
          { name: 'IT-Kosten (fix)', value: itCosts },
          { name: 'Projekte ausgegeben', value: spentSafe },
          { name: 'Verbleibend', value: remainingSafe },
        ]
      : [
          { name: 'Verbleibend', value: remainingSafe },
          { name: 'Ausgegeben', value: spentSafe },
        ];

  const total = totalBudget + overspend;
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
      } else if (name.includes('it-kosten')) {
        pct = itCostsPct;
      } else {
        pct = Math.round((spentSafe / Math.max(1, total)) * 100);
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
              {data.map((entry, index) => {
                const name = entry.name.toLowerCase();
                let fill = COLORS.blue;
                if (name.includes('überschreitung')) fill = overspendColor;
                else if (name.includes('verbleibend')) fill = remainingColor;
                else if (name.includes('it-kosten')) fill = itCostsColor;
                else if (name.includes('projekte') || name.includes('ausgegeben')) fill = spentColor;
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 mt-2">
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

        <div className="flex items-center justify-center text-xs flex-shrink-0">
          {isOverBudget ? (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {itCosts > 0 && (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: itCostsColor }} aria-hidden />
                  <span className="text-slate-700">IT-Kosten (fix): {fmt(itCosts)} ({itCostsPct}%)</span>
                  <span className="text-slate-400">|</span>
                </>
              )}
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
              <span className="text-slate-700">{itCosts > 0 ? "Projekte" : "Ausgegeben"}: {fmt(spentSafe)} ({spentPct}%)</span>
              <span className="text-slate-400">|</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: overspendColor }} aria-hidden />
              <span className="text-red-600 font-medium">Überschr.: {fmt(overspend)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {itCosts > 0 && (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: itCostsColor }} aria-hidden />
                  <span className="text-slate-700">IT-Kosten (fix): {fmt(itCosts)} ({itCostsPct}%)</span>
                  <span className="text-slate-400">|</span>
                </>
              )}
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
              <span className="text-slate-700">{itCosts > 0 ? "Projekte" : "Ausgegeben"}: {fmt(spentSafe)} ({spentPct}%)</span>
              <span className="text-slate-400">|</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: remainingColor }} aria-hidden />
              <span className="text-slate-800 font-medium">Verbleibend: {fmt(remainingSafe)} ({Math.round(remainingPct)}%)</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BudgetDonut;
