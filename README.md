# 🪙 CryptoStock Tracker

一個現代化的 Web 應用程式，用於追蹤持有加密貨幣的上市公司股價與其持有加密幣價格的相關性分析。

![Dashboard Preview](docs/dashboard-preview.png)

## 🎯 功能特點

### 📊 **即時數據追蹤**
- 📈 股價數據 (Yahoo Finance)
- 🪙 加密貨幣價格 (CoinGecko)
- 💰 公司持幣量與市場佔比
- 📊 相關性分析

### 🎨 **現代化界面**
- 🌙 暗色主題設計
- 📱 響應式布局
- 📊 互動式圖表 (Recharts)
- ⚡ 快速載入

### 🤖 **自動化更新**
- 🕐 每週日自動更新數據
- 🔄 GitHub Actions 自動化
- 📈 歷史趨勢追蹤

## 🏗️ 技術架構

```
用戶端 → Vercel (Next.js SSG)
          ↑
   weekly_stats.json + holdings.json  
          ↑
GitHub Actions (每週日) → Python ETL → Yahoo Finance / CoinGecko
```

### 前端技術棧
- **Next.js 15** - React 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式框架
- **Recharts** - 數據可視化

### 後端 & ETL
- **Python 3.11** - ETL 處理
- **yfinance** - 股票數據 API
- **CoinGecko API** - 加密貨幣數據
- **GitHub Actions** - 自動化工作流

## 🚀 快速開始

### 1. 克隆項目
```bash
git clone https://github.com/your-username/crypto-stock-tracker.git
cd crypto-stock-tracker
```

### 2. 安裝依賴
```bash
# 安裝 Node.js 依賴
npm install

# 安裝 Python 依賴  
pip install -r requirements.txt
```

### 3. 運行開發服務器
```bash
# 啟動前端開發服務器
npm run dev

# 或手動執行 ETL 更新數據
python etl.py
```

### 4. 訪問應用
打開 [http://localhost:3000](http://localhost:3000) 查看應用

## 📋 支持的公司

| 股票代碼 | 公司名稱 | 持有幣種 | 持幣量 | 佔總供應量 |
|---------|----------|----------|--------|------------|
| MSTR | MicroStrategy | BTC | 214,000 | 1.02% |
| COIN | Coinbase Global | BTC | 9,000 | 0.04% |
| RIOT | Riot Platforms | BTC | 15,000 | 0.07% |
| TSLA | Tesla Inc. | BTC | 42,000 | 0.20% |

*持幣數據來源：公司財報和 10-K 文件*

## 🔧 配置

### 修改持幣數據
編輯 `public/data/holdings.json` 文件：

```json
{
  "TICKER": {
    "company_name": "Company Name Inc.",
    "coin": "BTC",
    "holding_qty": 10000,
    "coin_id": "bitcoin"
  }
}
```

### 環境變量
創建 `.env.local` 文件：
```env
# 如果需要 CoinGecko Pro API
COINGECKO_API_KEY=your_api_key_here
```

## 🤖 自動化工作流

### GitHub Actions
- **每週更新**: 每週日 23:59 UTC 自動執行 ETL
- **手動觸發**: 支援手動執行和測試
- **自動部署**: 數據更新後自動觸發 Vercel 重新部署

### 工作流程
1. 📥 從 Yahoo Finance 獲取股價
2. 📥 從 CoinGecko 獲取幣價  
3. 🔄 計算持幣佔比和相關性
4. 💾 生成 JSON 數據文件
5. 📤 提交到 GitHub 並觸發部署

## 📊 數據格式

### weekly_stats.json
```json
{
  "week_end": "2025-08-03",
  "generated_at": "2025-08-03T10:30:00Z",
  "data": [
    {
      "ticker": "MSTR",
      "company_name": "MicroStrategy Inc.",
      "stock_close": 1280.50,
      "stock_pct_change": 3.2,
      "coin": "BTC", 
      "coin_close": 61985,
      "coin_pct_change": 2.1,
      "holding_qty": 214000,
      "holding_pct_of_supply": 1.02,
      "market_cap": 28500000000
    }
  ]
}
```

## 🧪 測試

### 前端測試
```bash
npm run lint      # ESLint 檢查
npm run build     # 構建測試
npm run start     # 生產模式測試
```

### ETL 測試
```bash
python etl.py     # 執行 ETL 管道
```

### E2E 測試 (使用 Playwright)
```bash
npx playwright test
```

## 🚀 部署

### Vercel 部署
1. 連接 GitHub 倉庫
2. 設置環境變量（如需要）
3. 自動部署設置完成

### 手動部署
```bash
npm run build
npm run start
```

## 📈 性能優化

- ⚡ **靜態生成**: Next.js SSG 預生成頁面
- 📦 **圖片優化**: Next.js 圖像優化
- 🎯 **按需載入**: 組件懶加載
- 🗜️ **數據緩存**: API 響應緩存

## 🛡️ API 限制

| API | 限制 | 處理方式 |
|-----|------|----------|
| Yahoo Finance | 2000 req/day | 批量請求 + 緩存 |
| CoinGecko Free | 50 req/min | 速率限制 + 重試 |

## 🤝 貢獻指南

1. Fork 項目
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打開 Pull Request

## 📄 許可證

此項目采用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## ⚠️ 免責聲明

本工具僅供參考，不構成投資建議。投資有風險，請謹慎決策。

## 🙋‍♂️ 支持

如有問題或建議，請：
- 創建 [Issue](https://github.com/your-username/crypto-stock-tracker/issues)
- 發送郵件至 your-email@example.com
- 參與 [討論區](https://github.com/your-username/crypto-stock-tracker/discussions)

---

Made with ❤️ using [Claude Code](https://claude.ai/code)