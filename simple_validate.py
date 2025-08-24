import yfinance as yf

# 驗證新公司
companies = {"MARA": "MARA Holdings", "CEP": "XXI Century Capital"}

for ticker, name in companies.items():
    print(f"\n--- {ticker} ({name}) ---")
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        if info and 'symbol' in info:
            price = info.get('regularMarketPrice', info.get('currentPrice', 0))
            print(f"Current Price: ${price:.2f}")
            print(f"Company Name: {info.get('longName', info.get('shortName', 'N/A'))}")
            print(f"Currency: {info.get('currency', 'USD')}")
            print(f"Exchange: {info.get('exchange', 'N/A')}")
            print("Status: OK")
        else:
            print("Status: FAILED - No data")
    except Exception as e:
        print(f"Status: ERROR - {e}")

print("\nValidation completed!")