'use client';

import { useState, useEffect } from 'react';

// --- TYPES ---
type DataPoint = {
  date: string;
  value: number;
};

type Indicateur = {
  titre: string;
  valeur: number;
  suffixe: string;
  historique: DataPoint[];
};

type JsonData = {
  date_mise_a_jour: string;
  indices: {
    [key: string]: Indicateur;
  };
};

// --- COMPOSANT GRAPHIQUE SVG (Sans librairie externe) ---
const SimpleChart = ({ data, color }: { data: DataPoint[], color: string }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-sm">Pas d'historique</div>;

  const height = 200;
  const width = 600; // Largeur relative
  
  // Calculs Min/Max pour l'échelle
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // Évite division par zéro

  // Création du chemin SVG (Ligne)
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width;
    // On inverse Y car SVG part du haut
    const y = height - ((d.value - min) / range) * (height - 20); 
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{new Date(data[0].date).toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})}</span>
        <span>{new Date(data[data.length-1].date).toLocaleDateString('fr-FR', {month:'short', year:'2-digit'})}</span>
      </div>
      <svg viewBox={`0 -10 ${width} ${height + 20}`} className="w-full h-48 bg-gray-50 rounded border border-gray-100 p-2">
        {/* Ligne du graphique */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
        {/* Points de début et fin */}
        <circle cx={points.split(' ')[0].split(',')[0]} cy={points.split(' ')[0].split(',')[1]} r="4" fill={color} />
        <circle cx={points.split(' ').slice(-1)[0].split(',')[0]} cy={points.split(' ').slice(-1)[0].split(',')[1]} r="4" fill={color} />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Min: {min.toFixed(2)}</span>
        <span>Max: {max.toFixed(2)}</span>
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
    // Récupération du fichier JSON généré par le script
    fetch('/taux.json')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erreur chargement", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement des données...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500">Erreur de chargement des données.</div>;

  // Calcul de la tendance (Dernier vs Avant-dernier)
  const getTrend = (historique: DataPoint[]) => {
    if (historique.length < 2) return 'neutral';
    const last = historique[historique.length - 1].value;
    const prev = historique[historique.length - 2].value;
    return last > prev ? 'up' : last < prev ? 'down' : 'neutral';
  };

  const getTrendColor = (trend: string, key: string) => {
    // Pour l'OAT et Inflation, une hausse est souvent "mauvaise" (rouge), une baisse "bonne" (vert)
    // Pour le CAC et ESTR, une hausse est "bonne" (vert)
    const inverted = ['oat', 'inflation'].includes(key);
    
    if (trend === 'up') return inverted ? 'text-red-500' : 'text-green-500';
    if (trend === 'down') return inverted ? 'text-green-500' : 'text-red-500';
    return 'text-gray-400';
  };

  const renderTrendIcon = (trend: string) => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '=';
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Observatoire des Taux</h1>
        <p className="text-sm text-slate-500 mt-1">
          Mise à jour : {new Date(data.date_mise_a_jour).toLocaleString('fr-FR')}
        </p>
      </header>

      {/* GRILLE DES TUILES */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.keys(data.indices).map((key) => {
          const item = data.indices[key];
          const trend = getTrend(item.historique);
          const isSelected = selectedKey === key;

          return (
            <div 
              key={key}
              onClick={() => setSelectedKey(isSelected ? null : key)}
              className={`
                cursor-pointer p-6 rounded-xl border transition-all duration-200 shadow-sm
                ${isSelected ? 'bg-white border-blue-500 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}
              `}
            >
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{item.titre}</h3>
              
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-800">
                  {item.valeur}
                  <span className="text-lg text-slate-400 font-normal ml-1">{item.suffixe}</span>
                </span>
              </div>

              <div className={`mt-2 text-sm font-medium flex items-center gap-1 ${getTrendColor(trend, key)}`}>
                <span>{renderTrendIcon(trend)}</span>
                <span>Tendance {trend === 'up' ? 'Hausse' : trend === 'down' ? 'Baisse' : 'Stable'}</span>
              </div>
              
              <div className="mt-4 text-xs text-slate-400 text-center border-t pt-2 border-slate-100">
                {isSelected ? 'Masquer le graphique' : 'Voir l\'évolution'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ZONE GRAPHIQUE (S'affiche si une tuile est sélectionnée) */}
      {selectedKey && (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Évolution sur 12 mois : <span className="text-blue-600">{data.indices[selectedKey].titre}</span>
            </h2>
            
            <SimpleChart 
              data={data.indices[selectedKey].historique} 
              color={['oat', 'inflation'].includes(selectedKey) ? '#ef4444' : '#22c55e'} // Rouge ou Vert selon le type
            />
            
            <p className="mt-4 text-sm text-slate-500 italic">
              * Graphique basé sur les données historiques récupérées (Historique Yahoo Finance ou FED).
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
