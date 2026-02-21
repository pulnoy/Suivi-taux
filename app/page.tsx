'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { IndexCard } from '@/components/index-card';
import { EnhancedChart } from '@/components/enhanced-chart';
import { Comparator } from '@/components/comparator';
import { CorrelationView } from '@/components/correlation-view';
import { IndexInfoModal } from '@/components/index-info-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { INDEX_EDUCATION } from '@/lib/educational-data';
import { filterDataByPeriod, formatNumber } from '@/lib/financial-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  GitCompareArrows, 
  Network, 
  Star,
  RefreshCw,
  ChevronDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
type DataPoint = { date: string; value: number; timestamp?: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[] };
type JsonData = { date_mise_a_jour: string; indices: Record<string, Indicateur> };

// --- CONFIGURATION ---
const CATEGORIES = [
  { id: 'favorites', label: 'Mes Favoris', icon: Star, keys: [] as string[] },
  { id: 'france_europe', label: 'France & Europe', emoji: '🇫🇷', keys: ['oat', 'inflation', 'cac40', 'cacmid', 'stoxx50'] },
  { id: 'monde_us', label: 'Monde & US', emoji: '🌎', keys: ['sp500', 'nasdaq', 'world', 'emerging', 'eurusd'] },
  { id: 'divers', label: 'Diversification', emoji: '⚖️', keys: ['estr', 'scpi', 'gold', 'brent', 'btc'] },
];

const DEFAULT_FAVORITES = ['oat', 'inflation', 'scpi', 'estr'];

type Period = '1M' | '3M' | '6M' | '1A' | '5A' | 'MAX';

// --- LOADING SKELETON ---
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <Skeleton className="h-10 w-80 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeCategory, setActiveCategory] = useState('favorites');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  
  const [chartMode, setChartMode] = useState<'real' | 'percent' | 'absolute'>('percent');
  const [chartPeriod, setChartPeriod] = useState<Period>('1A');
  const [showMA50, setShowMA50] = useState(false);
  const [showMA200, setShowMA200] = useState(false);
  
  const [infoModalKey, setInfoModalKey] = useState<string | null>(null);
  
  // Comparator state
  const [comparatorKeys, setComparatorKeys] = useState<string[]>(['oat', 'cac40']);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavs = localStorage.getItem('my_favs');
    if (savedFavs) {
      try { 
        setFavorites(JSON.parse(savedFavs)); 
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/taux.json');
        if (!res.ok) throw new Error('Erreur lors du chargement des données');
        const jsonData = await res.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key];
      localStorage.setItem('my_favs', JSON.stringify(newFavs));
      return newFavs;
    });
  }, []);

  // Toggle selection
  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : prev.length < 5 ? [...prev, key] : prev
    );
  }, []);

  // Show info modal
  const showInfo = useCallback((e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setInfoModalKey(key);
  }, []);

  // Clear selections
  const clearSelections = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  // Get keys to display in current category
  const keysToDisplay = useMemo(() => {
    if (activeCategory === 'favorites') return favorites;
    return CATEGORIES.find(c => c.id === activeCategory)?.keys || [];
  }, [activeCategory, favorites]);

  // Prepare chart datasets
  const chartDatasets = useMemo(() => {
    if (!data) return [];
    return selectedKeys.map(key => {
      const index = data.indices[key];
      if (!index) return null;
      
      const filteredData = filterDataByPeriod(index.historique, chartPeriod);
      return {
        key,
        data: filteredData,
        color: INDEX_EDUCATION[key]?.color || '#64748b',
        title: index.titre,
        suffix: index.suffixe
      };
    }).filter(Boolean) as { key: string; data: DataPoint[]; color: string; title: string; suffix: string }[];
  }, [data, selectedKeys, chartPeriod]);

  // Check if all selected are rates
  const areAllRates = useMemo(() => {
    return chartDatasets.length > 0 && chartDatasets.every(ds => ds.suffix === '%');
  }, [chartDatasets]);

  // Effective chart mode
  const effectiveMode = chartMode === 'absolute' && !areAllRates ? 'real' : chartMode;

  // Period buttons
  const periodButtons: { value: Period; label: string }[] = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1A', label: '1A' },
    { value: '5A', label: '5A' },
    { value: 'MAX', label: 'Max' },
  ];

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive text-lg mb-4">{error || 'Données non disponibles'}</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#003A7A] dark:text-blue-400 tracking-tight">
              Suivi-Taux
            </h1>
            <p className="text-xs text-muted-foreground">
              Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </TabsTrigger>
            <TabsTrigger value="comparator" className="gap-2">
              <GitCompareArrows className="h-4 w-4" />
              <span className="hidden sm:inline">Comparateur</span>
            </TabsTrigger>
            <TabsTrigger value="correlation" className="gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Corrélations</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Chart Section (appears when indices selected) */}
            {selectedKeys.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-foreground">
                      Graphique
                    </h2>
                    <Badge variant="secondary">{selectedKeys.length} indice{selectedKeys.length > 1 ? 's' : ''}</Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Period buttons */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      {periodButtons.map(btn => (
                        <Button
                          key={btn.value}
                          variant={chartPeriod === btn.value ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setChartPeriod(btn.value)}
                          className="h-7 px-2 text-xs"
                        >
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Mode buttons */}
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <Button
                        variant={effectiveMode === 'real' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChartMode('real')}
                        className="h-7 px-2 text-xs"
                      >
                        Valeurs
                      </Button>
                      {areAllRates && (
                        <Button
                          variant={effectiveMode === 'absolute' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setChartMode('absolute')}
                          className="h-7 px-2 text-xs"
                        >
                          Absolu
                        </Button>
                      )}
                      <Button
                        variant={effectiveMode === 'percent' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChartMode('percent')}
                        className="h-7 px-2 text-xs"
                      >
                        Base 100
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelections}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Effacer
                    </Button>
                  </div>
                </div>
                
                <EnhancedChart
                  datasets={chartDatasets}
                  mode={effectiveMode}
                  period={chartPeriod}
                  showMA50={showMA50}
                  showMA200={showMA200}
                  onToggleMA50={() => setShowMA50(!showMA50)}
                  onToggleMA200={() => setShowMA200(!showMA200)}
                />
                
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {chartDatasets.map(ds => (
                    <button
                      key={ds.key}
                      onClick={() => toggleSelection(ds.key)}
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        "bg-muted px-3 py-1.5 rounded-full",
                        "hover:bg-muted/80 transition-colors"
                      )}
                    >
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ds.color }}
                      />
                      {ds.title}
                      <X className="h-3 w-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-1">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors flex items-center gap-2",
                      activeCategory === cat.id 
                        ? "bg-card text-primary border-t border-x border-border shadow-sm relative -bottom-[1px]" 
                        : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : <span>{cat.emoji}</span>}
                    {cat.label}
                    {cat.id === 'favorites' && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                        {favorites.length}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Index Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {keysToDisplay.map((key, index) => {
                const index_data = data.indices[key];
                if (!index_data) return null;
                
                return (
                  <div 
                    key={key}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <IndexCard
                      indexKey={key}
                      title={index_data.titre}
                      value={index_data.valeur}
                      suffix={index_data.suffixe}
                      historique={index_data.historique}
                      isSelected={selectedKeys.includes(key)}
                      isFavorite={favorites.includes(key)}
                      onSelect={() => toggleSelection(key)}
                      onToggleFavorite={(e) => toggleFavorite(e, key)}
                      onShowInfo={(e) => showInfo(e, key)}
                    />
                  </div>
                );
              })}
            </div>

            {keysToDisplay.length === 0 && activeCategory === 'favorites' && (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Aucun favori</p>
                <p className="text-sm">Cliquez sur l'étoile d'une tuile pour l'ajouter à vos favoris</p>
              </div>
            )}
          </TabsContent>

          {/* Comparator Tab */}
          <TabsContent value="comparator">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Comparateur d'Indices</h2>
                <p className="text-sm text-muted-foreground">
                  Comparez jusqu'à 5 indices avec des statistiques détaillées et un tableau de corrélation
                </p>
              </div>
              <Comparator
                indices={data.indices}
                selectedKeys={comparatorKeys}
                onKeysChange={setComparatorKeys}
              />
            </div>
          </TabsContent>

          {/* Correlation Tab */}
          <TabsContent value="correlation">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-2">Analyse de Corrélation</h2>
                <p className="text-sm text-muted-foreground">
                  Visualisez les corrélations entre indices avec une matrice et un scatter plot interactif
                </p>
              </div>
              <CorrelationView indices={data.indices} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Info Modal */}
      <IndexInfoModal
        indexKey={infoModalKey}
        value={infoModalKey ? data.indices[infoModalKey]?.valeur : undefined}
        suffix={infoModalKey ? data.indices[infoModalKey]?.suffixe : undefined}
        historique={infoModalKey ? data.indices[infoModalKey]?.historique : undefined}
        isOpen={!!infoModalKey}
        onClose={() => setInfoModalKey(null)}
      />

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground">
          <p>
            Données fournies par FRED API, Yahoo Finance et ASPIM. 
            Mise à jour automatique quotidienne.
          </p>
          <p className="mt-1">
            © {new Date().getFullYear()} Suivi-Taux — Outil pédagogique pour conseillers financiers
          </p>
        </div>
      </footer>
    </main>
  );
}
