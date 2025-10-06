import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { Card, COLORS } from '../ui';
import { parseProjectsCSV, projectsToCSV, readFileAsText } from '../lib/csv';
import { toISODate } from '../lib';
import PINProtection from '../components/PINProtection';

// Import DEMO_PROJECTS als Fallback
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
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const ls = localStorage.getItem('projects_json');
    if (ls) {
      try { setProjects(JSON.parse(ls)); return; } catch (e) { /* ignore */ }
    }
    (async () => {
      try {
        const res = await fetch('/data/projects.csv');
        if (res.ok) {
          const text = await res.text();
          try { setProjects(parseProjectsCSV(text)); return; } catch (err) { setMsg((err as Error)?.message || 'CSV konnte nicht geladen werden.'); }
        }
      } catch (e) { /* ignore */ }
      // Fallback zu Demo-Daten wenn localStorage UND CSV fehlen
      setProjects(DEMO_PROJECTS);
      setMsg('Demo-Daten geladen (mit AT 8.2 Beispielwerten)');
    })();
  }, []);

  const onImportCSV = async (file?: File) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = parseProjectsCSV(text);
      setProjects(rows);
      setDirty(true);
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
  const onSave = () => {
    localStorage.setItem('projects_json', JSON.stringify(projects));
    setDirty(false);
    setMsg('Gespeichert. Dashboard nutzt nun diese Daten.');
  };

  const update = (i: number, k: keyof Project, v: any) => {
    setProjects((prev) => {
      const next = [...prev];
      if (k === 'progress' || k === 'budgetPlanned' || k === 'costToDate') {
        (next[i] as any)[k] = Number(v);
      } else if (k === 'requiresAT82Check' || k === 'at82Completed') {
        (next[i] as any)[k] = v === true || v === 'true';
      } else {
        (next[i] as any)[k] = v;
      }
      return next;
    });
    setDirty(true);
  };
  const addRow = () => { setProjects((p) => [emptyProject(), ...p]); setDirty(true); };
  const removeRow = (i: number) => { setProjects((p) => p.filter((_, idx) => idx !== i)); setDirty(true); };

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
            <button onClick={onSave} disabled={!dirty} className="rounded-lg bg-green-600 text-white hover:bg-green-700 px-4 py-2 text-sm font-medium disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">Speichern (lokal)</button>
            {msg && <span className="text-sm text-slate-600 ml-2 bg-slate-100 px-3 py-1 rounded-md">{msg}</span>}
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




