'use client';

import { useState, useMemo, useEffect } from 'react';
import { EnhancedChart } from './enhanced-chart';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { 
  calculateAllStats, 
  calculateCorrelation, 
  filterDataByPeriod,
  formatNumber,
  FinancialStats
} from '@/lib/financial-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, TrendingUp, BarChart3, X, HelpCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ComparatorProps {
  indices: Record<string, Indicateur>;
  selectedKeys: string[];
  onKeysChange: (keys: string[]) => void;
}

type Period = '1M' | '3M' | '6M' | '1A' | '5A' | 'YTD' | 'MAX' | 'CUSTOM';

// Types pour l'analyse de compatibilité des modes
type ModeRecommendation = 'real' | 'percent' | 'both';
type CompatibilityLevel = 'compatible' | 'warning' | 'incompatible';

interface ModeAnalysis {
  recommendation: ModeRecommendation;
  compatibilityLevel: CompatibilityLevel;
  message: string;
  forceBase100: boolean;
}

// Fonction pour analyser la compatibilité des indices sélectionnés
function analyzeModeCompatibility(
  selectedKeys: string[],
  indices: Record<string, { valeur: number; suffixe: string }>
): ModeAnalysis {
  if (selectedKeys.length === 0) {
    return {
      recommendation: 'both',
      compatibilityLevel: 'compatible',
      message: '',
      forceBase100: false
    };
  }

  // Récupérer les catégories et valeurs des indices sélectionnés
  const selectedData = selectedKeys.map(key => ({
    key,
    category: INDEX_EDUCATION[key]?.category || 'unknown',
    value: indices[key]?.valeur || 0,
    suffix: indices[key]?.suffixe || ''
  }));

  // Obtenir les catégories uniques
  const categories = new Set(selectedData.map(d => d.category));
  const values = selectedData.map(d => Math.abs(d.value));
  
  // Calculer le ratio max/min des valeurs
  const minVal = Math.min(...values.filter(v => v > 0));
  const maxVal = Math.max(...values);
  const valueRatio = minVal > 0 ? maxVal / minVal : Infinity;

  // Vérifier si Bitcoin est présent avec d'autres indices
  const hasBitcoin = selectedKeys.includes('btc');
  const hasSmallValues = selectedData.some(d => 
    d.suffix === '%' || Math.abs(d.value) < 100
  );
  const hasLargeValues = selectedData.some(d => 
    Math.abs(d.value) > 10000
  );

  // Cas 1: Bitcoin avec des taux ou indices à petites valeurs
  if (hasBitcoin && hasSmallValues) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'incompatible',
      message: '⚠️ Bitcoin et indices avec des échelles très différentes détectés. La Base 100 est obligatoire pour une comparaison pertinente.',
      forceBase100: true
    };
  }

  // Cas 2: Ratio de valeurs > 100 (ex: BTC ~50000 vs Inflation ~2)
  if (valueRatio > 100) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'incompatible',
      message: '⚠️ Attention: les échelles des indices sélectionnés sont très différentes. La Base 100 est fortement recommandée.',
      forceBase100: true
    };
  }

  // Cas 3: Catégories mixtes
  if (categories.size > 1) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'warning',
      message: '💡 Les indices sélectionnés ont des catégories différentes. La Base 100 permet de comparer les performances relatives.',
      forceBase100: false
    };
  }

  // Cas 4: Même catégorie
  const categoryName = Array.from(categories)[0];
  const categoryLabels: Record<string, string> = {
    'rates': 'taux',
    'stocks': 'actions',
    'forex': 'devises',
    'commodities': 'matières premières',
    'crypto': 'cryptomonnaies',
    'real_estate': 'immobilier'
  };

  return {
    recommendation: 'real',
    compatibilityLevel: 'compatible',
    message: `✓ Tous les indices sont des ${categoryLabels[categoryName] || 'indices similaires'}. La valeur absolue permet de voir les niveaux réels.`,
    forceBase100: false
  };
}

export function Comparator({ indices, selectedKeys, onKeysChange }: ComparatorProps) {
  const [period, setPeriod] = useState<Period>('1A');
  const [mode, setMode] = useState<'real' | 'percent' | 'absolute'>('percent');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showMA50, setShowMA50] = useState(false);
  const [showMA200, setShowMA200] = useState(false);
  const [userOverrodeMode, setUserOverrodeMode] = useState(false);

  // Available indices for selection
  const availableIndices = Object.keys(indices);

  // Analyse de compatibilité des modes
  const modeAnalysis = useMemo(() => 
    analyzeModeCompatibility(selectedKeys, indices), 
    [selectedKeys, indices]
  );

  // Présélection automatique du mode selon les indices
  useEffect(() => {
    if (!userOverrodeMode && selectedKeys.length > 0) {
      if (modeAnalysis.forceBase100 || modeAnalysis.recommendation === 'percent') {
        setMode('percent');
      } else if (modeAnalysis.recommendation === 'real') {
        setMode('real');
      }
    }
  }, [selectedKeys, modeAnalysis, userOverrodeMode]);

  // Reset le flag quand la sélection change significativement
  useEffect(() => {
    setUserOverrodeMode(false);
  }, [selectedKeys.length]);

  // Filter data by period
  const filteredData = useMemo(() => {
    return selectedKeys.map(key => {
      const index = indices[key];
      if (!index) return null;
      
      const filtered = period === 'CUSTOM' && customDateRange.from && customDateRange.to
        ? filterDataByPeriod(index.historique, 'MAX', customDateRange.from, customDateRange.to)
        : filterDataByPeriod(index.historique, period === 'CUSTOM' ? 'MAX' : period);
      
      return {
        key,
        data: filtered,
        color: INDEX_EDUCATION[key]?.color || '#64748b',
        title: index.titre,
        suffix: index.suffixe
      };
    }).filter(Boolean) as { key: string; data: DataPoint[]; color: string; title: string; suffix: string }[];
  }, [indices, selectedKeys, period, customDateRange]);

  // Calculate statistics for each selected index
  const statistics = useMemo(() => {
    return filteredData.map(ds => {
      const stats = calculateAllStats(ds.data);
      return {
        key: ds.key,
        title: ds.title,
        suffix: ds.suffix,
        color: ds.color,
        ...stats
      };
    });
  }, [filteredData]);

  // Calculate correlation matrix
  const correlationMatrix = useMemo(() => {
    if (filteredData.length < 2) return null;
    
    const matrix: Record<string, Record<string, number>> = {};
    
    filteredData.forEach(ds1 => {
      matrix[ds1.key] = {};
      filteredData.forEach(ds2 => {
        if (ds1.key === ds2.key) {
          matrix[ds1.key][ds2.key] = 1;
        } else {
          matrix[ds1.key][ds2.key] = calculateCorrelation(ds1.data, ds2.data);
        }
      });
    });
    
    return matrix;
  }, [filteredData]);

  // Toggle index selection
  const toggleIndex = (key: string) => {
    if (selectedKeys.includes(key)) {
      onKeysChange(selectedKeys.filter(k => k !== key));
    } else if (selectedKeys.length < 5) {
      onKeysChange([...selectedKeys, key]);
    }
  };

  // Are all selected indices rates?
  const areAllRates = filteredData.every(ds => ds.suffix === '%');

  // Period buttons config
  const periodButtons: { value: Period; label: string }[] = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1A', label: '1A' },
    { value: '5A', label: '5A' },
    { value: 'YTD', label: 'YTD' },
    { value: 'MAX', label: 'Max' },
  ];

  return (
    <div className="space-y-6">
      {/* Index Selection */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Sélection des indices (max 5)
        </h3>
        <div className="flex flex-wrap gap-3">
          {availableIndices.map(key => {
            const index = indices[key];
            const education = INDEX_EDUCATION[key];
            const isSelected = selectedKeys.includes(key);
            
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleIndex(key)}
                      disabled={!isSelected && selectedKeys.length >= 5}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        'border',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                        !isSelected && selectedKeys.length >= 5 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: education?.color || '#64748b' }}
                      />
                      {index.titre}
                      {isSelected && (
                        <X className="h-3 w-3 ml-1 hover:text-destructive" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">{education?.shortDescription || index.titre}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
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

        {/* Custom date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={period === 'CUSTOM' ? 'default' : 'outline'}
              size="sm"
              className="h-8"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {period === 'CUSTOM' && customDateRange.from && customDateRange.to
                ? `${format(customDateRange.from, 'dd/MM/yy')} - ${format(customDateRange.to, 'dd/MM/yy')}`
                : 'Personnalisé'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: customDateRange.from, to: customDateRange.to }}
              onSelect={(range) => {
                setCustomDateRange({ from: range?.from, to: range?.to });
                if (range?.from && range?.to) {
                  setPeriod('CUSTOM');
                }
              }}
              locale={fr}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Mode buttons avec tooltip d'aide */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === 'real' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setMode('real');
                      setUserOverrodeMode(true);
                    }}
                    disabled={modeAnalysis.forceBase100}
                    className={cn(
                      "h-8",
                      modeAnalysis.forceBase100 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Valeurs
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Valeur absolue :</strong> Affiche les valeurs réelles des indices 
                    (ex: CAC 40 = 7500 points, OAT = 3.2%)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {areAllRates && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === 'absolute' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setMode('absolute');
                        setUserOverrodeMode(true);
                      }}
                      className="h-8"
                    >
                      Absolu
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">
                      <strong>Valeurs absolues :</strong> Affiche les valeurs réelles des indices 
                      (ex: CAC 40 = 7500 points). Utile pour comparer des indices de même nature.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === 'percent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setMode('percent');
                      setUserOverrodeMode(true);
                    }}
                    className="h-8"
                  >
                    Base 100
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Base 100 :</strong> Normalise tous les indices à 100 au début de la période 
                    pour comparer les performances relatives (ex: +15% vs +8%)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Icône d'aide générale */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-muted transition-colors">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm p-3">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Quel mode choisir ?</p>
                  <p>
                    <strong>Valeurs :</strong> Pour comparer des indices de même type 
                    (ex: CAC 40 vs S&P 500)
                  </p>
                  <p>
                    <strong>Base 100 :</strong> Pour comparer des indices d'échelles différentes 
                    (ex: CAC 40 vs Bitcoin vs Inflation)
                  </p>
                  <p className="text-muted-foreground italic">
                    💡 Le mode est présélectionné automatiquement selon vos indices.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Message d'aide contextuel */}
      {selectedKeys.length > 1 && modeAnalysis.message && (
        <Alert 
          variant={modeAnalysis.compatibilityLevel === 'incompatible' ? 'destructive' : 'default'}
          className={cn(
            "py-2",
            modeAnalysis.compatibilityLevel === 'compatible' && 'border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900',
            modeAnalysis.compatibilityLevel === 'warning' && 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900',
          )}
        >
          <AlertDescription className="flex items-center gap-2 text-sm">
            {modeAnalysis.compatibilityLevel === 'incompatible' && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            )}
            {modeAnalysis.compatibilityLevel === 'warning' && (
              <Lightbulb className="h-4 w-4 flex-shrink-0 text-yellow-600" />
            )}
            {modeAnalysis.compatibilityLevel === 'compatible' && (
              <span className="text-green-600">✓</span>
            )}
            {modeAnalysis.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Chart */}
      {selectedKeys.length > 0 && (
        <EnhancedChart
          datasets={filteredData}
          mode={mode}
          period={period}
          showMA50={showMA50}
          showMA200={showMA200}
          onToggleMA50={() => setShowMA50(!showMA50)}
          onToggleMA200={() => setShowMA200(!showMA200)}
        />
      )}

      {/* Statistics Table */}
      {statistics.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Statistiques comparatives
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Indice</TableHead>
                  <TableHead className="text-right">Début</TableHead>
                  <TableHead className="text-right">Fin</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Rendement
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-semibold mb-1">Rendement Total</p>
                          <p className="text-sm">Performance totale sur la période sélectionnée, en pourcentage.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Rend. Annualisé
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-semibold mb-1">Rendement Annualisé</p>
                          <p className="text-sm">Performance moyenne par an, calculée sur la période. Permet de comparer des périodes différentes.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Volatilité
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-semibold mb-1">Volatilité</p>
                          <p className="text-sm">Écart-type des rendements. Mesure le risque et la variabilité de l'indice. Plus c'est élevé, plus c'est risqué.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Max Drawdown
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-semibold mb-1">Maximum Drawdown</p>
                          <p className="text-sm">Plus forte baisse depuis un sommet. Mesure la perte maximale subie sur la période.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Sharpe
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-semibold mb-1">Ratio de Sharpe</p>
                          <p className="text-sm">Rendement ajusté du risque. Mesure le rendement excédentaire par unité de risque. Plus c'est élevé, meilleur est le rapport rendement/risque.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistics.map(stat => (
                  <TableRow key={stat.key}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stat.color }}
                        />
                        {stat.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.startValue)} {stat.suffix}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.endValue)} {stat.suffix}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      stat.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {stat.totalReturn >= 0 ? '+' : ''}{formatNumber(stat.totalReturn)}%
                    </TableCell>
                    <TableCell className={cn(
                      "text-right",
                      stat.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {stat.annualizedReturn >= 0 ? '+' : ''}{formatNumber(stat.annualizedReturn)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(stat.volatility)}%
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatNumber(stat.maxDrawdown)}%
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      stat.sharpeRatio >= 1 ? 'text-green-600' : 
                      stat.sharpeRatio >= 0 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {formatNumber(stat.sharpeRatio)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Correlation Matrix */}
      {correlationMatrix && Object.keys(correlationMatrix).length > 1 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Matrice de Corrélation
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Corrélation des rendements sur la période sélectionnée
            </p>
          </div>
          <div className="overflow-x-auto p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]"></TableHead>
                  {filteredData.map(ds => (
                    <TableHead key={ds.key} className="text-center min-w-[100px]">
                      <span className="text-xs">{ds.title}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(ds1 => (
                  <TableRow key={ds1.key}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ds1.color }}
                        />
                        <span className="text-xs">{ds1.title}</span>
                      </div>
                    </TableCell>
                    {filteredData.map(ds2 => {
                      const corr = correlationMatrix[ds1.key][ds2.key];
                      const intensity = Math.abs(corr);
                      const bgColor = ds1.key === ds2.key 
                        ? 'bg-muted'
                        : corr > 0 
                          ? `rgba(22, 163, 74, ${intensity * 0.5})`
                          : `rgba(239, 68, 68, ${intensity * 0.5})`;
                      
                      return (
                        <TableCell 
                          key={ds2.key} 
                          className="text-center font-mono text-sm"
                          style={{ backgroundColor: ds1.key !== ds2.key ? bgColor : undefined }}
                        >
                          {ds1.key === ds2.key ? '—' : formatNumber(corr, 2)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} />
                Corrélation négative
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded bg-muted" />
                Neutre
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(22, 163, 74, 0.5)' }} />
                Corrélation positive
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
