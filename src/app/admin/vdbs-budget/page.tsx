'use client'

import React, { useState, useEffect, useMemo } from 'react'
import type { VDBSBudgetItem } from '@/types'
import { Card, Badge, COLORS } from '@/ui'
import { parseVDBSBudgetCSV, serializeVDBSBudgetCSV } from '@/lib/csv'

const emptyVDBSBudgetItem = (): VDBSBudgetItem => ({
  id: `vdbs-${Math.random().toString(36).slice(2, 8)}`,
  projectNumber: '',
  projectName: '',
  category: 'RUN',
  budget2026: 0,
  year: 2026,
})

export default function VDBSBudgetAdmin() {
  const [vdbsBudget, setVDBSBudget] = useState<VDBSBudgetItem[]>([])
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/vdbs-budget')
        const data = await res.json()
        setVDBSBudget(data)
      } catch (error) {
        console.error('Error loading VDB-S budget:', error)
        setMsg('Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Save VDB-S budget item (Create or Update)
  const saveItem = async (item: VDBSBudgetItem, isNew: boolean) => {
    try {
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/vdbs-budget' : `/api/vdbs-budget/${item.id}`

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      if (!res.ok) throw new Error('Fehler beim Speichern')

      const saved = await res.json()

      if (isNew) {
        setVDBSBudget([saved, ...vdbsBudget])
      } else {
        setVDBSBudget(vdbsBudget.map((i) => (i.id === saved.id ? saved : i)))
      }

      showMessage('✓ Änderungen gespeichert')
    } catch (error) {
      console.error('Error saving VDB-S budget item:', error)
      setMsg('❌ Fehler beim Speichern')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Delete VDB-S budget item
  const deleteItem = async (id: string) => {
    if (!confirm('Position wirklich löschen?')) return

    try {
      const res = await fetch(`/api/vdbs-budget/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')

      setVDBSBudget(vdbsBudget.filter((i) => i.id !== id))
      showMessage('✓ Position gelöscht')
    } catch (error) {
      console.error('Error deleting VDB-S budget item:', error)
      setMsg('❌ Fehler beim Löschen')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Update field
  const updateField = (i: number, k: keyof VDBSBudgetItem, v: any) => {
    const item = { ...vdbsBudget[i] }

    if (k === 'budget2026' || k === 'year') {
      ;(item as any)[k] = Number(v) || 0
    } else {
      ;(item as any)[k] = v
    }

    saveItem(item, false)
  }

  // Add new item
  const addRow = () => {
    const newItem = emptyVDBSBudgetItem()
    saveItem(newItem, true)
  }

  // CSV Import
  const onImportCSV = async (file?: File) => {
    if (!file) return
    try {
      const text = await file.text()
      const rows = parseVDBSBudgetCSV(text)

      // Bulk insert via API
      for (const row of rows) {
        await saveItem(row, true)
      }

      showMessage(`✓ CSV importiert: ${rows.length} Zeilen`)
    } catch (err) {
      setMsg(`❌ ${(err as Error)?.message || 'CSV konnte nicht geladen werden'}`)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // CSV Export
  const onExportCSV = () => {
    const csv = serializeVDBSBudgetCSV(vdbsBudget)
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vdbs-budget_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const showMessage = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2000)
  }

  // Calculate totals
  const totals = useMemo(() => {
    const total = vdbsBudget.reduce((sum, item) => sum + item.budget2026, 0)
    const runTotal = vdbsBudget.filter((i) => i.category === 'RUN').reduce((sum, i) => sum + i.budget2026, 0)
    const changeTotal = vdbsBudget.filter((i) => i.category === 'CHANGE').reduce((sum, i) => sum + i.budget2026, 0)

    return { total, runTotal, changeTotal }
  }, [vdbsBudget])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)

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
          <h1 className="text-2xl font-bold">Admin – VDB-S Budget verwalten</h1>
          <a href="/vdbs-budget" className="text-blue-600 hover:underline">
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
              <span className="text-sm text-green-600 ml-2 bg-green-50 px-3 py-1 rounded-md font-medium">{msg}</span>
            )}
          </div>
        </Card>

        {/* Summary */}
        <Card title="Gesamt-Übersicht">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Gesamtbudget 2026</div>
              <div className="text-2xl font-bold text-blue-600">{fmtCurrency(totals.total)}</div>
              <div className="text-xs text-gray-500">{vdbsBudget.length} Positionen</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">RUN (Laufende Kosten)</div>
              <div className="text-xl font-bold text-gray-900">{fmtCurrency(totals.runTotal)}</div>
              <div className="text-xs text-gray-500">
                {vdbsBudget.filter((i) => i.category === 'RUN').length} Positionen
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">CHANGE (Projekte)</div>
              <div className="text-xl font-bold text-gray-900">{fmtCurrency(totals.changeTotal)}</div>
              <div className="text-xs text-gray-500">
                {vdbsBudget.filter((i) => i.category === 'CHANGE').length} Positionen
              </div>
            </div>
          </div>
        </Card>

        <Card title={`VDB-S Budgetpositionen (${vdbsBudget.length})`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Projekt Nr.</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Projektname</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Kategorie</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Budget 2026 (€)</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Jahr</th>
                  <th className="py-2 px-2 text-left font-semibold border-b-2 border-slate-300">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {vdbsBudget.map((item, i) => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.projectNumber}
                        onChange={(e) => updateField(i, 'projectNumber', e.target.value)}
                        className="w-24 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={item.projectName}
                        onChange={(e) => updateField(i, 'projectName', e.target.value)}
                        className="w-64 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateField(i, 'category', e.target.value)}
                        className="w-28 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      >
                        <option value="RUN">RUN (Laufend)</option>
                        <option value="CHANGE">CHANGE (Projekt)</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.budget2026}
                        onChange={(e) => updateField(i, 'budget2026', e.target.value)}
                        className="w-28 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        value={item.year}
                        onChange={(e) => updateField(i, 'year', e.target.value)}
                        className="w-20 border border-slate-300 rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline text-xs">
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2 px-2 font-bold">
                    Gesamt
                  </td>
                  <td className="py-2 px-2 font-mono font-bold">{fmtCurrency(totals.total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
