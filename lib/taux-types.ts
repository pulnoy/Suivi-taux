export interface DataPoint {
  date: string;
  value: number;
  timestamp?: number;
  quality?: 'observed' | 'estimated' | 'interpolated';
}

export type CollectionStatus = 'ok' | 'fallback' | 'stale' | 'error';

export interface CollectionMetadata {
  source: string;
  fetchedAt: string;
  lastObservationDate: string | null;
  status: CollectionStatus;
  fallbackUsed: boolean;
  error?: string;
}

export interface Indicateur {
  titre: string;
  valeur: number | null;
  suffixe: string;
  historique: DataPoint[];
  nombre_points?: number;
  metadata?: CollectionMetadata;
  performances?: {
    annualisee_1an: number | null;
    annualisee_3ans: number | null;
    annualisee_5ans: number | null;
  };
}

export interface TauxData {
  date_mise_a_jour: string;
  indices: Record<string, Indicateur>;
}
