'use client';

import { useState, useEffect, useRef } from 'react';

// --- TYPES ---
type DataPoint = { date: string; value: number; };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; };
type JsonData = { date_mise_a_jour: string; indices: { [key: string]: Indicateur; }; };

// --- CONFIGURATION ---

const CATEGORIES = [
  { id: 'favorites', label: '⭐ Mes Favoris', keys: [] as string[] },
  { id: 'france_europe', label: '🇫🇷 France & Europe', keys: ['oat', 'inflation', 'cac40', 'cacmid', 'stoxx50'] },
  { id: 'monde_us', label: '🌎 Monde & US', keys: ['sp500', 'nasdaq', 'world', 'emerging', 'eurusd'] },
  // AJOUT DU BITCOIN DANS DIVERS
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
  // AJOUT DU THEME BITCOIN
  btc: { color: '#f7931a', bg: '#fff7ed', label: 'Crypto', source: 'Source : Yahoo Finance' },
};

// --- GRAPHIQUE ---
const InteractiveChart = ({ data, hexColor }: { data: DataPoint[], hexColor: string }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">Pas d'historique disponible</div>;

  const height = 250; const width = 1000; const paddingY = 20;
  const values = data.map(d => d.value);
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1;
  const getY = (val: number) => height - paddingY - ((val - min) / range) * (height - paddingY * 2);
  const getX = (index: number) => (index / (data.length - 1)) * width;

  const linePoints = data.map((d, index) => `${getX(index)},${getY(d.value)}`).join(' ');
  const areaPoints = `${linePoints} ${width},${height} 0,${height}`;
  const gradientId = `grad-${hexColor.replace('#', '')}`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (data.length - 1));
    if(index >=0 && index < data.length) setHoverIndex(index);
  };
  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="w-full mt-6 relative select-none">
      <div className="flex justify-between text-sm font-medium text-slate-500 mb-2 px-2">
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Min: {min.toFixed(2)}</div>
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Max: {max.toFixed(2)}</div>
      </div>
      <div className="relative w-full h-64">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden cursor-crosshair block" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)} onTouchMove={(e) => { const touch = e.touches[0]; const rect = e.currentTarget.getBoundingClientRect(); const x = touch.clientX - rect.left; const index = Math.round((x / rect.width) * (data.length - 1)); if(index >=0 && index < data.length) setHoverIndex(index); }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexColor} stopOpacity="0.3" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient></defs>
          <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
          <polyline points={linePoints} fill="none" stroke={hexColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {activeData && hoverIndex !== null && (<><line x1={getX(hoverIndex)} y1="0" x2={getX(hoverIndex)} y2={height} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/><circle cx={getX(hoverIndex)} cy={getY(activeData.value)} r="6" fill={hexColor} stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" /></>)}
        </svg>
        
        {activeData && hoverIndex !== null && (
            <div className="absolute top-4 bg-slate-900/95 backdrop-blur text-white text-xs rounded-lg py-2 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 transition-none z-10 border border-slate-700" style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}>
              <div className="font-medium text-slate-300 whitespace-nowrap mb-0.5">{new Date(activeData.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div className="text-center text-xl font-bold text-white tracking-wide">
                {activeData.value}
              </div>
            </div>
        )}

      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-3 px-2 uppercase tracking-wider font-medium"><span>{new Date(data[0].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span><span>{new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span></div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('favorites');
  const [favorites, setFavorites] = useState<string[]>(['oat', 'inflation', 'cac40', 'sp500']); 

  useEffect(() => {
    const savedFavs = localStorage.getItem('my_favs');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetch('/taux.json').then(res => res.json()).then(setData).catch(console.error);
  }, []);

  const toggleFavorite = (e: React.MouseEvent, key: string) => {
    e.stopPropagation(); 
    let newFavs = [];
    if (favorites.includes(key)) {
      newFavs = favorites.filter(k => k !== key);
    } else {
      newFavs = [...favorites, key];
    }
    setFavorites(newFavs);
    localStorage.setItem('my_favs', JSON.stringify(newFavs));
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  const getTrendIcon = (historique: DataPoint[]) => {
    if (!historique || historique.length < 2) return '→';
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    return last > prev ? '↗' : last < prev ? '↘' : '→';
  };
  const getLastDate = (hist: DataPoint[]) => hist && hist.length ? new Date(hist[hist.length-1].date).toLocaleDateString('fr-FR') : '—';

  let keysToDisplay: string[] = [];
  if (activeTab === 'favorites') {
    keysToDisplay = favorites;
  } else {
    const cat = CATEGORIES.find(c => c.id === activeTab);
    if (cat) keysToDisplay = cat.keys;
  }

  return (
    <main className="min-h-screen bg-slate-50/80 p-6 md:p-12 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-grow">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-[#003A7A] tracking-tight">Pédagogie des marchés</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR')} à {new Date(data.date_mise_a_jour).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
          </p>
        </header>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveTab(cat.id); setSelectedKey(null); }}
              className={`
                px-4 py-2 rounded-t-lg text-sm font-bold transition-colors flex items-center gap-2
                ${activeTab === cat.id 
                  ? 'bg-white text-[#003A7A] border-t border-x border-slate-200 shadow-sm relative -bottom-[1px]' 
                  : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
              `}
            >
              {cat.label}
              {cat.id === 'favorites' && <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{favorites.length}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'favorites' && keysToDisplay.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400 mb-2 text-lg">Votre tableau de bord est vide.</p>
            <p className="text-slate-500 text-sm">Allez dans les autres onglets et cliquez sur l'étoile ⭐ pour ajouter des indices ici.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {keysToDisplay.map((key) => {
            if (!data.indices[key]) return null;
            const item = data.indices[key];
            const theme = THEME[key] || { color: '#64748b', bg: '#f1f5f9', label: 'N/A', source: '' };
            const isSelected = selectedKey === key;
            const isFav = favorites.includes(key);

            return (
              <div 
                key={key}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                style={{ 
                   borderColor: isSelected ? theme.color : undefined,
                   backgroundColor: isSelected ? theme.bg : 'white',
                   borderLeftWidth: '4px',
                   borderLeftColor: theme.color
                }}
                className={`
                  cursor-pointer p-5 rounded-r-xl border-y border-r shadow-sm transition-all duration-300 flex flex-col justify-between group relative
                  ${isSelected ? 'ring-1' : 'hover:shadow-lg border-slate-200'}
                `}
              >
                <button 
                  onClick={(e) => toggleFavorite(e, key)}
                  className={`
                    absolute top-2 right-2 p-1.5 rounded-full transition-all z-10
                    ${isFav ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100'}
                  `}
                  title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>

                <div>
                  <div className="flex justify-between items-start mb-2 pr-6">
                     <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{item.titre}</h3>
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
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">📅 {getLastDate(item.historique)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`transition-all duration-500 ease-out ${selectedKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}>
          {selectedKey && data.indices[selectedKey] && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100" style={{ borderTop: `4px solid ${THEME[selectedKey]?.color || '#ccc'}` }}>
              <div className="mb-4">
                 <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold text-slate-900">{data.indices[selectedKey].titre}</h2>
                   <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: THEME[selectedKey].bg, color: THEME[selectedKey].color }}>Historique</span>
                 </div>
                 <p className="text-xs text-slate-400 mt-1 italic font-medium">{THEME[selectedKey]?.source || 'Source non spécifiée'}</p>
              </div>
              <InteractiveChart data={data.indices[selectedKey].historique} hexColor={THEME[selectedKey]?.color || '#2563eb'} />
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400 font-medium">Données : Yahoo Finance, FRED (BCE/Fed), INSEE. Performances passées ne préjugent pas des futures. Usage pédagogique uniquement.</p>
      </footer>
    </main>
  );
}
