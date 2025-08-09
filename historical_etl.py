#!/usr/bin/env python3
"""
Historical Data ETL Pipeline for Crypto-Stock Tracker
Fetches historical stock and crypto data for the past 2 months on Monday 8:00 AM UTC+8 baseline
"""

import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import requests
import yfinance as yf
from pathlib import Path
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HistoricalETL:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # API Configuration
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"
        self.request_headers = {
            'User-Agent': 'crypto-stock-tracker-historical/1.0'
        }
        
        # Rate limiting - more conservative for historical data
        self.rate_limit_delay = 8.0  # seconds between API calls
        self.max_retries = 3
        
    def load_holdings(self) -> Dict[str, Any]:
        """Load company crypto holdings configuration"""
        holdings_file = self.data_dir / "holdings.json"
        
        with open(holdings_file, 'r') as f:
            return json.load(f)
    
    def get_past_mondays(self, weeks_back: int = 8) -> List[datetime]:
        """Get list of past Monday dates for baseline collection"""
        mondays = []
        today = datetime.now()
        
        # Find the most recent Monday
        days_since_monday = today.weekday()  # Monday = 0
        if days_since_monday == 0:
            # Today is Monday
            most_recent_monday = today
        else:
            # Go back to last Monday
            most_recent_monday = today - timedelta(days=days_since_monday)
        
        # Collect past Mondays
        for i in range(weeks_back):
            monday = most_recent_monday - timedelta(weeks=i)
            # Set to 8:00 AM UTC+8 (midnight UTC)
            monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
            mondays.append(monday)
        
        return sorted(mondays)
    
    def fetch_historical_stock_data(self, ticker: str, start_date: datetime, end_date: datetime) -> Optional[Dict[str, Any]]:
        """Fetch historical stock data for a specific date range"""
        try:
            stock = yf.Ticker(ticker)
            
            # Get historical data
            hist = stock.history(
                start=start_date.strftime('%Y-%m-%d'),
                end=(end_date + timedelta(days=1)).strftime('%Y-%m-%d')
            )
            
            if hist.empty:
                logger.warning(f"No historical stock data found for {ticker}")
                return None
            
            # Get the closest trading day to our target date
            target_data = hist.iloc[-1] if len(hist) > 0 else None
            
            if target_data is None:
                return None
            
            # Calculate percentage change from previous week if available
            pct_change = 0
            if len(hist) > 1:
                prev_close = hist.iloc[-2]['Close']
                current_close = target_data['Close']
                pct_change = ((current_close - prev_close) / prev_close) * 100
            
            return {
                "ticker": ticker,
                "close": float(target_data['Close']),
                "pct_change": pct_change,
                "date": start_date.strftime('%Y-%m-%d'),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching historical stock data for {ticker}: {e}")
            return None
    
    def fetch_historical_crypto_data(self, coin_id: str, date: datetime) -> Optional[Dict[str, Any]]:
        """Fetch historical cryptocurrency data for a specific date"""
        try:
            # Convert date to DD-MM-YYYY format for CoinGecko
            date_str = date.strftime('%d-%m-%Y')
            
            url = f"{self.coingecko_base_url}/coins/{coin_id}/history"
            params = {
                'date': date_str,
                'localization': 'false'
            }
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, params=params, headers=self.request_headers, timeout=30)
                    response.raise_for_status()
                    
                    data = response.json()
                    
                    if 'market_data' not in data or not data['market_data']:
                        logger.warning(f"No historical crypto data found for {coin_id} on {date_str}")
                        return None
                    
                    market_data = data['market_data']
                    current_price = market_data.get('current_price', {})
                    
                    if 'usd' not in current_price:
                        logger.warning(f"No USD price data for {coin_id} on {date_str}")
                        return None
                    
                    return {
                        "coin_id": coin_id,
                        "close": current_price['usd'],
                        "pct_change": 0,  # We'll calculate this separately with weekly data
                        "market_cap": market_data.get('market_cap', {}).get('usd', 0),
                        "date": date.strftime('%Y-%m-%d'),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:  # Rate limit
                        wait_time = (2 ** attempt) * 10
                        logger.warning(f"Rate limit hit for {coin_id}, waiting {wait_time}s")
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"HTTP error fetching historical crypto data for {coin_id}: {e}")
                        return None
                except Exception as e:
                    logger.error(f"Error fetching historical crypto data for {coin_id}: {e}")
                    if attempt < self.max_retries - 1:
                        time.sleep(5)
                        continue
                    return None
            
            return None
            
        except Exception as e:
            logger.error(f"Unexpected error fetching historical crypto data for {coin_id}: {e}")
            return None
    
    def calculate_weekly_changes(self, historical_data: List[Dict]) -> List[Dict]:
        """Calculate week-over-week percentage changes"""
        if len(historical_data) < 2:
            return historical_data
        
        # Sort by date
        sorted_data = sorted(historical_data, key=lambda x: x['week_end'])
        
        for i in range(1, len(sorted_data)):
            current_week = sorted_data[i]
            prev_week = sorted_data[i-1]
            
            for company in current_week['data']:
                ticker = company['ticker']
                
                # Find corresponding company in previous week
                prev_company = next((c for c in prev_week['data'] if c['ticker'] == ticker), None)
                
                if prev_company:
                    # Calculate stock price change
                    if prev_company['stock_close'] > 0:
                        company['stock_pct_change'] = ((company['stock_close'] - prev_company['stock_close']) / prev_company['stock_close']) * 100
                    
                    # Calculate coin price change (only for the same coin)
                    if company['coin'] == prev_company['coin'] and prev_company['coin_close'] > 0:
                        company['coin_pct_change'] = ((company['coin_close'] - prev_company['coin_close']) / prev_company['coin_close']) * 100
        
        return sorted_data
    
    def collect_historical_data(self) -> List[Dict[str, Any]]:
        """Main function to collect historical baseline data"""
        holdings = self.load_holdings()
        mondays = self.get_past_mondays(8)  # Past 8 weeks (2 months)
        
        historical_weeks = []
        
        logger.info(f"Collecting historical data for {len(mondays)} Monday baselines...")
        
        for monday in mondays:
            week_end = monday.strftime('%Y-%m-%d')
            logger.info(f"Processing week ending {week_end}...")
            
            processed_data = []
            crypto_cache = {}  # Cache to avoid duplicate API calls
            
            for ticker, holding_info in holdings.items():
                logger.info(f"  Processing {ticker}...")
                
                # Fetch historical stock data
                stock_data = self.fetch_historical_stock_data(ticker, monday, monday)
                if not stock_data:
                    logger.warning(f"  Skipping {ticker} - no stock data")
                    continue
                
                # Fetch historical crypto data (use cache if available)
                coin_id = holding_info['coin_id']
                if coin_id not in crypto_cache:
                    crypto_data = self.fetch_historical_crypto_data(coin_id, monday)
                    if crypto_data:
                        crypto_cache[coin_id] = crypto_data
                    else:
                        logger.warning(f"  Skipping {ticker} - no crypto data for {coin_id}")
                        continue
                
                crypto_data = crypto_cache[coin_id]
                
                # Combine data
                combined_data = {
                    "ticker": ticker,
                    "company_name": holding_info['company_name'],
                    "stock_close": round(stock_data['close'], 2),
                    "stock_pct_change": 0,  # Will be calculated later
                    "coin": holding_info['coin'],
                    "coin_close": round(crypto_data['close'], 2),
                    "coin_pct_change": 0,   # Will be calculated later
                    "holding_qty": holding_info['holding_qty'],
                    "holding_pct_of_supply": 0,  # Not needed for baseline comparison
                    "market_cap": crypto_data.get('market_cap', 0)
                }
                
                processed_data.append(combined_data)
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
            
            if processed_data:
                week_data = {
                    "week_end": week_end,
                    "generated_at": datetime.now().isoformat(),
                    "data": processed_data
                }
                historical_weeks.append(week_data)
            
            logger.info(f"  Completed {week_end} with {len(processed_data)} companies")
        
        # Calculate weekly changes
        historical_weeks = self.calculate_weekly_changes(historical_weeks)
        
        return historical_weeks
    
    def save_historical_data(self, historical_data: List[Dict[str, Any]]) -> None:
        """Save historical baseline data"""
        output_file = self.data_dir / "historical_baseline.json"
        
        with open(output_file, 'w') as f:
            json.dump({
                "collection_date": datetime.now().isoformat(),
                "baseline_info": "Monday 8:00 AM UTC+8 baseline data",
                "weeks_collected": len(historical_data),
                "data": historical_data
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Historical data saved to {output_file}")
        logger.info(f"Collected {len(historical_data)} weeks of baseline data")
    
    def run(self) -> None:
        """Execute the historical data collection"""
        logger.info("Starting historical baseline data collection...")
        
        try:
            # Collect historical data
            historical_data = self.collect_historical_data()
            
            # Save results
            if historical_data:
                self.save_historical_data(historical_data)
                logger.info("Historical data collection completed successfully!")
            else:
                logger.warning("No historical data collected")
                
        except Exception as e:
            logger.error(f"Historical data collection failed: {e}")
            raise

def main():
    """Main entry point"""
    etl = HistoricalETL()
    etl.run()

if __name__ == "__main__":
    main()