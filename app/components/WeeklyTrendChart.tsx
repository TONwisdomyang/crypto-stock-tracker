'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockData } from '../types';

interface WeeklyTrendChartProps {
  data: StockData[];
}

// Generate mock weekly percentage change data for correlation analysis
const generateCorrelationData = (currentData: StockData[]) => {
  const weeks = ['W28', 'W29', 'W30', 'W31', 'W32'];
  
  return weeks.map((week) => {
    const weekData: { [key: string]: number | string } = { week: week.replace('W', '') };
    
    // Generate mock weekly changes that show some correlation patterns
    const marketTrend = (Math.random() - 0.5) * 0.15; // Overall market trend
    
    currentData.forEach(company => {
      // Stock change - influenced by coin change + some stock-specific factors
      const stockSpecificFactor = (Math.random() - 0.5) * 0.08;
      const correlationStrength = 0.6; // How much stock follows coin
      
      // Coin change - more volatile
      const coinChange = marketTrend + (Math.random() - 0.5) * 0.12;
      
      // Stock change - partially follows coin change
      const stockChange = (coinChange * correlationStrength) + stockSpecificFactor;
      
      weekData[`${company.ticker}_stock_change`] = Number(stockChange.toFixed(2));
      
      // Group coins to avoid duplication
      if (!weekData[`${company.coin}_change`]) {
        weekData[`${company.coin}_change`] = Number(coinChange.toFixed(2));
      }
    });
    
    return weekData;
  });
};

export default function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  // Error handling for empty or invalid data
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-lg font-semibold text-slate-100">📊 股價與幣價相關性分析</h2>
        <div className="flex items-center justify-center h-32 text-slate-400">
          <p>暫無足夠數據進行相關性分析</p>
        </div>
      </div>
    );
  }

  let correlationData;
  let uniqueCoins: string[] = [];
  
  try {
    correlationData = generateCorrelationData(data);
    uniqueCoins = [...new Set(data.map(item => item.coin).filter(coin => coin))];
  } catch (error) {
    console.error('Error generating correlation data:', error);
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 p-6">
        <h2 className="text-lg font-semibold text-slate-100">📊 股價與幣價相關性分析</h2>
        <div className="flex items-center justify-center h-32 text-red-400">
          <p>數據處理錯誤，請稍後重試</p>
        </div>
      </div>
    );
  }
  
  // Color palette - crypto vs stock differentiation
  const cryptoColors = {
    BTC: '#F59E0B',
    ETH: '#8B5CF6', 
    BNB: '#EAB308',
    SOL: '#10B981',
    TRON: '#EF4444',
    HYPD: '#EC4899',
    TON: '#3B82F6'
  };
  
  const stockColors = {
    MSTR: '#F97316', // Slightly different orange for BTC stocks
    SBET: '#A855F7', // Slightly different purple for ETH stocks
    VAPE: '#F59E0B', 
    DFDV: '#059669',
    TRON: '#DC2626',
    HYPE: '#DB2777',
    VERB: '#2563EB'
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-200 font-semibold mb-2">{`週期: 2025-W${label}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}%`}
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
        <h2 className="text-lg font-semibold text-slate-100">📊 股價與幣價相關性分析</h2>
        <p className="text-sm text-slate-400 mt-1">
          <span className="text-orange-400">實線 = 加密幣變化%</span> vs <span className="text-blue-400">虛線 = 股價變化%</span>
        </p>
      </div>
      
      {/* Correlation Analysis Chart */}
      <div className="p-6">
        <h3 className="text-md font-medium text-slate-200 mb-4">週變化率相關性對比</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="week" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `W${value}`}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
                domain={['dataMin - 2', 'dataMax + 2']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF' }}
                iconType="line"
              />
              
              {/* 加密幣變化線 - 實線 */}
              {uniqueCoins.map((coin) => (
                <Line
                  key={`${coin}_crypto`}
                  type="monotone"
                  dataKey={`${coin}_change`}
                  stroke={cryptoColors[coin as keyof typeof cryptoColors] || '#6B7280'}
                  strokeWidth={3}
                  dot={{ fill: cryptoColors[coin as keyof typeof cryptoColors] || '#6B7280', strokeWidth: 2, r: 5 }}
                  name={`🪙 ${coin}`}
                />
              ))}
              
              {/* 股價變化線 - 虛線 */}
              {data.map((company) => (
                <Line
                  key={`${company.ticker}_stock`}
                  type="monotone"
                  dataKey={`${company.ticker}_stock_change`}
                  stroke={stockColors[company.ticker as keyof typeof stockColors] || '#6B7280'}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ fill: stockColors[company.ticker as keyof typeof stockColors] || '#6B7280', strokeWidth: 2, r: 4 }}
                  name={`📈 ${company.ticker}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-750 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-2">
              <strong className="text-slate-300">📈 分析重點:</strong> 觀察實線(幣價)與虛線(股價)的同步性
            </p>
            <p className="text-xs text-slate-500">
              • 同漲同跌 = 強相關性 • 反向走勢 = 負相關 • 無規律 = 無相關
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">
              <span className="inline-block w-4 h-px bg-orange-400 mr-1"></span>加密幣
            </div>
            <div className="text-xs text-slate-400 mt-1">
              <span className="inline-block w-4 h-px border-t-2 border-dashed border-blue-400 mr-1"></span>股價
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}