#!/usr/bin/env python3
"""
新增公司自動驗證系統 - Add Company with Validation
當新增公司時，自動進行數據驗證並更新系統數據

使用方法:
python add_company_with_validation.py --ticker UPXI --company "UPXI Corp" --coin SOL --quantity 850000

功能:
1. 驗證股票代碼有效性
2. 驗證股價數據準確性  
3. 自動更新 holdings.json
4. 自動運行 ETL 流程獲取歷史數據
5. 生成驗證報告
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# 導入我們的驗證器
from data_validator import DataValidator, ValidationStatus

class CompanyManager:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.data_dir = self.base_dir / "public" / "data"
        self.validator = DataValidator()
        
        # 代幣映射
        self.coin_mappings = {
            "BTC": "bitcoin",
            "ETH": "ethereum", 
            "BNB": "binancecoin",
            "SOL": "solana",
            "TON": "the-open-network",
            "HYPE": "hyperliquid"
        }
    
    def load_holdings(self) -> Dict[str, Any]:
        """載入現有的 holdings.json"""
        holdings_file = self.data_dir / "holdings.json"
        
        if holdings_file.exists():
            with open(holdings_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def save_holdings(self, holdings: Dict[str, Any]) -> None:
        """保存 holdings.json"""
        holdings_file = self.data_dir / "holdings.json"
        
        with open(holdings_file, 'w', encoding='utf-8') as f:
            json.dump(holdings, f, indent=2, ensure_ascii=False)
        
        print(f"✅ holdings.json 已更新")
    
    def add_company(self, ticker: str, company_name: str, coin: str, 
                   holding_qty: int, force: bool = False) -> bool:
        """新增公司並進行驗證"""
        
        print(f"🏢 準備新增公司: {ticker}")
        print(f"   公司名稱: {company_name}")
        print(f"   持有代幣: {coin}")
        print(f"   持有數量: {holding_qty:,}")
        print("-" * 50)
        
        # 1. 檢查代幣是否支援
        if coin not in self.coin_mappings:
            print(f"❌ 不支援的代幣: {coin}")
            print(f"   支援的代幣: {', '.join(self.coin_mappings.keys())}")
            return False
        
        # 2. 檢查公司是否已存在
        holdings = self.load_holdings()
        if ticker in holdings and not force:
            print(f"⚠️ 公司 {ticker} 已存在")
            print("   如果要覆蓋現有資料，請使用 --force 參數")
            return False
        
        # 3. 建立公司資料
        company_data = {
            "company_name": company_name,
            "coin": coin,
            "holding_qty": holding_qty,
            "coin_id": self.coin_mappings[coin]
        }
        
        # 4. 執行驗證
        print("🔍 開始驗證公司資料...")
        
        validation_passed = self.validator.quick_validate_new_company(ticker, company_data)
        
        if not validation_passed and not force:
            print("❌ 驗證失敗，公司未新增")
            print("   如果要強制新增，請使用 --force 參數")
            return False
        
        # 5. 更新 holdings.json
        holdings[ticker] = company_data
        self.save_holdings(holdings)
        
        print(f"✅ 公司 {ticker} 已成功新增到系統中")
        
        # 6. 建議後續步驟
        print("\n📝 建議後續步驟:")
        print("1. 運行 ETL 更新歷史數據:")
        print("   python etl.py")
        print("2. 運行完整驗證:")
        print("   python data_validator.py") 
        print("3. 重啟應用程式查看結果")
        
        return True
    
    def remove_company(self, ticker: str) -> bool:
        """移除公司"""
        holdings = self.load_holdings()
        
        if ticker not in holdings:
            print(f"❌ 公司 {ticker} 不存在")
            return False
        
        company_name = holdings[ticker].get("company_name", "Unknown")
        del holdings[ticker]
        
        self.save_holdings(holdings)
        print(f"✅ 公司 {ticker} ({company_name}) 已從系統中移除")
        
        return True
    
    def list_companies(self) -> None:
        """列出所有公司"""
        holdings = self.load_holdings()
        
        if not holdings:
            print("📋 目前系統中沒有公司資料")
            return
        
        print(f"📋 系統中的公司列表 ({len(holdings)} 家):")
        print("-" * 80)
        
        # 按代幣分組
        by_coin = {}
        for ticker, info in holdings.items():
            coin = info.get("coin", "Unknown")
            if coin not in by_coin:
                by_coin[coin] = []
            by_coin[coin].append((ticker, info))
        
        for coin, companies in sorted(by_coin.items()):
            print(f"\n🪙 {coin}:")
            for ticker, info in companies:
                company_name = info.get("company_name", "Unknown")
                holding_qty = info.get("holding_qty", 0)
                print(f"   📈 {ticker}: {company_name} (持有: {holding_qty:,})")

def main():
    parser = argparse.ArgumentParser(description="新增公司並進行自動驗證")
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 新增公司命令
    add_parser = subparsers.add_parser('add', help='新增公司')
    add_parser.add_argument('--ticker', required=True, help='股票代碼 (例如: UPXI)')
    add_parser.add_argument('--company', required=True, help='公司名稱 (例如: "UPXI Corp")')
    add_parser.add_argument('--coin', required=True, help='持有代幣 (BTC/ETH/BNB/SOL/TON/HYPE)')
    add_parser.add_argument('--quantity', type=int, required=True, help='持有數量')
    add_parser.add_argument('--force', action='store_true', help='強制新增（覆蓋現有資料）')
    
    # 移除公司命令
    remove_parser = subparsers.add_parser('remove', help='移除公司')
    remove_parser.add_argument('--ticker', required=True, help='要移除的股票代碼')
    
    # 列出公司命令
    list_parser = subparsers.add_parser('list', help='列出所有公司')
    
    # 驗證所有公司命令
    validate_parser = subparsers.add_parser('validate', help='驗證所有公司')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = CompanyManager()
    
    if args.command == 'add':
        success = manager.add_company(
            ticker=args.ticker.upper(),
            company_name=args.company,
            coin=args.coin.upper(),
            holding_qty=args.quantity,
            force=args.force
        )
        sys.exit(0 if success else 1)
        
    elif args.command == 'remove':
        success = manager.remove_company(args.ticker.upper())
        sys.exit(0 if success else 1)
        
    elif args.command == 'list':
        manager.list_companies()
        
    elif args.command == 'validate':
        print("🔍 開始驗證所有公司...")
        validator = DataValidator()
        results = validator.validate_all_companies()
        report = validator.generate_validation_report(results)
        print(report)
        validator.save_report(report)

if __name__ == "__main__":
    main()