import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { YearBudget, Project } from '../types';
import { Card, COLORS } from '../ui';
import PINProtection from '../components/PINProtection';
import {
  loadYearBudgets,
  saveYearBudgets as persistYearBudgets,
  loadProjects,
} from '../db/projectsDb';
import { overlapDays, daysBetween, yearStart, yearEnd } from '../lib';

export default function YearBudgetsAdmin() {
  const [msg, setMsg] = useState<string>('');
  const yearBudgets = useLiveQuery(loadYearBudgets, [], [] as YearBudget[]);
  const projects = useLiveQuery(loadProjects, [], [] as Project[]);

  const updateBudgets = async (updated: YearBudget[]) => {
    try {
      await persistYearBudgets(updated);
      setMsg('Änderungen gespeichert.');
      setTimeout(() => setMsg(''), 2000);
    } catch (error) {
      console.error('Failed to persist year budgets', error);
      setMsg('Speichern fehlgeschlagen.');
    }
  };

  const addYear = () => {
    const maxYear = yearBudgets.reduce((max, y) => Math.max(max, y.year), new Date().getFullYear());
    void updateBudgets([...yearBudgets, { year: maxYear + 1, budget: 0 }]);
  };

  const updateYearBudget = (index: number, value: number) => {
    const next = [...yearBudgets];
    next[index] = { ...next[index], budget: value };
    void updateBudgets(next);
  };

  const updateYear = (index: number, value: number) => {
    const next = [...yearBudgets];
    next[index] = { ...next[index], year: value };
    void updateBudgets(next);
  };

  const removeYear = (index: number) => {
    const next = yearBudgets.filter((_, i) => i !== index);
    void updateBudgets(next);
  };

  const overBudgetWarnings = useMemo(() => {
    return yearBudgets.reduce<string[]>((warnings, yb) => {
      const yearProjects = projects.filter((p) => {
        const startYear = new Date(p.start).getFullYear();
        const endYear = new Date(p.end).getFullYear();
        return startYear <= yb.year && endYear >= yb.year;
      });
      const total = yearProjects.reduce((sum, p) => {
        const startD = new Date(p.start);
        const endD = new Date(p.end);
        const overlap = overlapDays(startD, endD, yearStart(yb.year), yearEnd(yb.year));
        const projDays = Math.max(1, daysBetween(startD, endD));
        return sum + (p.budgetPlanned || 0) * (overlap / projDays);
      }, 0);
      if (total > yb.budget && yb.budget > 0) {
        warnings.push(
          `Jahr ${yb.year}: Projektbudgets (${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(total)}) übersteigen Jahresbudget (${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(yb.budget)})`,
        );
      }
      return warnings;
    }, []);
  }, [projects, yearBudgets]);

  return (
    <PINProtection>
      <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
        <div className="max-w-presentation mx-auto space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin &ndash; Jahresbudgets verwalten</h1>
              <p className="text-sm text-slate-500">
                Budgetwerte für die Gesamtbudgetplanung pflegen.
              </p>
            </div>
            <Link to="/overall-budget" className="text-blue-600 hover:underline">
              Zur Gesamtbudgetplanung
            </Link>
          </header>

          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={addYear}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Weiteres Jahr
              </button>
              {msg && <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-md">{msg}</span>}
            </div>
          </Card>

          {overBudgetWarnings.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <div className="space-y-2 text-sm text-red-800">
                {overBudgetWarnings.map((warning, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border-b-2 border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Jahr
                    </th>
                    <th className="border-b-2 border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Budget (€)
                    </th>
                    <th className="border-b-2 border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                        Noch keine Jahresbudgets vorhanden.
                      </td>
                    </tr>
                  ) : (
                    yearBudgets
                      .slice()
                      .sort((a, b) => a.year - b.year)
                      .map((yb, i) => (
                        <tr key={yb.year} className="border-b border-slate-200">
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={yb.year}
                              onChange={(e) => updateYear(i, Number(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="w-40 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={yb.budget}
                              onChange={(e) => updateYearBudget(i, Number(e.target.value))}
                              min={0}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeYear(i)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Entfernen
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PINProtection>
  );
}
