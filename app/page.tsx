'use client';

import { useState, useEffect, useRef } from 'react';

// --- TYPES ---
type DataPoint = { date: string; value: number; time?: number; pct?: number };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; };
type JsonData = { date_mise_a_jour: string; indices: { [key: string]: Indicateur; }; };

// --- CONFIGURATION ---
const CATEGORIES = [
  { id: 'favorites', label: '⭐ Mes Favoris', keys: [] as string[] },
  { id: 'france_europe', label: '🇫🇷 France & Europe', keys: ['oat', 'inflation', 'cac40', 'cacmid', 'stoxx50'] },
  { id: 'monde_us', label: '🌎 Monde & US', keys: ['sp500', 'nasdaq', 'world', 'emerging', 'eurusd'] },
  { id: 'divers', label: '⚖️ Diversification', keys: ['estr', 'scpi', 'gold', 'brent', 'btc'] },
];

const THEME: { [key: string]: { color: string; bg: string; label: string; source: string } } = {
  estr: { color: '#2563eb', bg: '#e8f0ff', label: 'Monétaire', source: 'Source : BCE (via FRED)' },
  oat: { color: '#16a34a', bg: '#e9f9ef', label: 'Taux État', source: 'Source : Banque de France (Moy. Mensuelle)' },
  inflation: { color: '#ef4444', bg: '#fef2f2', label: 'Prix Conso', source: 'Source : INSEE / Eurostat (HICP)' },
  eurusd: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Change', source: 'Source : Yahoo Finance' },
  cac40: { color: '#003A7A', bg: '#e6f0ff', label: 'Large Caps', source: 'Source : Yahoo Finance' },
  cacmid: { color: '#4f46e5', bg: '#eef2ff', label: 'Mid Caps (ETF)', source: 'Source : Yahoo Finance (ETF Amundi C6E)' },
  stoxx50: { color: '#0d9488', bg: '#f0fdfa', label: 'Europe', source: 'Source : Yahoo Finance' },
  sp500: { color: '#1e40af', bg: '#dbeafe', label: 'USA Large', source: 'Source : Yahoo Finance' },
  nasdaq: { color: '#7c3aed', bg: '#f3e8ff', label: 'USA Tech', source: 'Source : Yahoo Finance' },
  world: { color: '#3b82f6', bg: '#eff6ff', label: 'Monde', source: 'Source : Yahoo Finance (ETF Proxy)' },
  emerging: { color: '#d97706', bg: '#fffbeb', label: 'Émergents', source: 'Source : Yahoo Finance (ETF Proxy)' },
  scpi: { color: '#7c3aed', bg: '#f3e8ff', label: 'Pierre Papier', source: 'Source : ASPIM (Annuel)' },
  gold: { color: '#F2B301', bg: '#fffce6', label: 'Valeur Refuge', source: 'Source : Yahoo Finance' },
  brent: { color: '#334155', bg: '#f1f5f9', label: 'Énergie', source: 'Source : Yahoo Finance' },
  btc: { color: '#f7931a', bg: '#fff7ed', label: 'Crypto', source: 'Source : Yahoo Finance' },
};

// --- GRAPHIQUE MULTI-COURBES ---
const MultiLineChart = ({ datasets, mode }: { datasets: {key: string, data: DataPoint[], color: string, title: string, suffix: string}[], mode: 'real' | 'percent' }) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!datasets || datasets.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">Sélectionnez un indice pour afficher le graphique.</div>;

  const height = 300; 
  const width = 1000; 
  const paddingY = 30;

  // Préparation temporelle et Base 100
  let allTimes: number[] = [];
  const processedDatasets = datasets.map(ds => {
    if (!ds.data.length) return { ...ds, mappedData: [], minVal: 0, maxVal: 0, minPct: 0, maxPct: 0 };
    
    const firstVal = ds.data[0].value;
    const mappedData = ds.data.map(p => {
      const time = new Date(p.date).getTime();
      allTimes.push(time);
      // Calcul du pourcentage (Base 100) : (Valeur Actuelle - Valeur Initiale) / Valeur Initiale * 100
      const pct = firstVal !== 0 ? ((p.value - firstVal) / Math.abs(firstVal)) * 100 : 0;
      return { ...p, time, pct };
    });

    const vals = mappedData.map(p => p.value);
    const pcts = mappedData.map(p => p.pct);
    
    return { 
      ...ds, 
      mappedData, 
      minVal: Math.min(...vals), 
      maxVal: Math.max(...vals),
      minPct: Math.min(...pcts),
      maxPct: Math.max(...pcts)
    };
  });

  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  
  // Limites globales pour le mode Pourcentage (pour partager le même axe Y)
  const globalMinPct = Math.min(...processedDatasets.map(ds => ds.minPct));
  const globalMaxPct = Math.max(...processedDatasets.map(ds => ds.maxPct));

  const getX = (time: number) => (maxTime === minTime) ? width / 2 : ((time - minTime) / (maxTime - minTime)) * width;
  
  const getY = (ds: any, point: any) => {
    if (mode === 'percent') {
      const range = globalMaxPct - globalMinPct || 1;
      return height - paddingY - ((point.pct - globalMinPct) / range) * (height - paddingY * 2);
    } else {
      // En mode réel, chaque courbe s'adapte à sa propre hauteur (Double/Multi Axe)
      const range = ds.maxVal - ds.minVal || 1;
      return height - paddingY - ((point.value - ds.minVal) / range) * (height - paddingY * 2);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeAtX = minTime + (x / rect.width) * (maxTime - minTime);
    setHoverTime(timeAtX);
  };

  // Trouver le point le plus proche de la souris pour chaque dataset
  const getClosestPoints = () => {
    if (hoverTime === null) return [];
    return processedDatasets.map(ds => {
      if (!ds.mappedData.length) return null;
      const closest = ds.mappedData.reduce((prev, curr) => 
        Math.abs(curr.time - hoverTime) < Math.abs(prev.time - hoverTime) ? curr : prev
      );
      return { ...closest, dsColor: ds.color, dsTitle: ds.title, dsSuffix: ds.suffix, ds };
    }).filter(Boolean);
  };

  const closestPoints = getClosestPoints();
  const showFill = datasets.length === 1; // On n'affiche le dégradé que s'il y a 1 seule courbe pour la lisibilité

  return (
    <div className="w-full mt-4 relative select-none">
      
      {/* LÉGENDE DE L'AXE Y */}
      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 px-2 uppercase tracking-wide">
         <span>{mode === 'percent' ? `Min: ${globalMinPct.toFixed(1)}%` : 'Valeurs minimales (échelles propres)'}</span>
         <span>{mode === 'percent' ? `Max: ${globalMaxPct.toFixed(1)}%` : 'Valeurs maximales'}</span>
      </div>

      <div className="relative w-full h-[300px]">
        <svg 
          ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" 
          className="w-full h-full bg-slate-50 rounded-xl border border-slate-200 shadow-inner overflow-hidden cursor-crosshair block"
          onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTime(null)}
          onTouchMove={(e) => {
             const touch = e.touches[0]; const rect = e.currentTarget.getBoundingClientRect();
             const x = touch.clientX - rect.left; setHoverTime(minTime + (x / rect.width) * (maxTime - minTime));
          }}
        >
          {/* Lignes de fond (Grille) */}
          <line x1="0" y1={height/4} x2={width} y2={height/4} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#cbd5e1" strokeWidth="1" />
          <line x1="0" y1={(height/4)*3} x2={width} y2={(height/4)*3} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

          {/* DESSIN DES COURBES */}
          {processedDatasets.map((ds, i) => {
            if (!ds.mappedData.length) return null;
            const linePoints = ds.mappedData.map(p => `${getX(p.time)},${getY(ds, p)}`).join(' ');
            const gradientId = `grad-${ds.key}`;
            
            return (
              <g key={ds.key}>
                {showFill && (
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ds.color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                )}
                {showFill && <polygon points={`${linePoints} ${width},${height} 0,${height}`} fill={`url(#${gradientId})`} />}
                
                <polyline 
                  points={linePoints} fill="none" stroke={ds.color} 
                  strokeWidth={datasets.length > 2 ? "2" : "3"} 
                  strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" 
                />
              </g>
            );
          })}

          {/* HOVER EFFECT (Ligne verticale & Points) */}
          {hoverTime !== null && closestPoints.length > 0 && (
            <>
              {/* Ligne verticale au niveau de la souris (basé sur le temps) */}
              <line x1={getX(hoverTime)} y1="0" x2={getX(hoverTime)} y2={height} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Dessin des points d'intersection */}
              {closestPoints.map((cp: any, i) => (
                <circle key={i} cx={getX(cp.time)} cy={getY(cp.ds, cp)} r="5" fill={cp.dsColor} stroke="white" strokeWidth="2" />
              ))}
            </>
          )}
        </svg>

        {/* BULLE INFO (TOOLTIP MULTIPLE) */}
        {hoverTime !== null && closestPoints.length > 0 && (
            <div 
              className="absolute top-4 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl p-3 shadow-2xl pointer-events-none transform -translate-x-1/2 transition-none z-10 border border-slate-700 w-max min-w-[150px]" 
              style={{ left: `${((hoverTime - minTime) / (maxTime - minTime)) * 100}%` }}
            >
              <div className="font-medium text-slate-400 mb-2 pb-2 border-b border-slate-700/50">
                {new Date(closestPoints[0].time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              
              <div className="flex flex-col gap-2">
                {closestPoints.map((cp: any, i) => (
                  <div key={i} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cp.dsColor }}></span>
                      <span className="font-semibold text-slate-200">{cp.dsTitle}</span>
                    </div>
                    <span className="font-bold text-white text-sm">
                      {mode === 'percent' 
                        ? <span className={cp.pct >= 0 ? 'text-green-400' : 'text-red-400'}>{(cp.pct > 0 ? '+' : '')}{cp.pct.toFixed(2)}%</span>
                        : `${cp.value} ${cp.dsSuffix}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-slate-400 mt-2 px-2 uppercase tracking-wider font-medium">
        <span>{new Date(minTime).getFullYear()}</span>
        <span>Aujourd'hui</span>
      </div>
    </div>
  );
};

// --- PAGE PRINCIPALE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('favorites');
  const [favorites, setFavorites] = useState<string[]>(['cac40', 'inflation']); 
  const [chartMode, setChartMode] = useState<'real' | 'percent'>('real');

  useEffect(() => {
    const savedFavs = localStorage.getItem('my_favs');
    if (savedFavs) { try { setFavorites(JSON.parse(savedFavs)); } catch (e) {} }
  }, []);

  useEffect(() => {
    fetch('/taux.json').then(res => res.json()).then(setData).catch(console.error);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, key: string) => {
    e.stopPropagation(); 
    const newFavs = favorites.includes(key) ? favorites.filter(k => k !== key) : [...favorites, key];
    setFavorites(newFavs);
    localStorage.setItem('my_favs', JSON.stringify(newFavs));
  };

  const toggleSelection = (key: string) => {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  const getTrendIcon = (historique: DataPoint[]) => {
    if (!historique || historique.length < 2) return '→';
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    return last > prev ? '↗' : last < prev ? '↘' : '→';
  };

  let keysToDisplay: string[] = activeTab === 'favorites' ? favorites : (CATEGORIES.find(c => c.id === activeTab)?.keys || []);

  // Préparer les données pour le graphique global
  const chartDatasets = selectedKeys.map(key => ({
    key,
    data: data.indices[key]?.historique || [],
    color: THEME[key]?.color || '#000',
    title: data.indices[key]?.titre || key,
    suffix: data.indices[key]?.suffixe || ''
  })).filter(ds => ds.data.length > 0);

  return (
    <main className="min-h-screen bg-slate-50/80 p-6 md:p-12 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-grow">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#003A7A] tracking-tight">Pédagogie des marchés</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR')}
            </p>
          </div>
          
          {/* BOUTONS MODE GRAPHIQUE */}
          {selectedKeys.length > 0 && (
            <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200">
              <button 
                onClick={() => setChartMode('real')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartMode === 'real' ? 'bg-[#003A7A] text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Valeurs Réelles (Comparaison Formes)
              </button>
              <button 
                onClick={() => setChartMode('percent')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartMode === 'percent' ? 'bg-[#003A7A] text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Évolution en % (Base 100)
              </button>
            </div>
          )}
        </header>

        {/* ZONE GRAPHIQUE (Remontée en haut pour l'effet Tableau de Bord) */}
        <div className={`mb-10 transition-all duration-500 ease-out ${selectedKeys.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 overflow-hidden'}`}>
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 border-t-4 border-t-[#003A7A]">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  Comparateur de Marchés
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{selectedKeys.length} sélectionné(s)</span>
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {chartMode === 'percent' ? "Comparaison de la performance cumulée depuis l'origine." : "Superposition des courbes avec leurs propres échelles."}
                </p>
              </div>
              <button onClick={() => setSelectedKeys([])} className="text-xs font-bold text-slate-400 hover:text-red-500 underline">
                Tout désélectionner
              </button>
            </div>
            
            <MultiLineChart datasets={chartDatasets} mode={chartMode} />
            
            {/* Sources Légendes */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {chartDatasets.map(ds => (
                <div key={ds.key} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: ds.color}}></span>
                  {THEME[ds.key]?.source}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`
                px-4 py-2 rounded-t-lg text-sm font-bold transition-colors flex items-center gap-2
                ${activeTab === cat.id ? 'bg-white text-[#003A7A] border-t border-x border-slate-200 shadow-sm relative -bottom-[1px]' : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
              `}
            >
              {cat.label}
              {cat.id === 'favorites' && <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{favorites.length}</span>}
            </button>
          ))}
        </div>

        {/* GRILLE DES TUILES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {keysToDisplay.map((key) => {
            if (!data.indices[key]) return null;
            const item = data.indices[key];
            const theme = THEME[key] || { color: '#64748b', bg: '#f1f5f9', label: 'N/A', source: '' };
            const isSelected = selectedKeys.includes(key);
            const isFav = favorites.includes(key);

            return (
              <div 
                key={key}
                onClick={() => toggleSelection(key)}
                style={{ 
                   borderColor: isSelected ? theme.color : undefined,
                   backgroundColor: isSelected ? theme.bg : 'white',
                   borderLeftWidth: '4px',
                   borderLeftColor: theme.color
                }}
                className={`
                  cursor-pointer p-5 rounded-r-xl border-y border-r shadow-sm transition-all duration-200 flex flex-col justify-between group relative
                  ${isSelected ? 'ring-2 shadow-md transform -translate-y-1' : 'hover:shadow-lg border-slate-200 hover:border-slate-300'}
                `}
              >
                {/* BOUTON ÉTOILE */}
                <button 
                  onClick={(e) => toggleFavorite(e, key)}
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-10 ${isFav ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>

                <div>
                  <div className="flex justify-between items-start mb-2 pr-6">
                     <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{item.titre}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-2xl font-extrabold text-slate-900">{item.valeur}</span>
                    <span className="text-base text-slate-500 font-semibold">{item.suffixe}</span>
                  </div>
                  <div className="mt-2 text-sm font-bold flex items-center gap-1" style={{ color: theme.color }}>
                     <span>{getTrendIcon(item.historique)}</span>
                     <span className="text-xs opacity-80">Tendance</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
