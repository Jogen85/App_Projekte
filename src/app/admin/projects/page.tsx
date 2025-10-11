'use client'

import React, { useState, useEffect } from 'react'
import type { Project } from '@/types'
import { Card, TYPOGRAPHY, LAYOUT } from '@/ui'
import { parseProjectsCSV, projectsToCSV, readFileAsText, CSVParseError } from '@/lib/csv'

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
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/projects')
        const projectsData = await res.json()
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

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(
          `${errorData.error || 'Fehler beim Speichern'}${
            errorData.details ? '\n\nDetails: ' + errorData.details : ''
          }`
        )
      }

      const saved = await res.json()

      if (isNew) {
        setProjects([saved, ...projects])
      } else {
        setProjects(projects.map((p) => (p.id === saved.id ? saved : p)))
      }

      showMessage('✓ Änderungen gespeichert')
    } catch (error: any) {
      console.error('Error saving project:', error)
      setMsg(`❌ ${error.message || 'Fehler beim Speichern'}`)
      setTimeout(() => setMsg(''), 5000) // Longer timeout for detailed errors
    }
  }

  // Save project in background (optimistic update)
  const saveProjectInBackground = async (project: Project, originalIndex: number) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      })

      if (!res.ok) {
        throw new Error('Fehler beim Speichern')
      }

      showMessage('✓ Gespeichert')
    } catch (error) {
      console.error('Error saving project:', error)
      setMsg('❌ Fehler beim Speichern - Seite neu laden')
      setTimeout(() => setMsg(''), 3000)

      // Reload data on error to restore correct state
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
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

  // Update project field (with optimistic update)
  const updateField = (i: number, k: keyof Project, v: any) => {
    // 1. Optimistic update: Update state immediately for instant UI feedback
    const updatedProjects = [...projects]
    const project = { ...updatedProjects[i] }

    if (k === 'progress' || k === 'budgetPlanned' || k === 'costToDate') {
      (project as any)[k] = Number(v) || 0
    } else if (k === 'requiresAT82Check' || k === 'at82Completed') {
      (project as any)[k] = v === true || v === 'true'
    } else {
      (project as any)[k] = v
    }

    updatedProjects[i] = project
    setProjects(updatedProjects)

    // 2. Save to API in background
    saveProjectInBackground(project, i)
  }

  // Add new project
  const addRow = () => {
    const newProject = emptyProject()
    saveProject(newProject, true)
  }

  // CSV Import with batch operation and detailed error reporting
  const onImportCSV = async (file?: File) => {
    if (!file) return

    try {
      const text = await readFileAsText(file)
      const rows = parseProjectsCSV(text)

      setMsg(`⏳ Importiere ${rows.length} Projekte...`)

      // Batch import with UPSERT (update existing, insert new)
      const errors: Array<{ row: number; project: Project; error: string }> = []
      let successCount = 0
      let updatedCount = 0
      let insertedCount = 0

      for (let i = 0; i < rows.length; i++) {
        const project = rows[i]
        try {
          // Use PATCH for UPSERT (insert or update)
          const res = await fetch('/api/projects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project),
          })

          if (!res.ok) {
            const errorData = await res.json()
            errors.push({
              row: i + 2, // +1 for header, +1 for 1-based indexing
              project,
              error: `${errorData.error}${errorData.details ? ' – ' + errorData.details : ''}`
            })
          } else {
            const data = await res.json()
            successCount++
            // Track if it was an update or insert (future enhancement)
            if (data.upserted) {
              updatedCount++
            } else {
              insertedCount++
            }
          }
        } catch (error: any) {
          errors.push({
            row: i + 2,
            project,
            error: error.message || 'Netzwerkfehler'
          })
        }
      }

      // Reload projects after import
      const res = await fetch('/api/projects')
      const projectsData = await res.json()
      setProjects(projectsData)

      // Show results
      if (errors.length === 0) {
        showMessage(`✓ CSV importiert: ${successCount} Projekte erfolgreich (aktualisiert/neu erstellt)`)
      } else {
        const errorMsg = [
          `⚠️ CSV-Import abgeschlossen: ${successCount} erfolgreich, ${errors.length} fehlgeschlagen\n`,
          ...errors.slice(0, 10).map(e =>
            `\nZeile ${e.row} (ID: ${e.project.id}):\n  - ${e.error}`
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

  const showMessage = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

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
            <h1 className={TYPOGRAPHY.pageTitle}>Admin – Projekte bearbeiten</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>Projektdaten verwalten, importieren und exportieren</p>
          </div>
          <a href="/projects" className="text-sm text-blue-600 hover:underline font-medium">
            ← Zurück zum Dashboard
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
              <div className={`text-sm ml-2 px-3 py-2 rounded-md font-medium max-w-4xl ${msg.startsWith('✓') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                <pre className="whitespace-pre-wrap text-xs font-mono">{msg}</pre>
              </div>
            )}
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
