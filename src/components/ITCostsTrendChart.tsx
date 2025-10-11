import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ITCost } from '../types';
import { getITCostsByCategoryD, getToday } from '../lib';

type Props = {
  costs: ITCost[];
  currentYear: number;
};

export default function ITCostsTrendChart({ costs, currentYear }: Props) {
  const today = getToday();
  const previousYear = currentYear - 1;

  const trendData = useMemo(() => {
    const currentYearCosts = costs.filter((c) => c.year === currentYear);
    const previousYearCosts = costs.filter((c) => c.year === previousYear);

    const currentByCategory = getITCostsByCategoryD(currentYearCosts, currentYear, today);
    const previousByCategory = getITCostsByCategoryD(previousYearCosts, previousYear, today);

    return [
      {
        category: 'Hardware',
        current: currentByCategory.hardware,
        previous: previousByCategory.hardware,
      },
      {
        category: 'Software & Lizenzen',
        current: currentByCategory.software_licenses,
        previous: previousByCategory.software_licenses,
      },
      {
        category: 'Wartung & Service',
        current: currentByCategory.maintenance_service,
        previous: previousByCategory.maintenance_service,
      },
      {
        category: 'Schulung',
        current: currentByCategory.training,
        previous: previousByCategory.training,
      },
      {
        category: 'Sonstiges',
        current: currentByCategory.other,
        previous: previousByCategory.other,
      },
    ];
  }, [costs, currentYear, previousYear, today]);

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === 'current')?.value || 0;
      const previous = payload.find((p: any) => p.dataKey === 'previous')?.value || 0;
      const diff = current - previous;
      const diffPercent = previous > 0 ? ((diff / previous) * 100).toFixed(1) : '0.0';

      return (
        <div className="rounded-md bg-white px-3 py-2 text-xs shadow-lg border border-slate-200">
          <div className="font-medium text-slate-900 mb-1">{label}</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
            <span className="text-slate-600">{previousYear}:</span>
            <span className="font-medium">{fmt(previous)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-600">{currentYear}:</span>
            <span className="font-medium">{fmt(current)}</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-200">
            <span className={`font-medium ${diff >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {diff >= 0 ? '+' : ''}{fmt(diff)} ({diffPercent >= '0' ? '+' : ''}{diffPercent}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => (value === 'current' ? `${currentYear}` : `${previousYear}`)}
          />
          <Bar dataKey="previous" fill="#9ca3af" name="previous" />
          <Bar dataKey="current" fill="#3b82f6" name="current" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
