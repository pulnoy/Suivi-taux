'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

interface YearlyChartProps {
  data: { year: number; value: number; isYTD?: boolean }[];
  color: string;
}

export default function YearlyChart({ data = [], color = '#8b5cf6' }: YearlyChartProps) {
  const safeData = data ?? [];

  const chartData = useMemo(() => {
    return safeData?.map?.((item) => ({
      year: item?.isYTD ? `${item?.year}*` : item?.year?.toString() ?? '',
      value: item?.value ?? 0,
      isYTD: item?.isYTD ?? false,
    })) ?? [];
  }, [safeData]);

  const hasYTD = safeData.some(item => item?.isYTD);

  if (!chartData?.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Pas de données annuelles disponibles
      </div>
    );
  }

  const getBarColor = (value: number, isYTD: boolean) => {
    if (isYTD) return '#94a3b8'; // gris pour YTD (données partielles)
    if (value >= 0) return '#10b981'; // vert pour positif
    return '#ef4444'; // rouge pour négatif
  };

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            tickFormatter={(val) => typeof val === 'number' ? `${val?.toFixed?.(1)}%` : '0%'}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: { payload?: { isYTD?: boolean } }) => [
              typeof value === 'number' ? `${value?.toFixed?.(2)}%${props?.payload?.isYTD ? ' (YTD)' : ''}` : '0%',
              'Rendement',
            ]}
            labelFormatter={(label) => `Année ${label ?? ''}`}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value, entry.isYTD)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-500 text-center">
        Performance annuelle{hasYTD ? ' (* YTD = depuis début d\'année)' : ''}
      </div>
    </div>
  );
}
