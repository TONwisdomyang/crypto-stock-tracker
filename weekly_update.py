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
                
            # 🔥 CRITICAL: 生成前端需要的 weekly_stats.json 格式
            self.generate_weekly_stats_format(week_key, last_friday, companies, holdings)
                
            logger.info(f"🎉 成功更新本週數據 {week_key}")
            logger.info(f"總週數: {len(historical_data['data'])}")
            return True
            
        else:
            logger.warning(f"只獲取了 {success_count}/{len(holdings)} 家公司的數據，不更新")
            return False
            
    def generate_weekly_stats_format(self, week_key, last_friday, companies, holdings):
        """生成前端需要的 weekly_stats.json 格式"""
        logger.info("生成前端數據格式...")
        
        # 轉換為前端期望的格式
        frontend_data = []
        
        for ticker, company_data in companies.items():
            holding_info = holdings[ticker]
            
            # 計算持有量佔比 (簡化計算)
            supply_percent = holding_info.get('holding_qty', 0) / 1000000  # 簡化計算
            
            frontend_data.append({
                "ticker": ticker,
                "company_name": company_data["company_name"],
                "stock_close": company_data["stock_price"],
                "stock_pct_change": 0,  # 週更新時暫時設為0，需要歷史比較才能計算
                "coin": company_data["coin"],
                "coin_close": company_data["coin_price"],
                "coin_pct_change": 0,   # 週更新時暫時設為0，需要歷史比較才能計算
                "holding_qty": holding_info.get('holding_qty', 0),
                "holding_pct_of_supply": supply_percent,
                "market_cap": 0  # 暫時設為0
            })
        
        # 生成週期結束日期 (週五)
        week_end_str = last_friday.strftime('%Y-%m-%d')
        
        weekly_stats = {
            "week_end": week_end_str,
            "generated_at": datetime.now().isoformat(),
            "data": frontend_data
        }
        
        # 保存到前端數據文件
        weekly_file = self.data_dir / "weekly_stats.json"
        with open(weekly_file, 'w', encoding='utf-8') as f:
            json.dump(weekly_stats, f, indent=2, ensure_ascii=False)
            
        # 生成摘要文件
        summary = {
            "last_updated": weekly_stats["generated_at"],
            "companies_count": len(frontend_data),
            "week_end": week_end_str
        }
        
        summary_file = self.data_dir / "summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
            
        logger.info(f"✅ 生成前端數據文件: {weekly_file}")
        logger.info(f"✅ 生成摘要文件: {summary_file}")

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