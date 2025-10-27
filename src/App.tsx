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

  // *** useEffect COMPLETAMENTE RIVISTO E SEMPLIFICATO ***
  useEffect(() => {
    async function recalculate() {
      // Caso base: nessun asset
      if (assets.length === 0) {
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(null);
        setLoading(false); // Assicurati che loading sia false
        return;
      }

      setLoading(true);
      // Reset all'inizio: assumiamo dati reali finché non troviamo prova contraria
      let anySyntheticUsed = false;
      // Oggetto temporaneo per accumulare i dati necessari (cache + fetch)
      const currentCalculationData: Record<string, PriceDataEntry> = {};

      try {
        // 1. Identifica i ticker necessari
        const requiredTickers = assets.map(a => a.ticker).filter(Boolean);
        const tickersToFetch: string[] = [];
        const fetchPromises: Promise<{ ticker: string; data: PricePoint[]; isSynthetic: boolean }>[] = [];

        // 2. Controlla la cache (stato `priceData`) e prepara i fetch
        requiredTickers.forEach(ticker => {
          if (priceData[ticker]) {
            currentCalculationData[ticker] = priceData[ticker]; // Usa dati dalla cache
            if (priceData[ticker].isSynthetic) {
               // Se i dati in cache sono marcati come sintetici, aggiorna il flag
               anySyntheticUsed = true;
            }
          } else {
            tickersToFetch.push(ticker); // Ticker da scaricare
          }
        });

        // 3. Esegui i fetch necessari
        if (tickersToFetch.length > 0) {
          tickersToFetch.forEach(ticker => {
             const assetInfo = assets.find(a => a.ticker === ticker);
             fetchPromises.push(
               fetchPriceHistory(ticker, 365 * 5, assetInfo?.currency || 'USD')
                 .then(result => ({ ticker, ...result })) // fetchPriceHistory ritorna { data, isSynthetic }
            );
          });

          // Aspetta SOLO i nuovi fetch
          const fetchedResults = await Promise.all(fetchPromises);

          // 4. Aggiorna sia i dati per il calcolo attuale CHE lo stato `priceData` (cache)
          const newlyFetchedData: Record<string, PriceDataEntry> = {};
          fetchedResults.forEach(result => {
            const entry = { data: result.data, isSynthetic: result.isSynthetic };
            currentCalculationData[result.ticker] = entry; // Aggiungi ai dati per questo calcolo
            newlyFetchedData[result.ticker] = entry;      // Prepara per aggiornare lo stato cache
            if (result.isSynthetic) {
              anySyntheticUsed = true; // Aggiorna flag se dati appena scaricati sono sintetici
            }
          });

          // Aggiorna lo stato `priceData` in modo sicuro
          setPriceData(prevData => ({ ...prevData, ...newlyFetchedData }));
        }

        // 5. Verifica finale se tutti i dati necessari sono presenti
        let calculationPossible = true;
        const finalPricePoints: Record<string, PricePoint[]> = {};
        requiredTickers.forEach(ticker => {
           const entry = currentCalculationData[ticker];
           if (entry && entry.data && entry.data.length > 0) {
               finalPricePoints[ticker] = entry.data;
               // Ricontrolla se è sintetico (importante se era già in cache)
               if(entry.isSynthetic) anySyntheticUsed = true;
           } else {
               console.warn(`Dati per ${ticker} non disponibili per il calcolo.`);
               calculationPossible = false;
               anySyntheticUsed = true; // Se mancano dati, consideriamo la simulazione non basata su dati reali completi
           }
        });

        // 6. Aggiorna lo stato `usingSyntheticData`
        setUsingSyntheticData(anySyntheticUsed);

        // 7. Esegui i calcoli SE possibile
        if (calculationPossible && assets.length > 0) { // Ricontrolla assets.length qui
          const series = computeNavSeries(finalPricePoints, assets, initialCapital);
          setNavSeries(series);

          if (series.length >= 2) {
            const calculatedMetrics = calculateMetrics(series);
            setMetrics(calculatedMetrics);
            const histogram = calculateHistogram(series);
            setHistogramData(histogram);
          } else {
            // Se la serie NAV è troppo corta (es. dati insufficienti), resetta
            setNavSeries([]); // Assicura che il grafico mostri "Add assets..."
            setMetrics(emptyMetrics);
            setHistogramData([]);
          }
        } else {
          // Se il calcolo non è possibile o non ci sono più asset, resetta tutto
          setNavSeries([]);
          setMetrics(emptyMetrics);
          setHistogramData([]);
          // `usingSyntheticData` è già stato impostato correttamente sopra
        }

      } catch (error) {
        console.error("Errore durante il fetch o il ricalcolo:", error);
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(true); // Errore -> flag sintetico a true
      } finally {
        setLoading(false); // Assicurati che loading si fermi in ogni caso
      }
    }

    recalculate();
    // Le dipendenze rimangono corrette
  }, [assets, initialCapital]);

  // Il resto del componente JSX rimane invariato...
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
               {/* Mostra solo se ci sono asset e non sta caricando */}
               {usingSyntheticData !== null && !loading && assets.length > 0 && (
                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md my-4 ${ // Aggiunto my-4 per spazio
                    usingSyntheticData
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${usingSyntheticData ? '' : 'hidden'}`} />
                  <span>
                    {usingSyntheticData
                      ? "Warning: Simulation is using synthetic (randomized) data due to API limits, errors, or missing data."
                      : "Simulation is using real historical market data."}
                  </span>
                </div>
              )}


              {/* Grafico Portfolio */}
              {loading ? ( // Mostra loading se sta caricando
                <div className="h-80 flex items-center justify-center">
                  <div className="text-sm text-gray-400">Loading data...</div>
                </div>
              ) : ( // Altrimenti mostra il grafico o il messaggio "Add assets"
                <PortfolioChart data={navSeries} currency={currency} scale={scale} />
                 // PortfolioChart mostra già "Add assets..." se data è vuoto
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
          {loading ? ( // Mostra loading se sta caricando
            <div className="h-64 flex items-center justify-center">
              <div className="text-sm text-gray-400">Loading data...</div>
            </div>
          ) : ( // Altrimenti mostra l'istogramma o il messaggio di dati insufficienti
            <ReturnsHistogram data={histogramData} />
            // ReturnsHistogram mostra già un messaggio se data è vuoto
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