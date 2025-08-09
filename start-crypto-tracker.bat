@echo off
REM 啟動 Crypto-Stock-Tracker 網站
echo 正在啟動 Crypto-Stock-Tracker...
echo.

REM 切換到項目目錄
cd /d "C:\Users\User\crypto-stock-tracker"

REM 檢查 node_modules 是否存在
if not exist "node_modules" (
    echo 首次運行，正在安裝依賴...
    npm install
)

REM 啟動開發服務器
echo 啟動網站伺服器...
echo 網站將在 http://localhost:3000 開啟
echo 按 Ctrl+C 可停止伺服器
echo.

REM 延遲 3 秒後自動開啟瀏覽器
start "" cmd /c "timeout 3 >nul && start http://localhost:3000"

REM 啟動 Next.js 開發服務器
npm run dev

pause