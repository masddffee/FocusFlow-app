# CLAUDE.md - FocusFlow 專案開發規範

**文件版本：** 3.0  
**最後更新：** 2025/07/29  
**專案名稱：** FocusFlow——AI智慧學習計劃暨專注助手  
**使用API：** Gemini 2.5 Flash  
**架構：** React Native (Expo) + Node.js + TypeScript

## 核心規範（任務開始前必讀，回覆確認）

**規則遵守啟動**  
Claude 必須在每次任務開始前主動複述以下確認：  
「重點規則已確認——我將嚴格遵守 FocusFlow CLAUDE.md 中所有禁止事項與必要要求。」

### 絕對禁止事項

- **嚴禁**在專案根目錄新增任何非必要檔案 —— 除 CLAUDE.md、package.json、配置檔外，所有代碼請存放於正確的子資料夾模組。
- **絕不可**創建重複檔案或用 `_v2`、`_new`、`_enhanced` 等後綴；**必須**優先查找現有功能並擴充，避免技術債。
- **嚴禁**硬編碼 AI 提示詞 —— 必須由 `/focusflow-backend/lib/prompts/` 引入，不可出現在其他模組。
- **嚴禁**從前端（如 `app/`、`components/`）直接呼叫第三方 API（如 Gemini），所有 AI 請求需經後端代理安全 API。
- **嚴禁**複製貼上超過三行以上的代碼 —— 必須抽出為共用函式或元件。
- **嚴禁**直接修改大型核心檔案 —— 如需修改，應先拆分為較小組件再進行修改。
- **嚴禁**忽略任何錯誤 —— 包含 TypeScript 編譯錯、API 回傳異常、測試失敗、ESLint 警告等，均須即時修正，錯誤未修前不可繼續任何開發/提交/部署。
- **嚴禁**使用 console.log/console.error —— **必須**使用統一日誌系統 `@/lib/logger`。
- **嚴禁**自訂簽名於 Claude Code 任何位置。
- **嚴禁**使用其他語言跟我對話，只能使用繁體中文。

### 強制遵循事項

- **開發前必查**：新增功能或元件前，必須先用 `grep` 搜尋有無類似可擴充功能。
- **嚴格分層架構**：根據「UI層（app/）→ API層（utils/api.ts）→ 路由層（routes/ai.js）→ 服務層（services/）」順序呼叫。
- **單一真理來源（SSOT）**：如學習計劃資料結構，請唯一定義於 `types/task.ts` 等，其他處以引用為準。
- **統一日誌管理**：
  - 前端：使用 `import { log } from '@/lib/logger'`，呼叫 `log.info()`, `log.error()`, `log.warn()`, `log.debug()`
  - 後端：在每個檔案建立 `SimpleLogger` 實例，環境變數 `LOG_LEVEL` 控制輸出層級
  - 生產環境設定 `LOG_LEVEL=ERROR`，開發環境設定 `LOG_LEVEL=DEBUG`
- **代碼品質標準**：
  - 單一檔案不超過 500 行，超過必須拆分為多個檔案或組件
  - 單一函數不超過 50 行
  - 組件拆分：UI 組件、業務邏輯、狀態管理分離
- **先驗證再提交**：所有新建或修改功能，必須本地測試與驗證無誤，才可進行整合、提交、部署。
- **測試檔清理**：任何臨時測試檔、手動頁面、console驗證後，單元完成即刻刪除，防止技術債。
- **每次 commit 完即備份**：每次 `git commit` 後立即 `git push origin main`，確保雲端備份。
- **長時間運算**（如 AI 產生/測試，超過30秒）：必須用背景 Task Agent 執行，避免 context 錯亂或中斷。

## 專案架構與說明

**FocusFlow** 是以 React Native（Expo）與 Node.js 架構的 AI 生產力/學習任務規劃應用，協助目標分解、智慧排程與每日動作化。

### 技術棧
- **前端**：React Native（Expo SDK 53+）、Zustand 狀態管理、i18next 國際化、NativeWind 樣式
- **後端**：Node.js、Express.js
- **AI模型**：Google Gemini（由後端 API 轉接呼叫）
- **本地儲存**：AsyncStorage

### 主要目錄架構

| 目錄                      | 用途說明                              | 檔案數量 | 主要檔案 |
|---------------------------|--------------------------------------|----------|----------|
| **前端架構**              |                                      |          |          |
| `app/`                    | UI頁面層（Expo Router 路由）         | 15+      | add-task.tsx, focus.tsx |
| `components/`             | 可重用 React 元件                    | 20+      | Button.tsx, Modal.tsx |
| `components/task-creation/` | 任務建立專用組件（v3.0新增）         | 5        | PersonalizationModal.tsx |
| `store/`                  | Zustand 狀態管理                     | 4        | taskStore.ts, timerStore.ts |
| `utils/`                  | 前端輔助工具                         | 8+       | api.ts, scheduling.ts |
| `types/`                  | TypeScript 型別定義                  | 3        | task.ts, timeSlot.ts |
| `lib/`                    | 核心庫檔案                           | 2        | logger.ts, errors/ |
| `hooks/`                  | React 自定義 hooks                   | 3+       | useTaskGeneration.ts |
| **後端架構**              |                                      |          |          |
| `focusflow-backend/`      | 後端服務根目錄                       |          |          |
| `├─ routes/`              | Express API 路由                     | 1        | ai_router.js |
| `├─ lib/services/`        | 核心業務服務                         | 7        | geminiService.js |
| `├─ lib/prompts/`         | AI 提示詞模板庫                      | 2        | main_prompt.js |
| `├─ config/`              | 後端配置檔案                         | 1        | serverConfig.js |
| **測試架構**              |                                      |          |          |
| `e2e-tests/`              | 端到端自動化測試                     | 25+      | mcp-*.spec.ts |
| `__tests__/`              | 單元測試                             | 5+       | *.test.ts |
| **文檔架構**              |                                      |          |          |
| `docs/`                   | 專案文檔（v3.0整理）                 | 22       | README.md, *.md |

## 開發工作流程與常用指令

### 常用啟動指令

- 啟動全開發環境：`npm run dev`
- 僅前端：`npm start`
- 僅後端：`npm run backend`

### 複雜任務標準流程（凡任務超過三步皆需執行）

1. **步驟拆解**  
   利用 TodoWrite 功具將複雜需求拆為明確步驟與檢查點。
2. **平行處理**  
   針對獨立子任務（例如："修改 set 函式"、"撰寫單元測試"），啟動 Task Agent 平行執行。
3. **檢查點 commit**  
   完成單一/一組相關子任務後，立即 `git add .`、`git commit -m "feat: [說明]"`。
4. **即時上傳雲端**  
   每個 commit 後立即 `git push origin main`。
5. **驗證回歸**  
   疊代開發重點後務必運行 `npm test` 或 `npm run backend:test` 驗證不破壞既有功能。

## 🧪 測試策略與自動化（v3.0新增）

### 測試層級

1. **單元測試** (`__tests__/`)
   - 工具函數測試：utils/, lib/ 目錄下的所有函數
   - 組件測試：components/ 的獨立組件功能
   - 覆蓋率要求：≥ 80%

2. **整合測試** (focusflow-backend/tests/)
   - API 端點測試
   - 服務層整合測試
   - 資料庫互動測試

3. **端到端測試** (`e2e-tests/`)
   - 完整用戶流程驗證
   - 跨平台兼容性測試
   - 效能基準測試

### 自動化測試執行

```bash
# 完整測試套件
npm run test:all

# 單元測試
npm run test:unit

# E2E 測試
npm run test:e2e

# 覆蓋率報告
npm run test:coverage
```

### 測試規範

- **每個新功能必須包含測試**
- **修改現有功能必須更新相關測試**
- **測試失敗時禁止合併代碼**
- **關鍵路徑測試必須包含錯誤處理驗證**

## 🔗 GitHub 整合與自動備份

### 初始化工作流程

1. 當新的專案或 clone 檢測到 CLAUDE.md，AI需詢問：  
   「是否要設定 GitHub 雲端倉庫？ 1.建立新倉庫 2.連結現有倉庫 3.略過設定」
2. 根據用戶選擇，運用 `gh` CLI 指令處理 remote 倉庫設定與首次上傳。

### 強制備份
- 每次 `git commit` 均必須 `git push origin main`，防止本地損毀導致資料遺失。

## 📊 代碼品質監控（v3.0新增）

### 品質指標

- **技術債務**：零容忍重複代碼，最大檔案行數 500 行
- **日誌管理**：零 console 調用，統一使用 logger 系統
- **類型安全**：TypeScript 嚴格模式，零 `any` 類型使用
- **效能指標**：首屏載入 < 2秒，API 回應 < 1秒

### 檢查清單

每次提交前必須確認：
- [ ] 所有 TypeScript 錯誤已修復
- [ ] 所有 ESLint 警告已處理
- [ ] 新增功能包含相應測試
- [ ] 使用統一日誌系統，無 console 調用
- [ ] 檔案行數未超過標準（500行）
- [ ] 功能已在本地環境驗證

## 規則確認與任務啟動

請於**每次任務開始**主動複述：  
「重點規則已確認——我將嚴格遵守 FocusFlow CLAUDE.md 中所有禁止事項與必要要求。」