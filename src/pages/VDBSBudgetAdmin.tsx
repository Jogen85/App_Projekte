import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { VDBSBudgetItem } from '../types';
import { Card } from '../ui';
import { parseVDBSBudgetCSV, serializeVDBSBudgetCSV, readFileAsText } from '../lib/csv';

export default function VDBSBudgetAdmin() {
  const [items, setItems] = useState<VDBSBudgetItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [msg, setMsg] = useState<string>('');

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vdbsBudget');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load VDB-S Budget:', e);
    }
  }, []);

  // Auto-save
  const saveItems = (updated: VDBSBudgetItem[]) => {
    setItems(updated);
    localStorage.setItem('vdbsBudget', JSON.stringify(updated));
    setMsg('✓ Änderungen gespeichert');
    setTimeout(() => setMsg(''), 2000);
  };

  // CRUD operations
  const handleAdd = () => {
    const newItem: VDBSBudgetItem = {
      id: Date.now().toString(),
      projectNumber: '',
      projectName: 'Neue Position',
      category: 'RUN',
      budget2026: 0,
      year: selectedYear,
    };
    saveItems([...items, newItem]);
    setEditingId(newItem.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Wirklich löschen?')) return;
    saveItems(items.filter((item) => item.id !== id));
  };

  const handleUpdate = (id: string, field: keyof VDBSBudgetItem, value: any) => {
    saveItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'budget2026' || field === 'year' ? Number(value) : value,
            }
          : item
      )
    );
  };

  // CSV Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const parsed = parseVDBSBudgetCSV(text);
      if (parsed.length > 0) {
        saveItems(parsed);
        setMsg(`✓ ${parsed.length} Positionen importiert`);
      } else {
        setMsg('⚠️ CSV-Import fehlgeschlagen (keine gültigen Zeilen)');
      }
    } catch (err) {
      setMsg(`❌ Fehler: ${(err as Error).message}`);
    }
  };

  // CSV Export
  const handleExport = () => {
    const csv = serializeVDBSBudgetCSV(filteredItems);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vdbs-budget-${selectedYear}.csv`;
    link.click();
  };

  // Filter by year
  const filteredItems = items.filter((item) => item.year === selectedYear);
  const totalBudget = filteredItems.reduce((sum, item) => sum + item.budget2026, 0);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-[1800px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">VDB-S Budget verwalten</h1>
            <p className="mt-1 text-sm text-gray-600">
              Budgetpositionen für VDB-Service, Arbeitskreise und Projekte
            </p>
          </div>
          <Link to="/vdbs-budget" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            ← Zurück zum Dashboard
          </Link>
        </div>

        {/* Toolbar */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mr-2 text-sm font-medium text-gray-700">Jahr:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAdd}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              + Neue Position
            </button>

            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              CSV importieren
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleExport}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              CSV exportieren
            </button>

            <div className="ml-auto text-sm font-medium text-gray-900">
              Gesamt {selectedYear}: {fmtCurrency(totalBudget)}
            </div>

            {msg && (
              <span className="ml-2 rounded-md bg-green-50 px-3 py-1 text-sm font-medium text-green-600">{msg}</span>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Projekt Nr.
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Projektname
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Kategorie
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Budget 2026 (€)
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Keine Budgetpositionen für {selectedYear}. Klicke auf &quot;+ Neue Position&quot; zum Hinzufügen.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.projectNumber}
                              onChange={(e) => handleUpdate(item.id, 'projectNumber', e.target.value)}
                              className="w-24 rounded border px-2 py-1"
                              placeholder="101"
                            />
                          ) : (
                            <span className="font-mono text-xs">{item.projectNumber}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.projectName}
                              onChange={(e) => handleUpdate(item.id, 'projectName', e.target.value)}
                              className="w-full rounded border px-2 py-1"
                            />
                          ) : (
                            item.projectName
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdate(item.id, 'category', e.target.value)}
                              className="w-32 rounded border px-2 py-1"
                            >
                              <option value="RUN">RUN</option>
                              <option value="CHANGE">CHANGE</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${item.category === 'RUN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={item.budget2026}
                              onChange={(e) => handleUpdate(item.id, 'budget2026', parseFloat(e.target.value) || 0)}
                              className="w-32 rounded border px-2 py-1 text-right"
                            />
                          ) : (
                            <span className="font-medium">{fmtCurrency(item.budget2026)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-sm text-green-600 hover:underline"
                            >
                              Fertig
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingId(item.id)}
                                className="mr-2 text-sm text-blue-600 hover:underline"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Löschen
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                    Gesamt:
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">{fmtCurrency(totalBudget)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
