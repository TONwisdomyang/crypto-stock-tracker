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
        self.rate_limit_delay = 6.5  # seconds between API calls (safer margin)
        self.max_retries = 3
        
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
    
    def fetch_stock_data(self, ticker: str, period: str = "5d") -> Optional[Dict[str, Any]]:
        """Fetch stock data from Yahoo Finance"""
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            
            if hist.empty:
                logger.warning(f"No stock data found for {ticker}")
                return None
            
            # Get latest and previous close
            latest_close = float(hist['Close'].iloc[-1])
            previous_close = float(hist['Close'].iloc[-2]) if len(hist) > 1 else latest_close
            
            # Calculate percentage change
            pct_change = ((latest_close - previous_close) / previous_close) * 100 if previous_close != 0 else 0
            
            return {
                "ticker": ticker,
                "close": latest_close,
                "pct_change": pct_change,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching stock data for {ticker}: {e}")
            return None
    
    def fetch_crypto_data(self, coin_id: str) -> Optional[Dict[str, Any]]:
        """Fetch cryptocurrency data from CoinGecko with retry logic"""
        import time
        
        for attempt in range(self.max_retries):
            try:
                # Get current price and market data
                url = f"{self.coingecko_base_url}/simple/price"
                params = {
                    'ids': coin_id,
                    'vs_currencies': 'usd',
                    'include_24hr_change': 'true',
                    'include_24hr_vol': 'true',
                    'include_market_cap': 'true'
                }
                
                response = requests.get(url, params=params, headers=self.request_headers, timeout=30)
                response.raise_for_status()
                
                data = response.json()
                
                if coin_id not in data:
                    logger.warning(f"No crypto data found for {coin_id}")
                    return None
                
                coin_data = data[coin_id]
                
                return {
                    "coin_id": coin_id,
                    "close": coin_data['usd'],
                    "pct_change": coin_data.get('usd_24h_change', 0),
                    "volume": coin_data.get('usd_24h_vol', 0),
                    "market_cap": coin_data.get('usd_market_cap', 0),
                    "timestamp": datetime.now().isoformat()
                }
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:  # Rate limit
                    wait_time = (2 ** attempt) * 10  # Exponential backoff
                    logger.warning(f"Rate limit hit for {coin_id}, waiting {wait_time}s (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    logger.error(f"HTTP error fetching crypto data for {coin_id}: {e}")
                    return None
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error fetching crypto data for {coin_id}: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(5)  # Wait before retry
                    continue
                return None
            except Exception as e:
                logger.error(f"Unexpected error fetching crypto data for {coin_id}: {e}")
                return None
        
        logger.error(f"Failed to fetch crypto data for {coin_id} after {self.max_retries} attempts")
        return None
    
    def get_crypto_supply(self, coin_id: str) -> Optional[float]:
        """Get cryptocurrency circulating supply"""
        try:
            url = f"{self.coingecko_base_url}/coins/{coin_id}"
            response = requests.get(url, headers=self.request_headers)
            response.raise_for_status()
            
            data = response.json()
            circulating_supply = data.get('market_data', {}).get('circulating_supply')
            
            return float(circulating_supply) if circulating_supply else None
            
        except Exception as e:
            logger.error(f"Error fetching supply data for {coin_id}: {e}")
            return None
    
    def calculate_holding_percentage(self, holding_qty: float, coin_id: str) -> float:
        """Calculate holding as percentage of total supply"""
        supply = self.get_crypto_supply(coin_id)
        if supply and supply > 0:
            return (holding_qty / supply) * 100
        return 0.0
    
    def process_weekly_data(self) -> Dict[str, Any]:
        """Main ETL process to generate weekly data"""
        holdings = self.load_holdings()
        week_end = datetime.now().strftime('%Y-%m-%d')
        
        processed_data = []
        crypto_cache = {}  # Cache crypto data to avoid duplicate API calls
        
        logger.info(f"Processing data for {len(holdings)} companies...")
        
        for ticker, holding_info in holdings.items():
            logger.info(f"Processing {ticker}...")
            
            # Fetch stock data
            stock_data = self.fetch_stock_data(ticker)
            if not stock_data:
                logger.warning(f"Skipping {ticker} due to missing stock data")
                continue
            
            # Fetch crypto data (use cache if available)
            coin_id = holding_info['coin_id']
            if coin_id not in crypto_cache:
                crypto_data = self.fetch_crypto_data(coin_id)
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
            
            # Rate limiting
            import time
            time.sleep(self.rate_limit_delay)
        
        return {
            "week_end": week_end,
            "generated_at": datetime.now().isoformat(),
            "data": processed_data
        }
    
    def save_data(self, data: Dict[str, Any]) -> None:
        """Save processed data to JSON files"""
        # Save weekly stats
        output_file = self.data_dir / "weekly_stats.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Data saved to {output_file}")
        logger.info(f"Processed {len(data['data'])} companies")
        
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
            
            # Save results
            self.save_data(weekly_data)
            
            logger.info("ETL pipeline completed successfully!")
            
        except Exception as e:
            logger.error(f"ETL pipeline failed: {e}")
            raise

def main():
    """Main entry point"""
    etl = CryptoStockETL()
    etl.run()

if __name__ == "__main__":
    main()