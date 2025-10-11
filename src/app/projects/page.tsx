'use client'

import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react'
import { Card, LAYOUT } from '@/ui'
import { parseProjectsCSV, projectsToCSV } from '@/lib/csv'
import type { Project, NormalizedProject, YearBudget } from '@/types'
import {
  toDate,
  fmtDate,
  getToday,
  getCurrentYear,
  daysBetween,
  yearStart,
  yearEnd,
  overlapDays,
  calcTimeRAGD,
  calcBudgetRAG,
  plannedBudgetForYearD,
  costsYTDForYearD,
} from '@/lib'
import FiltersPanel from '@/components/FiltersPanel'
import Timeline from '@/components/Timeline'

const ProjectsTable = lazy(() => import('@/components/ProjectsTable'))
const BudgetDonut = lazy(() => import('@/components/BudgetDonut'))
const ProgressDelta = lazy(() => import('@/components/ProgressDelta'))
const ProjectDelays = lazy(() => import('@/components/ProjectDelays'))

function ProjectsDashboardContent() {
  const today = getToday()
  const [projects, setProjects] = useState<Project[]>([])
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([])
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [classificationFilter, setClassificationFilter] = useState<string>('all')
  const [yearOnly, setYearOnly] = useState<boolean>(true)
  const [year, setYear] = useState<number>(() => getCurrentYear())
  const [csvError, setCsvError] = useState<string | null>(null)
  const [at82RequiredFilter, setAt82RequiredFilter] = useState<string>('all')
  const [at82CompletedFilter, setAt82CompletedFilter] = useState<string>('all')

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, yearBudgetsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/year-budgets'),
        ])
        const projectsData = await projectsRes.json()
        const yearBudgetsData = await yearBudgetsRes.json()
        setProjects(projectsData)
        setYearBudgets(yearBudgetsData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const normalized: NormalizedProject[] = useMemo(
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

  const overlapsYearD = (p: NormalizedProject, y: number) =>
    overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y)) > 0

  const filtered = useMemo(() => {
    const sFilter = statusFilter.toLowerCase()
    const oFilter = orgFilter.toLowerCase()
    const cFilter = classificationFilter.toLowerCase()
    return normalized.filter((p) => {
      if (yearOnly && !overlapsYearD(p, year)) return false
      if (sFilter !== 'all' && p.statusNorm !== sFilter) return false
      if (oFilter !== 'all' && p.orgNorm !== oFilter) return false
      if (cFilter !== 'all' && p.classification !== cFilter) return false
      if (at82RequiredFilter === 'yes' && !p.requiresAT82Check) return false
      if (at82RequiredFilter === 'no' && p.requiresAT82Check) return false
      if (at82CompletedFilter === 'yes' && !p.at82Completed) return false
      if (at82CompletedFilter === 'no' && p.at82Completed) return false
      return true
    })
  }, [
    normalized,
    statusFilter,
    orgFilter,
    classificationFilter,
    yearOnly,
    year,
    at82RequiredFilter,
    at82CompletedFilter,
  ])

  const bounds = useMemo(() => {
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
  }, [filtered, normalized, yearOnly, year, today])

  const kpis = useMemo(() => {
    const base = yearOnly ? normalized.filter((p) => overlapsYearD(p, year)) : normalized
    const active = base.filter((p) => p.statusNorm === 'active')
    const planned = base.filter((p) => p.statusNorm === 'planned')
    const done = base.filter((p) => p.statusNorm === 'done')
    let budgetPlannedSum = 0
    let costSum = 0
    for (const p of base) {
      if (yearOnly) {
        budgetPlannedSum += plannedBudgetForYearD(p as any, year)
        costSum += costsYTDForYearD(p as any, year)
      } else {
        budgetPlannedSum += p.budgetPlanned || 0
        costSum += p.costToDate || 0
      }
    }
    return {
      activeCount: active.length,
      plannedCount: planned.length,
      doneCount: done.length,
      budgetPlannedSum,
      costSum,
    }
  }, [normalized, yearOnly, year])

  // Progress filter (Soll-Ist)
  const [progressFilter, setProgressFilter] = useState<'all' | 'behind' | 'ontrack' | 'ahead'>('all')
  const [progressTolerance, setProgressTolerance] = useState<number>(10)
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(null)

  const categoryForProject = React.useCallback(
    (p: NormalizedProject): 'behind' | 'ontrack' | 'ahead' => {
      const total = Math.max(1, daysBetween(p.startD, p.endD))
      const now = today
      let elapsed = daysBetween(p.startD, now)
      if (now < p.startD) elapsed = 0
      if (now > p.endD) elapsed = total
      const soll = Math.max(0, Math.min(100, (elapsed / total) * 100))
      const ist = Math.max(0, Math.min(100, p.progress || 0))
      const delta = ist - soll
      const tol = Math.max(0, Math.min(50, progressTolerance))
      if (delta < -tol) return 'behind'
      if (delta > tol) return 'ahead'
      return 'ontrack'
    },
    [progressTolerance, today]
  )

  const filteredByProgress = useMemo(() => {
    if (progressFilter === 'all') return filtered
    return filtered.filter((p) => p.statusNorm === 'active' && categoryForProject(p as any) === progressFilter)
  }, [filtered, progressFilter, categoryForProject])

  const onCSVUpload = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const rows = parseProjectsCSV(text)
      if (rows.length) {
        // TODO: Implement bulk upload via API
        setCsvError('CSV-Upload noch nicht implementiert')
      }
    } catch (e: any) {
      setCsvError(e?.message || 'CSV konnte nicht geladen werden.')
    }
  }

  const downloadCSVTemplate = () => {
    const csv = projectsToCSV(projects)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projekte_template_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentYearBudget = useMemo(() => {
    const found = yearBudgets.find((yb) => yb.year === year)
    return found ? found.budget : null
  }, [yearBudgets, year])

  const budgetSpent = kpis.costSum
  const effectiveBudget = currentYearBudget !== null ? currentYearBudget : kpis.budgetPlannedSum
  const budgetRemaining = effectiveBudget - kpis.costSum

  const showOverBudgetWarning = currentYearBudget !== null && kpis.budgetPlannedSum > currentYearBudget
  const showBudgetWarning = currentYearBudget !== null && budgetSpent > currentYearBudget

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
        <header className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600">Stand: {fmtDate(today)}</div>
          <FiltersPanel
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            orgFilter={orgFilter}
            setOrgFilter={setOrgFilter}
            classificationFilter={classificationFilter}
            setClassificationFilter={setClassificationFilter}
            yearOnly={yearOnly}
            setYearOnly={setYearOnly}
            year={year}
            setYear={setYear}
            at82RequiredFilter={at82RequiredFilter}
            setAt82RequiredFilter={setAt82RequiredFilter}
            at82CompletedFilter={at82CompletedFilter}
            setAt82CompletedFilter={setAt82CompletedFilter}
            onCSVUpload={onCSVUpload}
            onDownloadTemplate={downloadCSVTemplate}
            adminLink={{ href: '/admin/projects', label: 'Projekte verwalten' }}
          />
        </header>

        {csvError && (
          <Card>
            <div className="text-sm text-red-600">CSV: {csvError}</div>
          </Card>
        )}

        {showOverBudgetWarning && (
          <Card>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-red-800 font-medium">
                ⚠️ Projektbudgets (
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                }).format(kpis.budgetPlannedSum)}
                ) übersteigen Jahresbudget (
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                }).format(currentYearBudget!)}
                )
              </span>
            </div>
          </Card>
        )}

        {/* KPI-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={'Laufend'} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.activeCount}</div>
            </div>
          </Card>
          <Card title={'Geplant'} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.plannedCount}</div>
            </div>
          </Card>
          <Card title={'Abgeschlossen'} className="h-kpi">
            <div className="flex items-center justify-center h-full">
              <div className="text-3xl font-semibold">{kpis.doneCount}</div>
            </div>
          </Card>
        </div>

        {/* Chart-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={`Projektbudget ${year}`} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <BudgetDonut
                spent={budgetSpent}
                remaining={budgetRemaining}
                height={220}
                yearBudget={currentYearBudget}
                projectBudgetSum={kpis.budgetPlannedSum}
              />
            </Suspense>
          </Card>
          <Card title={'Verzögerungen'} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ProjectDelays projects={normalized} tolerance={progressTolerance} onSelectProject={setHighlightProjectId} />
            </Suspense>
          </Card>
          <Card title={'Soll-Ist-Fortschritt (laufende Projekte)'} className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ProgressDelta
                projects={filtered as any}
                height={220}
                onSelectCategory={(c) => setProgressFilter((prev) => (prev === c ? 'all' : c))}
                selectedCategory={progressFilter === 'all' ? null : progressFilter}
                tolerance={progressTolerance}
                onChangeTolerance={(t) => setProgressTolerance(isNaN(t) ? 10 : t)}
              />
            </Suspense>
          </Card>
        </div>

        {/* ProjectsTable */}
        <Suspense
          fallback={
            <Card title={'Projekte'}>
              <div className="h-32 bg-slate-100 rounded animate-pulse" />
            </Card>
          }
        >
          {progressFilter !== 'all' && (
            <div className="mb-2 flex items-center justify-between text-xs rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                Filter aktiv: Soll-Ist{' '}
                {progressFilter === 'behind' ? 'Hinter Plan' : progressFilter === 'ontrack' ? 'Im Plan' : 'Vor Plan'} (±
                {progressTolerance} pp)
              </div>
              <button
                className="px-2 py-1 rounded border border-slate-300 hover:bg-white"
                onClick={() => {
                  setProgressFilter('all')
                  setHighlightProjectId(null)
                }}
              >
                Zurücksetzen
              </button>
            </div>
          )}
          <Card title={'Projekte'}>
            <div className="max-h-table overflow-y-auto">
              <ProjectsTable
                projects={filteredByProgress}
                year={year}
                yearOnly={yearOnly}
                plannedBudgetForYearD={plannedBudgetForYearD as any}
                costsYTDForYearD={costsYTDForYearD as any}
                calcTimeRAGD={calcTimeRAGD as any}
                calcBudgetRAG={calcBudgetRAG as any}
                highlightId={highlightProjectId}
              />
            </div>
          </Card>
        </Suspense>

        {/* Timeline */}
        <Timeline projects={filtered} bounds={bounds} yearOnly={yearOnly} year={year} />

        {/* Budget-Warnung */}
        {showBudgetWarning && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <strong>⚠️ Warnung:</strong> Gesamtbudget überschritten!
            <div className="mt-2 space-y-1">
              <div>
                Ausgaben (bisher): {budgetSpent.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <div>
                Jahresbudget: {currentYearBudget!.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
              <div className="border-t border-red-200 pt-1 font-bold">
                Überschreitung:{' '}
                {(budgetSpent - currentYearBudget!).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectsDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg text-gray-600">Lade Daten...</div></div>}>
      <ProjectsDashboardContent />
    </Suspense>
  )
}
