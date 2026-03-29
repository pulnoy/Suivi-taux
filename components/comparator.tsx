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
  SAVINGS_KEYS
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
import { TrendingUp, BarChart3, X, HelpCircle, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Play, Square, Euro } from 'lucide-react';
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
  const [period, setPeriod] = useState<Period>('MAX');
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
    if (startDate) setStartDateInput(toDisplayDate(startDate));
    if (endDate) setEndDateInput(toDisplayDate(endDate));
    // Debounce normalizeFromDate to avoid feedback loop during drag
    clearTimeout(brushDebounceRef.current);
    brushDebounceRef.current = setTimeout(() => {
      setNormalizeFromDate(startDate);
    }, 300);
  }, []);

  // Submit date inputs → update brush + slider
  const handleDateInputSubmit = useCallback(() => {
    const startISO = parseDisplayDate(startDateInput);
    const endISO = parseDisplayDate(endDateInput);
    if (startISO) {
      setBrushStartDate(startISO);
      setNormalizeFromDate(startISO);
    }
    if (endISO) setBrushEndDate(endISO);
    if (startISO || endISO) {
      setExternalBrushStartDate(startISO);
      setExternalBrushEndDate(endISO);
    }
  }, [startDateInput, endDateInput]);

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

  // Calculate statistics based on brush-filtered data
  // In percent mode: all indices normalised to base 100 (or simulation amount) for consistent display
  const statistics = useMemo(() => {
    const baseAmt = (simulationActive && effectivePlacementAmount) ? effectivePlacementAmount : 100;

    return brushFilteredData.map(ds => {
      const isSavings = ds.suffix === '%' && SAVINGS_KEYS.includes(ds.key);

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
    });
  }, [brushFilteredData, mode, simulationActive, effectivePlacementAmount]);

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

        {/* Séparateur vertical */}
        <div className="h-8 w-px bg-border hidden sm:block" />

        {/* Simulation de placement */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Placement</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  <strong>Simulation de placement :</strong> Saisissez un montant pour simuler l'évolution d'un investissement 
                  depuis la date de début de la période sélectionnée. Fonctionne en mode Base 100.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            type="number"
            value={localPlacementAmount}
            onChange={(e) => setLocalPlacementAmount(e.target.value)}
            onBlur={() => setPlacementAmount(localPlacementAmount)}
            onKeyDown={(e) => { if (e.key === 'Enter') setPlacementAmount(localPlacementAmount); }}
            placeholder="1000"
            min="1"
            className={cn(
              "h-8 w-24 px-2 text-sm rounded-md border bg-background text-foreground text-right",
              simulationActive ? "border-primary ring-1 ring-primary/30" : "border-border"
            )}
          />
          <span className="text-xs text-muted-foreground">€</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={simulationActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSimulationActive(!simulationActive);
                    if (!simulationActive) {
                      // Force percent mode when activating simulation
                      setMode('percent');
                      setUserOverrodeMode(true);
                    }
                  }}
                  className={cn(
                    "h-8 gap-1",
                    simulationActive && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                >
                  {simulationActive ? (
                    <>
                      <Square className="h-3 w-3" />
                      Arrêter
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Simuler
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {simulationActive 
                  ? "Désactiver la simulation de placement" 
                  : "Activer la simulation de placement"}
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

      {/* Bandeau explicatif simulation de placement */}
      {simulationActive && effectivePlacementAmount && (
        <Alert className="py-2 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
          <AlertDescription className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
            <Euro className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span>
              <strong>Simulation active :</strong> Affichage de l'évolution de <strong>{effectivePlacementAmount.toLocaleString('fr-FR')}€</strong> investis 
              depuis le début de la période. 
              {brushStartDate && (
                <> Plage sélectionnée depuis le <strong>{new Date(brushStartDate).toLocaleDateString('fr-FR')}</strong>.</>
              )}
              {' '}Utilisez le slider sous le graphique pour ajuster la plage de dates.
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
          onBrushChange={handleBrushChange}
          normalizeFromDate={normalizeFromDate}
          externalBrushStartDate={externalBrushStartDate}
          externalBrushEndDate={externalBrushEndDate}
        />
      )}

      {/* Statistics Table */}
      {statistics.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statistiques comparatives
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="whitespace-nowrap">Du</span>
                <input
                  type="text"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  onBlur={handleDateInputSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleDateInputSubmit()}
                  placeholder="jj/mm/aaaa"
                  className="h-7 w-28 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="whitespace-nowrap">au</span>
                <input
                  type="text"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  onBlur={handleDateInputSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleDateInputSubmit()}
                  placeholder="jj/mm/aaaa"
                  className="h-7 w-28 px-2 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
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

    </div>
  );
}
