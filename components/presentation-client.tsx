'use client';

import { useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { INDEX_EDUCATION } from '@/lib/educational-data';

interface DataPoint { date: string; value: number; }
interface Indicateur { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; }

interface PresentationClientProps {
  indices: Record<string, Indicateur>;
  selectedKeys: string[];
  dateMAJ: string;
  onClose: () => void;
}

// Calcule la variation sur 1 mois
function getVariation1M(historique: DataPoint[], isRate: boolean): number | null {
  if (!historique || historique.length < 2) return null;
  const current = historique[historique.length - 1].value;
  const prev = historique[Math.max(0, historique.length - 2)].value;
  if (isRate) return parseFloat((current - prev).toFixed(2));
  if (prev === 0) return null;
  return parseFloat(((current - prev) / Math.abs(prev) * 100).toFixed(2));
}

// Mini sparkline SVG inline
function MiniSparkline({ data, color }: { data: DataPoint[]; color: string }) {
  if (!data || data.length < 2) return null;
  const last30 = data.slice(-30);
  const vals = last30.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 120, h = 36;
  const points = last30.map((d, i) => {
    const x = (i / (last30.length - 1)) * w;
    const y = h - ((d.value - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function PresentationClient({ indices, selectedKeys, dateMAJ, onClose }: PresentationClientProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fermer avec Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Empêcher le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const keysToShow = selectedKeys.length > 0
    ? selectedKeys
    : Object.keys(indices).filter(k => ['oat', 'inflation', 'estr', 'livreta', 'tauxImmo', 'scpi'].includes(k));

  const dateFormatee = new Date(dateMAJ).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Suivi-Taux</h1>
          <span className="text-sm text-slate-400">Mise à jour : {dateFormatee}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 italic">Appuyez sur Échap pour quitter</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grille des indicateurs */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto">
          {keysToShow.map(key => {
            const indice = indices[key];
            const edu = INDEX_EDUCATION[key];
            if (!indice) return null;

            const isRate = indice.suffixe === '%';
            const variation = getVariation1M(indice.historique, isRate);
            const color = edu?.color ?? '#64748b';
            const trend = variation === null ? 'neutral' : variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#94a3b8';

            const lastDate = indice.historique?.length
              ? new Date(indice.historique[indice.historique.length - 1].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
              : '';

            return (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-3 hover:bg-white/8 transition-colors"
                style={{ borderLeftWidth: 3, borderLeftColor: color }}
              >
                {/* Titre + catégorie */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
                      {edu?.categoryLabel ?? 'Indicateur'}
                    </p>
                    <h3 className="text-sm font-bold text-white mt-0.5">{indice.titre}</h3>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10">
                    <TrendIcon className="h-3 w-3" style={{ color: trendColor }} />
                    {variation !== null && (
                      <span className="text-xs font-medium" style={{ color: trendColor }}>
                        {variation > 0 ? '+' : ''}{variation}{isRate ? 'pp' : '%'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Valeur principale */}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {typeof indice.valeur === 'number' ? indice.valeur.toFixed(2) : '—'}
                  </span>
                  <span className="text-lg font-medium text-slate-400">{indice.suffixe}</span>
                </div>

                {/* Sparkline */}
                <div className="flex items-end justify-between">
                  <MiniSparkline data={indice.historique ?? []} color={color} />
                  <span className="text-xs text-slate-500">{lastDate}</span>
                </div>

                {/* Description courte */}
                {edu?.shortDescription && (
                  <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2">
                    {edu.shortDescription.split('.')[0]}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-3 border-t border-white/10 text-center text-xs text-slate-600">
        Sources : FRED API · BCE · INSEE · Yahoo Finance · ASPIM — Usage interne conseil
      </div>
    </div>
  );
}
