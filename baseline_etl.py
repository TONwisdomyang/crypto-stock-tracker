#!/usr/bin/env python3
"""
Baseline ETL Pipeline for Crypto-Stock Tracker
專門收集每週一早上 8:00 (UTC+8) 的基準數據，並追溯歷史數據

核心功能：
- 每週一 UTC+8 00:00 (即週日 UTC 16:00) 收集基準數據
- 追溯前兩個月歷史數據
- 移除持幣量相關不準確數據
- 專注於股價與幣價的基準對照分析
"""

import json
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional
import requests
import yfinance as yf
from pathlib import Path
import pytz

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BaselineETL:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 設定時區 - 台北時間 (UTC+8)
        self.taipei_tz = pytz.timezone('Asia/Taipei')
        self.utc_tz = pytz.UTC
        
        # API Configuration
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"
        self.request_headers = {
            'User-Agent': 'crypto-stock-tracker-baseline/1.0'
        }
        
        # Rate limiting - CoinGecko free tier: 10-50 calls per minute
        self.rate_limit_delay = 6.5
        self.max_retries = 3
        
    def load_holdings(self) -> Dict[str, Any]:
        """載入公司配置，移除持幣量相關欄位"""
        holdings_file = self.data_dir / "holdings.json"
        
        if not holdings_file.exists():
            # 簡化的配置，只保留必要的公司和幣種對應
            default_holdings = {
                "MSTR": {
                    "company_name": "MicroStrategy Inc.",
                    "coin": "BTC",
                    "coin_id": "bitcoin"
                },
                "COIN": {
                    "company_name": "Coinbase Global Inc.",
                    "coin": "BTC", 
                    "coin_id": "bitcoin"
                },
                "RIOT": {
                    "company_name": "Riot Platforms Inc.",
                    "coin": "BTC",
                    "coin_id": "bitcoin"
                },
                "TSLA": {
                    "company_name": "Tesla Inc.",
                    "coin": "BTC",
                    "coin_id": "bitcoin"
                },
                "DFDV": {
                    "company_name": "DFDV Corp.",
                    "coin": "SOL",
                    "coin_id": "solana"
                },
                "TRON": {
                    "company_name": "TRON Ltd.",
                    "coin": "TRON",
                    "coin_id": "tron"
                },
                "HYPE": {
                    "company_name": "Hype Dynamics Inc.",
                    "coin": "HYPD",
                    "coin_id": "hyperdao"
                },
                "VERB": {
                    "company_name": "VERB Technology Company Inc.",
                    "coin": "TON",
                    "coin_id": "the-open-network"
                }
            }
            
            with open(holdings_file, 'w') as f:
                json.dump(default_holdings, f, indent=2)
            logger.info(f"Created simplified holdings configuration")
            
        with open(holdings_file, 'r') as f:
            return json.load(f)
    
    def get_monday_baseline_date(self, target_date: datetime = None) -> datetime:
        """獲取指定日期所在週的週一日期 (台北時間早上8:00)"""
        if target_date is None:
            target_date = datetime.now(self.taipei_tz)
        
        # 確保在台北時區
        if target_date.tzinfo is None:
            target_date = self.taipei_tz.localize(target_date)
        elif target_date.tzinfo != self.taipei_tz:
            target_date = target_date.astimezone(self.taipei_tz)
        
        # 計算該週的週一
        days_since_monday = target_date.weekday()
        monday = target_date - timedelta(days=days_since_monday)
        
        # 設定為週一早上 8:00
        baseline_time = monday.replace(hour=8, minute=0, second=0, microsecond=0)
        
        return baseline_time
    
    def get_historical_mondays(self, weeks_back: int = 8) -> List[datetime]:
        """獲取過去N週的週一基準時間點"""
        current_monday = self.get_monday_baseline_date()
        mondays = []
        
        for i in range(weeks_back):
            monday = current_monday - timedelta(weeks=i)
            mondays.append(monday)
        
        return sorted(mondays)  # 從舊到新排序
    
    def fetch_historical_stock_data(self, ticker: str, start_date: datetime, end_date: datetime) -> Dict[datetime, float]:
        """獲取指定期間的股票歷史數據"""
        try:
            stock = yf.Ticker(ticker)
            
            # 轉換為 UTC 時間供 yfinance 使用
            start_utc = start_date.astimezone(self.utc_tz).strftime('%Y-%m-%d')
            end_utc = end_date.astimezone(self.utc_tz).strftime('%Y-%m-%d')
            
            hist = stock.history(start=start_utc, end=end_utc, interval="1h")
            
            if hist.empty:
                logger.warning(f"No historical stock data for {ticker}")
                return {}
            
            # 找到每個週一最接近 8:00 AM Taipei 時間的數據點
            baseline_prices = {}
            
            for monday in self.get_historical_mondays():
                # 轉換為 UTC 以匹配 yfinance 數據
                monday_utc = monday.astimezone(self.utc_tz)
                
                # 在該日期範圍內尋找最接近的價格
                day_data = hist[hist.index.date == monday_utc.date()]
                
                if not day_data.empty:
                    # 如果有當日數據，取開盤價
                    baseline_prices[monday] = float(day_data['Open'].iloc[0])
                else:
                    # 如果週一是假日，取前一個交易日的收盤價
                    prev_data = hist[hist.index < monday_utc]
                    if not prev_data.empty:
                        baseline_prices[monday] = float(prev_data['Close'].iloc[-1])
            
            return baseline_prices
            
        except Exception as e:
            logger.error(f"Error fetching historical stock data for {ticker}: {e}")
            return {}
    
    def fetch_historical_crypto_data(self, coin_id: str, target_date: datetime) -> Optional[float]:
        """獲取特定日期的加密貨幣價格"""
        import time
        
        try:
            # 轉換為 CoinGecko 需要的日期格式 (dd-mm-yyyy)
            date_str = target_date.strftime('%d-%m-%Y')
            
            url = f"{self.coingecko_base_url}/coins/{coin_id}/history"
            params = {
                'date': date_str,
                'localization': 'false'
            }
            
            response = requests.get(url, params=params, headers=self.request_headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if 'market_data' in data and 'current_price' in data['market_data']:
                price = data['market_data']['current_price'].get('usd')
                if price:
                    return float(price)
            
            logger.warning(f"No price data found for {coin_id} on {date_str}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching historical crypto data for {coin_id} on {target_date}: {e}")
            return None
        
        finally:
            # Rate limiting
            time.sleep(self.rate_limit_delay)
    
    def process_baseline_data(self) -> Dict[str, Any]:
        """處理基準數據"""
        holdings = self.load_holdings()
        historical_mondays = self.get_historical_mondays()
        
        # 獲取最早和最晚日期
        start_date = historical_mondays[0] - timedelta(days=7)  # 多取一週以防遺漏
        end_date = historical_mondays[-1] + timedelta(days=7)
        
        baseline_data = {}
        
        logger.info(f"Processing baseline data for {len(historical_mondays)} weeks...")
        
        for ticker, holding_info in holdings.items():
            logger.info(f"Processing historical data for {ticker}...")
            
            # 獲取股票歷史數據
            stock_prices = self.fetch_historical_stock_data(ticker, start_date, end_date)
            
            # 獲取加密貨幣歷史數據
            coin_id = holding_info['coin_id']
            crypto_prices = {}
            
            for monday in historical_mondays:
                crypto_price = self.fetch_historical_crypto_data(coin_id, monday)
                if crypto_price:
                    crypto_prices[monday] = crypto_price
            
            # 組合數據
            for monday in historical_mondays:
                week_key = monday.strftime('%Y-W%U')
                
                if week_key not in baseline_data:
                    baseline_data[week_key] = {
                        'week_start': monday.isoformat(),
                        'baseline_date': monday.strftime('%Y-%m-%d'),
                        'companies': {}
                    }
                
                # 只有當股票和加密貨幣數據都存在時才記錄
                if monday in stock_prices and monday in crypto_prices:
                    baseline_data[week_key]['companies'][ticker] = {
                        'company_name': holding_info['company_name'],
                        'stock_price': round(stock_prices[monday], 2),
                        'coin': holding_info['coin'],
                        'coin_price': round(crypto_prices[monday], 2),
                        'coin_id': coin_id
                    }
        
        return {
            'generated_at': datetime.now(self.taipei_tz).isoformat(),
            'timezone': 'Asia/Taipei',
            'baseline_time': '08:00',
            'data': baseline_data
        }
    
    def save_baseline_data(self, data: Dict[str, Any]) -> None:
        """儲存基準數據"""
        output_file = self.data_dir / "historical_baseline.json"
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Baseline data saved to {output_file}")
        logger.info(f"Processed {len(data['data'])} weeks of baseline data")
        
        # 創建摘要檔案
        weeks_with_data = len([week for week, week_data in data['data'].items() if week_data['companies']])
        
        summary = {
            'last_updated': data['generated_at'],
            'total_weeks': len(data['data']),
            'weeks_with_data': weeks_with_data,
            'baseline_time': f"每週一 {data['baseline_time']} ({data['timezone']})"
        }
        
        summary_file = self.data_dir / "baseline_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
    
    def run(self) -> None:
        """執行基準數據 ETL 流程"""
        logger.info("Starting Baseline ETL pipeline...")
        
        try:
            # 處理基準數據
            baseline_data = self.process_baseline_data()
            
            # 儲存結果
            self.save_baseline_data(baseline_data)
            
            logger.info("Baseline ETL pipeline completed successfully!")
            
        except Exception as e:
            logger.error(f"Baseline ETL pipeline failed: {e}")
            raise

def main():
    """主要進入點"""
    etl = BaselineETL()
    etl.run()

if __name__ == "__main__":
    main()