#!/usr/bin/env python3
"""
Enhanced Historical ETL - 收集2025年6-8月完整歷史數據
專門處理股票代號變更和準確的歷史時間線
"""

import yfinance as yf
import requests
import json
import pandas as pd
from datetime import datetime, timedelta
import time
import logging
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HistoricalDataCollector:
    def __init__(self):
        self.coingecko_url = "https://api.coingecko.com/api/v3"
        
        # 股票代號變更歷史映射
        self.ticker_history = {
            "MSTR": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-31", "ticker": "MSTR"}
                ],
                "company_name": "Strategy Inc.",
                "coin": "BTC",
                "coin_id": "bitcoin"
            },
            "BNC": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-05", "ticker": "VAPE"},
                    {"start": "2025-08-06", "end": "2025-08-31", "ticker": "BNC"}
                ],
                "company_name": "BNB Network Company",
                "coin": "BNB", 
                "coin_id": "binancecoin"
            },
            "DFDV": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-31", "ticker": "DFDV"}
                ],
                "company_name": "DeFi Development Corp",
                "coin": "SOL",
                "coin_id": "solana"
            },
            "VERB": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-31", "ticker": "VERB"}
                ],
                "company_name": "VERB Technology Company Inc.",
                "coin": "TON",
                "coin_id": "the-open-network"
            },
            "SBET": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-31", "ticker": "SBET"}
                ],
                "company_name": "SharpLink Gaming Ltd.",
                "coin": "ETH",
                "coin_id": "ethereum"
            },
            "HYPD": {
                "periods": [
                    {"start": "2025-06-01", "end": "2025-08-31", "ticker": "HYPD"}
                ],
                "company_name": "Hyperion DeFi, Inc.",
                "coin": "HYPE",
                "coin_id": "hyperliquid"
            }
        }
    
    def get_monday_dates_in_range(self, start_date: str, end_date: str) -> List[str]:
        """獲取指定範圍內所有週一的日期"""
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        # 找到第一個週一
        current = start
        while current.weekday() != 0:  # 0 = Monday
            current += timedelta(days=1)
        
        mondays = []
        while current <= end:
            mondays.append(current.strftime("%Y-%m-%d"))
            current += timedelta(weeks=1)
        
        return mondays
    
    def fetch_stock_data_for_period(self, ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
        """獲取指定時期的股票數據"""
        try:
            logger.info(f"Fetching stock data for {ticker} from {start_date} to {end_date}")
            stock = yf.Ticker(ticker)
            
            # 獲取數據，包含前後幾天以確保覆蓋完整
            start_fetch = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
            end_fetch = (datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")
            
            hist = stock.history(start=start_fetch, end=end_fetch)
            
            if hist.empty:
                logger.warning(f"No stock data found for {ticker}")
                return pd.DataFrame()
                
            return hist
            
        except Exception as e:
            logger.error(f"Error fetching stock data for {ticker}: {e}")
            return pd.DataFrame()
    
    def fetch_crypto_data_for_period(self, coin_id: str, start_date: str, end_date: str) -> pd.DataFrame:
        """獲取指定時期的加密貨幣數據"""
        try:
            logger.info(f"Fetching crypto data for {coin_id} from {start_date} to {end_date}")
            
            # 轉換日期為時間戳
            start_timestamp = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp())
            end_timestamp = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp())
            
            url = f"{self.coingecko_url}/coins/{coin_id}/market_chart/range"
            params = {
                "vs_currency": "usd",
                "from": start_timestamp,
                "to": end_timestamp
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 429:
                logger.warning("Rate limit hit, waiting 30 seconds...")
                time.sleep(30)
                response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                prices = data.get('prices', [])
                
                if prices:
                    df = pd.DataFrame(prices, columns=['timestamp', 'price'])
                    df['date'] = pd.to_datetime(df['timestamp'], unit='ms').dt.date
                    return df.groupby('date')['price'].last().reset_index()
                else:
                    logger.warning(f"No price data found for {coin_id}")
                    return pd.DataFrame()
            else:
                logger.error(f"Error fetching crypto data for {coin_id}: {response.status_code}")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"Error fetching crypto data for {coin_id}: {e}")
            return pd.DataFrame()
    
    def collect_weekly_baseline_data(self) -> Dict:
        """收集週一基準數據"""
        result = {
            "generated_at": datetime.now().isoformat(),
            "timezone": "Asia/Taipei", 
            "baseline_time": "08:00",
            "period": "2025-06 to 2025-08",
            "data": {}
        }
        
        # 獲取2025年6-8月的所有週一
        mondays = self.get_monday_dates_in_range("2025-06-01", "2025-08-31")
        logger.info(f"Found {len(mondays)} Mondays to process: {mondays}")
        
        for monday in mondays:
            week_key = f"{monday[:4]}-W{datetime.strptime(monday, '%Y-%m-%d').isocalendar()[1]:02d}"
            logger.info(f"Processing {week_key} ({monday})")
            
            week_data = {
                "baseline_date": monday,
                "week_start": f"{monday}T08:00:00+08:00",
                "companies": {}
            }
            
            for company_key, company_info in self.ticker_history.items():
                # 找到該日期對應的股票代號
                ticker_to_use = None
                for period in company_info["periods"]:
                    period_start = datetime.strptime(period["start"], "%Y-%m-%d").date()
                    period_end = datetime.strptime(period["end"], "%Y-%m-%d").date()
                    monday_date = datetime.strptime(monday, "%Y-%m-%d").date()
                    
                    if period_start <= monday_date <= period_end:
                        ticker_to_use = period["ticker"]
                        break
                
                if not ticker_to_use:
                    logger.warning(f"No ticker found for {company_key} on {monday}")
                    continue
                
                # 獲取股票數據
                monday_date_obj = datetime.strptime(monday, "%Y-%m-%d")
                week_end = monday_date_obj + timedelta(days=6)
                
                stock_df = self.fetch_stock_data_for_period(
                    ticker_to_use, 
                    monday, 
                    week_end.strftime("%Y-%m-%d")
                )
                
                # 獲取加密貨幣數據
                crypto_df = self.fetch_crypto_data_for_period(
                    company_info["coin_id"],
                    monday,
                    week_end.strftime("%Y-%m-%d")
                )
                
                # 找最接近週一的價格
                if not stock_df.empty and not crypto_df.empty:
                    # 股票價格 (使用開盤價作為週一基準)
                    monday_stock_price = None
                    stock_df_reset = stock_df.reset_index()
                    
                    for i, row in stock_df_reset.iterrows():
                        if row['Date'].date() >= monday_date_obj.date():
                            monday_stock_price = row['Open']
                            break
                    
                    # 加密貨幣價格
                    monday_crypto_price = None
                    for _, row in crypto_df.iterrows():
                        if row['date'] >= monday_date_obj.date():
                            monday_crypto_price = row['price']
                            break
                    
                    if monday_stock_price and monday_crypto_price:
                        week_data["companies"][company_key] = {
                            "company_name": company_info["company_name"],
                            "ticker_used": ticker_to_use,
                            "stock_price": round(float(monday_stock_price), 2),
                            "coin": company_info["coin"],
                            "coin_price": round(float(monday_crypto_price), 2),
                            "coin_id": company_info["coin_id"]
                        }
                        
                        logger.info(f"✅ {company_key} ({ticker_to_use}): Stock=${monday_stock_price:.2f}, {company_info['coin']}=${monday_crypto_price:.2f}")
                    else:
                        logger.warning(f"❌ Missing data for {company_key} on {monday}")
                else:
                    logger.warning(f"❌ No data frames for {company_key} on {monday}")
                
                # API 限制間隔
                time.sleep(2)
            
            if week_data["companies"]:
                result["data"][week_key] = week_data
            
            # 每週處理完後稍作休息
            time.sleep(5)
        
        return result
    
    def save_historical_data(self, data: Dict):
        """保存歷史數據"""
        output_file = "public/data/complete_historical_baseline.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Historical data saved to {output_file}")
        
        # 統計摘要
        weeks_collected = len(data["data"])
        companies_per_week = {}
        
        for week_key, week_data in data["data"].items():
            companies_per_week[week_key] = len(week_data["companies"])
        
        logger.info(f"📊 Collection Summary:")
        logger.info(f"   Total weeks: {weeks_collected}")
        logger.info(f"   Average companies per week: {sum(companies_per_week.values()) / weeks_collected:.1f}")
        logger.info(f"   Week breakdown: {companies_per_week}")

def main():
    collector = HistoricalDataCollector()
    
    logger.info("🚀 Starting enhanced historical data collection...")
    logger.info("📅 Target period: June - August 2025")
    logger.info("🎯 Focus: Weekly Monday baseline data with ticker changes")
    
    # 收集歷史數據
    historical_data = collector.collect_weekly_baseline_data()
    
    # 保存數據
    collector.save_historical_data(historical_data)
    
    logger.info("✅ Enhanced historical ETL completed!")

if __name__ == "__main__":
    main()