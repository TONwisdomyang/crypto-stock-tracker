'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import StockDetailPopup from './StockDetailPopup';

interface CorrelationData {
  [ticker: string]: any;
}

export default function CleanDashboard() {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [popupStock, setPopupStock] = useState<string>('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadCorrelationData = async () => {
      try {
        const response = await fetch('/data/correlation_analysis.json');
        if (response.ok) {
          const data = await response.json();
          setCorrelationData(data);
          
          const tickers = Object.keys(data).filter(key => key !== 'summary');
          if (tickers.length > 0) {
            setSelectedStock(tickers[0]);
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
  
  const dashboardData = tickers.map(ticker => ({
    ticker,
    correlation: Math.abs(correlationData[ticker]?.pearson_correlation?.value || 0),
    decoupling_events: correlationData[ticker]?.decoupling_analysis?.total_events || 0,
    decoupling_rate: correlationData[ticker]?.decoupling_analysis?.frequency || 0,
    weeks: correlationData[ticker]?.data_points || 0
  })).sort((a, b) => b.correlation - a.correlation);

  const selectedData = selectedStock ? correlationData[selectedStock] : null;

  const getSyncLevel = (correlation: number) => {
    if (correlation >= 0.8) return { label: '高度同步', color: 'text-emerald-400' };
    if (correlation >= 0.6) return { label: '中度同步', color: 'text-blue-400' };
    if (correlation >= 0.4) return { label: '弱同步', color: 'text-amber-400' };
    return { label: '幾乎無關', color: 'text-gray-400' };
  };

  const getRiskLevel = (rate: number) => {
    if (rate > 0.3) return { label: '高風險', color: 'text-red-400' };
    if (rate > 0.15) return { label: '中風險', color: 'text-orange-400' };
    if (rate > 0.05) return { label: '低風險', color: 'text-yellow-400' };
    return { label: '極低風險', color: 'text-green-400' };
  };

  const handleStockHover = (ticker: string, event: React.MouseEvent) => {
    setPopupPosition({ x: event.clientX, y: event.clientY });
    setPopupStock(ticker);
  };

  const handleStockLeave = () => {
    // 延遲關閉，讓用戶有時間移動到彈窗
    setTimeout(() => setPopupStock(''), 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            加密股票同步追蹤器
          </h1>
          <p className="text-slate-300 text-sm mt-1">客觀分析股價與加密貨幣價格的同步關係</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {correlationData.summary?.market_correlation.average.toFixed(2) || '0.00'}
              </div>
              <div className="text-slate-300 text-sm">市場平均同步性</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-700/30 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-2">
                {correlationData.summary?.market_stability.most_stable || 'N/A'}
              </div>
              <div className="text-emerald-300 text-sm">最穩定同步</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-800/30 to-red-700/30 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400 mb-2">
                {correlationData.summary?.market_stability.most_volatile || 'N/A'}
              </div>
              <div className="text-orange-300 text-sm">最常脫鉤</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">股票選擇</h3>
              <div className="space-y-3">
                {dashboardData.map((stock) => {
                  const sync = getSyncLevel(stock.correlation);
                  const isSelected = selectedStock === stock.ticker;
                  
                  return (
                    <button
                      key={stock.ticker}
                      onClick={() => setSelectedStock(stock.ticker)}
                      onMouseEnter={(e) => handleStockHover(stock.ticker, e)}
                      onMouseLeave={handleStockLeave}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative ${
                        isSelected 
                          ? 'bg-blue-500/20 border-blue-500/50' 
                          : 'bg-slate-700/30 border-white/10 hover:bg-slate-600/40 hover:scale-105'
                      }`}
                      title={`點擊選擇 | 懸停查看詳細對比圖表`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white text-lg">{stock.ticker}</div>
                          <div className={`text-sm ${sync.color}`}>{sync.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-white text-lg">
                            {stock.correlation.toFixed(3)}
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

            {selectedData && (
              <div className="mt-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">{selectedStock} 數據</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">同步性數值</span>
                    <span className="font-mono text-xl text-white">
                      {Math.abs(selectedData.pearson_correlation.value).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">脫鉤事件</span>
                    <span className="text-white">{selectedData.decoupling_analysis.total_events} 次</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300">脫鉤頻率</span>
                    <span className={getRiskLevel(selectedData.decoupling_analysis.frequency).color}>
                      {(selectedData.decoupling_analysis.frequency * 100).toFixed(1)}%
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

          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">同步性對比</h3>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <XAxis 
                      dataKey="ticker" 
                      stroke="#94A3B8"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#94A3B8"
                      fontSize={12}
                      domain={[0, 1]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="correlation" 
                      stroke="#3B82F6"
                      strokeWidth={4}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 8 }}
                      activeDot={{ r: 12, stroke: '#3B82F6', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {selectedData && selectedData.decoupling_analysis.events.length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {selectedStock} 近期脫鉤事件
                </h3>
                
                <div className="space-y-3">
                  {selectedData.decoupling_analysis.events.slice(-5).reverse().map((event: { date: string; stock_change: number; crypto_change: number }, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-slate-300 text-sm">
                        {event.date}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-400">股價變化</div>
                          <div className={`font-mono ${event.stock_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {event.stock_change > 0 ? '+' : ''}{event.stock_change.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">幣價變化</div>
                          <div className={`font-mono ${event.crypto_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {event.crypto_change > 0 ? '+' : ''}{event.crypto_change.toFixed(1)}%
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

      {/* Hover彈出詳細圖表 */}
      <StockDetailPopup
        ticker={popupStock}
        isOpen={!!popupStock}
        onClose={() => setPopupStock('')}
        position={popupPosition}
      />
    </div>
  );
}