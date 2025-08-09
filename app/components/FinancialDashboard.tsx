'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface CorrelationData {
  [ticker: string]: any;
}

export default function FinancialDashboard() {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<string>('');

  useEffect(() => {
    const loadCorrelationData = async () => {
      try {
        const response = await fetch('/data/correlation_analysis.json');
        if (response.ok) {
          const data = await response.json();
          setCorrelationData(data);
          
          // 設置默認選中最相關的股票
          const tickers = Object.keys(data).filter(key => key !== 'summary');
          if (tickers.length > 0) {
            const sortedTickers = tickers.sort((a, b) => 
              Math.abs(data[b].pearson_correlation?.value || 0) - 
              Math.abs(data[a].pearson_correlation?.value || 0)
            );
            setSelectedStock(sortedTickers[0]);
          }
        }
      } catch (error) {
        console.error('Error loading correlation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCorrelationData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-lg">載入數據中...</div>
        </div>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="flex items-center justify-center h-96">
          <div className="text-white text-lg">暫無數據</div>
        </div>
      </div>
    );
  }

  const tickers = Object.keys(correlationData).filter(key => key !== 'summary');
  
  // 準備儀表板數據
  const dashboardData = tickers.map(ticker => ({
    ticker,
    correlation: Math.abs(correlationData[ticker]?.pearson_correlation?.value || 0),
    decoupling_events: correlationData[ticker]?.decoupling_analysis?.total_events || 0,
    decoupling_rate: correlationData[ticker]?.decoupling_analysis?.frequency || 0,
    weeks: correlationData[ticker]?.data_points || 0
  })).sort((a, b) => b.correlation - a.correlation);

  // 同步性分佈數據
  const syncDistribution = [
    { name: '高度同步', value: dashboardData.filter(d => d.correlation >= 0.8).length, color: '#10B981' },
    { name: '中度同步', value: dashboardData.filter(d => d.correlation >= 0.6 && d.correlation < 0.8).length, color: '#3B82F6' },
    { name: '弱同步', value: dashboardData.filter(d => d.correlation >= 0.4 && d.correlation < 0.6).length, color: '#F59E0B' },
    { name: '幾乎無關', value: dashboardData.filter(d => d.correlation < 0.4).length, color: '#6B7280' }
  ].filter(d => d.value > 0);

  const selectedData = selectedStock ? correlationData[selectedStock] : null;

  const getSyncLevel = (correlation: number) => {
    if (correlation >= 0.8) return { label: '高度同步', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    if (correlation >= 0.6) return { label: '中度同步', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (correlation >= 0.4) return { label: '弱同步', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
    return { label: '幾乎無關', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
  };

  const getRiskLevel = (rate: number) => {
    if (rate > 0.3) return { label: '高風險', color: 'text-red-400', bgColor: 'bg-red-500/20' };
    if (rate > 0.15) return { label: '中風險', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    if (rate > 0.05) return { label: '低風險', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    return { label: '極低風險', color: 'text-green-400', bgColor: 'bg-green-500/20' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* 頂部導航 */}
      <div className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            加密股票同步追蹤器
          </h1>
          <p className="text-slate-300 text-sm mt-1">實時監控股價與加密貨幣價格關聯性</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* 核心指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* 市場概覽 */}
          <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">📊</span>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {correlationData.summary?.market_correlation.average && isFinite(correlationData.summary.market_correlation.average) ? correlationData.summary.market_correlation.average.toFixed(2) : '0.00'}
                </div>
                <div className="text-slate-300 text-sm">市場平均同步性</div>
              </div>
            </div>
          </div>

          {/* 最穩定股票 */}
          <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-700/30 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6 h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">🛡️</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mb-2">
                  {correlationData.summary?.market_stability.most_stable || 'N/A'}
                </div>
                <div className="text-emerald-300 text-sm">最穩定同步</div>
              </div>
            </div>
          </div>

          {/* 最活躍股票 */}
          <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-orange-800/30 to-red-700/30 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6 h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">⚡</span>
                </div>
                <div className="text-2xl font-bold text-orange-400 mb-2">
                  {correlationData.summary?.market_stability.most_volatile || 'N/A'}
                </div>
                <div className="text-orange-300 text-sm">最常脫鉤</div>
              </div>
            </div>
          </div>

          {/* 同步性分佈 */}
          <div className="md:col-span-1">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
              <div className="text-center">
                <div className="text-lg font-semibold text-white mb-4">同步性分佈</div>
                <div className="w-24 h-24 mx-auto mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={syncDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={40}
                        innerRadius={25}
                      >
                        {syncDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-sm text-slate-300">
                  {dashboardData.length} 個配對追蹤中
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主要內容區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 股票選擇和詳細信息 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 股票選擇器 */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">選擇股票</h3>
              <div className="space-y-3">
                {dashboardData.map((stock) => {
                  const sync = getSyncLevel(stock.correlation);
                  const isSelected = selectedStock === stock.ticker;
                  
                  return (
                    <button
                      key={stock.ticker}
                      onClick={() => setSelectedStock(stock.ticker)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25' 
                          : 'bg-slate-700/30 border-white/10 hover:bg-slate-600/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white text-lg">{stock.ticker}</div>
                          <div className={`text-sm ${sync.color}`}>{sync.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-white text-lg">
                            {isFinite(stock.correlation) ? stock.correlation.toFixed(3) : '0.000'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {stock.decoupling_events}次脫鉤
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 選中股票詳細信息 */}
            {selectedData && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">{selectedStock} 詳細數據</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">同步性數值</span>
                    <span className="font-mono text-xl text-white">
                      {isFinite(selectedData.pearson_correlation.value) ? Math.abs(selectedData.pearson_correlation.value).toFixed(3) : '0.000'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">同步程度</span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSyncLevel(Math.abs(selectedData.pearson_correlation.value)).bgColor} ${getSyncLevel(Math.abs(selectedData.pearson_correlation.value)).color}`}>
                      {getSyncLevel(Math.abs(selectedData.pearson_correlation.value)).label}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">脫鉤事件</span>
                    <span className="text-white">{selectedData.decoupling_analysis.total_events} 次</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">脫鉤風險</span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getRiskLevel(selectedData.decoupling_analysis.frequency).bgColor} ${getRiskLevel(selectedData.decoupling_analysis.frequency).color}`}>
                      {getRiskLevel(selectedData.decoupling_analysis.frequency).label}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-300">觀察週數</span>
                    <span className="text-white">{selectedData.data_points} 週</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 圖表區域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 同步性趨勢圖 */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">股票同步性對比</h3>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <XAxis 
                      dataKey="ticker" 
                      stroke="#94A3B8"
                      fontSize={12}
                      tick={{ fill: '#94A3B8' }}
                    />
                    <YAxis 
                      stroke="#94A3B8"
                      fontSize={12}
                      tick={{ fill: '#94A3B8' }}
                      domain={[0, 1]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="correlation" 
                      stroke="url(#gradient)"
                      strokeWidth={4}
                      dot={{ 
                        fill: '#3B82F6', 
                        strokeWidth: 2, 
                        r: 8,
                        filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))'
                      }}
                      activeDot={{ 
                        r: 12, 
                        stroke: '#3B82F6', 
                        strokeWidth: 3,
                        fill: '#1E40AF',
                        filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.6))'
                      }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="bg-slate-700/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-6 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span>0.8+ 高度同步</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>0.6+ 中度同步</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span>0.4+ 弱同步</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 脫鉤事件歷史 */}
            {selectedData && selectedData.decoupling_analysis.events.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {selectedStock} 近期脫鉤事件
                </h3>
                
                <div className="space-y-3">
                  {selectedData.decoupling_analysis.events.slice(-5).reverse().map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-slate-300 text-sm">
                        {event.date}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">股價變化</div>
                          <div className={`font-mono ${event.stock_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {event.stock_change > 0 ? '+' : ''}{isFinite(event.stock_change) ? event.stock_change.toFixed(1) : '0.0'}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">幣價變化</div>
                          <div className={`font-mono ${event.crypto_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {event.crypto_change > 0 ? '+' : ''}{isFinite(event.crypto_change) ? event.crypto_change.toFixed(1) : '0.0'}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}