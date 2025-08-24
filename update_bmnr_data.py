#!/usr/bin/env python3

import json
import yfinance as yf
from datetime import datetime, timedelta
from pathlib import Path

def update_bmnr_historical_data():
    """更新 BMNR 的歷史數據到基準文件中"""
    
    print("開始為 BMNR 獲取歷史股價數據...")
    
    # 獲取 BMNR 股價數據
    ticker = yf.Ticker('BMNR')
    
    # 獲取最近8週的數據
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)  # 約8週數據
    
    hist = ticker.history(start=start_date, end=end_date)
    
    if hist.empty:
        print("❌ 無法獲取 BMNR 數據")
        return False
    
    print(f"✅ 獲取到 BMNR 最新數據：")
    print(f"   最新價格: ${hist.iloc[-1]['Close']:.2f}")
    print(f"   日期: {hist.index[-1].date()}")
    
    # 讀取當前的歷史數據文件
    data_file = Path("public/data/complete_historical_baseline.json")
    
    if not data_file.exists():
        print(f"❌ 數據文件不存在: {data_file}")
        return False
        
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 定義週期到實際日期的映射
    week_dates = {
        "2025-W29": "2025-07-18",  # 7/18 週五
        "2025-W30": "2025-07-25",  # 7/25 週五  
        "2025-W31": "2025-08-01",  # 8/1 週五
        "2025-W32": "2025-08-08",  # 8/8 週五
        "2025-W33": "2025-08-15"   # 8/15 週五
    }
    
    updated_weeks = 0
    
    for week_key, week_info in data['data'].items():
        if week_key not in week_dates:
            continue
            
        target_date_str = week_dates[week_key]
        
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d')
            
            # 在歷史數據中找到最接近的日期
            closest_date = None
            closest_price = None
            min_diff = float('inf')
            
            for date, row in hist.iterrows():
                date_diff = abs((date.to_pydatetime().date() - target_date.date()).days)
                if date_diff < min_diff:
                    min_diff = date_diff
                    closest_date = date
                    closest_price = row['Close']
            
            if closest_price is not None:
                # 新增 BMNR 到該週的數據
                data['data'][week_key]['companies']['BMNR'] = {
                    "company_name": "Bitmine Immersion Technologies Inc",
                    "ticker_used": "BMNR",
                    "stock_price": round(closest_price, 2),
                    "coin": "ETH",
                    "coin_price": week_info['companies']['SBET']['coin_price'],  # 使用 SBET 的 ETH 價格
                    "coin_id": "ethereum"
                }
                print(f"✅ 更新 {week_key} ({target_date_str}): ${closest_price:.2f}")
                updated_weeks += 1
                
        except Exception as e:
            print(f"❌ 處理 {week_key} 時出錯: {e}")
            continue
    
    if updated_weeks > 0:
        # 保存更新後的數據
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 成功更新了 {updated_weeks} 個週期的 BMNR 數據")
        print("📄 數據已保存到 complete_historical_baseline.json")
        return True
    else:
        print("❌ 沒有更新任何數據")
        return False

if __name__ == "__main__":
    success = update_bmnr_historical_data()
    
    if success:
        print(f"\n🎉 BMNR 數據更新完成！")
        print(f"建議後續步驟:")
        print(f"1. 重啟開發服務器")
        print(f"2. 檢查 ETH 版塊是否顯示 BMNR")
        print(f"3. 運行驗證: python data_validator.py")
    else:
        print(f"\n❌ BMNR 數據更新失敗")