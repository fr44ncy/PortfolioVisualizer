import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { Asset, NavPoint, PricePoint, PortfolioMetrics } from './types';
import PortfolioComposition from './components/PortfolioComposition';
import PortfolioChart from './components/PortfolioChart';
import ReturnsHistogram from './components/ReturnsHistogram';
import MetricsCard from './components/MetricsCard';
import { fetchPriceHistory, EXCHANGE_RATES } from './lib/assetData';
import { computeNavSeries, calculateMetrics, calculateHistogram, formatCurrency } from './lib/portfolioCalculations';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currency, setCurrency] = useState<string>('EUR');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const [priceData, setPriceData] = useState<Record<string, PricePoint[]>>({});
  const [navSeries, setNavSeries] = useState<NavPoint[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    annualReturn: null,
    annualVol: null,
    sharpe: null,
    var95: null,
    cvar95: null,
    finalValue: null
  });
  const [histogramData, setHistogramData] = useState<{ bin: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddAsset = (ticker: string, isin: string | undefined, weight: number, currency: string) => {
    const newAsset: Asset = {
      id: uid(),
      ticker,
      isin,
      weight: Math.max(0, Math.min(100, weight)),
      currency: currency // Salva la valuta
    };
    setAssets(prev => [...prev, newAsset]);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    setAssets(prev =>
      prev.map(a => (a.id === id ? { ...a, weight: Math.max(0, Math.min(100, weight)) } : a))
    );
  };

  useEffect(() => {
    async function recalculate() {
      if (assets.length === 0) {
        setNavSeries([]);
        setMetrics({
          annualReturn: null,
          annualVol: null,
          sharpe: null,
          var95: null,
          cvar95: null,
          finalValue: null
        });
        setHistogramData([]);
        return;
      }

      setLoading(true);
      try {
        const promises: Promise<void>[] = [];
        for (const asset of assets) {
          const t = asset.ticker;
          if (!t) continue;
          if (!priceData[t]) {
            promises.push(
              // Passa la valuta a fetchPriceHistory
              fetchPriceHistory(t, 365 * 5, asset.currency).then(pd => {
                setPriceData(old => ({ ...old, [t]: pd }));
              })
            );
          }
        }
        await Promise.all(promises);

        const pricesObj = { ...priceData };
        const series = computeNavSeries(pricesObj, assets, initialCapital);
        setNavSeries(series);

        if (series.length >= 2) {
          const calculatedMetrics = calculateMetrics(series);
          setMetrics(calculatedMetrics);

          const histogram = calculateHistogram(series);
          setHistogramData(histogram);
        }
      } finally {
        setLoading(false);
      }
    }

    // Nota: priceData non è più una dipendenza per evitare loop
    // L'effetto si attiva solo quando cambiano gli asset o il capitale
  }, [assets, initialCapital]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Portfolio Analyzer</h1>
                <p className="text-xs text-gray-500">Backtest and analyze your investment portfolio</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Initial Capital</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-32 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(EXCHANGE_RATES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Scale</label>
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value as 'linear' | 'log')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="linear">Linear</option>
                  <option value="log">Logarithmic</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <PortfolioComposition
              assets={assets}
              onAddAsset={handleAddAsset}
              onRemoveAsset={handleRemoveAsset}
              onUpdateWeight={handleUpdateWeight}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Portfolio Value</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Historical performance over time
                  </p>
                </div>
                {metrics.annualReturn !== null && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Annual Return</div>
                    <div className={`text-xl font-semibold ${
                      metrics.annualReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(metrics.annualReturn * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>

              {loading && assets.length > 0 ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-sm text-gray-400">Loading data...</div>
                </div>
              ) : (
                <PortfolioChart data={navSeries} currency={currency} scale={scale} />
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricsCard
                title="Annual Return"
                value={metrics.annualReturn !== null ? `${(metrics.annualReturn * 100).toFixed(2)}%` : '—'}
                trend={metrics.annualReturn !== null && metrics.annualReturn >= 0 ? 'positive' : 'negative'}
              />
              <MetricsCard
                title="Volatility"
                value={metrics.annualVol !== null ? `${(metrics.annualVol * 100).toFixed(2)}%` : '—'}
              />
              <MetricsCard
                title="Sharpe Ratio"
                value={metrics.sharpe !== null ? metrics.sharpe.toFixed(2) : '—'}
                trend={metrics.sharpe !== null && metrics.sharpe > 1 ? 'positive' : 'neutral'}
              />
              <MetricsCard
                title="VaR (1Y, 95%)"
                value={metrics.var95 !== null ? `${(metrics.var95 * 100).toFixed(2)}%` : '—'}
              />
              <MetricsCard
                title="CVaR (95%)"
                value={metrics.cvar95 !== null ? `${(metrics.cvar95 * 100).toFixed(2)}%` : '—'}
              />
              <MetricsCard
                title="Final Value"
                value={metrics.finalValue !== null ? formatCurrency(metrics.finalValue, currency) : '—'}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Annual Returns Distribution</h2>
          <p className="text-xs text-gray-500 mb-4">
            Rolling 1-year return distribution from historical data
          </p>
          {loading && assets.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-sm text-gray-400">Loading data...</div>
            </div>
          ) : (
            <ReturnsHistogram data={histogramData} />
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Portfolio backtesting data provided by Alpha Vantage & EOD Historical Data.
        </footer>
      </main>
    </div>
  );
}