'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SOLData {
  week: string;
  date: string;
  SOL_price: number;
  SOL_change: number;
  DFDV_price: number;
  DFDV_change: number;
  UPXI_price: number;
  UPXI_change: number;
}

export default function SOLSectorView() {
  const [solData, setSolData] = useState<SOLData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSOLData() {
      try {
        setLoading(true);
        const response = await fetch('/data/complete_historical_baseline.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform data for SOL sector
        const transformedData: SOLData[] = [];
        
        // 格式化週期顯示 - 使用與 LagAnalysisDashboard 相同的邏輯
        const formatWeekRange = (date: string) => {
          if (!date || typeof date !== 'string') return 'Invalid Date';
          
          try {
            // baseline_date 是週五收盤日，往前推7天得到上週五作為週期起始
            const friday = new Date(date + 'T00:00:00.000Z');
            const startDate = new Date(friday);
            startDate.setUTCDate(friday.getUTCDate() - 7); // 往前7天到上週五
            
            const formatDate = (date: Date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
            return `${formatDate(startDate)} ~ ${formatDate(friday)}`;
          } catch (error) {
            console.error('Error formatting date range:', error);
            return 'Invalid Date';
          }
        };
        
        const sortedWeeks = Object.keys(data.data).sort((a, b) => {
          const weekA = parseInt(a.split('-W')[1]);
          const weekB = parseInt(b.split('-W')[1]);
          return weekA - weekB;
        });

        let previousSOL = 0;
        let previousDFDV = 0;
        let previousUPXI = 0;

        sortedWeeks.forEach((week, index) => {
          const weekData = data.data[week];
          const dfdvData = weekData.companies.DFDV;
          const upxiData = weekData.companies.UPXI;
          
          if (dfdvData && upxiData) {
            const solPrice = dfdvData.coin_price;
            const dfdvPrice = dfdvData.stock_price;
            const upxiPrice = upxiData.stock_price;

            // Calculate percentage changes
            const solChange = index > 0 ? ((solPrice - previousSOL) / previousSOL) * 100 : 0;
            const dfdvChange = index > 0 ? ((dfdvPrice - previousDFDV) / previousDFDV) * 100 : 0;
            const upxiChange = index > 0 ? ((upxiPrice - previousUPXI) / previousUPXI) * 100 : 0;

            transformedData.push({
              week: formatWeekRange(weekData.baseline_date), // 使用正確的週期格式
              date: weekData.baseline_date,
              SOL_price: solPrice,
              SOL_change: solChange,
              DFDV_price: dfdvPrice,
              DFDV_change: dfdvChange,
              UPXI_price: upxiPrice,
              UPXI_change: upxiChange
            });

            previousSOL = solPrice;
            previousDFDV = dfdvPrice;
            previousUPXI = upxiPrice;
          }
        });

        setSolData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSOLData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
          <p className="text-slate-200 font-semibold mb-2">{`週 ${label} (${data.date})`}</p>
          <div className="space-y-1">
            <p className="text-green-400 text-sm">
              SOL: {data.SOL_change >= 0 ? '+' : ''}{data.SOL_change.toFixed(2)}% 
              (${data.SOL_price.toFixed(2)})
            </p>
            <p className="text-emerald-400 text-sm">
              DFDV: {data.DFDV_change >= 0 ? '+' : ''}{data.DFDV_change.toFixed(2)}%
              (${data.DFDV_price.toFixed(2)})
            </p>
            <p className="text-cyan-400 text-sm">
              UPXI: {data.UPXI_change >= 0 ? '+' : ''}{data.UPXI_change.toFixed(2)}%
              (${data.UPXI_price.toFixed(2)})
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">🔗 SOL 版塊分析</h2>
        <div className="flex items-center justify-center h-64 text-slate-400">
          <p className="animate-pulse">載入 SOL 版塊數據中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">🔗 SOL 版塊分析</h2>
        <div className="flex items-center justify-center h-64 text-red-400">
          <p>載入失敗: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">🔗 SOL 版塊三線分析</h2>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-slate-400 space-x-4">
            <span className="text-green-400">● SOL (底層代幣)</span>
            <span className="text-emerald-400">● DFDV (DeFi Development)</span>
            <span className="text-cyan-400">● UPXI (UPXI Corp)</span>
          </div>
          <p className="text-xs text-slate-500">
            週變化% • 共 {solData.length} 週數據
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={solData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  color: '#9CA3AF',
                  fontSize: '14px'
                }}
                iconType="line"
                formatter={(value) => (
                  <span style={{ color: '#9CA3AF' }}>{value}</span>
                )}
              />
              
              {/* SOL 底層代幣線 */}
              <Line
                type="monotone"
                dataKey="SOL_change"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="SOL 幣價變化%"
                connectNulls={false}
              />
              
              {/* DFDV 股價線 */}
              <Line
                type="monotone"
                dataKey="DFDV_change"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#059669', strokeWidth: 2, r: 3 }}
                name="DFDV 股價變化%"
                connectNulls={false}
              />
              
              {/* UPXI 股價線 */}
              <Line
                type="monotone"
                dataKey="UPXI_change"
                stroke="#06B6D4"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#06B6D4', strokeWidth: 2, r: 3 }}
                name="UPXI 股價變化%"
                connectNulls={false}
              />
              
              {/* 零軸參考線 */}
              <Line
                type="monotone"
                dataKey={() => 0}
                stroke="#6B7280"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                name="零軸"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}