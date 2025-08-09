# Update Data Command

**Description**: Run the complete ETL pipeline to update crypto-stock data

**Usage**: `claude update-data`

## Command
```bash
cd "${PROJECT_ROOT}" && python etl.py && python baseline_etl.py
```

## Purpose
- Collects latest stock prices from Yahoo Finance
- Fetches current crypto prices from CoinGecko  
- Updates weekly baseline data (Monday 8AM UTC+8)
- Generates correlation analysis data

## When to Use
- After adding new stock-crypto pairs
- To manually update data before weekly schedule
- When testing data pipeline changes

## Output Files
- `public/data/weekly_stats.json` - Current week data
- `public/data/historical_baseline.json` - Historical baseline data