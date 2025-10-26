import { Asset, PricePoint, NavPoint, PortfolioMetrics } from '../types';
import { ASSET_DATABASE, EXCHANGE_RATES } from './assetData';

export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const symbol = EXCHANGE_RATES[currency]?.symbol || '€';
  const abs = Math.abs(Number(value));
  if (abs >= 1e9) return symbol + (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return symbol + (value / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return symbol + (value / 1e3).toFixed(0) + 'k';
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
      const assetCurrency = rec.currency || (ASSET_DATABASE[t] ? ASSET_DATABASE[t].currency : 'USD');
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
        const assetCurrency = rec.currency || (ASSET_DATABASE[t] ? ASSET_DATABASE[t].currency : 'USD');
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
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    returns.push(series[i].nav / series[i - 1].nav - 1);
  }
  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

export function calculateMetrics(navSeries: NavPoint[]): PortfolioMetrics {
  if (navSeries.length < 2) {
    return {
      annualReturn: null,
      annualVol: null,
      sharpe: null,
      var95: null,
      cvar95: null,
      finalValue: null
    };
  }

  const daily = dailyReturns(navSeries);
  const dailyMean = mean(daily);
  const dailyStd = std(daily);

  const start = navSeries[0].nav;
  const end = navSeries[navSeries.length - 1].nav;
  const years = (navSeries.length - 1) / 252 || 1;

  const annReturn = Math.pow(end / start, 1 / years) - 1;
  const annVol = dailyStd * Math.sqrt(252);
  const sharpeRatio = (annReturn - 0.02) / (annVol || 1e-9);

  const rolling: number[] = [];
  const window = 252;
  for (let i = window; i < navSeries.length; i++) {
    rolling.push(navSeries[i].nav / navSeries[i - window].nav - 1);
  }

  let var_hist = null;
  let cvar_hist = null;
  if (rolling.length > 0) {
    const sorted = [...rolling].sort((a, b) => a - b);
    const idx = Math.floor(0.05 * sorted.length);
    const p95 = sorted[Math.max(0, idx)];
    var_hist = -p95;
    const worst = sorted.slice(0, idx + 1);
    const avgWorst = worst.reduce((s, x) => s + x, 0) / worst.length;
    cvar_hist = -avgWorst;
  }

  return {
    annualReturn: annReturn,
    annualVol: annVol,
    sharpe: sharpeRatio,
    var95: var_hist,
    cvar95: cvar_hist,
    finalValue: end
  };
}

export function calculateHistogram(navSeries: NavPoint[], buckets: number = 20): { bin: string; count: number }[] {
  if (navSeries.length < 252) return [];

  const rolling: number[] = [];
  const window = 252;
  for (let i = window; i < navSeries.length; i++) {
    rolling.push(navSeries[i].nav / navSeries[i - window].nav - 1);
  }

  if (rolling.length === 0) return [];

  const minR = Math.min(...rolling);
  const maxR = Math.max(...rolling);
  const width = (maxR - minR) / buckets || 1;
  const counts = new Array(buckets).fill(0);

  rolling.forEach(r => {
    let i = Math.floor((r - minR) / width);
    if (i < 0) i = 0;
    if (i >= buckets) i = buckets - 1;
    counts[i]++;
  });

  return counts.map((c, i) => ({
    bin: (minR + i * width).toFixed(3),
    count: c
  }));
}
