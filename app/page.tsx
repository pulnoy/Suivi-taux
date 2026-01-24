'use client';

import { useState, useEffect, useRef } from 'react';

// --- TYPES ---
type DataPoint = { date: string; value: number; };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; };
type JsonData = { date_mise_a_jour: string; indices: { [key: string]: Indicateur; }; };

// --- CONFIGURATION DU THÈME & SOURCES ---
const THEME: { [key: string]: { color: string; bg: string; label: string; source: string } } = {
  estr: { 
    color: '#2563eb', 
    bg: '#e8f0ff', 
    label: 'Monétaire',
    source: 'Source : Banque Centrale Européenne (via FRED)'
  },
  oat: { 
    color: '#16a34a', 
    bg: '#e9f9ef', 
    label: 'Obligataire',
    source: 'Source : Banque de France (via FRED)'
  },
  cac40: { 
    color: '#F2B301', 
    bg: '#fff7e6', 
    label: 'Dynamique',
    source: 'Source : Yahoo Finance'
  },
  scpi: { 
    color: '#7c3aed', 
    bg: '#f3e8ff', 
    label: 'Immobilier',
    source: 'Source : ASPIM / France SCPI (Données annuelles)'
  },
  inflation: { 
    color: '#ef4444', 
    bg: '#fef2f2', 
    label: 'Indicateur',
    source: 'Source : OCDE / INSEE (via FRED)'
  }
};

// Ordre d'affichage demandé
const DISPLAY_ORDER = ['estr', 'oat', 'cac40', 'scpi', 'inflation'];

// --- GRAPHIQUE INTERACTIF ---
const InteractiveChart = ({ data, hexColor }: { data: DataPoint[], hexColor: string }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">Pas d'historique disponible</div>;

  const height = 250;
  const width = 1000;
  const paddingY = 20;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
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
    const indexFloat = (x / rect.width) * (data.length - 1);
    let index = Math.round(indexFloat);
    if (index < 0) index = 0;
    if (index >= data.length) index = data.length - 1;
    setHoverIndex(index);
  };

  const activeData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="w-full mt-6 relative select-none">
      <div className="flex justify-between text-sm font-medium text-slate-500 mb-2 px-2">
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Min: {min.toFixed(2)}</div>
         <div className="bg-slate-100 px-3 py-1 rounded-full text-xs">Max: {max.toFixed(2)}</div>
      </div>

      <div className="relative w-full h-64">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="none" 
          className="w-full h-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={(e) => {
             const touch = e.touches[0];
             const rect = e.currentTarget.getBoundingClientRect();
             const x = touch.clientX - rect.left;
             const index = Math.round((x / rect.width) * (data.length - 1));
             if(index >=0 && index < data.length) setHoverIndex(index);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hexColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1="0" y1={getY(min)} x2={width} y2={getY(min)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
          <line x1="0" y1={getY(max)} x2={width} y2={getY(max)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
          
          <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
          <polyline points={linePoints} fill="none" stroke={hexColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

          {activeData && hoverIndex !== null && (
            <>
              <line x1={getX(hoverIndex)} y1="0" x2={getX(hoverIndex)} y2={height} stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
              <circle cx={getX(hoverIndex)} cy={getY(activeData.value)} r="6" fill={hexColor} stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>

        {activeData && hoverIndex !== null && (
            <div 
              className="absolute top-4 bg-slate-800/90 backdrop-blur text-white text-xs rounded-lg py-2 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 transition-none z-10 border border-slate-700"
              style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}
            >
              <div className="font-bold whitespace-nowrap mb-0.5">{new Date(activeData.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div className="text-center text-lg font-bold" style={{ color: hexColor === '#F2B301' ? '#fbbf24' : hexColor }}>
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

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement des données...</div>;

  const getTrendIcon = (historique: DataPoint[], key: string) => {
    if (historique.length < 2) return '→';
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    if (last > prev) return '↗';
    if (last < prev) return '↘';
    return '→';
  };

  return (
    <main className="min-h-screen bg-slate-50/80 p-6 md:p-12 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-grow">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-[#003A7A] tracking-tight">Pédagogie des marchés</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Mise à jour : {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR')}
          </p>
        </header>

        {/* GRILLE DES TUILES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {DISPLAY_ORDER.map((key) => {
            if (!data.indices[key]) return null;
            const item = data.indices[key];
            const theme = THEME[key] || { color: '#64748b', bg: '#f1f5f9', label: 'Autre', source: '' };
            const isSelected = selectedKey === key;
            const icon = getTrendIcon(item.historique, key);

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
                  cursor-pointer p-5 rounded-r-xl border-y border-r shadow-sm transition-all duration-300
                  ${isSelected ? 'ring-1' : 'hover:shadow-lg border-slate-200'}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                     {item.titre}
                   </h3>
                   <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.bg, color: theme.color }}>
                     {theme.label}
                   </span>
                </div>

                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-extrabold text-slate-900">{item.valeur}</span>
                  <span className="text-lg text-slate-500 font-semibold">{item.suffixe}</span>
                </div>
                
                <div className="mt-2 text-sm font-bold flex items-center gap-1" style={{ color: theme.color }}>
                   <span>{icon}</span>
                   <span className="text-xs opacity-80">Tendance</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ZONE GRAPHIQUE */}
        <div className={`transition-all duration-500 ease-out ${selectedKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}>
          {selectedKey && data.indices[selectedKey] && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100" 
                 style={{ borderTop: `4px solid ${THEME[selectedKey]?.color || '#ccc'}` }}>
              
              <div className="mb-4">
                 <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold text-slate-900">{data.indices[selectedKey].titre}</h2>
                   <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide" 
                         style={{ backgroundColor: THEME[selectedKey].bg, color: THEME[selectedKey].color }}>
                      Historique
                   </span>
                 </div>
                 {/* SOURCE AJOUTÉE ICI */}
                 <p className="text-xs text-slate-400 mt-1 italic font-medium">
                    {THEME[selectedKey]?.source || 'Source non spécifiée'}
                 </p>
              </div>
              
              <InteractiveChart 
                data={data.indices[selectedKey].historique} 
                hexColor={THEME[selectedKey]?.color || '#2563eb'}
              />
            </div>
          )}
        </div>
      </div>

      {/* PIED DE PAGE AVEC SOURCES GLOBALES */}
      <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400 font-medium">
          Données agrégées automatiquement via API publiques (BCE, FRED, Yahoo Finance).<br/>
          Les performances passées ne préjugent pas des performances futures. Usage interne uniquement.
        </p>
      </footer>
    </main>
  );
}
