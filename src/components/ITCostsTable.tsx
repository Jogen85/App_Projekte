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
    biannual: 'Halbjährlich',
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
                      <Badge tone={categoryColors[cost.category]}>
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
