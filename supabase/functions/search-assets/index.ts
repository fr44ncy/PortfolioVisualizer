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
    // *** CORREZIONE: Leggi i dati dal body JSON (inviato come POST) ***
    const { query } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const EODHD_API_KEY = Deno.env.get("EODHD_API_KEY") || "demo";
    const apiUrl = `https://eodhistoricaldata.com/api/search/${encodeURIComponent(
      query
    )}?api_token=${EODHD_API_KEY}&fmt=json`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`EODHD API returned ${response.status}`);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = results.map((item: any) => {
      let ticker = item.Code;

      if (item.Exchange && item.Exchange !== "US" && item.Exchange !== "CRYPTO") {
        const exchangeSuffix: Record<string, string> = {
          MI: ".MI",
          AS: ".AS",
          L: ".L",
          DE: ".DE",
          PA: ".PA",
          SW: ".SW",
        };
        ticker = `${item.Code}${exchangeSuffix[item.Exchange] || "." + item.Exchange}`;
      }

      if (item.Exchange === "US") {
        ticker = item.Code;
      }

      if (item.Exchange === "CRYPTO") {
        ticker = `CRYPTO:${item.Code}`;
      }

      return {
        ticker: ticker,
        isin: item.ISIN || undefined,
        name: item.Name,
        currency: item.Currency || "USD",
      };
    });

    const uniqueTickers = new Set<string>();
    const uniqueSuggestions = suggestions.filter((s: any) => {
      if (uniqueTickers.has(s.ticker)) return false;
      uniqueTickers.add(s.ticker);
      return true;
    });

    return new Response(JSON.stringify(uniqueSuggestions.slice(0, 7)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-assets:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});