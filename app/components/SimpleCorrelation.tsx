'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CorrelationData {
  [ticker: string]: {
    ticker: string;
    analysis_period: string;
    data_points: number;
    pearson_correlation: {
      value: number;
      significance: string;
    };
    decoupling_analysis: {
      total_events: number;
      frequency: number;
      events: Array<{
        date: string;
        stock_change: number;
        crypto_change: number;
      }>;
    };
  };
  summary?: {
    market_correlation: {
      average: number;
    };
    market_stability: {
      most_stable: string;
      most_volatile: string;
    };
  };
}

export default function SimpleCorrelation() {
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCorrelationData = async () => {
      try {
        const response = await fetch('/data/correlation_analysis.json');
        if (response.ok) {
          const data = await response.json();
          setCorrelationData(data);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>載入分析數據中...</p>
        </div>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>暫無分析數據</p>
        </div>
      </div>
    );
  }

  const tickers = Object.keys(correlationData).filter(key => key !== 'summary');
  
  // 準備簡潔的相關性數據
  const correlationRows = tickers.map(ticker => ({
    ticker,
    correlation: correlationData[ticker]?.pearson_correlation?.value || 0,
    decoupling_events: correlationData[ticker]?.decoupling_analysis?.total_events || 0,
    decoupling_rate: correlationData[ticker]?.decoupling_analysis?.frequency || 0,
    data_weeks: correlationData[ticker]?.data_points || 0
  })).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  const getCorrelationLabel = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return '高度同步';
    if (abs >= 0.6) return '中度同步';  
    if (abs >= 0.4) return '弱同步';
    return '幾乎無關';
  };

  const getCorrelationColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return 'text-green-600 bg-green-50';
    if (abs >= 0.6) return 'text-blue-600 bg-blue-50';
    if (abs >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getDecouplingColor = (rate: number) => {
    if (rate > 0.3) return 'text-red-600 bg-red-50';
    if (rate > 0.15) return 'text-orange-600 bg-orange-50';
    if (rate > 0.05) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* 簡潔的相關性表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">股價與幣價同步性分析</h2>
          <p className="text-sm text-gray-600 mt-1">
            數值越接近 1.0 表示越同步，越接近 0 表示越獨立
          </p>
        </div>
        
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  股票代號
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  同步性數值
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  同步程度
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  脫鉤次數
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  脫鉤頻率
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  觀察週數
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {correlationRows.map((row) => (
                <tr key={row.ticker} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.ticker}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-mono font-semibold text-gray-900">
                      {row.correlation.toFixed(3)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCorrelationColor(row.correlation)}`}>
                      {getCorrelationLabel(row.correlation)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{row.decoupling_events}次</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDecouplingColor(row.decoupling_rate)}`}>
                      {(row.decoupling_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-500">{row.data_weeks}週</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 簡潔的市場概覽 */}
        {correlationData.summary && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {correlationData.summary.market_correlation.average.toFixed(3)}
                </div>
                <div className="text-gray-600">市場平均同步性</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {correlationData.summary.market_stability.most_stable}
                </div>
                <div className="text-gray-600">最穩定同步</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">
                  {correlationData.summary.market_stability.most_volatile}
                </div>
                <div className="text-gray-600">最常脫鉤</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 簡潔的視覺化圖表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">同步性視覺對比</h3>
        </div>
        
        <div className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={correlationRows}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="ticker" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  domain={[0, 1]}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [value.toFixed(3), '同步性數值']}
                  labelStyle={{ color: '#374151' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="correlation" 
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex justify-center">
            <div className="text-xs text-gray-500 space-x-6">
              <span>• 1.0 = 完全同步</span>
              <span>• 0.8+ = 高度同步</span>
              <span>• 0.6+ = 中度同步</span>
              <span>• 0.4+ = 弱同步</span>
              <span>• 0.4- = 幾乎無關</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}