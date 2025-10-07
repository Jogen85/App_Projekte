import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { COLORS } from '../ui';

type Props = {
  spent: number;
  remaining: number;
  height?: number; // px height for the tile chart area
  itCostsTotal?: number; // IT-Kosten Summe (laufende Kosten)
  yearBudget?: number | null; // Jahresbudget falls konfiguriert
  projectBudgetSum?: number; // Summe der Projektbudgets (PLAN)
  vdbsBudgetTotal?: number; // VDB-S Budget Summe
};

export const BudgetDonut: React.FC<Props> = ({ spent, remaining, itCostsTotal, yearBudget, projectBudgetSum, vdbsBudgetTotal }) => {
  const itCosts = itCostsTotal || 0;
  const vdbsBudget = vdbsBudgetTotal || 0;
  const spentSafe = Math.max(0, spent);
  const budgetPlanned = spentSafe + remaining; // Original budget
  const projectBudgetPlanned = projectBudgetSum || 0;

  // Wenn IT-Kosten/VDB-S vorhanden: Jahresbudget - IT-Kosten - VDB-S - Projektausgaben = Verbleibend
  const adjustedRemaining = itCosts > 0 || vdbsBudget > 0 ? remaining - itCosts - vdbsBudget : remaining;
  const isOverBudget = adjustedRemaining < 0;

  // PLAN-Ebene: Verplanung prüfen (IT-Kosten + VDB-S + Projektbudgets vs. Jahresbudget)
  const hasYearBudget = yearBudget !== null && yearBudget !== undefined;
  const totalCommitted = itCosts + vdbsBudget + projectBudgetPlanned; // Was ist schon verplant?
  const availableForNewProjects = hasYearBudget ? yearBudget - totalCommitted : 0; // Kann negativ sein (Überplanung)
  const isOverCommitted = hasYearBudget && totalCommitted > yearBudget;

  // Bei Überschreitung: Zeige vollen Kreis (100% = Budget) + Überschreitungs-Segment
  const overspend = isOverBudget ? Math.abs(adjustedRemaining) : 0;
  const remainingSafe = Math.max(0, adjustedRemaining);

  // IST-Ebene (innerer Ring): Ausgaben
  const totalBudget = Math.max(1, budgetPlanned + itCosts + vdbsBudget);
  const remainingPct = (remainingSafe / totalBudget) * 100;
  const spentPct = Math.round((spentSafe / totalBudget) * 100);
  const itCostsPct = Math.round((itCosts / totalBudget) * 100);
  const vdbsPct = Math.round((vdbsBudget / totalBudget) * 100);

  // PLAN-Ebene (äußerer Ring): Verplanung
  const planBudget = hasYearBudget ? yearBudget : totalBudget;
  const itCostsPctPlan = hasYearBudget ? Math.round((itCosts / planBudget) * 100) : itCostsPct;
  const vdbsPctPlan = hasYearBudget ? Math.round((vdbsBudget / planBudget) * 100) : vdbsPct;
  const projectBudgetPctPlan = hasYearBudget ? Math.round((projectBudgetPlanned / planBudget) * 100) : 0;
  const availablePctPlan = hasYearBudget ? Math.round((availableForNewProjects / planBudget) * 100) : 0;

  const remainingColor = remainingPct > 20 ? COLORS.green   // >20% frei = gut
                       : remainingPct > 10 ? COLORS.amber   // 10-20% frei = Warnung
                       : COLORS.red;                         // <10% frei = kritisch
  const spentColor = COLORS.blue;  // immer blau (neutral)
  const itCostsColor = '#6b7280'; // gray-500 (fixe Kosten)
  const vdbsColor = '#f59e0b'; // amber-500 (VDB-S Budget)
  const overspendColor = '#991b1b'; // red-800 for overspend
  const projectBudgetColor = '#7c3aed'; // violet-600 (geplante Projektbudgets)
  const availableColor = isOverCommitted ? '#dc2626' : '#10b981'; // red-600 oder green-500

  // Daten für IST-Ring (innerer Ring)
  const dataInner = isOverBudget
    ? (itCosts > 0 || vdbsBudget > 0)
      ? [
          ...(itCosts > 0 ? [{ name: 'IT-Kosten (fix)', value: itCosts }] : []),
          ...(vdbsBudget > 0 ? [{ name: 'VDB-S Budget', value: vdbsBudget }] : []),
          { name: 'Projekte ausgegeben', value: spentSafe },
          { name: 'Überschreitung', value: overspend },
        ]
      : [
          { name: 'Ausgegeben', value: spentSafe },
          { name: 'Überschreitung', value: overspend },
        ]
    : (itCosts > 0 || vdbsBudget > 0)
      ? [
          ...(itCosts > 0 ? [{ name: 'IT-Kosten (fix)', value: itCosts }] : []),
          ...(vdbsBudget > 0 ? [{ name: 'VDB-S Budget', value: vdbsBudget }] : []),
          { name: 'Projekte ausgegeben', value: spentSafe },
          { name: 'Verbleibend', value: remainingSafe },
        ]
      : [
          { name: 'Verbleibend', value: remainingSafe },
          { name: 'Ausgegeben', value: spentSafe },
        ];

  // Daten für PLAN-Ring (äußerer Ring) - nur wenn Jahresbudget vorhanden
  const dataOuter = hasYearBudget
    ? isOverCommitted
      ? [
          ...(itCosts > 0 ? [{ name: 'IT-Kosten (fix) - Plan', value: itCosts }] : []),
          ...(vdbsBudget > 0 ? [{ name: 'VDB-S Budget - Plan', value: vdbsBudget }] : []),
          { name: 'Projektbudgets geplant', value: projectBudgetPlanned },
          { name: 'Überplanung', value: Math.abs(availableForNewProjects) },
        ]
      : [
          ...(itCosts > 0 ? [{ name: 'IT-Kosten (fix) - Plan', value: itCosts }] : []),
          ...(vdbsBudget > 0 ? [{ name: 'VDB-S Budget - Plan', value: vdbsBudget }] : []),
          { name: 'Projektbudgets geplant', value: projectBudgetPlanned },
          { name: 'Verfügbar für neue Projekte', value: availableForNewProjects },
        ]
    : null;

  const total = totalBudget + overspend;
  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  // Kompakte Formatierung für große Beträge (>= €10.000 → "€40k")
  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 10000) {
      return `€${Math.round(n / 1000)}k`;
    }
    return fmt(n);
  };

  const chartHeight = 150;
  // Nested Donut: Äußerer Ring (PLAN) größer, innerer Ring (IST) kleiner
  const outerOuter = 65; // PLAN Ring außen
  const outerInner = 50; // PLAN Ring innen
  const innerOuter = 45; // IST Ring außen
  const innerInner = 28; // IST Ring innen (Loch in der Mitte)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const name = String(item.name).toLowerCase();
      let pct: number;

      // PLAN-Ring (äußerer Ring)
      if (name.includes('überplanung')) {
        pct = Math.round((Math.abs(availableForNewProjects) / Math.max(1, planBudget)) * 100);
      } else if (name.includes('verfügbar für neue projekte')) {
        pct = availablePctPlan;
      } else if (name.includes('projektbudgets geplant')) {
        pct = projectBudgetPctPlan;
      } else if (name.includes('vdb-s budget - plan')) {
        pct = vdbsPctPlan;
      } else if (name.includes('plan')) {
        pct = itCostsPctPlan;
      }
      // IST-Ring (innerer Ring)
      else if (name.includes('überschreitung')) {
        pct = Math.round((overspend / Math.max(1, total)) * 100);
      } else if (name.includes('verbleibend')) {
        pct = Math.round((remainingSafe / Math.max(1, total)) * 100);
      } else if (name.includes('vdb-s budget')) {
        pct = vdbsPct;
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
            {/* Äußerer Ring (PLAN): Nur wenn Jahresbudget vorhanden */}
            {dataOuter && (
              <Pie data={dataOuter} dataKey="value" nameKey="name" outerRadius={outerOuter} innerRadius={outerInner} strokeWidth={0} isAnimationActive animationDuration={700}>
                {dataOuter.map((entry, index) => {
                  const name = entry.name.toLowerCase();
                  let fill = itCostsColor;
                  if (name.includes('überplanung')) fill = overspendColor;
                  else if (name.includes('verfügbar')) fill = availableColor;
                  else if (name.includes('projektbudgets')) fill = projectBudgetColor;
                  else if (name.includes('vdb-s')) fill = vdbsColor;
                  return <Cell key={`outer-${index}`} fill={fill} />;
                })}
              </Pie>
            )}
            {/* Innerer Ring (IST): Ausgaben */}
            <Pie data={dataInner} dataKey="value" nameKey="name" outerRadius={innerOuter} innerRadius={innerInner} strokeWidth={0} isAnimationActive animationDuration={700}>
              {dataInner.map((entry, index) => {
                const name = entry.name.toLowerCase();
                let fill = COLORS.blue;
                if (name.includes('überschreitung')) fill = overspendColor;
                else if (name.includes('verbleibend')) fill = remainingColor;
                else if (name.includes('it-kosten')) fill = itCostsColor;
                else if (name.includes('vdb-s')) fill = vdbsColor;
                else if (name.includes('projekte') || name.includes('ausgegeben')) fill = spentColor;
                return <Cell key={`inner-${index}`} fill={fill} />;
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

        {/* Legende: 2 Zeilen (Plan / Ist) wenn Jahresbudget vorhanden */}
        <div className="flex flex-col gap-1 text-xs flex-shrink-0">
          {/* PLAN-Zeile (äußerer Ring) */}
          {hasYearBudget && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-slate-600 font-medium">Plan:</span>
              {itCosts > 0 && (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: itCostsColor }} aria-hidden />
                  <span className="text-slate-700">IT-Kosten: {fmtCompact(itCosts)}</span>
                  <span className="text-slate-400">|</span>
                </>
              )}
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectBudgetColor }} aria-hidden />
              <span className="text-slate-700">Projektbudgets: {fmtCompact(projectBudgetPlanned)}</span>
              <span className="text-slate-400">|</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: availableColor }} aria-hidden />
              <span className={isOverCommitted ? "text-red-600 font-medium" : "text-slate-700"}>
                {isOverCommitted ? `Überpl.: ${fmtCompact(Math.abs(availableForNewProjects))}` : `Verfügbar: ${fmtCompact(availableForNewProjects)}`}
              </span>
            </div>
          )}
          {/* IST-Zeile (innerer Ring) */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-slate-600 font-medium">Ist:</span>
            {itCosts > 0 && (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: itCostsColor }} aria-hidden />
                <span className="text-slate-700">IT-Kosten: {fmt(itCosts)}</span>
                <span className="text-slate-400">|</span>
              </>
            )}
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spentColor }} aria-hidden />
            <span className="text-slate-700">Projekte: {fmt(spentSafe)}</span>
            <span className="text-slate-400">|</span>
            {isOverBudget ? (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: overspendColor }} aria-hidden />
                <span className="text-red-600 font-medium">Überschr.: {fmt(overspend)}</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: remainingColor }} aria-hidden />
                <span className="text-slate-800 font-medium">Verbleibend: {fmt(remainingSafe)}</span>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BudgetDonut;
