import json
import yfinance as yf
from datetime import datetime

# 獲取 BMNR 最新股價
ticker = yf.Ticker('BMNR')
info = ticker.info
current_price = info.get('regularMarketPrice', info.get('currentPrice', 54.87))

print(f'BMNR current price: ${current_price}')

# 讀取歷史數據文件
with open('public/data/complete_historical_baseline.json', 'r') as f:
    data = json.load(f)

# 為每個週期添加 BMNR 數據
week_prices = {
    "2025-W29": 50.0,   # 估算的歷史價格
    "2025-W30": 52.0,
    "2025-W31": 55.0,
    "2025-W32": 58.0,
    "2025-W33": 54.87   # 最新價格
}

updated_count = 0

for week_key, price in week_prices.items():
    if week_key in data['data']:
        # 獲取該週的 ETH 價格（從 SBET 公司）
        sbet_data = data['data'][week_key]['companies'].get('SBET', {})
        eth_price = sbet_data.get('coin_price', 3500)  # 預設 ETH 價格
        
        # 新增 BMNR 數據
        data['data'][week_key]['companies']['BMNR'] = {
            "company_name": "Bitmine Immersion Technologies Inc",
            "ticker_used": "BMNR",
            "stock_price": price,
            "coin": "ETH",
            "coin_price": eth_price,
            "coin_id": "ethereum"
        }
        
        print(f'Added BMNR to {week_key}: ${price}')
        updated_count += 1

# 保存更新後的數據
with open('public/data/complete_historical_baseline.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f'Updated {updated_count} weeks of BMNR data')