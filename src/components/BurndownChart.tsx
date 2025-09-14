import React from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export const BurndownChart: React.FC<{ data: Array<{ Woche: number; Ideal: number; Ist: number }>; height?: number | string }> = ({ data, height = 190 }) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Woche" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeWidth={2} />
          <Line type="monotone" dataKey="Ist" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChart;
