import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ITCostsByProvider } from '../types';

interface Props {
  data: ITCostsByProvider[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#64748b'];

export default function ITCostsByProviderChart({ data }: Props) {
  // Top 5 Dienstleister
  const top5 = data.slice(0, 5);

  const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="rounded-md bg-white px-3 py-2 text-xs shadow border border-slate-200">
          <div className="font-medium text-slate-700">{item.payload.provider}</div>
          <div className="text-slate-600">{fmt(item.value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={top5}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="provider"
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {top5.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {top5.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Keine Daten vorhanden
        </div>
      )}
    </div>
  );
}
