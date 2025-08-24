import json
import yfinance as yf
from datetime import datetime, timedelta

print("Adding MARA and CEP historical data...")

# Load existing data
with open('public/data/complete_historical_baseline.json', 'r') as f:
    data = json.load(f)

# Get historical stock prices
companies = {'MARA': 'MARA Holdings Inc', 'CEP': 'XXI Century Capital Corp'}
week_dates = {
    "2025-W29": "2025-07-18",
    "2025-W30": "2025-07-25", 
    "2025-W31": "2025-08-01",
    "2025-W32": "2025-08-08",
    "2025-W33": "2025-08-15"
}

for ticker, company_name in companies.items():
    print(f"\nProcessing {ticker}...")
    
    try:
        stock = yf.Ticker(ticker)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60)
        hist = stock.history(start=start_date, end=end_date)
        
        for week_key, week_date in week_dates.items():
            if week_key in data['data']:
                target_date = datetime.strptime(week_date, '%Y-%m-%d')
                
                # Find closest trading day
                closest_price = None
                min_diff = float('inf')
                
                for date, row in hist.iterrows():
                    date_diff = abs((date.to_pydatetime().date() - target_date.date()).days)
                    if date_diff < min_diff:
                        min_diff = date_diff
                        closest_price = row['Close']
                
                if closest_price:
                    # Get BTC price from MSTR data
                    btc_price = data['data'][week_key]['companies']['MSTR']['coin_price']
                    
                    data['data'][week_key]['companies'][ticker] = {
                        "company_name": company_name,
                        "ticker_used": ticker,
                        "stock_price": round(closest_price, 2),
                        "coin": "BTC",
                        "coin_price": btc_price,
                        "coin_id": "bitcoin"
                    }
                    
                    print(f"  Added {week_key}: ${closest_price:.2f}")
    
    except Exception as e:
        print(f"  Error processing {ticker}: {e}")

# Save updated data
with open('public/data/complete_historical_baseline.json', 'w') as f:
    json.dump(data, f, indent=2)

print("\nHistorical data update completed!")
print("BTC ecosystem now includes:")
print("1. MSTR (MicroStrategy)")
print("2. MARA (MARA Holdings)")
print("3. CEP (XXI Century Capital)")