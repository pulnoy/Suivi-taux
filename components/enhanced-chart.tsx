'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush, Area, ComposedChart
} from 'recharts';
import { Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { calculateMovingAverage, normalizeToBase100, formatNumber } from '@/lib/financial-utils';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

interface DataPoint {
  date: string;
  value: number;
}

interface DatasetConfig {
  key: string;
  data: DataPoint[];
  color: string;
  title: string;
  suffix: string;
}

interface EnhancedChartProps {
  datasets: DatasetConfig[];
  mode: 'real' | 'percent' | 'absolute';
  period: string;
  showMA50?: boolean;
  showMA200?: boolean;
  onToggleMA50?: () => void;
  onToggleMA200?: () => void;
}

// Determine date ranges for each dataset
interface DateRange {
  key: string;
  start: string;
  end: string;
}

function getDatasetDateRanges(datasets: DatasetConfig[]): DateRange[] {
  return datasets.map(ds => ({
    key: ds.key,
    start: ds.data[0]?.date || '',
    end: ds.data[ds.data.length - 1]?.date || ''
  }));
}

export function EnhancedChart({
  datasets,
  mode,
  period,
  showMA50 = false,
  showMA200 = false,
  onToggleMA50,
  onToggleMA200
}: EnhancedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);

  // Get date ranges for each dataset (for showing in legend)
  const dateRanges = useMemo(() => getDatasetDateRanges(datasets), [datasets]);

  // Process data for chart (simple - no projections)
  const chartData = useMemo(() => {
    if (!datasets || datasets.length === 0) return [];

    // Get all unique dates and sort them
    const allDates = new Set<string>();
    datasets.forEach(ds => ds.data.forEach(d => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();
    
    if (sortedDates.length === 0) return [];

    // Build chart data with real values only
    const data = sortedDates.map(date => {
      const point: Record<string, any> = { date };
      
      datasets.forEach(ds => {
        const dataPoint = ds.data.find(d => d.date === date);
        
        if (dataPoint) {
          if (mode === 'percent') {
            const firstPoint = ds.data[0];
            const baseValue = firstPoint?.value || 1;
            const isRate = ds.suffix === '%';
            
            if (isRate) {
              point[ds.key] = dataPoint.value - baseValue;
            } else {
              point[ds.key] = ((dataPoint.value - baseValue) / Math.abs(baseValue)) * 100;
            }
          } else {
            point[ds.key] = dataPoint.value;
          }
        }
      });
      
      return point;
    });

    return data;
  }, [datasets, mode]);

  // Calculate moving averages
  const maData = useMemo(() => {
    if (!showMA50 && !showMA200) return chartData;
    
    return chartData.map((point, idx) => {
      const newPoint = { ...point };
      
      datasets.forEach(ds => {
        if (showMA50 && idx >= 49) {
          const slice = chartData.slice(idx - 49, idx + 1);
          const sum = slice.reduce((acc, p) => acc + (p[ds.key] || 0), 0);
          newPoint[`${ds.key}_ma50`] = sum / 50;
        }
        
        if (showMA200 && idx >= 199) {
          const slice = chartData.slice(idx - 199, idx + 1);
          const sum = slice.reduce((acc, p) => acc + (p[ds.key] || 0), 0);
          newPoint[`${ds.key}_ma200`] = sum / 200;
        }
      });
      
      return newPoint;
    });
  }, [chartData, datasets, showMA50, showMA200]);

  // Export to CSV
  const exportCSV = useCallback(() => {
    if (!chartData.length) return;
    
    const headers = ['Date', ...datasets.map(ds => ds.title)];
    const rows = chartData.map(point => {
      return [point.date, ...datasets.map(ds => point[ds.key] ?? '')].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suivi-taux-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [chartData, datasets, period]);

  // Export to PNG
  const exportPNG = useCallback(async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `suivi-taux-${period}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (error) {
      console.error('Export PNG failed:', error);
    }
  }, [period]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setBrushDomain(null);
  }, []);

  // Custom tooltip - Affiche TOUS les indices, même si valeur manquante
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !label) return null;
    
    // Trouver le point de données pour cette date
    const dataPoint = chartData.find(d => d.date === label);
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
        <p className="text-sm font-semibold text-muted-foreground mb-2 pb-2 border-b border-border">
          {new Date(label).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </p>
        <div className="space-y-1.5">
          {/* Afficher TOUS les datasets, pas seulement ceux dans payload */}
          {datasets.map((ds) => {
            const value = dataPoint?.[ds.key];
            const isRate = ds.suffix === '%';
            const hasValue = value !== undefined && value !== null;
            
            return (
              <div key={ds.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: ds.color }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {ds.title}
                  </span>
                </div>
                {hasValue ? (
                  <span className={cn(
                    "text-sm font-bold",
                    mode === 'percent' 
                      ? value >= 0 ? 'text-green-600' : 'text-red-600'
                      : 'text-foreground'
                  )}>
                    {mode === 'percent' && value >= 0 ? '+' : ''}
                    {formatNumber(value, 2)}
                    {mode === 'percent' ? (isRate ? ' pts' : '%') : ` ${ds.suffix || ''}`}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    N/A
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!datasets || datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
        <p className="text-lg font-medium">Aucun indice sélectionné</p>
        <p className="text-sm mt-2">Sélectionnez au moins 2 indices pour commencer la comparaison</p>
      </div>
    );
  }

  // Determine if we need dual axis
  const needsDualAxis = mode === 'real' && datasets.length === 2;
  
  // Calculate Y axis domains
  const yDomains = useMemo(() => {
    if (mode !== 'real') return null;
    
    return datasets.map(ds => {
      const values = chartData.map(d => d[ds.key]).filter(v => v !== undefined);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1;
      return [min - padding, max + padding];
    });
  }, [chartData, datasets, mode]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {datasets.length === 1 && onToggleMA50 && onToggleMA200 && (
            <>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox 
                  checked={showMA50} 
                  onCheckedChange={() => onToggleMA50()}
                />
                <span className="text-muted-foreground">MM 50j</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox 
                  checked={showMA200} 
                  onCheckedChange={() => onToggleMA200()}
                />
                <span className="text-muted-foreground">MM 200j</span>
              </label>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetZoom}
            className="h-8"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportCSV}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportPNG}
            className="h-8"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            PNG
          </Button>
        </div>
      </div>



      {/* Chart */}
      <div ref={chartRef} className="bg-card rounded-xl p-4">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={maData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickLine={{ stroke: 'currentColor' }}
              axisLine={{ stroke: 'currentColor' }}
            />
            
            {/* Y Axis */}
            {mode === 'real' && datasets.length <= 2 ? (
              datasets.map((ds, idx) => (
                <YAxis
                  key={ds.key}
                  yAxisId={idx === 0 ? 'left' : 'right'}
                  orientation={idx === 0 ? 'left' : 'right'}
                  domain={yDomains?.[idx] || ['auto', 'auto']}
                  tickFormatter={(v) => formatNumber(v, 2)}
                  className="text-xs"
                  tick={{ fill: ds.color }}
                  tickLine={{ stroke: ds.color }}
                  axisLine={{ stroke: ds.color }}
                />
              ))
            ) : (
              <YAxis
                tickFormatter={(v) => mode === 'percent' ? `${v > 0 ? '+' : ''}${formatNumber(v, 1)}%` : formatNumber(v, 2)}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
                axisLine={{ stroke: 'currentColor' }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => {
                const ds = datasets.find(d => d.key === value || d.key === value.replace('_ma50', '').replace('_ma200', ''));
                return ds?.title || value;
              }}
            />

            {/* Reference line at 0 for percent mode */}
            {mode === 'percent' && (
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="5 5" />
            )}

            {/* Data lines - Real data (solid) */}
            {datasets.map((ds, idx) => (
              <Line
                key={ds.key}
                type="monotone"
                dataKey={ds.key}
                stroke={ds.color}
                strokeWidth={2}
                dot={false}
                yAxisId={mode === 'real' && datasets.length <= 2 ? (idx === 0 ? 'left' : 'right') : undefined}
                connectNulls
                name={ds.title}
              />
            ))}



            {/* Moving averages */}
            {showMA50 && datasets.map((ds) => (
              <Line
                key={`${ds.key}_ma50`}
                type="monotone"
                dataKey={`${ds.key}_ma50`}
                stroke={ds.color}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name={`MM 50j`}
                connectNulls
              />
            ))}

            {showMA200 && datasets.map((ds) => (
              <Line
                key={`${ds.key}_ma200`}
                type="monotone"
                dataKey={`${ds.key}_ma200`}
                stroke={ds.color}
                strokeWidth={1}
                strokeDasharray="10 5"
                dot={false}
                name={`MM 200j`}
                connectNulls
              />
            ))}

            {/* Brush for zoom */}
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="#8884d8"
              tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
