'use client';

import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ZAxis
} from 'recharts';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { 
  calculateCorrelation, 
  calculateLinearRegression,
  filterDataByPeriod,
  formatNumber 
} from '@/lib/financial-utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  value: number;
}

interface Indicateur {
  titre: string;
  valeur: number;
  suffixe: string;
  historique: DataPoint[];
}

interface CorrelationViewProps {
  indices: Record<string, Indicateur>;
}

type Period = '1M' | '3M' | '6M' | '1A' | '5A' | 'MAX';

export function CorrelationView({ indices }: CorrelationViewProps) {
  const [period, setPeriod] = useState<Period>('1A');
  const [selectedX, setSelectedX] = useState<string>('cac40');
  const [selectedY, setSelectedY] = useState<string>('eurusd');
  
  const availableIndices = Object.keys(indices);

  // Calculate correlation heatmap data
  const heatmapData = useMemo(() => {
    const matrix: { x: string; y: string; correlation: number; xTitle: string; yTitle: string }[] = [];
    
    availableIndices.forEach(key1 => {
      const data1 = filterDataByPeriod(indices[key1]?.historique || [], period);
      
      availableIndices.forEach(key2 => {
        if (key1 <= key2) { // Only calculate upper triangle + diagonal
          const data2 = filterDataByPeriod(indices[key2]?.historique || [], period);
          const corr = key1 === key2 ? 1 : calculateCorrelation(data1, data2);
          
          matrix.push({
            x: key1,
            y: key2,
            correlation: corr,
            xTitle: indices[key1]?.titre || key1,
            yTitle: indices[key2]?.titre || key2
          });
          
          if (key1 !== key2) {
            matrix.push({
              x: key2,
              y: key1,
              correlation: corr,
              xTitle: indices[key2]?.titre || key2,
              yTitle: indices[key1]?.titre || key1
            });
          }
        }
      });
    });
    
    return matrix;
  }, [indices, availableIndices, period]);

  // Scatter plot data
  const scatterData = useMemo(() => {
    if (!selectedX || !selectedY || selectedX === selectedY) return { points: [], regression: null };
    
    const dataX = filterDataByPeriod(indices[selectedX]?.historique || [], period);
    const dataY = filterDataByPeriod(indices[selectedY]?.historique || [], period);
    
    // Build map for alignment
    const mapX = new Map(dataX.map(d => [d.date, d.value]));
    const mapY = new Map(dataY.map(d => [d.date, d.value]));
    
    // Calculate returns
    const commonDates = [...mapX.keys()].filter(date => mapY.has(date)).sort();
    
    const points: { x: number; y: number; date: string }[] = [];
    let prevX = 0, prevY = 0;
    
    for (let i = 1; i < commonDates.length; i++) {
      const currDateX = mapX.get(commonDates[i])!;
      const prevDateX = mapX.get(commonDates[i - 1])!;
      const currDateY = mapY.get(commonDates[i])!;
      const prevDateY = mapY.get(commonDates[i - 1])!;
      
      if (prevDateX !== 0 && prevDateY !== 0) {
        const returnX = ((currDateX - prevDateX) / Math.abs(prevDateX)) * 100;
        const returnY = ((currDateY - prevDateY) / Math.abs(prevDateY)) * 100;
        
        points.push({
          x: returnX,
          y: returnY,
          date: commonDates[i]
        });
      }
    }
    
    // Calculate regression
    const regression = calculateLinearRegression(points);
    
    return { points, regression };
  }, [indices, selectedX, selectedY, period]);

  // Correlation value for scatter plot
  const scatterCorrelation = useMemo(() => {
    if (!selectedX || !selectedY || selectedX === selectedY) return 0;
    const dataX = filterDataByPeriod(indices[selectedX]?.historique || [], period);
    const dataY = filterDataByPeriod(indices[selectedY]?.historique || [], period);
    return calculateCorrelation(dataX, dataY);
  }, [indices, selectedX, selectedY, period]);

  // Period buttons
  const periodButtons: { value: Period; label: string }[] = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1A', label: '1A' },
    { value: '5A', label: '5A' },
    { value: 'MAX', label: 'Max' },
  ];

  // Get color for correlation value
  const getCorrelationColor = (corr: number): string => {
    const intensity = Math.abs(corr);
    if (corr > 0.7) return `rgba(22, 163, 74, ${0.3 + intensity * 0.7})`;
    if (corr > 0.3) return `rgba(22, 163, 74, ${0.1 + intensity * 0.4})`;
    if (corr > -0.3) return `rgba(148, 163, 184, 0.2)`;
    if (corr > -0.7) return `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`;
    return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
  };

  // Custom tooltip for scatter
  const ScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-xl p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(data.date).toLocaleDateString('fr-FR')}
        </p>
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">{indices[selectedX]?.titre}:</span>{' '}
            <span className={data.x >= 0 ? 'text-green-600' : 'text-red-600'}>
              {data.x >= 0 ? '+' : ''}{formatNumber(data.x)}%
            </span>
          </p>
          <p>
            <span className="font-medium">{indices[selectedY]?.titre}:</span>{' '}
            <span className={data.y >= 0 ? 'text-green-600' : 'text-red-600'}>
              {data.y >= 0 ? '+' : ''}{formatNumber(data.y)}%
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        {periodButtons.map(btn => (
          <Button
            key={btn.value}
            variant={period === btn.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod(btn.value)}
            className="h-8 px-3"
          >
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Correlation Heatmap */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Matrice de Corrélation
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Corrélation des rendements entre tous les indices
            </p>
          </div>
          <div className="p-4 overflow-x-auto">
            <div 
              className="grid gap-0.5"
              style={{ 
                gridTemplateColumns: `80px repeat(${availableIndices.length}, 1fr)`,
                minWidth: `${80 + availableIndices.length * 45}px`
              }}
            >
              {/* Header row */}
              <div className="h-10" />
              {availableIndices.map(key => (
                <div 
                  key={`header-${key}`}
                  className="h-10 flex items-center justify-center"
                >
                  <span 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: INDEX_EDUCATION[key]?.color || '#64748b' }}
                    title={indices[key]?.titre}
                  />
                </div>
              ))}
              
              {/* Data rows */}
              {availableIndices.map(rowKey => (
                <>
                  <div 
                    key={`label-${rowKey}`}
                    className="h-10 flex items-center text-xs font-medium text-muted-foreground truncate pr-2"
                  >
                    {indices[rowKey]?.titre.slice(0, 10)}
                  </div>
                  {availableIndices.map(colKey => {
                    const cell = heatmapData.find(d => d.x === rowKey && d.y === colKey);
                    const corr = cell?.correlation ?? 0;
                    
                    return (
                      <div
                        key={`cell-${rowKey}-${colKey}`}
                        className={cn(
                          "h-10 flex items-center justify-center text-xs font-mono rounded",
                          rowKey === colKey && "bg-muted"
                        )}
                        style={{ 
                          backgroundColor: rowKey !== colKey ? getCorrelationColor(corr) : undefined
                        }}
                        title={`${indices[rowKey]?.titre} vs ${indices[colKey]?.titre}: ${formatNumber(corr, 2)}`}
                      >
                        {rowKey === colKey ? '—' : formatNumber(corr, 2)}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.6)' }} />
                -1
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded bg-muted" />
                0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(22, 163, 74, 0.6)' }} />
                +1
              </span>
            </div>
          </div>
        </div>

        {/* Scatter Plot */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Scatter Plot (Nuage de points)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Visualisation de la relation entre deux indices
            </p>
          </div>
          
          {/* Index selectors */}
          <div className="p-4 border-b border-border flex flex-wrap gap-4">
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-muted-foreground mb-1 block">Axe X</label>
              <Select value={selectedX} onValueChange={setSelectedX}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIndices.map(key => (
                    <SelectItem key={key} value={key} disabled={key === selectedY}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: INDEX_EDUCATION[key]?.color }}
                        />
                        {indices[key]?.titre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-muted-foreground mb-1 block">Axe Y</label>
              <Select value={selectedY} onValueChange={setSelectedY}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIndices.map(key => (
                    <SelectItem key={key} value={key} disabled={key === selectedX}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: INDEX_EDUCATION[key]?.color }}
                        />
                        {indices[key]?.titre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Chart */}
          <div className="p-4">
            {selectedX && selectedY && selectedX !== selectedY && scatterData.points.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name={indices[selectedX]?.titre}
                      tickFormatter={(v) => `${formatNumber(v, 1)}%`}
                      label={{ 
                        value: indices[selectedX]?.titre, 
                        position: 'bottom', 
                        offset: 10,
                        className: 'text-xs fill-muted-foreground'
                      }}
                      className="text-xs"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name={indices[selectedY]?.titre}
                      tickFormatter={(v) => `${formatNumber(v, 1)}%`}
                      label={{ 
                        value: indices[selectedY]?.titre, 
                        angle: -90, 
                        position: 'left',
                        offset: 10,
                        className: 'text-xs fill-muted-foreground'
                      }}
                      className="text-xs"
                    />
                    <Tooltip content={<ScatterTooltip />} />
                    
                    {/* Reference lines at 0 */}
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="5 5" />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="5 5" />
                    
                    {/* Regression line */}
                    {scatterData.regression && (
                      <ReferenceLine
                        stroke="#3b82f6"
                        strokeWidth={2}
                        segment={[
                          { 
                            x: Math.min(...scatterData.points.map(p => p.x)), 
                            y: scatterData.regression.slope * Math.min(...scatterData.points.map(p => p.x)) + scatterData.regression.intercept 
                          },
                          { 
                            x: Math.max(...scatterData.points.map(p => p.x)), 
                            y: scatterData.regression.slope * Math.max(...scatterData.points.map(p => p.x)) + scatterData.regression.intercept 
                          }
                        ]}
                      />
                    )}
                    
                    <Scatter 
                      data={scatterData.points} 
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    >
                      <ZAxis range={[20, 20]} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                
                {/* Stats */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <span className="text-muted-foreground">Corrélation:</span>{' '}
                    <span className={cn(
                      "font-bold",
                      scatterCorrelation > 0.3 ? 'text-green-600' :
                      scatterCorrelation < -0.3 ? 'text-red-600' : 'text-yellow-600'
                    )}>
                      {formatNumber(scatterCorrelation, 2)}
                    </span>
                  </div>
                  {scatterData.regression && (
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">R²:</span>{' '}
                      <span className="font-bold">
                        {formatNumber(scatterData.regression.rSquared, 3)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sélectionnez deux indices différents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
