#!/usr/bin/env python3
import json

with open('public/data/complete_historical_baseline.json', 'r') as f:
    data = json.load(f)

print('數據差異分析:')
for week in sorted(data['data'].keys()):
    week_data = data['data'][week]['companies']
    print(f'{week} ({data["data"][week]["baseline_date"]}):')
    for ticker in ['MSTR', 'BNC', 'SBET']:
        if ticker in week_data:
            company = week_data[ticker]
            print(f'  {ticker}: stock=${company["stock_price"]}, {company["coin"]}=${company["coin_price"]}')
    print()