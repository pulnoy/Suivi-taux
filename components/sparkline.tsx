'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: { value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = '#3b82f6',
  showArea = true 
}: SparklineProps) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '' };
    
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;
    
    const points = values.map((v, i) => ({
      x: padding + (i / (values.length - 1)) * effectiveWidth,
      y: padding + effectiveHeight - ((v - min) / range) * effectiveHeight
    }));
    
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
    
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;
    
    return { line: linePath, area: areaPath };
  }, [data, width, height]);

  const trend = useMemo(() => {
    if (!data || data.length < 2) return 'neutral';
    const first = data[0].value;
    const last = data[data.length - 1].value;
    return last > first ? 'up' : last < first ? 'down' : 'neutral';
  }, [data]);

  const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#ef4444' : color;

  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {showArea && (
        <defs>
          <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showArea && (
        <path
          d={pathData.area}
          fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
        />
      )}
      <path
        d={pathData.line}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
