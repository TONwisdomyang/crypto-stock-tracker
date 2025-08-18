#!/usr/bin/env python3
"""
Test synchronized timing for stock and crypto data
"""

from etl import CryptoStockETL
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_synchronized_data():
    etl = CryptoStockETL()
    
    # Get synchronized target date
    target_date = etl.get_last_friday_close()
    logger.info(f"Testing synchronized data for: {target_date}")
    
    # Test VERB + TON combination
    logger.info("=== Testing VERB vs TON ===")
    
    # Get VERB stock data
    verb_stock = etl.fetch_stock_data('VERB', target_date)
    if not verb_stock:
        logger.error("Failed to get VERB stock data")
        return
    
    # Get TON crypto data  
    ton_crypto = etl.fetch_crypto_data('the-open-network', target_date)
    if not ton_crypto:
        logger.error("Failed to get TON crypto data")
        return
    
    # Display synchronized results
    print("\n" + "="*50)
    print("SYNCHRONIZED DATA RESULTS")
    print("="*50)
    print(f"Date: {target_date.strftime('%Y-%m-%d %H:%M %Z')}")
    print(f"Taiwan Time: {target_date.astimezone(etl.taiwan_tz).strftime('%Y-%m-%d %H:%M %Z')}")
    print()
    print("VERB Stock:")
    print(f"  Price: ${verb_stock['close']:.2f}")
    print(f"  Change: {verb_stock['pct_change']:+.2f}%")
    print(f"  Date: {verb_stock['date']}")
    print()
    print("TON Crypto:")
    print(f"  Price: ${ton_crypto['close']:.2f}")
    print(f"  Change: {ton_crypto['pct_change']:+.2f}%")
    print(f"  Date: {ton_crypto['date']}")
    print("="*50)
    
    # Create mini dataset for testing
    test_data = {
        "generated_at": target_date.isoformat(),
        "target_date": target_date.strftime('%Y-%m-%d'),
        "market_close_et": target_date.strftime('%Y-%m-%d %H:%M:%S %Z'),
        "market_close_tw": target_date.astimezone(etl.taiwan_tz).strftime('%Y-%m-%d %H:%M:%S %Z'),
        "synchronized_data": {
            "VERB": {
                "stock_price": verb_stock['close'],
                "stock_change": verb_stock['pct_change'],
                "coin": "TON",
                "coin_price": ton_crypto['close'],
                "coin_change": ton_crypto['pct_change']
            }
        }
    }
    
    # Save test results
    with open('public/data/synchronized_test.json', 'w') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)
    
    logger.info("Synchronized test data saved to public/data/synchronized_test.json")
    
    return test_data

if __name__ == "__main__":
    test_synchronized_data()