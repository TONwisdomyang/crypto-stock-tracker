'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDataFetch } from '../utils/useDataFetch';

interface BaselineData {
  collection_date: string;
  baseline_info: string;
  weeks_collected: number;
  data: Array<{
    week_end: string;
    data: Array<{
      ticker: string;
      company_name: string;
      stock_close: number;
      stock_pct_change: number;
      coin: string;
      coin_close: number;
      coin_pct_change: number;
    }>;
  }>;
}

export default function BaselineChart() {
  // Optimized data fetching with extended cache time for historical data
  const { data: baselineData, loading, error, metrics } = useDataFetch<BaselineData>('/data/historical_baseline.json', {
    retry: 2,
    retryDelay: 2000,
    timeout: 15000,
    staleTime: 900000, // 15 minutes cache for historical baseline data
    refetchOnFocus: false, // Historical data is stable
  });

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">📈 週一基準對照圖</h2>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <p className="animate-pulse">載入基準數據中...</p>
            {metrics && (
              <p className="text-xs mt-2">
                {metrics.fromCache ? '從快取載入' : '從網路載入'}
                {metrics.retryCount > 0 && ` • 重試 ${metrics.retryCount} 次`}
              </p>
            )}
            {error && (
              <p className="text-xs text-red-400 mt-2">
                載入失敗：{error.message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!baselineData || !baselineData.data.length) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">📈 週一基準對照圖</h2>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <p className="mb-2">暫無歷史基準數據</p>
            <p className="text-xs">將於每週一 08:00 (UTC+8) 自動收集數據</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for charting
  const chartData = baselineData.data.map(week => {
    const weekNum = week.week_end.split('-').slice(1, 3).join('/');
    const result: { [key: string]: string | number } = { 
      week: weekNum,
      weekEnd: week.week_end
    };

    // Add data for each company
    week.data.forEach(company => {
      result[`${company.ticker}_stock`] = company.stock_pct_change;
      result[`${company.coin}_crypto`] = company.coin_pct_change;
    });

    return result;
  });

  // Get unique companies and coins
  const companies = Array.from(new Set(baselineData.data.flatMap(week => 
    week.data.map(company => company.ticker)
  )));
  
  const coins = Array.from(new Set(baselineData.data.flatMap(week => 
    week.data.map(company => company.coin)
  )));

  // Colors for different assets
  const stockColors: { [key: string]: string } = {
    MSTR: '#F97316',
    SBET: '#A855F7',
    VAPE: '#EAB308',
    DFDV: '#059669',
    TRON: '#DC2626',
    VERB: '#2563EB',
    UPXI: '#06B6D4'
  };

  const cryptoColors: { [key: string]: string } = {
    BTC: '#F59E0B',
    ETH: '#8B5CF6',
    BNB: '#EAB308',
    SOL: '#10B981',
    TRON: '#EF4444',
    TON: '#3B82F6'
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; payload: { [key: string]: string | number } }> }) => {
    if (active && payload && payload.length) {
      const weekData = payload[0].payload;
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
          <p className="text-slate-200 font-semibold mb-2">{`週一基準: ${weekData.weekEnd}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value >= 0 ? '+' : ''}{isFinite(entry.value) ? entry.value.toFixed(2) : '0.00'}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">📈 週一基準對照圖 (UTC+8 08:00)</h2>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-slate-400">
            <span className="text-orange-400">實線 = 加密幣週變化%</span> vs <span className="text-blue-400">虛線 = 股價週變化%</span>
          </p>
          <p className="text-xs text-slate-500">
            收集週數: {baselineData.weeks_collected} • 基準日: 每週一
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="week" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
                iconType="line"
              />
              
              {/* 加密幣變化線 - 實線 */}
              {coins.map(coin => (
                <Line
                  key={`${coin}_crypto`}
                  type="monotone"
                  dataKey={`${coin}_crypto`}
                  stroke={cryptoColors[coin] || '#6B7280'}
                  strokeWidth={3}
                  dot={{ fill: cryptoColors[coin] || '#6B7280', strokeWidth: 2, r: 5 }}
                  name={`🪙 ${coin}`}
                />
              ))}
              
              {/* 股價變化線 - 虛線 */}
              {companies.map(company => (
                <Line
                  key={`${company}_stock`}
                  type="monotone"
                  dataKey={`${company}_stock`}
                  stroke={stockColors[company] || '#6B7280'}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ fill: stockColors[company] || '#6B7280', strokeWidth: 2, r: 4 }}
                  name={`📈 ${company}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-750 rounded-b-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-2">
              <strong className="text-slate-300">📊 基準分析:</strong> 以每週一 08:00 (UTC+8) 為基準點
            </p>
            <p className="text-xs text-slate-500">
              • 同方向變動 = 正相關 • 反方向 = 負相關 • 股價滯後響應 = 延遲相關
            </p>
          </div>
          <div className="text-right">
            <div className="flex justify-end items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-px bg-orange-400"></span>
                <span>加密幣</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-4 h-px border-t-2 border-dashed border-blue-400"></span>
                <span>股價</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              下次更新: 週一 08:00 (UTC+8)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}