import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const ResourceBar: React.FC<{ capacity: number; usedHours: number; height?: number }> = ({ capacity, usedHours, height = 192 }) => {
  const data = [
    { name: 'Kapazität', Stunden: capacity },
    { name: 'Geplant (akt. Monat)', Stunden: usedHours },
  ];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Stunden" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ResourceBar;
