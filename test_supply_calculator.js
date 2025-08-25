// 快速測試供應量計算功能
const { calculateSupplyAnalysis } = require('./app/utils/supplyCalculator.ts');

// 模擬 holdings 數據
const testHoldings = {
  "MSTR": {
    "company_name": "MicroStrategy",
    "coin": "BTC",
    "holding_qty": 629376,
    "coin_id": "bitcoin"
  },
  "MARA": {
    "company_name": "MARA Holdings",
    "coin": "BTC", 
    "holding_qty": 50639,
    "coin_id": "bitcoin"
  }
};

try {
  const result = calculateSupplyAnalysis('bitcoin', testHoldings);
  console.log('BTC Supply Analysis:', result);
} catch (error) {
  console.error('Test failed:', error.message);
}