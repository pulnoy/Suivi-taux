'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import RateCard from './rate-card';

interface RateData {
  type: string;
  value: number;
  previousValue: number | null;
  date: string;
  lastUpdate: string;
  history: { date: string; value: number }[];
  yearlyData?: { year: number; value: number; isYTD?: boolean }[];
  description: string;
  source: string;
}

interface ApiResponse {
  rates: RateData[];
  lastRefresh: string;
}

const rateConfig: Record<string, { title: string; unit: string; color: string; icon: string; showYearly: boolean }> = {
  ESTR: {
    title: '€STR',
    unit: '%',
    color: '#3b82f6',
    icon: '🏦',
    showYearly: false,
  },
  OAT10: {
    title: 'OAT 10 ans',
    unit: '%',
    color: '#10b981',
    icon: '📊',
    showYearly: false,
  },
  CAC40: {
    title: 'CAC40 (5 ans ann.)',
    unit: '%',
    color: '#8b5cf6',
    icon: '📈',
    showYearly: true,
  },
  SCPI: {
    title: 'SCPI (moy. 5 ans)',
    unit: '%',
    color: '#f59e0b',
    icon: '🏠',
    showYearly: true,
  },
  INFLATION: {
    title: 'Inflation France',
    unit: '%',
    color: '#ef4444',
    icon: '📉',
    showYearly: true,
  },
};

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rates');
      if (!response?.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      const result = await response?.json();
      setData(result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err?.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const getTrend = (current: number, previous: number | null): 'up' | 'down' | 'stable' => {
    if (previous === null) return 'stable';
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const formatDate = (dateStr: string) => {
    if (!mounted) return '';
    try {
      const date = new Date(dateStr);
      return date?.toLocaleDateString?.('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) ?? dateStr;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-red-600">
        <AlertCircle className="h-12 w-12" />
        <p>{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header avec date de mise à jour et bouton refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-slate-600">
          <Clock className="h-5 w-5" />
          <span className="text-sm">
            Dernière mise à jour : {mounted && data?.lastRefresh ? formatDate(data.lastRefresh) : '...'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* Grille des cartes de taux */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(data?.rates ?? [])?.map?.((rate) => {
          const config = rateConfig?.[rate?.type] ?? { title: rate?.type ?? 'Inconnu', unit: '%', color: '#6b7280', icon: '📊', showYearly: false };
          const trend = getTrend(rate?.value ?? 0, rate?.previousValue ?? null);

          return (
            <RateCard
              key={rate?.type ?? Math.random()}
              title={config?.title}
              value={rate?.value ?? 0}
              unit={config?.unit}
              trend={trend}
              color={config?.color}
              icon={config?.icon}
              description={rate?.description ?? ''}
              source={rate?.source ?? ''}
              lastUpdate={mounted ? formatDate(rate?.date ?? '') : ''}
              history={rate?.history ?? []}
              yearlyData={rate?.yearlyData ?? []}
              showYearly={config?.showYearly}
            />
          );
        })}
      </div>

      {/* Section informations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Informations sur les données</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <div className="space-y-2">
            <p><strong>€STR</strong> : Taux interbancaire au jour le jour de la zone euro (BCE).</p>
            <p><strong>OAT 10 ans</strong> : Rendement des obligations du Trésor français à 10 ans (FRED API).</p>
            <p><strong>CAC40</strong> : Performance annualisée sur 5 ans + YTD (Alpha Vantage).</p>
          </div>
          <div className="space-y-2">
            <p><strong>SCPI</strong> : Taux de distribution moyen (ASPIM-IEIF).</p>
            <p><strong>Inflation France</strong> : Indice des prix à la consommation annuel (FRED/World Bank).</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Mise à jour automatique quotidienne.</strong> Sources : BCE, FRED API, Alpha Vantage, ASPIM-IEIF.
          </p>
        </div>
      </div>
    </div>
  );
}
