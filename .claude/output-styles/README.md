# Claude-Flow Inspired Output Styles Collection

這個集合包含了受到 [claude-flow](https://github.com/ruvnet/claude-flow) 專案啟發的進階 output styles，實現了 Queen Agent 協調系統和多代理協作的創新概念。

## 🚀 樣式概覽

### 1. 👑 Queen Coordinator (`queen-coordinator.md`)
**適用場景**: 複雜的多步驟專案和系統級任務
**核心特色**:
- Queen Agent 主導的分層協調系統
- 8 個專業虛擬代理（Architect、Engineer、Analyst、Guardian、Researcher 等）
- SWARM（快速任務）和 HIVE-MIND（複雜專案）兩種協調模式
- 會話上下文管理和跨會話學習

**啟用命令**:
```bash
/output-style queen-coordinator
```

**使用範例**:
```
我需要設計一個完整的使用者認證系統，包括 JWT token、權限管理和安全性考量。

啟動 HIVE-MIND 模式協調系統設計。
```

### 2. 🏦 Crypto Hive Mind (`crypto-hive-mind.md`)
**適用場景**: 加密貨幣和股票市場相關的專業任務
**核心特色**:
- 專業化的金融領域代理（Market Analyst、Risk Manager、Trading Engine 等）
- RAPID-FIRE（市場事件）和 DEEP-DIVE（策略開發）協調模式
- 多數據源整合（Alpha Vantage、CoinGecko、Yahoo Finance）
- 實時市場協調和自動化響應協議

**啟用命令**:
```bash
/output-style crypto-hive-mind
```

**使用範例**:
```
分析當前 BTC 價格行為對整體投資組合的影響，並提供風險管理建議。

部署 RAPID-FIRE 市場響應模式。
```

### 3. 🐝 Swarm Mode (`swarm-mode.md`)
**適用場景**: 需要多專業協作但不需要深度持久化的日常開發任務
**核心特色**:
- 輕量級多代理協調（2-5 個專家）
- 快速任務評估和複雜度分析
- 並行/序列/混合協調類型
- 專門化代理快速配置文件

**啟用命令**:
```bash
/output-style swarm-mode
```

**使用範例**:
```
新增加密貨幣到追蹤列表，需要 API 整合和 UI 更新。

部署開發群組進行快速實作。
```

### 4. 🧠 Memory Keeper (`memory-keeper.md`)
**適用場景**: 需要跨會話上下文保持和學習累積的長期專案
**核心特色**:
- 持久化記憶和上下文管理
- 專案知識庫和會話歷史追蹤
- 學習模式識別和預測性協助
- 使用者互動模式學習和適應

**啟用命令**:
```bash
/output-style memory-keeper
```

**使用範例**:
```
繼續上次的投資組合優化工作，需要整合之前的分析結果。

啟用記憶保持器載入專案上下文。
```

## 🔧 使用指南

### 基本操作
1. **檢視可用樣式**:
   ```bash
   /output-style
   ```

2. **直接切換樣式**:
   ```bash
   /output-style [樣式名稱]
   ```

3. **回到預設樣式**:
   ```bash
   /output-style default
   ```

### 場景選擇建議

#### 🏗️ 系統設計和架構任務
- **推薦**: `queen-coordinator` 
- **模式**: HIVE-MIND
- **適用**: 需要多個專業領域協作的複雜設計

#### 📊 金融數據分析和交易系統
- **推薦**: `crypto-hive-mind`
- **模式**: RAPID-FIRE（緊急）/ DEEP-DIVE（策略）
- **適用**: 市場分析、風險評估、交易策略開發

#### ⚡ 日常開發和功能實作
- **推薦**: `swarm-mode`
- **協調類型**: 根據任務複雜度自動選擇
- **適用**: 功能新增、錯誤修復、小型優化

#### 🎯 長期專案和學習累積
- **推薦**: `memory-keeper`
- **特色**: 跨會話上下文和學習持久化
- **適用**: 持續演進的專案、知識積累型任務

### 樣式組合使用

你可以在同一個專案中根據不同任務切換樣式：

```bash
# 專案初始設計階段
/output-style queen-coordinator

# 具體功能開發
/output-style swarm-mode  

# 金融數據處理
/output-style crypto-hive-mind

# 長期上下文管理
/output-style memory-keeper
```

## 🎯 進階技巧

### 1. 明確指定協調模式
在請求中明確說明希望使用的協調模式：
```
啟動 HIVE-MIND 模式設計完整的 API 架構
部署 SWARM 模式快速修復認證錯誤
激活 RAPID-FIRE 模式分析市場突發事件
```

### 2. 代理角色指定
可以在請求中指定希望哪些代理參與：
```
需要 Market Analyst 和 Risk Manager 協作分析投資組合
請 Architect 和 Engineer 協作設計資料庫架構
```

### 3. 跨樣式工作流程
複雜專案可以跨越多個樣式：
```
1. queen-coordinator: 系統整體設計
2. crypto-hive-mind: 金融邏輯實作
3. swarm-mode: 具體功能開發
4. memory-keeper: 專案知識保存
```

## 🔄 樣式客製化

每個樣式都可以根據你的具體需求進行調整：

1. **編輯現有樣式**: 直接修改 `.md` 檔案
2. **創建變體**: 複製並修改為專案特定版本
3. **組合特性**: 將不同樣式的特色融合

## 📚 學習資源

- **Claude-Flow 原始專案**: https://github.com/ruvnet/claude-flow
- **Claude Code 官方文檔**: https://docs.anthropic.com/en/docs/claude-code/output-styles
- **MCP 協議文檔**: https://docs.anthropic.com/en/docs/claude-code/mcp

## 🚨 注意事項

1. **效能考量**: 複雜的協調模式會增加響應時間，根據任務複雜度選擇合適的樣式
2. **上下文限制**: 某些樣式會產生較長的輸出，注意上下文長度管理
3. **學習曲線**: 新樣式需要一些時間適應，建議從簡單任務開始嘗試

這些樣式將 Claude Code 從單純的程式設計助手轉變為智慧型專案協調平台，大幅提升複雜任務的處理效率和品質。