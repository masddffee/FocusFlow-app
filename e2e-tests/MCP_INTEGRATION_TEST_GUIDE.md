# FocusFlow MCP 自動化測試框架完整指南

## 版本信息
- **版本**: 3.0
- **最後更新**: 2025-07-29
- **作者**: FocusFlow Team

## 概述

FocusFlow MCP (Model-Context-Protocol) 測試框架是一個全面的端到端自動化測試解決方案，具備以下核心功能：

### 🔥 核心特性

1. **YAML 驅動配置** - 完全可配置的測試案例和流程
2. **增強截圖管理** - 智能截圖捕獲、元數據記錄和視覺比較
3. **全面錯誤報告** - 自動錯誤分類、恢復策略和詳細報告
4. **關鍵節點檢測** - 自動識別和監控應用關鍵狀態變化
5. **性能監控** - Web Vitals 和 API 響應時間監控
6. **多格式報告** - HTML、JSON 和截圖集生成

## 📁 目錄結構

```
e2e-tests/
├── focusflow-mcp-test-config.yml      # 主要測試配置文件
├── mcp-yaml-executor.spec.ts          # 測試執行器
├── run-mcp-tests.sh                   # 測試執行腳本
├── utils/
│   ├── enhanced-screenshot-manager.ts  # 增強截圖管理器
│   ├── comprehensive-error-reporter.ts # 全面錯誤報告器
│   └── key-node-detector.ts           # 關鍵節點檢測器
└── test-results/                      # 測試結果輸出目錄
    ├── screenshots/                   # 截圖文件
    ├── videos/                       # 測試視頻
    ├── reports/                      # JSON 報告
    └── errors/                       # 錯誤日誌
```

## 🚀 快速開始

### 1. 環境準備

```bash
# 確保依賴已安裝
npm install @playwright/test js-yaml

# 安裝 Playwright 瀏覽器
npx playwright install

# 啟動服務
npm run backend  # 後端服務 (port 3001)
npm start        # 前端服務 (port 8081)
```

### 2. 執行測試

```bash
# 使用便捷腳本 (推薦)
./run-mcp-tests.sh

# 或直接使用 Playwright
npx playwright test mcp-yaml-executor.spec.ts
```

### 3. 查看結果

測試完成後，以下報告將自動生成：

- `playwright-report/index.html` - Playwright 原生報告
- `test-results/error-report.html` - 詳細錯誤報告
- `test-results/screenshot-gallery.html` - 截圖畫廊
- `test-results/reports/mcp-test-report-*.json` - 完整測試報告

## ⚙️ 配置文件說明

### 主配置文件: `focusflow-mcp-test-config.yml`

```yaml
name: "FocusFlow MCP 完整測試套件"
version: "3.0"
description: "涵蓋所有核心功能的自動化測試"

# 環境配置
environment:
  baseUrl: "http://localhost:8081"
  backendUrl: "http://localhost:3001"
  timeout: 30000
  retries: 3

# 瀏覽器配置
browsers:
  - name: "chromium"
    enabled: true
    headless: false  # 可視化測試過程
    viewport: { width: 1280, height: 720 }

# 測試數據
testData:
  validTask:
    title: "學習 React Native 開發"
    description: "完整學習內容..."

# 測試套件定義
testSuites:
  - name: "complete-user-journey"
    description: "完整的用戶使用流程測試"
    priority: "critical"
    tests: [...]
```

## 🎯 測試套件詳解

### 1. 完整用戶流程測試 (complete-user-journey)

**涵蓋功能：**
- 應用程式啟動和初始化
- 任務創建流程
- 個人化問題回答
- 子任務生成結果驗證

**關鍵節點：**
- `application-loaded` - 應用載入完成
- `task-form-appeared` - 任務表單出現
- `ai-generation-started` - AI 生成開始
- `personalization-modal` - 個人化問題彈窗
- `subtasks-generated` - 子任務生成完成

### 2. 專注計時器功能測試 (focus-timer-functionality)

**涵蓋功能：**
- 計時器初始化
- 啟動和暫停功能
- 時間準確性驗證

**關鍵節點：**
- `timer-active` - 計時器啟動
- `timer-paused` - 計時器暫停

### 3. 統計報表功能測試 (statistics-and-analytics)

**涵蓋功能：**
- 統計頁面導航
- 圖表數據視覺化
- 互動功能測試

**關鍵節點：**
- `chart-data-loaded` - 圖表數據載入完成

### 4. 錯誤處理測試 (error-handling-and-edge-cases)

**涵蓋功能：**
- 無效輸入處理
- 網路錯誤模擬
- 系統恢復機制

**關鍵節點：**
- `error-dialog` - 錯誤對話框出現
- `network-request-timeout` - 網路請求超時

## 🔧 核心組件詳解

### 1. 增強截圖管理器 (EnhancedScreenshotManager)

**功能特性：**
- 智能截圖捕獲 (全頁、元素、錯誤截圖)
- 自動元數據收集 (尺寸、性能、上下文)
- 視覺比較支持
- 截圖畫廊生成

**使用示例：**
```typescript
const screenshotMetadata = await screenshotManager.captureScreenshot({
  name: 'user-interaction',
  description: '用戶互動截圖',
  fullPage: true,
  quality: 90,
  highlightElements: ['[data-testid="button"]']
});
```

### 2. 全面錯誤報告器 (ComprehensiveErrorReporter)

**功能特性：**
- 自動錯誤分類和嚴重性評估
- 錯誤模式識別和建議修復
- 恢復策略記錄
- 詳細 HTML 報告生成

**錯誤類型：**
- `assertion` - 斷言失敗
- `timeout` - 超時錯誤
- `network` - 網路錯誤
- `element` - 元素問題
- `javascript` - JS 錯誤
- `system` - 系統錯誤

### 3. 關鍵節點檢測器 (KeyNodeDetector)

**功能特性：**
- 自動檢測應用關鍵狀態變化
- 智能截圖觸發
- 異步節點等待
- 自定義節點添加

**預定義節點：**
- 應用載入完成
- 表單出現
- AI 生成狀態
- 錯誤對話框
- 數據載入完成

## 📊 測試報告解讀

### 1. 主測試報告 (JSON 格式)

```json
{
  "summary": {
    "totalTests": 15,
    "passed": 12,
    "failed": 2,
    "skipped": 1
  },
  "enhanced": {
    "errorReport": {
      "totalErrors": 3,
      "recoveryRate": 0.67
    },
    "screenshots": {
      "totalScreenshots": 45,
      "totalSize": 12458752
    }
  }
}
```

### 2. 錯誤報告 (HTML 格式)

包含以下部分：
- 錯誤摘要和統計
- 詳細錯誤列表（含截圖）
- 錯誤模式分析
- 修復建議

### 3. 截圖畫廊 (HTML 格式)

- 所有截圖的視覺化展示
- 截圖元數據信息
- 點擊放大查看功能

## 🛠️ 自定義配置

### 添加新的測試步驟

在 YAML 配置中添加新的步驟：

```yaml
steps:
  - action: "customAction"
    selector: "[data-testid='custom-element']"
    screenshot:
      name: "custom-action"
      description: "自定義動作截圖"
    errorHandling:
      onError: true
      recovery: "refresh"
```

### 自定義關鍵節點

```typescript
keyNodeDetector.addKeyNode({
  name: 'custom-node',
  description: '自定義關鍵節點',
  condition: async () => {
    return await page.locator('[data-testid="custom"]').isVisible();
  },
  priority: 'high',
  autoScreenshot: true
});
```

### 錯誤處理策略

```yaml
errorHandling:
  recovery:
    strategies:
      - type: "refresh"
        condition: "navigation_timeout"
        maxAttempts: 2
      - type: "restart"
        condition: "critical_error"
        maxAttempts: 1
```

## 🚨 故障排除

### 常見問題

1. **服務未啟動**
   ```bash
   # 檢查服務狀態
   curl http://localhost:8081
   curl http://localhost:3001/health
   ```

2. **截圖失敗**
   - 檢查目錄權限
   - 確保有足夠的磁盤空間
   - 驗證 Playwright 瀏覽器安裝

3. **關鍵節點檢測超時**
   - 調整 `waitForKeyNode` 超時時間
   - 檢查節點選擇器是否正確
   - 確認應用狀態是否正常

4. **網路請求超時**
   - 檢查後端服務運行狀態
   - 增加 API 請求超時時間
   - 驗證網路連接

### 調試模式

```bash
# 啟用詳細日誌
DEBUG=pw:api npx playwright test mcp-yaml-executor.spec.ts

# 使用有頭模式查看測試過程
npx playwright test mcp-yaml-executor.spec.ts --headed

# 逐步執行
npx playwright test mcp-yaml-executor.spec.ts --debug
```

## 📈 性能優化

### 1. 截圖優化

```yaml
errorHandling:
  autoScreenshot:
    quality: 70          # 降低品質以減小文件大小
    fullPage: false      # 僅截取可視區域
```

### 2. 並行執行

```yaml
parallel:
  enabled: true
  workers: 2
  strategy: "suite"
```

### 3. 資源清理

```typescript
// 自動清理 7 天前的截圖
await screenshotManager.cleanup(7 * 24 * 60 * 60 * 1000);
```

## 🔄 持續集成

### GitHub Actions 示例

```yaml
name: MCP 自動化測試
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: 安裝依賴
        run: npm ci
        
      - name: 安裝 Playwright
        run: npx playwright install --with-deps
        
      - name: 啟動服務
        run: |
          npm run backend &
          npm start &
          sleep 10
          
      - name: 執行 MCP 測試
        run: ./e2e-tests/run-mcp-tests.sh
        
      - name: 上傳測試報告
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: e2e-tests/test-results/
```

## 📚 進階主題

### 1. 自定義錯誤處理器

```typescript
class CustomErrorHandler extends ComprehensiveErrorReporter {
  async captureError(errorData) {
    // 自定義錯誤處理邏輯
    const result = await super.captureError(errorData);
    
    // 發送通知到 Slack/Teams
    await this.sendNotification(result);
    
    return result;
  }
}
```

### 2. 動態測試生成

```typescript
// 根據 API 響應動態生成測試
const apiTests = await generateTestsFromAPI('/api/test-cases');
config.testSuites.push(...apiTests);
```

### 3. 視覺回歸測試

```typescript
const comparisonResult = await screenshotManager.compareScreenshots(
  baselineScreenshot,
  currentScreenshot,
  0.1 // 允許 10% 差異
);
```

## 🎯 最佳實踐

1. **保持測試獨立性** - 每個測試應該能夠獨立運行
2. **使用描述性名稱** - 測試和截圖名稱應該清楚說明目的
3. **適度使用截圖** - 關鍵節點截圖，避免過度捕獲
4. **定期清理** - 自動清理舊的測試結果和截圖
5. **監控性能** - 關注測試執行時間和資源使用
6. **錯誤恢復** - 實現智能錯誤恢復策略
7. **文檔維護** - 保持測試配置和文檔同步更新

## 📞 支持與貢獻

如果您遇到問題或有改進建議，請：

1. 查看本指南的故障排除部分
2. 檢查 GitHub Issues
3. 提交新的 Issue 或 Pull Request

---

**FocusFlow MCP 測試框架** - 讓端到端測試變得智能、可視化和全面！ 🚀