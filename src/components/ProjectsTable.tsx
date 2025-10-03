import React from 'react';
import { Badge, ProgressBar, Ampel } from '../ui';
import { fmtDate } from '../lib';
import type { NormalizedProject } from '../types';

type Props = {
  projects: NormalizedProject[];
  year: number;
  yearOnly: boolean;
  plannedBudgetForYearD: (p: any, y: number) => number;
  costsYTDForYearD: (p: any, y: number) => number;
  calcTimeRAGD: (p: any) => 'green' | 'amber' | 'red' | string;
  calcBudgetRAG: (p: any) => 'green' | 'amber' | 'red' | string;
  highlightId?: string | null;
};

const ProjectsTable: React.FC<Props> = ({ projects, year, yearOnly, plannedBudgetForYearD, costsYTDForYearD, calcTimeRAGD, calcBudgetRAG, highlightId = null }) => {
  React.useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`proj-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);
  return (
    <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2 pr-4">{"Projekt"}</th>
              <th className="py-2 pr-4">{"Gesellschaft"}</th>
              <th className="py-2 pr-3 text-center">AT 8.2<br/>erforderlich</th>
              <th className="py-2 pr-3 text-center">AT 8.2<br/>durchgeführt</th>
              <th className="py-2 pr-4">{"Status"}</th>
              <th className="py-2 pr-4">{"Zeitraum"}</th>
              <th className="py-2 pr-4">{"Restzeit"}</th>
              <th className="py-2 pr-4">{"Fortschritt/Budget"}</th>
              <th className="py-2 pr-4">{"Ampeln"}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const plannedBudget = yearOnly ? plannedBudgetForYearD(p, year) : (p.budgetPlanned || 0);
              const costs = yearOnly ? costsYTDForYearD(p, year) : (p.costToDate || 0);
              const timeRAG = calcTimeRAGD(p as any);
              const budgetRAG = calcBudgetRAG(p as any);
              const resttage = Math.max(0, Math.round((p.endD.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const isHL = highlightId === p.id;

              // Calculate target progress (Soll-Fortschritt)
              const totalDays = Math.max(1, (p.endD.getTime() - p.startD.getTime()) / (1000 * 60 * 60 * 24));
              const now = new Date();
              let elapsedDays = (now.getTime() - p.startD.getTime()) / (1000 * 60 * 60 * 24);
              if (now < p.startD) elapsedDays = 0;
              if (now > p.endD) elapsedDays = totalDays;
              const targetProgress = (elapsedDays / totalDays) * 100;
              return (
                <tr key={p.id} id={`proj-${p.id}`} className={`border-t border-slate-200 ${isHL ? 'bg-sky-50' : ''}`}>
                  <td className="py-3 pr-4">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-slate-500 text-xs">{"Verantwortlicher MA: "}{p.owner}</div>
                    <div className="text-slate-500 text-xs mt-1 max-w-md">{p.description}</div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{p.org || '-'}</td>
                  <td className="py-3 pr-3 text-center">
                    {p.requiresAT82Check ? <span className="text-green-600">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    {p.at82Completed ? <span className="text-green-600">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {p.statusNorm === 'active' && <Badge tone="green">{"laufend"}</Badge>}
                    {p.statusNorm === 'planned' && <Badge tone="amber">{"geplant"}</Badge>}
                    {p.statusNorm === 'done' && <Badge tone="slate">{"abgeschlossen"}</Badge>}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(p.startD)} - {fmtDate(p.endD)}</td>
                  <td className="py-3 pr-4">
                    {p.statusNorm === 'done' ? <span className="text-slate-500">{"abgeschlossen"}</span> : <><div>{resttage} {"Tage"}</div><div className="text-xs text-slate-500">{"bis "}{fmtDate(p.endD)}</div></>}
                  </td>
                  <td className="py-3 pr-4 w-56">
                    <div className="mb-3">
                      <div className="text-xs text-slate-600 mb-1">Fortschritt</div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={p.progress} targetValue={targetProgress} />
                        <span className="text-xs w-10 text-right">{p.progress}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Budget</div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1" title={`${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(costs)} / ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(plannedBudget)} • ${Math.round((costs / Math.max(plannedBudget, 1)) * 100)}%`}>
                          <ProgressBar value={(costs / Math.max(plannedBudget, 1)) * 100} />
                        </div>
                        <span className="text-xs w-10 text-right">{Math.round((costs / Math.max(plannedBudget, 1)) * 100)}%</span>
                      </div>
                      <div className="text-xs text-slate-500">{new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(costs)} {"/"} {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(plannedBudget)}</div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="space-y-1">
                      <Ampel color={timeRAG as any} label={"Zeit"} />
                      <Ampel color={budgetRAG as any} label={"Budget"} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
  );
};

export default ProjectsTable;
