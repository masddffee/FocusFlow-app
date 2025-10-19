#!/bin/bash

# FocusFlow AI 修復驗證測試執行腳本
# 專門測試 AI 品質修復後的實際效果
# 版本: 1.0
# 作者: FocusFlow Team

set -e

echo "🎯 FocusFlow AI 修復驗證測試開始"
echo "========================================\n"

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

# 檢查服務狀態
echo "🔍 檢查前後端服務狀態..."

BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 || echo "000")

if [ "$BACKEND_HEALTH" != "200" ]; then
    echo "❌ 錯誤: 後端服務未運行 (http://localhost:3000)"
    echo "   請確保運行: npm run backend"
    echo "   期望的健康狀態碼: 200, 實際: $BACKEND_HEALTH"
    exit 1
fi

if [ "$FRONTEND_HEALTH" != "200" ]; then
    echo "❌ 錯誤: 前端服務未運行 (http://localhost:8081)"
    echo "   請確保運行: npm start"
    echo "   期望的健康狀態碼: 200, 實際: $FRONTEND_HEALTH"
    exit 1
fi

echo "✅ 前後端服務狀態正常"

# 檢查 AI 修復配置
echo "🔧 檢查 AI 修復配置..."

# 檢查環境變數
if ! grep -q "GEMINI_MAX_TOKENS=6000" ../focusflow-backend/.env; then
    echo "⚠️  警告: GEMINI_MAX_TOKENS 可能未正確設置為 6000"
fi

echo "✅ 配置檢查完成"

# 創建測試結果目錄
echo "📁 準備測試結果目錄..."
mkdir -p test-results/ai-fix-validation/{screenshots,videos,reports,errors}

# 設置環境變量
export PLAYWRIGHT_VIDEO_DIR=./test-results/ai-fix-validation/videos
export PLAYWRIGHT_SCREENSHOT_DIR=./test-results/ai-fix-validation/screenshots

echo "\n🚀 開始執行 AI 修復驗證測試..."
echo "========================================\n"

# 記錄測試開始時間
TEST_START_TIME=$(date +%s)

# 執行測試
npx playwright test ai-fix-validation-executor.spec.ts --reporter=html

TEST_EXIT_CODE=$?
TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

echo "\n📊 AI 修復驗證測試執行完成"
echo "========================================"

# 檢查測試結果
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 所有 AI 修復驗證測試通過！"
    echo "🎉 AI 品質修復成功！"
else
    echo "❌ 部分 AI 修復驗證測試失敗 (退出碼: $TEST_EXIT_CODE)"
    echo "🔍 請檢查詳細報告了解失敗原因"
fi

echo "\n📄 生成的報告和文件:"
echo "---------------------------------------"

# 檢查並顯示報告文件
if [ -f "test-results/ai-fix-validation/reports/validation-report.html" ]; then
    echo "📊 AI 修復驗證報告: test-results/ai-fix-validation/reports/validation-report.html"
fi

if [ -f "test-results/ai-fix-validation/reports/validation-report.json" ]; then
    echo "📋 詳細數據報告: test-results/ai-fix-validation/reports/validation-report.json"
fi

if [ -f "playwright-report/index.html" ]; then
    echo "🎭 Playwright 測試報告: playwright-report/index.html"
fi

# 統計測試資產
SCREENSHOT_COUNT=$(find test-results/ai-fix-validation/screenshots -name "*.png" 2>/dev/null | wc -l)
VIDEO_COUNT=$(find test-results/ai-fix-validation/videos -name "*.webm" 2>/dev/null | wc -l)
TRACE_COUNT=$(find test-results/ai-fix-validation -name "*.zip" 2>/dev/null | wc -l)

echo "\n📈 測試統計:"
echo "---------------------------------------"
echo "⏱️ 執行時間: ${TEST_DURATION}秒"
echo "📷 截圖數量: $SCREENSHOT_COUNT"
echo "🎥 視頻數量: $VIDEO_COUNT"
echo "🔍 追蹤檔案: $TRACE_COUNT"

# 計算測試結果目錄總大小
if [ -d "test-results/ai-fix-validation" ]; then
    TOTAL_SIZE=$(du -sh test-results/ai-fix-validation/ 2>/dev/null | cut -f1)
    echo "💾 結果總大小: $TOTAL_SIZE"
fi

# 提取和顯示關鍵指標
echo "\n🎯 AI 修復效果摘要:"
echo "---------------------------------------"

if [ -f "test-results/ai-fix-validation/reports/validation-report.json" ]; then
    # 使用 jq 提取關鍵指標（如果有安裝）
    if command -v jq &> /dev/null; then
        AVG_PROCESSING_TIME=$(jq -r '.performanceMetrics.averageProcessingTime' test-results/ai-fix-validation/reports/validation-report.json 2>/dev/null || echo "N/A")
        API_RELIABILITY=$(jq -r '.performanceMetrics.apiReliabilityRate' test-results/ai-fix-validation/reports/validation-report.json 2>/dev/null || echo "N/A")
        PASSED_TESTS=$(jq -r '.summary.passed' test-results/ai-fix-validation/reports/validation-report.json 2>/dev/null || echo "N/A")
        TOTAL_TESTS=$(jq -r '.summary.totalTests' test-results/ai-fix-validation/reports/validation-report.json 2>/dev/null || echo "N/A")
        
        echo "⚡ 平均處理時間: ${AVG_PROCESSING_TIME}ms (目標: <10000ms)"
        echo "🛡️ API 可靠性: ${API_RELIABILITY}% (目標: 100%)"
        echo "✅ 測試通過率: ${PASSED_TESTS}/${TOTAL_TESTS}"
        
        # 判斷修復效果
        if [ "$AVG_PROCESSING_TIME" != "N/A" ] && [ $(echo "$AVG_PROCESSING_TIME < 10000" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
            echo "🚀 處理速度修復: ✅ 成功"
        else
            echo "🚀 處理速度修復: ❌ 需要改進"
        fi
        
        if [ "$API_RELIABILITY" != "N/A" ] && [ $(echo "$API_RELIABILITY == 100" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
            echo "🔧 API 可靠性修復: ✅ 成功"
        else
            echo "🔧 API 可靠性修復: ❌ 需要改進"
        fi
    else
        echo "📊 詳細指標請查看 JSON 報告（需要安裝 jq 工具以顯示摘要）"
    fi
fi

echo "\n🌐 查看詳細報告:"
echo "---------------------------------------"
echo "在瀏覽器中打開以下文件查看詳細結果："

if [ -f "test-results/ai-fix-validation/reports/validation-report.html" ]; then
    echo "• file://$(pwd)/test-results/ai-fix-validation/reports/validation-report.html"
fi

if [ -f "playwright-report/index.html" ]; then
    echo "• file://$(pwd)/playwright-report/index.html"
fi

# 根據測試結果給出建議
echo "\n💡 建議:"
echo "---------------------------------------"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 恭喜！AI 修復效果良好，所有驗證測試通過。"
    echo "📈 可以考慮進行生產環境部署。"
else
    echo "🔍 部分測試失敗，建議："
    echo "   1. 檢查詳細報告了解失敗原因"
    echo "   2. 檢查 AI 服務配置是否正確"
    echo "   3. 確認網路連接和 API 金鑰"
    echo "   4. 查看後端日誌了解詳細錯誤"
fi

echo "\n✨ AI 修復驗證測試完成！"

# 如果有失敗的測試，返回相應的退出碼
exit $TEST_EXIT_CODE