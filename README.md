# Portfolio Analyzer

A modern portfolio backtesting and analysis webapp with real-time asset search, historical performance tracking, and comprehensive risk metrics.

## Features

- **Asset Search**: Search assets by ticker, ISIN, or company name with autocomplete suggestions
- **Portfolio Builder**: Create custom portfolios with weight allocation
- **Performance Charts**: Visualize portfolio value over time (linear or logarithmic scale)
- **Risk Metrics**:
  - Annual Return
  - Volatility
  - Sharpe Ratio
  - Value at Risk (VaR) at 95%
  - Conditional VaR (CVaR)
- **Returns Distribution**: Histogram of rolling annual returns
- **Multi-Currency**: Support for EUR, USD, GBP with automatic conversion
- **Clean Design**: Minimal, production-ready UI inspired by curvo.eu

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API keys (optional, for real market data):

Copy `.env.local.example` to `.env.local` and add your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Alpha Vantage - for historical price data
# Free tier: 25 requests/day
# Sign up: https://www.alphavantage.co/support/#api-key
VITE_ALPHA_VANTAGE_KEY=your_alpha_vantage_key

# EODHD - for asset search
# Free tier: 20 requests/day
# Sign up: https://eodhistoricaldata.com/register
VITE_EODHD_API_KEY=your_eodhd_key
```

**Note**: Without API keys, the app will use synthetic data generated with geometric Brownian motion.

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## How It Works

### Asset Search
- Enter ticker (e.g., "AAPL"), ISIN (e.g., "US0378331005"), or company name
- Select from autocomplete suggestions
- Each asset includes its native currency

### Portfolio Creation
- Add assets with percentage weights
- Weights should total 100% for balanced portfolio
- Adjust weights anytime with inline editing

### Data Sources
1. **With API keys**: Fetches real market data from Alpha Vantage
2. **Without API keys**: Generates synthetic data using GBM with realistic parameters

### Calculations
- **NAV Series**: Computed from historical prices with currency conversion
- **Returns**: Calculated from daily price changes
- **Volatility**: Annualized standard deviation of returns
- **Sharpe Ratio**: Risk-adjusted return (assuming 2% risk-free rate)
- **VaR/CVaR**: Based on rolling 1-year returns at 95% confidence

## Technology Stack

- **React + TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Charts
- **Supabase** - Database (ready for portfolio persistence)
- **Lucide React** - Icons

## Future Enhancements

- Save/load portfolios from Supabase
- Compare multiple portfolios
- More asset classes (bonds, crypto, commodities)
- Advanced risk metrics (max drawdown, Sortino ratio)
- Rebalancing simulations
- Export to CSV/PDF
