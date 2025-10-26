import { PricePoint, AssetSuggestion } from '../types';

export const ISIN_TO_TICKER: Record<string, string> = {
  'US0378331005': 'AAPL',
  'US5949181045': 'MSFT',
  'US02079K3059': 'GOOGL',
  'US0231351067': 'AMZN',
  'US88160R1014': 'TSLA',
  'IT0003132476': 'ENI.MI',
  'IE00B4L5Y983': 'IWDA.AS',
  'US0846707026': 'BRK.B',
  'US46625H1005': 'JPM',
  'US91324P1021': 'UNH',
  'IE00B0M62Q58': 'IWD.AS',
  'IE00B4L5Y999': 'IEMG.AS',
  'IE00B1FZS350': 'QQQ.L',
  'IE00B5BMR087': 'VUSA.AS',
  'IE00B3RBWM25': 'VEVE.AS',
  'US4642872000': 'SPY',
  'US78462F1030': 'PYPL',
  'GB00B03MLX29': 'HSBA.L',
  'US9311421039': 'V',
  'FR0000120271': 'BNP.PA',
  'DE000BASF111': 'BAS.DE',
  'JP3435000009': 'SONY',
  'CH0038863350': 'NESN.SW',

  // Materie prime
  'US78463V1070': 'GLD',   
  'US78464Y4090': 'SLV',   
  'US912810FH35': 'USO',   
  'US912810JA50': 'UNG',   
  'US4642882799': 'DBC',  

  // Crypto (simboli tipici sugli exchange principali)
  'CRYPTO:BTC': 'BTC',     
  'CRYPTO:ETH': 'ETH',
  'CRYPTO:BNB': 'BNB',
  'CRYPTO:ADA': 'ADA',
  'CRYPTO:XRP': 'XRP',
  'CRYPTO:DOGE': 'DOGE',
  'CRYPTO:MATIC': 'MATIC',
  'CRYPTO:SOL': 'SOL',
  'CRYPTO:LTC': 'LTC',
  'CRYPTO:DOT': 'DOT'
};

export const ASSET_DATABASE: Record<string, { name: string; annualReturn: number; volatility: number; currency: string }> = {
  // Azioni
  'AAPL': { name: 'Apple Inc.', annualReturn: 0.20, volatility: 0.30, currency: 'USD' },
  'MSFT': { name: 'Microsoft Corp.', annualReturn: 0.18, volatility: 0.25, currency: 'USD' },
  'GOOGL': { name: 'Alphabet Inc.', annualReturn: 0.17, volatility: 0.28, currency: 'USD' },
  'AMZN': { name: 'Amazon.com Inc.', annualReturn: 0.16, volatility: 0.33, currency: 'USD' },
  'TSLA': { name: 'Tesla Inc.', annualReturn: 0.30, volatility: 0.60, currency: 'USD' },
  'ENI.MI': { name: 'Eni SpA', annualReturn: 0.05, volatility: 0.22, currency: 'EUR' },
  'IWDA.AS': { name: 'iShares MSCI World', annualReturn: 0.09, volatility: 0.16, currency: 'EUR' },
  'BRK.B': { name: 'Berkshire Hathaway', annualReturn: 0.14, volatility: 0.22, currency: 'USD' },
  'JPM': { name: 'JPMorgan Chase', annualReturn: 0.12, volatility: 0.28, currency: 'USD' },
  'UNH': { name: 'UnitedHealth Group', annualReturn: 0.15, volatility: 0.24, currency: 'USD' },

  // ETF
  'IWD.AS': { name: 'iShares MSCI World Value', annualReturn: 0.08, volatility: 0.18, currency: 'EUR' },
  'IEMG.AS': { name: 'iShares MSCI Emerging Markets', annualReturn: 0.10, volatility: 0.25, currency: 'USD' },
  'QQQ.L': { name: 'Invesco QQQ ETF', annualReturn: 0.19, volatility: 0.30, currency: 'USD' },
  'VUSA.AS': { name: 'Vanguard S&P 500 UCITS', annualReturn: 0.15, volatility: 0.20, currency: 'EUR' },
  'VEVE.AS': { name: 'Vanguard FTSE Developed Europe', annualReturn: 0.08, volatility: 0.16, currency: 'EUR' },
  'SPY': { name: 'SPDR S&P 500 ETF', annualReturn: 0.15, volatility: 0.22, currency: 'USD' },

  // Materie prime
  'GLD': { name: 'SPDR Gold Trust', annualReturn: 0.08, volatility: 0.18, currency: 'USD' },
  'SLV': { name: 'iShares Silver Trust', annualReturn: 0.06, volatility: 0.25, currency: 'USD' },
  'USO': { name: 'United States Oil Fund', annualReturn: 0.10, volatility: 0.45, currency: 'USD' },
  'UNG': { name: 'United States Natural Gas Fund', annualReturn: 0.12, volatility: 0.50, currency: 'USD' },
  'DBC': { name: 'Invesco Commodity Index', annualReturn: 0.07, volatility: 0.35, currency: 'USD' },

  // Crypto
  'BTC': { name: 'Bitcoin', annualReturn: 0.80, volatility: 0.90, currency: 'USD' },
  'ETH': { name: 'Ethereum', annualReturn: 0.75, volatility: 0.85, currency: 'USD' },
  'BNB': { name: 'Binance Coin', annualReturn: 0.60, volatility: 0.80, currency: 'USD' },
  'ADA': { name: 'Cardano', annualReturn: 0.55, volatility: 0.75, currency: 'USD' },
  'XRP': { name: 'Ripple', annualReturn: 0.50, volatility: 0.70, currency: 'USD' },
  'DOGE': { name: 'Dogecoin', annualReturn: 0.45, volatility: 0.85, currency: 'USD' },
  'MATIC': { name: 'Polygon', annualReturn: 0.50, volatility: 0.75, currency: 'USD' },
  'SOL': { name: 'Solana', annualReturn: 0.55, volatility: 0.80, currency: 'USD' },
  'LTC': { name: 'Litecoin', annualReturn: 0.40, volatility: 0.70, currency: 'USD' },
  'DOT': { name: 'Polkadot', annualReturn: 0.50, volatility: 0.75, currency: 'USD' }
};

export const EXCHANGE_RATES: Record<string, { symbol: string; rateToEUR: number }> = {
  USD: { symbol: '$', rateToEUR: 0.92 },
  EUR: { symbol: '€', rateToEUR: 1 },
  GBP: { symbol: '£', rateToEUR: 1.15 },
  JPY: { symbol: '¥', rateToEUR: 0.0067 },
  CHF: { symbol: 'CHF', rateToEUR: 0.93 },
  AUD: { symbol: 'A$', rateToEUR: 0.62 },
  CAD: { symbol: 'C$', rateToEUR: 0.69 },
  NZD: { symbol: 'NZ$', rateToEUR: 0.58 },
  SEK: { symbol: 'kr', rateToEUR: 0.086 },
  NOK: { symbol: 'kr', rateToEUR: 0.089 },
  DKK: { symbol: 'kr', rateToEUR: 0.134 },
  SGD: { symbol: 'S$', rateToEUR: 0.67 },
  HKD: { symbol: 'HK$', rateToEUR: 0.12 }
};

export function searchAssets(query: string): AssetSuggestion[] {
  if (!query || query.length < 1) return [];

  const upperQuery = query.toUpperCase();
  const results: AssetSuggestion[] = [];

  if (ISIN_TO_TICKER[upperQuery]) {
    const ticker = ISIN_TO_TICKER[upperQuery];
    const asset = ASSET_DATABASE[ticker];
    if (asset) {
      results.push({
        ticker,
        isin: upperQuery,
        name: asset.name
      });
    }
  }

  for (const [ticker, asset] of Object.entries(ASSET_DATABASE)) {
    if (ticker.toUpperCase().includes(upperQuery)) {
      const isin = Object.entries(ISIN_TO_TICKER).find(([_, t]) => t === ticker)?.[0];
      results.push({
        ticker,
        isin,
        name: asset.name
      });
    }
  }

  return results.slice(0, 5);
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateSyntheticPrices(ticker: string, days: number = 365 * 3): PricePoint[] {
  const asset = ASSET_DATABASE[ticker] || { annualReturn: 0.08, volatility: 0.18, currency: 'USD' };
  const mu = asset.annualReturn;
  const sigma = asset.volatility;
  const dt = 1 / 252;
  const startPrice = 100;
  const prices: PricePoint[] = [];
  let price = startPrice;
  const today = new Date();
  const startDate = new Date(today.getTime());
  startDate.setDate(today.getDate() - days);

  for (let i = 0; i <= days; i++) {
    const t = new Date(startDate.getTime());
    t.setDate(startDate.getDate() + i);
    const day = t.getDay();
    if (day === 0 || day === 6) continue;

    const z = gaussianRandom();
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * z;
    price = price * Math.exp(drift + diffusion);
    prices.push({
      date: formatDate(t),
      close: Number(price.toFixed(4)),
      currency: asset.currency || 'USD'
    });
  }

  if (prices.length < 400) {
    return generateSyntheticPrices(ticker, days * 2);
  }

  return prices;
}

// Funzione helper per parsare la risposta di Alpha Vantage
function parseAlphaVantageData(data: any, ticker: string): PricePoint[] {
  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    console.error('Dati non trovati nella risposta di Alpha Vantage:', data);
    // La demo key o una chiamata errata possono restituire una nota informativa invece dei dati
    if (data.Note) {
      console.warn(`Nota da Alpha Vantage (probabilmente limite API): ${data.Note}`);
    }
    throw new Error('Formato dati API non valido: "Time Series (Daily)" mancante.');
  }

  const asset = ASSET_DATABASE[ticker] || { currency: 'USD' };
  const prices: PricePoint[] = [];

  for (const date in timeSeries) {
    prices.push({
      date: date,
      // Usiamo '5. adjusted close' per tenere conto di dividendi e split
      close: Number(timeSeries[date]['5. adjusted close']),
      currency: asset.currency
    });
  }

  // L'API restituisce i dati in ordine cronologico inverso (dal più recente al più vecchio)
  // Dobbiamo invertirli per il calcolo del NAV
  prices.sort((a, b) => a.date.localeCompare(b.date));
  
  return prices;
}

export async function fetchPriceHistory(ticker: string, days: number = 365 * 5): Promise<PricePoint[]> {
  // Ottieni la tua API key gratuita da https://www.alphavantage.co/support/#api-key
  // e aggiungila al tuo file .env.local (o .env) come VITE_ALPHA_VANTAGE_KEY
  const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || 'DEMO';
  
  // Se i giorni sono > 365*2 (circa), usiamo 'outputsize=full' (ultimi 20+ anni)
  // Altrimenti 'compact' (ultimi 100 giorni) non è sufficiente.
  // Per il backtest usiamo sempre 'full' se i dati richiesti superano i 100 giorni,
  // anche se 'days' non è direttamente usato dall'API (ma influenza la simulazione).
  // Per 5 anni di dati (circa 1260 giorni di trading), 'full' è necessario.
  const outputSize = (days > 100) ? 'full' : 'compact';

  // Per asset non USA (es. 'ENI.MI', 'IWDA.AS'), Alpha Vantage spesso li gestisce.
  // Per crypto, l'API è diversa (es. DIGITAL_CURRENCY_DAILY), questa funzione
  // gestisce solo azioni/ETF.
  let apiTicker = ticker;
  if (ticker.startsWith('CRYPTO:')) {
     apiTicker = ticker.split(':')[1];
     // Qui dovresti implementare una chiamata a DIGITAL_CURRENCY_DAILY se necessario
     console.warn(`Ticker Crypto ${ticker} non supportato, uso dati sintetici.`);
     return generateSyntheticPrices(ticker, days);
  }

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${apiTicker}&outputsize=${outputSize}&apikey=${API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Errore server Alpha Vantage: ${res.status}`);
    }
    
    const json = await res.json();
    
    // Gestione del limite API (il piano gratuito è limitato)
    if (json.Note) {
      console.warn(`Limite API Alpha Vantage raggiunto (o chiave DEMO): ${json.Note}`);
      throw new Error('Limite API Alpha Vantage raggiunto.');
    }

    const priceData = parseAlphaVantageData(json, ticker);
    
    if (priceData.length === 0) {
      throw new Error('Nessun dato parsato da Alpha Vantage.');
    }

    console.log(`Dati reali caricati per ${ticker} da Alpha Vantage.`);
    return priceData;

  } catch (e) {
    console.warn(`fetchPriceHistory(${ticker}) fallito, ripiego su dati sintetici. Errore: ${(e as Error).message}`);
    // Fallback ai dati sintetici se l'API fallisce
    return generateSyntheticPrices(ticker, days);
  }
}

//export async function fetchPriceHistory(ticker: string, days: number = 365 * 5): Promise<PricePoint[]> {
//  try {
//    const url = `/api/prices?ticker=${encodeURIComponent(ticker)}&days=${days}`;
//    const res = await fetch(url, { cache: 'no-store' });
//    if (!res.ok) throw new Error(`Server returned ${res.status}`);
//   const json = await res.json();
//    if (!Array.isArray(json) || json.length === 0 || !json[0].date) {
//      throw new Error('Invalid data shape from /api/prices');
//    }
//    json.sort((a, b) => a.date.localeCompare(b.date));
//    return json;
//  } catch (e) {
//    console.warn(`fetchPriceHistory(${ticker}) failed, using synthetic data`);
//    return generateSyntheticPrices(ticker, days);
//  }
//}
