#!/usr/bin/env python3

import yfinance as yf
from datetime import datetime, timedelta

print('正在驗證 BMNR 股票代碼...')

# 獲取 BMNR 股票數據
ticker = yf.Ticker('BMNR')

try:
    # 獲取公司基本資訊
    info = ticker.info
    print(f'公司名稱: {info.get("longName", info.get("shortName", "N/A"))}')
    print(f'當前價格: ${info.get("currentPrice", info.get("regularMarketPrice", "N/A"))}')
    print(f'交易所: {info.get("exchange", "N/A")}')
    print(f'貨幣: {info.get("currency", "N/A")}')
    print(f'行業: {info.get("industry", "N/A")}')
    
    market_cap = info.get("marketCap", "N/A")
    if market_cap != "N/A" and isinstance(market_cap, (int, float)):
        market_cap_str = f"${market_cap:,.0f}"
    else:
        market_cap_str = str(market_cap)
    print(f'市值: {market_cap_str}')

    # 獲取最近的交易數據
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    hist = ticker.history(start=start_date, end=end_date)
    
    if not hist.empty:
        latest = hist.iloc[-1]
        print(f'\n最近交易數據:')
        print(f'最新收盤價: ${latest["Close"]:.2f}')
        print(f'交易量: {latest["Volume"]:,.0f}')
        print(f'最新日期: {hist.index[-1].date()}')
        
        # 計算平均交易量
        avg_volume = hist["Volume"].mean()
        print(f'平均交易量: {avg_volume:,.0f}')
        
        # 顯示最近幾天的數據
        print(f'\n最近 {len(hist)} 天交易記錄:')
        for date, row in hist.iterrows():
            print(f'{date.date()}: 收盤=${row["Close"]:.2f}, 成交量={row["Volume"]:,.0f}')
    else:
        print('\n無法獲取最近交易數據')
        
except Exception as e:
    print(f'獲取數據時出錯: {e}')

# 檢查是否適合作為 ETH 生態的公司
print(f'\n分析結果:')
if 'info' in locals() and info:
    company_name = info.get("longName", info.get("shortName", "Unknown"))
    print(f'- 公司名稱: {company_name}')
    
    # 檢查流動性
    if 'avg_volume' in locals() and avg_volume > 1000:
        print(f'- 流動性: 良好 (平均成交量 {avg_volume:,.0f} > 1,000)')
    elif 'avg_volume' in locals():
        print(f'- 流動性: 偏低 (平均成交量 {avg_volume:,.0f} < 1,000)')
    else:
        print(f'- 流動性: 無法確定')
    
    # 建議持有量（示例）
    print(f'- 建議 ETH 持有量: 100,000 - 500,000 (根據公司規模估算)')
    print(f'- 是否適合加入系統: {"是" if avg_volume > 1000 else "需要注意流動性"}')
else:
    print('- 無法獲取完整公司資訊')