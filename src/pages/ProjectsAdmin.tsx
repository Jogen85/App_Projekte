import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../types';
import { Card, COLORS } from '../ui';
import { parseProjectsCSV, projectsToCSV } from '../lib/csv';

const emptyProject = (): Project => ({
  id: `p-${Math.random().toString(36).slice(2,8)}`,
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
          try { setProjects(parseProjectsCSV(text)); } catch (err) { setMsg((err as Error)?.message || 'CSV konnte nicht geladen werden.'); }
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const onImportCSV = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
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
                  <th className="py-2 pr-3">Verantwortlicher MA</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">Ende</th>
                  <th className="py-2 pr-3">Fortschritt %</th>
                  <th className="py-2 pr-3">Budget &euro;</th>
                  <th className="py-2 pr-3">Kosten &euro;</th>
                  <th className="py-2 pr-3">Gesellschaft</th>
                  <th className="py-2 pr-3">AT 8.2 erf.</th>
                  <th className="py-2 pr-3">AT 8.2 durchgef.</th>
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
                        <option value="planned">Geplant</option>
                        <option value="active">Laufend</option>
                        <option value="done">Abgeschlossen</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2"><input type="date" className="border rounded px-1" value={p.start} onChange={(e)=>update(i,'start',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="date" className="border rounded px-1" value={p.end} onChange={(e)=>update(i,'end',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-20 border rounded px-1" value={p.progress} min={0} max={100} onChange={(e)=>update(i,'progress',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-28 border rounded px-1" value={p.budgetPlanned} min={0} onChange={(e)=>update(i,'budgetPlanned',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input type="number" className="w-28 border rounded px-1" value={p.costToDate} min={0} onChange={(e)=>update(i,'costToDate',e.target.value)} /></td>
                    <td className="py-2 pr-2"><input className="w-24 border rounded px-1" value={p.org||''} onChange={(e)=>update(i,'org',e.target.value)} /></td>
                    <td className="py-2 pr-2 text-center"><input type="checkbox" checked={p.requiresAT82Check||false} onChange={(e)=>update(i,'requiresAT82Check',e.target.checked)} /></td>
                    <td className="py-2 pr-2 text-center"><input type="checkbox" checked={p.at82Completed||false} onChange={(e)=>update(i,'at82Completed',e.target.checked)} /></td>
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




