import { StockData } from '../types';

interface DataTableProps {
  data: StockData[];
}

export default function DataTable({ data }: DataTableProps) {
  const formatPercentage = (value: number) => {
    // 防護措施：檢查數值有效性
    if (!isFinite(value)) {
      return '0.0%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    // 防護措施：檢查數值有效性
    if (!isFinite(value)) {
      return '$0.00';
    }
    
    // 根據數值大小調整精度
    const absValue = Math.abs(value);
    let maximumFractionDigits = 2;
    
    if (absValue >= 10000) {
      maximumFractionDigits = 0;  // 大於 10K 不顯示小數
    } else if (absValue >= 100) {
      maximumFractionDigits = 2;  // 100-10K 顯示 2 位小數
    } else if (absValue >= 1) {
      maximumFractionDigits = 3;  // 1-100 顯示 3 位小數
    } else {
      maximumFractionDigits = 4;  // 小於 1 顯示 4 位小數
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Math.min(2, maximumFractionDigits),
      maximumFractionDigits: Math.min(maximumFractionDigits, 20), // 確保不超過 API 限制
    }).format(value);
  };


  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 mb-8 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">📊 主要數據 - 即時追蹤</h2>
          <div className="text-xs text-slate-400">
            更新時間: {new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-2">
          觀察股價與加密幣價格的因果關係分析 • 基準時間：每週一 08:00 (UTC+8)
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-750">
            <tr className="text-slate-400 text-sm">
              <th className="text-left py-3 px-6 font-medium">公司</th>
              <th className="text-right py-3 px-4 font-medium">股價</th>
              <th className="text-right py-3 px-4 font-medium">股價變化%</th>
              <th className="text-center py-3 px-4 font-medium">加密幣</th>
              <th className="text-right py-3 px-4 font-medium">幣價</th>
              <th className="text-right py-3 px-6 font-medium">幣價變化%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.map((item, index) => (
              <tr 
                key={item.ticker} 
                className={`hover:bg-slate-750 transition-colors cursor-pointer group border-l-4 ${
                  item.stock_pct_change >= 0 
                    ? 'border-l-emerald-500 hover:border-l-emerald-400' 
                    : 'border-l-red-500 hover:border-l-red-400'
                } ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-850'}`}
              >
                <td className="py-4 px-6">
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {item.ticker}
                    </div>
                    <div className="text-sm text-slate-400 truncate max-w-48">
                      {item.company_name}
                    </div>
                  </div>
                </td>
                <td className="text-right py-4 px-4 font-mono text-slate-100">
                  {formatCurrency(item.stock_close)}
                </td>
                <td className={`text-right py-4 px-4 font-mono font-semibold ${getChangeColor(item.stock_pct_change)}`}>
                  {formatPercentage(item.stock_pct_change)}
                </td>
                <td className="text-center py-4 px-4">
                  <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full text-xs font-semibold">
                    {item.coin}
                  </span>
                </td>
                <td className="text-right py-4 px-4 font-mono text-slate-100">
                  {formatCurrency(item.coin_close)}
                </td>
                <td className={`text-right py-4 px-6 font-mono font-semibold ${getChangeColor(item.coin_pct_change)}`}>
                  {formatPercentage(item.coin_pct_change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}