#!/usr/bin/env python3
"""
簡單的本週數據更新腳本
只更新最新一週的數據，不重新處理歷史數據
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from etl import CryptoStockETL

# 配置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WeeklyUpdate:
    def __init__(self):
        self.etl = CryptoStockETL()
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.historical_file = self.data_dir / "complete_historical_baseline.json"
        
    def get_current_week_key(self):
        """取得本週的week key"""
        last_friday = self.etl.get_last_friday_close()
        year, week, _ = last_friday.isocalendar()
        return f"{year}-W{week:02d}", last_friday
        
    def load_existing_data(self):
        """載入現有歷史數據"""
        if self.historical_file.exists():
            with open(self.historical_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            "generated_at": datetime.now().isoformat(),
            "timezone": "Asia/Taipei", 
            "baseline_time": "16:00",
            "period": "",
            "data": {}
        }
        
    def update_current_week_only(self):
        """只更新本週數據"""
        week_key, last_friday = self.get_current_week_key()
        logger.info(f"更新本週數據: {week_key} ({last_friday.strftime('%Y-%m-%d')})")
        
        # 載入現有數據
        historical_data = self.load_existing_data()
        
        # 檢查是否已經有本週數據
        if week_key in historical_data.get("data", {}):
            logger.info(f"本週數據 {week_key} 已存在，將更新")
        else:
            logger.info(f"新增本週數據 {week_key}")
            
        # 載入holdings配置
        holdings = self.etl.load_holdings()
        logger.info(f"處理 {len(holdings)} 家公司")
        
        # 收集本週數據
        companies = {}
        success_count = 0
        
        for ticker, holding_info in holdings.items():
            logger.info(f"處理 {ticker}...")
            
            try:
                # 獲取股價數據
                stock_data = self.etl.fetch_stock_data(ticker, last_friday)
                if not stock_data:
                    logger.warning(f"無法獲取 {ticker} 股價")
                    continue
                    
                # 獲取幣價數據  
                crypto_data = self.etl.fetch_crypto_data(holding_info['coin_id'], last_friday)
                if not crypto_data:
                    logger.warning(f"無法獲取 {holding_info['coin_id']} 幣價")
                    continue
                    
                companies[ticker] = {
                    "company_name": holding_info.get('company_name', f"{ticker} Inc."),
                    "ticker_used": ticker,
                    "stock_price": stock_data['close'],
                    "coin": holding_info['coin'],
                    "coin_price": crypto_data['close'],
                    "coin_id": holding_info['coin_id']
                }
                
                success_count += 1
                logger.info(f"✅ {ticker}: ${stock_data['close']:.2f}, {holding_info['coin']}: ${crypto_data['close']:.2f}")
                
            except Exception as e:
                logger.error(f"處理 {ticker} 時出錯: {e}")
                continue
                
        # 只有在獲得完整數據時才更新
        if success_count == len(holdings):
            # 更新本週數據
            historical_data["data"][week_key] = {
                "baseline_date": last_friday.strftime('%Y-%m-%d'),
                "week_start": f"{last_friday.strftime('%Y-%m-%d')}T16:00:00-04:00",
                "companies": companies
            }
            
            # 更新元數據
            historical_data["generated_at"] = datetime.now().isoformat()
            
            # 更新期間範圍
            all_dates = [week_data["baseline_date"] for week_data in historical_data["data"].values()]
            if all_dates:
                all_dates.sort()
                historical_data["period"] = f"{all_dates[0]} - {all_dates[-1]}"
                
            # 保存更新後的數據
            with open(self.historical_file, 'w', encoding='utf-8') as f:
                json.dump(historical_data, f, indent=2, ensure_ascii=False)
                
            logger.info(f"🎉 成功更新本週數據 {week_key}")
            logger.info(f"總週數: {len(historical_data['data'])}")
            return True
            
        else:
            logger.warning(f"只獲取了 {success_count}/{len(holdings)} 家公司的數據，不更新")
            return False

def main():
    """主函數"""
    logger.info("開始本週數據更新...")
    
    updater = WeeklyUpdate()
    success = updater.update_current_week_only()
    
    if success:
        print("✅ 本週數據更新成功！")
        return 0
    else:
        print("❌ 本週數據更新失敗")
        return 1

if __name__ == "__main__":
    exit(main())