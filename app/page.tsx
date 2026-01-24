'use client';

import { useState, useEffect, useRef } from 'react';

type DataPoint = { date: string; value: number; };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; };
type JsonData = { date_mise_a_jour: string; indices: { [key: string]: Indicateur; }; };

// --- GRAPHIQUE INTERACTIF AVEC TOOLTIP ---
const InteractiveChart = ({ data, themeColor }: { data: DataPoint[], themeColor: string }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">Pas d'historique disponible</div>;

  // On garde les dimensions internes fixes pour le calcul, l'affichage sera étiré
  const height = 250;
  const width = 1000; // Augmenté pour plus de précision interne
  const paddingY = 20; // Réduit pour maximiser l'espace vertical

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const getY = (val: number) => height - paddingY - ((val - min) / range) * (height - paddingY * 2);
  const getX = (index: number) => (index / (data.length - 1)) * width;

  const linePoints = data.map((d, index) => `${getX(index)},${getY(d.value)}`).join(' ');
  const areaPoints = `${linePoints} ${width},${height} 0,${height}`;

  const colors = {
    red: { stroke: 'stroke-red-500', fill: 'fill-red-500', gradientStart: 'rgb(239 68 68)', text: 'text-red-600' },
    emerald: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500', gradientStart: 'rgb(16 185 129)', text: 'text-emerald-600' },
    blue: { stroke: 'stroke-blue-500', fill: 'fill-blue-500', gradientStart: 'rgb(59 130 246)', text: 'text-blue-600' }
  };
  
  const theme = colors[themeColor as keyof typeof colors] || colors.emerald;
  const gradientId = `gradient-${themeColor}`;

  // Gestion du survol souris
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    
    // Le ratio X doit être calculé par rapport à la largeur REELLE affichée (rect.width)
    const x = e.clientX - rect.left; 
    
    // On ramène cette position à notre échelle interne (0 -> 1000)
    // Comme preserveAspectRatio="none" est activé, la conversion est linéaire
    const indexFloat = (x / rect.width) * (data.length - 1);
    let index = Math.round(indexFloat);

    // Bornes de sécurité
    if (index < 0) index = 0;
    if (index >= data.length) index = data.length - 1;
    
    setHoverIndex(index);
  };

  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="w-full mt-6 relative select-none"> {/* select-none évite de surligner du texte en bougeant */}
      <div className="flex justify-between text-sm font-medium text-slate-500 mb-2 px-2">
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Min: {min.toFixed(2)}</div>
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Max: {max.toFixed(2)}</div>
      </div>

      <div className="relative w-full h-64"> {/* Conteneur fixe en hauteur */}
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="none" 
          className="w-full h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={(e) => {
             // Support basique tactile pour mobile
             const touch = e.touches[0];
             const rect = e.currentTarget.getBoundingClientRect();
             const x = touch.clientX - rect.left;
             const index = Math.round((x / rect.width) * (data.length - 1));
             if(index >=0 && index < data.length) setHoverIndex(index);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.gradientStart} stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille légère */}
          <line x1="0" y1={getY(min)} x2={width} y2={getY(min)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
          <line x1="0" y1={getY(max)} x2={width} y2={getY(max)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
          
          <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
          <polyline points={linePoints} fill="none" className={theme.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

          {/* Curseur Interactif */}
          {activeData && hoverIndex !== null && (
            <>
              {/* Ligne verticale : vectorEffect garantit qu'elle reste fine même étirée */}
              <line 
                x1={getX(hoverIndex)} y1="0" 
                x2={getX(hoverIndex)} y2={height} 
                stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" 
                vectorEffect="non-scaling-stroke"
              />
              {/* Point sur la courbe */}
              <circle 
                cx={getX(hoverIndex)} cy={getY(activeData.value)} r="6" 
                className={`stroke-white stroke-2 ${theme.fill}`} 
                vectorEffect="non-scaling-stroke" // Garde le cercle rond même si le graph est étiré !
              />
            </>
          )}
        </svg>

        {/* TOOLTIP FLOTTANT */}
        {activeData && hoverIndex !== null && (
            <div 
              className="absolute top-4 bg-slate-800/90 backdrop-blur text-white text-xs rounded-lg py-2 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 transition-none z-10 border border-slate-700"
              style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}
            >
              <div className="font-bold whitespace-nowrap mb-0.5">{new Date(activeData.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div className={`text-center text-lg font-bold ${theme.text.replace('text-', 'text-emerald-300 ')}`}>
                {activeData.value}
              </div>
            </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-slate-400 mt-3 px-2 uppercase tracking-wider font-medium">
        <span>{new Date(data[0].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
};

// --- PAGE PRINCIPALE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/taux.json').then(res => res.json()).then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  const getTrendInfo = (historique: DataPoint[], key: string) => {
    if (historique.length < 2) return { color: 'gray', icon: '→', label: 'Stable' };
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    const inverted = ['oat', 'inflation'].includes(key);
    
    if (key === 'scpi') return { color: 'blue', icon: '★', label: 'Rendement' };

    if (last > prev) return { color: inverted ? 'red' : 'emerald', icon: '↗', label: 'Hausse' };
    if (last < prev) return { color: inverted ? 'emerald' : 'red', icon: '↘', label: 'Baisse' };
    return { color: 'gray', icon: '→', label: 'Stable' };
  };

  return (
    <main className="min-h-screen bg-slate-50/80 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-slate-900">Observatoire Financier</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {Object.keys(data.indices).map((key) => {
            const item = data.indices[key];
            const trend = getTrendInfo(item.historique, key);
            const isSelected = selectedKey === key;
            const colors = {
              red: 'ring-red-400 bg-red-50',
              emerald: 'ring-emerald-400 bg-emerald-50',
              blue: 'ring-blue-400 bg-blue-50',
              gray: 'ring-slate-300'
            };
            
            return (
              <div 
                key={key}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                className={`
                  cursor-pointer p-5 rounded-2xl border shadow-sm transition-all duration-300 
                  ${isSelected ? `ring-2 ${colors[trend.color as keyof typeof colors]}` : 'hover:shadow-lg bg-white border-slate-200'}
                `}
              >
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{item.titre}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-extrabold text-slate-900">{item.valeur}</span>
                  <span className="text-lg text-slate-500 font-semibold">{item.suffixe}</span>
                </div>
                <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-slate-100 text-${trend.color === 'blue' ? 'blue' : trend.color}-600`}>
                  <span>{trend.icon}</span><span>{trend.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* GRAPHIQUE */}
        <div className={`transition-all duration-500 ease-out ${selectedKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}>
          {selectedKey && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{data.indices[selectedKey].titre}</h2>
              <InteractiveChart 
                data={data.indices[selectedKey].historique} 
                themeColor={getTrendInfo(data.indices[selectedKey].historique, selectedKey).color}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
