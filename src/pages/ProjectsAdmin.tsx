import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { Card, COLORS } from '../ui';

// Minimal CSV helpers (simplified, mirrors App.tsx logic)
function detectDelimiter(header: string): ';' | ',' {
  let sc = 0, cc = 0, inQ = false;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch === ';') sc++;
    else if (!inQ && ch === ',') cc++;
  }
  return sc >= cc ? ';' : ',';
}
function parseRecords(text: string, delim: ';' | ','): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  const s = text.replace(/\r/g, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else { inQ = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === delim) { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n') { row.push(cell.trim()); out.push(row); row = []; cell = ''; }
      else { cell += ch; }
    }
  }
  if (cell.length || row.length) { row.push(cell.trim()); out.push(row); }
  return out.filter(r => r.length && r.some(c => c !== ''));
}
function parseCSV(text: string): Project[] {
  if (!text) return [];
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const cleaned = text.split(String.fromCharCode(0)).join('');
  const headerLine = (cleaned.split(/\n/)[0] || '').trim();
  const delim = detectDelimiter(headerLine);
  const records = parseRecords(cleaned, delim);
  if (!records.length) return [];
  const headers = records[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const idx = (k: string) => headers.findIndex(h => h.toLowerCase() === k.toLowerCase());
  const rows: Project[] = [];
  for (let i = 1; i < records.length; i++) {
    const raw = records[i];
    const get = (k: string, d = '') => { const j = idx(k); return j >= 0 && j < raw.length ? raw[j] : d; };
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

const emptyProject = (): Project => ({
  id: `p-${Math.random().toString(36).slice(2,8)}`,
  title: '', owner: '', description: '', status: 'planned',
  start: '', end: '', progress: 0, budgetPlanned: 0, costToDate: 0, hoursPerMonth: 0, org: 'BB',
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
          setProjects(parseCSV(text));
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const onImportCSV = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    setProjects(rows);
    setDirty(true);
    setMsg(`CSV importiert: ${rows.length} Zeilen`);
  };
  const onExportCSV = () => {
    const csv = toCSV(projects);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
      (next[i] as any)[k] = k === 'progress' || k === 'budgetPlanned' || k === 'costToDate' || k === 'hoursPerMonth' ? Number(v) : v;
      return next;
    });
    setDirty(true);
  };
  const addRow = () => { setProjects((p) => [emptyProject(), ...p]); setDirty(true); };
  const removeRow = (i: number) => { setProjects((p) => p.filter((_, idx) => idx !== i)); setDirty(true); };

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin &ndash; Projekte bearbeiten</h1>
          <Link to="/" className="text-blue-600 hover:underline">Zum Dashboard</Link>
        </header>

        <Card>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={addRow} className="rounded-lg border px-3 py-1 text-sm">Neu</button>
            <input id="adminCsvInput" type="file" accept=".csv" className="hidden" onChange={(e) => onImportCSV(e.target.files?.[0])} />
            <button onClick={() => document.getElementById('adminCsvInput')!.click()} className="rounded-lg border px-3 py-1 text-sm">CSV importieren</button>
            <button onClick={onExportCSV} className="rounded-lg border px-3 py-1 text-sm">CSV exportieren</button>
            <button onClick={onSave} disabled={!dirty} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Speichern (lokal)</button>
            {msg && <span className="text-xs text-slate-500 ml-2">{msg}</span>}
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-3">Aktion</th>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Titel</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">Ende</th>
                  <th className="py-2 pr-3">% prog</th>
                  <th className="py-2 pr-3">Budget &euro;</th>
                  <th className="py-2 pr-3">Kosten &euro;</th>
                  <th className="py-2 pr-3">Std/Monat</th>
                  <th className="py-2 pr-3">Org</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="py-2 pr-2"><button onClick={() => removeRow(i)} className="text-red-600 text-xs">L&ouml;schen</button></td>
                    <td className="py-2 pr-2"><input className="w-36 border rounded px-1" value={p.id} onChange={(e)=>update(i,'id',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input className="w-64 border rounded px-1" value={p.title} onChange={(e)=>update(i,'title',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input className="w-40 border rounded px-1" value={p.owner} onChange={(e)=>update(i,'owner',e.target.value)} /></td>
                    <td className="py-2 pr-2">
                      <select className="border rounded px-1" value={p.status} onChange={(e)=>update(i,'status',e.target.value)}>
                        <option value="planned">planned</option>
                        <option value="active">active</option>
                        <option value="done">done</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2"><input type="date" className="border rounded px-1" value={p.start} onChange={(e)=>update(i,'start',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="date" className="border rounded px-1" value={p.end} onChange={(e)=>update(i,'end',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-20 border rounded px-1" value={p.progress} min={0} max={100} onChange={(e)=>update(i,'progress',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-28 border rounded px-1" value={p.budgetPlanned} min={0} onChange={(e)=>update(i,'budgetPlanned',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-28 border rounded px-1" value={p.costToDate} min={0} onChange={(e)=>update(i,'costToDate',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-24 border rounded px-1" value={p.hoursPerMonth} min={0} onChange={(e)=>update(i,'hoursPerMonth',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input className="w-24 border rounded px-1" value={p.org||''} onChange={(e)=>update(i,'org',e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProjectsAdmin;




