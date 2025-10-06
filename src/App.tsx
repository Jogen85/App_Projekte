import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Card, COLORS } from './ui';
import { parseProjectsCSV, projectsToCSV } from './lib/csv';
import type { Project, NormalizedProject } from './types';
import {
  toDate, fmtDate, getToday, getCurrentYear, daysBetween,
  yearStart, yearEnd, overlapDays,
  calcTimeRAGD, calcBudgetRAG,
  plannedBudgetForYearD, costsYTDForYearD,
} from './lib';
import FiltersPanel from './components/FiltersPanel';
import Timeline from './components/Timeline';

const ProjectsTable = lazy(() => import('./components/ProjectsTable'));
const BudgetDonut = lazy(() => import('./components/BudgetDonut'));
const ProgressDelta = lazy(() => import('./components/ProgressDelta'));
const TimeStatusOverview = lazy(() => import('./components/TimeStatusOverview'));

const DEMO_PROJECTS: Project[] = [
  { id: 'p1', projectNumberInternal: 'PINT-2025-001', projectNumberExternal: 'VDB-2025-01', classification: 'project_vdbs',
    title: 'DMS Aktenplan Migration (MBG)', owner: 'Christian Jürgens', description: 'Migration d.velop DMS der BB in die d.3 Cloud der MBG',
    status: 'active', start: '2025-05-01', end: '2025-12-01', progress: 70, budgetPlanned: 120000, costToDate: 70000, org: 'MBG',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p2', projectNumberInternal: 'PINT-2025-002', projectNumberExternal: 'CRM-2025-02', classification: 'project_vdbs',
    title: 'Vertragsmanagement in d.3 (MBG)', owner: 'Michael Meis u. Ramona Friedrich', description: 'Aufbau eines Vertragsmanagements in d.3',
    status: 'active', start: '2025-03-10', end: '2025-10-31', progress: 80, budgetPlanned: 60000, costToDate: 58000, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p3', projectNumberInternal: 'PINT-2025-003', projectNumberExternal: 'CRM-2025-03', classification: 'project_vdbs',
    title: 'E-Eingangsrechnung in d.3 (MBG)', owner: 'Maren Kreis', description: 'Implementierung E-Eingangsrechnungsprozess über d.3',
    status: 'active', start: '2025-07-01', end: '2025-11-30', progress: 35, budgetPlanned: 40000, costToDate: 12000, org: 'MBG',
    requiresAT82Check: true, at82Completed: false },
  { id: 'p4', projectNumberInternal: 'PINT-2025-004', projectNumberExternal: 'VDB-2025-04', classification: 'internal_dev',
    title: 'Auslagerungsmanagement in Forum OSM (BB)', owner: 'Angela Ihns', description: 'Auslagerungsmanagement in Forum OSM aufbauen',
    status: 'planned', start: '2025-11-01', end: '2026-02-28', progress: 0, budgetPlanned: 75000, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p5', projectNumberInternal: 'PINT-2025-005', projectNumberExternal: 'VDB-2025-05', classification: 'internal_dev',
    title: 'Placetel-Webex Migration', owner: 'Christian Jürgens', description: 'Migrierte Telefonie/Collab-Plattform inkl. Endgeräte',
    status: 'done', start: '2024-09-01', end: '2025-03-31', progress: 100, budgetPlanned: 15000, costToDate: 14500, org: 'BB',
    requiresAT82Check: true, at82Completed: true },
  { id: 'p6', projectNumberInternal: 'PINT-2025-006', projectNumberExternal: 'ERECH-2025-06', classification: 'project',
    title: 'CRM light - MANTAU', owner: 'Chris Collin', description: 'Einführung einer CRM Lösung für Bürgschaftsbank und MBG',
    status: 'planned', start: '2025-09-20', end: '2025-12-20', progress: 0, budgetPlanned: 10000, costToDate: 0, org: 'BB/MBG',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p7', projectNumberInternal: 'PINT-2025-007', projectNumberExternal: undefined, classification: 'task',
    title: 'Einführung DealMap', owner: 'Jens Körtge', description: 'Einführung der Kernbanken-Software DealMap für das Beteiligungsmanagement',
    status: 'done', start: '2024-02-01', end: '2025-06-01', progress: 100, budgetPlanned: 100000, costToDate: 110000, org: 'MBG',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p8', projectNumberInternal: 'PINT-2025-008', projectNumberExternal: 'ERECH-2025-08', classification: 'project_vdbs',
    title: 'elektronische Personalakte d.3 (MBG)', owner: 'Michael Meis u. Ramona Friedrich', description: 'Digitale Personalakte - Verwaltung von den Bewerbungsunterlagen über das Vertragswerk bis hin zur Krankmeldung von sämtlichen Personaldokumente- Ziel: beschleunigt die Abwicklung der HR-Prozesse und einhaltung von Aufbewahrungsfristen',
    status: 'planned', start: '2025-11-01', end: '2026-03-01', progress: 0, budgetPlanned: 5000, costToDate: 0, org: 'MBG',
    requiresAT82Check: true, at82Completed: false },
  { id: 'p9', projectNumberInternal: 'PINT-2025-009', projectNumberExternal: 'CRM-2025-09', classification: 'project_vdbs',
    title: 'elektronische Unterschrift über d.velop Sign (MBG)', owner: 'Christian Jürgens', description: 'elektronische Unterschrift über d.velop Sign (MBG)',
    status: 'done', start: '2025-06-01', end: '2025-09-01', progress: 100, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p10', projectNumberInternal: 'PINT-2025-010', projectNumberExternal: undefined, classification: 'project',
    title: 'elektronische Unterschrift über d.velop Sign (BB)', owner: 'Christian Jürgens', description: 'elektronische Unterschrift über d.velop Sign (BB)',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p11', projectNumberInternal: 'PINT-2025-011', projectNumberExternal: 'CRM-2025-11', classification: 'project',
    title: 'neue Servertechnik lokal (BB/MBG)', owner: 'Christian Jürgens', description: 'neue Servertechnik lokal (BB/MBG)',
    status: 'active', start: '2025-08-01', end: '2025-10-31', progress: 50, budgetPlanned: 0, costToDate: 0, org: 'BB/MBG',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p12', projectNumberInternal: 'PINT-2025-012', projectNumberExternal: 'DORA-2025-12', classification: 'project',
    title: 'E-Ausgangsrechnung in d.3 (MBG)', owner: 'Christian Jürgens', description: 'E-Ausgangsrechnung in d.3 (MBG)',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p13', projectNumberInternal: 'PINT-2025-013', projectNumberExternal: 'ERECH-2025-13', classification: 'internal_dev',
    title: 'Life Cycle Management', owner: 'Christian Jürgens', description: 'Life Cycle Management im IT-Bereich einführen',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p14', projectNumberInternal: 'PINT-2025-014', projectNumberExternal: 'CRM-2025-14', classification: 'project_vdbs',
    title: 'OHB-Infrastruktur über d.3 (BMV)', owner: 'Christian Jürgens', description: 'OHB-Infrastruktur über d.3 (BMV)',
    status: 'active', start: '2025-06-01', end: '2025-12-20', progress: 40, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p15', projectNumberInternal: 'PINT-2025-015', projectNumberExternal: 'CRM-2025-15', classification: 'project',
    title: 'OHB-Infrastruktur über d.3 (MBG)', owner: 'Christian Jürgens', description: 'OHB-Infrastruktur über d.3 (MBG)',
    status: 'active', start: '2025-06-01', end: '2025-12-20', progress: 40, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p16', projectNumberInternal: 'PINT-2025-016', projectNumberExternal: 'VDB-2025-16', classification: 'project',
    title: 'Überarbeitung IT-OHB für DORA (BB)', owner: 'Christian Jürgens', description: 'Überarbeitung IT-OHB für DORA (BB)',
    status: 'active', start: '2025-06-01', end: '2025-12-20', progress: 40, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p17', projectNumberInternal: 'PINT-2025-017', projectNumberExternal: 'VDB-2025-17', classification: 'task',
    title: 'Update d.3 auf Annual 2025 (BB)', owner: 'Christian Jürgens', description: 'Update d.3 auf Annual 2025 (BB)',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p18', projectNumberInternal: 'PINT-2025-018', projectNumberExternal: 'DORA-2025-18', classification: 'internal_dev',
    title: 'Anbindung fides an AD (BB)', owner: 'Christian Jürgens', description: 'Anbindung fides an Active Directory (AD) + Überarbeitung der Berechtigungsgruppen',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p19', projectNumberInternal: 'PINT-2025-019', projectNumberExternal: 'ERECH-2025-19', classification: 'task',
    title: 'Reisekostenabrechnung BMV/MBG', owner: 'Christian Jürgens', description: 'Reisekostenabrechnung BMV/MBG über Circular',
    status: 'planned', start: '2025-11-01', end: '2025-12-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p20', projectNumberInternal: 'PINT-2025-020', projectNumberExternal: 'ERECH-2025-20', classification: 'project',
    title: 'Rollenkonzept erstellen', owner: 'Christian Jürgens', description: 'Rollenkonzept erstellen',
    status: 'active', start: '2025-10-06', end: '2025-10-10', progress: 5, budgetPlanned: 0, costToDate: 0, org: 'BB/MBG',
    requiresAT82Check: false, at82Completed: false },
  { id: 'p21', projectNumberInternal: 'PINT-2025-021', projectNumberExternal: 'CRM-2025-21', classification: 'project',
    title: 'Rezertifizierung', owner: 'Christian Jürgens', description: 'Rezertifizierung über neues Tool',
    status: 'planned', start: '2025-10-13', end: '2025-10-20', progress: 0, budgetPlanned: 0, costToDate: 0, org: 'BB/MBG',
    requiresAT82Check: false, at82Completed: false },
];

export default function App() {
  const today = getToday();
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [yearOnly, setYearOnly] = useState<boolean>(true);
  const [year, setYear] = useState<number>(() => getCurrentYear());
  const [csvError, setCsvError] = useState<string | null>(null);
  const [at82RequiredFilter, setAt82RequiredFilter] = useState<string>('all');
  const [at82CompletedFilter, setAt82CompletedFilter] = useState<string>('all');

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
    const cFilter = classificationFilter.toLowerCase();
    return normalized.filter((p) => {
      if (yearOnly && !overlapsYearD(p, year)) return false;
      if (sFilter !== 'all' && p.statusNorm !== sFilter) return false;
      if (oFilter !== 'all' && p.orgNorm !== oFilter) return false;
      if (cFilter !== 'all' && p.classification !== cFilter) return false;
      if (at82RequiredFilter === 'yes' && !p.requiresAT82Check) return false;
      if (at82RequiredFilter === 'no' && p.requiresAT82Check) return false;
      if (at82CompletedFilter === 'yes' && !p.at82Completed) return false;
      if (at82CompletedFilter === 'no' && p.at82Completed) return false;
      return true;
    });
  }, [normalized, statusFilter, orgFilter, classificationFilter, yearOnly, year, at82RequiredFilter, at82CompletedFilter]);

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
    return { activeCount: active.length, plannedCount: planned.length, doneCount: done.length, budgetPlannedSum, costSum };
  }, [normalized, yearOnly, year, today]);

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
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} px-8 py-4`}>
      <div className="max-w-presentation mx-auto space-y-3">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">IT-Projekt&uuml;bersicht (Demo)</h1>
            <p className={"text-sm " + COLORS.subtext}>Stand: {fmtDate(today)}</p>
            <a href="/admin" className="text-sm text-blue-600 hover:underline">Admin</a>
          </div>
          <FiltersPanel
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            orgFilter={orgFilter} setOrgFilter={setOrgFilter}
            classificationFilter={classificationFilter} setClassificationFilter={setClassificationFilter}
            yearOnly={yearOnly} setYearOnly={setYearOnly}
            year={year} setYear={setYear}
            at82RequiredFilter={at82RequiredFilter} setAt82RequiredFilter={setAt82RequiredFilter}
            at82CompletedFilter={at82CompletedFilter} setAt82CompletedFilter={setAt82CompletedFilter}
            onCSVUpload={onCSVUpload}
            onDownloadTemplate={downloadCSVTemplate}
          />
        </header>

        {csvError && (
          <Card>
            <div className="text-sm text-red-600">CSV konnte nicht verarbeitet werden: {csvError}</div>
          </Card>
        )}

        {/* KPI-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={"Laufend"} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.activeCount}</div>
            </div>
          </Card>
          <Card title={"Geplant"} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.plannedCount}</div>
            </div>
          </Card>
          <Card title={"Abgeschlossen"} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.doneCount}</div>
            </div>
          </Card>
        </div>

        {/* Chart-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={`Budget (Jahr): ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(kpis.budgetPlannedSum)}`} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <BudgetDonut spent={budgetSpent} remaining={budgetRemaining} height={220} />
            </Suspense>
          </Card>
          <Card title={"Zeitlicher Status (laufende Projekte)"} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <TimeStatusOverview projects={normalized} height={220} />
            </Suspense>
          </Card>
          <Card title={"Soll-Ist-Fortschritt"} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ProgressDelta projects={filtered as any} height={220}
                onSelectCategory={(c) => setProgressFilter((prev) => prev === c ? 'all' : c)}
                selectedCategory={progressFilter === 'all' ? null : progressFilter}
                tolerance={progressTolerance}
                onChangeTolerance={(t) => setProgressTolerance(isNaN(t) ? 10 : t)}
                onSelectProject={(id) => setHighlightProjectId(id)}
              />
            </Suspense>
          </Card>
        </div>

        {/* ProjectsTable mit fester Höhe und Scrollbar */}
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
          <Card title={"Projekte"}>
            <div className="max-h-table overflow-y-auto">
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
            </div>
          </Card>
        </Suspense>

        {/* Timeline am Ende */}
        <Timeline projects={filtered} bounds={bounds} yearOnly={yearOnly} year={year} />
      </div>
    </div>
  );
}




