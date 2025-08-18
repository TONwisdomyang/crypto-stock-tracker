const fs = require('fs');
const path = require('path');

// 讀取實際數據
const dataPath = path.join(__dirname, 'public', 'data', 'complete_historical_baseline.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('=== 數據驗證測試 ===');
console.log('Generated at:', data.generated_at);
console.log('Available weeks:', Object.keys(data.data || {}).sort());

const tickers = ['MSTR', 'BNC', 'SBET', 'DFDV', 'VERB', 'HYPD'];

// 測試每個股票的數據是否不同
tickers.forEach(ticker => {
  console.log(`\n=== ${ticker} 數據分析 ===`);
  
  const tickerWeeks = [];
  Object.keys(data.data || {}).sort().forEach(weekKey => {
    const weekData = data.data[weekKey];
    if (weekData.companies && weekData.companies[ticker]) {
      const company = weekData.companies[ticker];
      tickerWeeks.push({
        week: weekKey,
        date: weekData.baseline_date,
        stockPrice: company.stock_price,
        coinPrice: company.coin_price,
        coin: company.coin,
        change: tickerWeeks.length > 0 ? 
          ((company.stock_price - tickerWeeks[tickerWeeks.length - 1].stockPrice) / tickerWeeks[tickerWeeks.length - 1].stockPrice * 100).toFixed(2) + '%' 
          : '0%'
      });
    }
  });
  
  if (tickerWeeks.length > 0) {
    console.log(`週期數量: ${tickerWeeks.length}`);
    console.log('價格變化趨勢:');
    tickerWeeks.forEach((week, idx) => {
      console.log(`  ${week.week} (${week.date}): 股價=$${week.stockPrice}, ${week.coin}=$${week.coinPrice}, 變化=${week.change}`);
    });
    
    // 計算價格變異度
    const stockPrices = tickerWeeks.map(w => w.stockPrice);
    const minStock = Math.min(...stockPrices);
    const maxStock = Math.max(...stockPrices);
    const stockVariation = ((maxStock - minStock) / minStock * 100).toFixed(2);
    console.log(`股價變異度: ${stockVariation}%`);
    
    const coinPrices = tickerWeeks.map(w => w.coinPrice);
    const minCoin = Math.min(...coinPrices);
    const maxCoin = Math.max(...coinPrices);
    const coinVariation = ((maxCoin - minCoin) / minCoin * 100).toFixed(2);
    console.log(`幣價變異度: ${coinVariation}%`);
  } else {
    console.log('❌ 無數據');
  }
});

console.log('\n=== 股票間差異對比 ===');
const firstWeekKey = Object.keys(data.data || {}).sort()[0];
if (firstWeekKey && data.data[firstWeekKey]) {
  console.log(`使用第一週 ${firstWeekKey} 的數據進行對比:`);
  tickers.forEach(ticker => {
    const company = data.data[firstWeekKey].companies?.[ticker];
    if (company) {
      console.log(`${ticker}: 股價=$${company.stock_price}, ${company.coin}=$${company.coin_price}`);
    }
  });
}