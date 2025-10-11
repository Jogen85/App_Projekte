'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { YearBudget, Project } from '@/types'
import { Card, TYPOGRAPHY, LAYOUT } from '@/ui'
import { getCurrentYear, overlapDays, daysBetween, yearStart, yearEnd } from '@/lib'
import { parseYearBudgetsCSV, serializeYearBudgetsCSV, readFileAsText, CSVParseError } from '@/lib/csv'

export default function OverallBudgetAdmin() {
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const currentYear = getCurrentYear()

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const [yearBudgetsRes, projectsRes] = await Promise.all([
          fetch('/api/year-budgets'),
          fetch('/api/projects'),
        ])
        const yearBudgetsData = await yearBudgetsRes.json()
        const projectsData = await projectsRes.json()
        setYearBudgets(yearBudgetsData)
        setProjects(projectsData)
      } catch (error) {
        console.error('Error loading data:', error)
        setMsg('Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Save year budget (Create or Update)
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

  // CSV Import with UPSERT
  const onImportCSV = async (file?: File) => {
    if (!file) return

    try {
      const text = await readFileAsText(file)
      const rows = parseYearBudgetsCSV(text)

      setMsg(`⏳ Importiere ${rows.length} Jahresbudgets...`)

      // Batch import with UPSERT (update existing, insert new)
      const errors: Array<{ row: number; yearBudget: YearBudget; error: string }> = []
      let successCount = 0

      for (let i = 0; i < rows.length; i++) {
        const yearBudget = rows[i]
        try {
          // Use PATCH for UPSERT (insert or update)
          const res = await fetch('/api/year-budgets', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yearBudget),
          })

          if (!res.ok) {
            const errorData = await res.json()
            errors.push({
              row: i + 2, // +1 for header, +1 for 1-based indexing
              yearBudget,
              error: `${errorData.error}${errorData.details ? ' – ' + errorData.details : ''}`
            })
          } else {
            successCount++
          }
        } catch (error: any) {
          errors.push({
            row: i + 2,
            yearBudget,
            error: error.message || 'Netzwerkfehler'
          })
        }
      }

      // Reload budgets after import
      const res = await fetch('/api/year-budgets')
      const data = await res.json()
      setYearBudgets(data)

      // Show results
      if (errors.length === 0) {
        showMessage(`✓ CSV importiert: ${successCount} Jahresbudgets erfolgreich (aktualisiert/neu erstellt)`)
      } else {
        const errorMsg = [
          `⚠️ CSV-Import abgeschlossen: ${successCount} erfolgreich, ${errors.length} fehlgeschlagen\n`,
          ...errors.slice(0, 10).map(e =>
            `\nZeile ${e.row} (Jahr: ${e.yearBudget.year}):\n  - ${e.error}`
          )
        ].join('')

        if (errors.length > 10) {
          setMsg(errorMsg + `\n\n... und ${errors.length - 10} weitere Fehler`)
        } else {
          setMsg(errorMsg)
        }
        setTimeout(() => setMsg(''), 15000) // Extra long timeout for batch errors
      }
    } catch (err) {
      if (err instanceof CSVParseError) {
        // CSV parsing error (before API call)
        const detailedMsg = err.toDetailedMessage()
        setMsg(`❌ ${detailedMsg}`)
        console.error('CSV Parse Fehler:', err.errors)
      } else {
        setMsg(`❌ ${(err as Error)?.message || 'CSV konnte nicht geladen werden'}`)
      }
      setTimeout(() => setMsg(''), 10000)
    }
  }

  // CSV Export
  const onExportCSV = () => {
    const csv = serializeYearBudgetsCSV(yearBudgets)
    const bom = '\uFEFF' // UTF-8 BOM für Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jahresbudgets_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
    <div className={LAYOUT.pageContainer}>
      <div className={LAYOUT.contentWrapper}>
        <header className={LAYOUT.header}>
          <div>
            <h1 className={TYPOGRAPHY.pageTitle}>Admin – Jahresbudgets verwalten</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>Jahresbudgets definieren, importieren und exportieren</p>
          </div>
          <a href="/overall-budget" className="text-sm text-blue-600 hover:underline font-medium">
            ← Zurück zum Dashboard
          </a>
        </header>

        <Card>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={addYearBudget}
              className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium transition-colors"
            >
              + Weiteres Jahr
            </button>
            <input
              id="csvInput"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => onImportCSV(e.target.files?.[0])}
            />
            <button
              onClick={() => document.getElementById('csvInput')!.click()}
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
            <span className="text-xs text-slate-500">Änderungen werden automatisch gespeichert</span>
            {msg && (
              <div className={`text-sm ml-2 px-3 py-2 rounded-md font-medium max-w-4xl ${msg.startsWith('✓') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                <pre className="whitespace-pre-wrap text-xs font-mono">{msg}</pre>
              </div>
            )}
          </div>
        </Card>

        {overBudgetWarnings.length > 0 && (
          <Card>
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
          </Card>
        )}

        <Card title="Jahresbudgets">
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
        </Card>
      </div>
    </div>
  )
}
