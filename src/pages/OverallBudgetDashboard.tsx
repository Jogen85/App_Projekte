import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import DashboardTabs from '../components/DashboardTabs';
import { Card } from '../ui';
import { getCurrentYear, getToday, plannedBudgetForYearD, costsYTDForYearD, toDate } from '../lib';
import type { Project, ITCost, VDBSBudgetItem, YearBudget } from '../types';
import {
  loadProjects,
  loadITCosts,
  loadVDBSBudget,
  loadYearBudgets,
} from '../db/projectsDb';
import { getITCostsByCategoryD } from '../lib';

export default function OverallBudgetDashboard() {
  const today = getToday();
  const [year, setYear] = useState<number>(getCurrentYear());

  const projects = useLiveQuery(loadProjects, [], [] as Project[]);
  const itCosts = useLiveQuery(loadITCosts, [], [] as ITCost[]);
  const vdbsBudget = useLiveQuery(loadVDBSBudget, [], [] as VDBSBudgetItem[]);
  const yearBudgets = useLiveQuery(loadYearBudgets, [], [] as YearBudget[]);

  const normalizedProjects = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        startD: toDate(p.start),
        endD: toDate(p.end),
      })),
    [projects],
  );

  const projectPlan = useMemo(() => {
    return normalizedProjects.reduce((sum, project) => {
      return sum + plannedBudgetForYearD(project, year);
    }, 0);
  }, [normalizedProjects, year]);

  const projectActual = useMemo(() => {
    return normalizedProjects.reduce((sum, project) => {
      return sum + costsYTDForYearD(project, year);
    }, 0);
  }, [normalizedProjects, year]);

  const yearItCosts = useMemo(() => itCosts.filter((item) => item.year === year), [itCosts, year]);
  const itCostSummary = useMemo(() => getITCostsByCategoryD(yearItCosts, year, today), [yearItCosts, year, today]);
  const vdbsTotal = useMemo(
    () =>
      vdbsBudget
        .filter((item) => item.year === year)
        .reduce((sum, item) => sum + item.budget2026, 0),
    [vdbsBudget, year],
  );

  const yearBudget = yearBudgets.find((yb) => yb.year === year) || null;

  const totalPlanned = projectPlan + itCostSummary.total + vdbsTotal;
  const totalActual = projectActual + itCostSummary.total;
  const budgetRemaining = yearBudget ? yearBudget.budget - totalPlanned : null;
  const budgetDeltaActual = yearBudget ? yearBudget.budget - totalActual : null;

  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const warningPlan = yearBudget && totalPlanned > yearBudget.budget;
  const warningActual = yearBudget && totalActual > yearBudget.budget;

  const years = useMemo(() => {
    const base = getCurrentYear();
    return Array.from({ length: 10 }, (_, i) => base - 5 + i);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-4">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gesamtbudgetplanung</h1>
            <p className="mt-1 text-sm text-gray-600">
              Konsolidierte Übersicht über Projektbudgets, IT-Kosten und VDB-S Budget.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Jahr:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Link
              to="/overall-budget-admin"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Jahresbudget verwalten
            </Link>
          </div>
        </header>

        <DashboardTabs />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card title={`Jahresbudget ${year}`} className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-2xl font-bold text-blue-600">
                {yearBudget ? fmtCurrency(yearBudget.budget) : '—'}
              </div>
              <div className="text-xs text-gray-500">
                {yearBudget ? 'Definiertes Jahresbudget' : 'Kein Jahresbudget hinterlegt'}
              </div>
            </div>
          </Card>

          <Card title="Projektkosten" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Plan</div>
              <div className="text-lg font-semibold text-gray-900">{fmtCurrency(projectPlan)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Ist (YTD)</div>
              <div className="text-lg font-semibold text-blue-600">{fmtCurrency(projectActual)}</div>
            </div>
          </Card>

          <Card title="IT-Kosten" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-2xl font-bold text-gray-900">{fmtCurrency(itCostSummary.total)}</div>
              <div className="text-xs text-gray-500">Summiert für {year}</div>
            </div>
          </Card>

 	        <Card title="VDB-S Budget" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-2xl font-bold text-gray-900">{fmtCurrency(vdbsTotal)}</div>
              <div className="text-xs text-gray-500">Geplante Positionen {year}</div>
            </div>
          </Card>
        </div>

        {(warningPlan || warningActual) && (
          <Card className="border-red-200 bg-red-50">
            <div className="flex flex-col gap-2 text-sm text-red-800">
              <strong>⚠️ Budgetwarnung</strong>
              {warningPlan && yearBudget && (
                <div>
                  Verplante Mittel ({fmtCurrency(totalPlanned)}) übersteigen das Jahresbudget ({fmtCurrency(yearBudget.budget)}).
                </div>
              )}
              {warningActual && yearBudget && (
                <div>
                  Bisherige Ausgaben ({fmtCurrency(totalActual)}) übersteigen das Jahresbudget ({fmtCurrency(yearBudget.budget)}).
                </div>
              )}
            </div>
          </Card>
        )}

        <Card title="Budgetanteile">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Bereich</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Plan ({year})</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Ist ({year})</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 text-gray-800">Projekte</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtCurrency(projectPlan)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(projectActual)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 text-gray-800">IT-Kosten</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtCurrency(itCostSummary.total)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(itCostSummary.total)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 text-gray-800">VDB-S Budget</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{fmtCurrency(vdbsTotal)}</td>
                  <td className="px-3 py-2 text-right text-blue-600">–</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-100">
                <tr className="border-t-2">
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">Summe</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtCurrency(totalPlanned)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-600">
                    {fmtCurrency(totalActual)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {yearBudget && (
          <Card title="Budgetrest & Prognose">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Restbudget (Plan)</div>
                <div className={`text-2xl font-bold ${budgetRemaining !== null && budgetRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {budgetRemaining !== null ? fmtCurrency(budgetRemaining) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Restbudget (Ist)</div>
                <div className={`text-2xl font-bold ${budgetDeltaActual !== null && budgetDeltaActual < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {budgetDeltaActual !== null ? fmtCurrency(budgetDeltaActual) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Projekte gesamt</div>
                <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
