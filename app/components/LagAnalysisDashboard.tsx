'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDataFetch, usePreloadData } from '../utils/useDataFetch';
import { fallbackHistoricalData } from '../utils/fallbackData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface WeeklyData {
  week: string;
  date: string;
  stockPrice: number;
  cryptoPrice: number;
  stockChange: number;
  cryptoChange: number;
  lagRelationship?: {
    type: 'stock_leads' | 'crypto_leads' | 'synchronous' | 'no_relation';
    lagWeeks: number;
    strength: 'strong' | 'moderate' | 'weak';
  };
}

interface LagEvent {
  week: string;
  type: 'stock_leads' | 'crypto_leads' | 'synchronous';
  lagWeeks: number;
  description: string;
  stockChange: number;
  cryptoChange: number;
  stockPrice: number;
  cryptoPrice: number;
}

export default function LagAnalysisDashboard() {
  const [selectedTicker, setSelectedTicker] = useState<string>('MSTR');
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [lagEvents, setLagEvents] = useState<LagEvent[]>([]);

  const tickers = [
    { symbol: 'MSTR', name: 'MicroStrategy', coin: 'BTC' },
    { symbol: 'BNC', name: 'BNB Network Company', coin: 'BNB' },
    { symbol: 'SBET', name: 'SharpLink Gaming', coin: 'ETH' },
    { symbol: 'DFDV', name: 'DeFi Development', coin: 'SOL' },
    { symbol: 'VERB', name: 'VERB Technology', coin: 'TON' },
    { symbol: 'HYPD', name: 'Hyperion DeFi', coin: 'HYPE' }
  ];

  // Get the base URL for data fetching (handles both dev and production)
  const getDataUrl = (path: string) => {
    if (typeof window === 'undefined') return path; // Server-side
    return `${window.location.origin}${path}`; // Client-side with full URL
  };

  // Preload critical resources for better performance
  usePreloadData([
    getDataUrl('/data/weekly_stats.json'),
    getDataUrl('/data/summary.json'),
    getDataUrl('/data/historical_baseline.json'),
    getDataUrl('/data/correlation_analysis.json'),
  ], {
    retry: 2,
    timeout: 15000,
  });

  // Optimized data fetching with caching and retry
  const { data: rawData, loading, error, metrics } = useDataFetch(getDataUrl('/data/complete_historical_baseline.json'), {
    retry: 3,
    retryDelay: 1500,
    timeout: 20000,
    staleTime: 600000, // 10 minutes cache for historical data
    refetchOnFocus: false, // Historical data doesn't change frequently
    cacheKey: `lag-analysis-${selectedTicker}`,
    fallbackData: fallbackHistoricalData, // Provide fallback data
  });

  // Process data when raw data or selected ticker changes
  useEffect(() => {
    console.log('Processing data effect triggered:', { 
      hasRawData: !!rawData, 
      selectedTicker,
      loading,
      error: error?.message
    });
    
    if (rawData) {
      try {
        console.log('Raw data structure:', Object.keys(rawData));
        const processedData = processHistoricalDataForLagAnalysis(rawData, selectedTicker);
        console.log('Processed data:', { 
          weeklyDataCount: processedData.weeklyData.length,
          lagEventsCount: processedData.lagEvents.length 
        });
        setWeeklyData(processedData.weeklyData);
        setLagEvents(processedData.lagEvents);
      } catch (error) {
        console.error('Error processing historical data:', error);
        setWeeklyData([]);
        setLagEvents([]);
      }
    }
  }, [rawData, selectedTicker, loading, error]);

  const processHistoricalDataForLagAnalysis = (data: any, ticker: string) => {
    const weeklyData: WeeklyData[] = [];
    const lagEvents: LagEvent[] = [];
    
    // 验证数据结构
    if (!data || typeof data !== 'object' || !data.data || typeof data.data !== 'object') {
      console.error('Invalid data structure in processHistoricalDataForLagAnalysis');
      return { weeklyData, lagEvents };
    }
    
    // 格式化週期顯示
    const formatWeekRange = (date: string) => {
      if (!date || typeof date !== 'string') return 'Invalid Date';
      
      try {
        const start = new Date(date);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const formatDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
        return `${formatDate(start)} ~ ${formatDate(end)}`;
      } catch (error) {
        console.error('Error formatting date range:', error);
        return 'Invalid Date';
      }
    };

    // 過濾未來數據 - 只顯示已完成的週期
    const filterCompletedWeeks = (weekData: any) => {
      if (!weekData || !weekData.baseline_date || typeof weekData.baseline_date !== 'string') {
        return false;
      }
      
      try {
        const now = new Date();
        const baselineDate = new Date(weekData.baseline_date);
        
        // 檢查日期是否有效
        if (isNaN(baselineDate.getTime())) {
          return false;
        }
        
        const weekEnd = new Date(baselineDate);
        weekEnd.setDate(baselineDate.getDate() + 6); // 週日結束
        
        return weekEnd <= now; // 只返回已完成的週期
      } catch (error) {
        console.error('Error filtering completed weeks:', error);
        return false;
      }
    };

    // 計算基準價格（第一週作為100%基準）
    let baselineStockPrice: number | null = null;
    let baselineCryptoPrice: number | null = null;

    const sortedWeeks = Object.keys(data.data || {}).sort();
    let previousWeekData: any = null;

    for (const weekKey of sortedWeeks) {
      const weekData = data.data[weekKey];
      
      // 跳過無效或未完成的週期
      if (!weekData || !filterCompletedWeeks(weekData)) {
        continue;
      }
      
      if (weekData.companies && typeof weekData.companies === 'object' && weekData.companies[ticker]) {
        const company = weekData.companies[ticker];
        
        // 驗證公司數據
        if (!company || typeof company !== 'object') {
          continue;
        }
        
        // 驗證價格數據
        if (typeof company.stock_price !== 'number' || typeof company.coin_price !== 'number') {
          continue;
        }
        
        // 檢查價格是否為有效數字
        if (!isFinite(company.stock_price) || !isFinite(company.coin_price)) {
          continue;
        }
        
        // 設置基準價格
        if (baselineStockPrice === null) {
          baselineStockPrice = company.stock_price;
          baselineCryptoPrice = company.coin_price;
        }

        // 計算週環比變化 - 添加安全檢查
        const stockChange = (previousWeekData && 
                            typeof company.stock_price === 'number' && 
                            typeof previousWeekData.stock_price === 'number' && 
                            previousWeekData.stock_price !== 0 &&
                            isFinite(company.stock_price) && 
                            isFinite(previousWeekData.stock_price)) 
          ? ((company.stock_price - previousWeekData.stock_price) / previousWeekData.stock_price) * 100
          : 0;
        
        const cryptoChange = (previousWeekData && 
                             typeof company.coin_price === 'number' && 
                             typeof previousWeekData.coin_price === 'number' && 
                             previousWeekData.coin_price !== 0 &&
                             isFinite(company.coin_price) && 
                             isFinite(previousWeekData.coin_price))
          ? ((company.coin_price - previousWeekData.coin_price) / previousWeekData.coin_price) * 100
          : 0;

        // 檢測滯後關係
        const lagRelationship = detectLagRelationship(stockChange, cryptoChange);

        const processedWeek: WeeklyData = {
          week: formatWeekRange(weekData.baseline_date),
          date: weekData.baseline_date,
          stockPrice: company.stock_price,
          cryptoPrice: company.coin_price,
          stockChange: stockChange,
          cryptoChange: cryptoChange,
          lagRelationship: lagRelationship
        };

        weeklyData.push(processedWeek);

        // 記錄滯後事件
        if (lagRelationship && lagRelationship.type !== 'no_relation') {
          lagEvents.push({
            week: formatWeekRange(weekData.baseline_date),
            type: lagRelationship.type,
            lagWeeks: lagRelationship.lagWeeks,
            description: getLagDescription(lagRelationship),
            stockChange: stockChange,
            cryptoChange: cryptoChange,
            stockPrice: company.stock_price,
            cryptoPrice: company.coin_price
          });
        }

        previousWeekData = company;
      }
    }

    return { weeklyData, lagEvents };
  };

  const detectLagRelationship = (stockChange: number, cryptoChange: number) => {
    const SIGNIFICANT_CHANGE = 2; // 2%閾值
    const SYNC_WINDOW = 0.5; // 同步窗口

    const stockSignificant = Math.abs(stockChange) >= SIGNIFICANT_CHANGE;
    const cryptoSignificant = Math.abs(cryptoChange) >= SIGNIFICANT_CHANGE;

    if (!stockSignificant && !cryptoSignificant) {
      return { type: 'no_relation' as const, lagWeeks: 0, strength: 'weak' as const };
    }

    // 檢測同步性（同方向且幅度相近）
    if (stockSignificant && cryptoSignificant) {
      const sameDirection = (stockChange > 0 && cryptoChange > 0) || (stockChange < 0 && cryptoChange < 0);
      const changeDiff = Math.abs(Math.abs(stockChange) - Math.abs(cryptoChange));
      
      if (sameDirection && changeDiff <= SYNC_WINDOW) {
        return { type: 'synchronous' as const, lagWeeks: 0, strength: 'strong' as const };
      }
    }

    // 簡化滯後檢測（基於變化幅度）
    if (stockSignificant && !cryptoSignificant) {
      return { type: 'stock_leads' as const, lagWeeks: 1, strength: 'moderate' as const };
    } else if (cryptoSignificant && !stockSignificant) {
      return { type: 'crypto_leads' as const, lagWeeks: 1, strength: 'moderate' as const };
    }

    return { type: 'no_relation' as const, lagWeeks: 0, strength: 'weak' as const };
  };

  const getLagDescription = (lagRel: any) => {
    switch (lagRel.type) {
      case 'stock_leads':
        return `📈 股票領先 ${lagRel.lagWeeks}週`;
      case 'crypto_leads':
        return `📉 ${getCurrentTicker()?.coin}領先 ${lagRel.lagWeeks}週`;
      case 'synchronous':
        return '🔄 同步變動';
      default:
        return '➖ 無明顯關聯';
    }
  };

  const getCurrentTicker = () => tickers.find(t => t.symbol === selectedTicker);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const currentTicker = getCurrentTicker();
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl min-w-64">
          <p className="text-white font-semibold mb-3 text-center">{`週期: ${label}`}</p>
          
          {/* 股票信息 */}
          <div className="mb-3 p-2 bg-slate-700/30 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-green-400 font-medium">📈 {selectedTicker}</span>
              <span className={`font-bold ${data.stockChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.stockChange > 0 ? '+' : ''}{data.stockChange.toFixed(2)}%
              </span>
            </div>
            <div className="text-slate-300 text-sm">
              股價: <span className="font-mono">${data.stockPrice?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>
          </div>

          {/* 加密貨幣信息 */}
          <div className="mb-3 p-2 bg-slate-700/30 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-blue-400 font-medium">📊 {currentTicker?.coin}</span>
              <span className={`font-bold ${data.cryptoChange >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {data.cryptoChange > 0 ? '+' : ''}{data.cryptoChange.toFixed(2)}%
              </span>
            </div>
            <div className="text-slate-300 text-sm">
              幣價: <span className="font-mono">${data.cryptoPrice?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: currentTicker?.coin === 'BTC' ? 0 : 2
              })}</span>
            </div>
          </div>

          {/* 滯後關係 */}
          {data.lagRelationship && (
            <div className="border-t border-slate-600 pt-2">
              <p className="text-yellow-400 text-sm text-center font-medium">
                {getLagDescription(data.lagRelationship)}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">載入失敗</h2>
            <p className="text-slate-300 mb-4">
              無法載入數據，請檢查網路連接或重試
            </p>
            <div className="text-sm text-red-400 mb-4 p-3 bg-red-900/20 rounded-lg">
              錯誤詳情: {error.message}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              重新載入頁面
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-white text-lg mb-2 animate-pulse">載入滯後效應分析中...</div>
            {metrics && (
              <div className="text-sm text-slate-400">
                {metrics.fromCache ? '從快取載入' : '從網路載入'}
                {metrics.retryCount > 0 && ` • 重試 ${metrics.retryCount} 次`}
              </div>
            )}
            {error && (
              <div className="text-sm text-yellow-400 mt-2">
                使用快取數據 • 網路錯誤：{error.message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* 頂部標題 */}
      <div className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            🎯 滯後效應分析器
          </h1>
          <p className="text-slate-300 text-sm mt-1">分析股價與幣價的領先滯後關係 - 誰先動？</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* 左側：股票選擇 */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">選擇股票</h3>
              <div className="space-y-2">
                {tickers.map((ticker) => (
                  <button
                    key={ticker.symbol}
                    onClick={() => setSelectedTicker(ticker.symbol)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      selectedTicker === ticker.symbol
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                        : 'bg-slate-700/30 border-white/10 hover:bg-slate-600/40 text-white'
                    }`}
                  >
                    <div className="font-semibold">{ticker.symbol}</div>
                    <div className="text-xs text-slate-400">vs {ticker.coin}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 滯後事件列表 */}
            <div className="mt-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">近期滯後事件</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lagEvents.slice(-5).reverse().map((event, index) => {
                  const currentTicker = getCurrentTicker();
                  return (
                    <div key={index} className="p-3 bg-slate-700/30 rounded-lg">
                      <div className="text-sm text-white font-medium mb-2">{event.week}</div>
                      <div className="text-xs text-slate-300 mb-2">{event.description}</div>
                      
                      {/* 變化百分比 */}
                      <div className="flex justify-between text-xs mb-2">
                        <span className={`${event.stockChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedTicker}: {event.stockChange > 0 ? '+' : ''}{event.stockChange.toFixed(1)}%
                        </span>
                        <span className={`${event.cryptoChange >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          {currentTicker?.coin}: {event.cryptoChange > 0 ? '+' : ''}{event.cryptoChange.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* 原始價格 */}
                      <div className="flex justify-between text-xs text-slate-500 border-t border-slate-600 pt-1">
                        <span className="font-mono">
                          ${event.stockPrice?.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </span>
                        <span className="font-mono">
                          ${event.cryptoPrice?.toLocaleString(undefined, {
                            maximumFractionDigits: currentTicker?.coin === 'BTC' ? 0 : 2
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右側：主圖表 */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">
                {selectedTicker} vs {getCurrentTicker()?.coin} 滯後效應分析
              </h3>
              
              <div className="h-96 mb-4">
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={11}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* 基準線 */}
                    <ReferenceLine y={0} stroke="#64748B" strokeDasharray="2 2" />
                    
                    {/* 股票變化線 - 綠色實線 */}
                    <Line 
                      type="monotone" 
                      dataKey="stockChange" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                      name={`${selectedTicker} 股價變化`}
                    />
                    
                    {/* 加密貨幣變化線 - 藍色虛線 */}
                    <Line 
                      type="monotone" 
                      dataKey="cryptoChange" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                      name={`${getCurrentTicker()?.coin} 幣價變化`}
                    />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <div className="text-4xl mb-4">📊</div>
                      <p className="text-lg">暫無圖表數據</p>
                      <p className="text-sm">請等待數據載入或選擇其他股票</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 圖例 */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-emerald-500"></div>
                  <span className="text-slate-300">{selectedTicker} 股價變化</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-500 opacity-75" style={{backgroundImage: 'repeating-linear-gradient(to right, #3B82F6 0, #3B82F6 4px, transparent 4px, transparent 8px)'}}></div>
                  <span className="text-slate-300">{getCurrentTicker()?.coin} 幣價變化</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}