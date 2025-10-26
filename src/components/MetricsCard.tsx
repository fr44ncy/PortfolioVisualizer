import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'positive' | 'negative' | 'neutral';
}

export default function MetricsCard({ title, value, subtitle, trend }: MetricsCardProps) {
  let trendColor = 'text-gray-700';
  if (trend === 'positive') trendColor = 'text-green-600';
  if (trend === 'negative') trendColor = 'text-red-600';

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{title}</div>
      <div className={`text-2xl font-semibold ${trendColor}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
