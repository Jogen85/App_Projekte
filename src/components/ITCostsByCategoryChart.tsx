import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ITCostsByCategory } from '../types';

interface Props {
  data: ITCostsByCategory;
}

const CATEGORY_COLORS = {
  hardware: '#64748b',           // slate-500
  software_licenses: '#3b82f6',  // blue-500
  maintenance_service: '#a855f7', // purple-500
  training: '#10b981',           // green-500
  other: '#f59e0b',              // amber-500
};

const CATEGORY_LABELS = {
  hardware: 'Hardware',
  software_licenses: 'Software & Lizenzen',
  maintenance_service: 'Wartung & Service',
  training: 'Schulung',
  other: 'Sonstiges',
};

export default function ITCostsByCategoryChart({ data }: Props) {
  const chartData = [
    { name: CATEGORY_LABELS.hardware, value: data.hardware, color: CATEGORY_COLORS.hardware },
    { name: CATEGORY_LABELS.software_licenses, value: data.software_licenses, color: CATEGORY_COLORS.software_licenses },
    { name: CATEGORY_LABELS.maintenance_service, value: data.maintenance_service, color: CATEGORY_COLORS.maintenance_service },
    { name: CATEGORY_LABELS.training, value: data.training, color: CATEGORY_COLORS.training },
    { name: CATEGORY_LABELS.other, value: data.other, color: CATEGORY_COLORS.other },
  ].filter((item) => item.value > 0); // Nur Kategorien mit Werten anzeigen

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = ((item.value / data.total) * 100).toFixed(1);
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
              formatter={(value: string) => (
                <span className="text-xs text-slate-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
