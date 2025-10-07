import React, { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import type { Project, YearBudget } from '../types';
import { Card, COLORS } from '../ui';
import { parseProjectsCSV, projectsToCSV, readFileAsText } from '../lib/csv';
import { toISODate, getCurrentYear, overlapDays, daysBetween, yearStart, yearEnd } from '../lib';
import PINProtection from '../components/PINProtection';
import { DEMO_PROJECTS } from '../data/demoData';
import {
  loadProjects,
  saveProjects as persistProjects,
  loadYearBudgets,
  saveYearBudgets as persistYearBudgets,
} from '../db/projectsDb';


const emptyProject = (): Project => ({
  id: `p-${Math.random().toString(36).slice(2,8)}`,
  projectNumberInternal: '',
  classification: 'project',
  title: '', owner: '', description: '', status: 'planned',
  start: '', end: '', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
  requiresAT82Check: false, at82Completed: false,
});

const ProjectsAdmin: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([]);
  const currentYear = getCurrentYear();

  const projectsFromDb = useLiveQuery(loadProjects, [], DEMO_PROJECTS);
  const yearBudgetsFromDb = useLiveQuery(loadYearBudgets, [], [] as YearBudget[]);

  useEffect(() => {
    setProjects(projectsFromDb);
  }, [projectsFromDb]);

  useEffect(() => {
    setYearBudgets(yearBudgetsFromDb);
  }, [yearBudgetsFromDb]);

  const persistProjectList = async (updated: Project[], showToast = true) => {
    setProjects(updated);
    try {
      await persistProjects(updated);
      if (showToast) {
        setMsg('Änderungen gespeichert.');
        setTimeout(() => setMsg(''), 2000);
      }
    } catch (error) {
      console.error('Failed to persist projects', error);
      setMsg('Speichern fehlgeschlagen.');
    }
  };

  const onImportCSV = async (file?: File) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = parseProjectsCSV(text);
      await persistProjectList(rows, false);
      setMsg(`CSV importiert: ${rows.length} Zeilen`);
    } catch (err) {
      setMsg((err as Error)?.message || 'CSV konnte nicht geladen werden.');
    }
  };
  const onExportCSV = () => {
    const csv = projectsToCSV(projects);
    // UTF-8 BOM für Excel-Kompatibilität (erkennt Umlaute korrekt)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `projekte_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const update = (i: number, k: keyof Project, v: any) => {
    const next = [...projects];
    if (k === 'progress' || k === 'budgetPlanned' || k === 'costToDate') {
      (next[i] as any)[k] = Number(v);
    } else if (k === 'requiresAT82Check' || k === 'at82Completed') {
      (next[i] as any)[k] = v === true || v === 'true';
    } else {
      (next[i] as any)[k] = v;
    }
    void persistProjectList(next);
  };
  const addRow = () => { void persistProjectList([emptyProject(), ...projects]); };
  const removeRow = (i: number) => { void persistProjectList(projects.filter((_, idx) => idx !== i)); };

  // YearBudgets CRUD (auto-save)
  const persistYearBudgetList = async (updated: YearBudget[]) => {
    setYearBudgets(updated);
    try {
      await persistYearBudgets(updated);
    } catch (error) {
      console.error('Failed to persist year budgets', error);
      setMsg('Jahresbudgets konnten nicht gespeichert werden.');
    }
  };

  const addYearBudget = () => {
    const nextYear = yearBudgets.length > 0
      ? Math.max(...yearBudgets.map(yb => yb.year)) + 1
      : currentYear;
    void persistYearBudgetList([...yearBudgets, { year: nextYear, budget: 0 }]);
  };
  const updateYearBudget = (i: number, key: keyof YearBudget, value: number) => {
    const next = [...yearBudgets];
    next[i] = { ...next[i], [key]: value };
    void persistYearBudgetList(next);
  };
  const removeYearBudget = (i: number) => {
    void persistYearBudgetList(yearBudgets.filter((_, idx) => idx !== i));
  };

  // Warnung bei Überplanung berechnen
  const overBudgetWarnings = useMemo(() => {
    const warnings: string[] = [];
    yearBudgets.forEach((yb) => {
      // Filter projects for this year
      const yearProjects = projects.filter((p) => {
        const startYear = new Date(p.start).getFullYear();
        const endYear = new Date(p.end).getFullYear();
        return startYear <= yb.year && endYear >= yb.year;
      });
      // Anteilige Berechnung wie Dashboard (plannedBudgetForYearD)
      const yearProjectBudget = yearProjects.reduce((sum, p) => {
        const startD = new Date(p.start);
        const endD = new Date(p.end);
        const overlap = overlapDays(startD, endD, yearStart(yb.year), yearEnd(yb.year));
        const projectDays = Math.max(1, daysBetween(startD, endD));
        const anteilig = (p.budgetPlanned || 0) * (overlap / projectDays);
        return sum + anteilig;
      }, 0);
      if (yearProjectBudget > yb.budget && yb.budget > 0) {
        const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
        warnings.push(`Jahr ${yb.year}: Projektbudgets (${fmt(yearProjectBudget)}) übersteigen Jahresbudget (${fmt(yb.budget)})`);
      }
    });
    return warnings;
  }, [yearBudgets, projects]);

  return (
    <PINProtection>
      <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
        <div className="max-w-presentation mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin &ndash; Projekte bearbeiten</h1>
          <Link to="/" className="text-blue-600 hover:underline">Zum Dashboard</Link>
        </header>

        <Card>
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={addRow} className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium transition-colors">+ Neu</button>
            <input id="adminCsvInput" type="file" accept=".csv" className="hidden" onChange={(e) => onImportCSV(e.target.files?.[0])} />
            <button onClick={() => document.getElementById('adminCsvInput')!.click()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition-colors">CSV importieren</button>
            <button onClick={onExportCSV} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition-colors">CSV exportieren</button>
            {msg && <span className="text-sm text-green-600 ml-2 bg-green-50 px-3 py-1 rounded-md font-medium">✓ {msg}</span>}
          </div>
        </Card>

        {/* Jahresbudgets */}
        <Card title="Jahresbudgets">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={addYearBudget}
                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium transition-colors"
              >
                + Weiteres Jahr
              </button>
              <span className="text-xs text-slate-500">Änderungen werden automatisch gespeichert</span>
            </div>

            {overBudgetWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                {overBudgetWarnings.map((warning, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-red-800">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">⚠️ {warning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">Jahr</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">Budget (€)</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {yearBudgets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-slate-500 text-sm">
                        Noch keine Jahresbudgets definiert. Klicken Sie auf &quot;+ Weiteres Jahr&quot; um zu starten.
                      </td>                    </tr>
                  )}
                  {yearBudgets
                    .sort((a, b) => a.year - b.year)
                    .map((yb, i) => {
                      const isPast = yb.year < currentYear;
                      const isEditable = yb.year >= currentYear && yb.year <= currentYear + 1;
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors border-b border-slate-200 ${isPast ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                              value={yb.year}
                              onChange={(e) => updateYearBudget(i, 'year', Number(e.target.value))}
                              disabled={!isEditable}
                              min={currentYear}
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              className="w-48 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                              value={yb.budget}
                              onChange={(e) => updateYearBudget(i, 'budget', Number(e.target.value))}
                              disabled={!isEditable}
                              min={0}
                              placeholder="z.B. 500000"
                            />
                          </td>
                          <td className="py-3 px-3">
                            {isEditable ? (
                              <button
                                onClick={() => removeYearBudget(i)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                🗑️ Löschen
                              </button>
                            ) : isPast ? (
                              <span className="text-xs text-slate-500">Gesperrt (Vergangenheit)</span>
                            ) : (
                              <span className="text-xs text-slate-500">Nur {currentYear}-{currentYear + 1} editierbar</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr className="bg-slate-100">
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">Aktion</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">ID</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Projektnr. intern</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Projektnr. extern</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Klassifizierung</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Titel</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Beschreibung</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Verantw. MA</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-blue-50">Status</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-amber-50">Start</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-amber-50">Ende</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-amber-50">Fortschritt %</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-green-50">Budget €</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-green-50">Kosten €</th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-green-50">Gesellschaft</th>
                  <th className="py-3 px-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-purple-50">AT 8.2 erf.</th>
                  <th className="py-3 px-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300 bg-purple-50">AT 8.2 durchgef.</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                    <td className="py-3 px-3">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        🗑️ Löschen
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-40 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.id}
                        onChange={(e)=>update(i,'id',e.target.value)}
                        placeholder="z.B. p-001"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.projectNumberInternal}
                        onChange={(e)=>update(i,'projectNumberInternal',e.target.value)}
                        placeholder="PINT-YYYY-NNN"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.projectNumberExternal || ''}
                        onChange={(e)=>update(i,'projectNumberExternal',e.target.value || undefined)}
                        placeholder="VDB-YYYY-NNN"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        className="w-40 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.classification}
                        onChange={(e)=>update(i,'classification',e.target.value)}
                      >
                        <option value="internal_dev">Interne Weiterentwicklung</option>
                        <option value="project">Projekt</option>
                        <option value="project_vdbs">Projekt VDB-S</option>
                        <option value="task">Aufgabe</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-72 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.title}
                        onChange={(e)=>update(i,'title',e.target.value)}
                        placeholder="Projekttitel"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <textarea
                        className="w-72 border border-slate-300 rounded-md px-2 py-1.5 text-sm min-h-[70px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.description}
                        onChange={(e)=>update(i,'description',e.target.value)}
                        placeholder="Projektbeschreibung"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-44 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={p.owner}
                        onChange={(e)=>update(i,'owner',e.target.value)}
                        placeholder="Name"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        value={p.status}
                        onChange={(e)=>update(i,'status',e.target.value)}
                      >
                        <option value="planned">Geplant</option>
                        <option value="active">Laufend</option>
                        <option value="done">Abgeschlossen</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={toISODate(p.start)}
                        onChange={(e)=>update(i,'start',e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        className="border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={toISODate(p.end)}
                        onChange={(e)=>update(i,'end',e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        className="w-24 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={p.progress}
                        min={0}
                        max={100}
                        onChange={(e)=>update(i,'progress',e.target.value)}
                        placeholder="0-100"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={p.budgetPlanned}
                        min={0}
                        onChange={(e)=>update(i,'budgetPlanned',e.target.value)}
                        placeholder="€"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        className="w-32 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={p.costToDate}
                        min={0}
                        onChange={(e)=>update(i,'costToDate',e.target.value)}
                        placeholder="€"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        className="w-28 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={p.org||''}
                        onChange={(e)=>update(i,'org',e.target.value)}
                        placeholder="BB/MBG"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500 rounded"
                        checked={p.requiresAT82Check||false}
                        onChange={(e)=>update(i,'requiresAT82Check',e.target.checked)}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-purple-600 focus:ring-2 focus:ring-purple-500 rounded"
                        checked={p.at82Completed||false}
                        onChange={(e)=>update(i,'at82Completed',e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      </div>
    </PINProtection>
  );
};

export default ProjectsAdmin;


