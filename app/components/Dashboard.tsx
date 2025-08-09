'use client';

import { useState } from 'react';
import { WeeklyData } from '../types';
import { useDataFetch, usePreloadData } from '../utils/useDataFetch';
import Header from './Header';
import SummaryCards from './SummaryCards';
import DataTable from './DataTable';
import BaselineChart from './BaselineChart';
import Footer from './Footer';

export default function Dashboard() {
  const [selectedWeek, setSelectedWeek] = useState<string>('2025-W32');

  // Preload related data files
  usePreloadData([
    '/data/historical_baseline.json',
    '/data/correlation_analysis.json',
    '/data/holdings.json'
  ]);

  // Optimized data fetching with retry and caching
  const { data, loading, error, metrics } = useDataFetch<WeeklyData>('/data/weekly_stats.json', {
    retry: 3,
    retryDelay: 1000,
    timeout: 15000,
    staleTime: 300000, // 5 minutes cache
    refetchOnFocus: true,
    onError: (err) => {
      console.error('Dashboard data fetch error:', err);
    },
  });

  // Fallback data for error cases
  const getFallbackData = (): WeeklyData => ({
    week_end: "2025-08-06",
    data: [
      {
        ticker: "MSTR",
        company_name: "MicroStrategy Inc.",
        stock_close: 375.46,
        stock_pct_change: -3.54,
        coin: "BTC",
        coin_close: 114169,
        coin_pct_change: 0.07,
        holding_qty: 400000,
        holding_pct_of_supply: 2.01,
        market_cap: 2272286117840
      }
    ]
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🪙</div>
          <h2 className="text-xl font-semibold mb-2">載入中...</h2>
          <p className="text-slate-400">正在獲取最新的股價和加密幣數據</p>
          {metrics && (
            <div className="mt-4 text-xs text-slate-500">
              {metrics.fromCache ? '從快取載入' : '從伺服器載入'}
              {metrics.retryCount > 0 && ` • 重試 ${metrics.retryCount} 次`}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Use fallback data if network request failed
  const displayData = data || getFallbackData();
  const hasNetworkError = error && !data;

  // Calculate summary statistics with error handling
  let avgStockChange = 0;
  let avgCoinChange = 0;
  let totalHoldings = 0;

  try {
    avgStockChange = displayData.data.length > 0 
      ? displayData.data.reduce((acc, item) => acc + (item.stock_pct_change || 0), 0) / displayData.data.length
      : 0;
    
    // Calculate average coin change (group by unique coins)
    const uniqueCoins = [...new Set(displayData.data.map(item => item.coin))];
    if (uniqueCoins.length > 0) {
      const coinChanges = uniqueCoins.map(coin => {
        const coinData = displayData.data.find(item => item.coin === coin);
        return coinData?.coin_pct_change || 0;
      });
      avgCoinChange = coinChanges.reduce((acc, change) => acc + change, 0) / coinChanges.length;
    }
    
    totalHoldings = displayData.data.reduce((acc, item) => {
      const holding = (item.holding_qty || 0) * (item.coin_close || 0);
      return acc + holding;
    }, 0);
  } catch (error) {
    console.error('Error calculating summary statistics:', error);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-6">
        {/* Network Error Banner */}
        {hasNetworkError && (
          <div className="mb-4 bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-300">
              <span>⚠️</span>
              <span className="text-sm">
                網路連線問題，正在顯示備用數據 
                {metrics && metrics.retryCount > 0 && ` (已重試 ${metrics.retryCount} 次)`}
              </span>
            </div>
          </div>
        )}

        {/* Performance Info (Development only) */}
        {process.env.NODE_ENV === 'development' && metrics && (
          <div className="mb-4 bg-slate-800/50 border border-slate-600 rounded-lg p-3">
            <div className="text-xs text-slate-400 flex gap-4">
              <span>載入時間: {metrics.requestTime}ms</span>
              <span>來源: {metrics.fromCache ? '快取' : '網路'}</span>
              <span>重試: {metrics.retryCount}次</span>
            </div>
          </div>
        )}

        {/* Header */}
        <Header 
          selectedWeek={selectedWeek} 
          onWeekChange={setSelectedWeek}
        />
        
        {/* Summary Cards */}
        <SummaryCards
          avgStockChange={avgStockChange}
          avgCoinChange={avgCoinChange}
          totalHoldings={totalHoldings}
          correlation={0.72} // Mock correlation
        />
        
        {/* Main Data Table - 核心功能 */}
        <DataTable data={displayData.data} />
        
        {/* Baseline Comparison Chart - 週一基準對照 */}
        <BaselineChart />
        
        {/* Footer */}
        <Footer lastUpdated={displayData.week_end} />
      </div>
    </div>
  );
}