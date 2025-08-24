'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Layers, PieChart, Target } from 'lucide-react';
import TokenLogo from './TokenLogo';
import DataVerificationLink from './DataVerificationLink';
import { calculateSupplyAnalysis, formatNumber, formatPercentage, getConcentrationColor, type SupplyAnalysis } from '../utils/supplyCalculator';

interface CoinData {
  week: string;
  date: string;
  coinPrice: number;
  coinChange: number;
  companies: {
    [ticker: string]: {
      name: string;
      price: number;
      change: number;
    };
  };
}

interface CoinGroup {
  symbol: string;
  name: string;
  coin_id: string;
  companies: Array<{
    ticker: string;
    name: string;
  }>;
  color: string;
}

export default function CoinBasedDashboard() {
  const [selectedCoin, setSelectedCoin] = useState<string>('SOL');
  const [coinData, setCoinData] = useState<CoinData[]>([]);
  const [holdingsData, setHoldingsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVerification, setExpandedVerification] = useState<string | null>(null);

  // 按底層代幣分組
  const coinGroups: CoinGroup[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      coin_id: 'bitcoin',
      companies: [
        { ticker: 'MSTR', name: 'MicroStrategy' },
        { ticker: 'MARA', name: 'MARA Holdings' },
        { ticker: 'CEP', name: 'XXI Century Capital' }
      ],
      color: '#F7931A'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum', 
      coin_id: 'ethereum',
      companies: [
        { ticker: 'SBET', name: 'SharpLink Gaming' },
        { ticker: 'BMNR', name: 'Bitmine Immersion Technologies' }
      ],
      color: '#627EEA'
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      coin_id: 'binancecoin', 
      companies: [{ ticker: 'BNC', name: 'BNB Network Company' }],
      color: '#F3BA2F'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      coin_id: 'solana',
      companies: [
        { ticker: 'DFDV', name: 'DeFi Development' },
        { ticker: 'UPXI', name: 'UPXI Corp' }
      ],
      color: '#14F195'
    },
    {
      symbol: 'TON',
      name: 'The Open Network',
      coin_id: 'the-open-network',
      companies: [{ ticker: 'VERB', name: 'VERB Technology' }],
      color: '#0088CC'
    },
    {
      symbol: 'HYPE',
      name: 'Hyperliquid',
      coin_id: 'hyperliquid',
      companies: [{ ticker: 'HYPD', name: 'Hyperion DeFi' }],
      color: '#9945FF'
    }
  ];

  // 獲取當前數據統計
  const getCurrentStats = () => {
    if (coinData.length === 0) return null;
    
    const latestData = coinData[coinData.length - 1];
    const coinChange = latestData.coinChange;
    
    return {
      coinChange,
      coinPrice: latestData.coinPrice,
      weekRange: latestData.week
    };
  };

  // 獲取供應量分析
  const getSupplyAnalysis = (): SupplyAnalysis | null => {
    try {
      const currentGroup = getCurrentCoinGroup();
      if (!currentGroup || Object.keys(holdingsData).length === 0) return null;
      return calculateSupplyAnalysis(currentGroup.coin_id, holdingsData);
    } catch (error) {
      console.error('Error calculating supply analysis:', error);
      return null;
    }
  };

  // 股價線條顏色配置
  const getStockColors = (coinSymbol: string) => {
    const colorMap: { [key: string]: string[] } = {
      'BTC': ['#FF6B35', '#E11D48', '#7C3AED'], // MSTR, MARA, CEP
      'ETH': ['#8B5CF6', '#F59E0B'], // SBET, BMNR
      'BNB': ['#EAB308'], // BNC
      'SOL': ['#059669', '#06B6D4'], // DFDV, UPXI
      'TON': ['#2563EB'], // VERB
      'HYPE': ['#DC2626'] // HYPD
    };
    return colorMap[coinSymbol] || ['#64748B'];
  };

  useEffect(() => {
    async function fetchCoinData() {
      try {
        setLoading(true);
        
        // 並行載入歷史數據和持有量數據
        const [historyResponse, holdingsResponse] = await Promise.all([
          fetch('/data/complete_historical_baseline.json'),
          fetch('/data/holdings.json')
        ]);
        
        if (!historyResponse.ok) {
          throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }
        
        if (!holdingsResponse.ok) {
          throw new Error(`Holdings data error! status: ${holdingsResponse.status}`);
        }
        
        const data = await historyResponse.json();
        const holdings = await holdingsResponse.json();
        
        setHoldingsData(holdings);
        const selectedGroup = coinGroups.find(g => g.symbol === selectedCoin);
        
        if (!selectedGroup) {
          throw new Error(`Coin group not found: ${selectedCoin}`);
        }

        // 格式化週期顯示 - 使用與其他組件相同的邏輯
        const formatWeekRange = (date: string) => {
          if (!date || typeof date !== 'string') return 'Invalid Date';
          
          try {
            const friday = new Date(date + 'T00:00:00.000Z');
            const startDate = new Date(friday);
            startDate.setUTCDate(friday.getUTCDate() - 7);
            
            const formatDate = (date: Date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
            return `${formatDate(startDate)} ~ ${formatDate(friday)}`;
          } catch (error) {
            console.error('Error formatting date range:', error);
            return 'Invalid Date';
          }
        };

        const transformedData: CoinData[] = [];
        const sortedWeeks = Object.keys(data.data).sort((a, b) => {
          const weekA = parseInt(a.split('-W')[1]);
          const weekB = parseInt(b.split('-W')[1]);
          return weekA - weekB;
        });

        let previousCoinPrice = 0;
        const previousCompanyPrices: { [key: string]: number } = {};

        sortedWeeks.forEach((week, index) => {
          const weekData = data.data[week];
          
          // 從第一個公司獲取該代幣的價格
          const firstCompany = selectedGroup.companies[0];
          const companyData = weekData.companies[firstCompany.ticker];
          
          if (!companyData) return;

          const coinPrice = companyData.coin_price;
          const coinChange = index > 0 ? ((coinPrice - previousCoinPrice) / previousCoinPrice) * 100 : 0;

          const companies: CoinData['companies'] = {};

          // 處理每個持有該代幣的公司
          selectedGroup.companies.forEach(company => {
            const stockData = weekData.companies[company.ticker];
            if (stockData) {
              const stockPrice = stockData.stock_price;
              const prevPrice = previousCompanyPrices[company.ticker] || stockPrice;
              const stockChange = index > 0 && prevPrice !== 0 
                ? ((stockPrice - prevPrice) / prevPrice) * 100 
                : 0;

              companies[company.ticker] = {
                name: company.name,
                price: stockPrice,
                change: stockChange
              };

              previousCompanyPrices[company.ticker] = stockPrice;
            }
          });

          transformedData.push({
            week: formatWeekRange(weekData.baseline_date),
            date: weekData.baseline_date,
            coinPrice: coinPrice,
            coinChange: coinChange,
            companies: companies
          });

          previousCoinPrice = coinPrice;
        });

        setCoinData(transformedData);
      } catch (err) {
        console.error('Error fetching coin data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchCoinData();
  }, [selectedCoin]);

  const getCurrentCoinGroup = () => coinGroups.find(g => g.symbol === selectedCoin);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const coinGroup = getCurrentCoinGroup();
      
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-5 shadow-2xl">
          <div className="border-b border-gray-700/50 pb-3 mb-3">
            <p className="text-gray-200 font-semibold text-sm">{`週期: ${label}`}</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: coinGroup?.color || '#64748B' }}
                ></div>
                <span className="text-gray-300 font-medium text-sm">{selectedCoin}</span>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${
                  data.coinChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {data.coinChange >= 0 ? '+' : ''}{data.coinChange.toFixed(2)}%
                </p>
                <p className="text-gray-400 text-xs">${data.coinPrice.toFixed(2)}</p>
              </div>
            </div>
            
            {coinGroup?.companies.map((company, index) => {
              const companyData = data.companies[company.ticker];
              if (companyData) {
                const colors = getStockColors(selectedCoin);
                return (
                  <div key={company.ticker} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: colors[index] || '#64748B' }}
                      ></div>
                      <span className="text-gray-300 text-sm">{company.ticker}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${
                        companyData.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {companyData.change >= 0 ? '+' : ''}{companyData.change.toFixed(2)}%
                      </p>
                      <p className="text-gray-400 text-xs">${companyData.price.toFixed(2)}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">底層代幣生態分析</h1>
            </div>
            <div className="flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-medium">載入代幣數據中...</p>
                <p className="text-sm text-gray-500 mt-2">正在同步最新市場數據</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-6 h-6 text-red-400" />
              <h1 className="text-2xl font-bold text-white">底層代幣生態分析</h1>
            </div>
            <div className="flex items-center justify-center h-96 text-red-400">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-lg font-semibold mb-2">載入失敗</p>
                <p className="text-sm text-gray-400 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 transition-colors"
                >
                  重新載入
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentGroup = getCurrentCoinGroup();
  const stockColors = getStockColors(selectedCoin);
  const stats = getCurrentStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* 頂部標題區域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Layers className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">底層代幣生態分析</h1>
                <p className="text-gray-400">追蹤代幣價格與相關公司股價的關聯性</p>
              </div>
            </div>
            {stats && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-400">當前週期</p>
                  <p className="text-white font-medium">{stats.weekRange}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{selectedCoin} 表現</p>
                  <p className={`text-lg font-bold ${
                    stats.coinChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {stats.coinChange >= 0 ? '+' : ''}{stats.coinChange.toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* 左側：代幣選擇器 */}
          <div className="xl:col-span-1">
            <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">選擇代幣</h3>
              </div>
              
              <div className="space-y-3">
                {coinGroups.map((coin) => {
                  const isSelected = selectedCoin === coin.symbol;
                  const supplyAnalysis = calculateSupplyAnalysis(coin.coin_id, holdingsData);
                  
                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => setSelectedCoin(coin.symbol)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                        isSelected
                          ? 'bg-gray-700/80 border-gray-600/80 shadow-lg transform scale-[1.02]' 
                          : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-700/60 hover:border-gray-600/60 hover:transform hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <TokenLogo 
                            symbol={coin.symbol} 
                            coinId={coin.coin_id}
                            size="md"
                            fallbackColor={coin.color}
                            className={isSelected ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-gray-800' : ''}
                          />
                          <div>
                            <div className={`font-bold text-base transition-colors ${
                              isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'
                            }`}>
                              {coin.symbol}
                            </div>
                            <div className="text-xs text-gray-400">{coin.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-md text-xs font-medium mb-1 ${
                            isSelected 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : 'bg-gray-700/50 text-gray-400'
                          }`}>
                            {coin.companies.length}家
                          </div>
                          {supplyAnalysis && (
                            <div className={`text-xs ${getConcentrationColor(supplyAnalysis.concentrationLevel).text}`}>
                              {formatPercentage(supplyAnalysis.holdingPercentage)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 leading-relaxed mb-2">
                        {coin.companies.map(c => c.ticker).join(' • ')}
                      </div>
                      
                      {supplyAnalysis && (
                        <div className="text-xs text-gray-400">
                          <span>{formatNumber(supplyAnalysis.totalHolding)} 持有</span>
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-gray-600/50">
                          <div className="flex items-center gap-2 text-xs text-blue-300">
                            <Activity className="w-3 h-3" />
                            <span>當前分析目標</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右側：分析圖表區域 */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* 概覽統計卡片 */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <TokenLogo 
                          symbol={selectedCoin}
                          coinId={getCurrentCoinGroup()?.coin_id || ''}
                          size="md"
                          fallbackColor={getCurrentCoinGroup()?.color || '#64748B'}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">代幣價格</p>
                        <p className="text-xl font-bold text-white">${stats.coinPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      stats.coinChange >= 0 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {stats.coinChange >= 0 ? '+' : ''}{stats.coinChange.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const supplyAnalysis = getSupplyAnalysis();
                  return supplyAnalysis ? (
                    <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <PieChart className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">供應量佔比</p>
                            <p className={`text-xl font-bold ${getConcentrationColor(supplyAnalysis.concentrationLevel).text}`}>
                              {formatPercentage(supplyAnalysis.holdingPercentage)}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                          supplyAnalysis.holdingPercentage >= 5
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : supplyAnalysis.holdingPercentage >= 1
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {formatPercentage(supplyAnalysis.holdingPercentage)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{formatNumber(supplyAnalysis.totalHolding)} 持有量</p>
                    </div>
                  ) : (
                    <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Target className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">供應量分析</p>
                          <p className="text-xl font-bold text-gray-500">暫無數據</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">追蹤公司</p>
                      <p className="text-xl font-bold text-white">{currentGroup?.companies.length}家</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{coinData.length}週歷史數據</p>
                </div>
              </div>
            )}
            
            {/* 主要圖表區域 */}
            <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-5 h-5 rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-gray-800"
                    style={{ backgroundColor: currentGroup?.color || '#64748B' }}
                  ></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {currentGroup?.name} ({selectedCoin}) 生態追蹤
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {currentGroup?.companies.length}家公司持有 • {coinData.length}週數據趨勢
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 持有公司指標和供應量分析 */}
              <div className="mb-6 p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-300 font-medium">持有 {selectedCoin} 的公司組合</div>
                  {(() => {
                    const supplyAnalysis = getSupplyAnalysis();
                    return supplyAnalysis && (
                      <div className="text-xs text-gray-400">
                        合計: <span className={getConcentrationColor(supplyAnalysis.concentrationLevel).text}>
                          {formatNumber(supplyAnalysis.totalHolding)} ({formatPercentage(supplyAnalysis.holdingPercentage)})
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentGroup?.companies.map((company, index) => {
                    const latestCompanyData = stats ? coinData[coinData.length - 1]?.companies[company.ticker] : null;
                    const holdingData = holdingsData[company.ticker];
                    const latestWeekData = coinData[coinData.length - 1];
                    const isExpanded = expandedVerification === company.ticker;
                    
                    return (
                      <div key={company.ticker} className="bg-gray-800/40 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: stockColors[index] || '#64748B' }}
                            ></div>
                            <div>
                              <span className="text-sm font-semibold text-white">{company.ticker}</span>
                              <p className="text-xs text-gray-400">{company.name}</p>
                              {holdingData && (
                                <p className="text-xs text-gray-500 mt-1">
                                  持有: {formatNumber(holdingData.holding_qty)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {latestCompanyData && (
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${
                                  latestCompanyData.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {latestCompanyData.change >= 0 ? '+' : ''}{latestCompanyData.change.toFixed(2)}%
                                </p>
                                <p className="text-xs text-gray-500">${latestCompanyData.price.toFixed(2)}</p>
                              </div>
                            )}
                            <button
                              onClick={() => setExpandedVerification(isExpanded ? null : company.ticker)}
                              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 bg-blue-500/10 rounded border border-blue-500/20 transition-colors"
                            >
                              {isExpanded ? '隱藏' : '驗證'}
                            </button>
                          </div>
                        </div>
                        
                        {isExpanded && latestWeekData && latestCompanyData && (
                          <div className="px-3 pb-3">
                            <DataVerificationLink
                              ticker={company.ticker}
                              date={latestWeekData.date}
                              stockPrice={latestCompanyData.price}
                              coinSymbol={selectedCoin}
                              coinPrice={latestWeekData.coinPrice}
                              coinId={currentGroup?.coin_id}
                              holdingQty={holdingData?.holding_qty}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-[28rem] mb-6">
                {coinData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={coinData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <defs>
                        <linearGradient id="coinGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={currentGroup?.color || '#64748B'} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={currentGroup?.color || '#64748B'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#374151" 
                        strokeOpacity={0.3}
                      />
                      
                      <XAxis 
                        dataKey="week" 
                        stroke="#9CA3AF"
                        fontSize={11}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fill: '#9CA3AF' }}
                      />
                      
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={11}
                        tickFormatter={(value) => `${value.toFixed(0)}%`}
                        tick={{ fill: '#9CA3AF' }}
                      />
                      
                      <Tooltip content={<CustomTooltip />} />
                      
                      <Legend 
                        wrapperStyle={{ 
                          color: '#9CA3AF',
                          paddingTop: '20px',
                          fontSize: '13px'
                        }}
                        iconType="line"
                        formatter={(value) => (
                          <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{value}</span>
                        )}
                      />
                      
                      {/* 基準線 */}
                      <ReferenceLine 
                        y={0} 
                        stroke="#6B7280" 
                        strokeDasharray="3 3" 
                        strokeOpacity={0.6}
                      />
                      
                      {/* 底層代幣價格線 - 主要實線加陰影 */}
                      <Line 
                        type="monotone" 
                        dataKey="coinChange" 
                        stroke={currentGroup?.color || '#64748B'} 
                        strokeWidth={4}
                        fill="url(#coinGradient)"
                        dot={{ 
                          fill: currentGroup?.color || '#64748B', 
                          strokeWidth: 3, 
                          r: 6, 
                          stroke: '#1F2937'
                        }}
                        activeDot={{ 
                          r: 8, 
                          stroke: currentGroup?.color || '#64748B', 
                          strokeWidth: 3,
                          fill: '#1F2937'
                        }}
                        name={`${selectedCoin} 幣價變化%`}
                      />
                      
                      {/* 各公司股價線 - 細線帶陰影效果 */}
                      {currentGroup?.companies.map((company, index) => (
                        <Line 
                          key={company.ticker}
                          type="monotone" 
                          dataKey={`companies.${company.ticker}.change`}
                          stroke={stockColors[index] || '#64748B'} 
                          strokeWidth={3}
                          strokeDasharray="8 4"
                          dot={{ 
                            fill: stockColors[index] || '#64748B', 
                            strokeWidth: 2, 
                            r: 4,
                            stroke: '#1F2937'
                          }}
                          activeDot={{ 
                            r: 6, 
                            stroke: stockColors[index] || '#64748B', 
                            strokeWidth: 2,
                            fill: '#1F2937'
                          }}
                          name={`${company.ticker} 股價變化%`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-10 h-10 text-gray-500" />
                      </div>
                      <p className="text-lg font-semibold mb-2">暫無{selectedCoin}數據</p>
                      <p className="text-sm text-gray-500">請選擇其他底層代幣或稍後重試</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 圖例說明 */}
              <div className="flex justify-center gap-6 text-sm flex-wrap mt-4 pt-4 border-t border-gray-600/30">
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-700/30 rounded-lg">
                  <div 
                    className="w-5 h-1 rounded-full"
                    style={{ backgroundColor: currentGroup?.color || '#64748B' }}
                  ></div>
                  <span className="text-gray-200 font-medium">{selectedCoin} 底層代幣</span>
                </div>
                {currentGroup?.companies.map((company, index) => (
                  <div key={company.ticker} className="flex items-center gap-3 px-3 py-2 bg-gray-700/30 rounded-lg">
                    <div 
                      className="w-5 h-1 rounded-full opacity-80"
                      style={{
                        backgroundColor: stockColors[index] || '#64748B',
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                      }}
                    ></div>
                    <span className="text-gray-200 font-medium">{company.ticker}</span>
                    <span className="text-gray-400 text-xs">({company.name})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}