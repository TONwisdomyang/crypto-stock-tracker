#!/usr/bin/env python3
"""
新增公司示例腳本 - 演示如何使用驗證系統新增公司

這個腳本展示了完整的工作流程:
1. 新增公司到系統
2. 自動驗證數據
3. 更新歷史數據 
4. 生成驗證報告
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# 導入我們的驗證系統
from data_validator import DataValidator, ValidationStatus
from add_company_with_validation import CompanyManager

def demo_add_company():
    """示範新增公司的完整流程"""
    
    print("=" * 70)
    print("公司新增驗證系統 - 使用示例")
    print("=" * 70)
    
    # 初始化管理器
    manager = CompanyManager()
    validator = DataValidator()
    
    # 示例：為 SOL 生態新增一家假想的公司
    demo_company = {
        "ticker": "DEMO",
        "company_name": "Demo Solar Corp", 
        "coin": "SOL",
        "holding_qty": 300000
    }
    
    print(f"演示案例: 新增 {demo_company['ticker']} 到 SOL 生態")
    print("-" * 50)
    
    # 步驟 1: 檢查當前狀態
    print("📋 步驟 1: 檢查當前系統狀態")
    holdings = manager.load_holdings()
    sol_companies = [
        ticker for ticker, info in holdings.items() 
        if info.get('coin') == 'SOL'
    ]
    print(f"   當前 SOL 生態公司: {', '.join(sol_companies) if sol_companies else '無'}")
    
    # 步驟 2: 驗證新公司資料
    print("\n🔍 步驟 2: 驗證新公司資料")
    company_data = {
        "company_name": demo_company["company_name"],
        "coin": demo_company["coin"],
        "holding_qty": demo_company["holding_qty"],
        "coin_id": "solana"
    }
    
    # 執行基本驗證
    validation_results = []
    
    # 驗證數據完整性
    completeness_result = validator.validate_data_completeness(
        demo_company["ticker"], company_data
    )
    validation_results.append(completeness_result)
    
    print(f"   數據完整性: {'通過' if completeness_result.status == ValidationStatus.PASS else '失敗'}")
    print(f"   詳情: {completeness_result.message}")
    
    # 注意：這是演示用的假公司，實際股票代碼可能不存在
    print(f"\n   注意: {demo_company['ticker']} 是演示用的假公司代碼")
    print("   在實際使用時，請使用真實存在的股票代碼")
    
    # 步驟 3: 展示如果是真實公司的新增流程
    print("\n✅ 步驟 3: 真實公司新增流程 (以 UPXI 為例)")
    
    real_company = {
        "ticker": "UPXI",
        "company_name": "UPXI Corp",
        "coin": "SOL", 
        "holding_qty": 850000
    }
    
    print(f"   如果要新增 {real_company['ticker']}，指令如下:")
    print(f"   python add_company_with_validation.py add \\")
    print(f"       --ticker {real_company['ticker']} \\")
    print(f"       --company \"{real_company['company_name']}\" \\")
    print(f"       --coin {real_company['coin']} \\")
    print(f"       --quantity {real_company['holding_qty']}")
    
    # 步驟 4: 展示後續流程
    print("\n🔄 步驟 4: 後續必要步驟")
    print("   1. 更新歷史數據: python etl.py")
    print("   2. 完整驗證: python data_validator.py") 
    print("   3. 重啟應用程式")
    print("   4. 檢查 SOL 版塊是否正確顯示新公司")
    
    # 步驟 5: 展示自動化流程
    print("\n🤖 步驟 5: 完全自動化選項")
    print("   一鍵執行完整流程: python auto_validation_etl.py")
    print("   - 自動驗證所有公司")
    print("   - 執行 ETL 更新數據")
    print("   - 再次驗證數據準確性")
    print("   - 生成完整報告")
    
    # 顯示當前支援的代幣
    print(f"\n💰 支援的代幣生態:")
    coin_mappings = {
        "BTC": "bitcoin",
        "ETH": "ethereum", 
        "BNB": "binancecoin",
        "SOL": "solana",
        "TON": "the-open-network",
        "HYPE": "hyperliquid"
    }
    
    for coin, coin_id in coin_mappings.items():
        companies_in_ecosystem = [
            ticker for ticker, info in holdings.items()
            if info.get('coin') == coin
        ]
        count = len(companies_in_ecosystem)
        companies_str = ', '.join(companies_in_ecosystem) if companies_in_ecosystem else "無"
        print(f"   {coin} ({coin_id}): {count}家公司 - {companies_str}")
    
    print("\n" + "=" * 70)
    print("示例完成")
    print("=" * 70)
    
    # 生成使用建議
    print("\n💡 實際使用建議:")
    print("1. 新增公司前，先確認股票代碼在 Yahoo Finance 中有效")
    print("2. 確認持有數量資訊來源可靠")
    print("3. 執行驗證後檢查報告，關注任何警告或錯誤")
    print("4. 定期運行完整驗證以確保數據品質")
    print("5. 保留驗證報告作為審計記錄")

def show_real_world_examples():
    """顯示真實世界的使用案例"""
    
    print("\n" + "=" * 70)
    print("真實使用案例")
    print("=" * 70)
    
    examples = [
        {
            "scenario": "為 SOL 生態新增 Coinbase",
            "ticker": "COIN",
            "company": "Coinbase Global Inc",
            "coin": "SOL",
            "quantity": 1000000,
            "note": "Coinbase 可能持有 SOL 作為庫存"
        },
        {
            "scenario": "為 BTC 生態新增 Tesla", 
            "ticker": "TSLA",
            "company": "Tesla Inc",
            "coin": "BTC",
            "quantity": 42902,
            "note": "Tesla 已公開持有比特幣"
        },
        {
            "scenario": "為 ETH 生態新增 Square",
            "ticker": "SQ", 
            "company": "Square Inc",
            "coin": "ETH",
            "quantity": 500000,
            "note": "Square 可能持有以太坊"
        }
    ]
    
    for i, example in enumerate(examples, 1):
        print(f"\n案例 {i}: {example['scenario']}")
        print(f"指令:")
        print(f"  python add_company_with_validation.py add \\")
        print(f"      --ticker {example['ticker']} \\")
        print(f"      --company \"{example['company']}\" \\")
        print(f"      --coin {example['coin']} \\")
        print(f"      --quantity {example['quantity']}")
        print(f"備註: {example['note']}")

if __name__ == "__main__":
    demo_add_company()
    show_real_world_examples()