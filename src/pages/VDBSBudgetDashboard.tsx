import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { VDBSBudgetItem, YearBudget } from '../types';
import { Card, Badge } from '../ui';
import { getCurrentYear } from '../lib';
import DashboardTabs from '../components/DashboardTabs';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const DEMO_VDBS_BUDGET: VDBSBudgetItem[] = [
  { id: 'vdbs-1', projectNumber: '101', projectName: 'Servicebudget Basis', category: 'RUN', budget2026: 16905, year: 2026 },
  { id: 'vdbs-2', projectNumber: '102', projectName: 'Servicebudget Individuell', category: 'RUN', budget2026: 19250, year: 2026 },
  { id: 'vdbs-3', projectNumber: '109', projectName: 'Weiterer Ausbau VDB Service in 2026', category: 'RUN', budget2026: 35750, year: 2026 },
  { id: 'vdbs-4', projectNumber: '121', projectName: 'IT Fachbeirat Aufwandsentschädigung', category: 'RUN', budget2026: 5506.2, year: 2026 },
  { id: 'vdbs-5', projectNumber: '103', projectName: 'Gewinnzuschlag VDB Service 2026', category: 'RUN', budget2026: 1690.5, year: 2026 },
  { id: 'vdbs-6', projectNumber: '106', projectName: 'AK Gesamtbanksteuerung', category: 'RUN', budget2026: 5174, year: 2026 },
  { id: 'vdbs-7', projectNumber: '107', projectName: 'Sammel AK Meldewesen,Recht,Datenschutz,Nachhaltigkeit, Auslagerung', category: 'RUN', budget2026: 3980, year: 2026 },
  { id: 'vdbs-8', projectNumber: '108', projectName: 'AK Marketing', category: 'RUN', budget2026: 995, year: 2026 },
  { id: 'vdbs-9', projectNumber: '160', projectName: 'Laufender Betrieb PASS Lösung BB Sachsen', category: 'RUN', budget2026: 4190, year: 2026 },
  { id: 'vdbs-10', projectNumber: '200', projectName: 'AK-Rating', category: 'RUN', budget2026: 10819.17, year: 2026 },
  { id: 'vdbs-11', projectNumber: '201', projectName: 'AK-Rating - Fides', category: 'RUN', budget2026: 1578.91, year: 2026 },
  { id: 'vdbs-12', projectNumber: '120', projectName: 'IT Fachbeirat Lfd. Anpassungen', category: 'RUN', budget2026: 5263.02, year: 2026 },
  { id: 'vdbs-13', projectNumber: '191', projectName: 'Modernisierung Fides und Umsysteme', category: 'CHANGE', budget2026: 5263.02, year: 2026 },
  { id: 'vdbs-14', projectNumber: '130', projectName: 'DaPo Bürgschaftsbanken-lfd Betrieb', category: 'RUN', budget2026: 1323.77, year: 2026 },
  { id: 'vdbs-15', projectNumber: '135', projectName: 'DaPo Bürgschaftsbanken Veränderung', category: 'RUN', budget2026: 2206.28, year: 2026 },
  { id: 'vdbs-16', projectNumber: '170', projectName: 'Bereitstellung WM Daten für Meldewesen', category: 'RUN', budget2026: 7859.5, year: 2026 },
  { id: 'vdbs-17', projectNumber: '173', projectName: 'Bereitstellung Brancheninformationen des Sparkassenverlag', category: 'RUN', budget2026: 1963.9, year: 2026 },
  { id: 'vdbs-18', projectNumber: '180', projectName: 'Laufender Betrieb OKP Schnittstellen mit', category: 'RUN', budget2026: 1974.92, year: 2026 },
  { id: 'vdbs-19', projectNumber: '181', projectName: 'Finanzierungsportal laufender Betrieb', category: 'RUN', budget2026: 8074, year: 2026 },
  { id: 'vdbs-20', projectNumber: '185', projectName: 'Finanzierungsportal Operations', category: 'RUN', budget2026: 1101, year: 2026 },
  { id: 'vdbs-21', projectNumber: '186', projectName: 'Sicherstellung regulatorische', category: 'RUN', budget2026: 1101, year: 2026 },
  { id: 'vdbs-22', projectNumber: '182', projectName: 'Betrieb FI Schnittstelle', category: 'RUN', budget2026: 2776.74, year: 2026 },
  { id: 'vdbs-23', projectNumber: '301', projectName: 'Anbindung an Sparkassen', category: 'CHANGE', budget2026: 5553.47, year: 2026 },
  { id: 'vdbs-24', projectNumber: '302', projectName: 'Anbindung VoBa', category: 'CHANGE', budget2026: 5808.59, year: 2026 },
  { id: 'vdbs-25', projectNumber: '194', projectName: 'Ausbau Portal Anbindung an die Hausbanken', category: 'CHANGE', budget2026: 3770.96, year: 2026 },
  { id: 'vdbs-26', projectNumber: '303', projectName: 'Formularmanagement', category: 'CHANGE', budget2026: 7960, year: 2026 },
  { id: 'vdbs-27', projectNumber: '304', projectName: 'Evaluierung BB goes Cloud', category: 'CHANGE', budget2026: 1990, year: 2026 },
  { id: 'vdbs-28', projectNumber: '305', projectName: 'Prozesslandkarte BB', category: 'CHANGE', budget2026: 7960, year: 2026 },
  { id: 'vdbs-29', projectNumber: '306', projectName: '(Re-) Design Kundenanwendungen', category: 'CHANGE', budget2026: 995, year: 2026 },
  { id: 'vdbs-30', projectNumber: '307', projectName: 'ISMS System', category: 'CHANGE', budget2026: 1990, year: 2026 },
  { id: 'vdbs-31', projectNumber: '308', projectName: 'Einführung DMS Lösungen', category: 'CHANGE', budget2026: 3980, year: 2026 },
  { id: 'vdbs-32', projectNumber: '309', projectName: 'KI Strategie', category: 'CHANGE', budget2026: 1990, year: 2026 },
  { id: 'vdbs-33', projectNumber: '310', projectName: 'Einführung KI Services', category: 'CHANGE', budget2026: 3980, year: 2026 },
  { id: 'vdbs-34', projectNumber: '311', projectName: 'Zentrale Compliance Funktionen', category: 'CHANGE', budget2026: 1990, year: 2026 },
  { id: 'vdbs-35', projectNumber: '312', projectName: 'Serviceportal NEU', category: 'CHANGE', budget2026: 7960, year: 2026 },
  { id: 'vdbs-36', projectNumber: '313', projectName: 'Umsetzung StrategiepapierEXEC', category: 'CHANGE', budget2026: 1990, year: 2026 },
  { id: 'vdbs-37', projectNumber: '314', projectName: 'DMS Support', category: 'RUN', budget2026: 398, year: 2026 },
  { id: 'vdbs-38', projectNumber: '315', projectName: 'Konzeption RE Design Dachportal und Umsetzung', category: 'RUN', budget2026: 3980, year: 2026 },
  { id: 'vdbs-39', projectNumber: '316', projectName: 'DWH VDB', category: 'RUN', budget2026: 329.54, year: 2026 },
  { id: 'vdbs-40', projectNumber: '155', projectName: 'DaPo MBG-Veränderungen', category: 'RUN', budget2026: 0, year: 2026 },
];

export default function VDBSBudgetDashboard() {
  const [vdbsBudget, setVDBSBudget] = useState<VDBSBudgetItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([]);
  const [sortField, setSortField] = useState<'projectNumber' | 'projectName' | 'budget2026'>('projectNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'RUN' | 'CHANGE'>('all');
  const currentYear = getCurrentYear();

  // Load VDB-S Budget from localStorage
  useEffect(() => {
    // TEMP: localStorage löschen um neue DEMO_VDBS_BUDGET zu erzwingen
    localStorage.removeItem('vdbsBudget');

    try {
      const stored = localStorage.getItem('vdbsBudget');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVDBSBudget(parsed);
          return;
        }
      }
    } catch (e) { /* ignore */ }

    // Fallback zu Demo-Daten
    setVDBSBudget(DEMO_VDBS_BUDGET);
    localStorage.setItem('vdbsBudget', JSON.stringify(DEMO_VDBS_BUDGET));
  }, []);

  // Load YearBudgets
  useEffect(() => {
    try {
      const ls = localStorage.getItem('yearBudgets');
      if (ls) {
        const parsed = JSON.parse(ls);
        if (Array.isArray(parsed)) {
          setYearBudgets(parsed);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Filter by year and category
  const filteredItems = useMemo(() => {
    let items = vdbsBudget.filter((item) => item.year === selectedYear);
    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }
    return items;
  }, [vdbsBudget, selectedYear, categoryFilter]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'projectNumber') {
        aVal = parseInt(a.projectNumber);
        bVal = parseInt(b.projectNumber);
      } else if (sortField === 'budget2026') {
        aVal = a.budget2026;
        bVal = b.budget2026;
      } else {
        aVal = a.projectName.toLowerCase();
        bVal = b.projectName.toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  // KPIs
  const kpis = useMemo(() => {
    const totalBudget = filteredItems.reduce((sum, item) => sum + item.budget2026, 0);
    const largestItem = filteredItems.length > 0
      ? filteredItems.reduce((max, item) => item.budget2026 > max.budget2026 ? item : max)
      : null;

    // Budget by category
    const byCategory = filteredItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.budget2026;
      return acc;
    }, {} as Record<string, number>);

    // Top 5 items
    const top5 = [...filteredItems]
      .sort((a, b) => b.budget2026 - a.budget2026)
      .slice(0, 5);

    return {
      totalBudget,
      count: filteredItems.length,
      largestItem,
      byCategory,
      top5,
    };
  }, [filteredItems]);

  // Jahresbudget finden
  const yearBudget = yearBudgets.find((yb) => yb.year === selectedYear);

  // Warnung bei Überplanung
  const showWarning = yearBudget && kpis.totalBudget > yearBudget.budget;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);

  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 10000) {
      return `€${Math.round(n / 1000)}k`;
    }
    return fmtCurrency(n);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Chart data
  const categoryData = Object.entries(kpis.byCategory).map(([name, value]) => ({
    name: name === 'RUN' ? 'Laufende Kosten (RUN)' : 'Projekte (CHANGE)',
    value,
  }));

  const COLORS = {
    RUN: '#3b82f6',   // blue-500
    CHANGE: '#7c3aed', // violet-600
  };

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-4">
      <div className="mx-auto max-w-[1800px] space-y-3">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VDB-S Budget</h1>
            <p className="mt-1 text-sm text-gray-600">
              Budgetplanung für VDB-Service, Arbeitskreise und Projekte
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mr-2 text-sm font-medium text-gray-700">Jahr:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/vdbs-budget-admin"
              className="text-sm text-blue-600 hover:underline"
            >
              VDB-S Budget verwalten
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <DashboardTabs />

        {/* Warnung bei Überplanung */}
        {showWarning && (
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
                ⚠️ VDB-S Budget ({fmtCurrency(kpis.totalBudget)}) übersteigt Jahresbudget ({fmtCurrency(yearBudget!.budget)})
              </span>
            </div>
          </Card>
        )}

        {/* KPI-Zeile (3 Tiles) */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={`Gesamtbudget ${selectedYear}`} className="h-[120px]">
            <div className="flex h-full flex-col items-start justify-center">
              <div className="text-4xl font-bold text-blue-600">{fmtCurrency(kpis.totalBudget)}</div>
              <div className="mt-2 text-sm text-gray-600">{kpis.count} Positionen</div>
            </div>
          </Card>
          <Card title="Größte Position" className="h-[120px]">
            <div className="flex h-full flex-col justify-center">
              {kpis.largestItem ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">{fmtCurrency(kpis.largestItem.budget2026)}</div>
                  <div className="mt-1 text-xs text-gray-600 truncate">{kpis.largestItem.projectName}</div>
                </>
              ) : (
                <div className="text-gray-500">Keine Daten</div>
              )}
            </div>
          </Card>
          <Card title="Budget-Verteilung" className="h-[120px]">
            <div className="flex h-full flex-col justify-center gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">RUN (Laufend):</span>
                <span className="font-medium">{fmtCompact(kpis.byCategory.RUN || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">CHANGE (Projekte):</span>
                <span className="font-medium">{fmtCompact(kpis.byCategory.CHANGE || 0)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart-Zeile (3 Charts) */}
        <div className="grid grid-cols-3 gap-3">
          {/* Chart 1: Budget nach Kategorie */}
          <Card title="Budget nach Kategorie" className="h-[280px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name.includes('RUN') ? COLORS.RUN : COLORS.CHANGE} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmtCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.RUN }} />
                <span className="text-gray-700">Laufende Kosten: {fmtCompact(kpis.byCategory.RUN || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.CHANGE }} />
                <span className="text-gray-700">Projekte: {fmtCompact(kpis.byCategory.CHANGE || 0)}</span>
              </div>
            </div>
          </Card>

          {/* Chart 2: Top 5 Positionen */}
          <Card title="Top 5 Budgetpositionen" className="h-[280px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpis.top5} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtCompact(v)} />
                <YAxis type="category" dataKey="projectNumber" tick={{ fontSize: 11 }} width={50} />
                <Tooltip
                  formatter={(v) => fmtCurrency(v as number)}
                  labelFormatter={(label) => {
                    const item = kpis.top5.find((i) => i.projectNumber === label);
                    return item ? `${item.projectNumber}: ${item.projectName.substring(0, 30)}...` : label;
                  }}
                />
                <Bar dataKey="budget2026" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Chart 3: Category Filter & Stats */}
          <Card title="Filter & Statistik" className="h-[280px]">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">Kategorie filtern:</label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`rounded border px-3 py-2 text-sm transition-colors ${
                      categoryFilter === 'all'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => setCategoryFilter('RUN')}
                    className={`rounded border px-3 py-2 text-sm transition-colors ${
                      categoryFilter === 'RUN'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Laufende Kosten
                  </button>
                  <button
                    onClick={() => setCategoryFilter('CHANGE')}
                    className={`rounded border px-3 py-2 text-sm transition-colors ${
                      categoryFilter === 'CHANGE'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Projekte
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <h4 className="mb-2 text-xs font-semibold text-gray-700">Aktuelle Auswahl:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Positionen:</span>
                    <span className="font-medium">{kpis.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gesamtbudget:</span>
                    <span className="font-medium">{fmtCurrency(kpis.totalBudget)}</span>
                  </div>
                  {yearBudget && (
                    <div className="flex justify-between border-t border-gray-300 pt-1">
                      <span>Verbleibend:</span>
                      <span className={`font-medium ${kpis.totalBudget <= yearBudget.budget ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtCurrency(yearBudget.budget - kpis.totalBudget)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Budget Table */}
        <Card title="VDB-S Budgetpositionen">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('projectNumber')}
                  >
                    Projekt Nr. {sortField === 'projectNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('projectName')}
                  >
                    Projektname {sortField === 'projectName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Kategorie
                  </th>
                  <th
                    className="cursor-pointer border-b-2 border-gray-300 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-200"
                    onClick={() => handleSort('budget2026')}
                  >
                    Budget {selectedYear} {sortField === 'budget2026' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Keine Budgetpositionen für {selectedYear}
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-3 font-mono text-xs text-gray-900">{item.projectNumber}</td>
                      <td className="px-3 py-3 text-gray-900">{item.projectName}</td>
                      <td className="px-3 py-3">
                        <Badge tone={item.category === 'RUN' ? 'blue' : 'purple'}>
                          {item.category === 'RUN' ? 'Laufend' : 'Projekt'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ width: `${Math.min(100, (item.budget2026 / (kpis.largestItem?.budget2026 || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="font-medium text-gray-900">{fmtCurrency(item.budget2026)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-gray-100">
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                    Gesamt ({kpis.count} Positionen):
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">{fmtCurrency(kpis.totalBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
