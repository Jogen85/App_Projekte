import React from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const BurndownChart: React.FC<{ data: Array<{ Woche: number; Ideal: number; Ist: number }> }> = ({ data }) => {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Woche" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeWidth={2} />
          <Line type="monotone" dataKey="Ist" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChart;

