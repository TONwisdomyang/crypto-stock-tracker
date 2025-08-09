'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CorrelationDataItem {
  ticker: string;
  analysis_period: string;
  data_points: number;
  pearson_correlation: {
    value: number;
    p_value: number;
    significance: string;
    strength: string;
  };
  rolling_correlation: {
    values: number[];
    average: number;
    trend: string;
  };
  lag_analysis: {
    correlations: Array<{
      lag_weeks: number;
      correlation: number;
    }>;
    best_lag: {
      lag_weeks: number;
      correlation: number;
    };
    interpretation: string;
  };
  beta_coefficient: {
    value: number;
    interpretation: string;
  };
  volatility_analysis: {
    stock_volatility: number;
    crypto_volatility: number;
    ratio: number;
    interpretation: string;
  };
  decoupling_analysis: {
    total_events: number;
    frequency: number;
    events: Array<{
      date: string;
      stock_change: number;
      crypto_change: number;
      type: string;
    }>;
    risk_level: string;
  };
  investment_insight: string;
}

interface CorrelationData {
  [ticker: string]: any;
}

export default function CorrelationInsights() {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string>('');

  useEffect(() => {
    const loadCorrelationData = async () => {
      try {
        const response = await fetch('/data/correlation_analysis.json');
        if (response.ok) {
          const data = await response.json();
          setCorrelationData(data);
          
          // 設置默認選中的股票（選擇最穩定的）
          if (data.summary && data.summary.market_stability.most_stable) {
            setSelectedTicker(data.summary.market_stability.most_stable);
          } else {
            // 如果沒有summary，選擇第一個非summary的key
            const tickers = Object.keys(data).filter(key => key !== 'summary');
            if (tickers.length > 0) {
              setSelectedTicker(tickers[0]);
            }
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">🧠 AI 深度相關性分析</h2>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <p>正在加載深度分析數據...</p>
        </div>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">🧠 AI 深度相關性分析</h2>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <p className="mb-2">暫無分析數據</p>
            <p className="text-xs">請運行 python analysis_engine.py 生成分析結果</p>
          </div>
        </div>
      </div>
    );
  }

  const tickers = Object.keys(correlationData).filter(key => key !== 'summary');
  const selectedData = selectedTicker ? correlationData[selectedTicker] : null;

  // 準備相關性強度圖表數據
  const correlationChartData = tickers.map(ticker => ({
    ticker,
    correlation: correlationData[ticker]?.pearson_correlation?.value || 0,
    beta: correlationData[ticker]?.beta_coefficient?.value || 0,
    risk_level: correlationData[ticker]?.decoupling_analysis?.risk_level || '未知'
  }));

  const getCorrelationColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.7) return '#10B981'; // 強相關 - 綠色
    if (abs >= 0.5) return '#F59E0B'; // 中等相關 - 橙色  
    if (abs >= 0.3) return '#EF4444'; // 弱相關 - 紅色
    return '#6B7280'; // 幾乎無關 - 灰色
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case '極低風險': return '#10B981';
      case '低風險': return '#84CC16';
      case '中風險': return '#F59E0B';
      case '高風險': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="space-y-6">
      {/* 市場總覽 */}
      {correlationData.summary && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">📊 市場相關性總覽</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-750 rounded-lg p-4">
              <h3 className="text-slate-300 font-medium mb-2">平均相關性</h3>
              <div className="text-2xl font-bold text-emerald-400">
                {correlationData.summary.market_correlation.average.toFixed(3)}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {correlationData.summary.market_correlation.interpretation}
              </p>
            </div>
            
            <div className="bg-slate-750 rounded-lg p-4">
              <h3 className="text-slate-300 font-medium mb-2">最穩定股票對</h3>
              <div className="text-2xl font-bold text-blue-400">
                {correlationData.summary.market_stability.most_stable}
              </div>
              <p className="text-sm text-slate-400 mt-1">脫鉤風險最低</p>
            </div>
            
            <div className="bg-slate-750 rounded-lg p-4">
              <h3 className="text-slate-300 font-medium mb-2">最活躍股票對</h3>
              <div className="text-2xl font-bold text-orange-400">
                {correlationData.summary.market_stability.most_volatile}
              </div>
              <p className="text-sm text-slate-400 mt-1">交易機會較多</p>
            </div>
          </div>

          <div className="bg-slate-750 rounded-lg p-4">
            <h3 className="text-slate-300 font-medium mb-3">🎯 AI 投資建議</h3>
            <div className="space-y-2">
              {correlationData.summary.investment_recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">•</span>
                  <span className="text-slate-300 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 相關性強度對比圖表 */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">📈 股票對相關性對比</h2>
        
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={correlationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="ticker" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                domain={[-1, 1]}
                tickFormatter={(value) => `${value.toFixed(1)}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#F1F5F9'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(4)}`,
                  name === 'correlation' ? '皮爾遜相關係數' : '貝塔係數'
                ]}
              />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
              />
              <Bar 
                dataKey="correlation" 
                fill="#3B82F6"
                name="相關性"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#10B981'}}></div>
            <span className="text-slate-400">強相關 (≥0.7)</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#F59E0B'}}></div>
            <span className="text-slate-400">中等相關 (0.5-0.7)</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#EF4444'}}></div>
            <span className="text-slate-400">弱相關 (0.3-0.5)</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#6B7280'}}></div>
            <span className="text-slate-400">幾乎無關 (&lt;0.3)</span>
          </span>
        </div>
      </div>

      {/* 詳細分析 */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-100">🔍 詳細統計分析</h2>
          
          <select 
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm"
          >
            {tickers.map(ticker => (
              <option key={ticker} value={ticker}>{ticker}</option>
            ))}
          </select>
        </div>

        {selectedData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基本統計信息 */}
            <div className="space-y-4">
              <div className="bg-slate-750 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-3">{selectedTicker} 統計概要</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">分析期間</span>
                    <span className="text-slate-200 text-sm">{selectedData.analysis_period}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">數據點數</span>
                    <span className="text-slate-200">{selectedData.data_points} 週</span>
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">相關係數</span>
                      <span 
                        className="font-mono font-bold text-lg"
                        style={{ color: getCorrelationColor(selectedData.pearson_correlation.value) }}
                      >
                        {selectedData.pearson_correlation.value.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {selectedData.pearson_correlation.strength} • {selectedData.pearson_correlation.significance}
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">貝塔係數</span>
                      <span className="text-slate-200 font-mono">
                        {selectedData.beta_coefficient.value.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {selectedData.beta_coefficient.interpretation}
                    </div>
                  </div>

                  <div className="border-t border-slate-600 pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">滯後關係</span>
                      <span className="text-slate-200 text-sm">
                        {selectedData.lag_analysis.interpretation}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      最強相關滯後: {selectedData.lag_analysis.best_lag.lag_weeks}週
                    </div>
                  </div>
                </div>
              </div>

              {/* 脫鉤風險分析 */}
              <div className="bg-slate-750 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-3">脫鉤風險評估</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">風險等級</span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{ 
                        backgroundColor: getRiskColor(selectedData.decoupling_analysis.risk_level),
                        color: 'white'
                      }}
                    >
                      {selectedData.decoupling_analysis.risk_level}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">脫鉤事件</span>
                    <span className="text-slate-200">
                      {selectedData.decoupling_analysis.total_events} 次
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">脫鉤頻率</span>
                    <span className="text-slate-200">
                      {(selectedData.decoupling_analysis.frequency * 100).toFixed(1)}%
                    </span>
                  </div>

                  {selectedData.decoupling_analysis.events.length > 0 && (
                    <div className="border-t border-slate-600 pt-3">
                      <div className="text-sm text-slate-400 mb-2">最近脫鉤事件:</div>
                      <div className="space-y-1 text-xs">
                        {selectedData.decoupling_analysis.events.slice(-3).map((event, index) => (
                          <div key={index} className="bg-slate-800 rounded p-2">
                            <div className="text-slate-300">{event.date}</div>
                            <div className="text-slate-400">
                              股價: {event.stock_change > 0 ? '+' : ''}{event.stock_change}% • 
                              幣價: {event.crypto_change > 0 ? '+' : ''}{event.crypto_change}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 波動率分析和投資洞察 */}
            <div className="space-y-4">
              <div className="bg-slate-750 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-3">波動率分析</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">股價波動率</span>
                    <span className="text-slate-200 font-mono">
                      {selectedData.volatility_analysis.stock_volatility.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">幣價波動率</span>
                    <span className="text-slate-200 font-mono">
                      {selectedData.volatility_analysis.crypto_volatility.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">波動率比例</span>
                    <span className="text-slate-200 font-mono">
                      {selectedData.volatility_analysis.ratio.toFixed(4)}
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <div className="text-sm text-slate-500">
                      {selectedData.volatility_analysis.interpretation}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-750 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-3">🎯 AI 投資洞察</h3>
                <div className="text-sm text-slate-300 leading-relaxed">
                  {selectedData.investment_insight.split(' | ').map((insight, index) => (
                    <div key={index} className="mb-2 flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 滾動相關性趨勢 */}
              <div className="bg-slate-750 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-200 mb-3">相關性趨勢</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">平均滾動相關性</span>
                    <span className="text-slate-200 font-mono">
                      {selectedData.rolling_correlation.average.toFixed(4)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">趨勢</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      selectedData.rolling_correlation.trend === '相關性增強' ? 'bg-green-500/20 text-green-400' :
                      selectedData.rolling_correlation.trend === '相關性減弱' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {selectedData.rolling_correlation.trend}
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-600 pt-3">
                    <div className="text-xs text-slate-500 mb-2">滾動相關性序列:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedData.rolling_correlation.values.map((value, index) => (
                        <span 
                          key={index} 
                          className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-mono"
                        >
                          {value.toFixed(3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}