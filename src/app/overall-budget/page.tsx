import { sql } from '@/lib/db'
import type { Project, ITCost, VDBSBudgetItem, YearBudget } from '@/types'
import { getCurrentYear, toDate, plannedBudgetForYearD, costsYTDForYearD, getITCostsByCategoryD, getToday } from '@/lib'
import DashboardTabs from '@/components/DashboardTabs'
import { Card } from '@/ui'

async function getProjects(): Promise<Project[]> {
  const rows = await sql`SELECT * FROM projects ORDER BY start_date DESC`
  return rows.map((row: any) => ({
    id: row.id,
    projectNumberInternal: row.project_number_internal,
    projectNumberExternal: row.project_number_external || undefined,
    classification: row.classification,
    title: row.title,
    owner: row.owner,
    description: row.description || '',
    status: row.status,
    start: row.start_date,
    end: row.end_date,
    progress: row.progress,
    budgetPlanned: parseFloat(row.budget_planned),
    costToDate: parseFloat(row.cost_to_date),
    org: row.org,
    requiresAT82Check: row.requires_at82_check,
    at82Completed: row.at82_completed,
  }))
}

async function getITCosts(): Promise<ITCost[]> {
  const rows = await sql`SELECT * FROM it_costs ORDER BY year DESC`
  return rows.map((row: any) => ({
    id: row.id,
    description: row.description,
    category: row.category,
    provider: row.provider,
    amount: parseFloat(row.amount),
    frequency: row.frequency,
    costCenter: row.cost_center || '',
    notes: row.notes || '',
    year: row.year,
  }))
}

async function getVDBSBudget(): Promise<VDBSBudgetItem[]> {
  const rows = await sql`SELECT * FROM vdbs_budget ORDER BY budget_2026 DESC`
  return rows.map((row: any) => ({
    id: row.id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    category: row.category,
    budget2026: parseFloat(row.budget_2026),
    year: row.year,
  }))
}

async function getYearBudgets(): Promise<YearBudget[]> {
  const rows = await sql`SELECT year, budget FROM year_budgets ORDER BY year DESC`
  return rows.map((row: any) => ({
    year: row.year as number,
    budget: parseFloat(row.budget as string),
  }))
}

export default async function OverallBudgetDashboard() {
  const [projects, itCosts, vdbsBudget, yearBudgets] = await Promise.all([
    getProjects(),
    getITCosts(),
    getVDBSBudget(),
    getYearBudgets(),
  ])

  const today = getToday()
  const year = getCurrentYear()

  // Normalize projects
  const normalizedProjects = projects.map((p) => ({
    ...p,
    startD: toDate(p.start),
    endD: toDate(p.end),
  }))

  // Project budgets
  const projectPlan = normalizedProjects.reduce((sum, project) => {
    return sum + plannedBudgetForYearD(project, year)
  }, 0)

  const projectActual = normalizedProjects.reduce((sum, project) => {
    return sum + costsYTDForYearD(project, year)
  }, 0)

  // IT costs
  const yearItCosts = itCosts.filter((item) => item.year === year)
  const itCostSummary = getITCostsByCategoryD(yearItCosts, year, today)

  // VDB-S budget
  const vdbsTotal = vdbsBudget
    .filter((item) => item.year === year)
    .reduce((sum, item) => sum + item.budget2026, 0)

  // Year budget
  const yearBudget = yearBudgets.find((yb) => yb.year === year) || null

  // Totals
  const totalPlanned = projectPlan + itCostSummary.total + vdbsTotal
  const totalActual = projectActual + itCostSummary.total
  const budgetRemaining = yearBudget ? yearBudget.budget - totalPlanned : null
  const budgetDeltaActual = yearBudget ? yearBudget.budget - totalActual : null

  const warningPlan = yearBudget && totalPlanned > yearBudget.budget
  const warningActual = yearBudget && totalActual > yearBudget.budget

  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTabs />
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <header className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gesamtbudgetplanung</h1>
            <p className="mt-1 text-sm text-gray-600">
              Konsolidierte Übersicht über Projektbudgets, IT-Kosten und VDB-S Budget.
            </p>
          </div>
          <div className="text-sm">
            <span className="text-slate-600 mr-2">Jahr: {year}</span>
            <a href="/overall-budget-admin" className="text-blue-600 hover:underline">
              Jahresbudget verwalten
            </a>
          </div>
        </header>

        {/* Warnings */}
        {warningPlan && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <strong className="text-amber-800">⚠️ Warnung:</strong>
            <span className="text-sm text-amber-700 ml-2">
              Geplante Ausgaben ({fmtCurrency(totalPlanned)}) übersteigen Jahresbudget (
              {yearBudget ? fmtCurrency(yearBudget.budget) : '—'})
            </span>
          </div>
        )}

        {warningActual && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
            <strong className="text-red-800">🚨 Kritisch:</strong>
            <span className="text-sm text-red-700 ml-2">
              Tatsächliche Ausgaben ({fmtCurrency(totalActual)}) übersteigen Jahresbudget (
              {yearBudget ? fmtCurrency(yearBudget.budget) : '—'})
            </span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card title={`Jahresbudget ${year}`} className="h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-2xl font-bold text-blue-600">
                {yearBudget ? fmtCurrency(yearBudget.budget) : '—'}
              </div>
              <div className="text-xs text-gray-500">Festgelegtes Gesamtbudget</div>
            </div>
          </Card>

          <Card title="Geplante Ausgaben" className="h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div className={`text-2xl font-bold ${warningPlan ? 'text-amber-600' : 'text-gray-900'}`}>
                {fmtCurrency(totalPlanned)}
              </div>
              <div className="text-xs text-gray-500">
                {budgetRemaining !== null && (
                  <span className={budgetRemaining < 0 ? 'text-amber-600' : 'text-green-600'}>
                    {budgetRemaining >= 0 ? 'Verfügbar: ' : 'Überplanung: '}
                    {fmtCurrency(Math.abs(budgetRemaining))}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Ist-Ausgaben" className="h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div className={`text-2xl font-bold ${warningActual ? 'text-red-600' : 'text-gray-900'}`}>
                {fmtCurrency(totalActual)}
              </div>
              <div className="text-xs text-gray-500">
                {budgetDeltaActual !== null && (
                  <span className={budgetDeltaActual < 0 ? 'text-red-600' : 'text-green-600'}>
                    {budgetDeltaActual >= 0 ? 'Verbleibend: ' : 'Überschreitung: '}
                    {fmtCurrency(Math.abs(budgetDeltaActual))}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Budget-Auslastung" className="h-[120px]">
            <div className="flex h-full flex-col justify-center">
              {yearBudget && (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {((totalActual / yearBudget.budget) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">von Jahresbudget ausgegeben</div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Breakdown Table */}
        <Card title="Budget-Aufschlüsselung">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-slate-300">
                <tr>
                  <th className="text-left py-2 px-2 font-medium">Kategorie</th>
                  <th className="text-right py-2 px-2 font-medium">Geplant</th>
                  <th className="text-right py-2 px-2 font-medium">Ist (YTD)</th>
                  <th className="text-right py-2 px-2 font-medium">Differenz</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-2 font-medium">Projektbudgets</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCurrency(projectPlan)}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCurrency(projectActual)}</td>
                  <td className="py-2 px-2 text-right font-mono">
                    <span className={projectPlan - projectActual < 0 ? 'text-red-600' : 'text-green-600'}>
                      {fmtCurrency(projectPlan - projectActual)}
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-2 font-medium">IT-Kosten</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCurrency(itCostSummary.total)}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCurrency(itCostSummary.total)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 px-2 font-medium">VDB-S Budget</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCurrency(vdbsTotal)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <td className="py-2 px-2 font-bold">Gesamt</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{fmtCurrency(totalPlanned)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{fmtCurrency(totalActual)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">
                    <span className={totalPlanned - totalActual < 0 ? 'text-red-600' : 'text-green-600'}>
                      {fmtCurrency(totalPlanned - totalActual)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
