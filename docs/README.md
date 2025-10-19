# FocusFlow Backend

安全的 Node.js 後端服務，為 FocusFlow 應用程式提供 AI 驅動的學習任務生成功能。

## 🚀 特色功能

- **智能任務分析**: 自動檢測任務類型並生成個人化問題
- **增強子任務生成**: 基於用戶熟練度和時間限制的 AI 驅動子任務創建
- **學習計劃生成**: 全面的個人化學習策略制定
- **健康監控**: 內建服務健康檢查和 API 狀態監控
- **多語言支持**: 支援英文和繁體中文輸出

## 📋 前置需求

- Node.js 16+ 
- npm 或 yarn
- Anthropic API 密鑰

## 🛠 安裝設置

1. **克隆並進入目錄**
   ```bash
   cd focusflow-backend
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設置環境變數**
   ```bash
   cp .env.example .env
   ```
   
   編輯 `.env` 文件並設置：
   ```
   ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
   PORT=8080
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:8081
   ```

4. **啟動服務器**
   ```bash
   npm start
   ```

   服務器將在 http://localhost:8080 啟動

## 🔗 API 端點

### 健康檢查
- `GET /health` - 基本健康檢查
- `GET /api/health-check` - AI 服務健康檢查
- `GET /api/test` - 測試端點（不需要 API 調用）

### AI 功能
- `POST /api/personalization-questions` - 生成個人化問題
- `POST /api/generate-subtasks` - 生成增強子任務
- `POST /api/generate-plan` - 生成學習計劃

## 📝 使用範例

### 生成個人化問題
```bash
curl -X POST http://localhost:8080/api/personalization-questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "準備數學考試",
    "description": "下週有微積分期中考",
    "language": "zh"
  }'
```

### 生成子任務
```bash
curl -X POST http://localhost:8080/api/generate-subtasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "學習 React",
    "description": "想要學會前端開發",
    "taskType": "skill_learning",
    "currentProficiency": "beginner",
    "targetProficiency": "intermediate",
    "language": "zh"
  }'
```

## 🏗 項目結構

```
focusflow-backend/
├── index.js                 # 主服務器文件
├── lib/
│   ├── services/
│   │   └── anthropicService.js  # Anthropic API 服務
│   └── prompts/
│       ├── personalization_prompt.js  # 個人化提示詞
│       └── main_prompt.js             # 主要提示詞
├── routes/
│   └── ai.js                # AI API 路由
├── .env.example             # 環境變數範例
├── .gitignore              # Git 忽略文件
├── package.json            # 項目配置
└── README.md              # 項目說明
```

## 🔧 環境變數

| 變數名 | 描述 | 預設值 |
|--------|------|--------|
| `Gemine_API_KEY` | Gemine API 密鑰 | (必需) |
| `PORT` | 服務器端口 | 8080 |
| `NODE_ENV` | 運行環境 | development |
| `CORS_ORIGIN` | CORS 允許的來源 | http://localhost:8081 |

## 🚨 錯誤處理

服務器提供詳細的錯誤信息：

- **400**: 無效請求格式或參數
- **401**: API 密鑰無效
- **429**: 請求頻率限制
- **500**: 服務器內部錯誤
- **503**: Anthropic 服務不可用

### 信用額度不足
如果 Gemine API 信用額度不足，健康檢查將返回：
```json
{
  "status": "credit_limit",
  "anthropicService": "credit_limit",
  "error": "Anthropic API credit balance too low",
  "note": "Please check your Anthropic account billing"
}
```

## 🔒 安全考量

- API 密鑰絕不暴露給前端
- 環境變數檔案 (.env) 已加入 .gitignore
- CORS 配置限制請求來源
- 輸入驗證和清理
- 錯誤信息不洩露敏感信息

## 🌐 CORS 配置

開發環境預設允許 `http://localhost:8081`。
生產環境需要修改 `CORS_ORIGIN` 環境變數。

## 📊 日誌記錄

服務器記錄：
- API 請求和回應
- 錯誤詳情
- Anthropic API 調用狀態
- 服務健康狀態

## 🔄 與前端集成

前端應用使用 `utils/api.ts` 中的函數與此後端通信：
- `getDynamicQuestions()`
- `generateEnhancedSubtasks()`
- `generatePlan()`
- `checkAIServiceHealth()`

## 🚀 部署

1. 設置生產環境變數
2. 安裝依賴：`npm ci --only=production`
3. 啟動服務：`npm start`

## 📄 授權

此項目為 FocusFlow 應用程式的一部分。 
 
 
 
 
