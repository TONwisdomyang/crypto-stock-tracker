interface SummaryCardsProps {
  avgStockChange: number;
  avgCoinChange: number;
  totalHoldings: number;
  correlation: number;
}

export default function SummaryCards({ 
  avgStockChange, 
  avgCoinChange, 
  totalHoldings, 
  correlation 
}: SummaryCardsProps) {
  const formatPercentage = (value: number) => {
    if (!isFinite(value)) {
      return '0.0%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    if (!isFinite(value) || isNaN(value)) {
      return '$0';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2, // Fixed: was Math.min(0, 20) which always returned 0
    }).format(value);
  };

  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* 股票平均漲幅 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl">📈</div>
          <h3 className="text-slate-400 text-sm font-medium">股票平均漲幅</h3>
        </div>
        <p className={`text-2xl font-bold ${getChangeColor(avgStockChange)}`}>
          {formatPercentage(avgStockChange)}
        </p>
      </div>

      {/* 加密幣漲幅 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl">🪙</div>
          <h3 className="text-slate-400 text-sm font-medium">加密幣漲幅</h3>
        </div>
        <p className={`text-2xl font-bold ${getChangeColor(avgCoinChange)}`}>
          {formatPercentage(avgCoinChange)}
        </p>
      </div>

      {/* 總持倉價值 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl">💰</div>
          <h3 className="text-slate-400 text-sm font-medium">總持倉價值</h3>
        </div>
        <p className="text-2xl font-bold text-blue-400">
          {formatCurrency(totalHoldings)}
        </p>
      </div>

      {/* 相關性 */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-xl">📊</div>
          <h3 className="text-slate-400 text-sm font-medium">相關性</h3>
        </div>
        <p className="text-2xl font-bold text-purple-400">
          {isFinite(correlation) ? correlation.toFixed(2) : '0.00'}
        </p>
      </div>
    </div>
  );
}