#!/usr/bin/env python3
"""
Check real historical prices for VERB to verify data accuracy
"""

import yfinance as yf
from datetime import datetime

def check_verb_prices():
    print("Checking VERB real historical prices...")
    
    verb = yf.Ticker('VERB')
    hist = verb.history(start='2025-07-01', end='2025-08-20')
    
    print('\nVERB Real Friday Closing Prices:')
    print('=' * 40)
    
    for date, row in hist.iterrows():
        if date.weekday() == 4:  # Friday
            print(f'{date.strftime("%Y-%m-%d")} (Friday): ${row["Close"]:.2f}')
    
    print('\nAll VERB prices in July-August 2025:')
    print('=' * 40)
    
    for date, row in hist.iterrows():
        day_name = date.strftime("%a")
        print(f'{date.strftime("%Y-%m-%d")} ({day_name}): ${row["Close"]:.2f}')

if __name__ == "__main__":
    check_verb_prices()