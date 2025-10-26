export interface Asset {
  id: string;
  ticker: string;
  isin?: string;
  weight: number;
}

export interface Portfolio {
  id?: string;
  name: string;
  currency: string;
  initial_capital: number;
  assets: Asset[];
}

export interface PricePoint {
  date: string;
  close: number;
  currency: string;
}

export interface NavPoint {
  date: string;
  nav: number;
}

export interface PortfolioMetrics {
  annualReturn: number | null;
  annualVol: number | null;
  sharpe: number | null;
  var95: number | null;
  cvar95: number | null;
  finalValue: number | null;
}

export interface AssetSuggestion {
  ticker: string;
  isin?: string;
  name: string;
}
