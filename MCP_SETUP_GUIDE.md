# MCP 設定指南

## 🔧 已修復的問題

✅ **Windows cmd 包裝器問題** - 已將所有 MCP 服務器改為使用 `cmd /c` 包裝器
✅ **缺失環境變數問題** - 已暫時使用假值來避免啟動錯誤
✅ **移除 GitHub MCP** - 由於已有 Git CLI 和 `gh` 命令，移除重複的 GitHub MCP
✅ **移除 Brave Search MCP** - 由於已有 Playwright MCP 和 Web Search MCP，移除重複功能

## 🚀 如何啟用完整功能

### 1. 設定 PostgreSQL 連接字串 (可選)
```bash
# 在命令提示字元中設定
setx DATABASE_URL "postgresql://user:password@localhost:5432/database"
```

## 📋 當前可用的 MCP 服務

### ✅ 可直接使用
- **filesystem** - 檔案系統操作
- **web-search** - 網路搜尋 (不需要 API Key)

### ⚠️ 需要設定才能使用  
- **postgres** - 需要 DATABASE_URL (資料庫操作)

### 🚫 已移除 (避免功能重複)
- **github** - 改用 Git CLI 和 `gh` 命令替代
- **brave-search** - 改用 Playwright MCP 和 Web Search MCP 替代

### 🎭 個人配置中的額外工具
- **playwright** - 瀏覽器自動化和動態網頁互動 (在個人 `.claude.json` 中配置)

## 🔍 Context7 MCP 狀態

✅ **已發現** - Context7 MCP 已安裝在您的 `cryptosite` 項目中
❌ **當前項目未配置** - 需要手動添加到此項目

### 如何添加 Context7 到當前項目

#### 方法 1: 使用 Claude CLI 命令
```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

#### 方法 2: 手動添加到項目配置
在 `C:\Users\User\crypto-stock-tracker\.mcp.json` 中添加：
```json
"context7": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@context7/mcp"],
  "env": {}
}
```

#### 方法 3: 使用 HTTP 方式 (推薦)
由於 Context7 使用 HTTP 協議，需要在個人 Claude 配置中添加，而不是項目配置文件。

## 🔄 重新啟動 Claude Code

設定完環境變數後，請重新啟動 Claude Code 讓變更生效：

```bash
# 關閉目前的 Claude Code
# 重新開啟 Claude Code
claude
```

## 🧪 測試 MCP 連接

重新啟動後，使用以下命令測試：
```bash
/mcp
```

應該看到更少的警告訊息。

## 💡 提示

- 不是所有 MCP 服務都是必需的，根據你的需求選擇設定
- 如果不需要某個服務，可以從 `.mcp.json` 中移除該設定
- Playwright MCP 是獨立配置，在你的個人 `.claude.json` 中