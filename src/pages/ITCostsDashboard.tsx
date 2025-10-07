import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Card, COLORS } from '../ui';
import type { ITCost, ITCostCategory } from '../types';
import { fmtDate, getToday, getCurrentYear, getITCostsByCategoryD, getITCostsByProviderD, calculateYearlyCostD } from '../lib';
import DashboardTabs from '../components/DashboardTabs';

const ITCostsByCategoryChart = lazy(() => import('../components/ITCostsByCategoryChart'));
const ITCostsByProviderChart = lazy(() => import('../components/ITCostsByProviderChart'));
const ITCostsByFrequencyChart = lazy(() => import('../components/ITCostsByFrequencyChart'));
const ContractExpiryList = lazy(() => import('../components/ContractExpiryList'));
const ITCostsTable = lazy(() => import('../components/ITCostsTable'));

export default function ITCostsDashboard() {
  const [itCosts, setITCosts] = useState<ITCost[]>([]);
  const [year, setYear] = useState<number>(() => getCurrentYear());
  const today = getToday();

  // IT-Kosten laden
  useEffect(() => {
    try {
      const ls = localStorage.getItem('itCosts');
      if (ls) {
        const parsed = JSON.parse(ls);
        if (Array.isArray(parsed)) {
          setITCosts(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load IT costs:', e);
    }
  }, []);

  // Nach Jahr filtern
  const yearCosts = useMemo(() => itCosts.filter((c) => c.year === year), [itCosts, year]);

  // KPIs berechnen
  const kpis = useMemo(() => {
    const byCategory = getITCostsByCategoryD(yearCosts, year, today);
    const byProvider = getITCostsByProviderD(yearCosts, year, today);

    // Top-Kategorie
    const categoryEntries = [
      { name: 'Hardware', value: byCategory.hardware, key: 'hardware' as ITCostCategory },
      { name: 'Software & Lizenzen', value: byCategory.software_licenses, key: 'software_licenses' as ITCostCategory },
      { name: 'Wartung & Service', value: byCategory.maintenance_service, key: 'maintenance_service' as ITCostCategory },
      { name: 'Schulung', value: byCategory.training, key: 'training' as ITCostCategory },
      { name: 'Sonstiges', value: byCategory.other, key: 'other' as ITCostCategory },
    ];
    const topCategory = categoryEntries.sort((a, b) => b.value - a.value)[0];

    // Anzahl aktiver Verträge (laufend + unbefristet)
    const activeContracts = yearCosts.filter((c) => {
      if (!c.endDate) return true; // Unbefristet
      const endD = new Date(c.endDate);
      return endD >= today; // Noch nicht abgelaufen
    }).length;

    return {
      total: byCategory.total,
      topCategory,
      activeContracts,
      byCategory,
      byProvider,
    };
  }, [yearCosts, year, today]);

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className={`min-h-screen ${COLORS.bg} ${COLORS.text} px-8 py-4`}>
      <div className="max-w-presentation mx-auto space-y-3">
        {/* Header mit Tabs */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">IT-Kostenübersicht</h1>
            <p className={"text-sm " + COLORS.subtext}>Stand: {fmtDate(today)}</p>
            <div className="flex gap-3 mt-1">
              <a href="/admin/it-costs" className="text-sm text-purple-600 hover:underline">
                IT-Kosten verwalten
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mr-2 text-sm font-medium">Jahr:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {Array.from({ length: 10 }, (_, i) => getCurrentYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <DashboardTabs />

        {/* KPI-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title={`Gesamt IT-Kosten ${year}`} className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-4xl font-bold text-blue-600">{fmt(kpis.total)}</div>
              <div className="mt-2 text-sm text-gray-600">
                {yearCosts.length} Kostenposition{yearCosts.length !== 1 ? 'en' : ''}
              </div>
            </div>
          </Card>

          <Card title="Größter Kostenblock" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-2xl font-bold text-gray-900">{kpis.topCategory.name}</div>
              <div className="mt-2 text-xl font-semibold text-blue-600">{fmt(kpis.topCategory.value)}</div>
              <div className="mt-1 text-sm text-gray-600">
                {((kpis.topCategory.value / kpis.total) * 100).toFixed(1)}% des Gesamtbudgets
              </div>
            </div>
          </Card>

          <Card title="Aktive Verträge" className="min-h-[180px]">
            <div className="flex h-full flex-col justify-center">
              <div className="text-4xl font-bold text-green-600">{kpis.activeContracts}</div>
              <div className="mt-2 text-sm text-gray-600">
                Laufende & unbefristete Verträge
              </div>
            </div>
          </Card>
        </div>

        {/* Chart-Zeile */}
        <div className="grid grid-cols-3 gap-3">
          <Card title="Kosten nach Kategorie" className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ITCostsByCategoryChart data={kpis.byCategory} />
            </Suspense>
          </Card>

          <Card title="Top 5 Dienstleister" className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ITCostsByProviderChart data={kpis.byProvider} />
            </Suspense>
          </Card>

          <Card title="Kosten nach Frequenz" className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ITCostsByFrequencyChart costs={yearCosts} year={year} />
            </Suspense>
          </Card>
        </div>

        {/* Analyse-Zeile */}
        <div className="grid grid-cols-2 gap-3">
          <Card title="Auslaufende Verträge (nächste 90 Tage)" className="h-chart">
            <Suspense fallback={<div className="h-48 bg-slate-100 rounded animate-pulse" />}>
              <ContractExpiryList costs={yearCosts} year={year} />
            </Suspense>
          </Card>

          <Card title="Dienstleister-Übersicht" className="h-chart">
            <div className="overflow-y-auto max-h-64">
              {kpis.byProvider.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Keine Daten vorhanden
                </div>
              ) : (
                <div className="space-y-2">
                  {kpis.byProvider.slice(0, 10).map((provider, idx) => (
                    <div key={provider.provider} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{provider.provider}</span>
                      </div>
                      <div className="text-sm font-semibold text-blue-600">{fmt(provider.total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* IT-Kosten Tabelle */}
        <Suspense fallback={<div className="h-96 bg-slate-100 rounded animate-pulse" />}>
          <ITCostsTable costs={itCosts} year={year} />
        </Suspense>
      </div>
    </div>
  );
}
