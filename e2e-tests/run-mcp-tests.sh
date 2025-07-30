#!/bin/bash

# FocusFlow MCP 測試執行腳本
# 版本: 3.0
# 作者: FocusFlow Team

set -e

echo "🚀 FocusFlow MCP 自動化測試開始"
echo "=====================================\n"

# 檢查依賴
echo "📋 檢查測試環境..."

if ! command -v npx &> /dev/null; then
    echo "❌ 錯誤: npx 未安裝。請先安裝 Node.js"
    exit 1
fi

if ! npx playwright --version &> /dev/null; then
    echo "❌ 錯誤: Playwright 未安裝。正在安裝..."
    npx playwright install
fi

# 檢查後端服務
echo "🔍 檢查後端服務狀態..."
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "⚠️  警告: 後端服務未運行 (http://localhost:3001)"
    echo "   請確保運行: npm run backend"
fi

# 檢查前端服務
echo "🔍 檢查前端服務狀態..."
if ! curl -s http://localhost:8081 > /dev/null; then
    echo "⚠️  警告: 前端服務未運行 (http://localhost:8081)"
    echo "   請確保運行: npm start"
fi

# 創建測試結果目錄
echo "📁 準備測試結果目錄..."
mkdir -p test-results/{screenshots,videos,reports,errors}

# 設置環境變量
export PLAYWRIGHT_VIDEO_DIR=./test-results/videos
export PLAYWRIGHT_SCREENSHOT_DIR=./test-results/screenshots

echo "\n🎬 開始執行 MCP YAML 驅動測試..."
echo "=====================================\n"

# 執行測試
npx playwright test mcp-yaml-executor.spec.ts \
  --reporter=html \
  --output-dir=test-results \
  --video=on \
  --screenshot=only-on-failure \
  --trace=on

TEST_EXIT_CODE=$?

echo "\n📊 測試執行完成"
echo "=====================================\n"

# 檢查測試結果
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 所有測試通過！"
else
    echo "❌ 部分測試失敗 (退出碼: $TEST_EXIT_CODE)"
fi

# 顯示生成的報告
echo "\n📄 生成的報告和文件:"
echo "-----------------------------------"

if [ -f "test-results/reports/mcp-test-report-*.json" ]; then
    echo "📊 主測試報告: $(ls -1 test-results/reports/mcp-test-report-*.json | head -1)"
fi

if [ -f "test-results/error-report.html" ]; then
    echo "🚨 錯誤報告: test-results/error-report.html"
fi

if [ -f "test-results/screenshot-gallery.html" ]; then
    echo "📷 截圖集: test-results/screenshot-gallery.html"
fi

if [ -f "playwright-report/index.html" ]; then
    echo "🎭 Playwright 報告: playwright-report/index.html"
fi

# 統計截圖和視頻
SCREENSHOT_COUNT=$(find test-results/screenshots -name "*.png" 2>/dev/null | wc -l)
VIDEO_COUNT=$(find test-results/videos -name "*.webm" 2>/dev/null | wc -l)

echo "\n📈 測試統計:"
echo "-----------------------------------"
echo "📷 截圖數量: $SCREENSHOT_COUNT"
echo "🎥 視頻數量: $VIDEO_COUNT"

if [ -d "test-results/errors" ]; then
    ERROR_COUNT=$(find test-results/errors -name "*.json" 2>/dev/null | wc -l)
    echo "🚨 錯誤記錄: $ERROR_COUNT"
fi

# 計算測試結果目錄總大小
TOTAL_SIZE=$(du -sh test-results/ 2>/dev/null | cut -f1)
echo "💾 結果總大小: $TOTAL_SIZE"

echo "\n🌐 查看報告:"
echo "-----------------------------------"
echo "在瀏覽器中打開以下文件查看詳細報告："

if [ -f "playwright-report/index.html" ]; then
    echo "• file://$(pwd)/playwright-report/index.html (Playwright 報告)"
fi

if [ -f "test-results/error-report.html" ]; then
    echo "• file://$(pwd)/test-results/error-report.html (錯誤報告)"
fi

if [ -f "test-results/screenshot-gallery.html" ]; then
    echo "• file://$(pwd)/test-results/screenshot-gallery.html (截圖集)"
fi

echo "\n✨ MCP 測試執行完成！"

# 如果有失敗的測試，返回相應的退出碼
exit $TEST_EXIT_CODE