import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { VDBSBudgetItem, YearBudget } from '../types';
import { Card } from '../ui';
import { getCurrentYear } from '../lib';
import DashboardTabs from '../components/DashboardTabs';

const DEMO_VDBS_BUDGET: VDBSBudgetItem[] = [
  { id: 'vdbs-1', projectNumber: '101', projectName: 'Servicebudget Basis', budget2026: 16905, year: 2026 },
  { id: 'vdbs-2', projectNumber: '102', projectName: 'Servicebudget Individuell', budget2026: 19250, year: 2026 },
  { id: 'vdbs-3', projectNumber: '109', projectName: 'Weiterer Ausbau VDB Service in 2026', budget2026: 35750, year: 2026 },
  { id: 'vdbs-4', projectNumber: '121', projectName: 'IT Fachbeirat Aufwandsentschädigung', budget2026: 5506.2, year: 2026 },
  { id: 'vdbs-5', projectNumber: '103', projectName: 'Gewinnzuschlag VDB Service 2026', budget2026: 1690.5, year: 2026 },
  { id: 'vdbs-6', projectNumber: '106', projectName: 'AK Gesamtbanksteuerung', budget2026: 5174, year: 2026 },
  { id: 'vdbs-7', projectNumber: '107', projectName: 'Sammel AK Meldewesen,Recht,Datenschutz,Nachhaltigkeit, Auslagerung', budget2026: 3980, year: 2026 },
  { id: 'vdbs-8', projectNumber: '108', projectName: 'AK Marketing', budget2026: 995, year: 2026 },
  { id: 'vdbs-9', projectNumber: '160', projectName: 'Laufender Betrieb PASS Lösung BB Sachsen', budget2026: 4190, year: 2026 },
  { id: 'vdbs-10', projectNumber: '200', projectName: 'AK-Rating', budget2026: 10819.17, year: 2026 },
  { id: 'vdbs-11', projectNumber: '201', projectName: 'AK-Rating - Fides', budget2026: 1578.91, year: 2026 },
  { id: 'vdbs-12', projectNumber: '120', projectName: 'IT Fachbeirat Lfd. Anpassungen', budget2026: 5263.02, year: 2026 },
  { id: 'vdbs-13', projectNumber: '191', projectName: 'Modernisierung Fides und Umsysteme', budget2026: 5263.02, year: 2026 },
  { id: 'vdbs-14', projectNumber: '130', projectName: 'DaPo Bürgschaftsbanken-lfd Betrieb', budget2026: 1323.77, year: 2026 },
  { id: 'vdbs-15', projectNumber: '135', projectName: 'DaPo Bürgschaftsbanken Veränderung', budget2026: 2206.28, year: 2026 },
  { id: 'vdbs-16', projectNumber: '170', projectName: 'Bereitstellung WM Daten für Meldewesen', budget2026: 7859.5, year: 2026 },
  { id: 'vdbs-17', projectNumber: '173', projectName: 'Bereitstellung Brancheninformationen des Sparkassenverlag', budget2026: 1963.90, year: 2026 },
  { id: 'vdbs-18', projectNumber: '180', projectName: 'Laufender Betrieb OKP Schnittstellen mit', budget2026: 1974.92, year: 2026 },
  { id: 'vdbs-19', projectNumber: '181', projectName: 'Finanzierungsportal laufender Betrieb', budget2026: 8074, year: 2026 },
  { id: 'vdbs-20', projectNumber: '185', projectName: 'Finanzierungsportal Operations', budget2026: 1101, year: 2026 },
  { id: 'vdbs-21', projectNumber: '186', projectName: 'Sicherstellung regulatorische', budget2026: 1101, year: 2026 },
  { id: 'vdbs-22', projectNumber: '182', projectName: 'Betrieb FI Schnittstelle', budget2026: 2776.74, year: 2026 },
  { id: 'vdbs-23', projectNumber: '301', projectName: 'Anbindung an Sparkassen', budget2026: 5553.47, year: 2026 },
  { id: 'vdbs-24', projectNumber: '302', projectName: 'Anbindung VoBa', budget2026: 5808.59, year: 2026 },
  { id: 'vdbs-25', projectNumber: '194', projectName: 'Ausbau Portal Anbindung an die Hausbanken', budget2026: 3770.96, year: 2026 },
  { id: 'vdbs-26', projectNumber: '303', projectName: 'Formularmanagement', budget2026: 7960, year: 2026 },
  { id: 'vdbs-27', projectNumber: '304', projectName: 'Evaluierung BB goes Cloud', budget2026: 1990, year: 2026 },
  { id: 'vdbs-28', projectNumber: '305', projectName: 'Prozesslandkarte BB', budget2026: 7960, year: 2026 },
  { id: 'vdbs-29', projectNumber: '306', projectName: '(Re-) Design Kundenanwendungen', budget2026: 995, year: 2026 },
  { id: 'vdbs-30', projectNumber: '307', projectName: 'ISMS System', budget2026: 1990, year: 2026 },
  { id: 'vdbs-31', projectNumber: '308', projectName: 'Einführung DMS Lösungen', budget2026: 3980, year: 2026 },
  { id: 'vdbs-32', projectNumber: '309', projectName: 'KI Strategie', budget2026: 1990, year: 2026 },
  { id: 'vdbs-33', projectNumber: '310', projectName: 'Einführung KI Services', budget2026: 3980, year: 2026 },
  { id: 'vdbs-34', projectNumber: '311', projectName: 'Zentrale Compliance Funktionen', budget2026: 1990, year: 2026 },
  { id: 'vdbs-35', projectNumber: '312', projectName: 'Serviceportal NEU', budget2026: 7960, year: 2026 },
  { id: 'vdbs-36', projectNumber: '313', projectName: 'Umsetzung StrategiepapierEXEC', budget2026: 1990, year: 2026 },
  { id: 'vdbs-37', projectNumber: '314', projectName: 'DMS Support', budget2026: 398, year: 2026 },
  { id: 'vdbs-38', projectNumber: '315', projectName: 'Konzeption RE Design Dachportal und Umsetzung', budget2026: 3980, year: 2026 },
  { id: 'vdbs-39', projectNumber: '316', projectName: 'DWH VDB', budget2026: 329.54, year: 2026 },
  { id: 'vdbs-40', projectNumber: '155', projectName: 'DaPo MBG-Veränderungen', budget2026: 0, year: 2026 },
];

export default function VDBSBudgetDashboard() {
  const [vdbsBudget, setVDBSBudget] = useState<VDBSBudgetItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [yearBudgets, setYearBudgets] = useState<YearBudget[]>([]);
  const currentYear = getCurrentYear();

  // Load VDB-S Budget from localStorage
  useEffect(() => {
    // TEMP: localStorage löschen um neue DEMO_VDBS_BUDGET zu erzwingen
    // Nach ersten Laden kann diese Zeile entfernt werden
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

  // Filter by year
  const filteredItems = useMemo(
    () => vdbsBudget.filter((item) => item.year === selectedYear),
    [vdbsBudget, selectedYear]
  );

  // Calculate total
  const totalBudget = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.budget2026, 0),
    [filteredItems]
  );

  // Jahresbudget finden
  const yearBudget = yearBudgets.find((yb) => yb.year === selectedYear);

  // Warnung bei Überplanung
  const showWarning = yearBudget && totalBudget > yearBudget.budget;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);

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
                ⚠️ VDB-S Budget ({fmtCurrency(totalBudget)}) übersteigt Jahresbudget ({fmtCurrency(yearBudget!.budget)})
              </span>
            </div>
          </Card>
        )}

        {/* KPI Card */}
        <Card title={`Gesamtbudget ${selectedYear}`}>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">{fmtCurrency(totalBudget)}</div>
              <div className="mt-2 text-sm text-gray-600">{filteredItems.length} Positionen</div>
              {yearBudget && (
                <div className="mt-4 text-sm text-gray-700">
                  Jahresbudget {selectedYear}: {fmtCurrency(yearBudget.budget)}
                  <br />
                  <span className={totalBudget <= yearBudget.budget ? 'text-green-600' : 'text-red-600'}>
                    Verbleibend: {fmtCurrency(yearBudget.budget - totalBudget)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Budget Table */}
        <Card title="VDB-S Budgetpositionen">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-gray-100">
                <tr>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Projekt Nr.
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Projektname
                  </th>
                  <th className="border-b-2 border-gray-300 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Budget {selectedYear}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                      Keine Budgetpositionen für {selectedYear}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-3 font-mono text-xs text-gray-900">{item.projectNumber}</td>
                      <td className="px-3 py-3 text-gray-900">{item.projectName}</td>
                      <td className="px-3 py-3 text-right font-medium text-gray-900">{fmtCurrency(item.budget2026)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-gray-100">
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={2} className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                    Gesamt:
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">{fmtCurrency(totalBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
