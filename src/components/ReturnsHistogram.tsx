import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReturnsHistogramProps {
  data: { bin: string; count: number }[];
}

export default function ReturnsHistogram({ data }: ReturnsHistogramProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Need more data for distribution
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const binValue = parseFloat(payload[0].payload.bin);
      return (
        <div className="bg-white px-4 py-2 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-xs text-gray-500 mb-1">Return: {(binValue * 100).toFixed(1)}%</p>
          <p className="text-sm font-medium">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 10, fill: '#999' }}
            tickFormatter={(value) => `${(parseFloat(value) * 100).toFixed(0)}%`}
          />
          <YAxis tick={{ fontSize: 11, fill: '#999' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const binValue = parseFloat(entry.bin);
              const color = binValue < 0 ? '#ef4444' : '#10b981';
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
