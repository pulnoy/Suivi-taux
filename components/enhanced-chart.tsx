'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush, Area, ComposedChart
} from 'recharts';
import { Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

// Fonction pour formater les dates selon la période
const formatXAxisDate = (dateString: string, period: string): string => {
  const date = new Date(dateString);
  
  switch(period) {
    case '1M':
    case '3M':
      // Format jj/mm pour court terme
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    case '6M':
    case '1A':
    case 'YTD':
      // Format mm/aa pour moyen terme
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    
    case '5A':
    case 'MAX':
      // Format année pour long terme
      return date.getFullYear().toString();
    
    default:
      // Format par défaut mm/aa
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
  }
};

// Fonction pour calculer l'intervalle optimal de ticks
const getTickInterval = (dataLength: number, period: string): number | 'preserveStartEnd' => {
  // Nombre cible de ticks à afficher
  const targetTicks = 8;
  
  if (dataLength <= targetTicks) {
    return 0; // Afficher tous les ticks
  }
  
  // Calculer l'intervalle pour avoir environ targetTicks labels
  const interval = Math.ceil(dataLength / targetTicks);
  
  return interval;
};

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

// Tooltips explicatifs pour les moyennes mobiles
const MA_TOOLTIPS = {
  ma50: "Moyenne Mobile 50 jours : Lisse les variations à court terme et identifie la tendance récente. Utile pour détecter les changements de direction à moyen terme.",
  ma200: "Moyenne Mobile 200 jours : Lisse les variations à long terme et identifie la tendance de fond. Souvent utilisée comme support/résistance majeur. Un indice au-dessus de sa MM 200j est considéré en tendance haussière."
};

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

  // Trouve le snapshot capitalisé le plus proche pour une date donnée
  const findClosestSnapshot = (snapshots: Record<string, number>, targetDate: string): number | undefined => {
    const keys = Object.keys(snapshots).sort();
    if (keys.length === 0) return undefined;
    // Cherche le dernier snapshot <= targetDate
    let best: string | undefined;
    for (const k of keys) {
      if (k <= targetDate) best = k;
      else break;
    }
    return best ? snapshots[best] : snapshots[keys[0]];
  };

  // Process data for chart (simple - no projections)
  const chartData = useMemo(() => {
    if (!datasets || datasets.length === 0) return [];

    // Get all unique dates and sort them
    const allDates = new Set<string>();
    datasets.forEach(ds => ds.data.forEach(d => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();
    
    if (sortedDates.length === 0) return [];

    // Pré-indexer chaque dataset par timestamp pour lookup rapide de la valeur la plus proche
    const MAX_GAP_MS = 45 * 24 * 60 * 60 * 1000; // 45 jours max d'écart accepté
    const indexedDatasets = datasets.map(ds => ({
      ...ds,
      sorted: [...ds.data].sort((a, b) => a.date.localeCompare(b.date))
    }));

    const findClosest = (sorted: typeof indexedDatasets[0]['sorted'], targetDate: string): number | undefined => {
      const targetTs = new Date(targetDate).getTime();
      let best: { value: number; gap: number } | null = null;
      for (const pt of sorted) {
        const gap = Math.abs(new Date(pt.date).getTime() - targetTs);
        if (gap > MAX_GAP_MS) continue;
        if (!best || gap < best.gap) best = { value: pt.value, gap };
        else if (gap > best.gap) break; // les données sont triées, on peut sortir
      }
      return best?.value;
    };

    // ─────────────────────────────────────────────────────────────
    // Simulation de placement 100€ — règles officielles par produit
    //
    // Livret A / PEL / LEP : intérêts calculés par quinzaine,
    //   capitalisés UNE FOIS PAR AN le 31 décembre.
    //   En cours d'année : on accumule les intérêts acquis sans les capitaliser.
    //   Changements de taux pris en compte à leur date exacte.
    //
    // Fonds euros (assurance-vie) : participation aux bénéfices
    //   versée UNE FOIS PAR AN (créditée début janvier N+1).
    //   Taux appliqué = taux de l'année civile écoulée.
    //
    // SCPI : revenus distribués TRIMESTRIELLEMENT (rendement annuel / 4).
    //
    // OAT / TEC10 / Taux immo : capitalisation mensuelle (convention marché obligataire).
    // ─────────────────────────────────────────────────────────────

    // Définition des règles de capitalisation par produit
    type CompoundingRule = 'annual' | 'quarterly' | 'monthly';
    const COMPOUNDING_RULES: Record<string, CompoundingRule> = {
      livreta:      'annual',
      pel:          'annual',
      fondsEuros:   'annual',
      scpi:         'quarterly',
      oat:          'monthly',
      tec10:        'monthly',
      tauxImmo:     'monthly',
      tauxDepotBCE: 'monthly',
      estr:         'monthly',
    };

    const capitalizedCache: Record<string, Record<string, number>> = {};

    // Trouve le snapshot le plus proche dans le cache (pour les dates sans snapshot exact)
    const findClosestSnapshot = (snapshots: Record<string, number>, targetDate: string): number | undefined => {
      const targetTs = new Date(targetDate).getTime();
      let best: { value: number; gap: number } | null = null;
      for (const [date, value] of Object.entries(snapshots)) {
        const gap = Math.abs(new Date(date).getTime() - targetTs);
        if (!best || gap < best.gap) best = { value, gap };
      }
      return best?.value;
    };

    if (mode === 'percent') {
      indexedDatasets.forEach(ds => {
        if (ds.suffix !== '%') return;
        const rule = COMPOUNDING_RULES[ds.key];
        if (!rule) return;

        // Construire la liste chronologique des taux avec leurs dates de début
        // (depuis les données brutes du dataset, pas les sortedDates fusionnées)
        const rateChanges = [...ds.data].sort((a, b) => a.date.localeCompare(b.date));
        if (rateChanges.length === 0) return;

        // Date de début = premier point disponible
        const startDate = new Date(rateChanges[0].date);
        const endDate = new Date();

        // Fonction pour obtenir le taux en vigueur à une date donnée
        const getRateAt = (date: Date): number => {
          const dateStr = date.toISOString().split('T')[0];
          let rate = rateChanges[0].value;
          for (const pt of rateChanges) {
            if (pt.date <= dateStr) rate = pt.value;
            else break;
          }
          return rate;
        };

        // Simulation jour par jour en avançant par périodes selon la règle
        let capital = 100;
        const snapshots: Record<string, number> = {};

        if (rule === 'annual') {
          // Livret A / PEL / Fonds euros : capitalisation annuelle le 31 décembre
          // On accumule les intérêts par quinzaine (simplification : quotidien)
          // puis on capitalise au 31/12
          let pendingInterests = 0;
          let currentYear = startDate.getFullYear();
          const cursor = new Date(startDate);

          while (cursor <= endDate) {
            const year = cursor.getFullYear();

            // Changement d'année → capitaliser les intérêts accumulés
            if (year > currentYear) {
              capital += pendingInterests;
              pendingInterests = 0;
              currentYear = year;
            }

            // Intérêt du jour = capital * taux_annuel / 365
            const dailyRate = getRateAt(cursor) / 100 / 365;
            pendingInterests += capital * dailyRate;

            // Snapshot mensuel (1er du mois)
            if (cursor.getDate() === 1) {
              const dateStr = cursor.toISOString().split('T')[0];
              snapshots[dateStr] = parseFloat((capital + pendingInterests).toFixed(4));
            }

            cursor.setDate(cursor.getDate() + 1);
          }
          // Capitaliser les intérêts de l'année en cours
          capital += pendingInterests;
          const todayStr = endDate.toISOString().split('T')[0].substring(0, 7) + '-01';
          snapshots[todayStr] = parseFloat(capital.toFixed(4));

        } else if (rule === 'quarterly') {
          // SCPI : distribution trimestrielle = taux_annuel / 4
          const cursor = new Date(startDate);
          let quarter = Math.floor(cursor.getMonth() / 3);

          while (cursor <= endDate) {
            const currentQuarter = Math.floor(cursor.getMonth() / 3);

            if (currentQuarter !== quarter) {
              // Fin de trimestre : distribuer les revenus
              const rate = getRateAt(cursor) / 100 / 4;
              capital = capital * (1 + rate);
              quarter = currentQuarter;
            }

            if (cursor.getDate() === 1) {
              const dateStr = cursor.toISOString().split('T')[0];
              snapshots[dateStr] = parseFloat(capital.toFixed(4));
            }

            cursor.setMonth(cursor.getMonth() + 1);
          }

        } else {
          // monthly : capitalisation mensuelle (obligations, taux marché)
          const cursor = new Date(startDate);
          while (cursor <= endDate) {
            const dateStr = cursor.toISOString().split('T')[0];
            const monthlyRate = getRateAt(cursor) / 100 / 12;
            capital = capital * (1 + monthlyRate);
            snapshots[dateStr] = parseFloat(capital.toFixed(4));
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }

        capitalizedCache[ds.key] = snapshots;
      });
    }

    // Build chart data — valeur exacte si dispo, sinon valeur la plus proche (évite NA tooltip)
    const data = sortedDates.map(date => {
      const point: Record<string, any> = { date };
      
      indexedDatasets.forEach(ds => {
        const exactPoint = ds.data.find(d => d.date === date);
        const rawValue = exactPoint ? exactPoint.value : findClosest(ds.sorted, date);

        if (rawValue !== undefined) {
          if (mode === 'percent') {
            const isRate = ds.suffix === '%';

            if (isRate && capitalizedCache[ds.key]) {
              // Taux d'épargne/placement : simulation de 100€
              // On cherche le snapshot le plus proche
              const capVal = capitalizedCache[ds.key][date]
                ?? findClosestSnapshot(capitalizedCache[ds.key], date);
              if (capVal !== undefined) {
                point[ds.key] = parseFloat((capVal - 100).toFixed(2));
              }
            } else if (isRate) {
              // Taux non-épargne (inflation, prix immo) : variation en points
              const firstPoint = ds.data[0];
              const baseValue = firstPoint?.value || 1;
              point[ds.key] = rawValue - baseValue;
            } else {
              // Actifs (CAC, Or, BTC...) : variation en % par rapport au premier point
              const firstPoint = ds.data[0];
              const baseValue = firstPoint?.value || 1;
              point[ds.key] = ((rawValue - baseValue) / Math.abs(baseValue)) * 100;
            }
          } else {
            point[ds.key] = rawValue;
          }
        }
      });
      
      return point;
    });

    return data;
  }, [datasets, mode]);

  // Vérifier si assez de données pour les moyennes mobiles
  const dataAvailability = useMemo(() => {
    const dataLength = chartData.length;
    return {
      canShowMA50: dataLength >= 50,
      canShowMA200: dataLength >= 200,
      dataLength
    };
  }, [chartData]);

  // Calculate moving averages avec vérifications de sécurité
  const maData = useMemo(() => {
    if (!showMA50 && !showMA200) return chartData;
    if (chartData.length === 0) return chartData;
    
    return chartData.map((point, idx) => {
      const newPoint = { ...point };
      
      datasets.forEach(ds => {
        // Vérifier que la valeur existe pour ce dataset à cet index
        const currentValue = point[ds.key];
        
        // MA 50 - seulement si assez de données et valeur existe
        if (showMA50 && dataAvailability.canShowMA50 && idx >= 49) {
          const slice = chartData.slice(idx - 49, idx + 1);
          // Filtrer les valeurs undefined/null et calculer la moyenne
          const validValues = slice
            .map(p => p[ds.key])
            .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));
          
          if (validValues.length >= 25) { // Au moins 50% des valeurs nécessaires
            const sum = validValues.reduce((acc, v) => acc + v, 0);
            newPoint[`${ds.key}_ma50`] = sum / validValues.length;
          }
        }
        
        // MA 200 - seulement si assez de données et valeur existe
        if (showMA200 && dataAvailability.canShowMA200 && idx >= 199) {
          const slice = chartData.slice(idx - 199, idx + 1);
          // Filtrer les valeurs undefined/null et calculer la moyenne
          const validValues = slice
            .map(p => p[ds.key])
            .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));
          
          if (validValues.length >= 100) { // Au moins 50% des valeurs nécessaires
            const sum = validValues.reduce((acc, v) => acc + v, 0);
            newPoint[`${ds.key}_ma200`] = sum / validValues.length;
          }
        }
      });
      
      return newPoint;
    });
  }, [chartData, datasets, showMA50, showMA200, dataAvailability]);

  // Vérifier si les MA ont des données valides à afficher
  const maHasData = useMemo(() => {
    if (!maData || maData.length === 0) return { ma50: false, ma200: false };
    
    const hasMA50Data = datasets.some(ds => 
      maData.some(point => point[`${ds.key}_ma50`] !== undefined)
    );
    const hasMA200Data = datasets.some(ds => 
      maData.some(point => point[`${ds.key}_ma200`] !== undefined)
    );
    
    return { ma50: hasMA50Data, ma200: hasMA200Data };
  }, [maData, datasets]);

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

  // Custom tooltip - Affiche TOUS les indices sans NA
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !label) return null;
    
    const dataPoint = maData.find(d => d.date === label);
    const isExactDate = (ds: DatasetConfig) => ds.data.some(d => d.date === label);

    const SAVINGS_KEYS = ['livreta', 'pel', 'fondsEuros', 'estr', 'tauxDepotBCE', 'oat', 'tec10', 'tauxImmo', 'scpi'];

    // Détermine le suffixe à afficher selon le type de série et le mode
    const getValueSuffix = (ds: DatasetConfig) => {
      if (mode !== 'percent') return ` ${ds.suffix || ''}`;
      const isRate = ds.suffix === '%';
      if (isRate && SAVINGS_KEYS.includes(ds.key)) return '%'; // gain sur 100€
      if (isRate) return ' pts';
      return '%';
    };

    // Label explicatif sous le titre en mode percent pour les taux épargne
    const getSavingsLabel = (ds: DatasetConfig, value: number) => {
      if (mode !== 'percent' || ds.suffix !== '%' || !SAVINGS_KEYS.includes(ds.key)) return null;
      const total = 100 + value;
      return `≈ ${total.toFixed(2)}€ pour 100€ investis`;
    };
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[220px]">
        <p className="text-sm font-semibold text-muted-foreground mb-2 pb-2 border-b border-border">
          {new Date(label).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </p>
        <div className="space-y-1.5">
          {datasets.map((ds) => {
            const value = dataPoint?.[ds.key];
            const ma50Value = dataPoint?.[`${ds.key}_ma50`];
            const ma200Value = dataPoint?.[`${ds.key}_ma200`];
            const hasValue = value !== undefined && value !== null;
            const isApprox = hasValue && !isExactDate(ds);
            const savingsLabel = hasValue ? getSavingsLabel(ds, value) : null;
            
            return (
              <div key={ds.key} className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: ds.color }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {ds.title}
                    </span>
                  </div>
                  {hasValue ? (
                    <div className="flex items-center gap-1">
                      {isApprox && (
                        <span className="text-xs text-muted-foreground opacity-60" title="Valeur approchée">≈</span>
                      )}
                      <span className={cn(
                        "text-sm font-bold",
                        mode === 'percent'
                          ? value >= 0 ? 'text-green-600' : 'text-red-600'
                          : 'text-foreground'
                      )}>
                        {mode === 'percent' && value >= 0 ? '+' : ''}
                        {formatNumber(value, 2)}
                        {getValueSuffix(ds)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic opacity-50">hors période</span>
                  )}
                </div>
                {/* Label explicatif pour les taux épargne */}
                {savingsLabel && (
                  <p className="text-xs text-muted-foreground pl-5 opacity-70">{savingsLabel}</p>
                )}
                {showMA50 && ma50Value !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-5 text-xs text-muted-foreground">
                    <span>└ MM 50j</span>
                    <span>{formatNumber(ma50Value, 2)}</span>
                  </div>
                )}
                {showMA200 && ma200Value !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-5 text-xs text-muted-foreground">
                    <span>└ MM 200j</span>
                    <span>{formatNumber(ma200Value, 2)}</span>
                  </div>
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
      if (values.length === 0) return ['auto', 'auto'];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1 || 1;
      return [min - padding, max + padding];
    });
  }, [chartData, datasets, mode]);

  // Déterminer le yAxisId pour un dataset donné
  const getYAxisId = (dsIndex: number): string | undefined => {
    if (mode === 'real' && datasets.length <= 2) {
      return dsIndex === 0 ? 'left' : 'right';
    }
    return undefined;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {datasets.length === 1 && onToggleMA50 && onToggleMA200 && (
              <>
                {/* MM 50j avec tooltip explicatif */}
                <div className="flex items-center gap-1">
                  <label className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer",
                    !dataAvailability.canShowMA50 && "opacity-50 cursor-not-allowed"
                  )}>
                    <Checkbox 
                      checked={showMA50 && dataAvailability.canShowMA50} 
                      onCheckedChange={() => dataAvailability.canShowMA50 && onToggleMA50()}
                      disabled={!dataAvailability.canShowMA50}
                    />
                    <span className="text-muted-foreground">MM 50j</span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      <p>{MA_TOOLTIPS.ma50}</p>
                      {!dataAvailability.canShowMA50 && (
                        <p className="mt-2 text-yellow-500 font-medium">
                          ⚠️ Pas assez de données ({dataAvailability.dataLength} points, 50 requis)
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* MM 200j avec tooltip explicatif */}
                <div className="flex items-center gap-1">
                  <label className={cn(
                    "flex items-center gap-2 text-sm cursor-pointer",
                    !dataAvailability.canShowMA200 && "opacity-50 cursor-not-allowed"
                  )}>
                    <Checkbox 
                      checked={showMA200 && dataAvailability.canShowMA200} 
                      onCheckedChange={() => dataAvailability.canShowMA200 && onToggleMA200()}
                      disabled={!dataAvailability.canShowMA200}
                    />
                    <span className="text-muted-foreground">MM 200j</span>
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      <p>{MA_TOOLTIPS.ma200}</p>
                      {!dataAvailability.canShowMA200 && (
                        <p className="mt-2 text-yellow-500 font-medium">
                          ⚠️ Pas assez de données ({dataAvailability.dataLength} points, 200 requis)
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
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

        {/* Message contextuel quand les MA sont activées */}
        {(showMA50 || showMA200) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p>
              Les moyennes mobiles lissent les variations et aident à identifier les tendances.
              {showMA50 && !showMA200 && " La MM 50j (ligne pointillée) indique la tendance à moyen terme."}
              {!showMA50 && showMA200 && " La MM 200j (ligne pointillée longue) indique la tendance de fond."}
              {showMA50 && showMA200 && " MM 50j (pointillés courts) = moyen terme, MM 200j (pointillés longs) = long terme."}
            </p>
          </div>
        )}

        {/* Chart */}
        <div ref={chartRef} className="bg-card rounded-xl p-4">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={maData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => formatXAxisDate(date, period)}
                className="text-xs"
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickLine={{ stroke: 'currentColor' }}
                axisLine={{ stroke: 'currentColor' }}
                interval={getTickInterval(maData.length, period)}
                minTickGap={30}
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

              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => {
                  // Améliorer l'affichage de la légende
                  if (value.endsWith('_ma50')) {
                    return 'MM 50j (pointillés)';
                  }
                  if (value.endsWith('_ma200')) {
                    return 'MM 200j (pointillés longs)';
                  }
                  const ds = datasets.find(d => d.key === value);
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
                  yAxisId={getYAxisId(idx)}
                  connectNulls
                  name={ds.title}
                />
              ))}

              {/* Moving averages - seulement si des données valides existent */}
              {showMA50 && maHasData.ma50 && datasets.map((ds, idx) => (
                <Line
                  key={`${ds.key}_ma50`}
                  type="monotone"
                  dataKey={`${ds.key}_ma50`}
                  stroke={ds.color}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name={`${ds.title} MM 50j`}
                  connectNulls
                  yAxisId={getYAxisId(idx)}
                  opacity={0.7}
                />
              ))}

              {showMA200 && maHasData.ma200 && datasets.map((ds, idx) => (
                <Line
                  key={`${ds.key}_ma200`}
                  type="monotone"
                  dataKey={`${ds.key}_ma200`}
                  stroke={ds.color}
                  strokeWidth={1.5}
                  strokeDasharray="10 5"
                  dot={false}
                  name={`${ds.title} MM 200j`}
                  connectNulls
                  yAxisId={getYAxisId(idx)}
                  opacity={0.5}
                />
              ))}

              {/* Brush for zoom */}
              <Brush 
                dataKey="date" 
                height={30} 
                stroke="#8884d8"
                tickFormatter={(date) => formatXAxisDate(date, period)}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Légende améliorée pour les lignes */}
        {(showMA50 || showMA200) && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-current" />
              <span>Valeur réelle</span>
            </div>
            {showMA50 && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-current" style={{ 
                  background: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 3px, transparent 3px, transparent 6px)' 
                }} />
                <span>MM 50 jours</span>
              </div>
            )}
            {showMA200 && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-current" style={{ 
                  background: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 6px, transparent 6px, transparent 10px)' 
                }} />
                <span>MM 200 jours</span>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
