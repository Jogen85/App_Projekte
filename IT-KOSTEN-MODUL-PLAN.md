# IT-Kostenplanung-Modul – Detaillierter Implementierungsplan v1.5.0

## Übersicht

Dieses Dokument beschreibt die vollständige Implementierung eines IT-Kostenplanungs-Moduls für das Portfolio Dashboard. Das Modul ermöglicht die Verwaltung laufender IT-Kosten (Software-Lizenzen, Hardware, Wartung, etc.) und integriert diese in die bestehende Budgetplanung.

**Ziel**: Jahresbudget = Laufende IT-Kosten + Projektbudgets + Reserve

---

## 1. Datenmodell erweitern

### 1.1 Neue TypeScript-Interfaces (`src/types.ts`)

**Am Ende der Datei hinzufügen:**

```typescript
/**
 * IT-Kostenposition (laufende Kosten wie Lizenzen, Wartung, etc.)
 */
export interface ITCost {
  id: string;                    // UUID oder fortlaufende Nummer
  description: string;           // "Microsoft 365 Business Lizenzen"
  category: ITCostCategory;      // Hardware, Software, etc.
  provider: string;              // "Microsoft", "Dell", "Telekom"
  amount: number;                // Betrag in Euro (bei Frequenz Monthly/Quarterly wird automatisch hochgerechnet)
  frequency: ITCostFrequency;    // Monatlich, vierteljährlich, jährlich, einmalig
  startDate: string;             // YYYY-MM-DD (Vertragsbeginn)
  endDate: string;               // YYYY-MM-DD (Vertragsende, '' = unbefristet)
  costCenter: string;            // Kostenstelle/Abteilung, '' = nicht zugeordnet
  notes: string;                 // Freitext (Vertragsnummer, Ansprechpartner, etc.)
  year: number;                  // Jahr, für das dieser Eintrag gilt (2025, 2026, etc.)
}

export type ITCostCategory =
  | 'hardware'              // Hardware (Server, PCs, Netzwerk)
  | 'software_licenses'     // Software & Lizenzen
  | 'maintenance_service'   // Wartung & Service
  | 'training'              // Schulung & Weiterbildung
  | 'other';                // Sonstiges

export type ITCostFrequency =
  | 'monthly'      // Monatliche Zahlung (× 12)
  | 'quarterly'    // Vierteljährliche Zahlung (× 4)
  | 'yearly'       // Jährliche Zahlung (× 1)
  | 'one_time';    // Einmalige Zahlung (× 1)

/**
 * Aggregierte IT-Kosten nach Kategorie
 */
export interface ITCostsByCategory {
  hardware: number;
  software_licenses: number;
  maintenance_service: number;
  training: number;
  other: number;
  total: number;
}

/**
 * Aggregierte IT-Kosten nach Dienstleister
 */
export interface ITCostsByProvider {
  provider: string;
  total: number;
}
```

**Hinweis**: Die bestehenden Interfaces (`Project`, `NormalizedProject`, `YearBudget`) bleiben unverändert.

---

## 2. Berechnungslogik implementieren

### 2.1 Neue Funktionen in `src/lib.ts`

**Am Ende der Datei hinzufügen:**

```typescript
/**
 * Berechnet die jährlichen Kosten einer IT-Kostenposition
 * Berücksichtigt Frequenz und anteilige Berechnung bei unterjährigem Start/Ende
 */
export function calculateYearlyCostD(
  cost: ITCost,
  year: number,
  today: Date = new Date()
): number {
  const yearStartD = new Date(year, 0, 1);
  const yearEndD = new Date(year, 11, 31);

  // Vertragszeitraum parsen
  const startD = parseDate(cost.startDate);
  const endD = cost.endDate ? parseDate(cost.endDate) : null;

  // Wenn Vertrag komplett außerhalb des Jahres liegt → 0
  if (startD > yearEndD) return 0;
  if (endD && endD < yearStartD) return 0;

  // Überlappende Tage im Jahr berechnen
  const effectiveStartD = startD > yearStartD ? startD : yearStartD;
  const effectiveEndD = endD && endD < yearEndD ? endD : yearEndD;
  const overlapDaysD = daysBetween(effectiveStartD, effectiveEndD);

  // Basis-Jahreskosten je nach Frequenz
  let yearlyBaseAmount = 0;
  switch (cost.frequency) {
    case 'monthly':
      yearlyBaseAmount = cost.amount * 12;
      break;
    case 'quarterly':
      yearlyBaseAmount = cost.amount * 4;
      break;
    case 'yearly':
      yearlyBaseAmount = cost.amount;
      break;
    case 'one_time':
      // Einmalige Kosten nur im Jahr des Starts
      if (startD.getFullYear() === year) {
        return cost.amount;
      }
      return 0;
  }

  // Anteilige Berechnung bei unterjährigem Start/Ende
  const daysInYear = isLeapYear(year) ? 366 : 365;
  return (yearlyBaseAmount * overlapDaysD) / daysInYear;
}

/**
 * Aggregiert IT-Kosten nach Kategorie für ein Jahr
 */
export function getITCostsByCategoryD(
  costs: ITCost[],
  year: number,
  today: Date = new Date()
): ITCostsByCategory {
  const result: ITCostsByCategory = {
    hardware: 0,
    software_licenses: 0,
    maintenance_service: 0,
    training: 0,
    other: 0,
    total: 0,
  };

  costs.forEach((cost) => {
    const yearlyCost = calculateYearlyCostD(cost, year, today);
    result[cost.category] += yearlyCost;
    result.total += yearlyCost;
  });

  return result;
}

/**
 * Aggregiert IT-Kosten nach Dienstleister für ein Jahr
 */
export function getITCostsByProviderD(
  costs: ITCost[],
  year: number,
  today: Date = new Date()
): ITCostsByProvider[] {
  const providerMap = new Map<string, number>();

  costs.forEach((cost) => {
    const yearlyCost = calculateYearlyCostD(cost, year, today);
    if (yearlyCost > 0) {
      const current = providerMap.get(cost.provider) || 0;
      providerMap.set(cost.provider, current + yearlyCost);
    }
  });

  return Array.from(providerMap.entries())
    .map(([provider, total]) => ({ provider, total }))
    .sort((a, b) => b.total - a.total); // Sortiert nach Höhe absteigend
}

/**
 * Hilfsfunktion: Prüft ob Jahr ein Schaltjahr ist
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
```

**Hinweis**: Die Funktionen `parseDate`, `daysBetween` existieren bereits in `lib.ts` und können wiederverwendet werden.

---

## 3. CSV-Parser erweitern

### 3.1 Neue Parser-Funktionen in `src/lib/csv.ts`

**Am Ende der Datei hinzufügen:**

```typescript
/**
 * Parst CSV-Daten zu ITCost-Array
 * Erwartet Spalten: id;description;category;provider;amount;frequency;startDate;endDate;costCenter;notes;year
 */
export function parseITCostsCSV(csv: string): ITCost[] {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return [];

  // BOM entfernen falls vorhanden
  const firstLine = lines[0].replace(/^\uFEFF/, '');

  // Delimiter erkennen (Semikolon oder Komma)
  const delimiter = detectDelimiter(firstLine);

  const headers = parseCsvLine(firstLine, delimiter);
  const rows = lines.slice(1);

  return rows
    .map((line, idx) => {
      const values = parseCsvLine(line, delimiter);
      if (values.length !== headers.length) {
        console.warn(`Row ${idx + 2} has ${values.length} columns, expected ${headers.length}`);
        return null;
      }

      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });

      // Pflichtfelder prüfen
      if (!row.id || !row.description || !row.category || !row.provider || !row.amount || !row.frequency || !row.startDate || !row.year) {
        console.warn(`Row ${idx + 2} missing required fields`);
        return null;
      }

      // Category validieren
      const validCategories: ITCostCategory[] = ['hardware', 'software_licenses', 'maintenance_service', 'training', 'other'];
      const category = row.category as ITCostCategory;
      if (!validCategories.includes(category)) {
        console.warn(`Row ${idx + 2} has invalid category: ${row.category}`);
        return null;
      }

      // Frequency validieren
      const validFrequencies: ITCostFrequency[] = ['monthly', 'quarterly', 'yearly', 'one_time'];
      const frequency = row.frequency as ITCostFrequency;
      if (!validFrequencies.includes(frequency)) {
        console.warn(`Row ${idx + 2} has invalid frequency: ${row.frequency}`);
        return null;
      }

      // Datum normalisieren (DD.MM.YYYY → YYYY-MM-DD)
      const startDate = normalizeDateString(row.startDate);
      const endDate = row.endDate ? normalizeDateString(row.endDate) : '';

      return {
        id: row.id,
        description: row.description,
        category,
        provider: row.provider,
        amount: parseGermanNumber(row.amount),
        frequency,
        startDate,
        endDate,
        costCenter: row.costCenter || '',
        notes: row.notes || '',
        year: parseInt(row.year, 10),
      } as ITCost;
    })
    .filter((p): p is ITCost => p !== null);
}

/**
 * Serialisiert ITCost-Array zu CSV
 */
export function serializeITCostsCSV(costs: ITCost[]): string {
  const headers = [
    'id',
    'description',
    'category',
    'provider',
    'amount',
    'frequency',
    'startDate',
    'endDate',
    'costCenter',
    'notes',
    'year',
  ];

  const rows = costs.map((c) => [
    c.id,
    c.description,
    c.category,
    c.provider,
    c.amount.toFixed(2),
    c.frequency,
    c.startDate,
    c.endDate || '',
    c.costCenter || '',
    c.notes || '',
    c.year.toString(),
  ]);

  return serializeCSV(headers, rows);
}
```

**Hinweis**: Die Hilfsfunktionen `detectDelimiter`, `parseCsvLine`, `parseGermanNumber`, `normalizeDateString`, `serializeCSV` existieren bereits in `csv.ts`.

---

## 4. Admin-Portal erstellen

### 4.1 Neue Datei: `src/pages/ITCostsAdmin.tsx`

**Vollständige Komponente (ca. 350 Zeilen):**

```typescript
import { useEffect, useState, useMemo } from 'react';
import { parseITCostsCSV, serializeITCostsCSV } from '../lib/csv';
import { ITCost, ITCostCategory, ITCostFrequency, YearBudget } from '../types';
import { calculateYearlyCostD, getITCostsByCategoryD } from '../lib';

const DEMO_IT_COSTS: ITCost[] = [
  {
    id: '1',
    description: 'Microsoft 365 Business Standard (50 Lizenzen)',
    category: 'software_licenses',
    provider: 'Microsoft',
    amount: 625, // 12.50 × 50
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

  // Projektbudgets Summe (aus localStorage)
  const projectBudgetsTotal = useMemo(() => {
    const stored = localStorage.getItem('projects_json');
    if (!stored) return 0;
    try {
      const projects = JSON.parse(stored);
      // Hier müsste die anteilige Berechnung implementiert werden
      // Vereinfacht: Summe aller budgetPlanned
      return projects.reduce((sum: number, p: any) => sum + (p.budgetPlanned || 0), 0);
    } catch (e) {
      return 0;
    }
  }, []);

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
                <th className="border-b p-3 text-left font-medium">Start</th>
                <th className="border-b p-3 text-left font-medium">Ende</th>
                <th className="border-b p-3 text-left font-medium">Kostenstelle</th>
                <th className="border-b p-3 text-left font-medium">Notizen</th>
                <th className="border-b p-3 text-left font-medium">Jahreskosten</th>
                <th className="border-b p-3 text-center font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-gray-500">
                    Keine IT-Kosten für {selectedYear}. Klicke auf "+ Neue Position" zum Hinzufügen.
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
                            type="date"
                            value={cost.startDate}
                            onChange={(e) => handleUpdate(cost.id, 'startDate', e.target.value)}
                            className="w-32 rounded border px-2 py-1"
                          />
                        ) : (
                          cost.startDate
                        )}
                      </td>
                      <td className="border-b p-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={cost.endDate}
                            onChange={(e) => handleUpdate(cost.id, 'endDate', e.target.value)}
                            className="w-32 rounded border px-2 py-1"
                          />
                        ) : (
                          cost.endDate || '-'
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
            <strong>Hinweis:</strong> "Jahreskosten" werden automatisch aus Frequenz und
            Vertragslaufzeit berechnet (anteilig bei unterjährigen Verträgen).
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Dashboard-Integration: Budget-Kachel erweitern

### 5.1 `BudgetDonut.tsx` anpassen

**Änderungen:**

1. **Props erweitern:**
```typescript
interface BudgetDonutProps {
  projects: NormalizedProject[];
  yearBudget?: YearBudget;       // Jahresbudget (optional)
  itCostsTotal?: number;          // IT-Kosten Summe (optional)
}
```

2. **Berechnungslogik anpassen:**
```typescript
// Bisherige Logik
const spent = projects.reduce((sum, p) => sum + (p.costToDate || 0), 0);
const planned = projects.reduce((sum, p) => sum + (p.budgetPlanned || 0), 0);

// Neue Logik mit IT-Kosten
const itCosts = props.itCostsTotal || 0;
const total = props.yearBudget?.budget || planned;
const remaining = total - spent - itCosts;

// Daten für Chart
const data = [
  { name: 'IT-Kosten (fix)', value: itCosts, color: '#6b7280' },        // Grau
  { name: 'Projekte ausgegeben', value: spent, color: '#3b82f6' },      // Blau
  { name: 'Verbleibend', value: Math.max(0, remaining), color: '#...' }, // Grün/Gelb/Rot
];

// Wenn Überschreitung: zusätzliches Segment
if (remaining < 0) {
  data.push({
    name: 'Überschreitung',
    value: Math.abs(remaining),
    color: '#7f1d1d', // Dunkelrot
  });
}
```

3. **Card-Titel anpassen:**
```typescript
<h3 className="text-lg font-semibold text-gray-900">
  {props.yearBudget
    ? `Budget ${props.yearBudget.year}: ${props.yearBudget.budget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`
    : `Budgetübersicht (Σ ${planned.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`}
</h3>
```

4. **Info-Zeile erweitern:**
```typescript
<div className="mt-2 text-xs text-gray-600">
  {itCosts > 0 && (
    <div>
      IT-Kosten (fix): {itCosts.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} (
      {((itCosts / total) * 100).toFixed(1)}%)
    </div>
  )}
  <div>
    Projektbudgets geplant:{' '}
    {planned.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
  </div>
  {remaining < 0 && (
    <div className="mt-2 rounded bg-red-100 p-2 text-red-800">
      <strong>⚠️ Budget überschritten um{' '}
      {Math.abs(remaining).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
    </div>
  )}
</div>
```

---

## 6. Dashboard: IT-Kosten-Tabelle hinzufügen

### 6.1 Neue Komponente: `src/components/ITCostsTable.tsx`

**Vollständige Komponente (ca. 200 Zeilen):**

```typescript
import { useMemo, useState } from 'react';
import { ITCost, ITCostCategory, ITCostFrequency } from '../types';
import { calculateYearlyCostD } from '../lib';
import { Badge } from '../ui';

interface ITCostsTableProps {
  costs: ITCost[];
  year: number;
}

export default function ITCostsTable({ costs, year }: ITCostsTableProps) {
  const [filterCategory, setFilterCategory] = useState<ITCostCategory | 'all'>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterFrequency, setFilterFrequency] = useState<ITCostFrequency | 'all'>('all');

  // Nach Jahr filtern
  const yearCosts = useMemo(() => costs.filter((c) => c.year === year), [costs, year]);

  // Filter anwenden
  const filteredCosts = useMemo(() => {
    return yearCosts.filter((c) => {
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (filterProvider !== 'all' && c.provider !== filterProvider) return false;
      if (filterFrequency !== 'all' && c.frequency !== filterFrequency) return false;
      return true;
    });
  }, [yearCosts, filterCategory, filterProvider, filterFrequency]);

  // Unique Provider
  const providers = useMemo(() => {
    return Array.from(new Set(yearCosts.map((c) => c.provider))).sort();
  }, [yearCosts]);

  // Summe
  const total = useMemo(() => {
    return filteredCosts.reduce((sum, c) => sum + calculateYearlyCostD(c, year), 0);
  }, [filteredCosts, year]);

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

  const categoryColors: Record<ITCostCategory, 'green' | 'amber' | 'slate' | 'blue' | 'purple' | 'cyan'> = {
    hardware: 'slate',
    software_licenses: 'blue',
    maintenance_service: 'purple',
    training: 'green',
    other: 'amber',
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Laufende IT-Kosten {year}
      </h2>

      {/* Filter */}
      <div className="mb-4 flex gap-4">
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">Kategorie:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ITCostCategory | 'all')}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">Dienstleister:</label>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">Frequenz:</label>
          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value as ITCostFrequency | 'all')}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="all">Alle</option>
            {Object.entries(frequencyLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm font-medium text-gray-900">
          Gesamt (gefiltert):{' '}
          {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      {/* Tabelle */}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              <th className="border-b p-2 text-left font-medium">Beschreibung</th>
              <th className="border-b p-2 text-left font-medium">Kategorie</th>
              <th className="border-b p-2 text-left font-medium">Dienstleister</th>
              <th className="border-b p-2 text-left font-medium">Frequenz</th>
              <th className="border-b p-2 text-right font-medium">Betrag (€)</th>
              <th className="border-b p-2 text-right font-medium">Jahreskosten (€)</th>
            </tr>
          </thead>
          <tbody>
            {filteredCosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Keine passenden IT-Kosten gefunden.
                </td>
              </tr>
            ) : (
              filteredCosts.map((cost) => {
                const yearlyCost = calculateYearlyCostD(cost, year);
                return (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="border-b p-2">{cost.description}</td>
                    <td className="border-b p-2">
                      <Badge color={categoryColors[cost.category]}>
                        {categoryLabels[cost.category]}
                      </Badge>
                    </td>
                    <td className="border-b p-2">{cost.provider}</td>
                    <td className="border-b p-2">
                      <span className="text-xs text-gray-600">
                        {frequencyLabels[cost.frequency]}
                      </span>
                    </td>
                    <td className="border-b p-2 text-right">
                      {cost.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border-b p-2 text-right font-medium">
                      {yearlyCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 7. Navigation & Routing anpassen

### 7.1 Header-Navigation erweitern (`src/App.tsx`)

**Im Header (Zeile ~40):**

```typescript
<header className="bg-white shadow-sm">
  <div className="mx-auto flex h-20 max-w-[1800px] items-center justify-between px-6">
    <h1 className="text-2xl font-bold text-gray-900">IT Portfolio Dashboard</h1>
    <div className="flex gap-4">
      <a
        href="/admin"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Projekte verwalten
      </a>
      <a
        href="/admin/it-costs"
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
      >
        IT-Kosten verwalten
      </a>
    </div>
  </div>
</header>
```

### 7.2 Routing in `src/main.tsx` erweitern

**Neue Route hinzufügen:**

```typescript
import ITCostsAdmin from './pages/ITCostsAdmin';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/admin',
    element: <ProjectsAdmin />,
  },
  {
    path: '/admin/it-costs',
    element: <ITCostsAdmin />,
  },
]);
```

---

## 8. Dashboard: IT-Kosten laden & integrieren

### 8.1 `src/App.tsx` erweitern

**IT-Kosten State hinzufügen (nach Zeile ~50):**

```typescript
const [itCosts, setITCosts] = useState<ITCost[]>([]);

useEffect(() => {
  const stored = localStorage.getItem('itCosts');
  if (stored) {
    try {
      setITCosts(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to parse itCosts:', e);
    }
  }
}, []);
```

**IT-Kosten für aktuelles Jahr berechnen:**

```typescript
const itCostsTotal = useMemo(() => {
  return getITCostsByCategoryD(itCosts, selectedYear, today).total;
}, [itCosts, selectedYear, today]);
```

**BudgetDonut Props erweitern (Zeile ~120):**

```typescript
<Suspense fallback={<div className="h-[280px]" />}>
  <BudgetDonut
    projects={filteredProjects}
    yearBudget={yearBudget}
    itCostsTotal={itCostsTotal}
  />
</Suspense>
```

**IT-Kosten-Tabelle hinzufügen (nach Timeline, Zeile ~200):**

```typescript
{/* IT-Kosten Tabelle */}
<div className="mt-6">
  <ITCostsTable costs={itCosts} year={selectedYear} />
</div>
```

**Budget-Warnung hinzufügen (nach FiltersPanel, Zeile ~100):**

```typescript
{/* Budget-Warnung */}
{yearBudget && itCostsTotal + projectBudgetsSum > yearBudget.budget && (
  <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
    <strong>⚠️ Warnung:</strong> IT-Kosten (
    {itCostsTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}) +
    Projektbudgets (
    {projectBudgetsSum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
    übersteigen Jahresbudget (
    {yearBudget.budget.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})
  </div>
)}
```

---

## 9. Tests schreiben

### 9.1 Unit-Tests für Berechnungslogik (`src/lib.test.ts`)

**Am Ende hinzufügen:**

```typescript
describe('IT-Kosten Berechnungen', () => {
  const testCost: ITCost = {
    id: '1',
    description: 'Test',
    category: 'software_licenses',
    provider: 'Test Provider',
    amount: 100,
    frequency: 'monthly',
    startDate: '2025-01-01',
    endDate: '',
    costCenter: '',
    notes: '',
    year: 2025,
  };

  describe('calculateYearlyCostD', () => {
    it('berechnet monatliche Kosten korrekt (× 12)', () => {
      const cost = { ...testCost, frequency: 'monthly' as ITCostFrequency, amount: 100 };
      expect(calculateYearlyCostD(cost, 2025)).toBe(1200);
    });

    it('berechnet vierteljährliche Kosten korrekt (× 4)', () => {
      const cost = { ...testCost, frequency: 'quarterly' as ITCostFrequency, amount: 500 };
      expect(calculateYearlyCostD(cost, 2025)).toBe(2000);
    });

    it('berechnet jährliche Kosten korrekt (× 1)', () => {
      const cost = { ...testCost, frequency: 'yearly' as ITCostFrequency, amount: 5000 };
      expect(calculateYearlyCostD(cost, 2025)).toBe(5000);
    });

    it('berechnet einmalige Kosten nur im Startjahr', () => {
      const cost = {
        ...testCost,
        frequency: 'one_time' as ITCostFrequency,
        amount: 10000,
        startDate: '2025-06-01',
      };
      expect(calculateYearlyCostD(cost, 2025)).toBe(10000);
      expect(calculateYearlyCostD(cost, 2026)).toBe(0);
    });

    it('berechnet anteilig bei unterjährigem Start', () => {
      const cost = {
        ...testCost,
        frequency: 'monthly' as ITCostFrequency,
        amount: 100,
        startDate: '2025-07-01', // Halbes Jahr
      };
      const result = calculateYearlyCostD(cost, 2025);
      expect(result).toBeCloseTo(600, 0); // 6 Monate
    });

    it('berechnet anteilig bei unterjährigem Ende', () => {
      const cost = {
        ...testCost,
        frequency: 'monthly' as ITCostFrequency,
        amount: 100,
        startDate: '2025-01-01',
        endDate: '2025-06-30', // Halbes Jahr
      };
      const result = calculateYearlyCostD(cost, 2025);
      expect(result).toBeCloseTo(600, 0); // 6 Monate
    });

    it('gibt 0 zurück wenn Vertrag außerhalb des Jahres liegt', () => {
      const cost = {
        ...testCost,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };
      expect(calculateYearlyCostD(cost, 2025)).toBe(0);
    });
  });

  describe('getITCostsByCategoryD', () => {
    it('aggregiert Kosten nach Kategorie', () => {
      const costs: ITCost[] = [
        { ...testCost, id: '1', category: 'hardware', amount: 1000, frequency: 'yearly' },
        { ...testCost, id: '2', category: 'software_licenses', amount: 500, frequency: 'yearly' },
        { ...testCost, id: '3', category: 'software_licenses', amount: 300, frequency: 'yearly' },
      ];

      const result = getITCostsByCategoryD(costs, 2025);
      expect(result.hardware).toBe(1000);
      expect(result.software_licenses).toBe(800);
      expect(result.total).toBe(1800);
    });
  });

  describe('getITCostsByProviderD', () => {
    it('aggregiert Kosten nach Dienstleister', () => {
      const costs: ITCost[] = [
        { ...testCost, id: '1', provider: 'Microsoft', amount: 500, frequency: 'yearly' },
        { ...testCost, id: '2', provider: 'Microsoft', amount: 300, frequency: 'yearly' },
        { ...testCost, id: '3', provider: 'Adobe', amount: 200, frequency: 'yearly' },
      ];

      const result = getITCostsByProviderD(costs, 2025);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ provider: 'Microsoft', total: 800 });
      expect(result[1]).toEqual({ provider: 'Adobe', total: 200 });
    });

    it('sortiert nach Höhe absteigend', () => {
      const costs: ITCost[] = [
        { ...testCost, id: '1', provider: 'A', amount: 100, frequency: 'yearly' },
        { ...testCost, id: '2', provider: 'B', amount: 500, frequency: 'yearly' },
        { ...testCost, id: '3', provider: 'C', amount: 300, frequency: 'yearly' },
      ];

      const result = getITCostsByProviderD(costs, 2025);
      expect(result[0].provider).toBe('B');
      expect(result[1].provider).toBe('C');
      expect(result[2].provider).toBe('A');
    });
  });
});
```

### 9.2 CSV-Parser-Tests (`src/lib/csv.test.ts`)

**Am Ende hinzufügen:**

```typescript
describe('IT-Kosten CSV Parser', () => {
  describe('parseITCostsCSV', () => {
    it('parst gültiges CSV', () => {
      const csv = `id;description;category;provider;amount;frequency;startDate;endDate;costCenter;notes;year
1;MS 365;software_licenses;Microsoft;500.50;monthly;2025-01-01;;IT;Test;2025`;

      const result = parseITCostsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        description: 'MS 365',
        category: 'software_licenses',
        provider: 'Microsoft',
        amount: 500.5,
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '',
        costCenter: 'IT',
        notes: 'Test',
        year: 2025,
      });
    });

    it('parst deutsche Zahlenformate', () => {
      const csv = `id;description;category;provider;amount;frequency;startDate;endDate;costCenter;notes;year
1;Test;hardware;Dell;1.234,56;yearly;2025-01-01;;IT;;2025`;

      const result = parseITCostsCSV(csv);
      expect(result[0].amount).toBe(1234.56);
    });

    it('verwirft Zeilen mit ungültiger Kategorie', () => {
      const csv = `id;description;category;provider;amount;frequency;startDate;endDate;costCenter;notes;year
1;Test;invalid_category;Dell;100;yearly;2025-01-01;;IT;;2025`;

      const result = parseITCostsCSV(csv);
      expect(result).toHaveLength(0);
    });

    it('verwirft Zeilen mit ungültiger Frequenz', () => {
      const csv = `id;description;category;provider;amount;frequency;startDate;endDate;costCenter;notes;year
1;Test;hardware;Dell;100;invalid_freq;2025-01-01;;IT;;2025`;

      const result = parseITCostsCSV(csv);
      expect(result).toHaveLength(0);
    });
  });

  describe('serializeITCostsCSV', () => {
    it('serialisiert ITCost-Array zu CSV', () => {
      const costs: ITCost[] = [
        {
          id: '1',
          description: 'MS 365',
          category: 'software_licenses',
          provider: 'Microsoft',
          amount: 500.5,
          frequency: 'monthly',
          startDate: '2025-01-01',
          endDate: '',
          costCenter: 'IT',
          notes: 'Test',
          year: 2025,
        },
      ];

      const csv = serializeITCostsCSV(costs);
      expect(csv).toContain('id;description;category');
      expect(csv).toContain('1;MS 365;software_licenses');
      expect(csv).toContain('500.50');
    });
  });
});
```

### 9.3 BudgetDonut-Tests erweitern (`src/components/BudgetDonut.test.tsx`)

**Neue Tests hinzufügen:**

```typescript
describe('BudgetDonut mit IT-Kosten', () => {
  it('zeigt IT-Kosten als separates Segment', () => {
    const projects: NormalizedProject[] = [
      { ...baseProject, costToDate: 5000, budgetPlanned: 10000 },
    ];

    render(
      <BudgetDonut
        projects={projects}
        yearBudget={{ year: 2025, budget: 20000 }}
        itCostsTotal={8000}
      />
    );

    expect(screen.getByText(/IT-Kosten \(fix\)/i)).toBeInTheDocument();
    expect(screen.getByText(/8.000,00/)).toBeInTheDocument();
  });

  it('berechnet verbleibendes Budget korrekt (Jahresbudget - IT - Projekte)', () => {
    const projects: NormalizedProject[] = [
      { ...baseProject, costToDate: 5000, budgetPlanned: 10000 },
    ];

    render(
      <BudgetDonut
        projects={projects}
        yearBudget={{ year: 2025, budget: 20000 }}
        itCostsTotal={8000}
      />
    );

    // Verbleibend = 20000 - 8000 - 5000 = 7000
    expect(screen.getByText(/7.000,00/)).toBeInTheDocument();
  });

  it('zeigt Warnung bei Budgetüberschreitung (IT + Projekte > Jahresbudget)', () => {
    const projects: NormalizedProject[] = [
      { ...baseProject, costToDate: 15000, budgetPlanned: 20000 },
    ];

    render(
      <BudgetDonut
        projects={projects}
        yearBudget={{ year: 2025, budget: 20000 }}
        itCostsTotal={12000}
      />
    );

    expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
  });
});
```

---

## 10. CLAUDE.md Dokumentation aktualisieren

### 10.1 Neue Sections hinzufügen

**Nach "Recent Changes & Evolution" einfügen:**

```markdown
### IT-Kostenplanung-Modul (2025-10-07) - v1.5.0

**Major Changes**:
1. **Laufende IT-Kosten verwalten**:
   - Neue Admin-Seite: `/admin/it-costs`
   - CRUD für IT-Kosten (Software, Hardware, Wartung, Schulung, Sonstiges)
   - Felder: Beschreibung, Kategorie, Dienstleister, Betrag, Frequenz (monatlich/vierteljährlich/jährlich/einmalig), Start/Ende, Kostenstelle, Notizen
   - CSV Import/Export (11 Spalten)
   - localStorage: `itCosts` (JSON Array)

2. **Dashboard-Integration**:
   - BudgetDonut erweitert: 3 Segmente (IT-Kosten grau, Projekte blau, Verbleibend grün/gelb/rot)
   - Neue IT-Kosten-Tabelle unterhalb Timeline
   - Filter: Jahr, Kategorie, Dienstleister, Frequenz
   - Warnung bei Budgetüberschreitung (IT + Projekte > Jahresbudget)

3. **Berechnungslogik**:
   - Anteilige Jahreskosten bei unterjährigen Verträgen
   - Frequenz-Hochrechnung (monatlich × 12, vierteljährlich × 4, etc.)
   - Aggregation nach Kategorie und Dienstleister

4. **Demo-Daten**: 12 realistische IT-Kosten (Microsoft 365, Adobe CC, Server-Wartung, etc.)

5. **Navigation**: Neuer Header-Link "IT-Kosten verwalten" (purple Button)

**Technisch**:
- Neue Types: `ITCost`, `ITCostCategory`, `ITCostFrequency`, `ITCostsByCategory`, `ITCostsByProvider`
- Neue Funktionen: `calculateYearlyCostD`, `getITCostsByCategoryD`, `getITCostsByProviderD`
- CSV-Parser erweitert: `parseITCostsCSV`, `serializeITCostsCSV`
- Neue Komponenten: `ITCostsAdmin.tsx` (350 Zeilen), `ITCostsTable.tsx` (200 Zeilen)
- BudgetDonut: +40 Zeilen (3-Segment-Logik)
- Tests: +80 Zeilen (calculateYearlyCostD, CSV, BudgetDonut)

**Files Modified**: 8 files (+800 lines, -20 lines)

**Breaking Changes**: Keine (rückwärtskompatibel)
```

**Architecture-Section erweitern:**

```markdown
### Core Modules (Ergänzung)
- **`src/lib.ts`**: IT-Kosten-Berechnungen (`calculateYearlyCostD`, `getITCostsByCategoryD`, `getITCostsByProviderD`)
- **`src/lib/csv.ts`**: IT-Kosten CSV Parser (`parseITCostsCSV`, `serializeITCostsCSV`)

### Pages (Ergänzung)
- **`src/pages/ITCostsAdmin.tsx`**: Admin-Portal für IT-Kosten (CRUD, Import/Export, Jahresfilter)

### Components (Ergänzung)
- **`src/components/ITCostsTable.tsx`**: Filterable IT-Kosten-Tabelle (Dashboard)
- **`src/components/BudgetDonut.tsx`**: Erweitert um IT-Kosten-Segment (3-Segment-Logik)
```

**Data Persistence (Ergänzung):**

```markdown
- Admin saves to `localStorage.itCosts` (JSON array of ITCost)
- IT-Kosten: Separate localStorage-Key für laufende Kosten-Verwaltung
```

---

## 11. Vercel Deployment (keine Änderung nötig)

Die bestehende `vercel.json` deckt bereits alle SPA-Routes ab:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Route `/admin/it-costs` wird automatisch auf `/index.html` umgeleitet.

---

## 12. Implementierungs-Checkliste

### Phase 1: Datenmodell & Logik
- [ ] `src/types.ts` erweitern (ITCost, ITCostCategory, ITCostFrequency, etc.)
- [ ] `src/lib.ts` erweitern (calculateYearlyCostD, getITCostsByCategoryD, getITCostsByProviderD, isLeapYear)
- [ ] `src/lib/csv.ts` erweitern (parseITCostsCSV, serializeITCostsCSV)
- [ ] Tests schreiben (`lib.test.ts`, `csv.test.ts`)
- [ ] `npm run test` → Alle Tests grün

### Phase 2: Admin-Portal
- [ ] `src/pages/ITCostsAdmin.tsx` erstellen (CRUD, Import/Export, Demo-Daten)
- [ ] `src/main.tsx` erweitern (Route `/admin/it-costs`)
- [ ] Header-Navigation in `App.tsx` erweitern (Purple Button "IT-Kosten verwalten")
- [ ] `npm run dev` → Admin manuell testen

### Phase 3: Dashboard-Integration
- [ ] `src/components/BudgetDonut.tsx` anpassen (3-Segment-Logik, Props erweitern)
- [ ] `src/components/ITCostsTable.tsx` erstellen (Filter, Tabelle)
- [ ] `src/App.tsx` erweitern (IT-Kosten laden, BudgetDonut Props, IT-Kosten-Tabelle, Budget-Warnung)
- [ ] Tests erweitern (`BudgetDonut.test.tsx`)
- [ ] `npm run dev` → Dashboard visuell prüfen

### Phase 4: Qualitätssicherung
- [ ] `npm run typecheck` → Keine TypeScript-Fehler
- [ ] `npm run lint` → Keine ESLint-Fehler
- [ ] `npm run test` → Alle Tests grün
- [ ] `npm run build` → Production Build erfolgreich
- [ ] Manuelle Tests:
  - [ ] Admin: IT-Kosten hinzufügen/bearbeiten/löschen
  - [ ] Admin: CSV Import/Export
  - [ ] Admin: Jahreswechsel (2024 → 2025 → 2026)
  - [ ] Dashboard: BudgetDonut zeigt 3 Segmente
  - [ ] Dashboard: IT-Kosten-Tabelle mit Filtern
  - [ ] Dashboard: Budget-Warnung bei Überplanung
  - [ ] Anteilige Berechnung: Vertrag ab Juli → halbe Jahreskosten

### Phase 5: Dokumentation & Deployment
- [ ] `CLAUDE.md` aktualisieren (neue Section v1.5.0)
- [ ] `README.md` aktualisieren (optional: IT-Kosten-Modul erwähnen)
- [ ] Git Commit: `feat: IT-Kostenplanung-Modul (v1.5.0)`
- [ ] `npm run build && npm run preview` → Lokaler Production-Test
- [ ] Vercel Deployment (automatisch via Git Push)

---

## 13. Erwartete Ergebnisse

### Admin-Portal
- Neue Route `/admin/it-costs` mit vollständiger CRUD-Tabelle
- CSV Import/Export funktional
- Jahresauswahl funktioniert (2020-2030)
- Warnung bei Budgetüberschreitung sichtbar

### Dashboard
- BudgetDonut zeigt 3 Segmente (Grau: IT-Kosten, Blau: Projekte, Grün/Gelb/Rot: Verbleibend)
- Card-Titel: "Budget 2025: €500.000" statt nur Projektsumme
- Info-Zeile: "IT-Kosten (fix): €180.000 (36%) | Projektbudgets: €308.000"
- IT-Kosten-Tabelle unterhalb Timeline mit Filtern
- Budget-Warnung oberhalb KPIs bei Überplanung

### Testabdeckung
- **+15 Tests** (calculateYearlyCostD: 7, Aggregation: 3, CSV: 3, BudgetDonut: 3)
- **Gesamt**: 64 Tests (vorher 49)

---

## 14. Optional: Zukünftige Erweiterungen

### Phase 6 (optional):
- **Dashboard-Kachel "Top 5 Dienstleister"**: Balkendiagramm mit größten Kostenfaktoren
- **Kategorien-Donut**: Separate Kachel für IT-Kosten nach Kategorie (Hardware/Software/etc.)
- **Multi-Jahr-Vergleich**: Chart mit IT-Kosten-Entwicklung 2023-2025
- **Export-Funktionen**: PDF-Report mit IT-Kosten + Projekte
- **Vertragslaufzeit-Warnungen**: "Vertrag XYZ läuft in 30 Tagen ab"
- **Dienstleister-Analyse**: Separates Modul mit Vertragsdatenbank

---

## 15. Kontaktpunkte mit bestehendem Code

### Zu ändernde Dateien:
1. `src/types.ts` (+40 Zeilen)
2. `src/lib.ts` (+80 Zeilen)
3. `src/lib/csv.ts` (+100 Zeilen)
4. `src/pages/ITCostsAdmin.tsx` (NEU, +350 Zeilen)
5. `src/components/ITCostsTable.tsx` (NEU, +200 Zeilen)
6. `src/components/BudgetDonut.tsx` (+40 Zeilen Änderungen)
7. `src/App.tsx` (+60 Zeilen)
8. `src/main.tsx` (+5 Zeilen)
9. `src/lib.test.ts` (+50 Zeilen)
10. `src/lib/csv.test.ts` (+30 Zeilen)
11. `src/components/BudgetDonut.test.tsx` (+20 Zeilen)
12. `CLAUDE.md` (+80 Zeilen)

**Gesamt**: 12 Dateien, +1055 Zeilen, -20 Zeilen (minimale Refactorings)

### Keine Änderungen in:
- `ProjectsTable.tsx`, `Timeline.tsx`, `ProgressDelta.tsx`, `ProjectDelays.tsx` (bleiben unverändert)
- `ui.tsx`, `TrafficLight.tsx` (keine neuen UI-Primitives nötig)
- `vercel.json` (SPA-Rewrites decken neue Route ab)

---

## 16. Technische Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| localStorage-Limit (5-10 MB) bei vielen IT-Kosten | Niedrig | Mittel | Warnung bei >1000 Einträgen, Archivierungs-Feature |
| Performance bei 500+ IT-Kosten in Tabelle | Niedrig | Niedrig | Virtualisierte Tabelle (react-window) falls nötig |
| Anteilige Berechnung bei Schaltjahren inkorrekt | Mittel | Niedrig | Tests für Schaltjahre (2024, 2028), isLeapYear-Funktion |
| CSV-Import überschreibt bestehende Daten | Mittel | Hoch | Bestätigungsdialog mit Preview vor Import |
| BudgetDonut zu komplex (3 Segmente + Überschreitung) | Niedrig | Niedrig | Tests für Edge Cases, visuelle QA |

---

## 17. Zeitschätzung

**Entwicklungszeit** (für erfahrenen React/TypeScript-Entwickler):
- Phase 1 (Datenmodell & Logik): 2-3 Stunden
- Phase 2 (Admin-Portal): 4-5 Stunden
- Phase 3 (Dashboard-Integration): 3-4 Stunden
- Phase 4 (QA & Testing): 2-3 Stunden
- Phase 5 (Dokumentation): 1 Stunde

**Gesamt**: 12-16 Stunden (verteilt auf 2-3 Arbeitstage)

---

## 18. Abschluss & Validierung

Nach Abschluss der Implementierung sollten folgende Akzeptanzkriterien erfüllt sein:

### Funktional:
- [x] IT-Kosten können im Admin-Portal verwaltet werden (CRUD)
- [x] CSV Import/Export funktioniert für IT-Kosten
- [x] Dashboard zeigt IT-Kosten in BudgetDonut (3 Segmente)
- [x] IT-Kosten-Tabelle mit Filtern funktioniert
- [x] Anteilige Berechnung bei unterjährigen Verträgen korrekt
- [x] Budget-Warnung bei Überplanung sichtbar

### Technisch:
- [x] TypeScript kompiliert ohne Fehler
- [x] Alle Tests (64) grün
- [x] ESLint ohne Warnungen
- [x] Production Build erfolgreich (<500 KB Hauptbundle)
- [x] Vercel Deployment funktioniert

### UX:
- [x] Navigation intuitiv (Purple Button im Header)
- [x] Admin-Portal responsive (Desktop 1440px+)
- [x] Deutsche Labels konsistent
- [x] Frequenz-Badges farblich unterscheidbar
- [x] Keine Layout-Shifts beim Laden

---

**Viel Erfolg bei der Implementierung! 🚀**

Bei Fragen oder Unklarheiten: Siehe `CLAUDE.md` für Code-Konventionen und bestehende Patterns.
