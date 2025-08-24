#!/usr/bin/env python3

import json
import yfinance as yf
from datetime import datetime
from pathlib import Path

def validate_new_companies():
    """快速驗證新添加的公司"""
    
    print("正在驗證新添加的公司...")
    
    # 要驗證的新公司
    new_companies = {
        "MARA": "MARA Holdings Inc", 
        "CEP": "XXI Century Capital Corp"
    }
    
    for ticker, company_name in new_companies.items():
        print(f"\n驗證 {ticker} ({company_name})...")
        
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            if info and 'symbol' in info:
                current_price = info.get('regularMarketPrice', info.get('currentPrice', 0))
                market_cap = info.get('marketCap', 'N/A')
                currency = info.get('currency', 'USD')
                
                print(f"  ✓ 股票代碼有效")
                print(f"  ✓ 當前股價: ${current_price:.2f} {currency}")
                if market_cap != 'N/A':
                    print(f"  ✓ 市值: ${market_cap:,}")
                
                # 獲取最近的歷史數據
                hist = stock.history(period="5d")
                if not hist.empty:
                    print(f"  ✓ 可獲取歷史數據")
                    print(f"  ✓ 最近5日平均成交量: {hist['Volume'].mean():,.0f}")
                else:
                    print(f"  ⚠ 無法獲取歷史數據")
                    
            else:
                print(f"  ❌ 無法獲取 {ticker} 的資訊")
                
        except Exception as e:
            print(f"  ❌ 驗證 {ticker} 時出錯: {e}")
    
    print("\n驗證完成！")

if __name__ == "__main__":
    validate_new_companies()