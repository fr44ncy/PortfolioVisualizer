import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { ticker, currency: reqCurrency } = await req.json();
    const currency = reqCurrency || "USD";

    if (!ticker) {
      return new Response(
        JSON.stringify({ error: "Parametro 'ticker' obbligatorio" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (ticker.startsWith("CRYPTO:")) {
      return new Response(
        JSON.stringify({ error: "Asset crypto non supportati" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_KEY");
    
    if (!ALPHA_VANTAGE_KEY || ALPHA_VANTAGE_KEY === "demo") {
      return new Response(
        JSON.stringify({ 
          error: "API key Alpha Vantage non configurata. Configura ALPHA_VANTAGE_KEY nelle Edge Functions secrets." 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Traduzione suffissi ticker
    let apiTicker = ticker;
    if (apiTicker.endsWith(".AS")) {
      apiTicker = apiTicker.replace(".AS", ".AMS");
    }

    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(apiTicker)}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`;

    console.log(`Fetching data for ${apiTicker}...`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned ${response.status}`);
    }

    const data = await response.json();

    // Log per debug
    console.log(`API Response keys:`, Object.keys(data));

    // Gestione errori API specifici
    if (data["Error Message"]) {
      console.warn(`Alpha Vantage Error for ${ticker}: ${data["Error Message"]}`);
      return new Response(
        JSON.stringify({ 
          error: `Ticker '${ticker}' non trovato o non valido` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (data["Note"]) {
      console.warn(`Alpha Vantage Note for ${ticker}: ${data["Note"]}`);
      // Controlla se è rate limit
      if (data["Note"].toLowerCase().includes("rate limit") || 
          data["Note"].toLowerCase().includes("call frequency")) {
        return new Response(
          JSON.stringify({ 
            error: "Limite richieste API raggiunto. Riprova tra qualche minuto." 
          }),
          {
            status: 429,
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "Retry-After": "60"
            },
          }
        );
      }
    }

    // Cerca il time series - prova diversi formati
    let timeSeries = data["Time Series (Daily)"];
    
    // Fallback per altri formati
    if (!timeSeries) {
      timeSeries = data["Weekly Time Series"] || 
                   data["Monthly Time Series"] ||
                   data["Time Series (Digital Currency Daily)"];
    }

    if (!timeSeries || Object.keys(timeSeries).length === 0) {
      console.error(`No time series data for ${ticker}. Response:`, JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: `Formato dati non valido per '${ticker}'. Il ticker potrebbe non essere supportato.` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
      return new Response(
        JSON.stringify({ 
          error: `Nessun dato disponibile per '${ticker}'` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prices = [];
    for (const date in timeSeries) {
      const closePrice = parseFloat(timeSeries[date]["5. adjusted close"]);
      if (!isNaN(closePrice) && closePrice > 0) {
        prices.push({
          date: date,
          close: closePrice,
          currency: currency,
        });
      }
    }

    if (prices.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: `Dati non validi per '${ticker}'` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    prices.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`✓ Successfully fetched ${prices.length} days for ${ticker}`);

    return new Response(JSON.stringify(prices), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-prices:", error);
    return new Response(
      JSON.stringify({ 
        error: `Errore nel recupero dati: ${(error as Error).message}` 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});