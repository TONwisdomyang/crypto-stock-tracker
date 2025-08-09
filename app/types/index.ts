export interface StockData {
  ticker: string;
  company_name: string;
  stock_close: number;
  stock_pct_change: number;
  coin: string;
  coin_close: number;
  coin_pct_change: number;
  holding_qty: number;
  holding_pct_of_supply: number;
  market_cap: number;
}

export interface WeeklyData {
  week_end: string;
  data: StockData[];
}

export interface Holdings {
  [ticker: string]: {
    coin: string;
    holding_qty: number;
    company_name: string;
  };
}