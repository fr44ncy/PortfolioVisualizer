import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react'; // Aggiunto AlertTriangle
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
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const [priceData, setPriceData] = useState<Record<string, PricePoint[]>>({});
  const [navSeries, setNavSeries] = useState<NavPoint[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(emptyMetrics);
  const [histogramData, setHistogramData] = useState<{ bin: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  // *** NUOVO STATO per tracciare l'uso di dati sintetici ***
  const [usingSyntheticData, setUsingSyntheticData] = useState<boolean | null>(null);

  const handleAddAsset = (ticker: string, isin: string | undefined, weight: number, currency: string) => {
    const newAsset: Asset = {
      id: uid(),
      ticker,
      isin,
      weight: Math.max(0, Math.min(100, weight)),
      currency: currency
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
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(null); // Resetta lo stato
        return;
      }

      setLoading(true);
      // Resetta lo stato sintetico all'inizio di ogni ricalcolo
      let didUseSynthetic = false;
      try {
        const newPriceData = { ...priceData };
        // Tipo modificato per accogliere l'oggetto restituito da fetchPriceHistory
        const promises: Promise<{ ticker: string, result: { data: PricePoint[], isSynthetic: boolean } }>[] = [];

        for (const asset of assets) {
          const t = asset.ticker;
          if (!t) continue;

          if (!newPriceData[t]) {
            promises.push(
              fetchPriceHistory(t, 365 * 5, asset.currency).then(res => {
                // Ritorna ticker e l'intero oggetto risultato
                return { ticker: t, result: res };
              })
            );
          } else {
             // Se i dati sono già in cache, assumiamo (per ora) che non siano sintetici
             // Potremmo voler memorizzare lo stato isSynthetic anche nella cache in futuro
          }
        }

        const results = await Promise.all(promises);

        results.forEach(result => {
          if (result.result.data && result.result.data.length > 0) {
            newPriceData[result.ticker] = result.result.data;
            // Aggiorna il flag se almeno uno dei nuovi fetch ha usato dati sintetici
            if (result.result.isSynthetic) {
              didUseSynthetic = true;
            }
          } else {
            // Se il fetch fallisce e non restituisce dati, consideralo come sintetico
            // (anche se generateSyntheticPrices dovrebbe sempre restituire qualcosa)
             didUseSynthetic = true;
          }
        });

        // Controlla anche se *dati già presenti* potrebbero essere stati sintetici
        // (Questa parte è un'approssimazione, ideale sarebbe salvare isSynthetic nello stato priceData)
        if (!didUseSynthetic) {
            for (const asset of assets) {
                const t = asset.ticker;
                // Se un asset richiesto non ha dati *dopo* il fetch, significa che è fallito -> sintetico
                if(t && !newPriceData[t]) {
                    didUseSynthetic = true;
                    break;
                }
            }
        }


        setPriceData(newPriceData);
        // *** AGGIORNA LO STATO SINTETICO ***
        setUsingSyntheticData(didUseSynthetic);

        const series = computeNavSeries(newPriceData, assets, initialCapital);
        setNavSeries(series);

        if (series.length >= 2) {
          const calculatedMetrics = calculateMetrics(series);
          setMetrics(calculatedMetrics);

          const histogram = calculateHistogram(series);
          setHistogramData(histogram);
        } else {
          setMetrics(emptyMetrics);
          setHistogramData([]);
        }

      } catch (error) {
        console.error("Errore durante il ricalcolo:", error);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(true); // Assumi sintetico in caso di errore generale
      } finally {
        setLoading(false);
      }
    }

    recalculate();
  }, [assets, initialCapital]); // Dipendenze corrette

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
              {/* Controlli Capitale, Valuta, Scala */}
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
              <div className="flex items-center justify-between mb-1"> {/* Ridotto mb */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Portfolio Value</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Historical performance over time
                  </p>
                </div>
                {/* Metriche Annual Return */}
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

               {/* *** MESSAGGIO DATI SINTETICI/REALI *** */}
               {usingSyntheticData !== null && !loading && assets.length > 0 && (
                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md mb-4 ${
                    usingSyntheticData
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${usingSyntheticData ? '' : 'hidden'}`} />
                  <span>
                    {usingSyntheticData
                      ? "Warning: Simulation is using synthetic (randomized) data due to API limits or errors."
                      : "Simulation is using real historical market data."}
                  </span>
                </div>
              )}


              {/* Grafico Portfolio */}
              {loading && assets.length > 0 ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-sm text-gray-400">Loading data...</div>
                </div>
              ) : (
                <PortfolioChart data={navSeries} currency={currency} scale={scale} />
              )}
            </div>

            {/* Griglia Metriche */}
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

        {/* Istogramma */}
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

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-500">
          Portfolio backtesting data provided by Alpha Vantage & EOD Historical Data.
        </footer>
      </main>
    </div>
  );
}