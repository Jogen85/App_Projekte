import React, { useMemo, useState, useEffect } from 'react';
import { Card, COLORS } from './ui';
import { Project, NormalizedProject } from './types';
import {
  toDate, fmtDate, today, currentYear, daysBetween, clamp,
  yearStart, yearEnd, overlapDays,
  calcTimeRAGD, calcBudgetRAG, calcResourceRAG,
  plannedBudgetForYearD, costsYTDForYearD,
} from './lib';
import FiltersPanel from './components/FiltersPanel';
import ProjectsTable from './components/ProjectsTable';
import BudgetDonut from './components/BudgetDonut';
import ResourceBar from './components/ResourceBar';
import BurndownChart from './components/BurndownChart';

// Beispiel-Projektdaten
const DEMO_PROJECTS: Project[] = [
  { id: 'p1', title: 'DMS Migration MBG (Cloud)', owner: 'Christian J.', description: 'Migration d.velop DMS in die Cloud inkl. Aktenpläne & Prozesse',
    status: 'active', start: '2025-05-01', end: '2025-12-15', progress: 65, budgetPlanned: 120000, costToDate: 70000, hoursPerMonth: 8, org: 'MBG' },
  { id: 'p2', title: 'EXEC DMS Stabilisierung (BB)', owner: 'Christian J.', description: 'Stabilisierung & Performanceoptimierung EXEC DMS im RZ',
    status: 'active', start: '2025-03-10', end: '2025-10-31', progress: 80, budgetPlanned: 60000, costToDate: 58000, hoursPerMonth: 6, org: 'BB' },
  { id: 'p3', title: 'E‑Rechnung 2025 (BB/MBG)', owner: 'Christian J.', description: 'Implementierung E‑Rechnungsprozesse (EXEC/FIDES & d.velop)',
    status: 'active', start: '2025-07-01', end: '2025-11-30', progress: 35, budgetPlanned: 40000, costToDate: 12000, hoursPerMonth: 4, org: 'BB/MBG' },
  { id: 'p4', title: 'MPLS Redesign Rechenzentrum', owner: 'Christian J.', description: 'Neukonzeption MPLS/Edge inkl. Failover & Doku',
    status: 'planned', start: '2025-11-01', end: '2026-02-28', progress: 0, budgetPlanned: 75000, costToDate: 0, hoursPerMonth: 6, org: 'BB' },
  { id: 'p5', title: 'Placetel‑Webex Migration', owner: 'Christian J.', description: 'Migrierte Telefonie/Collab‑Plattform inkl. Endgeräte',
    status: 'done', start: '2024-09-01', end: '2025-03-31', progress: 100, budgetPlanned: 15000, costToDate: 14500, hoursPerMonth: 0, org: 'BB' },
  { id: 'p6', title: 'Zentrales Monitoring (Grafana)', owner: 'Christian J.', description: 'Aufbau Dashboards für Kernsysteme & Alerts',
    status: 'planned', start: '2025-09-20', end: '2025-12-20', progress: 0, budgetPlanned: 10000, costToDate: 0, hoursPerMonth: 4, org: 'BB' },
];

// CSV-Import/Export (einfacher Parser; für produktiv ggf. PapaParse)
function parseCSV(text: string) {
  const cleaned = text.replace(/\r/g, '').trim();
  const lines = cleaned.split(/\n+/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [] as Project[];
  const headerLine = lines[0];
  const delim = headerLine.split(';').length > headerLine.split(',').length ? ';' : ',';
  const headers = headerLine.split(delim).map((h) => h.trim().replace(/^"|"$/g, ''));
  const idx = (k: string) => headers.findIndex((h) => h.toLowerCase() === k.toLowerCase());

  const rows: Project[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(delim).map((x) => x.trim().replace(/^"|"$/g, ''));
    if (!raw.length || raw.every((c) => c === '')) continue;
    const get = (k: string, d: string = '') => {
      const id = idx(k);
      return id >= 0 ? raw[id] : d;
    };
    const num = (v: any) => (v === '' || v == null ? 0 : Number(v));
    rows.push({
      id: get('id') || `row-${i}`,
      title: get('title'),
      owner: get('owner'),
      description: get('description'),
      status: (get('status') || '').toLowerCase() || 'planned',
      start: get('start'),
      end: get('end'),
      progress: num(get('progress')),
      budgetPlanned: num(get('budgetPlanned')),
      costToDate: num(get('costToDate')),
      hoursPerMonth: num(get('hoursPerMonth')),
      org: get('org') || 'BB',
    });
  }
  return rows;
}
function toCSV(projects: Project[]) {
  const header = ['id','title','owner','description','status','start','end','progress','budgetPlanned','costToDate','hoursPerMonth','org'].join(';');
  const lines = projects.map((p) => [p.id,p.title,p.owner,p.description,p.status,p.start,p.end,p.progress,p.budgetPlanned,p.costToDate,p.hoursPerMonth,p.org||''].map(String).join(';'));
  return [header, ...lines].join('\n');
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [capacity, setCapacity] = useState<number>(16);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [yearOnly, setYearOnly] = useState<boolean>(true);
  const [year, setYear] = useState<number>(currentYear);

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
  }, [filtered, normalized, yearOnly, year]);

  const kpis = useMemo(() => {
    const base = yearOnly ? normalized.filter((p) => overlapsYearD(p, year)) : normalized;
    const active = base.filter((p) => p.statusNorm === 'active');
    const planned = base.filter((p) => p.statusNorm === 'planned');
    const done = base.filter((p) => p.statusNorm === 'done');

    let budgetPlannedSum = 0; let costSum = 0;
    for (const p of base) {
      if (yearOnly) {
        budgetPlannedSum += plannedBudgetForYearD(p, year);
        costSum += costsYTDForYearD(p, year);
      } else {
        budgetPlannedSum += p.budgetPlanned || 0;
        costSum += p.costToDate || 0;
      }
    }

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const usedHours = normalized
      .filter((p) => p.endD >= monthStart && p.startD <= monthEnd)
      .reduce((s, p) => s + (p.hoursPerMonth || 0), 0);

    return { activeCount: active.length, plannedCount: planned.length, doneCount: done.length, budgetPlannedSum, costSum, usedHours };
  }, [normalized, yearOnly, year]);

  const resourceRAG = calcResourceRAG(kpis.usedHours, capacity);

  const onCSVUpload = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length) setProjects(rows as Project[]);
  };
  const downloadCSVTemplate = () => {
    const csv = toCSV(projects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projekte_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dev self-checks only in development
  useEffect(() => { if (!import.meta.env.DEV) return;
    try {
      const assert = (name: string, cond: boolean) => { if (!cond) throw new Error(name); console.info('OK', name); };
      const csv1 = ['id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org','1;Test A;CJ;Desc;ACTIVE;2025-01-01;2025-12-31;50;1000;500;4;BB'].join('\r\n');
      const rows1 = parseCSV(csv1); assert('CSV ; delimiter length', rows1.length === 1); assert('CSV status lowercased', (rows1 as any)[0].status === 'active'); assert('CSV numeric parse budget', (rows1 as any)[0].budgetPlanned === 1000);
      const csv2 = ['id,title,owner,description,status,start,end,progress,budgetPlanned,costToDate,hoursPerMonth,org','2,Test B,CJ,Desc,planned,2025-02-01,2025-03-01,25,2000,250,2,MBG'].join('\n');
      const rows2 = parseCSV(csv2); assert('CSV , delimiter fields', rows2.length === 1 && (rows2 as any)[0].org === 'MBG' && (rows2 as any)[0].progress === 25);
      const p = { startD: toDate('2025-01-01'), endD: toDate('2025-12-31'), budgetPlanned: 36500, costToDate: 10000, progress: 0 } as any;
      const pb = plannedBudgetForYearD(p, 2025); assert('plannedBudgetForYear full overlap == budget', pb === 36500);
      const dd = daysBetween('01.01.2025','31.12.2025'); assert('DD.MM.YYYY daysBetween', dd === 364);
      const rag = calcTimeRAGD({ startD: toDate('2025-01-01'), endD: toDate('2025-12-31'), progress: 50 } as any); assert('calcTimeRAGD returns one of green/amber/red', ['green','amber','red'].includes(rag as any));
      console.info('All dev tests passed.');
    } catch (e) { console.error('Dev tests failed:', e); }
  }, []);

  // Derived chart data
  const budgetSpent = Math.min(kpis.costSum, kpis.budgetPlannedSum);
  const budgetRemaining = Math.max(kpis.budgetPlannedSum - kpis.costSum, 0);
  const burndown = useMemo(() => {
    const ideal = [60, 50, 40, 30, 20, 10, 0];
    const actual = [60, 52, 45, 37, 28, 21, 8];
    return ideal.map((v, i) => ({ Woche: i, Ideal: v, Ist: actual[i] }));
  }, []);

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">IT‑Projektübersicht (Demo)</h1>
            <p className={`text-sm ${COLORS.subtext}`}>Portfolio‑Überblick für Geschäftsführung & Aufsichtsrat — Stand: {fmtDate(today)}</p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Laufend"><div className="text-3xl font-semibold">{kpis.activeCount}</div></Card>
          <Card title="Geplant"><div className="text-3xl font-semibold">{kpis.plannedCount}</div></Card>
          <Card title="Abgeschlossen"><div className="text-3xl font-semibold">{kpis.doneCount}</div></Card>
          <Card title="Kapazität (Monat)"><div className="text-3xl font-semibold">{capacity} h</div></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Budget (Jahr)">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-slate-600">{new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(kpis.costSum)} / {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(kpis.budgetPlannedSum)}</div>
              <BudgetDonut spent={budgetSpent} remaining={budgetRemaining} />
            </div>
          </Card>
          <Card title="Ressourcen (aktueller Monat)">
            <ResourceBar capacity={capacity} usedHours={kpis.usedHours} />
            <div className="mt-2"><span className="text-sm text-slate-600">Ampel: </span><span className="text-sm" style={{ color: resourceRAG === 'red' ? '#dc2626' : resourceRAG === 'amber' ? '#f59e0b' : '#16a34a' }}>{resourceRAG.toUpperCase()}</span></div>
          </Card>
          <Card title="Burndown (Projekt p1)">
            <BurndownChart data={burndown} />
          </Card>
        </div>

        <ProjectsTable
          projects={filtered}
          year={year}
          yearOnly={yearOnly}
          plannedBudgetForYearD={plannedBudgetForYearD as any}
          costsYTDForYearD={costsYTDForYearD as any}
          calcTimeRAGD={calcTimeRAGD as any}
          calcBudgetRAG={calcBudgetRAG as any}
        />

        <Card>
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Demo: Zahlen & Projekte sind fiktiv. Ampeln basieren auf einfachen Heuristiken (Zeit vs. Fortschritt, Budgetverbrauch, Ressourcengrenze).
              Kapazitäts‑Grenze oben änderbar (Standard 16h/Monat). Jahres‑Sicht pro‑rata (Tagesanteile) für Budget/Kosten.
            </p>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-medium">CSV‑Spalten (erwartet)</summary>
              <div className="mt-1">id; title; owner; description; status; start; end; progress; budgetPlanned; costToDate; hoursPerMonth; org</div>
            </details>
          </div>
        </Card>

        {/* Timeline */}
        <Card title="Zeitachse (Gantt‑ähnlich)">
          <div className="space-y-3">
            {filtered.map((p) => {
              const s = yearOnly ? new Date(Math.max(yearStart(year).getTime(), p.startD.getTime())) : p.startD;
              const e = yearOnly ? new Date(Math.min(yearEnd(year).getTime(), p.endD.getTime())) : p.endD;
              const startOffset = Math.round((daysBetween(bounds.minStart, s) / bounds.totalDays) * 100);
              const widthPct = Math.max(1, Math.round((daysBetween(s, e) / bounds.totalDays) * 100));
              const color = p.statusNorm === 'done' ? COLORS.slate : p.statusNorm === 'planned' ? COLORS.amber : COLORS.blue;
              return (
                <div key={p.id} className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-slate-500">{fmtDate(s)} – {fmtDate(e)}</div>
                  </div>
                  <div className="w-full h-6 bg-slate-100 rounded">
                    <div className="h-6 rounded relative" style={{ marginLeft: `${startOffset}%`, width: `${widthPct}%`, backgroundColor: color }} title={`${fmtDate(s)} – ${fmtDate(e)}`}>
                      {p.statusNorm !== 'planned' && (<div className="absolute top-0 left-0 h-6 bg-black/10 rounded" style={{ width: `${clamp(p.progress, 0, 100)}%` }} aria-hidden />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}

