'use client';

import { useEffect, useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EnhancedChart } from '@/components/enhanced-chart';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { filterDataByPeriod } from '@/lib/financial-utils';
import { cn } from '@/lib/utils';

interface DataPoint { date: string; value: number; }
interface Indicateur { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; }

interface PresentationClientProps {
  indices: Record<string, Indicateur>;
  selectedKeys: string[];
  dateMAJ: string;
  onClose: () => void;
}

type Period = '1M' | '3M' | '6M' | '1A' | '5A' | 'MAX';

function getVariation(historique: DataPoint[], isRate: boolean): { value: number; label: string } | null {
  if (!historique || historique.length < 2) return null;
  const current = historique[historique.length - 1].value;
  const prev = historique[historique.length - 2].value;
  if (isRate) {
    const diff = parseFloat((current - prev).toFixed(2));
    return { value: diff, label: `${diff >= 0 ? '+' : ''}${diff} pp` };
  }
  if (prev === 0) return null;
  const diff = parseFloat(((current - prev) / Math.abs(prev) * 100).toFixed(2));
  return { value: diff, label: `${diff >= 0 ? '+' : ''}${diff}%` };
}

export function PresentationClient({ indices, selectedKeys, dateMAJ, onClose }: PresentationClientProps) {
  const [period, setPeriod] = useState<Period>('1A');
  const [mode, setMode] = useState<'real' | 'percent'>('percent');
  const [showMA50, setShowMA50] = useState(false);
  const [showMA200, setShowMA200] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const keysToShow = selectedKeys.length > 0
    ? selectedKeys
    : Object.keys(indices).filter(k => ['oat', 'inflation', 'estr', 'livreta', 'prixImmo', 'scpi'].includes(k)).slice(0, 5);

  const filteredData = useMemo(() => {
    return keysToShow.map(key => {
      const index = indices[key];
      if (!index) return null;
      return {
        key,
        data: filterDataByPeriod(index.historique, period),
        color: INDEX_EDUCATION[key]?.color ?? '#64748b',
        title: index.titre,
        suffix: index.suffixe,
      };
    }).filter(Boolean) as { key: string; data: DataPoint[]; color: string; title: string; suffix: string }[];
  }, [indices, keysToShow, period]);

  const periodButtons: { value: Period; label: string }[] = [
    { value: '1M', label: '1M' }, { value: '3M', label: '3M' },
    { value: '6M', label: '6M' }, { value: '1A', label: '1A' },
    { value: '5A', label: '5A' }, { value: 'MAX', label: 'Max' },
  ];

  const dateFormatee = new Date(dateMAJ).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0a0f1e] flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-extrabold text-white tracking-tight">Suivi-Taux</h1>
          <span className="text-xs text-slate-500 hidden sm:inline">Mise à jour : {dateFormatee}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Période */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
            {periodButtons.map(btn => (
              <button
                key={btn.value}
                onClick={() => setPeriod(btn.value)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  period === btn.value ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Mode */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setMode('percent')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                mode === 'percent' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white')}
            >Base 100</button>
            <button
              onClick={() => setMode('real')}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                mode === 'real' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white')}
            >Valeur réelle</button>
          </div>

          {/* MM */}
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setShowMA50(!showMA50)}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                showMA50 ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white')}
            >MM50</button>
            <button
              onClick={() => setShowMA200(!showMA200)}
              className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                showMA200 ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white')}
            >MM200</button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer (Échap)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cartes valeurs actuelles */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {keysToShow.map(key => {
            const indice = indices[key];
            const edu = INDEX_EDUCATION[key];
            if (!indice) return null;

            const isRate = indice.suffixe === '%';
            const variation = getVariation(indice.historique, isRate);
            const color = edu?.color ?? '#64748b';
            const trend = !variation ? 'neutral' : variation.value > 0 ? 'up' : variation.value < 0 ? 'down' : 'neutral';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b';

            return (
              <div
                key={key}
                className="flex-shrink-0 flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div>
                  <p className="text-xs font-medium text-slate-400 whitespace-nowrap">{indice.titre}</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-white">
                      {typeof indice.valeur === 'number' ? indice.valeur.toFixed(2) : '—'}
                    </span>
                    <span className="text-sm text-slate-400">{indice.suffixe}</span>
                  </div>
                </div>
                {variation && (
                  <div
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: `${trendColor}25`, color: trendColor }}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {variation.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Graphique principal */}
      <div className="flex-1 min-h-0 px-4 py-3 overflow-hidden">
        <style>{`
          .presentation-chart .recharts-cartesian-grid-horizontal line,
          .presentation-chart .recharts-cartesian-grid-vertical line {
            stroke: rgba(255,255,255,0.06) !important;
          }
          .presentation-chart .recharts-text { fill: rgba(255,255,255,0.4) !important; }
          .presentation-chart .recharts-legend-item-text { color: rgba(255,255,255,0.7) !important; }
        `}</style>
        <div className="presentation-chart h-full">
          {filteredData.length > 0 ? (
            <EnhancedChart
              datasets={filteredData}
              mode={mode}
              period={period}
              showMA50={showMA50}
              showMA200={showMA200}
              onToggleMA50={() => setShowMA50(!showMA50)}
              onToggleMA200={() => setShowMA200(!showMA200)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <p>Sélectionnez des indices dans le tableau de bord pour les afficher ici</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-2 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">
          Sources : FRED · BCE · INSEE · Yahoo Finance · Banque de France · ASPIM — Usage interne conseil
        </p>
      </div>
    </div>
  );
}
