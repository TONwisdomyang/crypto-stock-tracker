'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StockDetailPopupProps {
  ticker: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

interface WeeklyData {
  week: string;
  date: string;
  stock_price: number;
  crypto_price: number;
  stock_change: number;
  crypto_change: number;
}

export default function StockDetailPopup({ ticker, isOpen, onClose, position }: StockDetailPopupProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    const abortController = new AbortController();
    
    if (isOpen && ticker) {
      loadWeeklyData(abortController.signal);
    }
    
    return () => {
      abortController.abort();
    };
  }, [isOpen, ticker]);

  const loadWeeklyData = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // 嘗試載入完整歷史數據
      let historicalData = null;
      try {
        const response = await fetch('/data/complete_historical_baseline.json', { signal });
        if (response.ok) {
          historicalData = await response.json();
        }
      } catch (e) {
        console.log('Complete historical data not available, using existing data');
      }

      // 備選：載入現有的歷史數據
      if (!historicalData) {
        const response = await fetch('/data/historical_baseline.json');
        if (response.ok) {
          historicalData = await response.json();
        }
      }

      // 載入公司資訊
      const holdingsResponse = await fetch('/data/holdings.json');
      if (holdingsResponse.ok) {
        const holdings = await holdingsResponse.json();
        setCompanyInfo(holdings[ticker]);
      }

      if (historicalData && historicalData.data) {
        // 處理週數據，專注於選中的股票
        const processedData: WeeklyData[] = [];
        let baselineStockPrice: number | null = null;
        let baselineCryptoPrice: number | null = null;

        // 按週排序
        const sortedWeeks = Object.keys(historicalData.data).sort();

        for (const weekKey of sortedWeeks) {
          const weekData = historicalData.data[weekKey];
          
          if (weekData.companies && weekData.companies[ticker]) {
            const company = weekData.companies[ticker];
            
            // 設置第一週為基準
            if (baselineStockPrice === null) {
              baselineStockPrice = company.stock_price;
              baselineCryptoPrice = company.coin_price;
            }

            // 計算相對於基準的變化百分比
            const stockChange = baselineStockPrice ? 
              ((company.stock_price - baselineStockPrice) / baselineStockPrice) * 100 : 0;
            const cryptoChange = baselineCryptoPrice ? 
              ((company.coin_price - baselineCryptoPrice) / baselineCryptoPrice) * 100 : 0;

            // 計算週末日期 (週日)
            const weekStart = new Date(weekData.baseline_date);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const formatDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
            const weekRange = `${formatDate(weekStart)} ~ ${formatDate(weekEnd)}`;

            processedData.push({
              week: weekRange,
              date: weekData.baseline_date,
              stock_price: company.stock_price,
              crypto_price: company.coin_price,
              stock_change: stockChange,
              crypto_change: cryptoChange
            });
          }
        }

        setWeeklyData(processedData);
      }
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{`週次: ${label}`}</p>
          <p className="text-white text-sm">{`日期: ${data.date}`}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {entry.value > 0 ? '+' : ''}{isFinite(entry.value) ? entry.value.toFixed(2) : '0.00'}%
              </p>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-600 space-y-1 text-xs text-slate-300">
            <p>股價: ${data.stock_price && isFinite(data.stock_price) ? data.stock_price.toFixed(2) : '0.00'}</p>
            <p>幣價: ${data.crypto_price && isFinite(data.crypto_price) ? data.crypto_price.toFixed(2) : '0.00'}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl w-96 max-h-[80vh] overflow-hidden"
      style={{
        left: Math.min(position.x + 10, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 400),
        top: Math.min(position.y + 10, (typeof window !== 'undefined' ? window.innerHeight : 800) - 500),
        maxWidth: '400px'
      }}
      onMouseEnter={() => {}}
      onMouseLeave={() => onClose()}
    >
        {/* 簡潔標題 */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{ticker}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{ticker} vs {companyInfo?.coin}</h2>
              <p className="text-slate-400 text-xs">過去幾週漲幅對比</p>
            </div>
          </div>
        </div>

        {/* 簡化內容區 - 只顯示核心對比圖 */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-white text-sm">載入中...</div>
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <p className="text-sm">暫無 {ticker} 歷史數據</p>
              <p className="text-xs text-slate-500 mt-1">數據收集中</p>
            </div>
          ) : (
            <div>
              {/* 核心對比圖表 */}
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      fontSize={10}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* 股價變化線 - 綠色實線 */}
                    <Line 
                      type="monotone" 
                      dataKey="stock_change" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
                      name={`${ticker} 股價`}
                    />
                    
                    {/* 加密貨幣變化線 - 藍色虛線 */}
                    <Line 
                      type="monotone" 
                      dataKey="crypto_change" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ fill: '#3B82F6', strokeWidth: 1, r: 3 }}
                      name={`${companyInfo?.coin} 幣價`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 簡潔圖例 */}
              <div className="flex justify-center gap-4 text-xs text-slate-300 mb-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-emerald-500"></div>
                  <span>{ticker}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-500 border-dashed border-t"></div>
                  <span>{companyInfo?.coin}</span>
                </div>
              </div>

              {/* 快速統計 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-700/20 rounded p-2 text-center">
                  <div className="text-slate-400">追蹤週數</div>
                  <div className="text-white font-bold">{weeklyData.length}</div>
                </div>
                <div className="bg-slate-700/20 rounded p-2 text-center">
                  <div className="text-slate-400">脫鉤事件</div>
                  <div className="text-white font-bold">
                    {weeklyData.filter(d => Math.abs(d.stock_change - d.crypto_change) > 5).length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}