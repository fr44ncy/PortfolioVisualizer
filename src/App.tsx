import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Asset, NavPoint, PricePoint, PortfolioMetrics } from './types';
import PortfolioComposition from './components/PortfolioComposition';
import PortfolioChart from './components/PortfolioChart';
import ReturnsHistogram from './components/ReturnsHistogram';
import MetricsCard from './components/MetricsCard';
import { fetchPriceHistory, EXCHANGE_RATES } from './lib/assetData'; // fetchPriceHistory ora restituisce { data, isSynthetic }
import { computeNavSeries, calculateMetrics, calculateHistogram, formatCurrency } from './lib/portfolioCalculations';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Struttura per memorizzare i dati dei prezzi E se sono sintetici
interface PriceDataEntry {
  data: PricePoint[];
  isSynthetic: boolean;
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
  // *** STATO priceData MODIFICATO per includere isSynthetic ***
  const [priceData, setPriceData] = useState<Record<string, PriceDataEntry>>({});
  const [navSeries, setNavSeries] = useState<NavPoint[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(emptyMetrics);
  const [histogramData, setHistogramData] = useState<{ bin: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingSyntheticData, setUsingSyntheticData] = useState<boolean | null>(null);

  const handleAddAsset = (ticker: string, isin: string | undefined, weight: number, currency: string) => {
    const newAsset: Asset = {
      id: uid(),
      ticker,
      isin,
      weight: Math.max(0, Math.min(100, weight)),
      currency: currency
    };
    // Controlla se l'asset esiste già per evitare duplicati semplici (opzionale)
    if (!assets.some(a => a.ticker === ticker)) {
       setAssets(prev => [...prev, newAsset]);
    } else {
       console.warn(`Asset ${ticker} già presente nel portafoglio.`);
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

  // *** useEffect RIVISTO per usare la nuova struttura di priceData ***
  useEffect(() => {
    async function recalculate() {
      if (assets.length === 0) {
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(null);
        return;
      }

      setLoading(true);
      let anySyntheticUsedInCalculation = false; // Flag per questa esecuzione

      try {
        // 1. Identifica i ticker necessari e quelli mancanti
        const requiredTickers = assets.map(a => a.ticker).filter(Boolean);
        const missingTickers = requiredTickers.filter(t => !priceData[t]);

        // 2. Avvia il fetch solo per i ticker mancanti
        const fetchPromises = missingTickers.map(ticker => {
          const assetInfo = assets.find(a => a.ticker === ticker);
          // fetchPriceHistory ora ritorna { data: PricePoint[], isSynthetic: boolean }
          return fetchPriceHistory(ticker, 365 * 5, assetInfo?.currency || 'USD')
            .then(result => ({ ticker, ...result })); // Aggiunge il ticker al risultato
        });

        // 3. Aspetta il completamento dei fetch
        const fetchedResults = await Promise.all(fetchPromises);

        // 4. Aggiorna lo stato priceData con i nuovi risultati
        // Usiamo una funzione di aggiornamento per evitare race condition se l'utente cambia assets velocemente
        setPriceData(currentPriceData => {
          const updatedPriceData = { ...currentPriceData };
          fetchedResults.forEach(result => {
             // Memorizza sia i dati che il flag isSynthetic
            updatedPriceData[result.ticker] = { data: result.data, isSynthetic: result.isSynthetic };
          });
          return updatedPriceData;
        });

        // --- Inizio calcoli ---
        // Usiamo un timeout di 0 per assicurarci che lo stato priceData sia aggiornato
        // prima di procedere con i calcoli che lo leggono.
        // Questo è un piccolo "trucco" per posticipare l'esecuzione alla prossima tick.
        setTimeout(() => {
            // 5. Prepara i dati necessari per i calcoli leggendo lo stato *aggiornato*
            const calculationPriceData: Record<string, PricePoint[]> = {};
            let calculationPossible = true;

            // Legge lo stato aggiornato DI NUOVO qui dentro, dopo il timeout
            const finalPriceData = priceData; // Legge lo stato corrente

            requiredTickers.forEach(ticker => {
              const entry = finalPriceData[ticker];
              if (entry && entry.data.length > 0) {
                calculationPriceData[ticker] = entry.data;
                // Controlla se *qualcuno* dei dati USATI è sintetico
                if (entry.isSynthetic) {
                  anySyntheticUsedInCalculation = true;
                }
              } else {
                // Se mancano dati essenziali, il calcolo non è possibile con dati reali
                console.warn(`Dati mancanti per ${ticker} dopo il fetch.`);
                anySyntheticUsedInCalculation = true; // Marca come sintetico se mancano dati
                calculationPossible = false; // Potremmo voler bloccare il calcolo qui
              }
            });

             // Aggiorna lo stato che mostra l'avviso all'utente
            setUsingSyntheticData(anySyntheticUsedInCalculation);

            if (!calculationPossible) {
                 console.error("Calcolo impossibile a causa di dati mancanti.");
                 setNavSeries([]);
                 setMetrics(emptyMetrics);
                 setHistogramData([]);
                 setLoading(false); // Assicurati di fermare il loading
                 return; // Esce dalla funzione dentro setTimeout
            }

            // 6. Esegui i calcoli con i dati raccolti
            const series = computeNavSeries(calculationPriceData, assets, initialCapital);
            setNavSeries(series);

            // 7. Calcola metriche e istogramma
            if (series.length >= 2) {
              const calculatedMetrics = calculateMetrics(series);
              setMetrics(calculatedMetrics);
              const histogram = calculateHistogram(series);
              setHistogramData(histogram);
            } else {
              setMetrics(emptyMetrics);
              setHistogramData([]);
            }

            setLoading(false); // Ferma il loading solo alla fine
          }, 0); // Fine setTimeout

      } catch (error) {
        console.error("Errore durante il fetch o il ricalcolo:", error);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(true); // Errore -> probabilmente dati sintetici o nessun dato
        setLoading(false);
      }
      // Nota: setLoading(false) viene chiamato dentro setTimeout o nel catch
    }

    recalculate();
    // Le dipendenze rimangono le stesse: l'effetto si attiva solo per cambi strutturali
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
                      ? "Warning: Simulation is using synthetic (randomized) data due to API limits, errors, or missing data." // Messaggio aggiornato
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