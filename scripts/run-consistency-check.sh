#!/bin/bash

# 測試結果與實際使用一致性檢查執行腳本
# 
# 這個腳本會執行完整的一致性檢查，防止假陽性問題
# 使用方式：./scripts/run-consistency-check.sh

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：打印帶顏色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "$1"
    echo "=================================="
    echo -e "${NC}"
}

# 主函數
main() {
    print_header "FocusFlow 一致性檢查系統"
    
    # 檢查當前目錄
    if [ ! -f "package.json" ]; then
        print_error "請在專案根目錄執行此腳本"
        exit 1
    fi

    print_info "開始執行測試結果與實際使用的一致性檢查..."
    
    # 步驟 1: 檢查依賴
    print_info "檢查 Node.js 依賴..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安裝，請先安裝 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安裝，請先安裝 npm"
        exit 1
    fi
    
    print_success "Node.js 和 npm 已安裝"

    # 步驟 2: 安裝依賴（如果需要）
    if [ ! -d "node_modules" ]; then
        print_info "安裝專案依賴..."
        npm install
        print_success "依賴安裝完成"
    fi

    # 步驟 3: 檢查服務狀態
    print_info "檢查服務狀態..."
    
    # 檢查後端服務
    if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
        print_success "後端服務運行正常"
    else
        print_warning "後端服務未運行，正在啟動..."
        npm run backend > /dev/null 2>&1 &
        BACKEND_PID=$!
        sleep 5
        
        if curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
            print_success "後端服務已啟動"
        else
            print_error "無法啟動後端服務"
            exit 1
        fi
    fi

    # 檢查前端服務
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        print_success "前端服務運行正常"
    else
        print_warning "前端服務未運行，正在啟動..."
        npm run web > /dev/null 2>&1 &
        FRONTEND_PID=$!
        sleep 10
        
        if curl -s http://localhost:8081 > /dev/null 2>&1; then
            print_success "前端服務已啟動"
        else
            print_error "無法啟動前端服務"
            exit 1
        fi
    fi

    # 步驟 4: 執行一致性檢查測試
    print_header "執行一致性檢查測試"
    
    # 創建結果目錄
    mkdir -p test-results/consistency-reports
    
    # 執行測試
    print_info "執行測試結果與實際使用一致性檢查..."
    
    if npx playwright test e2e-tests/test-reality-consistency.spec.ts --reporter=html,json; then
        print_success "一致性檢查測試完成"
    else
        print_warning "一致性檢查發現問題，請查看詳細報告"
    fi

    # 步驟 5: 執行增強版現實檢查
    print_info "執行增強版 MCP 現實檢查..."
    
    if npx playwright test e2e-tests/enhanced-mcp-reality-check.spec.ts --reporter=html,json; then
        print_success "增強版現實檢查完成"
    else
        print_warning "增強版現實檢查發現問題，請查看詳細報告"
    fi

    # 步驟 6: 生成報告
    print_header "生成一致性檢查報告"
    
    if [ -f "e2e-tests/run-consistency-check.js" ]; then
        print_info "生成綜合一致性報告..."
        node e2e-tests/run-consistency-check.js
        print_success "綜合報告已生成"
    fi

    # 步驟 7: 顯示結果摘要
    print_header "檢查結果摘要"
    
    if [ -f "test-results/results.json" ]; then
        # 解析測試結果
        TOTAL_TESTS=$(cat test-results/results.json | grep -o '"tests":[0-9]*' | cut -d':' -f2 || echo "0")
        PASSED_TESTS=$(cat test-results/results.json | grep -o '"passed":[0-9]*' | cut -d':' -f2 || echo "0")
        FAILED_TESTS=$(cat test-results/results.json | grep -o '"failed":[0-9]*' | cut -d':' -f2 || echo "0")
        
        echo "測試統計："
        echo "  總測試數: $TOTAL_TESTS"
        echo "  通過: $PASSED_TESTS"
        echo "  失敗: $FAILED_TESTS"
        
        if [ "$FAILED_TESTS" = "0" ]; then
            print_success "所有測試通過！"
        else
            print_warning "$FAILED_TESTS 個測試失敗，請檢查詳細報告"
        fi
    else
        print_info "測試結果文件未找到，請手動檢查測試輸出"
    fi

    # 步驟 8: 提供後續建議
    print_header "後續建議"
    
    echo "📊 報告位置:"
    echo "  - HTML 報告: playwright-report/index.html"
    echo "  - JSON 報告: test-results/results.json"
    echo "  - 截圖: test-results/screenshots/"
    echo "  - 一致性報告: test-results/consistency-reports/"
    echo ""
    echo "🔍 如何查看報告:"
    echo "  npx playwright show-report"
    echo ""
    echo "🚀 定期執行建議:"
    echo "  - 每週執行一次完整檢查"
    echo "  - 發佈前必須執行"
    echo "  - 發現問題時立即執行"
    echo ""
    echo "💡 改進建議:"
    echo "  - 檢查失敗的測試項目"
    echo "  - 分析一致性分數低的原因"
    echo "  - 關注假陽性問題的根本原因"
    echo ""

    print_success "一致性檢查完成！"
    
    # 清理進程（如果我們啟動了服務）
    if [ ! -z "$BACKEND_PID" ]; then
        print_info "清理後端服務進程..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        print_info "清理前端服務進程..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# 信號處理
trap 'print_error "腳本被中斷"; exit 1' INT TERM

# 執行主函數
main "$@"