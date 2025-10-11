'use client'

import React, { useState, useEffect } from 'react'
import type { ITCost, ITCostCategory } from '@/types'
import { Card, TYPOGRAPHY, LAYOUT } from '@/ui'
import { parseITCostsCSV, serializeITCostsCSV, readFileAsText, CSVParseError } from '@/lib/csv'
import { getCurrentYear } from '@/lib'

const emptyITCost = (): ITCost => ({
  id: `itc-${Math.random().toString(36).slice(2, 8)}`,
  description: '',
  category: 'software_licenses',
  provider: '',
  amount: 0,
  frequency: 'monthly',
  costCenter: '',
  notes: '',
  year: getCurrentYear(),
})

const CATEGORY_LABELS: Record<ITCostCategory, string> = {
  hardware: 'Hardware',
  software_licenses: 'Software & Lizenzen',
  maintenance_service: 'Wartung & Service',
  training: 'Schulung',
  other: 'Sonstiges',
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monatlich',
  quarterly: 'Quartalsweise',
  biannual: 'Halbjährlich',
  yearly: 'Jährlich',
  one_time: 'Einmalig',
}

export default function ITCostsAdmin() {
  const [itCosts, setITCosts] = useState<ITCost[]>([])
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/it-costs')
        const data = await res.json()
        setITCosts(data)
      } catch (error) {
        console.error('Error loading IT costs:', error)
        setMsg('Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Save IT cost (Create or Update)
  const saveITCost = async (cost: ITCost, isNew: boolean) => {
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/it-costs' : `/api/it-costs/${cost.id}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cost),
      })

      if (!res.ok) throw new Error('Fehler beim Speichern')

      const saved = await res.json()

      if (isNew) {
        setITCosts([saved, ...itCosts])
      } else {
        setITCosts(itCosts.map((c) => (c.id === saved.id ? saved : c)))
      }

      showMessage('✓ Änderungen gespeichert')
    } catch (error) {
      console.error('Error saving IT cost:', error)
      setMsg('❌ Fehler beim Speichern')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Save IT cost in background (optimistic update)
  const saveITCostInBackground = async (cost: ITCost, originalIndex: number) => {
    try {
      const res = await fetch(`/api/it-costs/${cost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cost),
      })

      if (!res.ok) {
        throw new Error('Fehler beim Speichern')
      }

      showMessage('✓ Gespeichert')
    } catch (error) {
      console.error('Error saving IT cost:', error)
      setMsg('❌ Fehler beim Speichern - Seite neu laden')
      setTimeout(() => setMsg(''), 3000)

      // Reload data on error to restore correct state
      const res = await fetch('/api/it-costs')
      const data = await res.json()
      setITCosts(data)
    }
  }

  // Delete IT cost
  const deleteITCost = async (id: string) => {
    if (!confirm('Position wirklich löschen?')) return

    try {
      const res = await fetch(`/api/it-costs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')

      setITCosts(itCosts.filter((c) => c.id !== id))
      showMessage('✓ Position gelöscht')
    } catch (error) {
      console.error('Error deleting IT cost:', error)
      setMsg('❌ Fehler beim Löschen')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Update field (with optimistic update)
  const updateField = (i: number, k: keyof ITCost, v: any) => {
    // 1. Optimistic update: Update state immediately for instant UI feedback
    const updatedCosts = [...itCosts]
    const cost = { ...updatedCosts[i] }

    if (k === 'amount' || k === 'year') {
      (cost as any)[k] = Number(v) || 0
    } else {
      (cost as any)[k] = v
    }

    updatedCosts[i] = cost
    setITCosts(updatedCosts)

    // 2. Save to API in background
    saveITCostInBackground(cost, i)
  }

  // Add new cost
  const addRow = () => {
    const newCost = emptyITCost()
    saveITCost(newCost, true)
  }

  // CSV Import with UPSERT
  const onImportCSV = async (file?: File) => {
    if (!file) return

    try {
      const text = await readFileAsText(file)
      const rows = parseITCostsCSV(text)

      setMsg(`⏳ Importiere ${rows.length} IT-Kosten...`)

      // Batch import with UPSERT (update existing, insert new)
      const errors: Array<{ row: number; cost: ITCost; error: string }> = []
      let successCount = 0

      for (let i = 0; i < rows.length; i++) {
        const cost = rows[i]
        try {
          // Use PATCH for UPSERT (insert or update)
          const res = await fetch('/api/it-costs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cost),
          })

          if (!res.ok) {
            const errorData = await res.json()
            errors.push({
              row: i + 2, // +1 for header, +1 for 1-based indexing
              cost,
              error: `${errorData.error}${errorData.details ? ' – ' + errorData.details : ''}`
            })
          } else {
            successCount++
          }
        } catch (error: any) {
          errors.push({
            row: i + 2,
            cost,
            error: error.message || 'Netzwerkfehler'
          })
        }
      }

      // Reload costs after import
      const res = await fetch('/api/it-costs')
      const data = await res.json()
      setITCosts(data)

      // Show results
      if (errors.length === 0) {
        showMessage(`✓ CSV importiert: ${successCount} IT-Kosten erfolgreich (aktualisiert/neu erstellt)`)
      } else {
        const errorMsg = [
          `⚠️ CSV-Import abgeschlossen: ${successCount} erfolgreich, ${errors.length} fehlgeschlagen\n`,
          ...errors.slice(0, 10).map(e =>
            `\nZeile ${e.row} (ID: ${e.cost.id}):\n  - ${e.error}`
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
    const csv = serializeITCostsCSV(itCosts)
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `it-kosten_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const showMessage = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

  const calculateYearlyCost = (cost: ITCost): number => {
    if (cost.frequency === 'monthly') return cost.amount * 12
    if (cost.frequency === 'quarterly') return cost.amount * 4
    if (cost.frequency === 'biannual') return cost.amount * 2
    return cost.amount
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
            <h1 className={TYPOGRAPHY.pageTitle}>Admin – IT-Kosten verwalten</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>IT-Kosten verwalten, importieren und exportieren</p>
          </div>
          <a href="/it-costs" className="text-sm text-blue-600 hover:underline font-medium">
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
            {msg && (
              <div className={`text-sm ml-2 px-3 py-2 rounded-md font-medium max-w-4xl ${msg.startsWith('✓') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                <pre className="whitespace-pre-wrap text-xs font-mono">{msg}</pre>
              </div>
            )}
          </div>
        </Card>

        <Card title={`IT-Kostenpositionen (${itCosts.length})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Beschreibung</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Kategorie</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Dienstleister</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Betrag (€)</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Frequenz</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Kostenstelle</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Notizen</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Jahr</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Jahreskosten</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {itCosts.map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={c.description}
                        onChange={(e) => updateField(i, 'description', e.target.value)}
                        className="w-48 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={c.category}
                        onChange={(e) => updateField(i, 'category', e.target.value)}
                        className="w-36 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={c.provider}
                        onChange={(e) => updateField(i, 'provider', e.target.value)}
                        className="w-36 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={c.amount}
                        onChange={(e) => updateField(i, 'amount', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={c.frequency}
                        onChange={(e) => updateField(i, 'frequency', e.target.value)}
                        className="w-28 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={c.costCenter}
                        onChange={(e) => updateField(i, 'costCenter', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <textarea
                        value={c.notes}
                        onChange={(e) => updateField(i, 'notes', e.target.value)}
                        className="w-48 border border-slate-300 rounded px-1 py-0.5 text-xs h-12"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        value={c.year}
                        onChange={(e) => updateField(i, 'year', e.target.value)}
                        className="w-20 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-right">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                      }).format(calculateYearlyCost(c))}
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => deleteITCost(c.id)} className="text-red-600 hover:underline text-xs">
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
