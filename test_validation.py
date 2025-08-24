#!/usr/bin/env python3

from data_validator import DataValidator, ValidationStatus
import json

def test_validation_system():
    """測試驗證系統的基本功能"""
    
    print("=" * 60)
    print("數據驗證系統測試")
    print("=" * 60)
    
    validator = DataValidator()
    
    # 測試 1: 股票代碼驗證
    print("\n1. 測試股票代碼驗證:")
    print("-" * 30)
    
    test_tickers = ["UPXI", "MSTR", "INVALID_TICKER"]
    
    for ticker in test_tickers:
        print(f"\n測試 {ticker}:")
        result = validator.validate_stock_ticker(ticker)
        
        status_text = "通過" if result.status == ValidationStatus.PASS else "失敗"
        print(f"  結果: {status_text}")
        print(f"  訊息: {result.message}")
        
        if result.details and result.status == ValidationStatus.PASS:
            print(f"  公司名稱: {result.details.get('company_name', 'N/A')}")
    
    # 測試 2: 數據完整性驗證
    print("\n\n2. 測試數據完整性驗證:")
    print("-" * 30)
    
    # 完整數據
    complete_data = {
        "company_name": "UPXI Corp",
        "coin": "SOL", 
        "holding_qty": 850000,
        "coin_id": "solana"
    }
    
    # 不完整數據
    incomplete_data = {
        "company_name": "Test Corp",
        "coin": "SOL"
        # 缺少 holding_qty 和 coin_id
    }
    
    print("\n測試完整數據:")
    result = validator.validate_data_completeness("UPXI", complete_data)
    status_text = "通過" if result.status == ValidationStatus.PASS else "失敗"
    print(f"  結果: {status_text}")
    print(f"  訊息: {result.message}")
    
    print("\n測試不完整數據:")
    result = validator.validate_data_completeness("TEST", incomplete_data)
    status_text = "通過" if result.status == ValidationStatus.PASS else "失敗"
    print(f"  結果: {status_text}")
    print(f"  訊息: {result.message}")
    
    # 測試 3: 檢查現有公司數據
    print("\n\n3. 檢查現有公司數據:")
    print("-" * 30)
    
    try:
        data = validator.load_company_data()
        holdings = data["holdings"]
        
        print(f"\n當前系統中的公司數量: {len(holdings)}")
        
        for ticker, info in list(holdings.items())[:3]:  # 只顯示前3個
            print(f"\n{ticker}:")
            print(f"  公司名稱: {info.get('company_name', 'N/A')}")
            print(f"  持有代幣: {info.get('coin', 'N/A')}")
            print(f"  持有數量: {info.get('holding_qty', 0):,}")
            
    except Exception as e:
        print(f"讀取公司數據時出錯: {e}")
    
    print("\n" + "=" * 60)
    print("測試完成")
    print("=" * 60)

if __name__ == "__main__":
    test_validation_system()