import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Asset, NavPoint, PricePoint, PortfolioMetrics } from './types';
import PortfolioComposition from './components/PortfolioComposition';
import PortfolioChart from './components/PortfolioChart';
import ReturnsHistogram from './components/ReturnsHistogram';
import MetricsCard from './components/MetricsCard';
import { fetchPriceHistory } from './lib/assetData';
import { computeNavSeries, calculateMetrics, calculateHistogram } from './lib/portfolioCalculations';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const emptyMetrics: PortfolioMetrics = {
  annualReturn: null,
  annualVol: null,
  sharpe: null,
  var95: null,
  cvar95: null,
  finalValue: null
};

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currency, setCurrency] = useState<string>('EUR');
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [backtestYears, setBacktestYears] = useState<number>(5);
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const [navSeries, setNavSeries] = useState<NavPoint[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(emptyMetrics);
  const [histogramData, setHistogramData] = useState<{ bin: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usa useRef per la cache dei prezzi - evita loop infiniti
  const priceCache = useRef<Record<string, { data: PricePoint[], timestamp: number }>>({});
  const CACHE_TTL = 1000 * 60 * 60; // 1 ora

  const handleAddAsset = (ticker: string, isin: string | undefined, currency: string) => {
    const newAsset: Asset = { 
      id: uid(), 
      ticker, 
      isin, 
      weight: 10, // Peso predefinito 10%
      currency 
    };
    if (!assets.some(a => a.ticker === ticker)) {
      setAssets(prev => [...prev, newAsset]);
    }
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
    const calculatePortfolio = async () => {
      if (assets.length === 0) {
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const days = backtestYears * 365;
        const priceData: Record<string, PricePoint[]> = {};
        const now = Date.now();

        // Crea una chiave cache che include anni e valuta
        const cacheKey = (ticker: string) => `${ticker}_${backtestYears}_${currency}`;

        // Fetch dei prezzi per ogni asset
        for (const asset of assets) {
          if (!asset.ticker) continue;

          const key = cacheKey(asset.ticker);
          
          // Controlla la cache
          const cached = priceCache.current[key];
          if (cached && (now - cached.timestamp) < CACHE_TTL) {
            priceData[asset.ticker] = cached.data;
            continue;
          }

          // Fetch dai dati reali
          const result = await fetchPriceHistory(asset.ticker, days, asset.currency);
          
          if (!result.data || result.data.length === 0) {
            throw new Error(`Nessun dato disponibile per ${asset.ticker}. Verifica che il ticker sia corretto.`);
          }

          // Salva nella cache
          priceCache.current[key] = {
            data: result.data,
            timestamp: now
          };
          priceData[asset.ticker] = result.data;
        }

        // Calcola le metriche con la valuta corretta
        const series = computeNavSeries(priceData, assets, initialCapital, currency);
        
        if (series.length < 2) {
          throw new Error('Dati insufficienti per il calcolo. Prova ad aumentare il periodo di backtest o cambia asset.');
        }

        setNavSeries(series);

        const calculatedMetrics = calculateMetrics(series);
        setMetrics(calculatedMetrics);

        const histogram = calculateHistogram(series);
        setHistogramData(histogram);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
        console.error('Errore calcolo portfolio:', errorMessage);
        setError(errorMessage);
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
      } finally {
        setLoading(false);
      }
    };

    calculatePortfolio();
  }, [assets, initialCapital, backtestYears, currency]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Portfolio Analyzer</h1>
                <p className="text-sm text-gray-600">Backtest con dati reali di mercato</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <label className="text-sm text-gray-700 font-medium">Capitale</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <label className="text-sm text-gray-700 font-medium">Periodo</label>
                <select
                  value={backtestYears}
                  onChange={(e) => setBacktestYears(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={1}>1 anno</option>
                  <option value={2}>2 anni</option>
                  <option value={3}>3 anni</option>
                  <option value={5}>5 anni</option>
                  <option value={10}>10 anni</option>
                  <option value={15}>15 anni</option>
                  <option value={20}>20 anni</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <label className="text-sm text-gray-700 font-medium">Valuta</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <label className="text-sm text-gray-700 font-medium">Scala</label>
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value as 'linear' | 'log')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="linear">Lineare</option>
                  <option value="log">Logaritmica</option>
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Valore Portfolio</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Performance storica negli ultimi {backtestYears} {backtestYears === 1 ? 'anno' : 'anni'}
                  </p>
                </div>
                {metrics.annualReturn !== null && (
                  <div className="text-right bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-3 rounded-xl border border-blue-200">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rendimento Annuo</div>
                    <div className={`text-2xl font-bold mt-1 ${
                      metrics.annualReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metrics.annualReturn >= 0 ? '+' : ''}{(metrics.annualReturn * 100).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-3 text-sm px-5 py-4 rounded-xl mb-4 bg-red-50 text-red-700 border border-red-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Errore nel caricamento dati</div>
                    <div className="text-xs mt-1">{error}</div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <div className="text-sm font-medium text-gray-700">Caricamento dati di mercato...</div>
                  </div>
                </div>
              ) : (
                <PortfolioChart data={navSeries} currency={currency} scale={scale} />
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricsCard
                title="Rendimento Annuo"
                value={metrics.annualReturn !== null ? `${metrics.annualReturn >= 0 ? '+' : ''}${(metrics.annualReturn * 100).toFixed(2)}%` : '—'}
                trend={metrics.annualReturn !== null && metrics.annualReturn >= 0 ? 'positive' : 'negative'}
              />
              <MetricsCard
                title="Volatilità"
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
                title="Valore Finale"
                value={metrics.finalValue !== null ? `${currency === 'EUR' ? '€' : currency === 'USD' ? '
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Distribuzione Rendimenti Annui</h2>
          <p className="text-sm text-gray-600 mb-6">
            Distribuzione dei rendimenti rolling a 1 anno dai dati storici
          </p>
          {loading ? (
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <div className="text-sm text-gray-500">Caricamento...</div>
            </div>
          ) : (
            <ReturnsHistogram data={histogramData} />
          )}
        </div>

        <footer className="mt-8 text-center text-sm text-gray-600 bg-white rounded-xl py-4 border border-gray-200">
          <p className="font-medium">Dati forniti da Alpha Vantage & EOD Historical Data</p>
          <p className="text-xs text-gray-500 mt-1">Solo dati reali di mercato • Aggiornati giornalmente</p>
        </footer>
      </main>
    </div>
  );
}
 : '£'}${(metrics.finalValue / 1000).toFixed(1)}k` : '—'}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Distribuzione Rendimenti Annui</h2>
          <p className="text-xs text-gray-500 mb-4">
            Distribuzione dei rendimenti rolling a 1 anno dai dati storici
          </p>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-sm text-gray-400">Caricamento...</div>
            </div>
          ) : (
            <ReturnsHistogram data={histogramData} />
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Dati forniti da Alpha Vantage & EOD Historical Data
        </footer>
      </main>
    </div>
  );
}