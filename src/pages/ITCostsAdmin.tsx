import { useEffect, useState, useMemo } from 'react';
import { parseITCostsCSV, serializeITCostsCSV } from '../lib/csv';
import { ITCost, ITCostCategory, ITCostFrequency, YearBudget } from '../types';
import { calculateYearlyCostD, getITCostsByCategoryD, plannedBudgetForYearD, toDate } from '../lib';

const DEMO_IT_COSTS: ITCost[] = [
  {
    id: '1',
    description: 'Microsoft 365 Business Standard (50 Lizenzen)',
    category: 'software_licenses',
    provider: 'Microsoft',
    amount: 625,
    frequency: 'monthly',
    startDate: '2024-01-01',
    endDate: '',
    costCenter: 'IT',
    notes: 'Vertragsnummer: MS-2024-001',
    year: 2025,
  },
  {
    id: '2',
    description: 'Adobe Creative Cloud (10 Lizenzen)',
    category: 'software_licenses',
    provider: 'Adobe',
    amount: 599,
    frequency: 'monthly',
    startDate: '2024-06-01',
    endDate: '',
    costCenter: 'Marketing',
    notes: '',
    year: 2025,
  },
  {
    id: '3',
    description: 'Server-Wartung (Dell PowerEdge)',
    category: 'maintenance_service',
    provider: 'Dell',
    amount: 4500,
    frequency: 'yearly',
    startDate: '2024-03-01',
    endDate: '2026-03-01',
    costCenter: 'IT',
    notes: 'Verlängerung alle 2 Jahre',
    year: 2025,
  },
  {
    id: '4',
    description: 'Cisco Meraki Lizenz (40 Access Points)',
    category: 'software_licenses',
    provider: 'Cisco',
    amount: 1200,
    frequency: 'yearly',
    startDate: '2023-01-01',
    endDate: '',
    costCenter: 'IT',
    notes: 'Auto-Renewal aktiv',
    year: 2025,
  },
  {
    id: '5',
    description: 'Atlassian Jira + Confluence (30 User)',
    category: 'software_licenses',
    provider: 'Atlassian',
    amount: 450,
    frequency: 'monthly',
    startDate: '2024-01-01',
    endDate: '',
    costCenter: 'IT',
    notes: '',
    year: 2025,
  },
  {
    id: '6',
    description: 'Firewall-Wartung (Fortinet)',
    category: 'maintenance_service',
    provider: 'Fortinet',
    amount: 800,
    frequency: 'quarterly',
    startDate: '2024-01-01',
    endDate: '',
    costCenter: 'IT',
    notes: 'Support & Updates',
    year: 2025,
  },
  {
    id: '7',
    description: 'Backup-Lösung (Veeam)',
    category: 'software_licenses',
    provider: 'Veeam',
    amount: 2400,
    frequency: 'yearly',
    startDate: '2024-07-01',
    endDate: '',
    costCenter: 'IT',
    notes: 'Enterprise Plus Edition',
    year: 2025,
  },
  {
    id: '8',
    description: 'Cybersecurity-Schulung (Mitarbeiter)',
    category: 'training',
    provider: 'TÜV Rheinland',
    amount: 3500,
    frequency: 'one_time',
    startDate: '2025-03-15',
    endDate: '2025-03-15',
    costCenter: 'HR',
    notes: 'Jährliche Pflichtschulung',
    year: 2025,
  },
  {
    id: '9',
    description: 'Hardware-Refresh (20 PCs)',
    category: 'hardware',
    provider: 'Dell',
    amount: 25000,
    frequency: 'one_time',
    startDate: '2025-06-01',
    endDate: '2025-06-01',
    costCenter: 'IT',
    notes: 'Ersatz für 2019er Modelle',
    year: 2025,
  },
  {
    id: '10',
    description: 'Zoom Enterprise (100 Lizenzen)',
    category: 'software_licenses',
    provider: 'Zoom',
    amount: 160,
    frequency: 'monthly',
    startDate: '2024-01-01',
    endDate: '',
    costCenter: 'IT',
    notes: '',
    year: 2025,
  },
  {
    id: '11',
    description: 'SAP S/4HANA Lizenz',
    category: 'software_licenses',
    provider: 'SAP',
    amount: 12000,
    frequency: 'yearly',
    startDate: '2023-01-01',
    endDate: '',
    costCenter: 'Finanzen',
    notes: 'Enterprise-Vertrag',
    year: 2025,
  },
  {
    id: '12',
    description: 'Externe IT-Beratung',
    category: 'other',
    provider: 'Capgemini',
    amount: 8000,
    frequency: 'quarterly',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    costCenter: 'IT',
    notes: 'Strategieberatung',
    year: 2025,
  },
];

export default function ITCostsAdmin() {
  const [costs, setCosts] = useState<ITCost[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([]);

  // localStorage laden
  useEffect(() => {
    const stored = localStorage.getItem('itCosts');
    if (stored) {
      try {
        setCosts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse itCosts:', e);
        setCosts(DEMO_IT_COSTS);
        localStorage.setItem('itCosts', JSON.stringify(DEMO_IT_COSTS));
      }
    } else {
      setCosts(DEMO_IT_COSTS);
      localStorage.setItem('itCosts', JSON.stringify(DEMO_IT_COSTS));
    }

    const storedBudgets = localStorage.getItem('yearBudgets');
    if (storedBudgets) {
      try {
        setYearBudgets(JSON.parse(storedBudgets));
      } catch (e) {
        console.error('Failed to parse yearBudgets:', e);
      }
    }
  }, []);

  // Nach Jahr filtern
  const filteredCosts = useMemo(
    () => costs.filter((c) => c.year === selectedYear),
    [costs, selectedYear]
  );

  // Jahresbudget für ausgewähltes Jahr
  const yearBudget = yearBudgets.find((yb) => yb.year === selectedYear);

  // IT-Kosten Summe für ausgewähltes Jahr
  const itCostsTotal = useMemo(() => {
    return getITCostsByCategoryD(filteredCosts, selectedYear).total;
  }, [filteredCosts, selectedYear]);

  // Projektbudgets Summe (anteilig aus localStorage)
  const projectBudgetsTotal = useMemo(() => {
    const stored = localStorage.getItem('projects_json');
    if (!stored) return 0;
    try {
      const projects = JSON.parse(stored);
      return projects.reduce((sum: number, p: any) => {
        const normalized = {
          startD: toDate(p.start),
          endD: toDate(p.end),
          budgetPlanned: p.budgetPlanned || 0,
        };
        return sum + plannedBudgetForYearD(normalized, selectedYear);
      }, 0);
    } catch (e) {
      return 0;
    }
  }, [selectedYear]);

  // Warnung bei Überplanung
  const showBudgetWarning = yearBudget && itCostsTotal + projectBudgetsTotal > yearBudget.budget;

  // Speichern
  const saveCosts = (updated: ITCost[]) => {
    setCosts(updated);
    localStorage.setItem('itCosts', JSON.stringify(updated));
  };

  // CRUD
  const handleAdd = () => {
    const newCost: ITCost = {
      id: Date.now().toString(),
      description: 'Neue IT-Kostenposition',
      category: 'software_licenses',
      provider: '',
      amount: 0,
      frequency: 'monthly',
      startDate: `${selectedYear}-01-01`,
      endDate: '',
      costCenter: '',
      notes: '',
      year: selectedYear,
    };
    saveCosts([...costs, newCost]);
    setEditingId(newCost.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Wirklich löschen?')) return;
    saveCosts(costs.filter((c) => c.id !== id));
  };

  const handleUpdate = (id: string, field: keyof ITCost, value: any) => {
    saveCosts(costs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // CSV Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const parsed = parseITCostsCSV(csv);
      if (parsed.length > 0) {
        saveCosts(parsed);
        alert(`${parsed.length} IT-Kostenpositionen importiert`);
      } else {
        alert('CSV-Import fehlgeschlagen');
      }
    };
    reader.readAsText(file);
  };

  // CSV Export
  const handleExport = () => {
    const csv = serializeITCostsCSV(filteredCosts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `it-kosten-${selectedYear}.csv`;
    link.click();
  };

  // Deutsche Labels
  const categoryLabels: Record<ITCostCategory, string> = {
    hardware: 'Hardware',
    software_licenses: 'Software & Lizenzen',
    maintenance_service: 'Wartung & Service',
    training: 'Schulung',
    other: 'Sonstiges',
  };

  const frequencyLabels: Record<ITCostFrequency, string> = {
    monthly: 'Monatlich',
    quarterly: 'Vierteljährlich',
    yearly: 'Jährlich',
    one_time: 'Einmalig',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-[1800px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laufende IT-Kosten verwalten</h1>
            <p className="mt-1 text-sm text-gray-600">
              Verwaltung von Software-Lizenzen, Hardware, Wartung und sonstigen IT-Kosten
            </p>
          </div>
          <a
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ← Zurück zum Dashboard
          </a>
        </div>

        {/* Budget-Warnung */}
        {showBudgetWarning && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            <strong>⚠️ Warnung:</strong> IT-Kosten (
            {itCostsTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) +
            Projektbudgets (
            {projectBudgetsTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
            übersteigen Jahresbudget (
            {yearBudget!.budget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex items-center gap-4">
          <div>
            <label className="mr-2 text-sm font-medium text-gray-700">Jahr:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
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
            Gesamt {selectedYear}:{' '}
            {itCostsTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>

        {/* Tabelle */}
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border-b p-3 text-left font-medium">Beschreibung</th>
                <th className="border-b p-3 text-left font-medium">Kategorie</th>
                <th className="border-b p-3 text-left font-medium">Dienstleister</th>
                <th className="border-b p-3 text-left font-medium">Betrag (€)</th>
                <th className="border-b p-3 text-left font-medium">Frequenz</th>
                <th className="border-b p-3 text-left font-medium">Kostenstelle</th>
                <th className="border-b p-3 text-left font-medium">Notizen</th>
                <th className="border-b p-3 text-left font-medium">Jahreskosten</th>
                <th className="border-b p-3 text-center font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    Keine IT-Kosten für {selectedYear}. Klicke auf &quot;+ Neue Position&quot; zum Hinzufügen.
                  </td>
                </tr>
              ) : (
                filteredCosts.map((cost) => {
                  const isEditing = editingId === cost.id;
                  const yearlyCost = calculateYearlyCostD(cost, selectedYear);

                  return (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={cost.description}
                            onChange={(e) => handleUpdate(cost.id, 'description', e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          />
                        ) : (
                          cost.description
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <select
                            value={cost.category}
                            onChange={(e) => handleUpdate(cost.id, 'category', e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          >
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          categoryLabels[cost.category]
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={cost.provider}
                            onChange={(e) => handleUpdate(cost.id, 'provider', e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          />
                        ) : (
                          cost.provider
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={cost.amount}
                            onChange={(e) => handleUpdate(cost.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border px-2 py-1"
                          />
                        ) : (
                          cost.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <select
                            value={cost.frequency}
                            onChange={(e) => handleUpdate(cost.id, 'frequency', e.target.value)}
                            className="w-full rounded border px-2 py-1"
                          >
                            {Object.entries(frequencyLabels).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          frequencyLabels[cost.frequency]
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={cost.costCenter}
                            onChange={(e) => handleUpdate(cost.id, 'costCenter', e.target.value)}
                            className="w-24 rounded border px-2 py-1"
                          />
                        ) : (
                          cost.costCenter || '-'
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={cost.notes}
                            onChange={(e) => handleUpdate(cost.id, 'notes', e.target.value)}
                            className="w-32 rounded border px-2 py-1"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">{cost.notes || '-'}</span>
                        )}
                      </td>
                      <td className="border-b p-2 font-medium">
                        {yearlyCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="border-b p-2 text-center">
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
                              onClick={() => setEditingId(cost.id)}
                              className="mr-2 text-sm text-blue-600 hover:underline"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleDelete(cost.id)}
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
          </table>
        </div>

        {/* Legende */}
        <div className="mt-4 text-xs text-gray-600">
          <p>
            <strong>Hinweis:</strong> &quot;Jahreskosten&quot; werden automatisch aus Frequenz und
            Vertragslaufzeit berechnet (anteilig bei unterjährigen Verträgen).
          </p>
        </div>
      </div>
    </div>
  );
}
