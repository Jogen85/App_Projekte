import React, { useMemo, useState, useEffect } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { Card, Badge, Ampel, ProgressBar, COLORS } from "./ui";

// --- Types ---
export type Project = {
  id: string;
  title: string;
  owner: string;
  description: string;
  status: "planned" | "active" | "done" | string;
  start: string; // ISO or DD.MM.YYYY
  end: string;   // ISO or DD.MM.YYYY
  progress: number;
  budgetPlanned: number;
  costToDate: number;
  hoursPerMonth: number;
  org?: string;
};
type NormalizedProject = Project & {
  startD: Date;
  endD: Date;
  orgNorm: string;
  statusNorm: string;
};

/**
 * IT‑Projektübersicht Dashboard (Demo) — 2025 Year View + CSV Import + Org‑Filter (BB/MBG)
 */
// Helper: Date utils — unterstützt ISO (YYYY-MM-DD) und deutsch (DD.MM.YYYY)
const toDate = (s: any): Date => {
  if (s instanceof Date) return s;
  if (typeof s === "string") {
    const str = s.trim();
    const parts = str.split(".");
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const d = Number(parts[0]); const m = Number(parts[1]) - 1; const y = Number(parts[2]);
      const dt = new Date(y, m, d); if (!isNaN(dt.getTime())) return dt;
    }
    return new Date(str);
  }
  return new Date(s);
};
const fmtDate = (d: Date) => d.toLocaleDateString("de-DE");
const today = new Date();
const currentYear = today.getFullYear();

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const daysBetween = (a: any, b: any) => {
  const A = toDate(a); const B = toDate(b);
  if (isNaN(A.getTime()) || isNaN(B.getTime())) return 0;
  return Math.max(0, Math.round((B.getTime() - A.getTime()) / MS_PER_DAY));
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const yearStart = (y: number) => new Date(y, 0, 1);
const yearEnd = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999);

const overlapDays = (aStart: any, aEnd: any, bStart: any, bEnd: any) => {
  const sA = toDate(aStart); const eA = toDate(aEnd);
  const sB = toDate(bStart); const eB = toDate(bEnd);
  if ([sA, eA, sB, eB].some((d) => isNaN(d.getTime()))) return 0;
  const s = sA > sB ? sA : sB;
  const e = eA < eB ? eA : eB;
  const diff = (e.getTime() - s.getTime()) / MS_PER_DAY;
  return Math.max(0, Math.round(diff));
};

// Beispiel-Projektdaten
const DEMO_PROJECTS: Project[] = [
  { id: "p1", title: "DMS Migration MBG (Cloud)", owner: "Christian J.", description: "Migration d.velop DMS in die Cloud inkl. Aktenpläne & Prozesse",
    status: "active", start: "2025-05-01", end: "2025-12-15", progress: 65, budgetPlanned: 120000, costToDate: 70000, hoursPerMonth: 8, org: "MBG" },
  { id: "p2", title: "EXEC DMS Stabilisierung (BB)", owner: "Christian J.", description: "Stabilisierung & Performanceoptimierung EXEC DMS im RZ",
    status: "active", start: "2025-03-10", end: "2025-10-31", progress: 80, budgetPlanned: 60000, costToDate: 58000, hoursPerMonth: 6, org: "BB" },
  { id: "p3", title: "E‑Rechnung 2025 (BB/MBG)", owner: "Christian J.", description: "Implementierung E‑Rechnungsprozesse (EXEC/FIDES & d.velop)",
    status: "active", start: "2025-07-01", end: "2025-11-30", progress: 35, budgetPlanned: 40000, costToDate: 12000, hoursPerMonth: 4, org: "BB/MBG" },
  { id: "p4", title: "MPLS Redesign Rechenzentrum", owner: "Christian J.", description: "Neukonzeption MPLS/Edge inkl. Failover & Doku",
    status: "planned", start: "2025-11-01", end: "2026-02-28", progress: 0, budgetPlanned: 75000, costToDate: 0, hoursPerMonth: 6, org: "BB" },
  { id: "p5", title: "Placetel‑Webex Migration", owner: "Christian J.", description: "Migrierte Telefonie/Collab‑Plattform inkl. Endgeräte",
    status: "done", start: "2024-09-01", end: "2025-03-31", progress: 100, budgetPlanned: 15000, costToDate: 14500, hoursPerMonth: 0, org: "BB" },
  { id: "p6", title: "Zentrales Monitoring (Grafana)", owner: "Christian J.", description: "Aufbau Dashboards für Kernsysteme & Alerts",
    status: "planned", start: "2025-09-20", end: "2025-12-20", progress: 0, budgetPlanned: 10000, costToDate: 0, hoursPerMonth: 4, org: "BB" },
];

// --- Berechnungen (vorgeparst) ---
function calcTimeRAGD(p: any) {
  const start = p.startD; const end = p.endD;
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = clamp(today.getTime() - start.getTime(), 0, total);
  const expected = Math.round((elapsed / total) * 100);
  const delta = (p.progress || 0) - expected;
  if (today > end && (p.progress || 0) < 100) return "red";
  if (delta < -15) return "red";
  if (delta < -5) return "amber";
  return "green";
}

function calcBudgetRAG(p: any) {
  if (p.budgetPlanned <= 0) return "green";
  const spendPct = (p.costToDate / p.budgetPlanned) * 100;
  if (spendPct > 105) return "red";
  if (spendPct > 90 && p.progress < 80) return "amber";
  return "green";
}

function calcResourceRAG(totalUsed: number, capacity: number) {
  if (totalUsed > capacity) return "red";
  if (totalUsed > capacity * 0.9) return "amber";
  return "green";
}

const projectDaySpanD = (p: any) => Math.max(1, daysBetween(p.startD, p.endD));
function plannedBudgetForYearD(p: any, y: number) {
  const overlap = overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y));
  return (p.budgetPlanned || 0) * (overlap / projectDaySpanD(p));
}
function costsYTDForYearD(p: any, y: number) {
  const elapsedEnd = new Date(Math.min(today.getTime(), p.endD.getTime()));
  const elapsedDays = Math.max(1, daysBetween(p.startD, elapsedEnd));
  const yEnd = y === today.getFullYear() ? elapsedEnd : yearEnd(y);
  const yOverlap = overlapDays(p.startD, elapsedEnd, yearStart(y), yEnd);
  return (p.costToDate || 0) * (yOverlap / elapsedDays);
}

// CSV-Import/Export
function parseCSV(text: string) {
  const cleaned = text.replace(/\r/g, "").trim();
  const lines = cleaned.split(/\n+/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headerLine = lines[0];
  const delim = headerLine.split(";").length > headerLine.split(",").length ? ";" : ",";
  const headers = headerLine.split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
  const idx = (k: string) => headers.findIndex((h) => h.toLowerCase() === k.toLowerCase());

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(delim).map((x) => x.trim().replace(/^"|"$/g, ""));
    if (!raw.length || raw.every((c) => c === "")) continue;
    const get = (k: string, d: string = "") => {
      const id = idx(k);
      return id >= 0 ? raw[id] : d;
    };
    const num = (v: any) => (v === "" || v == null ? 0 : Number(v));
    rows.push({
      id: get("id") || `row-${i}`,
      title: get("title"),
      owner: get("owner"),
      description: get("description"),
      status: (get("status") || "").toLowerCase() || "planned",
      start: get("start"),
      end: get("end"),
      progress: num(get("progress")),
      budgetPlanned: num(get("budgetPlanned")),
      costToDate: num(get("costToDate")),
      hoursPerMonth: num(get("hoursPerMonth")),
      org: get("org") || "BB",
    });
  }
  return rows;
}
function toCSV(projects: any[]) {
  const header = ["id","title","owner","description","status","start","end","progress","budgetPlanned","costToDate","hoursPerMonth","org"].join(";");
  const lines = projects.map((p) => [p.id,p.title,p.owner,p.description,p.status,p.start,p.end,p.progress,p.budgetPlanned,p.costToDate,p.hoursPerMonth,p.org||""].map(String).join(";"));
  return [header, ...lines].join("\n");
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [capacity, setCapacity] = useState<number>(16);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [yearOnly, setYearOnly] = useState<boolean>(true);
  const [year, setYear] = useState<number>(currentYear);

  const normalized = useMemo<NormalizedProject[]>(() =>
    projects.map((p) => ({
      ...p,
      startD: toDate(p.start),
      endD: toDate(p.end),
      orgNorm: (p.org || "").toLowerCase(),
      statusNorm: (p.status || "").toLowerCase(),
    })),
  [projects]);

  const overlapsYearD = (p: any, y: number) => overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y)) > 0;

  const filtered = useMemo(() => {
    const sFilter = statusFilter.toLowerCase();
    const oFilter = orgFilter.toLowerCase();
    return normalized.filter((p) => {
      if (yearOnly && !overlapsYearD(p, year)) return false;
      if (sFilter !== "all" && p.statusNorm !== sFilter) return false;
      if (oFilter !== "all" && p.orgNorm !== oFilter) return false;
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
    const active = base.filter((p) => p.statusNorm === "active");
    const planned = base.filter((p) => p.statusNorm === "planned");
    const done = base.filter((p) => p.statusNorm === "done");

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

  const budgetData = [
    { name: "Ausgegeben", value: Math.min(kpis.costSum, kpis.budgetPlannedSum) },
    { name: "Verbleibend", value: Math.max(kpis.budgetPlannedSum - kpis.costSum, 0) },
  ];
  const resourceData = [
    { name: "Kapazität", Stunden: capacity },
    { name: "Geplant (akt. Monat)", Stunden: kpis.usedHours },
  ];

  const burndownProject = normalized.find((p) => p.id === "p1");
  const burndown = useMemo(() => {
    const ideal = [60, 50, 40, 30, 20, 10, 0];
    const actual = [60, 52, 45, 37, 28, 21, 8];
    return ideal.map((v, i) => ({ Woche: i, Ideal: v, Ist: actual[i] }));
  }, []);

  const onCSVUpload = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length) setProjects(rows as unknown as Project[]);
  };
  const downloadCSVTemplate = () => {
    const csv = toCSV(projects);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projekte_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { if (!import.meta.env.DEV) return;
    try {
      const assert = (name: string, cond: boolean) => { if (!cond) throw new Error(name); console.info("✓", name); };
      const csv1 = ["id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org","1;Test A;CJ;Desc;ACTIVE;2025-01-01;2025-12-31;50;1000;500;4;BB"].join("\r\n");
      const rows1 = parseCSV(csv1); assert("CSV ; delimiter length", rows1.length === 1); assert("CSV status lowercased", (rows1 as any)[0].status === "active"); assert("CSV numeric parse budget", (rows1 as any)[0].budgetPlanned === 1000);
      const csv2 = ["id,title,owner,description,status,start,end,progress,budgetPlanned,costToDate,hoursPerMonth,org","2,Test B,CJ,Desc,planned,2025-02-01,2025-03-01,25,2000,250,2,MBG"].join("\n");
      const rows2 = parseCSV(csv2); assert("CSV , delimiter fields", rows2.length === 1 && (rows2 as any)[0].org === "MBG" && (rows2 as any)[0].progress === 25);
      const p = { startD: toDate("2025-01-01"), endD: toDate("2025-12-31"), budgetPlanned: 36500, costToDate: 10000, progress: 0 };
      const pb = plannedBudgetForYearD(p, 2025); assert("plannedBudgetForYear full overlap == budget", pb === 36500);
      // DD.MM.YYYY parsing
      const dd = daysBetween("01.01.2025","31.12.2025"); assert("DD.MM.YYYY daysBetween", dd === 364);
      const rag = calcTimeRAGD({ startD: toDate("2025-01-01"), endD: toDate("2025-12-31"), progress: 50 }); assert("calcTimeRAGD returns one of green/amber/red", ["green","amber","red"].includes(rag));
      console.info("All dev tests passed.");
    } catch (e) { console.error("Dev tests failed:", e); }
  }, []);

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">IT‑Projektübersicht (Demo)</h1>
            <p className={`text-sm ${COLORS.subtext}`}>Portfolio‑Überblick für Geschäftsführung & Aufsichtsrat · Stand: {fmtDate(today)}</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Kapazität (h/Monat):</label>
              <input type="number" value={capacity} onChange={(e) => setCapacity(Math.max(0, Number(e.target.value)))} className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" min={0} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
                <option value="all">Alle</option>
                <option value="planned">Geplant</option>
                <option value="active">Laufend</option>
                <option value="done">Abgeschlossen</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Gesellschaft:</label>
              <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
                <option value="all">Alle</option>
                <option value="BB">BB</option>
                <option value="MBG">MBG</option>
                <option value="BB/MBG">BB/MBG</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Nur Jahr:</label>
              <input type="checkbox" checked={yearOnly} onChange={(e) => setYearOnly(e.target.checked)} />
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input id="csvInput" type="file" accept=".csv" className="hidden" onChange={(e) => onCSVUpload(e.target.files?.[0])} />
              <button onClick={() => document.getElementById("csvInput")!.click()} className="rounded-lg border px-3 py-1 text-sm">CSV laden</button>
              <button onClick={downloadCSVTemplate} className="rounded-lg border px-3 py-1 text-sm">CSV Vorlage</button>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-5 gap-4">
          <Card><div className="text-sm text-slate-500">Laufende Projekte</div><div className="text-2xl font-bold">{kpis.activeCount}</div></Card>
          <Card><div className="text-sm text-slate-500">Geplante Projekte</div><div className="text-2xl font-bold">{kpis.plannedCount}</div></Card>
          <Card><div className="text-sm text-slate-500">Abgeschlossene Projekte</div><div className="text-2xl font-bold">{kpis.doneCount}</div></Card>
          <Card><div className="text-sm text-slate-500">Budget ({yearOnly ? `geplant ${year}` : "gesamt"})</div><div className="text-2xl font-bold">{new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(kpis.budgetPlannedSum)}</div></Card>
          <Card><div className="text-sm text-slate-500">Kosten ({yearOnly ? `bisher ${year}` : "bisher gesamt"})</div><div className="text-2xl font-bold">{new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(kpis.costSum)}</div></Card>
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <Card title={`Budgetverbrauch (${yearOnly ? year : "gesamt"})`}>
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={budgetData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                  <Cell fill={COLORS.blue} /><Cell fill={COLORS.slate} />
                </Pie>
                <Tooltip formatter={(v:any) => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer></div>
            <div className="text-sm text-slate-600 mt-2">
              {new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(kpis.costSum)}
              {" "}von{" "}
              {new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(kpis.budgetPlannedSum)}
              {" "}{yearOnly ? `(${year})` : "ausgegeben"}
            </div>
          </Card>

          <Card title="Ressourcenauslastung (aktueller Monat)">
            <div className="flex items-center justify-between mb-3">
              <Ampel color={resourceRAG as any} label={resourceRAG === "green" ? "im Rahmen" : resourceRAG === "amber" ? "grenzwertig" : "überlastet"} />
              <div className="text-sm text-slate-600">Geplant: {kpis.usedHours}h / Kapazität: {capacity}h</div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis /><Tooltip />
                  <Bar dataKey="Stunden" fill={COLORS.cyan} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={`Burndown (Beispiel: ${burndownProject?.title || "Projekt"})`}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndown}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="Woche" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="Ideal" stroke={COLORS.slate} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Ist" stroke={COLORS.blue} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">Hinweis: Burndown ist typ. agil; hier als Beispiel‑Chart.</p>
          </Card>
        </section>

        <Card title="Projekte">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Projekt</th>
                <th className="py-2 pr-4">Gesellschaft</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Zeitraum</th>
                <th className="py-2 pr-4">Restlaufzeit</th>
                <th className="py-2 pr-4">Fortschritt</th>
                <th className="py-2 pr-4">Budget ({yearOnly ? year : "gesamt"})</th>
                <th className="py-2 pr-4">Ampeln</th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => {
                  const resttage = daysBetween(today, p.endD);
                  const timeRAG = calcTimeRAGD(p);
                  const budgetRAG = calcBudgetRAG(p);
                  const plannedBudget = yearOnly ? plannedBudgetForYearD(p, year) : p.budgetPlanned || 0;
                  const costs = yearOnly ? costsYTDForYearD(p, year) : p.costToDate || 0;
                  const donutData = [
                    { name: "Ausgegeben", value: Math.min(costs, plannedBudget) },
                    { name: "Offen", value: Math.max(plannedBudget - costs, 0) },
                  ];
                  return (
                    <tr key={p.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-slate-500 text-xs">Verantw.: {p.owner}</div>
                        <div className="text-slate-500 text-xs mt-1 max-w-md">{p.description}</div>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{p.org || "-"}</td>
                      <td className="py-3 pr-4">
                        {p.statusNorm === "active" && <Badge tone="green">laufend</Badge>}
                        {p.statusNorm === "planned" && <Badge tone="amber">geplant</Badge>}
                        {p.statusNorm === "done" && <Badge tone="slate">abgeschlossen</Badge>}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(p.startD)} – {fmtDate(p.endD)}</td>
                      <td className="py-3 pr-4">
                        {p.statusNorm === "done" ? <span className="text-slate-500">abgeschlossen</span> : <><div>{resttage} Tage</div><div className="text-xs text-slate-500">bis {fmtDate(p.endD)}</div></>}
                      </td>
                      <td className="py-3 pr-4 w-48">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={p.progress} />
                          <span className="text-xs w-10 text-right">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 w-56">
                        <div className="text-xs text-slate-600 mb-1">{new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(costs)} / {new Intl.NumberFormat("de-DE",{style:"currency","currency":"EUR"}).format(plannedBudget)}</div>
                        <div className="h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={donutData} dataKey="value" nameKey="name" outerRadius={45} innerRadius={28}><Cell fill={COLORS.blue} /><Cell fill={COLORS.slate} /></Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-xs text-slate-500">Zuteilung: {p.hoursPerMonth}h/Monat</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          <Ampel color={timeRAG as any} label="Zeit" />
                          <Ampel color={budgetRAG as any} label="Budget" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Zeitachse (Gantt‑ähnlich)">
          <div className="space-y-3">
            {filtered.map((p) => {
              const s = yearOnly ? new Date(Math.max(yearStart(year).getTime(), p.startD.getTime())) : p.startD;
              const e = yearOnly ? new Date(Math.min(yearEnd(year).getTime(), p.endD.getTime())) : p.endD;
              const startOffset = Math.round((daysBetween(bounds.minStart, s) / bounds.totalDays) * 100);
              const widthPct = Math.max(1, Math.round((daysBetween(s, e) / bounds.totalDays) * 100));
              const color = p.statusNorm === "done" ? COLORS.slate : p.statusNorm === "planned" ? COLORS.amber : COLORS.blue;
              return (
                <div key={p.id} className="text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-slate-500">{fmtDate(s)} – {fmtDate(e)}</div>
                  </div>
                  <div className="w-full h-6 bg-slate-100 rounded">
                    <div className="h-6 rounded relative" style={{ marginLeft: `${startOffset}%`, width: `${widthPct}%`, backgroundColor: color }} title={`${fmtDate(s)} – ${fmtDate(e)}`}>
                      {p.statusNorm !== "planned" && (<div className="absolute top-0 left-0 h-6 bg-black/10 rounded" style={{ width: `${clamp(p.progress, 0, 100)}%` }} aria-hidden />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Demo: Zahlen & Projekte sind fiktiv. Ampeln basieren auf einfachen Heuristiken (Zeit vs. Fortschritt, Budgetverbrauch, Ressourcengrenze).
            Kapazitäts‑Grenze oben änderbar (Standard 16h/Monat). Jahr‑Sicht pro‑rata (Tagesanteile) für Budget/Kosten.
          </p>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium">CSV‑Spalten (erwartet)</summary>
            <div className="mt-1">id; title; owner; description; status; start; end; progress; budgetPlanned; costToDate; hoursPerMonth; org</div>
          </details>
        </div>

      </div>
    </div>
  );
}
