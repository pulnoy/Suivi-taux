'use client';

import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useState } from 'react';
import TrendChart from './trend-chart';
import YearlyChart from './yearly-chart';

interface RateCardProps {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
  description: string;
  source: string;
  lastUpdate: string;
  history: { date: string; value: number }[];
  yearlyData?: { year: number; value: number; isYTD?: boolean }[];
  showYearly?: boolean;
}

export default function RateCard({
  title = '',
  value = 0,
  unit = '%',
  trend = 'stable',
  color = '#3b82f6',
  icon = '📊',
  description = '',
  source = '',
  lastUpdate = '',
  history = [],
  yearlyData = [],
  showYearly = false,
}: RateCardProps) {
  const [showChart, setShowChart] = useState(false);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-400';
  const trendBg = trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-slate-50';

  const hasChartData = showYearly ? (yearlyData?.length ?? 0) > 0 : (history?.length ?? 0) > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBg}`}>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className={`text-xs font-medium ${trendColor}`}>
              {trend === 'up' ? 'Hausse' : trend === 'down' ? 'Baisse' : 'Stable'}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span
            className="text-4xl font-bold"
            style={{ color: color ?? '#3b82f6' }}
          >
            {typeof value === 'number' ? value?.toFixed?.(2) ?? '0.00' : '0.00'}
          </span>
          <span className="text-xl text-slate-500">{unit}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
          <span>Mis à jour : {lastUpdate || 'N/A'}</span>
          {hasChartData && (
            <button
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Info className="h-4 w-4" />
              {showChart ? 'Masquer' : 'Tendance'}
            </button>
          )}
        </div>

        {showChart && hasChartData && (
          <div className="mt-4">
            {showYearly ? (
              <YearlyChart data={yearlyData ?? []} color={color ?? '#3b82f6'} />
            ) : (
              <div className="h-32">
                <TrendChart data={history ?? []} color={color ?? '#3b82f6'} />
              </div>
            )}
          </div>
        )}

        {description && (
          <p className="text-xs text-slate-500 mt-2">{description}</p>
        )}
        {source && (
          <p className="text-xs text-slate-400 mt-1">Source : {source}</p>
        )}
      </div>
    </div>
  );
}
