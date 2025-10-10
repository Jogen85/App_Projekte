import { sql } from '@/lib/db'
import type { Project, YearBudget, NormalizedProject } from '@/types'
import {
  toDate, fmtDate, getToday, getCurrentYear, daysBetween,
  yearStart, yearEnd, overlapDays,
  plannedBudgetForYearD, costsYTDForYearD,
} from '@/lib'
import DashboardTabs from '@/components/DashboardTabs'
import Timeline from '@/components/Timeline'
import { Card } from '@/ui'

// Data fetching functions
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
      TO_CHAR(start_date, 'YYYY-MM-DD') as start,
      TO_CHAR(end_date, 'YYYY-MM-DD') as end,
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
    progress: row.progress,
    budgetPlanned: parseFloat(row.budgetPlanned),
    costToDate: parseFloat(row.costToDate),
    org: row.org,
    requiresAT82Check: row.requiresAT82Check,
    at82Completed: row.at82Completed,
  }))
}

async function getYearBudgets(): Promise<YearBudget[]> {
  const rows = await sql`SELECT year, budget FROM year_budgets ORDER BY year DESC`
  return rows.map((row: any) => ({
    year: row.year as number,
    budget: parseFloat(row.budget as string),
  }))
}

export default async function ProjectsDashboard() {
  const [projects, yearBudgets] = await Promise.all([getProjects(), getYearBudgets()])

  const today = getToday()
  const currentYear = getCurrentYear()

  // Normalize projects
  const normalized: NormalizedProject[] = projects.map((p) => ({
    ...p,
    startD: toDate(p.start),
    endD: toDate(p.end),
    orgNorm: (p.org || '').toLowerCase(),
    statusNorm: (p.status || '').toLowerCase() as 'planned' | 'active' | 'done',
  }))

  const year = currentYear // Simplified: always show current year
  const yearOnly = true

  const overlapsYearD = (p: NormalizedProject, y: number) =>
    overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y)) > 0

  // Filter projects for current year
  const filtered = normalized.filter((p) => yearOnly && overlapsYearD(p, year))

  // Timeline bounds
  const bounds = (() => {
    if (yearOnly) {
      const minStart = yearStart(year)
      const maxEnd = yearEnd(year)
      const totalDays = Math.max(1, daysBetween(minStart, maxEnd))
      return { minStart, maxEnd, totalDays }
    }
    const base = filtered.length ? filtered : normalized
    if (!base.length) {
      return { minStart: today, maxEnd: today, totalDays: 1 }
    }
    const minStart = new Date(Math.min(...base.map((p) => p.startD.getTime())))
    const maxEnd = new Date(Math.max(...base.map((p) => p.endD.getTime())))
    const totalDays = daysBetween(minStart, maxEnd) || 1
    return { minStart, maxEnd, totalDays }
  })()

  // KPIs
  const base = yearOnly ? normalized.filter((p) => overlapsYearD(p, year)) : normalized
  const active = base.filter((p) => p.statusNorm === 'active')
  const planned = base.filter((p) => p.statusNorm === 'planned')
  const done = base.filter((p) => p.statusNorm === 'done')

  let budgetPlannedSum = 0
  let costSum = 0
  for (const p of base) {
    if (yearOnly) {
      budgetPlannedSum += plannedBudgetForYearD(p, year)
      costSum += costsYTDForYearD(p, year)
    } else {
      budgetPlannedSum += p.budgetPlanned || 0
      costSum += p.costToDate || 0
    }
  }

  const currentYearBudget = yearBudgets.find((yb) => yb.year === year)?.budget || null
  const effectiveBudget = currentYearBudget !== null ? currentYearBudget : budgetPlannedSum
  const budgetSpent = costSum
  const budgetRemaining = effectiveBudget - budgetSpent

  const showOverBudgetWarning = currentYearBudget !== null && budgetPlannedSum > currentYearBudget
  const showBudgetWarning = currentYearBudget !== null && budgetSpent > currentYearBudget

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTabs />
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">IT-Projektübersicht</h1>
          <p className="text-sm text-slate-600">Stand: {fmtDate(today)}</p>
        </header>

        {showOverBudgetWarning && (
          <Card>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-800 font-medium">
                ⚠️ Projektbudgets ({new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(budgetPlannedSum)})
                übersteigen Jahresbudget ({new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0}).format(currentYearBudget!)})
              </span>
            </div>
          </Card>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card title="Laufend" className="h-[120px]">
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-semibold">{active.length}</div>
            </div>
          </Card>
          <Card title="Geplant" className="h-[120px]">
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-semibold">{planned.length}</div>
            </div>
          </Card>
          <Card title="Abgeschlossen" className="h-[120px]">
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-semibold">{done.length}</div>
            </div>
          </Card>
        </div>

        {/* Budget Info Card */}
        <div className="mb-4">
          <Card title={`Projektbudget ${year}`}>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {currentYearBudget !== null && (
                <>
                  <span className="font-medium text-slate-700">Jahresbudget</span>
                  <span className="text-right">
                    {currentYearBudget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </>
              )}
              <span className="font-medium text-slate-700">Projektplan gesamt</span>
              <span className="text-right">
                {budgetPlannedSum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
              <span className="font-medium text-slate-700">Ist (YTD)</span>
              <span className="text-right">
                {budgetSpent.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
              <span className="font-medium text-slate-700">Verbleibend</span>
              <span className={`text-right ${budgetRemaining < 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                {budgetRemaining.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </Card>
        </div>

        {/* Projects Table (Simple version for now) */}
        <Card title="Projekte">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 px-2 font-medium">Projektnr.</th>
                  <th className="text-left py-2 px-2 font-medium">Titel</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Verantwortlich</th>
                  <th className="text-right py-2 px-2 font-medium">Budget geplant</th>
                  <th className="text-right py-2 px-2 font-medium">Kosten YTD</th>
                  <th className="text-right py-2 px-2 font-medium">Fortschritt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const budgetForYear = yearOnly ? plannedBudgetForYearD(p, year) : p.budgetPlanned
                  const costsForYear = yearOnly ? costsYTDForYearD(p, year) : p.costToDate

                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-xs">
                        {p.projectNumberInternal}
                        {p.projectNumberExternal && (
                          <div className="text-[10px] text-slate-400">{p.projectNumberExternal}</div>
                        )}
                      </td>
                      <td className="py-2 px-2">{p.title}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.statusNorm === 'active' ? 'bg-blue-100 text-blue-800' :
                          p.statusNorm === 'planned' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {p.statusNorm === 'active' ? 'Laufend' : p.statusNorm === 'planned' ? 'Geplant' : 'Abgeschlossen'}
                        </span>
                      </td>
                      <td className="py-2 px-2">{p.owner}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {budgetForYear.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {costsForYear.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2 text-right">{p.progress}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Timeline */}
        <div className="mt-4">
          <Timeline projects={filtered} bounds={bounds} yearOnly={yearOnly} year={year} />
        </div>

        {showBudgetWarning && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <strong>⚠️ Warnung:</strong> Gesamtbudget überschritten!
            <div className="mt-2 space-y-1">
              <div>Ausgaben (bisher): {budgetSpent.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
              <div>Jahresbudget: {currentYearBudget!.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
              <div className="border-t border-red-200 pt-1 font-bold">
                Überschreitung: {(budgetSpent - currentYearBudget!).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
