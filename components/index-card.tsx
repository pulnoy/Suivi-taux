'use client';

import { useMemo } from 'react';
import { Sparkline } from './sparkline';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { getVariation, formatNumber } from '@/lib/financial-utils';
import { Star, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  value: number;
}

interface IndexCardProps {
  indexKey: string;
  title: string;
  value: number;
  suffix: string;
  historique: DataPoint[];
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onShowInfo: (e: React.MouseEvent) => void;
}

export function IndexCard({
  indexKey,
  title,
  value,
  suffix,
  historique,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onShowInfo
}: IndexCardProps) {
  const education = INDEX_EDUCATION[indexKey];
  const isRate = suffix === '%';
  
  // Calculate variations
  const variations = useMemo(() => {
    if (!historique || historique.length < 2) {
      return { day: 0, week: 0, month: 0 };
    }
    
    const current = historique[historique.length - 1]?.value ?? value;
    const prev1 = historique[historique.length - 2]?.value ?? current;
    const prev7 = historique[Math.max(0, historique.length - 8)]?.value ?? current;
    const prev30 = historique[Math.max(0, historique.length - 31)]?.value ?? current;
    
    return {
      day: getVariation(current, prev1, isRate),
      week: getVariation(current, prev7, isRate),
      month: getVariation(current, prev30, isRate)
    };
  }, [historique, value, isRate]);
  
  // Get recent data for sparkline (last 30 points)
  const sparklineData = useMemo(() => {
    if (!historique || historique.length === 0) return [];
    return historique.slice(-30);
  }, [historique]);
  
  // Determine trend
  const trend = useMemo(() => {
    if (variations.day > 0.01) return 'up';
    if (variations.day < -0.01) return 'down';
    return 'neutral';
  }, [variations.day]);
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
  const variationColor = variations.day >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  
  return (
    <div
      onClick={onSelect}
      style={{
        borderLeftColor: education?.color || '#64748b',
        backgroundColor: isSelected ? (education?.bgColor || '#f8fafc') : undefined
      }}
      className={cn(
        'cursor-pointer p-4 rounded-r-xl border-l-4 border-y border-r shadow-sm',
        'transition-all duration-200 flex flex-col justify-between group relative',
        'bg-card hover:shadow-lg',
        isSelected 
          ? 'ring-2 ring-primary/50 shadow-md transform -translate-y-0.5' 
          : 'border-border hover:border-border/80 dark:bg-card',
        'min-h-[140px]'
      )}
    >
      {/* Top actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          onClick={onShowInfo}
          className={cn(
            'p-1.5 rounded-full transition-all z-10',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            'opacity-0 group-hover:opacity-100'
          )}
          title="Voir les détails"
        >
          <Info className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleFavorite}
          className={cn(
            'p-1.5 rounded-full transition-all z-10',
            isFavorite 
              ? 'text-yellow-400 hover:text-yellow-500' 
              : 'text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100'
          )}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      {/* Category badge */}
      {education && (
        <div 
          className="absolute top-2 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
          style={{ 
            backgroundColor: `${education.color}15`,
            color: education.color 
          }}
        >
          {education.categoryLabel}
        </div>
      )}
      
      {/* Main content */}
      <div className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {title}
        </h3>
        
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-foreground">
            {formatNumber(value, suffix === '%' ? 2 : (value >= 1000 ? 0 : 2))}
          </span>
          <span className="text-base text-muted-foreground font-semibold">
            {suffix}
          </span>
          <TrendIcon className={cn('h-4 w-4 ml-1', trendColor)} />
        </div>
      </div>
      
      {/* Bottom section: Variation + Sparkline */}
      <div className="mt-3 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className={cn('text-xs font-semibold', variationColor)}>
            {variations.day >= 0 ? '+' : ''}{formatNumber(variations.day, 2)}{isRate ? ' pts' : '%'}
            <span className="text-muted-foreground font-normal ml-1">(1J)</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            {variations.month >= 0 ? '+' : ''}{formatNumber(variations.month, 2)}{isRate ? ' pts' : '%'} (1M)
          </span>
        </div>
        
        <div className="opacity-60 group-hover:opacity-100 transition-opacity">
          <Sparkline 
            data={sparklineData} 
            width={70} 
            height={28} 
            color={education?.color}
          />
        </div>
      </div>
    </div>
  );
}
