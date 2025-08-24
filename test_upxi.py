#!/usr/bin/env python3

import yfinance as yf
from datetime import datetime, timedelta

print('正在獲取 UPXI 的最新股價數據...')

# 獲取 UPXI 股票數據
ticker = yf.Ticker('UPXI')

# 獲取最近7天的數據
end_date = datetime.now()
start_date = end_date - timedelta(days=7)

hist = ticker.history(start=start_date, end=end_date)

if not hist.empty:
    latest = hist.iloc[-1]
    print(f'最新收盤價: ${latest["Close"]:.2f}')
    print(f'最新日期: {hist.index[-1].date()}')
    
    # 顯示最近幾天的數據
    print('\n最近幾天數據:')
    for date, row in hist.iterrows():
        print(f'{date.date()}: Close=${row["Close"]:.2f}, Volume={row["Volume"]:,.0f}')
else:
    print('無法獲取 UPXI 歷史數據')

# 獲取公司資訊
try:
    info = ticker.info
    print(f'\n公司名稱: {info.get("longName", "N/A")}')
    print(f'當前價格: ${info.get("currentPrice", "N/A")}')
    print(f'前一日收盤: ${info.get("previousClose", "N/A")}')
    print(f'52週高點: ${info.get("fiftyTwoWeekHigh", "N/A")}')
    print(f'52週低點: ${info.get("fiftyTwoWeekLow", "N/A")}')
except Exception as e:
    print(f'獲取公司資訊時出錯: {e}')