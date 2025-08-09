// 數據驗證和類型守衛工具函數

export interface StockData {
  ticker: string;
  company_name: string;
  stock_close: number;
  stock_pct_change: number;
  coin: string;
  coin_close: number;
  coin_pct_change: number;
  holding_qty?: number;
  holding_pct_of_supply?: number;
  market_cap?: number;
}

export interface WeeklyStatsData {
  week_end: string;
  generated_at: string;
  data: StockData[];
}

export interface BaselineData {
  generated_at: string;
  timezone?: string;
  baseline_time?: string;
  data: Record<string, {
    baseline_date: string;
    companies: Record<string, {
      stock_price: number;
      coin_price: number;
    }>;
  }>;
}

// 數值驗證函數
export const isValidNumber = (value: unknown): value is number => {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
};

export const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

// StockData 類型守衛
export const isValidStockData = (data: unknown): data is StockData => {
  if (!data || typeof data !== 'object') return false;
  
  const item = data as Record<string, unknown>;
  
  return (
    isValidString(item.ticker) &&
    isValidString(item.company_name) &&
    isValidNumber(item.stock_close) &&
    isValidNumber(item.stock_pct_change) &&
    isValidString(item.coin) &&
    isValidNumber(item.coin_close) &&
    isValidNumber(item.coin_pct_change)
  );
};

// WeeklyStatsData 類型守衛
export const isValidWeeklyStatsData = (data: unknown): data is WeeklyStatsData => {
  if (!data || typeof data !== 'object') return false;
  
  const weeklyData = data as Record<string, unknown>;
  
  return (
    isValidString(weeklyData.week_end) &&
    isValidString(weeklyData.generated_at) &&
    Array.isArray(weeklyData.data) &&
    weeklyData.data.every(isValidStockData)
  );
};

// BaselineData 類型守衛
export const isValidBaselineData = (data: unknown): data is BaselineData => {
  if (!data || typeof data !== 'object') return false;
  
  const baselineData = data as Record<string, unknown>;
  
  if (!isValidString(baselineData.generated_at) || 
      !baselineData.data || 
      typeof baselineData.data !== 'object') {
    return false;
  }
  
  // 檢查 data 結構
  const dataObj = baselineData.data as Record<string, unknown>;
  for (const weekKey of Object.keys(dataObj)) {
    const weekData = dataObj[weekKey];
    if (!weekData || typeof weekData !== 'object') return false;
    
    const week = weekData as Record<string, unknown>;
    if (!isValidString(week.baseline_date) || 
        !week.companies || 
        typeof week.companies !== 'object') {
      return false;
    }
    
    // 檢查 companies 結構
    const companies = week.companies as Record<string, unknown>;
    for (const companyKey of Object.keys(companies)) {
      const company = companies[companyKey];
      if (!company || typeof company !== 'object') return false;
      
      const companyData = company as Record<string, unknown>;
      if (!isValidNumber(companyData.stock_price) || 
          !isValidNumber(companyData.coin_price)) {
        return false;
      }
    }
  }
  
  return true;
};

// 通用 JSON 響應驗證
export const validateJsonResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const text = await response.text();
  if (!text.trim()) {
    throw new Error('Empty response body');
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }
};

// 安全的數值格式化
export const safeToFixed = (value: number, digits: number = 2): string => {
  if (!isValidNumber(value)) return '0.00';
  return value.toFixed(Math.min(digits, 20)); // 限制最大精度為 20
};

export const safeFormatPercentage = (value: number, digits: number = 1): string => {
  if (!isValidNumber(value)) return '0.0%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${safeToFixed(value, digits)}%`;
};

export const safeFormatCurrency = (value: number): string => {
  if (!isValidNumber(value)) return '$0.00';
  
  const absValue = Math.abs(value);
  let maximumFractionDigits = 2;
  
  if (absValue >= 10000) {
    maximumFractionDigits = 0;
  } else if (absValue >= 100) {
    maximumFractionDigits = 2;
  } else if (absValue >= 1) {
    maximumFractionDigits = 3;
  } else {
    maximumFractionDigits = 4;
  }
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Math.min(2, maximumFractionDigits),
      maximumFractionDigits: Math.min(maximumFractionDigits, 20),
    }).format(value);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return '$0.00';
  }
};