// Types pour les données financières

export interface YearlyPerformance {
  year: number;
  value: number;
  isYTD?: boolean;
}

export interface RateData {
  type: string;
  value: number;
  previousValue: number | null;
  date: string;
  lastUpdate: string;
  history: { date: string; value: number }[];
  yearlyData?: YearlyPerformance[];
  description: string;
  source: string;
}

export interface ApiResponse {
  rates: RateData[];
  lastRefresh: string;
}

export interface RefreshResult {
  success: boolean;
  message: string;
  updatedAt: string;
  details: {
    type: string;
    value: number;
    source: string;
    updated: boolean;
  }[];
  apiStatus: {
    estr: boolean;
    oat10: boolean;
    cac40: boolean;
    opci: boolean;
  };
}
