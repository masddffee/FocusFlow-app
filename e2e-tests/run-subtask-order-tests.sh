#!/bin/bash

# 子任務順序驗證測試運行腳本
# Phase 5: 執行端到端測試驗證排序修復效果

echo "🚀 開始執行子任務順序驗證測試"
echo "==============================================="

# 設置測試環境
export NODE_ENV=test
export LOG_LEVEL=ERROR

# 創建測試結果目錄
mkdir -p test-results/screenshots
mkdir -p test-results/reports
mkdir -p test-results/errors

echo "📁 測試結果目錄已創建"

# 檢查端口是否可用
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ 端口 $port 已在使用中"
        return 0
    else
        echo "❌ 端口 $port 未使用"
        return 1
    fi
}

# 啟動服務（如果尚未運行）
echo "🔍 檢查服務狀態..."

if ! check_port 8080; then
    echo "🚀 啟動後端服務..."
    npm run backend &
    BACKEND_PID=$!
    echo "後端 PID: $BACKEND_PID"
    sleep 10
fi

if ! check_port 8081; then
    echo "🚀 啟動前端服務..."
    npm run web &
    FRONTEND_PID=$!
    echo "前端 PID: $FRONTEND_PID"
    sleep 15
fi

echo "⏳ 等待服務完全啟動..."
sleep 5

# 檢查服務健康狀態
echo "🏥 檢查服務健康狀態..."
curl -f http://localhost:8080/health > /dev/null 2>&1 && echo "✅ 後端服務健康" || echo "⚠️ 後端服務可能有問題"
curl -f http://localhost:8081 > /dev/null 2>&1 && echo "✅ 前端服務健康" || echo "⚠️ 前端服務可能有問題"

# 運行測試函數
run_test() {
    local test_file=$1
    local test_name=$2
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    echo ""
    echo "🧪 執行測試: $test_name"
    echo "───────────────────────────────────────────"
    
    # 運行特定測試文件
    npx playwright test "$test_file" \
        --project=chromium-desktop \
        --reporter=line \
        --output-dir="test-results/run_${timestamp}" \
        --timeout=90000
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $test_name 測試通過"
    else
        echo "❌ $test_name 測試失敗 (退出碼: $exit_code)"
        
        # 保存失敗信息
        echo "測試失敗: $test_name" >> "test-results/errors/failed_tests_${timestamp}.log"
        echo "退出碼: $exit_code" >> "test-results/errors/failed_tests_${timestamp}.log"
        echo "時間: $(date)" >> "test-results/errors/failed_tests_${timestamp}.log"
        echo "────────────────────────────" >> "test-results/errors/failed_tests_${timestamp}.log"
    fi
    
    return $exit_code
}

# 執行測試套件
echo ""
echo "🧪 開始執行測試套件"
echo "==============================================="

# 測試1：快速子任務順序驗證
run_test "quick-subtask-order-validation.spec.ts" "快速子任務順序驗證"
QUICK_TEST_RESULT=$?

# 測試2：完整子任務順序保持測試（如果快速測試通過）
if [ $QUICK_TEST_RESULT -eq 0 ]; then
    echo ""
    echo "🚀 快速測試通過，執行完整測試..."
    run_test "subtask-order-preservation.spec.ts" "完整子任務順序保持測試"
    FULL_TEST_RESULT=$?
else
    echo "⚠️ 快速測試失敗，跳過完整測試"
    FULL_TEST_RESULT=1
fi

# 測試總結
echo ""
echo "📊 測試結果總結"
echo "==============================================="

if [ $QUICK_TEST_RESULT -eq 0 ]; then
    echo "✅ 快速子任務順序驗證: 通過"
else
    echo "❌ 快速子任務順序驗證: 失敗"
fi

if [ $FULL_TEST_RESULT -eq 0 ]; then
    echo "✅ 完整子任務順序保持測試: 通過"
else
    echo "❌ 完整子任務順序保持測試: 失敗"
fi

# 生成測試報告
REPORT_FILE="test-results/reports/subtask_order_test_report_$(date +"%Y%m%d_%H%M%S").md"

cat > "$REPORT_FILE" << EOF
# 子任務順序驗證測試報告

**測試時間:** $(date)  
**測試目的:** 驗證 Phase 1-3 的排序修復效果

## 測試結果

### 快速驗證測試
- **狀態:** $([ $QUICK_TEST_RESULT -eq 0 ] && echo "✅ 通過" || echo "❌ 失敗")
- **測試內容:** 基本子任務順序保持、手動添加順序、UI 顯示一致性

### 完整驗證測試  
- **狀態:** $([ $FULL_TEST_RESULT -eq 0 ] && echo "✅ 通過" || echo "❌ 失敗")
- **測試內容:** AI 生成順序保持、混合場景穩定性、錯誤恢復能力

## 修復驗證

根據測試結果，以下修復效果得到驗證：

1. **utils/scheduling.ts 核心排序邏輯** - $([ $QUICK_TEST_RESULT -eq 0 ] && echo "修復有效" || echo "需要檢查")
2. **add-task.tsx 安全順序分配** - $([ $QUICK_TEST_RESULT -eq 0 ] && echo "修復有效" || echo "需要檢查")
3. **SubtaskManager.tsx 順序保護** - $([ $QUICK_TEST_RESULT -eq 0 ] && echo "修復有效" || echo "需要檢查")
4. **task-detail.tsx UI 排序** - $([ $QUICK_TEST_RESULT -eq 0 ] && echo "修復有效" || echo "需要檢查")

## 測試環境

- **後端端口:** 8080
- **前端端口:** 8081
- **瀏覽器:** Chromium Desktop
- **視窗大小:** 1280x720

## 後續建議

$([ $QUICK_TEST_RESULT -eq 0 ] && [ $FULL_TEST_RESULT -eq 0 ] && echo "✅ 所有測試通過，排序修復驗證成功，可以進入 Phase 6 文檔更新階段。" || echo "❌ 部分測試失敗，建議檢查失敗的測試用例和相關修復代碼。")

---
**報告生成時間:** $(date)
EOF

echo ""
echo "📋 測試報告已生成: $REPORT_FILE"

# 顯示測試報告內容
echo ""
echo "📄 測試報告內容:"
echo "==============================================="
cat "$REPORT_FILE"

# 清理進程（如果是腳本啟動的）
cleanup() {
    echo ""
    echo "🧹 清理測試環境..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "停止後端服務 (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "停止前端服務 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# 設置信號處理
trap cleanup EXIT

# 最終退出碼
if [ $QUICK_TEST_RESULT -eq 0 ] && [ $FULL_TEST_RESULT -eq 0 ]; then
    echo ""
    echo "🎉 所有測試通過！排序修復驗證成功！"
    exit 0
else
    echo ""
    echo "⚠️ 部分測試失敗，請檢查測試結果"
    exit 1
fi