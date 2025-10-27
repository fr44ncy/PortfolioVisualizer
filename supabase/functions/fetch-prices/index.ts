// supabase/functions/fetch-prices/index.ts

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
        JSON.stringify({ error: "Ticker parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (ticker.startsWith("CRYPTO:")) {
      return new Response(
        JSON.stringify({ error: "Crypto not supported, use synthetic data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ALPHA_VANTAGE_KEY = Deno.env.get("ALPHA_VANTAGE_KEY") || "demo";
    const apiUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&outputsize=full&apikey=${ALPHA_VANTAGE_KEY}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned ${response.status}`);
    }

    const data = await response.json();

    // *** INIZIO CORREZIONE: Gestione robusta degli errori API ***

    // 1. Controlla i messaggi di errore specifici dell'API
    if (data["Error Message"]) {
      console.warn(`Alpha Vantage Error for ${ticker}: ${data["Error Message"]}`);
      // Restituiamo 404 (Not Found) se l'API non riconosce il ticker
      return new Response(
        JSON.stringify({ error: `API Error: ${data["Error Message"]}` }),
        {
          status: 404, // 404 Not Found (o 400 Bad Request) è meglio di 500
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Controlla le note (spesso rate limit o info)
    if (data.Note) {
      console.warn(`Alpha Vantage Note for ${ticker}: ${data.Note}`);
      // Questo è quasi sempre un rate limit
      return new Response(
        JSON.stringify({ error: `API rate limit reached: ${data.Note}` }),
        {
          status: 429, // 429 Too Many Requests
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Controlla i dati veri e propri
    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) {
      // Se non ci sono errori o note, ma mancano i dati, è un formato non valido
      console.error(`Invalid data format for ${ticker}`, data);
      throw new Error("Invalid data format from Alpha Vantage (Time Series missing)");
    }
    
    // *** FINE CORREZIONE ***

    const prices = [];
    for (const date in timeSeries) {
      prices.push({
        date: date,
        close: Number(timeSeries[date]["5. adjusted close"]),
        currency: currency,
      });
    }

    prices.sort((a, b) => a.date.localeCompare(b.date));

    return new Response(JSON.stringify(prices), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-prices:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500, // Questo ora avverrà solo per errori *veri* del server
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});