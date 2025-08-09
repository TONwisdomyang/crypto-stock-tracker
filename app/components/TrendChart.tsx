'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockData } from '../types';

interface TrendChartProps {
  data: StockData[];
}

export default function TrendChart({ data }: TrendChartProps) {
  // Transform data for chart (this would be weekly data in real implementation)
  const chartData = data.map((item) => ({
    name: item.ticker,
    stockPrice: item.stock_close,
    coinPrice: item.coin_close / 1000, // Scale down for better visualization
    stockChange: item.stock_pct_change,
    coinChange: item.coin_pct_change
  }));

  const formatCurrency = (value: number, isCoin = false) => {
    if (isCoin) {
      return `$${(value * 1000).toLocaleString()}`;
    }
    return `$${value.toLocaleString()}`;
  };


  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8">
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">價格趨勢對比</h2>
        <p className="text-sm text-slate-400 mt-1">股價 vs 加密幣價格 (雙Y軸)</p>
      </div>
      
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                yAxisId="stock"
                orientation="left"
                stroke="#10B981"
                fontSize={12}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yAxisId="coin"
                orientation="right"
                stroke="#F59E0B"
                fontSize={12}
                tickFormatter={(value) => `$${(value * 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Stock Price') {
                    return [formatCurrency(value), name];
                  }
                  if (name === 'Coin Price (÷1000)') {
                    return [formatCurrency(value, true), 'Coin Price'];
                  }
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
              />
              <Line 
                yAxisId="stock"
                type="monotone" 
                dataKey="stockPrice" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="Stock Price"
              />
              <Line 
                yAxisId="coin"
                type="monotone" 
                dataKey="coinPrice" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                name="Coin Price (÷1000)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}