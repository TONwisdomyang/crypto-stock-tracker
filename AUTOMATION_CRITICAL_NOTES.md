# 🔥 關鍵自動化節點記錄

## ⚠️ 重要：數據更新失效問題解決記錄

**日期**: 2025-08-31
**問題**: 數據未自動更新到8/29，用戶需手動啟動才能更新
**解決**: 修復美股週五收盤自動觸發機制

## 🎯 關鍵數據更新節點

### 觸發時間 (美股週五收盤後5分鐘)
- **夏令時間** (3月-11月): `cron: '5 20 * * 5'` = 週五 UTC 20:05 = 週五 EDT 4:05 PM + 5分鐘
- **標準時間** (11月-3月): `cron: '5 21 * * 5'` = 週五 UTC 21:05 = 週五 EST 4:05 PM + 5分鐘  
- **備用觸發**: `cron: '0 6 * * 6'` = 週六 UTC 06:00 (主要觸發失敗時的備用)

### 核心執行腳本
```
🔥 CRITICAL: 使用 weekly_update.py 而非 etl_lite.py
```

**原因**: 
- `weekly_update.py` - **純增量更新**，只處理最新週期，避免重複處理歷史數據
- `etl_lite.py` - 輕量版但仍可能處理不必要數據

## 📂 生成文件
1. `public/data/weekly_stats.json` - 前端主要數據文件  
2. `public/data/summary.json` - 數據摘要
3. `public/data/complete_historical_baseline.json` - 歷史數據記錄

## 🚨 絕不可再犯的錯誤

### ❌ 錯誤配置 (已修復)
```yaml
# 這是錯的 - 週日觸發
- cron: '59 23 * * 0'   
```

### ✅ 正確配置 (當前)  
```yaml
# 🔥 CRITICAL: US Market Close Friday + 5min
- cron: '5 20 * * 5'   # EDT Summer
- cron: '5 21 * * 5'   # EST Winter  
- cron: '0 6 * * 6'    # Backup Saturday
```

## 🔄 工作流程
1. GitHub Actions 在美股週五收盤後5分鐘觸發
2. 執行 `python weekly_update.py`
3. 只獲取最新週期的股價和幣價數據
4. 生成前端需要的 JSON 格式
5. 提交到 GitHub 觸發 Vercel 重新部署
6. 網站自動顯示最新數據

## ⚡ 性能優化
- **執行時間**: 從 10分鐘降到 5分鐘超時
- **數據處理**: 只處理增量數據，不重新計算歷史數據
- **API 調用**: 最小化外部 API 請求

## 🛡️ 監控要點
- [ ] GitHub Actions 每週五自動執行成功
- [ ] weekly_stats.json 更新到最新週期
- [ ] Vercel 自動重新部署完成  
- [ ] 前端顯示最新數據

## 📋 手動檢查清單
如果自動化再次失效，按此順序檢查：
1. GitHub Actions 工作流是否在週五觸發
2. weekly_update.py 是否執行成功
3. 數據文件是否成功提交到 GitHub
4. Vercel 是否自動重新部署
5. 前端是否清除緩存顯示新數據

---
**重要提醒**: 此文檔記錄了系統最關鍵的自動化節點，任何修改前請仔細閱讀此記錄！