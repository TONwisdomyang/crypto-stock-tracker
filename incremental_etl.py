#!/usr/bin/env python3
"""
Incremental ETL Pipeline for historical data management
- Only fetches new data that hasn't been collected before
- Preserves existing historical data to avoid redundant API calls
- Implements smart data persistence and incremental updates
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
from etl import CryptoStockETL

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IncrementalETL:
    def __init__(self):
        self.etl = CryptoStockETL()
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.historical_file = self.data_dir / "complete_historical_baseline.json"
        
    def load_existing_data(self) -> Dict[str, Any]:
        """Load existing historical data if available"""
        if self.historical_file.exists():
            with open(self.historical_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        # Return empty structure if no data exists
        return {
            "generated_at": datetime.now().isoformat(),
            "timezone": "Asia/Taipei",
            "baseline_time": "16:00",
            "period": "",
            "data": {}
        }
    
    def get_missing_fridays(self, existing_data: Dict[str, Any], weeks_to_collect: int = 10) -> List[datetime]:
        """Determine which Friday dates we need to collect data for"""
        existing_weeks = set(existing_data.get("data", {}).keys())
        
        # Get the last N Friday dates
        target_fridays = []
        last_friday = self.etl.get_last_friday_close()
        
        for week_offset in range(weeks_to_collect):
            friday = last_friday - timedelta(weeks=week_offset)
            year, week, _ = friday.isocalendar()
            week_key = f"{year}-W{week:02d}"
            
            # Only add if we don't already have this week's data
            if week_key not in existing_weeks:
                target_fridays.append(friday)
        
        # Sort oldest first for logical collection order
        target_fridays.sort()
        return target_fridays
    
    def update_historical_data(self, weeks_to_collect: int = 10) -> bool:
        """Update historical data incrementally"""
        logger.info("Starting incremental historical data update...")
        
        # Load existing data
        historical_data = self.load_existing_data()
        logger.info(f"Loaded existing data with {len(historical_data.get('data', {}))} weeks")
        
        # Determine what new data we need
        missing_fridays = self.get_missing_fridays(historical_data, weeks_to_collect)
        
        if not missing_fridays:
            logger.info("No new data needed - all recent weeks are already collected")
            return True
        
        logger.info(f"Need to collect data for {len(missing_fridays)} new weeks:")
        for friday in missing_fridays:
            logger.info(f"  - {friday.strftime('%Y-%m-%d %A')}")
        
        # Load holdings configuration
        holdings = self.etl.load_holdings()
        
        # Collect new data for missing weeks
        new_data_collected = 0
        
        for friday in missing_fridays:
            year, week, _ = friday.isocalendar()
            week_key = f"{year}-W{week:02d}"
            
            logger.info(f"\nCollecting data for {week_key} ({friday.strftime('%Y-%m-%d')})...")
            
            companies = {}
            all_data_collected = True
            
            # Get real stock and crypto prices for this specific Friday
            for ticker, holding_info in holdings.items():
                logger.info(f"  Processing {ticker}...")
                
                try:
                    # Get stock price for this specific Friday
                    stock_data = self.etl.fetch_stock_data(ticker, friday)
                    if not stock_data:
                        logger.warning(f"  Failed to get stock data for {ticker}")
                        all_data_collected = False
                        break
                    
                    # Get crypto price for this specific Friday
                    crypto_data = self.etl.fetch_crypto_data(holding_info['coin_id'], friday)
                    if not crypto_data:
                        logger.warning(f"  Failed to get crypto data for {holding_info['coin_id']}")
                        all_data_collected = False
                        break
                    
                    companies[ticker] = {
                        "company_name": holding_info.get('company_name', f"{ticker} Inc."),
                        "ticker_used": ticker,
                        "stock_price": stock_data['close'],
                        "coin": holding_info['coin'],
                        "coin_price": crypto_data['close'],
                        "coin_id": holding_info['coin_id']
                    }
                    
                    logger.info(f"    ✅ {ticker}: ${stock_data['close']:.2f}, {holding_info['coin']}: ${crypto_data['close']:.2f}")
                    
                except Exception as e:
                    logger.error(f"  Error processing {ticker}: {e}")
                    all_data_collected = False
                    break
            
            # Only add week if we got complete data
            if all_data_collected and len(companies) == len(holdings):
                historical_data["data"][week_key] = {
                    "baseline_date": friday.strftime('%Y-%m-%d'),
                    "week_start": f"{friday.strftime('%Y-%m-%d')}T16:00:00-04:00",  # Market close time
                    "companies": companies
                }
                new_data_collected += 1
                logger.info(f"  ✅ Successfully collected data for {week_key}")
            else:
                logger.warning(f"  ❌ Incomplete data for {week_key}, skipping")
        
        # Update metadata
        if new_data_collected > 0:
            historical_data["generated_at"] = datetime.now().isoformat()
            
            # Update period range
            all_dates = [week_data["baseline_date"] for week_data in historical_data["data"].values()]
            if all_dates:
                all_dates.sort()
                historical_data["period"] = f"{all_dates[0]} - {all_dates[-1]}"
            
            # Save updated data
            with open(self.historical_file, 'w', encoding='utf-8') as f:
                json.dump(historical_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"\n🎉 Successfully added {new_data_collected} new weeks of data")
            logger.info(f"Total weeks in database: {len(historical_data['data'])}")
            
            return True
        else:
            logger.warning("No new data was successfully collected")
            return False
    
    def get_latest_week_for_current_etl(self) -> Optional[str]:
        """Get the most recent Friday that should be used for current weekly ETL"""
        last_friday = self.etl.get_last_friday_close()
        year, week, _ = last_friday.isocalendar()
        return f"{year}-W{week:02d}"
    
    def ensure_current_week_exists(self) -> bool:
        """Ensure we have data for the current week (for weekly ETL integration)"""
        current_week_key = self.get_latest_week_for_current_etl()
        if not current_week_key:
            return False
        
        historical_data = self.load_existing_data()
        
        # If current week already exists, we're good
        if current_week_key in historical_data.get("data", {}):
            logger.info(f"Current week {current_week_key} already exists in historical data")
            return True
        
        # Otherwise, run incremental update to get the current week
        logger.info(f"Current week {current_week_key} missing, running incremental update...")
        return self.update_historical_data(weeks_to_collect=1)

def main():
    """Main execution function"""
    incremental_etl = IncrementalETL()
    
    # Run incremental update for the last 10 weeks
    success = incremental_etl.update_historical_data(weeks_to_collect=10)
    
    if success:
        print("✅ Incremental ETL completed successfully")
    else:
        print("❌ Incremental ETL encountered issues")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())