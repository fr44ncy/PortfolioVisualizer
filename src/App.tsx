import React, { useState, useEffect, useCallback } from 'react'; // Aggiunto useCallback
import { TrendingUp, AlertTriangle } from 'lucide-react';
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
    const newAsset: Asset = { id: uid(), ticker, isin, weight: Math.max(0, Math.min(100, weight)), currency };
    if (!assets.some(a => a.ticker === ticker)) {
      setAssets(prev => [...prev, newAsset]);
    } else {
      console.warn(`Asset ${ticker} già presente.`);
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

  // *** useEffect Riscritto per maggiore chiarezza e affidabilità ***
  useEffect(() => {
    const recalculatePortfolio = async () => {
      // 1. Reset se non ci sono asset
      if (assets.length === 0) {
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setUsingSyntheticData(null); // Reset temporaneo durante il caricamento

      // Oggetto per contenere i dati necessari per *questa* esecuzione
      const currentRunData: Record<string, PriceDataEntry> = {};
      let anySyntheticInThisRun = false;
      let allDataAvailable = true;

      try {
        // 2. Determina quali dati mancano
        const requiredTickers = assets.map(a => a.ticker).filter(Boolean);
        const tickersToFetch = requiredTickers.filter(ticker => !priceData[ticker]);

        // 3. Avvia i fetch necessari
        const fetchPromises = tickersToFetch.map(ticker => {
          const asset = assets.find(a => a.ticker === ticker);
          return fetchPriceHistory(ticker, 365 * 5, asset?.currency || 'USD')
            .then(result => ({ ticker, ...result })); // result è { data, isSynthetic }
        });

        // 4. Attendi i risultati dei fetch
        const fetchedResults = await Promise.all(fetchPromises);

        // 5. Prepara l'oggetto `newlyFetchedData` per aggiornare la cache (stato `priceData`)
        const newlyFetchedData: Record<string, PriceDataEntry> = {};
        fetchedResults.forEach(result => {
          newlyFetchedData[result.ticker] = { data: result.data, isSynthetic: result.isSynthetic };
        });

        // Aggiorna la cache (stato `priceData`) *prima* di procedere
        // Usiamo l'aggiornamento funzionale per sicurezza con render rapidi
        setPriceData(prevData => ({ ...prevData, ...newlyFetchedData }));

        // 6. Costruisci l'insieme completo dei dati per questo calcolo
        //    (usando la cache *aggiornata* implicitamente nel prossimo ciclo di render,
        //     ma per sicurezza leggiamo dai dati appena ottenuti e dalla cache *precedente*)
        requiredTickers.forEach(ticker => {
          const cachedData = priceData[ticker]; // Dati dalla cache *prima* dell'aggiornamento
          const newData = newlyFetchedData[ticker]; // Dati *appena* scaricati

          if (newData) { // Se abbiamo scaricato nuovi dati, usiamo quelli
            currentRunData[ticker] = newData;
            if (newData.isSynthetic) {
              anySyntheticInThisRun = true;
            }
            if (!newData.data || newData.data.length === 0) {
                 console.warn(`Fetch per ${ticker} non ha restituito dati.`);
                 allDataAvailable = false; // Dati mancanti
            }
          } else if (cachedData) { // Altrimenti, usiamo i dati in cache
            currentRunData[ticker] = cachedData;
            if (cachedData.isSynthetic) {
              anySyntheticInThisRun = true;
            }
             if (!cachedData.data || cachedData.data.length === 0) {
                 console.warn(`Dati in cache per ${ticker} sono vuoti.`);
                 allDataAvailable = false; // Dati mancanti
            }
          } else {
            // Questo non dovrebbe accadere se la logica sopra è corretta
            console.error(`Errore logico: Dati per ${ticker} non trovati né in cache né fetchati.`);
            allDataAvailable = false;
            anySyntheticInThisRun = true; // Considera errore come sintetico
          }
        });


        // 7. Imposta il flag definitivo per l'UI
        setUsingSyntheticData(anySyntheticInThisRun || !allDataAvailable);

        // 8. Esegui i calcoli SOLO se tutti i dati sono disponibili
        if (allDataAvailable && assets.length > 0) { // Ricontrolla assets.length
          // Estrai solo i PricePoint[] per le funzioni di calcolo
          const calculationPricePoints: Record<string, PricePoint[]> = {};
          requiredTickers.forEach(ticker => {
            calculationPricePoints[ticker] = currentRunData[ticker].data;
          });

          const series = computeNavSeries(calculationPricePoints, assets, initialCapital);
          setNavSeries(series);

          if (series.length >= 2) {
            const calculatedMetrics = calculateMetrics(series);
            setMetrics(calculatedMetrics);
            const histogram = calculateHistogram(series);
            setHistogramData(histogram);
          } else {
            console.warn("Serie NAV troppo corta dopo il calcolo, possibile problema nei dati o calcoli.");
            setNavSeries([]);
            setMetrics(emptyMetrics);
            setHistogramData([]);
            // Non impostare usingSyntheticData qui, è già stato determinato
          }
        } else {
          // Se i dati non sono disponibili o assets è vuoto, resetta i risultati
          console.warn(`Calcolo saltato. allDataAvailable: ${allDataAvailable}, assets.length: ${assets.length}`);
          setNavSeries([]);
          setMetrics(emptyMetrics);
          setHistogramData([]);
        }

      } catch (error) {
        console.error("Errore nel processo di ricalcolo:", error);
        setNavSeries([]);
        setMetrics(emptyMetrics);
        setHistogramData([]);
        setUsingSyntheticData(true); // Errore -> flagga come sintetico
      } finally {
        setLoading(false); // Assicura che loading finisca
      }
    };

    recalculatePortfolio();
    // Le dipendenze rimangono assets e initialCapital
  }, [assets, initialCapital, priceData]); // Aggiunto priceData come dipendenza per ri-triggerare se la cache cambia
                                          // Se questo causa loop, potrebbe essere necessario ottimizzare ulteriormente,
                                          // ma proviamo prima così per garantire la coerenza.


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
               {usingSyntheticData !== null && !loading && assets.length > 0 && (
                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md my-4 ${
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
              {loading ? (
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
          {loading ? (
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