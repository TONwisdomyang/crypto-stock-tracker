# 數據驗證系統使用指南

## 系統概述

本系統提供了完整的數據驗證機制，確保新加入的公司和現有公司的數據準確性。當新增底層代幣相對應的公司時，系統會自動進行多層驗證。

## 核心組件

### 1. 數據驗證器 (`data_validator.py`)
- **功能**: 對公司數據進行全面驗證
- **驗證項目**:
  - 股票代碼有效性驗證
  - 股價數據準確性驗證 (與真實市場數據對比)
  - 公司資訊完整性驗證
  - 交易活動驗證 (流動性檢查)

### 2. 公司管理器 (`add_company_with_validation.py`)
- **功能**: 新增、移除、列出公司，並自動執行驗證
- **支援的操作**:
  - 新增公司並驗證
  - 移除公司
  - 列出所有公司
  - 驗證所有現有公司

### 3. 自動驗證 ETL (`auto_validation_etl.py`)
- **功能**: 整合數據驗證和 ETL 流程
- **流程**:
  - Pre-ETL 驗證
  - ETL 數據更新
  - Post-ETL 驗證
  - 生成完整報告

## 使用方式

### 新增公司

```bash
# 新增 UPXI 到 SOL 生態
python add_company_with_validation.py add --ticker UPXI --company "UPXI Corp" --coin SOL --quantity 850000

# 強制新增（覆蓋現有資料）
python add_company_with_validation.py add --ticker UPXI --company "UPXI Corp" --coin SOL --quantity 850000 --force
```

### 列出所有公司

```bash
python add_company_with_validation.py list
```

### 移除公司

```bash
python add_company_with_validation.py remove --ticker UPXI
```

### 驗證所有公司

```bash
# 快速驗證
python add_company_with_validation.py validate

# 詳細驗證報告
python data_validator.py
```

### 完整自動化流程

```bash
# 執行完整的驗證-ETL-驗證流程
python auto_validation_etl.py
```

## 支援的代幣

目前系統支援以下底層代幣：

- **BTC** (Bitcoin) - bitcoin
- **ETH** (Ethereum) - ethereum
- **BNB** (BNB) - binancecoin
- **SOL** (Solana) - solana
- **TON** (The Open Network) - the-open-network
- **HYPE** (Hyperliquid) - hyperliquid

## 驗證標準

### 1. 股票代碼驗證
- ✅ 股票代碼必須在 Yahoo Finance 中有效
- ✅ 能夠獲取公司基本資訊

### 2. 股價準確性驗證
- ✅ 股價差異在 5% 以內: **通過**
- ⚠️ 股價差異在 5-15% 之間: **警告**
- ❌ 股價差異超過 15%: **失敗**

### 3. 數據完整性驗證
- ✅ 必要欄位: `company_name`, `coin`, `holding_qty`, `coin_id`
- ✅ 所有欄位都有有效值

### 4. 交易活動驗證
- ✅ 平均交易量 > 1,000: **正常**
- ⚠️ 平均交易量 < 1,000: **警告低流動性**

## 實際使用流程

### 場景 1: 為 SOL 新增公司

1. **新增公司**:
   ```bash
   python add_company_with_validation.py add --ticker COIN --company "Coinbase Global Inc" --coin SOL --quantity 500000
   ```

2. **系統自動執行**:
   - 驗證 COIN 股票代碼有效性
   - 檢查公司資訊完整性
   - 驗證交易活動
   - 更新 holdings.json

3. **更新歷史數據**:
   ```bash
   python etl.py
   ```

4. **最終驗證**:
   ```bash
   python data_validator.py
   ```

### 場景 2: 完全自動化流程

```bash
# 一鍵執行完整流程
python auto_validation_etl.py
```

## 報告和日誌

### 驗證報告
- 位置: `validation_report_YYYYMMDD_HHMMSS.txt`
- 包含: 詳細驗證結果、統計資訊、問題建議

### 自動 ETL 報告
- 位置: `auto_etl_report_YYYYMMDD_HHMMSS.txt`
- 包含: 完整流程執行日誌、驗證摘要

### 日誌文件
- 位置: `data_validation.log`
- 包含: 所有驗證活動的詳細日誌

## 錯誤處理

### 常見問題和解決方案

1. **股票代碼無效**
   - 檢查股票代碼拼寫
   - 確認公司在美股市場交易
   - 使用 Yahoo Finance 確認代碼正確性

2. **股價數據差異過大**
   - 檢查數據日期是否正確
   - 確認股票在該日期有交易
   - 考慮股票分割、合併等公司行為

3. **API 限制**
   - 系統內建延遲機制
   - 如遇到限制，稍後重試
   - 避免短時間內大量請求

## 最佳實踐

### 新增公司時
1. 先驗證股票代碼有效性
2. 確認持有數量資訊準確
3. 執行完整驗證流程
4. 檢查生成的報告

### 定期維護
1. 定期執行完整驗證: `python data_validator.py`
2. 監控驗證報告中的警告項目
3. 及時更新數據: `python etl.py`

### 數據品質監控
- 關注驗證成功率
- 追蹤股價準確性
- 監控交易活動變化

## 擴展和自訂

### 新增代幣支援
在 `add_company_with_validation.py` 中更新 `coin_mappings`:

```python
self.coin_mappings = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    # ... 現有代幣
    "NEW": "new-coin-id"  # 新增代幣
}
```

### 調整驗證標準
在 `data_validator.py` 中修改:

```python
# 股價容忍範圍
self.price_tolerance = 5.0  # 改為所需百分比

# 交易量門檻
self.volume_threshold = 1000  # 改為所需數量
```

## 技術支援

如遇到問題，請檢查：
1. 日誌文件 (`data_validation.log`)
2. 驗證報告
3. 確認網路連接和 API 可用性

---

**系統版本**: 1.0  
**最後更新**: 2025-08-19  
**相容性**: Python 3.7+, yfinance, pandas