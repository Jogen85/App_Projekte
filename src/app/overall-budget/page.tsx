'use client'

import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react'
import type { Project, ITCost, VDBSBudgetItem, YearBudget, NormalizedProject } from '@/types'
import {
  getCurrentYear,
  toDate,
  plannedBudgetForYearD,
  costsYTDForYearD,
  getITCostsByCategoryD,
  getToday,
} from '@/lib'
import { Card, LAYOUT } from '@/ui'

const BudgetDonut = lazy(() => import('@/components/BudgetDonut'))

function OverallBudgetDashboardContent() {
  const today = getToday()
  const [projects, setProjects] = useState<Project[]>([])
  const [itCosts, setITCosts] = useState<ITCost[]>([])
  const [vdbsBudget, setVDBSBudget] = useState<VDBSBudgetItem[]>([])
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([])
  const [year, setYear] = useState<number>(() => getCurrentYear())
  const [loading, setLoading] = useState(true)

  const currentYear = getCurrentYear()

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, itCostsRes, vdbsRes, yearBudgetsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/it-costs'),
          fetch('/api/vdbs-budget'),
          fetch('/api/year-budgets'),
        ])
        const projectsData = await projectsRes.json()
        const itCostsData = await itCostsRes.json()
        const vdbsData = await vdbsRes.json()
        const yearBudgetsData = await yearBudgetsRes.json()
        setProjects(projectsData)
        setITCosts(itCostsData)
        setVDBSBudget(vdbsData)
        setYearBudgets(yearBudgetsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Normalize projects
  const normalizedProjects: NormalizedProject[] = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        startD: toDate(p.start),
        endD: toDate(p.end),
        orgNorm: (p.org || '').toLowerCase(),
        statusNorm: (p.status || '').toLowerCase() as 'planned' | 'active' | 'done',
      })),
    [projects]
  )

  // Calculations
  const calculations = useMemo(() => {
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
    const vdbsTotal = vdbsBudget.filter((item) => item.year === year).reduce((sum, item) => sum + item.budget2026, 0)

    // Year budget
    const yearBudget = yearBudgets.find((yb) => yb.year === year) || null

    // Totals
    const totalPlanned = projectPlan + itCostSummary.total + vdbsTotal
    const totalActual = projectActual + itCostSummary.total
    const budgetRemaining = yearBudget ? yearBudget.budget - totalPlanned : null
    const budgetDeltaActual = yearBudget ? yearBudget.budget - totalActual : null

    const warningPlan = yearBudget && totalPlanned > yearBudget.budget
    const warningActual = yearBudget && totalActual > yearBudget.budget

    return {
      projectPlan,
      projectActual,
      itCostSummary,
      vdbsTotal,
      yearBudget,
      totalPlanned,
      totalActual,
      budgetRemaining,
      budgetDeltaActual,
      warningPlan,
      warningActual,
    }
  }, [normalizedProjects, itCosts, vdbsBudget, yearBudgets, year, today])

  const fmtCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Lade Daten...</div>
      </div>
    )
  }

  return (
    <div className={LAYOUT.pageContainer}>
      <div className={LAYOUT.contentWrapper}>
        {/* Header */}
        <header className="flex items-center justify-end gap-4 mb-4">
          <div>
            <label className="mr-2 text-sm font-medium">Jahr:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <a href="/admin/overall-budget" className="text-sm text-blue-600 hover:underline">
            Budgets verwalten
          </a>
        </header>

        {/* Warnings */}
        {calculations.warningPlan && (
          <Card>
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <svg className="h-5 w-5 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                ⚠️ Geplante Ausgaben ({fmtCurrency(calculations.totalPlanned)}) übersteigen Jahresbudget (
                {calculations.yearBudget ? fmtCurrency(calculations.yearBudget.budget) : '—'})
              </span>
            </div>
          </Card>
        )}

        {calculations.warningActual && (
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
                🚨 Tatsächliche Ausgaben ({fmtCurrency(calculations.totalActual)}) übersteigen Jahresbudget (
                {calculations.yearBudget ? fmtCurrency(calculations.yearBudget.budget) : '—'})
              </span>
            </div>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card title={`Jahresbudget ${year}`} className="min-h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-2xl font-bold text-blue-600">
                {calculations.yearBudget ? fmtCurrency(calculations.yearBudget.budget) : '—'}
              </div>
              <div className="text-xs text-gray-500">Festgelegtes Gesamtbudget</div>
            </div>
          </Card>

          <Card title="Geplante Ausgaben" className="min-h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div
                className={`text-2xl font-bold ${calculations.warningPlan ? 'text-amber-600' : 'text-gray-900'}`}
              >
                {fmtCurrency(calculations.totalPlanned)}
              </div>
              <div className="text-xs text-gray-500">
                {calculations.budgetRemaining !== null && (
                  <span className={calculations.budgetRemaining < 0 ? 'text-amber-600' : 'text-green-600'}>
                    {calculations.budgetRemaining >= 0 ? 'Verfügbar: ' : 'Überplanung: '}
                    {fmtCurrency(Math.abs(calculations.budgetRemaining))}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Ist-Ausgaben" className="min-h-[120px]">
            <div className="flex h-full flex-col justify-center">
              <div
                className={`text-2xl font-bold ${calculations.warningActual ? 'text-red-600' : 'text-gray-900'}`}
              >
                {fmtCurrency(calculations.totalActual)}
              </div>
              <div className="text-xs text-gray-500">
                {calculations.budgetDeltaActual !== null && (
                  <span className={calculations.budgetDeltaActual < 0 ? 'text-red-600' : 'text-green-600'}>
                    {calculations.budgetDeltaActual >= 0 ? 'Verbleibend: ' : 'Überschreitung: '}
                    {fmtCurrency(Math.abs(calculations.budgetDeltaActual))}
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card title="Budget-Auslastung" className="min-h-[120px]">
            <div className="flex h-full flex-col justify-center">
              {calculations.yearBudget ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {((calculations.totalActual / calculations.yearBudget.budget) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">von Jahresbudget ausgegeben</div>
                </>
              ) : (
                <div className="text-gray-400">—</div>
              )}
            </div>
          </Card>
        </div>

        {/* Chart Zeile */}
        <div className="grid grid-cols-2 gap-3">
          {/* BudgetDonut Chart */}
          <Card title={`Budgetübersicht ${year}`} className="h-chart">
            {calculations.yearBudget ? (
              <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
                <BudgetDonut
                  spent={calculations.totalActual}
                  remaining={calculations.yearBudget.budget - calculations.totalActual}
                  height={150}
                  itCostsTotal={calculations.itCostSummary.total}
                  vdbsBudgetTotal={calculations.vdbsTotal}
                  yearBudget={calculations.yearBudget.budget}
                  projectBudgetSum={calculations.projectPlan}
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Kein Jahresbudget definiert für {year}
              </div>
            )}
          </Card>

          {/* Breakdown Table */}
          <Card title="Budget-Aufschlüsselung" className="h-chart">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">Kategorie</th>
                    <th className="text-right py-2 px-2 font-medium">Geplant</th>
                    <th className="text-right py-2 px-2 font-medium">Ist (YTD)</th>
                    <th className="text-right py-2 px-2 font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 font-medium">Projektbudgets</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCurrency(calculations.projectPlan)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCurrency(calculations.projectActual)}</td>
                    <td className="py-2 px-2 text-right font-mono">
                      <span
                        className={
                          calculations.projectPlan - calculations.projectActual < 0 ? 'text-red-600' : 'text-green-600'
                        }
                      >
                        {fmtCurrency(calculations.projectPlan - calculations.projectActual)}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 font-medium">IT-Kosten</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCurrency(calculations.itCostSummary.total)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCurrency(calculations.itCostSummary.total)}</td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-2 font-medium">VDB-S Budget</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCurrency(calculations.vdbsTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">—</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                  <tr>
                    <td className="py-2 px-2 font-bold">Gesamt</td>
                    <td className="py-2 px-2 text-right font-mono font-bold">
                      {fmtCurrency(calculations.totalPlanned)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold">
                      {fmtCurrency(calculations.totalActual)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold">
                      <span
                        className={
                          calculations.totalPlanned - calculations.totalActual < 0 ? 'text-red-600' : 'text-green-600'
                        }
                      >
                        {fmtCurrency(calculations.totalPlanned - calculations.totalActual)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function OverallBudgetDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">Lade Daten...</div>
        </div>
      }
    >
      <OverallBudgetDashboardContent />
    </Suspense>
  )
}
