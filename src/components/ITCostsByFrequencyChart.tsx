import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ITCost, ITCostFrequency } from '../types';
import { calculateYearlyCostD } from '../lib';

interface Props {
  costs: ITCost[];
  year: number;
}

const FREQUENCY_COLORS: Record<ITCostFrequency, string> = {
  monthly: '#3b82f6',     // blue-500
  quarterly: '#10b981',   // green-500
  biannual: '#8b5cf6',    // violet-500
  yearly: '#f59e0b',      // amber-500
  one_time: '#64748b',    // slate-500
};

const FREQUENCY_LABELS: Record<ITCostFrequency, string> = {
  monthly: 'Monatlich',
  quarterly: 'Vierteljährlich',
  biannual: 'Halbjährlich',
  yearly: 'Jährlich',
  one_time: 'Einmalig',
};

export default function ITCostsByFrequencyChart({ costs, year }: Props) {
  // Aggregiere Kosten nach Frequenz
  const aggregated: Record<ITCostFrequency, number> = {
    monthly: 0,
    quarterly: 0,
    biannual: 0,
    yearly: 0,
    one_time: 0,
  };

  costs.forEach((cost) => {
    const yearlyCost = calculateYearlyCostD(cost, year);
    aggregated[cost.frequency] += yearlyCost;
  });

  const chartData = [
    { name: FREQUENCY_LABELS.monthly, value: aggregated.monthly, color: FREQUENCY_COLORS.monthly },
    { name: FREQUENCY_LABELS.quarterly, value: aggregated.quarterly, color: FREQUENCY_COLORS.quarterly },
    { name: FREQUENCY_LABELS.biannual, value: aggregated.biannual, color: FREQUENCY_COLORS.biannual },
    { name: FREQUENCY_LABELS.yearly, value: aggregated.yearly, color: FREQUENCY_COLORS.yearly },
    { name: FREQUENCY_LABELS.one_time, value: aggregated.one_time, color: FREQUENCY_COLORS.one_time },
  ].filter((item) => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="rounded-md bg-white px-3 py-2 text-xs shadow border border-slate-200">
          <div className="font-medium text-slate-700">{item.name}</div>
          <div className="text-slate-600">{pct}% • {fmt(item.value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              innerRadius={45}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs text-slate-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
