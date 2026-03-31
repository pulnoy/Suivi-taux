'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush, Area, ComposedChart
} from 'recharts';
import { Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon, Info, HelpCircle, Plus, Minus } from 'lucide-react';
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
  placementAmount?: number | null;
  monthlyPayment?: number | null;
  onBrushChange?: (startDate: string | null, endDate: string | null) => void;
  /** ISO date from which chart normalises to base 100 / placement amount (debounced from slider) */
  normalizeFromDate?: string | null;
  /** External date range from date-input fields → moves the visual slider */
  externalBrushStartDate?: string | null;
  externalBrushEndDate?: string | null;
}

// Fonction pour formater les dates selon la période
const formatXAxisDate = (dateString: string, period: string): string => {
  const date = new Date(dateString);
  
  switch(period) {
    case '1M':
    case '3M':
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    case '6M':
    case '1A':
    case 'YTD':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    case '5A':
    case '10A':
    case '18A':
    case '20A':
    case 'MAX':
      return date.getFullYear().toString();
    default:
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
  }
};

// Fonction pour calculer l'intervalle optimal de ticks
const getTickInterval = (dataLength: number, period: string): number | 'preserveStartEnd' => {
  const targetTicks = 8;
  if (dataLength <= targetTicks) return 0;
  return Math.ceil(dataLength / targetTicks);
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
  onToggleMA200,
  placementAmount,
  monthlyPayment,
  onBrushChange,
  normalizeFromDate,
  externalBrushStartDate,
  externalBrushEndDate
}: EnhancedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  // Track brush indices in a ref to avoid re-renders during drag.
  // Only React state that changes is brushKey (for programmatic zoom remount).
  const brushIndicesRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [brushKey, setBrushKey] = useState(0);
  // Initial indices for the Brush when it remounts (set by zoom buttons)
  const [brushInitialStart, setBrushInitialStart] = useState<number | undefined>(undefined);
  const [brushInitialEnd, setBrushInitialEnd] = useState<number | undefined>(undefined);

  // Get date ranges for each dataset (for showing in legend)
  const dateRanges = useMemo(() => getDatasetDateRanges(datasets), [datasets]);

  // ─── Pass 1 : raw chart data + capitalized values for savings ───
  const rawChartData = useMemo(() => {
    if (!datasets || datasets.length === 0) return [];

    const allDates = new Set<string>();
    datasets.forEach(ds => ds.data.forEach(d => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();
    
    if (sortedDates.length === 0) return [];

    const MAX_GAP_MS = 45 * 24 * 60 * 60 * 1000;
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
        else if (gap > best.gap) break;
      }
      return best?.value;
    };

    // ─── Capitalisation pour produits d'épargne (toujours calculée) ───
    type CompoundingRule = 'annual' | 'quarterly' | 'monthly';
    const COMPOUNDING_RULES: Record<string, CompoundingRule> = {
      livreta: 'annual',
      pel: 'annual',
      fondsEuros: 'annual',
      scpi: 'quarterly',
      oat: 'monthly',
      tec10: 'monthly',
      tauxImmo: 'monthly',
      tauxDepotBCE: 'monthly',
      estr: 'monthly',
    };

    const baseAmount = placementAmount || 100;
    const capitalizedCache: Record<string, Record<string, number>> = {};

    const findClosestSnapshot = (snapshots: Record<string, number>, targetDate: string): number | undefined => {
      const targetTs = new Date(targetDate).getTime();
      let best: { value: number; gap: number } | null = null;
      for (const [date, value] of Object.entries(snapshots)) {
        const gap = Math.abs(new Date(date).getTime() - targetTs);
        if (!best || gap < best.gap) best = { value, gap };
      }
      return best?.value;
    };

    // Always compute capitalization (needed for percent mode + stats)
    indexedDatasets.forEach(ds => {
      if (ds.suffix !== '%') return;
      const rule = COMPOUNDING_RULES[ds.key];
      if (!rule) return;

      const rateChanges = [...ds.data].sort((a, b) => a.date.localeCompare(b.date));
      if (rateChanges.length === 0) return;

      const startDate = new Date(rateChanges[0].date);
      const endDate = new Date();

      const getRateAt = (date: Date): number => {
        const dateStr = date.toISOString().split('T')[0];
        let rate = rateChanges[0].value;
        for (const pt of rateChanges) {
          if (pt.date <= dateStr) rate = pt.value;
          else break;
        }
        return rate;
      };

      let capital = baseAmount;
      const snapshots: Record<string, number> = {};

      if (rule === 'annual') {
        let pendingInterests = 0;
        let currentYear = startDate.getFullYear();
        const cursor = new Date(startDate);

        while (cursor <= endDate) {
          const year = cursor.getFullYear();
          if (year > currentYear) {
            capital += pendingInterests;
            pendingInterests = 0;
            currentYear = year;
          }
          const dailyRate = getRateAt(cursor) / 100 / 365;
          pendingInterests += capital * dailyRate;
          if (cursor.getDate() === 1) {
            const dateStr = cursor.toISOString().split('T')[0];
            snapshots[dateStr] = parseFloat((capital + pendingInterests).toFixed(4));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        capital += pendingInterests;
        const todayStr = endDate.toISOString().split('T')[0].substring(0, 7) + '-01';
        snapshots[todayStr] = parseFloat(capital.toFixed(4));

      } else if (rule === 'quarterly') {
        const cursor = new Date(startDate);
        let quarter = Math.floor(cursor.getMonth() / 3);
        while (cursor <= endDate) {
          const currentQuarter = Math.floor(cursor.getMonth() / 3);
          if (currentQuarter !== quarter) {
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

    // ─── DCA (versements programmés mensuels) ───
    const dcaCache: Record<string, Record<string, number>> = {};
    if (monthlyPayment && monthlyPayment > 0) {
      const SAVINGS_DCA = new Set(['livreta', 'pel', 'fondsEuros', 'scpi', 'oat', 'tec10', 'tauxImmo', 'tauxDepotBCE', 'estr']);

      indexedDatasets.forEach(ds => {
        const isSav = ds.suffix === '%' && SAVINGS_DCA.has(ds.key);
        const sorted2 = [...ds.data].sort((a, b) => a.date.localeCompare(b.date));
        if (sorted2.length === 0) return;

        const startDate2 = new Date(sorted2[0].date);
        const endDate2 = new Date(sorted2[sorted2.length - 1].date);
        const snapshots2: Record<string, number> = {};

        const getValAt2 = (dateStr: string): number => {
          let val = sorted2[0].value;
          for (const pt of sorted2) {
            if (pt.date <= dateStr) val = pt.value;
            else break;
          }
          return val;
        };

        if (isSav) {
          const COMPOUND_RULES: Record<string, string> = {
            livreta: 'annual', pel: 'annual', fondsEuros: 'annual',
            scpi: 'quarterly',
            oat: 'monthly', tec10: 'monthly', tauxImmo: 'monthly', tauxDepotBCE: 'monthly', estr: 'monthly',
          };
          const rule = COMPOUND_RULES[ds.key] || 'monthly';
          let capital = baseAmount;
          snapshots2[sorted2[0].date] = capital;
          const cursor = new Date(startDate2);

          if (rule === 'annual') {
            let pendingInterest = 0;
            let currentYear = startDate2.getFullYear();
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate2) {
              const year = cursor.getFullYear();
              if (year > currentYear) { capital += pendingInterest; pendingInterest = 0; currentYear = year; }
              capital += monthlyPayment;
              const accrual = getValAt2(cursor.toISOString().split('T')[0]) / 100 / 365 * 30.4375;
              pendingInterest += capital * accrual;
              snapshots2[cursor.toISOString().split('T')[0]] = parseFloat((capital + pendingInterest).toFixed(4));
              cursor.setMonth(cursor.getMonth() + 1);
            }
          } else if (rule === 'quarterly') {
            let quarter = Math.floor(startDate2.getMonth() / 3);
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate2) {
              const currentQuarter = Math.floor(cursor.getMonth() / 3);
              if (currentQuarter !== quarter) {
                const rate = getValAt2(cursor.toISOString().split('T')[0]) / 100 / 4;
                capital = capital * (1 + rate);
                quarter = currentQuarter;
              }
              capital += monthlyPayment;
              snapshots2[cursor.toISOString().split('T')[0]] = parseFloat(capital.toFixed(4));
              cursor.setMonth(cursor.getMonth() + 1);
            }
          } else {
            cursor.setMonth(cursor.getMonth() + 1);
            while (cursor <= endDate2) {
              const dateStr = cursor.toISOString().split('T')[0];
              const monthlyRate = getValAt2(dateStr) / 100 / 12;
              capital = capital * (1 + monthlyRate) + monthlyPayment;
              snapshots2[dateStr] = parseFloat(capital.toFixed(4));
              cursor.setMonth(cursor.getMonth() + 1);
            }
          }
        } else {
          // Price-based: track cumulative units × current price
          const t0Price = sorted2[0].value || 1;
          const schedule: { date: string; cumUnits: number }[] = [];
          let cumUnits = baseAmount / t0Price;
          schedule.push({ date: sorted2[0].date, cumUnits });
          const cursor = new Date(startDate2);
          cursor.setMonth(cursor.getMonth() + 1);
          while (cursor <= endDate2) {
            const dateStr = cursor.toISOString().split('T')[0];
            const price = getValAt2(dateStr) || 1;
            cumUnits += monthlyPayment / price;
            schedule.push({ date: dateStr, cumUnits });
            cursor.setMonth(cursor.getMonth() + 1);
          }
          let schedIdx = 0;
          let curUnits = 0;
          for (const pt of sorted2) {
            while (schedIdx < schedule.length && schedule[schedIdx].date <= pt.date) {
              curUnits = schedule[schedIdx].cumUnits;
              schedIdx++;
            }
            snapshots2[pt.date] = parseFloat((curUnits * pt.value).toFixed(4));
          }
        }

        dcaCache[ds.key] = snapshots2;
      });
    }

    // Build chart data with raw values + _cap + _dca values
    const data = sortedDates.map(date => {
      const point: Record<string, any> = { date };

      indexedDatasets.forEach(ds => {
        const exactPoint = ds.data.find(d => d.date === date);
        const rawValue = exactPoint ? exactPoint.value : findClosest(ds.sorted, date);

        if (rawValue !== undefined) {
          point[ds.key] = rawValue;
        }

        // Store capitalized value alongside raw value
        if (capitalizedCache[ds.key]) {
          const capVal = capitalizedCache[ds.key][date]
            ?? findClosestSnapshot(capitalizedCache[ds.key], date);
          if (capVal !== undefined) {
            point[`${ds.key}_cap`] = capVal;
          }
        }

        // Store DCA portfolio value
        if (dcaCache[ds.key]) {
          const dcaVal = dcaCache[ds.key][date]
            ?? findClosestSnapshot(dcaCache[ds.key], date);
          if (dcaVal !== undefined) {
            point[`${ds.key}_dca`] = dcaVal;
          }
        }
      });

      return point;
    });

    return data;
  }, [datasets, placementAmount, monthlyPayment]);

  // ─── Pass 2 : normalisation selon le mode + position du brush ───
  const chartData = useMemo(() => {
    if (rawChartData.length === 0) return [];
    // In real / absolute mode, return raw values (strip _cap keys)
    if (mode !== 'percent') {
      return rawChartData.map(point => {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(point)) {
          if (!k.endsWith('_cap') && !k.endsWith('_dca')) cleaned[k] = v;
        }
        return cleaned;
      });
    }

    // Percent mode: normalise depuis normalizeFromDate (ou depuis le début si non défini).
    // normalizeFromDate est déboncé depuis le slider → pas de feedback loop pendant le drag.
    let baseIdx = 0;
    if (normalizeFromDate) {
      const idx = rawChartData.findIndex(d => d.date >= normalizeFromDate);
      if (idx >= 0) baseIdx = idx;
    }

    const SAVINGS_SET = new Set(['livreta', 'pel', 'fondsEuros', 'scpi', 'oat', 'tec10', 'tauxImmo', 'tauxDepotBCE', 'estr']);
    const baseAmount = placementAmount || 100;
    const isDCA = !!(monthlyPayment && monthlyPayment > 0);

    return rawChartData.map(point => {
      const newPoint: Record<string, any> = { date: point.date };

      datasets.forEach(ds => {
        const rawVal = point[ds.key];
        const capKey = `${ds.key}_cap`;
        const capVal = point[capKey];
        const isRate = ds.suffix === '%';

        // DCA mode: use pre-computed portfolio values directly (already in €)
        if (isDCA) {
          const dcaVal = point[`${ds.key}_dca`];
          if (dcaVal !== undefined) {
            newPoint[ds.key] = dcaVal;
            return;
          }
        }

        if (isRate && SAVINGS_SET.has(ds.key) && capVal !== undefined) {
          // Savings products: montant capitalisé rebased depuis baseIdx
          const baseCap = rawChartData[baseIdx]?.[capKey];
          if (baseCap && baseCap > 0) {
            newPoint[ds.key] = parseFloat((baseAmount * capVal / baseCap).toFixed(4));
          }
        } else if (isRate && rawVal !== undefined) {
          // Other rate indices: ratio depuis baseIdx → montant
          const baseRate = rawChartData[baseIdx]?.[ds.key] ?? rawVal;
          if (Math.abs(baseRate) > 0.001) {
            newPoint[ds.key] = parseFloat((baseAmount * rawVal / baseRate).toFixed(4));
          } else {
            newPoint[ds.key] = baseAmount;
          }
        } else if (rawVal !== undefined) {
          // Non-rate indices: montant depuis baseIdx
          const baseVal = rawChartData[baseIdx]?.[ds.key];
          if (baseVal !== undefined && baseVal !== 0) {
            newPoint[ds.key] = parseFloat((baseAmount * (1 + (rawVal - baseVal) / Math.abs(baseVal))).toFixed(4));
          }
        }
      });

      return newPoint;
    });
  }, [rawChartData, mode, datasets, placementAmount, monthlyPayment, normalizeFromDate]);

  // Vérifier si assez de données pour les moyennes mobiles
  const dataAvailability = useMemo(() => {
    const dataLength = chartData.length;
    return {
      canShowMA50: dataLength >= 50,
      canShowMA200: dataLength >= 200,
      dataLength
    };
  }, [chartData]);

  // Calculate moving averages
  const maData = useMemo(() => {
    if (!showMA50 && !showMA200) return chartData;
    if (chartData.length === 0) return chartData;
    
    return chartData.map((point, idx) => {
      const newPoint = { ...point };
      
      datasets.forEach(ds => {
        if (showMA50 && dataAvailability.canShowMA50 && idx >= 49) {
          const slice = chartData.slice(idx - 49, idx + 1);
          const validValues = slice
            .map(p => p[ds.key])
            .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));
          if (validValues.length >= 25) {
            const sum = validValues.reduce((acc, v) => acc + v, 0);
            newPoint[`${ds.key}_ma50`] = sum / validValues.length;
          }
        }
        
        if (showMA200 && dataAvailability.canShowMA200 && idx >= 199) {
          const slice = chartData.slice(idx - 199, idx + 1);
          const validValues = slice
            .map(p => p[ds.key])
            .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));
          if (validValues.length >= 100) {
            const sum = validValues.reduce((acc, v) => acc + v, 0);
            newPoint[`${ds.key}_ma200`] = sum / validValues.length;
          }
        }
      });
      
      return newPoint;
    });
  }, [chartData, datasets, showMA50, showMA200, dataAvailability]);

  // Vérifier si les MA ont des données valides
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

  // Fire initial brush range on data load so parent knows full range
  useEffect(() => {
    if (onBrushChange && rawChartData.length > 0 && brushIndicesRef.current.start === null && brushIndicesRef.current.end === null) {
      onBrushChange(rawChartData[0]?.date || null, rawChartData[rawChartData.length - 1]?.date || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawChartData.length]);

  // Note: brush position is preserved by saving brushInitialStart/End at 50ms in handleBrushChange.
  // By the time placementAmount or normalizeFromDate changes (≥500ms), the state is already set.

  // External brush control: date inputs → update visual slider
  const isExternalBrushUpdate = useRef(false);
  useEffect(() => {
    if (!externalBrushStartDate || !externalBrushEndDate) return;
    const startIdx = rawChartData.findIndex(d => d.date >= externalBrushStartDate);
    let endIdx = rawChartData.length - 1;
    for (let i = rawChartData.length - 1; i >= 0; i--) {
      if (rawChartData[i].date <= externalBrushEndDate) { endIdx = i; break; }
    }
    if (startIdx >= 0 && endIdx >= startIdx) {
      isExternalBrushUpdate.current = true;
      brushIndicesRef.current = { start: startIdx, end: endIdx };
      setBrushInitialStart(startIdx);
      setBrushInitialEnd(endIdx);
      setBrushKey(k => k + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalBrushStartDate, externalBrushEndDate]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    brushIndicesRef.current = { start: null, end: null };
    setBrushInitialStart(undefined);
    setBrushInitialEnd(undefined);
    setBrushKey(k => k + 1);
    if (onBrushChange) onBrushChange(null, null);
  }, [onBrushChange]);

  // Stable refs for the brush change handler to avoid re-creating the callback
  const maDataRef = useRef(maData);
  maDataRef.current = maData;
  const onBrushChangeRef = useRef(onBrushChange);
  onBrushChangeRef.current = onBrushChange;

  // Handle brush change.
  // Key invariant: brushInitialStart/End must ALWAYS reflect the current brush position.
  // If the parent re-renders EnhancedChart (e.g. because it received new brush dates),
  // the Brush receives startIndex/endIndex as props. If those are `undefined`, Recharts
  // snaps the brush to full range. Keeping them synchronised with the actual position
  // prevents that snap without needing a key-based remount.
  const handleBrushChange = useCallback((brushState: any) => {
    if (!brushState) return;
    // If this change came from an external (date-input) update, skip propagation to avoid loop
    if (isExternalBrushUpdate.current) {
      isExternalBrushUpdate.current = false;
      return;
    }
    const { startIndex, endIndex } = brushState;
    brushIndicesRef.current = { start: startIndex, end: endIndex };

    // Synchronously mirror position into state (no setBrushKey → no remount).
    // When the parent re-renders this component, the Brush receives its current
    // position back through props → Recharts sees no change → no visual snap.
    setBrushInitialStart(startIndex);
    setBrushInitialEnd(endIndex);

    const data = maDataRef.current;
    const cb = onBrushChangeRef.current;
    if (cb && data.length > 0) {
      const startDate = data[startIndex]?.date || null;
      const endDate = data[endIndex]?.date || null;
      cb(startDate, endDate);
    }
  }, []); // empty deps = stable reference

  // Zoom In: reduce visible range by 20% from each side
  const handleZoomIn = useCallback(() => {
    const total = maData.length - 1;
    if (total <= 2) return;
    const currentStart = brushIndicesRef.current.start ?? 0;
    const currentEnd = brushIndicesRef.current.end ?? total;
    const range = currentEnd - currentStart;
    if (range <= 4) return; // minimum range
    const step = Math.max(1, Math.floor(range * 0.1));
    const newStart = Math.min(currentStart + step, currentEnd - 2);
    const newEnd = Math.max(currentEnd - step, newStart + 2);
    brushIndicesRef.current = { start: newStart, end: newEnd };
    setBrushInitialStart(newStart);
    setBrushInitialEnd(newEnd);
    setBrushKey(k => k + 1);
    if (onBrushChange && maData.length > 0) {
      onBrushChange(maData[newStart]?.date || null, maData[newEnd]?.date || null);
    }
  }, [maData, onBrushChange]);

  // Zoom Out: expand visible range by 20% from each side
  const handleZoomOut = useCallback(() => {
    const total = maData.length - 1;
    if (total <= 0) return;
    const currentStart = brushIndicesRef.current.start ?? 0;
    const currentEnd = brushIndicesRef.current.end ?? total;
    const range = currentEnd - currentStart;
    const step = Math.max(1, Math.floor(range * 0.1));
    const newStart = Math.max(0, currentStart - step);
    const newEnd = Math.min(total, currentEnd + step);
    if (newStart === 0 && newEnd === total) {
      // Full range -> reset
      brushIndicesRef.current = { start: null, end: null };
      setBrushInitialStart(undefined);
      setBrushInitialEnd(undefined);
      setBrushKey(k => k + 1);
      if (onBrushChange) onBrushChange(null, null);
      return;
    }
    brushIndicesRef.current = { start: newStart, end: newEnd };
    setBrushInitialStart(newStart);
    setBrushInitialEnd(newEnd);
    setBrushKey(k => k + 1);
    if (onBrushChange && maData.length > 0) {
      onBrushChange(maData[newStart]?.date || null, maData[newEnd]?.date || null);
    }
  }, [maData, onBrushChange]);

  const baseAmount = placementAmount || 100;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !label) return null;

    const dataPoint = maData.find(d => d.date === label);
    const isExactDate = (ds: DatasetConfig) => ds.data.some(d => d.date === label);

    const formatValue = (ds: DatasetConfig, value: number): string => {
      if (mode === 'percent') {
        return `${formatNumber(value, 2)}€`;
      }
      return `${formatNumber(value, 2)} ${ds.suffix || ''}`.trim();
    };

    const valueColor = (value: number): string => {
      if (mode !== 'percent') return 'text-foreground';
      return value >= baseAmount ? 'text-green-600' : 'text-red-600';
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
                      <span className={cn("text-sm font-bold", valueColor(value))}>
                        {formatValue(ds, value)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic opacity-50">hors période</span>
                  )}
                </div>
                {showMA50 && ma50Value !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-5 text-xs text-muted-foreground">
                    <span>└ MM 50j</span>
                    <span>{formatNumber(ma50Value, 2)}{mode === 'percent' ? '€' : ''}</span>
                  </div>
                )}
                {showMA200 && ma200Value !== undefined && (
                  <div className="flex items-center justify-between gap-4 pl-5 text-xs text-muted-foreground">
                    <span>└ MM 200j</span>
                    <span>{formatNumber(ma200Value, 2)}{mode === 'percent' ? '€' : ''}</span>
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

  const getYAxisId = (dsIndex: number): string | undefined => {
    if (mode === 'real' && datasets.length <= 2) {
      return dsIndex === 0 ? 'left' : 'right';
    }
    return undefined;
  };

  // Compute visible date range for display
  const visibleRange = useMemo(() => {
    if (maData.length === 0) return null;
    const start = brushIndicesRef.current.start ?? 0;
    const end = brushIndicesRef.current.end ?? maData.length - 1;
    return {
      startDate: maData[start]?.date,
      endDate: maData[end]?.date
    };
  }, [maData]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {datasets.length === 1 && onToggleMA50 && onToggleMA200 && (
              <>
                {/* MM 50j */}
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

                {/* MM 200j */}
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

            {/* Visible date range indicator */}
            {visibleRange && visibleRange.startDate && visibleRange.endDate && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                📅 {new Date(visibleRange.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' → '}
                {new Date(visibleRange.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom +/- buttons */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleZoomIn}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom avant</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleZoomOut}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom arrière</TooltipContent>
              </Tooltip>
            </div>

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
                  tickFormatter={(v) => mode === 'percent' ? `${formatNumber(v, 0)}€` : formatNumber(v, 2)}
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  tickLine={{ stroke: 'currentColor' }}
                  axisLine={{ stroke: 'currentColor' }}
                />
              )}

              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => {
                  if (value.endsWith('_ma50')) return 'MM 50j (pointillés)';
                  if (value.endsWith('_ma200')) return 'MM 200j (pointillés longs)';
                  const ds = datasets.find(d => d.key === value);
                  return ds?.title || value;
                }}
              />

              {/* Reference line at baseAmount for percent mode */}
              {mode === 'percent' && (
                <ReferenceLine y={baseAmount} stroke="#94a3b8" strokeDasharray="5 5" />
              )}

              {/* Data lines */}
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

              {/* Moving averages */}
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
                key={`brush-${brushKey}`}
                dataKey="date" 
                height={30} 
                stroke="#8884d8"
                travellerWidth={10}
                tickFormatter={(date) => formatXAxisDate(date, period)}
                onChange={handleBrushChange}
                startIndex={brushInitialStart}
                endIndex={brushInitialEnd}
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
