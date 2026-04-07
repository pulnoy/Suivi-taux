'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { EnhancedChart } from './enhanced-chart';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import {
  calculateAllStats,
  filterDataByPeriod,
  formatNumber,
  FinancialStats,
  computeCapitalizedSeries,
  calculateMonthlyIRR,
  SAVINGS_KEYS,
  COMPOUNDING_RULES
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, BarChart3, X, HelpCircle, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Play, Euro } from 'lucide-react';
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

interface ComparatorProps {
  indices: Record<string, Indicateur>;
  selectedKeys: string[];
  onKeysChange: (keys: string[]) => void;
}

type Period = '1M' | '3M' | '6M' | '1A' | '5A' | '10A' | '18A' | '20A' | 'YTD' | 'MAX' | 'CUSTOM';

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

  const selectedData = selectedKeys.map(key => ({
    key,
    category: INDEX_EDUCATION[key]?.category || 'unknown',
    value: indices[key]?.valeur || 0,
    suffix: indices[key]?.suffixe || ''
  }));

  const categories = new Set(selectedData.map(d => d.category));
  const values = selectedData.map(d => Math.abs(d.value));
  
  const minVal = Math.min(...values.filter(v => v > 0));
  const maxVal = Math.max(...values);
  const valueRatio = minVal > 0 ? maxVal / minVal : Infinity;

  const hasBitcoin = selectedKeys.includes('btc');
  const hasSmallValues = selectedData.some(d => 
    d.suffix === '%' || Math.abs(d.value) < 100
  );
  const hasLargeValues = selectedData.some(d => 
    Math.abs(d.value) > 10000
  );

  if (hasBitcoin && hasSmallValues) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'incompatible',
      message: '⚠️ Bitcoin et indices avec des échelles très différentes détectés. La Base 100 est obligatoire pour une comparaison pertinente.',
      forceBase100: true
    };
  }

  if (valueRatio > 100) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'incompatible',
      message: '⚠️ Attention: les échelles des indices sélectionnés sont très différentes. La Base 100 est fortement recommandée.',
      forceBase100: true
    };
  }

  if (categories.size > 1) {
    return {
      recommendation: 'percent',
      compatibilityLevel: 'warning',
      message: '💡 Les indices sélectionnés ont des catégories différentes. La Base 100 permet de comparer les performances relatives.',
      forceBase100: false
    };
  }

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

// ─── Date format helpers (pure, outside component) ───
function toDisplayDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
function parseDisplayDate(display: string): string | null {
  const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function Comparator({ indices, selectedKeys, onKeysChange }: ComparatorProps) {
  const [period, setPeriod] = useState<Period>('5A');
  const [mode, setMode] = useState<'real' | 'percent' | 'absolute'>('percent');
  const [showMA50, setShowMA50] = useState(false);
  const [showMA200, setShowMA200] = useState(false);
  const [userOverrodeMode, setUserOverrodeMode] = useState(false);
  const [showIndicesSection, setShowIndicesSection] = useState(true);
  
  // Brush date range from slider
  const [brushStartDate, setBrushStartDate] = useState<string | null>(null);
  const [brushEndDate, setBrushEndDate] = useState<string | null>(null);

  // Debounced brush start for chart normalisation (avoids feedback loop during drag)
  const [normalizeFromDate, setNormalizeFromDate] = useState<string | null>(null);
  const brushDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dateInputDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // External brush control (from date inputs → visual slider)
  const [externalBrushStartDate, setExternalBrushStartDate] = useState<string | null>(null);
  const [externalBrushEndDate, setExternalBrushEndDate] = useState<string | null>(null);

  // Date input fields (dd/mm/yyyy) displayed in the stats section
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');

  // Placement simulation state
  const [placementAmount, setPlacementAmount] = useState<string>('1000');
  const [localPlacementAmount, setLocalPlacementAmount] = useState<string>('1000');
  const [simulationActive, setSimulationActive] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState<string>('0');
  const [localMonthlyPayment, setLocalMonthlyPayment] = useState<string>('0');
  const [showSimPanel, setShowSimPanel] = useState(false);

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

  // Handle brush change from chart (drag or zoom)
  const handleBrushChange = useCallback((startDate: string | null, endDate: string | null) => {
    setBrushStartDate(startDate);
    setBrushEndDate(endDate);
    // Debounce date-input text updates (150ms) to limit Comparator re-renders during drag.
    // This reduces how often EnhancedChart re-renders while the user is dragging.
    clearTimeout(dateInputDebounceRef.current);
    dateInputDebounceRef.current = setTimeout(() => {
      if (startDate) setStartDateInput(toDisplayDate(startDate));
      if (endDate) setEndDateInput(toDisplayDate(endDate));
    }, 150);
    // Debounce normalizeFromDate (500ms) to let drag finish before renormalising chart.
    clearTimeout(brushDebounceRef.current);
    brushDebounceRef.current = setTimeout(() => {
      setNormalizeFromDate(startDate);
    }, 500);
  }, []);

  // Submit date inputs → update brush + slider
  const handleDateInputSubmit = useCallback(() => {
    const startISO = parseDisplayDate(startDateInput);
    const endISO = parseDisplayDate(endDateInput);
    // Fallback sur les dates courantes du brush si un champ est vide
    const effectiveStart = startISO ?? brushStartDate;
    const effectiveEnd = endISO ?? brushEndDate;
    if (effectiveStart) {
      setBrushStartDate(effectiveStart);
      setNormalizeFromDate(effectiveStart);
    }
    if (effectiveEnd) setBrushEndDate(effectiveEnd);
    if (effectiveStart || effectiveEnd) {
      setExternalBrushStartDate(effectiveStart);
      setExternalBrushEndDate(effectiveEnd);
    }
  }, [startDateInput, endDateInput, brushStartDate, brushEndDate]);

  // Filter data by period
  const filteredData = useMemo(() => {
    return selectedKeys.map(key => {
      const index = indices[key];
      if (!index) return null;
      
      const filtered = filterDataByPeriod(index.historique, period === 'CUSTOM' ? 'MAX' : period);
      
      return {
        key,
        data: filtered,
        color: INDEX_EDUCATION[key]?.color || '#64748b',
        title: index.titre,
        suffix: index.suffixe
      };
    }).filter(Boolean) as { key: string; data: DataPoint[]; color: string; title: string; suffix: string }[];
  }, [indices, selectedKeys, period]);

  // Data filtered by brush range (for statistics recalculation)
  const brushFilteredData = useMemo(() => {
    if (!brushStartDate || !brushEndDate) return filteredData;
    
    return filteredData.map(ds => {
      const brushedData = ds.data.filter(d => d.date >= brushStartDate && d.date <= brushEndDate);
      return {
        ...ds,
        data: brushedData.length > 0 ? brushedData : ds.data
      };
    });
  }, [filteredData, brushStartDate, brushEndDate]);

  // Computed placement amount for the chart (must be declared before statistics)
  const effectivePlacementAmount = useMemo(() => {
    if (!simulationActive) return null;
    const parsed = parseFloat(placementAmount);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }, [simulationActive, placementAmount]);

  const effectiveMonthlyPayment = useMemo(() => {
    if (!simulationActive) return null;
    const parsed = parseFloat(monthlyPayment);
    return !isNaN(parsed) && parsed >= 0 ? parsed : null;
  }, [simulationActive, monthlyPayment]);

  // Calculate statistics based on brush-filtered data
  // In percent mode: all indices normalised to base 100 (or simulation amount) for consistent display
  const statistics = useMemo(() => {
    const baseAmt = (simulationActive && effectivePlacementAmount) ? effectivePlacementAmount : 100;
    const hasDCA = !!(effectiveMonthlyPayment && effectiveMonthlyPayment > 0);

    return brushFilteredData.map(ds => {
      const isSavings = ds.suffix === '%' && SAVINGS_KEYS.includes(ds.key);

      // ── DCA mode: compute portfolio with monthly contributions ──
      if (hasDCA && mode === 'percent') {
        const sortedData = [...ds.data].sort((a, b) => a.date.localeCompare(b.date));
        if (sortedData.length < 2) return null;

        const startDate = new Date(sortedData[0].date);
        // Always use today as end: sparse rate data may not extend to today,
        // but the last known rate/price applies until now.
        const endDate = new Date();

        const getValAt = (dateStr: string): number => {
          let val = sortedData[0].value;
          for (const pt of sortedData) {
            if (pt.date <= dateStr) val = pt.value;
            else break;
          }
          return val;
        };

        // Build DCA portfolio value series
        const dcaSeries: { date: string; value: number }[] = [];

        // Count actual payment iterations — source of truth for totalInvested
        let paymentCount = 0;

        if (isSavings) {
          const rule = COMPOUNDING_RULES[ds.key] || 'monthly';
          let capital = baseAmt;
          dcaSeries.push({ date: sortedData[0].date, value: capital });
          const cursor = new Date(startDate);

          if (rule === 'annual') {
            let pendingInterest = 0;
            let currentYear = startDate.getFullYear();
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate) {
              const year = cursor.getFullYear();
              if (year > currentYear) {
                capital += pendingInterest;
                pendingInterest = 0;
                currentYear = year;
              }
              capital += effectiveMonthlyPayment;
              paymentCount++;
              const monthlyAccrual = getValAt(cursor.toISOString().split('T')[0]) / 100 / 365 * 30.4375;
              pendingInterest += capital * monthlyAccrual;
              dcaSeries.push({ date: cursor.toISOString().split('T')[0], value: parseFloat((capital + pendingInterest).toFixed(4)) });
              cursor.setMonth(cursor.getMonth() + 1);
            }
          } else if (rule === 'quarterly') {
            let quarter = Math.floor(startDate.getMonth() / 3);
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate) {
              const currentQuarter = Math.floor(cursor.getMonth() / 3);
              if (currentQuarter !== quarter) {
                const rate = getValAt(cursor.toISOString().split('T')[0]) / 100 / 4;
                capital = capital * (1 + rate);
                quarter = currentQuarter;
              }
              capital += effectiveMonthlyPayment;
              paymentCount++;
              dcaSeries.push({ date: cursor.toISOString().split('T')[0], value: parseFloat(capital.toFixed(4)) });
              cursor.setMonth(cursor.getMonth() + 1);
            }
          } else {
            // Monthly compounding
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate) {
              const monthlyRate = getValAt(cursor.toISOString().split('T')[0]) / 100 / 12;
              capital = capital * (1 + monthlyRate) + effectiveMonthlyPayment;
              paymentCount++;
              dcaSeries.push({ date: cursor.toISOString().split('T')[0], value: parseFloat(capital.toFixed(4)) });
              cursor.setMonth(cursor.getMonth() + 1);
            }
          }
        } else {
          // Price-based DCA
          const t0Price = sortedData[0].value || 1;
          const schedule: { date: string; cumUnits: number }[] = [];
          let cumUnits = baseAmt / t0Price;
          schedule.push({ date: sortedData[0].date, cumUnits });
          const cursor = new Date(startDate);
          cursor.setMonth(cursor.getMonth() + 1);
          while (cursor <= endDate) {
            const dateStr = cursor.toISOString().split('T')[0];
            const price = getValAt(dateStr) || 1;
            cumUnits += effectiveMonthlyPayment / price;
            paymentCount++;
            schedule.push({ date: dateStr, cumUnits });
            cursor.setMonth(cursor.getMonth() + 1);
          }
          let schedIdx = 0;
          let curUnits = 0;
          for (const pt of sortedData) {
            while (schedIdx < schedule.length && schedule[schedIdx].date <= pt.date) {
              curUnits = schedule[schedIdx].cumUnits;
              schedIdx++;
            }
            dcaSeries.push({ date: pt.date, value: parseFloat((curUnits * pt.value).toFixed(4)) });
          }
        }

        if (dcaSeries.length < 2) return null;

        // totalInvested uses actual payment count — never mismatched across products
        const totalInvested = baseAmt + effectiveMonthlyPayment * paymentCount;
        const finalValue = dcaSeries[dcaSeries.length - 1].value;
        const totalReturn = (finalValue - totalInvested) / totalInvested * 100;

        // Build IRR cash flows
        const cashFlows: number[] = [-baseAmt];
        for (let m = 0; m < paymentCount; m++) cashFlows.push(-effectiveMonthlyPayment);
        cashFlows.push(finalValue);
        const irr = calculateMonthlyIRR(cashFlows);

        const portfolioStats = calculateAllStats(dcaSeries);

        return {
          key: ds.key,
          title: ds.title,
          suffix: '€',
          color: ds.color,
          isSavings,
          startValue: baseAmt,
          endValue: finalValue,
          totalReturn,
          annualizedReturn: irr,
          volatility: portfolioStats.volatility,
          maxDrawdown: portfolioStats.maxDrawdown,
          sharpeRatio: portfolioStats.sharpeRatio,
          totalInvested,
        };
      }

      // ── Standard mode (no DCA) ──
      if (mode === 'percent') {
        if (isSavings) {
          const capSeries = computeCapitalizedSeries(ds.data, ds.key, baseAmt);
          if (capSeries.length >= 2) {
            const stats = calculateAllStats(capSeries);
            return { key: ds.key, title: ds.title, suffix: '€', color: ds.color, isSavings: true, ...stats };
          }
        } else if (ds.data.length >= 2) {
          const startVal = ds.data[0].value;
          if (startVal !== 0) {
            const normalizedData = ds.data.map(d => ({
              ...d,
              value: baseAmt * (1 + (d.value - startVal) / Math.abs(startVal))
            }));
            const stats = calculateAllStats(normalizedData);
            return { key: ds.key, title: ds.title, suffix: '€', color: ds.color, isSavings: false, ...stats };
          }
        }
      } else if (isSavings) {
        const capSeries = computeCapitalizedSeries(ds.data, ds.key, 100);
        if (capSeries.length >= 2) {
          const stats = calculateAllStats(capSeries);
          return { key: ds.key, title: ds.title, suffix: '€ (base 100)', color: ds.color, isSavings: true, ...stats };
        }
      }

      const stats = calculateAllStats(ds.data);
      return { key: ds.key, title: ds.title, suffix: ds.suffix, color: ds.color, isSavings: false, ...stats };
    }).filter(Boolean) as any[];
  }, [brushFilteredData, mode, simulationActive, effectivePlacementAmount, effectiveMonthlyPayment]);

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
    { value: '10A', label: '10A' },
    { value: '18A', label: '18A' },
    { value: '20A', label: '20A' },
    { value: 'YTD', label: 'YTD' },
    { value: 'MAX', label: 'Max' },
  ];

  // Grouper les indices par catégorie
  const CATEGORY_ORDER = [
    { id: 'rates',        label: 'Taux & Épargne',     icon: '📊' },
    { id: 'real_estate',  label: 'Immobilier',          icon: '🏢' },
    { id: 'stocks',       label: 'Actions',             icon: '📈' },
    { id: 'forex',        label: 'Devises',             icon: '💱' },
    { id: 'commodities',  label: 'Matières premières',  icon: '🛢️' },
    { id: 'crypto',       label: 'Crypto',              icon: '₿'  },
  ];

  const indicesByCategory = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const key of Object.keys(indices)) {
      const cat = INDEX_EDUCATION[key]?.category ?? 'rates';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(key);
    }
    return groups;
  }, [indices]);

  return (
    <div className="space-y-6">
      {/* Index Selection — par catégories */}
      <div className="bg-card rounded-xl border border-border p-4">
        <button
          onClick={() => setShowIndicesSection(!showIndicesSection)}
          className="w-full flex items-center justify-between mb-3 cursor-pointer group"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sélection des indices
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              selectedKeys.length >= 5
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            )}>
              {selectedKeys.length}/5 sélectionnés
            </span>
            {showIndicesSection ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </div>
        </button>

        {showIndicesSection && (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORY_ORDER.map(cat => {
            const keys = indicesByCategory[cat.id];
            if (!keys || keys.length === 0) return null;

            return (
              <div
                key={cat.id}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{cat.icon}</span>
                  {cat.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keys.map(key => {
                    const index = indices[key];
                    const education = INDEX_EDUCATION[key];
                    const isSelected = selectedKeys.includes(key);
                    const isDisabled = !isSelected && selectedKeys.length >= 5;

                    return (
                      <TooltipProvider key={key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleIndex(key)}
                              disabled={isDisabled}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border',
                                isSelected
                                  ? 'text-white shadow-sm'
                                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                                isDisabled && 'opacity-40 cursor-not-allowed'
                              )}
                              style={isSelected ? {
                                backgroundColor: education?.color ?? '#3b82f6',
                                borderColor: education?.color ?? '#3b82f6',
                              } : {}}
                            >
                              {index.titre}
                              {isSelected && <X className="h-2.5 w-2.5 ml-0.5 opacity-80" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="text-xs font-medium mb-0.5">{index.titre}</p>
                            <p className="text-xs text-muted-foreground">{education?.shortDescription || ''}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Résumé des sélectionnés */}
        {selectedKeys.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Sélectionnés :</span>
            {selectedKeys.map(key => {
              const edu = INDEX_EDUCATION[key];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: edu?.color ?? '#3b82f6' }}
                >
                  {indices[key]?.titre}
                  <button onClick={() => toggleIndex(key)} className="ml-0.5 hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => onKeysChange([])}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1"
            >
              Tout effacer
            </button>
          </div>
        )}
        </>)}
      </div>

      {/* Toolbar : Mode | Périodes | Simulation de placement — une seule ligne */}
      <div className="flex flex-wrap items-center gap-3">
        {/* À gauche : Toggle Mode (Valeur absolue / Base 100) */}
        <div className="flex items-center gap-1.5">
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
                      setShowSimPanel(false);
                      setSimulationActive(false);
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
                        setShowSimPanel(false);
                        setSimulationActive(false);
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
                    variant={mode === 'percent' && !showSimPanel ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setMode('percent');
                      setUserOverrodeMode(true);
                      setShowSimPanel(false);
                      setSimulationActive(false);
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

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showSimPanel ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setShowSimPanel(true);
                      setMode('percent');
                      setUserOverrodeMode(true);
                    }}
                    className={cn(
                      "h-8",
                      showSimPanel && simulationActive && "bg-green-600 hover:bg-green-700 text-white"
                    )}
                  >
                    Base perso.
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Base personnalisée :</strong> Simule l'évolution d'un placement avec un montant initial
                    et des versements mensuels optionnels.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Icône d'aide */}
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

        {/* Séparateur vertical */}
        <div className="h-8 w-px bg-border hidden sm:block" />

        {/* Au centre : Boutons de périodes prédéfinies */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {periodButtons.map(btn => (
            <Button
              key={btn.value}
              variant={period === btn.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setPeriod(btn.value);
                setBrushStartDate(null);
                setBrushEndDate(null);
                setNormalizeFromDate(null);
                setExternalBrushStartDate(null);
                setExternalBrushEndDate(null);
                setStartDateInput('');
                setEndDateInput('');
              }}
              className="h-8 px-3"
            >
              {btn.label}
            </Button>
          ))}
        </div>

      </div>

      {/* Panneau simulation de placement (Base personnalisée) */}
      {showSimPanel && (
        <div className="bg-muted/40 rounded-lg border border-border px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Simulation placement</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Apport initial</span>
            <input
              type="number"
              value={localPlacementAmount}
              onChange={(e) => setLocalPlacementAmount(e.target.value)}
              onBlur={() => setPlacementAmount(localPlacementAmount)}
              onKeyDown={(e) => { if (e.key === 'Enter') setPlacementAmount(localPlacementAmount); }}
              placeholder="1000"
              min="1"
              className="h-8 w-24 px-2 text-sm rounded-md border border-border bg-background text-foreground text-right"
            />
            <span className="text-xs text-muted-foreground">€</span>

            <span className="text-xs text-muted-foreground">+</span>

            <input
              type="number"
              value={localMonthlyPayment}
              onChange={(e) => setLocalMonthlyPayment(e.target.value)}
              onBlur={() => setMonthlyPayment(localMonthlyPayment)}
              onKeyDown={(e) => { if (e.key === 'Enter') setMonthlyPayment(localMonthlyPayment); }}
              placeholder="0"
              min="0"
              className="h-8 w-20 px-2 text-sm rounded-md border border-border bg-background text-foreground text-right"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">€/mois</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimulationActive(true);
                setMode('percent');
                setUserOverrodeMode(true);
                setPlacementAmount(localPlacementAmount);
                setMonthlyPayment(localMonthlyPayment);
              }}
              className={cn(
                "h-8 gap-1",
                simulationActive && "border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
              )}
            >
              <Play className="h-3 w-3" />
              Simuler
            </Button>
            <button
              onClick={() => {
                setShowSimPanel(false);
                setSimulationActive(false);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Fermer la simulation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Bandeau explicatif simulation de placement */}
      {simulationActive && effectivePlacementAmount && (
        <Alert className="py-2 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
          <AlertDescription className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
            <Euro className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span>
              <strong>Simulation active :</strong> Évolution de <strong>{effectivePlacementAmount.toLocaleString('fr-FR')} €</strong>
              {effectiveMonthlyPayment && effectiveMonthlyPayment > 0 && (
                <> + <strong>{effectiveMonthlyPayment.toLocaleString('fr-FR')} €/mois</strong> (versements programmés — méthode DCA)</>
              )}{' '}depuis le début de la période.
              {brushStartDate && (
                <> Plage depuis le <strong>{new Date(brushStartDate).toLocaleDateString('fr-FR')}</strong>.</>
              )}
              {' '}Slider disponible sous le graphique.
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {mode === 'percent' && !simulationActive && selectedKeys.some(k => ['livreta', 'pel', 'fondsEuros', 'scpi', 'estr', 'tauxDepotBCE', 'oat', 'tec10', 'tauxImmo'].includes(k)) && (
        <Alert className="py-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
          <AlertDescription className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
            <Lightbulb className="h-4 w-4 flex-shrink-0 text-blue-600" />
            <span>
              <strong>Simulation de placement :</strong> Les produits d'épargne sont convertis en performance cumulée de <strong>100€ investis</strong> selon leurs règles officielles — capitalisation annuelle (Livret A, PEL, Fonds euros), trimestrielle (SCPI) ou mensuelle (OAT, taux marché). Les changements de taux sont pris en compte à leur date exacte.
              {' '}<strong>💡 Activez la simulation de placement pour un montant personnalisé.</strong>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Info about slider usage */}
      {selectedKeys.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <span>💡</span>
          <span>Utilisez le <strong>slider</strong> sous le graphique ou les <strong>champs de date</strong> dans les statistiques pour sélectionner une plage précise. Les montants et statistiques se recalculent automatiquement depuis la date de début. Boutons <strong>+</strong> / <strong>−</strong> pour zoomer.</span>
        </div>
      )}

      {/* Chart */}
      {selectedKeys.length > 0 && (
        <EnhancedChart
          key={period}
          datasets={filteredData}
          mode={mode}
          period={period}
          showMA50={showMA50}
          showMA200={showMA200}
          onToggleMA50={() => setShowMA50(!showMA50)}
          onToggleMA200={() => setShowMA200(!showMA200)}
          placementAmount={effectivePlacementAmount}
          monthlyPayment={effectiveMonthlyPayment}
          onBrushChange={handleBrushChange}
          normalizeFromDate={normalizeFromDate}
          externalBrushStartDate={externalBrushStartDate}
          externalBrushEndDate={externalBrushEndDate}
        />
      )}

      {/* Champs de date — centrés sous le slider */}
      {selectedKeys.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">Du</span>
          <input
            type="text"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
            onBlur={handleDateInputSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleDateInputSubmit()}
            placeholder="jj/mm/aaaa"
            className="h-7 w-28 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
          />
          <span className="whitespace-nowrap">au</span>
          <input
            type="text"
            value={endDateInput}
            onChange={(e) => setEndDateInput(e.target.value)}
            onBlur={handleDateInputSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleDateInputSubmit()}
            placeholder="jj/mm/aaaa"
            className="h-7 w-28 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
          />
        </div>
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
                  {statistics.some(s => s?.totalInvested !== undefined) && (
                    <TableHead className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted">
                            Investi
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm font-semibold mb-1">Capital investi total</p>
                            <p className="text-sm">Somme de l'apport initial et de tous les versements mensuels sur la période.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  )}
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
                    {statistics.some(s => s?.totalInvested !== undefined) && (
                      <TableCell className="text-right text-muted-foreground">
                        {stat.totalInvested !== undefined ? `${formatNumber(stat.totalInvested)} €` : '—'}
                      </TableCell>
                    )}
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

    </div>
  );
}
