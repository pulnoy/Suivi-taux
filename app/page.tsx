'use client';

import { useState, useEffect } from 'react';

// --- TYPES ---
type DataPoint = { date: string; value: number; };
type Indicateur = { titre: string; valeur: number; suffixe: string; historique: DataPoint[]; };
type JsonData = { date_mise_a_jour: string; indices: { [key: string]: Indicateur; }; };

// --- COMPOSANT GRAPHIQUE SVG AMÉLIORÉ (Avec dégradé) ---
const ModernChart = ({ data, themeColor }: { data: DataPoint[], themeColor: string }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-sm py-8 text-center">Pas d'historique disponible</div>;

  const height = 250;
  const width = 800;
  const paddingY = 30; // Marge verticale interne

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Fonction pour calculer Y en fonction de la valeur
  const getY = (val: number) => height - paddingY - ((val - min) / range) * (height - paddingY * 2);
  
  // Création des points de la ligne
  const linePoints = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width;
    return `${x},${getY(d.value)}`;
  }).join(' ');

  // Création de la zone de remplissage (le polygone sous la ligne)
  // On part du dernier point, on descend en bas à droite, on va en bas à gauche, et on remonte au premier point.
  const areaPoints = `${linePoints} ${width},${height} 0,${height}`;

  const startData = data[0];
  const endData = data[data.length - 1];

  // Définition des couleurs CSS basées sur le thème
  const strokeColorClass = themeColor === 'red' ? 'stroke-red-500' : 'stroke-emerald-500';
  const pointColorClass = themeColor === 'red' ? 'fill-red-500' : 'fill-emerald-500';
  // IDs uniques pour les dégradés SVG
  const gradientId = `gradient-${themeColor}`;

  return (
    <div className="w-full mt-6">
      {/* Info bulles Min/Max au-dessus du graph */}
      <div className="flex justify-between text-sm font-medium text-slate-500 mb-4 px-2">
         <div className="bg-slate-100 px-3 py-1 rounded-full">
            <span className="text-xs text-slate-400 mr-2">Plus bas :</span> 
            {min.toFixed(2)}
         </div>
         <div className="bg-slate-100 px-3 py-1 rounded-full">
            <span className="text-xs text-slate-400 mr-2">Plus haut :</span>
            {max.toFixed(2)}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <defs>
          {/* Dégradé linéaire pour le remplissage */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeColor === 'red' ? 'rgb(239 68 68)' : 'rgb(16 185 129)'} stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille horizontale légère */}
        <line x1="0" y1={getY(min)} x2={width} y2={getY(min)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>
        <line x1="0" y1={getY(max)} x2={width} y2={getY(max)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"/>

        {/* Zone de remplissage (Area) */}
        <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />

        {/* Ligne principale */}
        <polyline points={linePoints} fill="none" className={strokeColorClass} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* Points Début et Fin */}
        <circle cx="0" cy={getY(startData.value)} r="5" className={`stroke-white stroke-2 ${pointColorClass}`} />
        <circle cx={width} cy={getY(endData.value)} r="5" className={`stroke-white stroke-2 ${pointColorClass}`} />
      </svg>

      {/* Dates en bas */}
      <div className="flex justify-between text-xs text-slate-400 mt-3 px-2 uppercase tracking-wider font-medium">
        <span>{new Date(startData.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
        <span>{new Date(endData.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
};

// --- PAGE PRINCIPALE ---
export default function Dashboard() {
  const [data, setData] = useState<JsonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/taux.json').then(res => res.json()).then(d => { setData(d); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium text-slate-500 bg-slate-50">Chargement de l'observatoire...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center font-medium text-red-500 bg-slate-50">Erreur de chargement des données.</div>;

  // Logique de tendance
  const getTrendInfo = (historique: DataPoint[], key: string) => {
    if (historique.length < 2) return { direction: 'neutral', color: 'gray', icon: '→', label: 'Stable' };
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    
    // Pour OAT/Inflation, la hausse est "négative" (rouge)
    const inverted = ['oat', 'inflation'].includes(key);
    
    if (last > prev) return { direction: 'up', color: inverted ? 'red' : 'emerald', icon: '↗', label: 'En hausse' };
    if (last < prev) return { direction: 'down', color: inverted ? 'emerald' : 'red', icon: '↘', label: 'En baisse' };
    return { direction: 'neutral', color: 'gray', icon: '→', label: 'Stable' };
  };

  return (
    <main className="min-h-screen bg-slate-50/80 p-6 md:p-12 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Observatoire Financier</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center justify-center md:justify-start gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Données mises à jour le {new Date(data.date_mise_a_jour).toLocaleDateString('fr-FR')} à {new Date(data.date_mise_a_jour).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
          </p>
        </header>

        {/* GRILLE DES TUILES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {Object.keys(data.indices).map((key) => {
            const item = data.indices[key];
            const trend = getTrendInfo(item.historique, key);
            const isSelected = selectedKey === key;
            
            // Classes dynamiques selon la sélection et la tendance
            const selectionClasses = isSelected 
              ? (trend.color === 'red' ? 'ring-2 ring-red-400 bg-red-50/50' : 'ring-2 ring-emerald-400 bg-emerald-50/50')
              : 'hover:shadow-lg hover:-translate-y-1 bg-white border-slate-200';

            const trendTextColor = trend.color === 'red' ? 'text-red-600' : (trend.color === 'emerald' ? 'text-emerald-600' : 'text-slate-500');
            const trendBgColor = trend.color === 'red' ? 'bg-red-100' : (trend.color === 'emerald' ? 'bg-emerald-100' : 'bg-slate-100');

            return (
              <div 
                key={key}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                className={`
                  cursor-pointer p-6 rounded-2xl border shadow-sm transition-all duration-300 flex flex-col justify-between
                  ${selectionClasses}
                `}
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{item.titre}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{item.valeur}</span>
                    <span className="text-xl text-slate-500 font-semibold">{item.suffixe}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${trendBgColor} ${trendTextColor}`}>
                    <span className="text-lg leading-none">{trend.icon}</span>
                    <span>{trend.label}</span>
                  </div>
                   <div className={`text-xs font-medium transition-colors duration-300 ${isSelected ? trendTextColor : 'text-slate-400'}`}>
                      {isSelected ? 'Masquer le graphique' : 'Voir l\'historique'}
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ZONE GRAPHIQUE */}
        <div className={`transition-all duration-500 ease-in-out ${selectedKey ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}>
          {selectedKey && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Historique 12 mois</h2>
                  <p className="text-slate-500">{data.indices[selectedKey].titre}</p>
                </div>
                 {/* Indicateur visuel du thème du graphique */}
                 <div className={`hidden md:block px-4 py-2 rounded-xl text-sm font-bold capitalize
                    ${getTrendInfo(data.indices[selectedKey].historique, selectedKey).color === 'red' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
                 `}>
                    Thème {getTrendInfo(data.indices[selectedKey].historique, selectedKey).color === 'red' ? 'Alerte' : 'Positif'}
                 </div>
              </div>
              
              <ModernChart 
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
