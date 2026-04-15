export type UpdateFreq = {
  label: string;  // Fréquence affichée dans le tableau
  maxDays: number; // Seuil au-delà duquel la donnée est considérée périmée
};

// Fréquence cible + délai de tolérance par indice
export const UPDATE_FREQUENCY: Record<string, UpdateFreq> = {
  // Taux — quotidien (jours ouvrés, tolérance weekend+1j)
  oat:          { label: 'Mensuel',         maxDays: 60 },
  tec10:        { label: 'Quotidien',       maxDays: 5  },
  estr:         { label: 'Quotidien',       maxDays: 5  },
  // BCE — par réunion (~8×/an soit toutes les 6 semaines)
  tauxDepotBCE: { label: 'Par réunion BCE', maxDays: 60 },
  // Mensuel — inflation et PEL (délai ~6 semaines)
  inflation:    { label: 'Mensuel',         maxDays: 45 },
  pel:          { label: 'Mensuel',         maxDays: 45 },
  // Mensuel — taux immo BdF publié avec ~2 mois de délai structurel
  tauxImmo:     { label: 'Mensuel',         maxDays: 75 },
  // Semestriel — réglementé (1er fév. et 1er août)
  livreta:      { label: 'Semestriel',      maxDays: 200 },
  // Annuel — publié en jan.-mars avec 1 an de décalage
  fondsEuros:   { label: 'Annuel',          maxDays: 400 },
  // Trimestriel — SCPI
  scpi:         { label: 'Trimestriel',     maxDays: 120 },
  // Trimestriel — prix immo INSEE/Notaires publiés avec ~4 mois de délai structurel
  prixImmo:     { label: 'Trimestriel',     maxDays: 150 },
  // Devises — quotidien (jours ouvrés)
  eurusd:       { label: 'Quotidien',       maxDays: 5  },
  eurgbp:       { label: 'Quotidien',       maxDays: 5  },
  eurjpy:       { label: 'Quotidien',       maxDays: 5  },
  eurchf:       { label: 'Quotidien',       maxDays: 5  },
  eurcny:       { label: 'Quotidien',       maxDays: 5  },
  // Actions — quotidien (jours ouvrés)
  cac40:        { label: 'Quotidien',       maxDays: 5  },
  cacmid:       { label: 'Quotidien',       maxDays: 5  },
  stoxx50:      { label: 'Quotidien',       maxDays: 5  },
  stoxx600:     { label: 'Quotidien',       maxDays: 5  },
  dax:          { label: 'Quotidien',       maxDays: 5  },
  ftse:         { label: 'Quotidien',       maxDays: 5  },
  nikkei:       { label: 'Quotidien',       maxDays: 5  },
  sp500:        { label: 'Quotidien',       maxDays: 5  },
  nasdaq:       { label: 'Quotidien',       maxDays: 5  },
  world:        { label: 'Quotidien',       maxDays: 5  },
  emerging:     { label: 'Quotidien',       maxDays: 5  },
  // Matières premières — quotidien (jours ouvrés)
  brent:        { label: 'Quotidien',       maxDays: 5  },
  gold:         { label: 'Quotidien',       maxDays: 5  },
  gaz:          { label: 'Quotidien',       maxDays: 5  },
  // Obligations d'État étrangères 10 ans
  us10y:        { label: 'Quotidien',       maxDays: 5  },
  bund:         { label: 'Mensuel',         maxDays: 60 },
  jgb:          { label: 'Mensuel',         maxDays: 60 },
  gilt:         { label: 'Mensuel',         maxDays: 60 },
  // Crypto — quotidien (24/7, tolérance plus courte)
  btc:          { label: 'Quotidien',       maxDays: 3  },
  eth:          { label: 'Quotidien',       maxDays: 3  },
  sol:          { label: 'Quotidien',       maxDays: 3  },
  xrp:          { label: 'Quotidien',       maxDays: 3  },
};

export type IndexStatus = 'ok' | 'stale' | 'fail';

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function getIndexStatus(
  key: string,
  histLen: number,
  valeur: number | null | undefined,
  lastDate: string | null
): IndexStatus {
  if (histLen === 0 || valeur == null) return 'fail';
  if (!lastDate) return 'fail';
  const freq = UPDATE_FREQUENCY[key];
  if (freq && daysSince(lastDate) > freq.maxDays) return 'stale';
  return 'ok';
}
