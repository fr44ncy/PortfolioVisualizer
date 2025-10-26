import { Asset, PricePoint, NavPoint, PortfolioMetrics } from '../types';
import { EXCHANGE_RATES } from './assetData'; // Rimosso ASSET_DATABASE

export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const symbol = EXCHANGE_RATES[currency]?.symbol || '€';
  // ... (resto della funzione)
  return symbol + Number(value).toFixed(2);
}

export function computeNavSeries(
  pricesData: Record<string, PricePoint[]>,
  assets: Asset[],
  initialCapital: number
): NavPoint[] {
  const tickers = assets.map(a => a.ticker).filter(Boolean);
  if (tickers.length === 0) return [];

  const firstDates = tickers
    .map(t => (pricesData[t] || []).length ? pricesData[t][0].date : null)
    .filter(Boolean) as string[];

  if (firstDates.length === 0) return [];

  const commonStart = firstDates.sort().reverse()[0];

  const dateSet = new Set<string>();
  tickers.forEach(t => {
    (pricesData[t] || []).forEach(p => {
      if (p.date >= commonStart) dateSet.add(p.date);
    });
  });

  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return [];

  const shares: Record<string, number> = {};
  assets.forEach(asset => {
    const t = asset.ticker;
    if (!t) return;
    const arr = pricesData[t] || [];
    let rec = arr.find(r => r.date === commonStart);
    if (!rec) rec = arr.find(r => r.date > commonStart);
    if (rec) {
      // *** MODIFICA: Usa la valuta dall'asset o dal price point ***
      const assetCurrency = asset.currency || rec.currency || 'USD';
      const rate = EXCHANGE_RATES[assetCurrency]?.rateToEUR || 1;
      const priceInEUR = rec.close * rate;
      const alloc = (asset.weight / 100) * initialCapital;
      shares[t] = priceInEUR > 0 ? alloc / priceInEUR : 0;
    } else {
      shares[t] = 0;
    }
  });

  const series = dates.map(date => {
    let total = 0;
    assets.forEach(asset => {
      const t = asset.ticker;
      if (!t) return;
      const arr = pricesData[t] || [];
      let rec = arr.find(r => r.date === date);
      if (!rec) {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].date <= date) {
            rec = arr[i];
            break;
          }
        }
      }
      if (rec) {
        // *** MODIFICA: Usa la valuta dall'asset o dal price point ***
        const assetCurrency = asset.currency || rec.currency || 'USD';
        const rate = EXCHANGE_RATES[assetCurrency]?.rateToEUR || 1;
        const priceInEUR = rec.close * rate;
        const s = shares[t] || 0;
        total += s * priceInEUR;
      }
    });
    return { date, nav: Number(total.toFixed(2)) };
  });

  if (series.length > 0 && series[0].nav > 0) {
    const factor = initialCapital / series[0].nav;
    const scaled = series.map(s => ({ date: s.date, nav: Number((s.nav * factor).toFixed(2)) }));
    return scaled.filter(s => s.nav > 0);
  }

  return series.filter(s => s.nav > 0);
}

function dailyReturns(series: NavPoint[]): number[] {
  // ... (nessuna modifica)
}

function mean(arr: number[]): number {
  // ... (nessuna modifica)
}

function std(arr: number[]): number {
  // ... (nessuna modifica)
}

export function calculateMetrics(navSeries: NavPoint[]): PortfolioMetrics {
  // ... (nessuna modifica)
}

export function calculateHistogram(navSeries: NavPoint[], buckets: number = 20): { bin: string; count: number }[] {
  // ... (nessuna modifica)
}