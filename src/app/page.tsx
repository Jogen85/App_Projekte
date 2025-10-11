import { sql } from '@/lib/db'
import type { Project, ITCost, VDBSBudgetItem, YearBudget, NormalizedProject } from '@/types'
import {
  getCurrentYear,
  getToday,
  toDate,
  plannedBudgetForYearD,
  costsYTDForYearD,
  calcTimeRAGD,
  daysBetween,
  getITCostsByCategoryD,
} from '@/lib'
import { Card, TYPOGRAPHY, LAYOUT } from '@/ui'
import Link from 'next/link'

async function getProjects(): Promise<Project[]> {
  const rows = await sql`
    SELECT
      id,
      project_number_internal as "projectNumberInternal",
      project_number_external as "projectNumberExternal",
      classification,
      title,
      owner,
      description,
      status,
      to_char(start_date, 'YYYY-MM-DD') as start,
      to_char(end_date, 'YYYY-MM-DD') as "end",
      progress,
      budget_planned as "budgetPlanned",
      cost_to_date as "costToDate",
      org,
      requires_at82_check as "requiresAT82Check",
      at82_completed as "at82Completed"
    FROM projects
    ORDER BY start_date DESC
  `

  return rows.map((row: any) => ({
    id: row.id,
    projectNumberInternal: row.projectNumberInternal,
    projectNumberExternal: row.projectNumberExternal || undefined,
    classification: row.classification,
    title: row.title,
    owner: row.owner,
    description: row.description || '',
    status: row.status,
    start: row.start,
    end: row.end,
    progress: Number(row.progress),
    budgetPlanned: Number(row.budgetPlanned),
    costToDate: Number(row.costToDate),
    org: row.org,
    requiresAT82Check: row.requiresAT82Check,
    at82Completed: row.at82Completed,
  }))
}

async function getITCosts(): Promise<ITCost[]> {
  const rows = await sql`
    SELECT
      id::text,
      description,
      category,
      provider,
      amount,
      frequency,
      cost_center as "costCenter",
      notes,
      year
    FROM it_costs
    ORDER BY year DESC, id DESC
  `

  return rows.map((row: any) => ({
    id: row.id,
    description: row.description,
    category: row.category,
    provider: row.provider || '',
    amount: Number(row.amount),
    frequency: row.frequency,
    costCenter: row.costCenter || '',
    notes: row.notes || '',
    year: Number(row.year),
  }))
}

async function getVDBSBudget(): Promise<VDBSBudgetItem[]> {
  const rows = await sql`
    SELECT
      id::text,
      project_number as "projectNumber",
      project_name as "projectName",
      category,
      budget_2026 as "budget2026",
      year
    FROM vdbs_budget
    ORDER BY year DESC, id
  `

  return rows.map((row: any) => ({
    id: row.id,
    projectNumber: row.projectNumber,
    projectName: row.projectName,
    category: row.category,
    budget2026: Number(row.budget2026),
    year: Number(row.year),
  }))
}

async function getYearBudgets(): Promise<YearBudget[]> {
  const rows = await sql`
    SELECT year, budget
    FROM year_budgets
    ORDER BY year DESC
  `

  return rows.map((row: any) => ({
    year: Number(row.year),
    budget: Number(row.budget),
  }))
}

export default async function ITCockpitPage() {
  const year = getCurrentYear()
  const today = getToday()

  // Parallel data fetching
  const [projects, itCosts, vdbsBudget, yearBudgets] = await Promise.all([
    getProjects(),
    getITCosts(),
    getVDBSBudget(),
    getYearBudgets(),
  ])

  const normalizedProjects: NormalizedProject[] = projects.map((p) => ({
    ...p,
    startD: toDate(p.start),
    endD: toDate(p.end),
    statusNorm: (p.status || '').toLowerCase(),
    orgNorm: p.org || 'Nicht zugeordnet',
  }))

  const activeProjects = normalizedProjects.filter((p) => p.statusNorm === 'active')

  const projectPlan = normalizedProjects.reduce(
    (sum, project) => sum + plannedBudgetForYearD(project, year),
    0
  )

  const projectActual = normalizedProjects.reduce(
    (sum, project) => sum + costsYTDForYearD(project, year),
    0
  )

  const yearItCosts = itCosts.filter((item) => item.year === year)
  const itCostSummary = getITCostsByCategoryD(yearItCosts, year, today)

  const vdbsTotal = vdbsBudget
    .filter((item) => item.year === year)
    .reduce((sum, item) => sum + item.budget2026, 0)

  const yearBudget = yearBudgets.find((b) => b.year === year) || null

  const totalPlanned = projectPlan + itCostSummary.total + vdbsTotal
  const totalActual = projectActual + itCostSummary.total

  const behindProjects = activeProjects.filter((project) => {
    const rag = calcTimeRAGD(project)
    if (rag === 'red') return true
    const totalDays = Math.max(1, daysBetween(project.startD, project.endD))
    const now = today
    let elapsed = daysBetween(project.startD, now)
    if (now < project.startD) elapsed = 0
    if (now > project.endD) elapsed = totalDays
    const target = Math.max(0, Math.min(100, (elapsed / totalDays) * 100))
    return (project.progress || 0) + 10 < target
  })

  const budgetOverruns = normalizedProjects
    .map((project) => {
      const delta = (project.costToDate || 0) - (project.budgetPlanned || 0)
      return { project, delta }
    })
    .filter(({ delta }) => delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)

  const upcomingDeadlines = normalizedProjects
    .filter((project) => project.endD >= today)
    .sort((a, b) => a.endD.getTime() - b.endD.getTime())
    .slice(0, 5)

  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const fmtDateShort = (date: Date) =>
    date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const warningPlan = yearBudget && totalPlanned > yearBudget.budget
  const warningActual = yearBudget && totalActual > yearBudget.budget

  return (
    <div className={LAYOUT.pageContainer}>
      <div className={LAYOUT.contentWrapper}>
        <header className={LAYOUT.header}>
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>IT-Cockpit</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
              Verdichtete Kennzahlen, Warnungen und Schnellzugriffe über alle Bereiche.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Jahr: {year}</span>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          <Card title="Projekte gesamt" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-1">
              <div className="text-3xl font-bold text-blue-600">{normalizedProjects.length}</div>
              <div className="text-xs text-gray-500">
                {activeProjects.length} laufend · {behindProjects.length} kritisch
              </div>
            </div>
          </Card>

          <Card title="Projektkosten" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">Plan {year}</div>
              <div className="text-lg font-semibold text-gray-900">{fmtCurrency(projectPlan)}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Ist (YTD)</div>
              <div className="text-lg font-semibold text-blue-600">{fmtCurrency(projectActual)}</div>
            </div>
          </Card>

          <Card title="IT-Kosten" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-2xl font-bold text-gray-900">{fmtCurrency(itCostSummary.total)}</div>
              <div className="text-xs text-gray-500">Aktuelles Jahr</div>
            </div>
          </Card>

          <Card title="VDB-S Budget" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="text-2xl font-bold text-gray-900">{fmtCurrency(vdbsTotal)}</div>
              <div className="text-xs text-gray-500">Geplante Positionen {year}</div>
            </div>
          </Card>
        </div>

        {(warningPlan || warningActual) && (
          <Card className="border-red-200 bg-red-50">
            <div className="flex flex-col gap-2 text-sm text-red-800">
              <strong>⚠️ Budgetwarnung {year}</strong>
              {warningPlan && yearBudget && (
                <div>
                  Verplante Mittel ({fmtCurrency(totalPlanned)}) übersteigen das Jahresbudget ({fmtCurrency(yearBudget.budget)}).
                </div>
              )}
              {warningActual && yearBudget && (
                <div>
                  Bisherige Ausgaben ({fmtCurrency(totalActual)}) übersteigen das Jahresbudget ({fmtCurrency(yearBudget.budget)}).
                </div>
              )}
              <div className="text-xs text-red-700">
                Details im Tab <Link href="/overall-budget" className="underline">Gesamtbudgetplanung</Link>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <Card title="Kritische Projekte">
            {behindProjects.length === 0 ? (
              <div className="text-sm text-gray-500">Keine Projekte mit kritischem Zeitstatus.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {behindProjects.slice(0, 6).map((project) => (
                  <li key={project.id} className="flex items-center justify-between rounded border border-red-100 bg-red-50 px-3 py-2">
                    <div>
                      <div className="font-medium text-red-700">{project.title}</div>
                      <div className="text-xs text-red-600">
                        Ende: {fmtDateShort(project.endD)} · Fortschritt: {project.progress ?? 0}%
                      </div>
                    </div>
                    <Link href={`/projects?highlight=${project.id}`} className="text-xs font-semibold text-red-700 hover:underline">
                      Projekt öffnen
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Budgetüberschreitungen (Projekt)">
            {budgetOverruns.length === 0 ? (
              <div className="text-sm text-gray-500">Keine überschrittenen Projektbudgets.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {budgetOverruns.map(({ project, delta }) => (
                    <tr key={project.id} className="border-b last:border-none">
                      <td className="px-2 py-2 align-top">
                        <div className="font-medium text-gray-900">{project.title}</div>
                        <div className="text-xs text-gray-500">{project.projectNumberInternal}</div>
                      </td>
                      <td className="px-2 py-2 text-right align-top">
                        <div className="text-xs text-gray-500 uppercase">Über Budget</div>
                        <div className="text-sm font-semibold text-red-600">{fmtCurrency(delta)}</div>
                        <Link href={`/projects?highlight=${project.id}`} className="text-xs text-blue-600 hover:underline">
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card title="Bevorstehende Deadlines">
          {upcomingDeadlines.length === 0 ? (
            <div className="text-sm text-gray-500">Keine zukünftigen Endtermine vorhanden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Projekt</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Gesellschaft</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Ende</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Budget</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Ist</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingDeadlines.map((project) => (
                    <tr key={project.id} className="border-b last:border-none">
                      <td className="px-3 py-2 text-gray-900">{project.title}</td>
                      <td className="px-3 py-2 text-gray-500">{project.orgNorm}</td>
                      <td className="px-3 py-2 text-gray-700">{fmtDateShort(project.endD)}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(project.budgetPlanned || 0)}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(project.costToDate || 0)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/projects?highlight=${project.id}`} className="text-xs text-blue-600 hover:underline">
                          Öffnen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Schnellzugriff">
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/projects" className="rounded border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-600 hover:bg-blue-100">
              Projektdashboard
            </Link>
            <Link href="/overall-budget" className="rounded border border-purple-200 bg-purple-50 px-4 py-2 font-medium text-purple-600 hover:bg-purple-100">
              Gesamtbudget
            </Link>
            <Link href="/it-costs" className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 font-medium text-emerald-600 hover:bg-emerald-100">
              IT-Kosten
            </Link>
            <Link href="/vdbs-budget" className="rounded border border-amber-200 bg-amber-50 px-4 py-2 font-medium text-amber-600 hover:bg-amber-100">
              VDB-S Budget
            </Link>
            <Link href="/admin" className="rounded border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
              Projekte verwalten
            </Link>
            <Link href="/admin/it-costs" className="rounded border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
              IT-Kosten verwalten
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
