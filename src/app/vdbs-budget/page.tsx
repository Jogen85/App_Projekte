'use client'

import React, { Suspense, useMemo, useState, useEffect } from 'react'
import type { VDBSBudgetItem, YearBudget } from '@/types'
import { Card, Badge, COLORS } from '@/ui'
import { getCurrentYear } from '@/lib'
import DashboardTabs from '@/components/DashboardTabs'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

const CHART_COLORS = {
  RUN: '#3b82f6', // blue-500
  CHANGE: '#7c3aed', // violet-600
}

function VDBSBudgetDashboardContent() {
  const [vdbsBudget, setVDBSBudget] = useState<VDBSBudgetItem[]>([])
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([])
  const [selectedYear, setSelectedYear] = useState(2026)
  const [sortField, setSortField] = useState<'projectNumber' | 'projectName' | 'budget2026'>('projectNumber')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'RUN' | 'CHANGE'>('all')
  const [loading, setLoading] = useState(true)

  const currentYear = getCurrentYear()

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const [vdbsRes, yearBudgetsRes] = await Promise.all([
          fetch('/api/vdbs-budget'),
          fetch('/api/year-budgets'),
        ])
        const vdbsData = await vdbsRes.json()
        const yearBudgetsData = await yearBudgetsRes.json()
        setVDBSBudget(vdbsData)
        setYearBudgets(yearBudgetsData)
      } catch (error) {
        console.error('Error loading VDB-S budget data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filter by year and category
  const filteredItems = useMemo(() => {
    let items = vdbsBudget.filter((item) => item.year === selectedYear)
    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter)
    }
    return items
  }, [vdbsBudget, selectedYear, categoryFilter])

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal, bVal
      if (sortField === 'projectNumber') {
        aVal = parseInt(a.projectNumber)
        bVal = parseInt(b.projectNumber)
      } else if (sortField === 'budget2026') {
        aVal = a.budget2026
        bVal = b.budget2026
      } else {
        aVal = a.projectName.toLowerCase()
        bVal = b.projectName.toLowerCase()
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredItems, sortField, sortDirection])

  // KPIs
  const kpis = useMemo(() => {
    const totalBudget = filteredItems.reduce((sum, item) => sum + item.budget2026, 0)
    const largestItem =
      filteredItems.length > 0
        ? filteredItems.reduce((max, item) => (item.budget2026 > max.budget2026 ? item : max))
        : null

    // Budget by category
    const byCategory = filteredItems.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.budget2026
        return acc
      },
      {} as Record<string, number>
    )

    // Top 5 items
    const top5 = [...filteredItems].sort((a, b) => b.budget2026 - a.budget2026).slice(0, 5)

    return {
      totalBudget,
      count: filteredItems.length,
      largestItem,
      byCategory,
      top5,
    }
  }, [filteredItems])

  // Jahresbudget finden
  const yearBudget = yearBudgets.find((yb) => yb.year === selectedYear)

  // Warnung bei Überplanung
  const showWarning = yearBudget && kpis.totalBudget > yearBudget.budget

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 10000) {
      return `€${Math.round(n / 1000)}k`
    }
    return fmtCurrency(n)
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Chart data - UNFILTERED by category (always show RUN vs CHANGE total)
  const categoryChartData = useMemo(() => {
    const yearItems = vdbsBudget.filter((item) => item.year === selectedYear)
    const byCategory = yearItems.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.budget2026
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(byCategory).map(([name, value]) => ({
      name: name === 'RUN' ? 'Laufende Kosten' : 'Projekte',
      category: name,
      value,
    }))
  }, [vdbsBudget, selectedYear])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Lade Daten...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} px-8 py-4`}>
      <div className="mx-auto max-w-presentation space-y-3">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">VDB-S Budget</h1>
            <p className={'text-sm ' + COLORS.subtext}>Budgetplanung für VDB-Service, Arbeitskreise und Projekte</p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mr-2 text-sm font-medium">Kategorie:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'RUN' | 'CHANGE')}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Alle</option>
                <option value="RUN">Laufende Kosten</option>
                <option value="CHANGE">Projekte</option>
              </select>
            </div>
            <div>
              <label className="mr-2 text-sm font-medium">Jahr:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <a href="/admin/vdbs-budget" className="text-sm text-blue-600 hover:underline">
              VDB-S Budget verwalten
            </a>
          </div>
        </header>

        {/* Tabs */}
        <DashboardTabs />

        {/* Warnung bei Überplanung */}
        {showWarning && (
          <Card>
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-red-800">
                ⚠️ VDB-S Budget ({fmtCurrency(kpis.totalBudget)}) übersteigt Jahresbudget (
                {fmtCurrency(yearBudget!.budget)})
              </span>
            </div>
          </Card>
        )}

        {/* KPI-Zeile (3 Tiles) */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={`Gesamtbudget ${selectedYear}`} className="h-kpi">
            <div className="flex h-full flex-col justify-center gap-1">
              <div className="text-3xl font-bold text-blue-600">{fmtCurrency(kpis.totalBudget)}</div>
              <div className="text-sm text-gray-600">{kpis.count} Positionen</div>
            </div>
          </Card>
          <Card title="Größte Position" className="h-kpi">
            <div className="flex h-full flex-col justify-center">
              {kpis.largestItem ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{fmtCurrency(kpis.largestItem.budget2026)}</div>
                  <div className="mt-1 text-xs text-gray-600 truncate">{kpis.largestItem.projectName}</div>
                </>
              ) : (
                <div className="text-gray-500">Keine Daten</div>
              )}
            </div>
          </Card>
          <Card title="Budget-Verteilung" className="h-kpi">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">RUN (Laufend):</span>
                <span className="font-medium">{fmtCompact(kpis.byCategory.RUN || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">CHANGE (Projekte):</span>
                <span className="font-medium">{fmtCompact(kpis.byCategory.CHANGE || 0)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart-Zeile (3 Charts) */}
        <div className="grid grid-cols-3 gap-3">
          {/* Chart 1: Budget nach Kategorie */}
          <Card title="Budget nach Kategorie" className="h-chart relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => {
                    const shortName = name.includes('Laufende') ? 'Laufend' : 'Projekte'
                    return `${shortName}: ${(percent * 100).toFixed(0)}%`
                  }}
                  labelLine={{ stroke: '#666', strokeWidth: 1 }}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.category === 'RUN' ? CHART_COLORS.RUN : CHART_COLORS.CHANGE}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmtCurrency(value as number)} labelFormatter={(label) => label} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.RUN }} />
                <span className="text-gray-700">Laufende Kosten</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.CHANGE }} />
                <span className="text-gray-700">Projekte</span>
              </div>
            </div>
          </Card>

          {/* Chart 2: Top 5 Positionen */}
          <Card title="Top 5 Budgetpositionen" className="h-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpis.top5} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompact(v)} />
                <YAxis type="category" dataKey="projectNumber" tick={{ fontSize: 11 }} width={50} />
                <Tooltip
                  formatter={(v) => fmtCurrency(v as number)}
                  labelFormatter={(label) => {
                    const item = kpis.top5.find((i) => i.projectNumber === label)
                    return item ? `${item.projectNumber}: ${item.projectName.substring(0, 30)}...` : label
                  }}
                />
                <Bar dataKey="budget2026" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 3: Budget-Übersicht */}
          <Card title="Budget-Übersicht" className="h-chart">
            <div className="flex h-full flex-col justify-center gap-4 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Positionen gesamt:</span>
                  <span className="text-lg font-bold text-gray-900">{kpis.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gesamtbudget:</span>
                  <span className="text-lg font-bold text-blue-600">{fmtCurrency(kpis.totalBudget)}</span>
                </div>
                {yearBudget && (
                  <>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jahresbudget {selectedYear}:</span>
                        <span className="text-lg font-medium text-gray-900">{fmtCurrency(yearBudget.budget)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Verbleibend:</span>
                      <span
                        className={`text-xl font-bold ${kpis.totalBudget <= yearBudget.budget ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {fmtCurrency(yearBudget.budget - kpis.totalBudget)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="h-3 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-3 rounded-full transition-all ${kpis.totalBudget <= yearBudget.budget ? 'bg-blue-600' : 'bg-red-600'}`}
                          style={{ width: `${Math.min(100, (kpis.totalBudget / yearBudget.budget) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-center text-gray-600">
                        {((kpis.totalBudget / yearBudget.budget) * 100).toFixed(1)}% verplant
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Budget Table */}
        <Card title="VDB-S Budgetpositionen">
          <div className="max-h-table overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('projectNumber')}
                  >
                    Projekt Nr. {sortField === 'projectNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('projectName')}
                  >
                    Projektname {sortField === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Kategorie
                  </th>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('budget2026')}
                  >
                    Budget {selectedYear} {sortField === 'budget2026' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Keine Budgetpositionen für {selectedYear}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-3 py-3 font-mono text-xs text-gray-900">{item.projectNumber}</td>
                      <td className="px-3 py-3 text-gray-900">{item.projectName}</td>
                      <td className="px-3 py-3">
                        <Badge tone={item.category === 'RUN' ? 'blue' : 'purple'}>
                          {item.category === 'RUN' ? 'Laufend' : 'Projekt'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* Budget bar */}
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{
                                width: `${Math.min(100, (item.budget2026 / Math.max(...filteredItems.map((i) => i.budget2026))) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono font-medium text-gray-900">{fmtCurrency(item.budget2026)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="sticky bottom-0 border-t-2 border-gray-300 bg-gray-100">
                <tr>
                  <td colSpan={3} className="px-3 py-3 font-bold text-gray-900">
                    Gesamt
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-gray-900">
                    {fmtCurrency(kpis.totalBudget)}
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

export default function VDBSBudgetDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">Lade Daten...</div>
        </div>
      }
    >
      <VDBSBudgetDashboardContent />
    </Suspense>
  )
}
