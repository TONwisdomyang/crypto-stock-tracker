#!/usr/bin/env python3

import json
import yfinance as yf
from datetime import datetime, timedelta
from pathlib import Path

def add_btc_companies_to_historical():
    """為新的 BTC 公司添加歷史數據"""
    
    print("正在為 MARA 和 CEP 添加歷史數據...")
    
    # 新公司資訊
    new_companies = {
        "MARA": {
            "company_name": "MARA Holdings Inc",
            "coin": "BTC",
            "coin_id": "bitcoin"
        },
        "CEP": {
            "company_name": "XXI Century Capital Corp", 
            "coin": "BTC",
            "coin_id": "bitcoin"
        }
    }
    
    # 讀取現有數據
    data_file = Path("public/data/complete_historical_baseline.json")
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 週期日期映射
    week_dates = {
        "2025-W29": "2025-07-18",
        "2025-W30": "2025-07-25",
        "2025-W31": "2025-08-01",
        "2025-W32": "2025-08-08",
        "2025-W33": "2025-08-15"
    }
    
    # 為每個公司獲取歷史數據
    for ticker, info in new_companies.items():
        print(f"\n處理 {ticker} ({info['company_name']})...")
        
        try:
            stock = yf.Ticker(ticker)
            
            # 獲取歷史數據
            end_date = datetime.now()
            start_date = end_date - timedelta(days=60)
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                print(f"  無法獲取 {ticker} 的歷史數據")
                continue
            
            # 為每週添加數據
            for week_key, week_date in week_dates.items():
                if week_key not in data['data']:
                    continue
                
                target_date = datetime.strptime(week_date, '%Y-%m-%d')
                
                # 找最接近的交易日
                closest_price = None
                min_diff = float('inf')
                
                for date, row in hist.iterrows():
                    date_diff = abs((date.to_pydatetime().date() - target_date.date()).days)
                    if date_diff < min_diff:
                        min_diff = date_diff
                        closest_price = row['Close']
                
                if closest_price is not None:
                    # 獲取該週的 BTC 價格（從 MSTR 數據中獲取）
                    btc_price = data['data'][week_key]['companies']['MSTR']['coin_price']
                    
                    # 添加新公司數據
                    data['data'][week_key]['companies'][ticker] = {
                        "company_name": info['company_name'],
                        "ticker_used": ticker,
                        "stock_price": round(closest_price, 2),
                        "coin": "BTC",
                        "coin_price": btc_price,
                        "coin_id": "bitcoin"
                    }
                    
                    print(f"  ✓ 添加 {week_key}: ${closest_price:.2f}")
                
        except Exception as e:
            print(f"  ✗ 處理 {ticker} 時出錯: {e}")
    
    # 保存更新的數據
    with open(data_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ 歷史數據更新完成！")
    print("現在 BTC 生態包含三家公司：")
    print("  1. MSTR (MicroStrategy)")
    print("  2. MARA (MARA Holdings)")  
    print("  3. CEP (XXI Century Capital)")

if __name__ == "__main__":
    add_btc_companies_to_historical()