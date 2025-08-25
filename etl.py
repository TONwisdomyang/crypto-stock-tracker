#!/usr/bin/env python3
"""
Crypto-Stock ETL Pipeline
Fetches stock and cryptocurrency data, processes it, and generates JSON files for the frontend.

Data Sources:
- Yahoo Finance (yfinance) for stock prices
- CoinGecko API for cryptocurrency prices
- Static holdings.json for company crypto holdings
"""

import json
import os
import logging
from datetime import datetime, timedelta
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

class CryptoStockETL:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # API Configuration
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"
        self.request_headers = {
            'User-Agent': 'crypto-stock-tracker/1.0 (https://github.com/user/crypto-stock-tracker)'
        }
        
        # Rate limiting - CoinGecko free tier: 10 calls per minute
        # More aggressive approach for CI environments
        self.rate_limit_delay = 8  # seconds between API calls (7.5 calls/minute)  
        self.max_retries = 3  # Reduced retries for faster execution
        self.backoff_multiplier = 1.5  # Smaller backoff multiplier
        
        # Time zone configuration
        self.us_eastern = pytz.timezone('US/Eastern')
        self.taiwan_tz = pytz.timezone('Asia/Taipei')
    
    def get_last_friday_close(self) -> datetime:
        """Get the last Friday's US market close time (4:00 PM ET) converted to Taiwan time"""
        now = datetime.now(self.taiwan_tz)
        
        # Find the most recent Friday
        days_since_friday = (now.weekday() - 4) % 7  # Friday is day 4
        if days_since_friday == 0 and now.hour < 5:  # If it's Friday before 5 AM Taiwan time (still before market close)
            days_since_friday = 7
            
        last_friday = now - timedelta(days=days_since_friday)
        
        # Set to 4:00 PM Eastern Time (market close)
        market_close_et = self.us_eastern.localize(
            datetime(last_friday.year, last_friday.month, last_friday.day, 16, 0, 0)
        )
        
        # Convert to Taiwan time for logging
        market_close_tw = market_close_et.astimezone(self.taiwan_tz)
        
        logger.info(f"Using market close time: {market_close_tw.strftime('%Y-%m-%d %H:%M:%S %Z')} "
                   f"(ET: {market_close_et.strftime('%Y-%m-%d %H:%M:%S %Z')})")
        
        return market_close_et
        
    def load_holdings(self) -> Dict[str, Any]:
        """Load company crypto holdings configuration"""
        holdings_file = self.data_dir / "holdings.json"
        
        if not holdings_file.exists():
            # Create default holdings file
            default_holdings = {
                "MSTR": {
                    "company_name": "MicroStrategy Inc.",
                    "coin": "BTC",
                    "holding_qty": 214000,
                    "coin_id": "bitcoin"
                },
                "COIN": {
                    "company_name": "Coinbase Global Inc.",
                    "coin": "BTC", 
                    "holding_qty": 9000,
                    "coin_id": "bitcoin"
                },
                "RIOT": {
                    "company_name": "Riot Platforms Inc.",
                    "coin": "BTC",
                    "holding_qty": 15000,
                    "coin_id": "bitcoin"
                },
                "TSLA": {
                    "company_name": "Tesla Inc.",
                    "coin": "BTC",
                    "holding_qty": 42000,
                    "coin_id": "bitcoin"
                }
            }
            
            with open(holdings_file, 'w') as f:
                json.dump(default_holdings, f, indent=2)
            logger.info(f"Created default holdings file: {holdings_file}")
            
        with open(holdings_file, 'r') as f:
            return json.load(f)
    
    def fetch_stock_data(self, ticker: str, target_date: datetime = None) -> Optional[Dict[str, Any]]:
        """Fetch stock data from Yahoo Finance for a specific date (defaults to last Friday close)"""
        try:
            if target_date is None:
                target_date = self.get_last_friday_close()
            
            stock = yf.Ticker(ticker)
            
            # Get data for the target date and some previous days for comparison
            start_date = target_date - timedelta(days=10)  # Get 10 days of data to ensure we have enough
            end_date = target_date + timedelta(days=1)
            
            hist = stock.history(start=start_date, end=end_date)
            
            if hist.empty:
                logger.warning(f"No stock data found for {ticker}")
                return None
            
            # Convert target_date to market timezone for comparison
            target_date_et = target_date.astimezone(self.us_eastern).date()
            
            # Find the close price for the target date
            target_close = None
            target_date_str = None
            
            # Look for exact date match first
            for date, row in hist.iterrows():
                market_date = date.date()
                if market_date == target_date_et:
                    target_close = float(row['Close'])
                    target_date_str = market_date.strftime('%Y-%m-%d')
                    break
            
            # If no exact match, find the closest previous trading day
            if target_close is None:
                for date, row in reversed(list(hist.iterrows())):
                    market_date = date.date()
                    if market_date <= target_date_et:
                        target_close = float(row['Close'])
                        target_date_str = market_date.strftime('%Y-%m-%d')
                        logger.info(f"{ticker}: Using closest trading day {target_date_str} instead of target {target_date_et}")
                        break
            
            if target_close is None:
                logger.warning(f"No stock price found for {ticker} around {target_date_et}")
                return None
            
            # Get previous close for percentage calculation
            hist_list = list(hist.iterrows())
            previous_close = target_close  # Default fallback
            
            for i, (date, row) in enumerate(hist_list):
                if date.date().strftime('%Y-%m-%d') == target_date_str and i > 0:
                    previous_close = float(hist_list[i-1][1]['Close'])
                    break
            
            # Calculate percentage change
            pct_change = ((target_close - previous_close) / previous_close) * 100 if previous_close != 0 and previous_close != target_close else 0
            
            logger.info(f"{ticker} stock price on {target_date_str}: ${target_close:.2f} (change: {pct_change:+.2f}%)")
            
            return {
                "ticker": ticker,
                "close": target_close,
                "pct_change": pct_change,
                "date": target_date_str,
                "timestamp": target_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching stock data for {ticker}: {e}")
            return None
    
    def fetch_crypto_data(self, coin_id: str, target_date: datetime = None) -> Optional[Dict[str, Any]]:
        """Fetch cryptocurrency data from CoinGecko for a specific date (defaults to last Friday close)"""
        import time
        
        if target_date is None:
            target_date = self.get_last_friday_close()
        
        # More conservative rate limiting for problematic APIs
        if coin_id in ['hyperliquid', 'the-open-network']:
            time.sleep(15)  # Even more conservative for these APIs
        else:
            time.sleep(self.rate_limit_delay)
        
        for attempt in range(self.max_retries):
            try:
                # Format date for CoinGecko API (DD-MM-YYYY format)
                date_str = target_date.strftime('%d-%m-%Y')
                
                # Use historical data API to get price at specific date
                url = f"{self.coingecko_base_url}/coins/{coin_id}/history"
                params = {
                    'date': date_str,
                    'localization': 'false'
                }
                
                response = requests.get(url, params=params, headers=self.request_headers, timeout=30)
                
                if response.status_code == 429:  # Rate limited
                    wait_time = self.rate_limit_delay * (self.backoff_multiplier ** attempt)
                    logger.warning(f"Rate limited for {coin_id}, waiting {wait_time}s (attempt {attempt+1}/{self.max_retries})")
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                if not data or 'market_data' not in data:
                    logger.warning(f"No historical crypto data found for {coin_id} on {date_str}")
                    return None
                
                market_data = data['market_data']
                current_price = market_data.get('current_price', {}).get('usd', 0)
                
                if current_price == 0:
                    logger.warning(f"No USD price found for {coin_id} on {date_str}")
                    return None
                
                # Try to get previous day's data for percentage calculation
                prev_date = target_date - timedelta(days=1)
                prev_date_str = prev_date.strftime('%d-%m-%Y')
                
                # Small delay before second API call
                time.sleep(self.rate_limit_delay)
                
                prev_response = requests.get(
                    f"{self.coingecko_base_url}/coins/{coin_id}/history",
                    params={'date': prev_date_str, 'localization': 'false'},
                    headers=self.request_headers, 
                    timeout=30
                )
                
                previous_price = current_price  # Fallback
                if prev_response.status_code == 200:
                    prev_data = prev_response.json()
                    if prev_data and 'market_data' in prev_data:
                        previous_price = prev_data['market_data'].get('current_price', {}).get('usd', current_price)
                
                # Calculate percentage change
                pct_change = ((current_price - previous_price) / previous_price) * 100 if previous_price != 0 and previous_price != current_price else 0
                
                result = {
                    "coin_id": coin_id,
                    "close": current_price,
                    "pct_change": pct_change,
                    "date": target_date.strftime('%Y-%m-%d'),
                    "timestamp": target_date.isoformat(),
                    "market_cap": market_data.get('market_cap', {}).get('usd', 0),
                    "volume": market_data.get('total_volume', {}).get('usd', 0)
                }
                
                logger.info(f"Successfully fetched crypto data for {coin_id} on {date_str}: ${current_price:.2f} (change: {pct_change:+.2f}%)")
                return result
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:  # Rate limit
                    wait_time = self.rate_limit_delay * (self.backoff_multiplier ** attempt)
                    logger.warning(f"Rate limit hit for {coin_id}, waiting {wait_time}s (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"HTTP error fetching crypto data for {coin_id}: {e}")
                    if attempt < self.max_retries - 1:
                        wait_time = self.rate_limit_delay * (self.backoff_multiplier ** attempt)
                        logger.info(f"Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    return None
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error fetching crypto data for {coin_id}: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.rate_limit_delay * (self.backoff_multiplier ** attempt)
                    logger.info(f"Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                return None
            except Exception as e:
                logger.error(f"Unexpected error fetching crypto data for {coin_id}: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = 5  # Short wait for unexpected errors
                    time.sleep(wait_time)
                    continue
                return None
        
        logger.error(f"Failed to fetch crypto data for {coin_id} after {self.max_retries} attempts")
        return None
    
    def get_crypto_supply(self, coin_id: str) -> Optional[float]:
        """Get cryptocurrency circulating supply with fallback to hardcoded values"""
        # Use hardcoded supply values to avoid extra API calls
        supply_fallbacks = {
            'bitcoin': 19800000.0,  # Approximately current BTC supply
            'ethereum': 120400000.0,  # Approximately current ETH supply  
            'binancecoin': 153856150.0,  # Approximately current BNB supply
        }
        
        if coin_id in supply_fallbacks:
            logger.info(f"Using fallback supply value for {coin_id}: {supply_fallbacks[coin_id]}")
            return supply_fallbacks[coin_id]
        
        try:
            import time
            time.sleep(self.rate_limit_delay)  # Rate limit this call too
            
            url = f"{self.coingecko_base_url}/coins/{coin_id}"
            response = requests.get(url, headers=self.request_headers, timeout=30)
            
            if response.status_code == 429:  # Rate limited
                logger.warning(f"Rate limited fetching supply for {coin_id}, using fallback")
                return supply_fallbacks.get(coin_id, 1000000.0)  # Generic fallback
            
            response.raise_for_status()
            data = response.json()
            circulating_supply = data.get('market_data', {}).get('circulating_supply')
            
            return float(circulating_supply) if circulating_supply else supply_fallbacks.get(coin_id, 1000000.0)
            
        except Exception as e:
            logger.warning(f"Error fetching supply data for {coin_id}: {e}, using fallback")
            return supply_fallbacks.get(coin_id, 1000000.0)
    
    def calculate_holding_percentage(self, holding_qty: float, coin_id: str) -> float:
        """Calculate holding as percentage of total supply"""
        supply = self.get_crypto_supply(coin_id)
        if supply and supply > 0:
            return (holding_qty / supply) * 100
        return 0.0
    
    def process_weekly_data(self) -> Dict[str, Any]:
        """Main ETL process to generate weekly data using synchronized Friday market close times"""
        holdings = self.load_holdings()
        
        # Get the target date (last Friday market close)
        target_date = self.get_last_friday_close()
        week_end = target_date.strftime('%Y-%m-%d')
        
        processed_data = []
        crypto_cache = {}  # Cache crypto data to avoid duplicate API calls
        
        logger.info(f"Processing synchronized data for {len(holdings)} companies using target date: {week_end}")
        
        for ticker, holding_info in holdings.items():
            logger.info(f"Processing {ticker} for {week_end}...")
            
            # Fetch stock data for the target date
            stock_data = self.fetch_stock_data(ticker, target_date)
            if not stock_data:
                logger.warning(f"Skipping {ticker} due to missing stock data")
                continue
            
            # Fetch crypto data for the same target date (use cache if available)
            coin_id = holding_info['coin_id']
            if coin_id not in crypto_cache:
                crypto_data = self.fetch_crypto_data(coin_id, target_date)
                if crypto_data:
                    crypto_cache[coin_id] = crypto_data
                else:
                    logger.warning(f"Skipping {ticker} due to missing crypto data")
                    continue
            
            crypto_data = crypto_cache[coin_id]
            
            # Calculate holding percentage
            holding_pct = self.calculate_holding_percentage(
                holding_info['holding_qty'], 
                coin_id
            )
            
            # Combine data
            combined_data = {
                "ticker": ticker,
                "company_name": holding_info['company_name'],
                "stock_close": round(stock_data['close'], 2),
                "stock_pct_change": round(stock_data['pct_change'], 2),
                "coin": holding_info['coin'],
                "coin_close": round(crypto_data['close'], 2),
                "coin_pct_change": round(crypto_data['pct_change'], 2),
                "holding_qty": holding_info['holding_qty'],
                "holding_pct_of_supply": round(holding_pct, 4),
                "market_cap": crypto_data.get('market_cap', 0)
            }
            
            processed_data.append(combined_data)
            
            # Light rate limiting between companies
            import time  
            time.sleep(2)  # Reduced from self.rate_limit_delay
        
        return {
            "week_end": week_end,
            "generated_at": datetime.now().isoformat(),
            "data": processed_data
        }
    
    def save_data(self, data: Dict[str, Any]) -> None:
        """Save processed data to JSON files and update historical baseline"""
        # Save weekly stats
        output_file = self.data_dir / "weekly_stats.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Data saved to {output_file}")
        logger.info(f"Processed {len(data['data'])} companies")
        
        # Update historical baseline with incremental ETL
        try:
            from incremental_etl import IncrementalETL
            incremental_etl = IncrementalETL()
            incremental_etl.ensure_current_week_exists()
            logger.info("Historical baseline updated via incremental ETL")
        except Exception as e:
            logger.warning(f"Could not update historical baseline: {e}")
            # Fallback to convert_data.py for backward compatibility
            try:
                import subprocess
                subprocess.run(['python', 'convert_data.py'], check=True, cwd=str(self.base_dir))
                logger.info("Historical baseline updated via convert_data.py fallback")
            except Exception as fallback_error:
                logger.error(f"Both incremental ETL and fallback failed: {fallback_error}")
        
        # Create a summary file for quick access
        summary = {
            "last_updated": data["generated_at"],
            "companies_count": len(data['data']),
            "week_end": data["week_end"]
        }
        
        summary_file = self.data_dir / "summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
    
    def run(self) -> None:
        """Execute the full ETL pipeline"""
        logger.info("Starting Crypto-Stock ETL pipeline...")
        
        try:
            # Process data
            weekly_data = self.process_weekly_data()
            
            if not weekly_data.get('data') or len(weekly_data['data']) == 0:
                logger.warning("No data was successfully processed!")
                # Still try to save empty data structure for consistency
                weekly_data = {
                    "week_end": self.get_last_friday_close().strftime('%Y-%m-%d'),
                    "generated_at": datetime.now().isoformat(),
                    "data": []
                }
            else:
                logger.info(f"Successfully processed {len(weekly_data['data'])} companies")
            
            # Save results
            self.save_data(weekly_data)
            
            logger.info("ETL pipeline completed successfully!")
            
        except Exception as e:
            logger.error(f"ETL pipeline failed: {e}")
            # Try to create a minimal data file so the build doesn't completely fail
            try:
                fallback_data = {
                    "week_end": self.get_last_friday_close().strftime('%Y-%m-%d'),
                    "generated_at": datetime.now().isoformat(),
                    "data": [],
                    "error": str(e)
                }
                output_file = self.data_dir / "weekly_stats.json"
                with open(output_file, 'w') as f:
                    json.dump(fallback_data, f, indent=2, ensure_ascii=False)
                logger.info(f"Created fallback data file at {output_file}")
            except Exception as save_error:
                logger.error(f"Failed to create fallback data: {save_error}")
            raise

def main():
    """Main entry point"""
    etl = CryptoStockETL()
    etl.run()

if __name__ == "__main__":
    main()