import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge, Card, ProgressBar, Ampel, COLORS } from '../ui';
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
};

const ProjectsTable: React.FC<Props> = ({ projects, year, yearOnly, plannedBudgetForYearD, costsYTDForYearD, calcTimeRAGD, calcBudgetRAG }) => {
  return (
    <Card title={"Projekte"}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2 pr-4">{"Projekt"}</th>
              <th className="py-2 pr-4">{"Gesellschaft"}</th>
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
              const donutData = [
                { name: 'Ausgegeben', value: Math.min(costs, plannedBudget) },
                { name: 'Verbleibend', value: Math.max(plannedBudget - costs, 0) },
              ];
              const timeRAG = calcTimeRAGD(p as any);
              const budgetRAG = calcBudgetRAG(p as any);
              const resttage = Math.max(0, Math.round((p.endD.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <tr key={p.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-slate-500 text-xs">{"Verantw.: "}{p.owner}</div>
                    <div className="text-slate-500 text-xs mt-1 max-w-md">{p.description}</div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{p.org || '-'}</td>
                  <td className="py-3 pr-4">
                    {p.statusNorm === 'active' && <Badge tone="green">{"laufend"}</Badge>}
                    {p.statusNorm === 'planned' && <Badge tone="amber">{"geplant"}</Badge>}
                    {p.statusNorm === 'done' && <Badge tone="slate">{"abgeschlossen"}</Badge>}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{fmtDate(p.startD)} – {fmtDate(p.endD)}</td>
                  <td className="py-3 pr-4">
                    {p.statusNorm === 'done' ? <span className="text-slate-500">{"abgeschlossen"}</span> : <><div>{resttage} {"Tage"}</div><div className="text-xs text-slate-500">{"bis "}{fmtDate(p.endD)}</div></>}
                  </td>
                  <td className="py-3 pr-4 w-56">
                    <div className="flex items-center gap-2 mb-2">
                      <ProgressBar value={p.progress} />
                      <span className="text-xs w-10 text-right">{p.progress}%</span>
                    </div>
                    <div className="text-xs text-slate-600 mb-1">{new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(costs)} {"/"} {new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(plannedBudget)}</div>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" nameKey="name" outerRadius={45} innerRadius={28}>
                            <Cell fill={COLORS.blue} />
                            <Cell fill={COLORS.slate} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-slate-500">{"Zuteilung: "}{p.hoursPerMonth}{"h/Monat"}</div>
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
    </Card>
  );
};

export default ProjectsTable;
