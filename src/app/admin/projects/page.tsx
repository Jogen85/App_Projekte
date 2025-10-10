'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { Project, YearBudget } from '@/types'
import { Card, COLORS } from '@/ui'
import { parseProjectsCSV, projectsToCSV } from '@/lib/csv'
import { getCurrentYear, overlapDays, daysBetween, yearStart, yearEnd } from '@/lib'

const emptyProject = (): Project => ({
  id: `p-${Math.random().toString(36).slice(2, 8)}`,
  projectNumberInternal: '',
  classification: 'project',
  title: '',
  owner: '',
  description: '',
  status: 'planned',
  start: '',
  end: '',
  progress: 0,
  budgetPlanned: 0,
  costToDate: 0,
  org: 'BB',
  requiresAT82Check: false,
  at82Completed: false,
})

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([])
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([])
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const currentYear = getCurrentYear()

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
        setMsg('Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Save project (Create or Update)
  const saveProject = async (project: Project, isNew: boolean) => {
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/projects' : `/api/projects/${project.id}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })

      if (!res.ok) throw new Error('Fehler beim Speichern')

      const saved = await res.json()

      if (isNew) {
        setProjects([saved, ...projects])
      } else {
        setProjects(projects.map((p) => (p.id === saved.id ? saved : p)))
      }

      showMessage('✓ Änderungen gespeichert')
    } catch (error) {
      console.error('Error saving project:', error)
      setMsg('❌ Fehler beim Speichern')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Delete project
  const deleteProject = async (id: string) => {
    if (!confirm('Projekt wirklich löschen?')) return

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')

      setProjects(projects.filter((p) => p.id !== id))
      showMessage('✓ Projekt gelöscht')
    } catch (error) {
      console.error('Error deleting project:', error)
      setMsg('❌ Fehler beim Löschen')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Update project field
  const updateField = (i: number, k: keyof Project, v: any) => {
    const project = { ...projects[i] }

    if (k === 'progress' || k === 'budgetPlanned' || k === 'costToDate') {
      ;(project as any)[k] = Number(v) || 0
    } else if (k === 'requiresAT82Check' || k === 'at82Completed') {
      ;(project as any)[k] = v === true || v === 'true'
    } else {
      ;(project as any)[k] = v
    }

    saveProject(project, false)
  }

  // Add new project
  const addRow = () => {
    const newProject = emptyProject()
    saveProject(newProject, true)
  }

  // CSV Import
  const onImportCSV = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const rows = parseProjectsCSV(text)

      // Bulk insert via API
      for (const row of rows) {
        await saveProject(row, true)
      }

      showMessage(`✓ CSV importiert: ${rows.length} Zeilen`)
    } catch (err) {
      setMsg(`❌ ${(err as Error)?.message || 'CSV konnte nicht geladen werden'}`)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // CSV Export
  const onExportCSV = () => {
    const csv = projectsToCSV(projects)
    const bom = '\uFEFF' // UTF-8 BOM für Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projekte_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Year Budgets CRUD
  const saveYearBudget = async (yb: YearBudget, isNew: boolean) => {
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/year-budgets' : `/api/year-budgets/${yb.year}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yb),
      })

      if (!res.ok) throw new Error('Fehler beim Speichern')

      const saved = await res.json()

      if (isNew) {
        setYearBudgets([...yearBudgets, saved])
      } else {
        setYearBudgets(yearBudgets.map((y) => (y.year === saved.year ? saved : y)))
      }

      showMessage('✓ Jahresbudget gespeichert')
    } catch (error) {
      console.error('Error saving year budget:', error)
      setMsg('❌ Fehler beim Speichern')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const deleteYearBudget = async (year: number) => {
    if (!confirm(`Jahresbudget ${year} wirklich löschen?`)) return

    try {
      const res = await fetch(`/api/year-budgets/${year}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')

      setYearBudgets(yearBudgets.filter((yb) => yb.year !== year))
      showMessage('✓ Jahresbudget gelöscht')
    } catch (error) {
      console.error('Error deleting year budget:', error)
      setMsg('❌ Fehler beim Löschen')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const addYearBudget = () => {
    const nextYear = yearBudgets.length > 0 ? Math.max(...yearBudgets.map((yb) => yb.year)) + 1 : currentYear
    saveYearBudget({ year: nextYear, budget: 0 }, true)
  }

  const updateYearBudgetField = (year: number, budget: number) => {
    const yb = yearBudgets.find((y) => y.year === year)
    if (yb) {
      saveYearBudget({ ...yb, budget }, false)
    }
  }

  const showMessage = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

  // Over-budget warnings
  const overBudgetWarnings = useMemo(() => {
    const warnings: string[] = []
    yearBudgets.forEach((yb) => {
      const yearProjects = projects.filter((p) => {
        const startYear = new Date(p.start).getFullYear()
        const endYear = new Date(p.end).getFullYear()
        return startYear <= yb.year && endYear >= yb.year
      })

      const yearProjectBudget = yearProjects.reduce((sum, p) => {
        const startD = new Date(p.start)
        const endD = new Date(p.end)
        const overlap = overlapDays(startD, endD, yearStart(yb.year), yearEnd(yb.year))
        const projectDays = Math.max(1, daysBetween(startD, endD))
        const anteilig = (p.budgetPlanned || 0) * (overlap / projectDays)
        return sum + anteilig
      }, 0)

      if (yearProjectBudget > yb.budget && yb.budget > 0) {
        const fmt = (n: number) =>
          new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)
        warnings.push(
          `Jahr ${yb.year}: Projektbudgets (${fmt(yearProjectBudget)}) übersteigen Jahresbudget (${fmt(yb.budget)})`
        )
      }
    })
    return warnings
  }, [yearBudgets, projects])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Lade Daten...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} p-6`}>
      <div className="max-w-[1800px] mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin – Projekte bearbeiten</h1>
          <a href="/projects" className="text-blue-600 hover:underline">
            Zum Dashboard
          </a>
        </header>

        <Card>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={addRow}
              className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium transition-colors"
            >
              + Neu
            </button>
            <input
              id="adminCsvInput"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => onImportCSV(e.target.files?.[0])}
            />
            <button
              onClick={() => document.getElementById('adminCsvInput')!.click()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              CSV importieren
            </button>
            <button
              onClick={onExportCSV}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              CSV exportieren
            </button>
            {msg && (
              <span className="text-sm text-green-600 ml-2 bg-green-50 px-3 py-1 rounded-md font-medium">{msg}</span>
            )}
          </div>
        </Card>

        {/* Jahresbudgets */}
        <Card title="Jahresbudgets">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={addYearBudget}
                className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium transition-colors"
              >
                + Weiteres Jahr
              </button>
              <span className="text-xs text-slate-500">Änderungen werden automatisch gespeichert</span>
            </div>

            {overBudgetWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                {overBudgetWarnings.map((warning, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-red-800">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">⚠️ {warning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                      Jahr
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                      Budget (€)
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b-2 border-slate-300">
                      Aktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearBudgets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-slate-500 text-sm">
                        Noch keine Jahresbudgets definiert. Klicken Sie auf &quot;+ Weiteres Jahr&quot; um zu starten.
                      </td>
                    </tr>
                  )}
                  {yearBudgets
                    .sort((a, b) => a.year - b.year)
                    .map((yb) => {
                      const isPast = yb.year < currentYear
                      const isEditable = yb.year >= currentYear && yb.year <= currentYear + 1

                      return (
                        <tr
                          key={yb.year}
                          className={`border-b border-slate-200 ${isPast ? 'bg-slate-50 opacity-60' : ''}`}
                        >
                          <td className="py-3 px-3 font-mono text-sm">{yb.year}</td>
                          <td className="py-3 px-3">
                            {isEditable ? (
                              <input
                                type="number"
                                value={yb.budget}
                                onChange={(e) => updateYearBudgetField(yb.year, Number(e.target.value))}
                                className="w-32 border border-slate-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className="text-slate-500">
                                {new Intl.NumberFormat('de-DE', {
                                  style: 'currency',
                                  currency: 'EUR',
                                  minimumFractionDigits: 0,
                                }).format(yb.budget)}
                                {isPast && ' (Gesperrt - Vergangenheit)'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isEditable && (
                              <button
                                onClick={() => deleteYearBudget(yb.year)}
                                className="text-red-600 hover:underline text-sm"
                              >
                                Löschen
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Projects Table */}
        <Card title={`Projekte (${projects.length})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Nr. (intern)</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Nr. (extern)</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Klassifizierung</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Titel</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Verantw. MA</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Beschreibung</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Status</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Start</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Ende</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Fortschritt %</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Budget geplant</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Kosten bisher</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Gesellschaft</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">
                    AT 8.2<br />erforderlich
                  </th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">
                    AT 8.2<br />durchgeführt
                  </th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.projectNumberInternal}
                        onChange={(e) => updateField(i, 'projectNumberInternal', e.target.value)}
                        className="w-32 border border-slate-300 rounded px-1 py-0.5 text-xs"
                        placeholder="PINT-2025-001"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.projectNumberExternal || ''}
                        onChange={(e) => updateField(i, 'projectNumberExternal', e.target.value || undefined)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={p.classification}
                        onChange={(e) => updateField(i, 'classification', e.target.value)}
                        className="w-32 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value="internal_dev">Internal Dev</option>
                        <option value="project">Project</option>
                        <option value="project_vdbs">Project VDB-S</option>
                        <option value="task">Task</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.title}
                        onChange={(e) => updateField(i, 'title', e.target.value)}
                        className="w-48 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.owner}
                        onChange={(e) => updateField(i, 'owner', e.target.value)}
                        className="w-36 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <textarea
                        value={p.description}
                        onChange={(e) => updateField(i, 'description', e.target.value)}
                        className="w-64 border border-slate-300 rounded px-1 py-0.5 text-xs h-12"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={p.status}
                        onChange={(e) => updateField(i, 'status', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value="planned">Geplant</option>
                        <option value="active">Laufend</option>
                        <option value="done">Abgeschlossen</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={p.start}
                        onChange={(e) => updateField(i, 'start', e.target.value)}
                        className="w-32 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={p.end}
                        onChange={(e) => updateField(i, 'end', e.target.value)}
                        className="w-32 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={p.progress}
                        onChange={(e) => updateField(i, 'progress', e.target.value)}
                        className="w-16 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        value={p.budgetPlanned}
                        onChange={(e) => updateField(i, 'budgetPlanned', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        value={p.costToDate}
                        onChange={(e) => updateField(i, 'costToDate', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={p.org}
                        onChange={(e) => updateField(i, 'org', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.requiresAT82Check}
                        onChange={(e) => updateField(i, 'requiresAT82Check', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.at82Completed}
                        onChange={(e) => updateField(i, 'at82Completed', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => deleteProject(p.id)} className="text-red-600 hover:underline text-xs">
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
