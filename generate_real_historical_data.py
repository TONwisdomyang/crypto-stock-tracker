#!/usr/bin/env python3
"""
Generate REAL historical data using actual market prices
Replaces the fake data generation with authentic historical market data
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from etl import CryptoStockETL

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_real_historical_data():
    """Generate real historical data using actual market prices for the past 5 weeks"""
    
    etl = CryptoStockETL()
    base_dir = Path(__file__).parent
    data_dir = base_dir / "public" / "data"
    
    # Define the weeks we want to collect (5 Fridays going backwards)
    target_fridays = []
    
    # Start from last Friday and go back 5 weeks
    last_friday = etl.get_last_friday_close()
    
    for week_offset in range(5):
        friday = last_friday - timedelta(weeks=week_offset)
        target_fridays.append(friday)
    
    # Sort so oldest is first
    target_fridays.sort()
    
    logger.info(f"Collecting real historical data for {len(target_fridays)} weeks:")
    for friday in target_fridays:
        logger.info(f"  - {friday.strftime('%Y-%m-%d %A')}")
    
    # Load holdings configuration
    holdings = etl.load_holdings()
    
    historical_data = {
        "generated_at": datetime.now().isoformat(),
        "timezone": "Asia/Taipei",
        "baseline_time": "16:00",  # Market close time
        "period": f"{target_fridays[0].strftime('%Y-%m-%d')} - {target_fridays[-1].strftime('%Y-%m-%d')}",
        "data": {}
    }
    
    # Collect real data for each Friday
    for friday in target_fridays:
        year, week, _ = friday.isocalendar()
        week_key = f"{year}-W{week:02d}"
        
        logger.info(f"\nCollecting data for {week_key} ({friday.strftime('%Y-%m-%d')})...")
        
        companies = {}
        
        # Get real stock and crypto prices for this specific Friday
        for ticker, holding_info in holdings.items():
            logger.info(f"  Processing {ticker}...")
            
            # Get stock price for this specific Friday
            stock_data = etl.fetch_stock_data(ticker, friday)
            if not stock_data:
                logger.warning(f"  Failed to get stock data for {ticker}")
                continue
            
            # Get crypto price for this specific Friday  
            crypto_data = etl.fetch_crypto_data(holding_info['coin_id'], friday)
            if not crypto_data:
                logger.warning(f"  Failed to get crypto data for {holding_info['coin_id']}")
                continue
            
            companies[ticker] = {
                "company_name": holding_info.get('company_name', f"{ticker} Inc."),
                "ticker_used": ticker,
                "stock_price": stock_data['close'],
                "coin": holding_info['coin'],
                "coin_price": crypto_data['close'],
                "coin_id": holding_info['coin_id']
            }
            
            logger.info(f"    {ticker}: ${stock_data['close']:.2f}, {holding_info['coin']}: ${crypto_data['close']:.2f}")
        
        # Only add week if we got data for all companies
        if len(companies) == len(holdings):
            historical_data["data"][week_key] = {
                "baseline_date": friday.strftime('%Y-%m-%d'),
                "week_start": f"{friday.strftime('%Y-%m-%d')}T16:00:00-04:00",  # Market close time
                "companies": companies
            }
            logger.info(f"  ✅ Successfully collected data for {week_key}")
        else:
            logger.warning(f"  ❌ Incomplete data for {week_key}, skipping")
    
    # Save the real historical data
    output_file = data_dir / "complete_historical_baseline.json"
    with open(output_file, 'w') as f:
        json.dump(historical_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\n🎉 Real historical data saved to {output_file}")
    logger.info(f"Generated {len(historical_data['data'])} weeks of REAL market data")
    
    # Show a summary
    print("\n" + "="*60)
    print("REAL HISTORICAL DATA SUMMARY")
    print("="*60)
    
    for week_key in sorted(historical_data["data"].keys()):
        week_data = historical_data["data"][week_key]
        date = week_data["baseline_date"]
        
        print(f"\n{week_key} ({date}):")
        for ticker, company in week_data["companies"].items():
            stock_price = company["stock_price"]
            coin_price = company["coin_price"]
            coin = company["coin"]
            print(f"  {ticker}: ${stock_price:.2f} | {coin}: ${coin_price:.2f}")

if __name__ == "__main__":
    generate_real_historical_data()