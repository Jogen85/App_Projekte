import { sql } from '@/lib/db'
import type { ITCost, ITCostCategory } from '@/types'
import { fmtDate, getToday, getCurrentYear, getITCostsByCategoryD, getITCostsByProviderD } from '@/lib'
import DashboardTabs from '@/components/DashboardTabs'
import { Card } from '@/ui'

async function getITCosts(): Promise<ITCost[]> {
  const rows = await sql`SELECT * FROM it_costs ORDER BY year DESC, description`

  return rows.map((row: any) => ({
    id: row.id,
    description: row.description,
    category: row.category as ITCostCategory,
    provider: row.provider,
    amount: parseFloat(row.amount),
    frequency: row.frequency as 'monthly' | 'quarterly' | 'yearly' | 'one_time',
    costCenter: row.cost_center || '',
    notes: row.notes || '',
    year: row.year as number,
  }))
}

export default async function ITCostsDashboard() {
  const itCosts = await getITCosts()
  const today = getToday()
  const year = getCurrentYear()

  // Filter for current year
  const yearCosts = itCosts.filter((c) => c.year === year)

  // Calculate KPIs
  const byCategory = getITCostsByCategoryD(yearCosts, year, today)
  const byProvider = getITCostsByProviderD(yearCosts, year, today)

  // Top category
  const categoryEntries = [
    { name: 'Hardware', value: byCategory.hardware, key: 'hardware' as ITCostCategory },
    { name: 'Software & Lizenzen', value: byCategory.software_licenses, key: 'software_licenses' as ITCostCategory },
    { name: 'Wartung & Service', value: byCategory.maintenance_service, key: 'maintenance_service' as ITCostCategory },
    { name: 'Schulung', value: byCategory.training, key: 'training' as ITCostCategory },
    { name: 'Sonstiges', value: byCategory.other, key: 'other' as ITCostCategory },
  ]
  const topCategory = categoryEntries.sort((a, b) => b.value - a.value)[0]

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
            <h1 className="text-3xl font-bold">IT-Kostenübersicht</h1>
            <p className="text-sm text-slate-600">Stand: {fmtDate(today)}</p>
          </div>
          <div className="text-sm">
            <span className="text-slate-600 mr-2">Jahr: {year}</span>
            <a href="/admin/it-costs" className="text-blue-600 hover:underline">
              IT-Kosten verwalten
            </a>
          </div>
        </header>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card title={`Gesamt IT-Kosten ${year}`} className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-4xl font-bold text-blue-600">{fmt(byCategory.total)}</div>
              <div className="mt-2 text-sm text-gray-600">
                {yearCosts.length} Kostenposition{yearCosts.length !== 1 ? 'en' : ''}
              </div>
            </div>
          </Card>

          <Card title="Größter Kostenblock" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-2xl font-bold text-gray-900">{topCategory.name}</div>
              <div className="mt-2 text-xl font-semibold text-blue-600">{fmt(topCategory.value)}</div>
              <div className="mt-1 text-sm text-gray-600">
                {((topCategory.value / byCategory.total) * 100).toFixed(1)}% des Gesamtbudgets
              </div>
            </div>
          </Card>

          <Card title="Laufende Kostenpositionen" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-4xl font-bold text-green-600">{yearCosts.length}</div>
              <div className="mt-2 text-sm text-gray-600">Erfasste Kostenpositionen</div>
            </div>
          </Card>
        </div>

        {/* Costs by Category */}
        <Card title="Kosten nach Kategorie">
          <div className="space-y-3">
            {categoryEntries.map((cat) => {
              const pct = byCategory.total > 0 ? (cat.value / byCategory.total) * 100 : 0
              return (
                <div key={cat.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="font-mono">{fmt(cat.value)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Top Providers */}
        <div className="mt-4">
          <Card title="Top 5 Dienstleister">
            <div className="space-y-2">
              {byProvider.length === 0 ? (
                <div className="text-sm text-gray-500">Keine Daten vorhanden</div>
              ) : (
                byProvider.slice(0, 5).map((provider, idx) => (
                  <div key={provider.provider} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-400">#{idx + 1}</span>
                      <span className="font-medium">{provider.provider}</span>
                    </div>
                    <span className="font-mono text-sm">{fmt(provider.total)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Costs Table */}
        <div className="mt-4">
          <Card title="IT-Kostenpositionen">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">Beschreibung</th>
                    <th className="text-left py-2 px-2 font-medium">Kategorie</th>
                    <th className="text-left py-2 px-2 font-medium">Dienstleister</th>
                    <th className="text-left py-2 px-2 font-medium">Frequenz</th>
                    <th className="text-right py-2 px-2 font-medium">Betrag</th>
                    <th className="text-right py-2 px-2 font-medium">Jahreskosten</th>
                  </tr>
                </thead>
                <tbody>
                  {yearCosts.map((cost) => {
                    const yearlyAmount =
                      cost.frequency === 'monthly'
                        ? cost.amount * 12
                        : cost.frequency === 'quarterly'
                        ? cost.amount * 4
                        : cost.amount

                    const categoryLabels: Record<ITCostCategory, string> = {
                      hardware: 'Hardware',
                      software_licenses: 'Software',
                      maintenance_service: 'Wartung',
                      training: 'Schulung',
                      other: 'Sonstiges',
                    }

                    const freqLabels: Record<string, string> = {
                      monthly: 'Monatlich',
                      quarterly: 'Quartalsweise',
                      yearly: 'Jährlich',
                      one_time: 'Einmalig',
                    }

                    return (
                      <tr key={cost.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2">{cost.description}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {categoryLabels[cost.category]}
                          </span>
                        </td>
                        <td className="py-2 px-2">{cost.provider}</td>
                        <td className="py-2 px-2 text-xs text-slate-600">{freqLabels[cost.frequency]}</td>
                        <td className="py-2 px-2 text-right font-mono">
                          {fmt(cost.amount)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium">
                          {fmt(yearlyAmount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
