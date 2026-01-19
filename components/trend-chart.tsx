'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useMemo } from 'react';

interface TrendChartProps {
  data: { date: string; value: number }[];
  color: string;
}

export default function TrendChart({ data = [], color = '#3b82f6' }: TrendChartProps) {
  const safeData = data ?? [];
  
  const chartData = useMemo(() => {
    return safeData?.map?.((item) => ({
      date: item?.date ? new Date(item.date)?.toLocaleDateString?.('fr-FR', { day: '2-digit', month: '2-digit' }) ?? '' : '',
      value: item?.value ?? 0,
    })) ?? [];
  }, [safeData]);

  const minValue = useMemo(() => {
    if (!chartData?.length) return 0;
    return Math.min(...(chartData?.map?.((d) => d?.value ?? 0) ?? [0]));
  }, [chartData]);

  const maxValue = useMemo(() => {
    if (!chartData?.length) return 100;
    return Math.max(...(chartData?.map?.((d) => d?.value ?? 0) ?? [100]));
  }, [chartData]);

  const padding = (maxValue - minValue) * 0.1 || 0.5;

  if (!chartData?.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Pas de données historiques disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 10 }} 
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis 
          domain={[minValue - padding, maxValue + padding]} 
          tick={{ fontSize: 10 }} 
          tickLine={false}
          tickFormatter={(val) => typeof val === 'number' ? val?.toFixed?.(2) ?? '0' : '0'}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [typeof value === 'number' ? value?.toFixed?.(2) ?? '0' : '0', 'Valeur']}
          labelFormatter={(label) => `Date: ${label ?? ''}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color ?? '#3b82f6'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color ?? '#3b82f6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
