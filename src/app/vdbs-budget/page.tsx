import { sql } from '@/lib/db'
import type { VDBSBudgetItem } from '@/types'
import { fmtDate, getToday } from '@/lib'
import DashboardTabs from '@/components/DashboardTabs'
import { Card } from '@/ui'

async function getVDBSBudget(): Promise<VDBSBudgetItem[]> {
  const rows = await sql`SELECT * FROM vdbs_budget ORDER BY budget_2026 DESC`

  return rows.map((row: any) => ({
    id: row.id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    category: row.category as 'RUN' | 'CHANGE',
    budget2026: parseFloat(row.budget_2026),
    year: row.year as number,
  }))
}

export default async function VDBSBudgetDashboard() {
  const vdbsBudget = await getVDBSBudget()
  const today = getToday()

  // Calculate totals
  const total = vdbsBudget.reduce((sum, item) => sum + item.budget2026, 0)
  const runTotal = vdbsBudget
    .filter((item) => item.category === 'RUN')
    .reduce((sum, item) => sum + item.budget2026, 0)
  const changeTotal = vdbsBudget
    .filter((item) => item.category === 'CHANGE')
    .reduce((sum, item) => sum + item.budget2026, 0)

  // Top position
  const topPosition = vdbsBudget[0] // Already sorted DESC by budget

  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardTabs />
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <header className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">VDB-S Budget 2026</h1>
            <p className="text-sm text-slate-600">Stand: {fmtDate(today)}</p>
          </div>
          <div>
            <a href="/admin/vdbs-budget" className="text-sm text-blue-600 hover:underline">
              VDB-S Budget verwalten
            </a>
          </div>
        </header>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card title="Gesamtbudget 2026" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-4xl font-bold text-blue-600">{fmt(total)}</div>
              <div className="mt-2 text-sm text-gray-600">
                {vdbsBudget.length} Budgetposition{vdbsBudget.length !== 1 ? 'en' : ''}
              </div>
            </div>
          </Card>

          <Card title="Größte Position" className="min-h-[180px]">
            {topPosition ? (
              <div className="flex h-full flex-col justify-center">
                <div className="text-lg font-bold text-gray-900 line-clamp-2">{topPosition.projectName}</div>
                <div className="mt-2 text-xl font-semibold text-blue-600">{fmt(topPosition.budget2026)}</div>
                <div className="mt-1 text-xs text-gray-600 font-mono">{topPosition.projectNumber}</div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Keine Daten vorhanden
              </div>
            )}
          </Card>

          <Card title="Budget-Verteilung" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">RUN (Laufend)</span>
                  <span className="text-sm font-mono">{fmt(runTotal)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {vdbsBudget.filter((i) => i.category === 'RUN').length} Positionen
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">CHANGE (Projekte)</span>
                  <span className="text-sm font-mono">{fmt(changeTotal)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {vdbsBudget.filter((i) => i.category === 'CHANGE').length} Positionen
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Budget Table */}
        <Card title="VDB-S Budgetpositionen 2026">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 px-2 font-medium">Projekt Nr.</th>
                  <th className="text-left py-2 px-2 font-medium">Projektname</th>
                  <th className="text-left py-2 px-2 font-medium">Kategorie</th>
                  <th className="text-right py-2 px-2 font-medium">Budget 2026</th>
                </tr>
              </thead>
              <tbody>
                {vdbsBudget.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono text-xs">{item.projectNumber}</td>
                    <td className="py-2 px-2">{item.projectName}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.category === 'RUN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.category === 'RUN' ? 'Laufend' : 'Projekt'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-medium">{fmt(item.budget2026)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <td colSpan={3} className="py-2 px-2 font-bold">
                    Gesamt
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
