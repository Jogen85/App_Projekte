import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Card, COLORS } from './ui';
import { parseProjectsCSV, projectsToCSV } from './lib/csv';
import type { Project, NormalizedProject } from './types';
import {
  toDate, fmtDate, getToday, getCurrentYear, daysBetween,
  yearStart, yearEnd, overlapDays,
  calcTimeRAGD, calcBudgetRAG, calcResourceRAG,
  plannedBudgetForYearD, costsYTDForYearD,
} from './lib';
import FiltersPanel from './components/FiltersPanel';
import Timeline from './components/Timeline';

const ProjectsTable = lazy(() => import('./components/ProjectsTable'));
const BudgetDonut = lazy(() => import('./components/BudgetDonut'));
const ResourceTile = lazy(() => import('./components/ResourceTile'));
const ProgressDelta = lazy(() => import('./components/ProgressDelta'));

const DEMO_PROJECTS: Project[] = [
  { id: 'p1', title: 'DMS Migration MBG (Cloud)', owner: 'Christian J.', description: 'Migration d.velop DMS in die Cloud inkl. Aktenpläne & Prozesse',
    status: 'active', start: '2025-05-01', end: '2025-12-15', progress: 65, budgetPlanned: 120000, costToDate: 70000, hoursPerMonth: 8, org: 'MBG' },
  { id: 'p2', title: 'EXEC DMS Stabilisierung (BB)', owner: 'Christian J.', description: 'Stabilisierung & Performanceoptimierung EXEC DMS im Rechenzentrum',
    status: 'active', start: '2025-03-10', end: '2025-10-31', progress: 80, budgetPlanned: 60000, costToDate: 58000, hoursPerMonth: 6, org: 'BB' },
  { id: 'p3', title: 'E-Rechnung 2025 (BB/MBG)', owner: 'Christian J.', description: 'Implementierung E-Rechnungsprozesse (EXEC/FIDES & d.velop)',
    status: 'active', start: '2025-07-01', end: '2025-11-30', progress: 35, budgetPlanned: 40000, costToDate: 12000, hoursPerMonth: 4, org: 'BB/MBG' },
  { id: 'p4', title: 'MPLS Redesign Rechenzentrum', owner: 'Christian J.', description: 'Neukonzeption MPLS/Edge inkl. Failover & Dokumentation',
    status: 'planned', start: '2025-11-01', end: '2026-02-28', progress: 0, budgetPlanned: 75000, costToDate: 0, hoursPerMonth: 6, org: 'BB' },
  { id: 'p5', title: 'Placetel-Webex Migration', owner: 'Christian J.', description: 'Migrierte Telefonie/Collab-Plattform inkl. Endgeräte',
    status: 'done', start: '2024-09-01', end: '2025-03-31', progress: 100, budgetPlanned: 15000, costToDate: 14500, hoursPerMonth: 0, org: 'BB' },
  { id: 'p6', title: 'Zentrales Monitoring (Grafana)', owner: 'Christian J.', description: 'Aufbau Dashboards für Kernsysteme & Alerts',
    status: 'planned', start: '2025-09-20', end: '2025-12-20', progress: 0, budgetPlanned: 10000, costToDate: 0, hoursPerMonth: 4, org: 'BB' },
];

export default function App() {
  const today = getToday();
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [capacity, setCapacity] = useState<number>(16);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [yearOnly, setYearOnly] = useState<boolean>(true);
  const [year, setYear] = useState<number>(() => getCurrentYear());
  const [csvError, setCsvError] = useState<string | null>(null);

  useEffect(() => {
    try { const ls = localStorage.getItem('projects_json'); if (ls) setProjects(JSON.parse(ls)); } catch (e) { /* ignore */ }
  }, []);

  const normalized: NormalizedProject[] = useMemo(() =>
    projects.map((p) => ({
      ...p,
      startD: toDate(p.start),
      endD: toDate(p.end),
      orgNorm: (p.org || '').toLowerCase(),
      statusNorm: (p.status || '').toLowerCase(),
    })),
  [projects]);

  const overlapsYearD = (p: NormalizedProject, y: number) => overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y)) > 0;

  const filtered = useMemo(() => {
    const sFilter = statusFilter.toLowerCase();
    const oFilter = orgFilter.toLowerCase();
    return normalized.filter((p) => {
      if (yearOnly && !overlapsYearD(p, year)) return false;
      if (sFilter !== 'all' && p.statusNorm !== sFilter) return false;
      if (oFilter !== 'all' && p.orgNorm !== oFilter) return false;
      return true;
    });
  }, [normalized, statusFilter, orgFilter, yearOnly, year]);

  const bounds = useMemo(() => {
    if (yearOnly) {
      const minStart = yearStart(year);
      const maxEnd = yearEnd(year);
      const totalDays = Math.max(1, daysBetween(minStart, maxEnd));
      return { minStart, maxEnd, totalDays };
    }
    const base = filtered.length ? filtered : normalized;
    if (!base.length) {
      const minStart = today; const maxEnd = today;
      return { minStart, maxEnd, totalDays: 1 };
    }
    const minStart = new Date(Math.min(...base.map((p) => p.startD.getTime())));
    const maxEnd = new Date(Math.max(...base.map((p) => p.endD.getTime())));
    const totalDays = daysBetween(minStart, maxEnd) || 1;
    return { minStart, maxEnd, totalDays };
  }, [filtered, normalized, yearOnly, year, today]);

  const kpis = useMemo(() => {
    const base = yearOnly ? normalized.filter((p) => overlapsYearD(p, year)) : normalized;
    const active = base.filter((p) => p.statusNorm === 'active');
    const planned = base.filter((p) => p.statusNorm === 'planned');
    const done = base.filter((p) => p.statusNorm === 'done');
    let budgetPlannedSum = 0; let costSum = 0;
    for (const p of base) {
      if (yearOnly) {
        budgetPlannedSum += plannedBudgetForYearD(p as any, year);
        costSum += costsYTDForYearD(p as any, year);
      } else {
        budgetPlannedSum += p.budgetPlanned || 0;
        costSum += p.costToDate || 0;
      }
    }
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    // Nur aktive Projekte zählen für Ressourcen-Auslastung (nicht geplante/abgeschlossene)
    const usedHours = normalized
      .filter((p) => p.statusNorm === 'active' && p.endD >= monthStart && p.startD <= monthEnd)
      .reduce((s, p) => s + (p.hoursPerMonth || 0), 0);
    return { activeCount: active.length, plannedCount: planned.length, doneCount: done.length, budgetPlannedSum, costSum, usedHours };
  }, [normalized, yearOnly, year, today]);

  const resourceRAG = calcResourceRAG(kpis.usedHours, capacity);

  // Progress filter (Soll-Ist)
  const [progressFilter, setProgressFilter] = useState<'all'|'behind'|'ontrack'|'ahead'>('all');
  const [progressTolerance, setProgressTolerance] = useState<number>(10);
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(null);
  const categoryForProject = React.useCallback((p: NormalizedProject): 'behind'|'ontrack'|'ahead' => {
    const total = Math.max(1, daysBetween(p.startD, p.endD));
    const now = today;
    let elapsed = daysBetween(p.startD, now);
    if (now < p.startD) elapsed = 0;
    if (now > p.endD) elapsed = total;
    const soll = Math.max(0, Math.min(100, (elapsed / total) * 100));
    const ist = Math.max(0, Math.min(100, p.progress || 0));
    const delta = ist - soll;
    const tol = Math.max(0, Math.min(50, progressTolerance));
    if (delta < -tol) return 'behind';
    if (delta > tol) return 'ahead';
    return 'ontrack';
  }, [progressTolerance, today]);
  const filteredByProgress = useMemo(() => {
    if (progressFilter === 'all') return filtered;
    return filtered.filter((p) => categoryForProject(p as any) === progressFilter);
  }, [filtered, progressFilter, categoryForProject]);

  const onCSVUpload = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseProjectsCSV(text);
      if (rows.length) setProjects(rows as Project[]);
      setCsvError(null);
    } catch (e: any) {
      setCsvError(e?.message || 'CSV konnte nicht geladen werden.');
    }
  };
  const downloadCSVTemplate = () => {
    const csv = projectsToCSV(projects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projekte_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Budget-Anzeige: Überschreitungen müssen transparent sein
  const budgetSpent = kpis.costSum;
  const budgetRemaining = kpis.budgetPlannedSum - kpis.costSum;
  // Burndown entfernt; Soll-Ist-Kachel ersetzt die Darstellung


  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">IT-Projekt&uuml;bersicht (Demo)</h1>
            <p className={"text-sm " + COLORS.subtext}>Portfolio-&Uuml;berblick f&uuml;r Gesch&auml;ftsf&uuml;hrung &amp; Aufsichtsrat &mdash; Stand: {fmtDate(today)}</p>
            <a href="/admin" className="text-sm text-blue-600 hover:underline">Admin</a>
          </div>
          <FiltersPanel
            capacity={capacity} setCapacity={setCapacity}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            orgFilter={orgFilter} setOrgFilter={setOrgFilter}
            yearOnly={yearOnly} setYearOnly={setYearOnly}
            year={year} setYear={setYear}
            onCSVUpload={onCSVUpload}
            onDownloadTemplate={downloadCSVTemplate}
          />
        </header>

        {csvError && (
          <Card>
            <div className="text-sm text-red-600">CSV konnte nicht verarbeitet werden: {csvError}</div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title={"Laufend"}><div className="text-3xl font-semibold">{kpis.activeCount}</div></Card>
          <Card title={"Geplant"}><div className="text-3xl font-semibold">{kpis.plannedCount}</div></Card>
          <Card title={"Abgeschlossen"}><div className="text-3xl font-semibold">{kpis.doneCount}</div></Card>
          <Card title={"Kapazität (Monat)"}><div className="text-3xl font-semibold">{capacity} h</div></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title={`Budget (Jahr): ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(kpis.budgetPlannedSum)}`} className="h-72">
            <div className="flex flex-col gap-2">
              <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
                <BudgetDonut spent={budgetSpent} remaining={budgetRemaining} height={190} />
              </Suspense>
            </div>
          </Card>
          <Card title={"Ressourcen (aktueller Monat)"} className="h-72">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ResourceTile capacity={capacity} usedHours={kpis.usedHours} rag={resourceRAG as any} height={190} />
            </Suspense>
          </Card>
          <Card title={"Soll-Ist-Fortschritt"} className="h-72">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ProgressDelta projects={filtered as any} height={190}
                onSelectCategory={(c) => setProgressFilter((prev) => prev === c ? 'all' : c)}
                selectedCategory={progressFilter === 'all' ? null : progressFilter}
                tolerance={progressTolerance}
                onChangeTolerance={(t) => setProgressTolerance(isNaN(t) ? 10 : t)}
                onSelectProject={(id) => setHighlightProjectId(id)}
              />
            </Suspense>
          </Card>
        </div>

        <Suspense fallback={<Card title={"Projekte"}><div className="h-32 bg-slate-100 rounded animate-pulse" /></Card>}>
          {progressFilter !== 'all' && (
            <div className="mb-2 flex items-center justify-between text-xs rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                Filter aktiv: Soll-Ist {progressFilter === 'behind' ? 'Hinter Plan' : progressFilter === 'ontrack' ? 'Im Plan' : 'Vor Plan'} (±{progressTolerance} pp)
              </div>
              <button className="px-2 py-1 rounded border border-slate-300 hover:bg-white" onClick={() => { setProgressFilter('all'); setHighlightProjectId(null); }}>
                Zurücksetzen
              </button>
            </div>
          )}
          <ProjectsTable
            projects={filteredByProgress}
            year={year}
            yearOnly={yearOnly}
            plannedBudgetForYearD={plannedBudgetForYearD as any}
            costsYTDForYearD={costsYTDForYearD as any}
            calcTimeRAGD={calcTimeRAGD as any}
            calcBudgetRAG={calcBudgetRAG as any}
            highlightId={highlightProjectId}
          />
        </Suspense>

        <Card>
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Demo: Zahlen & Projekte sind fiktiv. Ampeln basieren auf einfachen Heuristiken (Zeit vs. Fortschritt, Budgetverbrauch, Ressourcengrenze).
              Kapazit&auml;ts-Grenze oben &auml;nderbar (Standard 16h/Monat). Jahres-Sicht pro-rata (Tagesanteile) f&uuml;r Budget/Kosten.
            </p>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-medium">CSV-Spalten (erwartet)</summary>
              <div className="mt-1">{"id; title; owner; description; status; start; end; progress; budgetPlanned; costToDate; hoursPerMonth; org"}</div>
            </details>
          </div>
        </Card>

        <Timeline projects={filtered} bounds={bounds} yearOnly={yearOnly} year={year} />

        {/* Alte Zeitachse entfernt zugunsten der neuen Timeline-Komponente */}

      </div>
    </div>
  );
}




