import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { COLORS } from '../ui';

export const BudgetDonut: React.FC<{ spent: number; remaining: number }> = ({ spent, remaining }) => {
  const data = [
    { name: 'Ausgegeben', value: Math.max(0, spent) },
    { name: 'Verbleibend', value: Math.max(0, remaining) },
  ];
  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={45} innerRadius={28}>
            <Cell fill={COLORS.blue} />
            <Cell fill={COLORS.slate} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetDonut;

