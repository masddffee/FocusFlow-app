# 🔧 FocusFlow Backend 配置指南

## 🔑 API 密鑰設置

### 1. 獲取 Anthropic API 密鑰

1. 前往 [Anthropic Console](https://console.anthropic.com/)
2. 註冊或登錄您的帳號
3. 導航至 **API Keys** 部分
4. 點擊 **Create Key** 創建新的 API 密鑰
5. 複製生成的密鑰（格式如：`sk-ant-api03-...`）

### 2. 設置環境變數

打開 `focusflow-backend/.env` 文件並替換 API 密鑰：

```bash
# 將這行：
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# 替換為您的實際密鑰：
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🤖 模型選擇指南

### 可用模型對比

| 模型 | 性能 | 速度 | 成本 | 最適用場景 |
|------|------|------|------|------------|
| **Claude 3.5 Sonnet (New)** | 🔥🔥🔥🔥🔥 | 🚀🚀🚀 | 💰💰 | **推薦** - 所有任務最佳選擇 |
| **Claude 3 Opus** | 🔥🔥🔥🔥🔥 | 🐌 | 💰💰💰 | 極複雜任務、研究級分析 |
| **Claude 3 Sonnet (Legacy)** | 🔥🔥🔥🔥 | 🚀🚀 | 💰💰 | 一般學習任務、平衡選擇 |
| **Claude 3 Haiku** | 🔥🔥🔥 | 🚀🚀🚀 | 💰 | 簡單任務、快速生成 |

### 模型特性詳解

#### 🎯 Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`) ⭐ **推薦**
- **性能**: 最新最強的平衡型模型
- **適用場景**: 所有任務的最佳選擇
- **特點**: 
  - 最新的 AI 技術和能力
  - 最佳的推理和理解能力
  - 優秀的速度和質量平衡
  - 支持複雜的學習計劃生成
- **成本**: 中等，性價比極高
- **推薦用於**: 學習計劃、子任務生成、個人化建議、複雜分析

#### ⚡ Claude 3 Sonnet Legacy (`claude-3-sonnet-20240229`)
- **性能**: 經典的平衡型模型
- **適用場景**: 一般學習任務和日常使用
- **特點**: 
  - 良好的推理能力
  - 快速響應時間
  - 平衡的成本效益
- **成本**: 中等
- **推薦用於**: 一般任務、簡單的學習計劃

#### 🎯 Claude 3 Opus (`claude-3-opus-20240229`)
- **最強推理能力**：處理極複雜邏輯和深度分析
- **創意輸出優秀**：適合創意寫作和創新思維
- **適用場景**：
  - 研究級學習計劃制定
  - 高難度技能學習分解
  - 需要深度思考的專案規劃
- **缺點**：較慢且成本較高

#### 🚀 Claude 3 Haiku (`claude-3-haiku-20240307`)
- **最快速度**：幾乎即時回應
- **經濟實惠**：成本最低
- **適用場景**：
  - 簡單的問答任務
  - 大量快速生成需求
  - 預算有限的使用
- **限制**：推理能力相對較弱

## ⚙️ 配置模型

### 方法一：修改 .env 文件（推薦）

編輯 `focusflow-backend/.env` 文件：

```bash
# 🤖 推薦：使用最新的 Claude 3.5 Sonnet
DEFAULT_MODEL=claude-3-5-sonnet-20241022

# 調整生成參數
DEFAULT_MAX_TOKENS=4000        # 最大輸出長度
DEFAULT_TEMPERATURE=0.2        # 創意程度 (0.0-1.0)

# 其他配置
REQUEST_TIMEOUT=45000          # 請求超時時間(毫秒)
PORT=8080                      # 服務器端口
```

### 完整 .env 配置範例

```bash
# ===========================================
# API 密鑰配置
# ===========================================
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# ===========================================
# 模型配置 (推薦使用 3.5 Sonnet)
# ===========================================
DEFAULT_MODEL=claude-3-5-sonnet-20241022
DEFAULT_MAX_TOKENS=4000
DEFAULT_TEMPERATURE=0.2

# ===========================================
# 服務器配置
# ===========================================
PORT=8080
REQUEST_TIMEOUT=45000
NODE_ENV=development
LOG_LEVEL=info
```

### 方法二：透過 API 動態指定

在 API 請求中指定模型：

```javascript
// 例如在 generateEnhancedSubtasks 中
const response = await backendGenerateSubtasks({
  title: "學習 React",
  description: "想要掌握前端開發",
  // 在選項中指定模型
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 6000,
  temperature: 0.3
});
```

## 🎛️ 進階配置

### Temperature 設定指南

| Temperature | 效果 | 適用場景 | 推薦用途 |
|-------------|------|----------|----------|
| 0.0 - 0.2 | 非常一致、準確 | 學術內容、技術分析 | **推薦用於學習任務** |
| 0.3 - 0.5 | 平衡一致性與創意 | 一般學習計劃 | 混合型任務 |
| 0.6 - 0.8 | 更具創意 | 創意寫作、腦力激盪 | 創意專案 |
| 0.9 - 1.0 | 高度創意、隨機 | 藝術創作、靈感生成 | 實驗性使用 |

### Token 限制說明

- **1000 tokens** ≈ 750 英文單詞 或 500 中文字
- **建議設置**（Claude 3.5 Sonnet）：
  - 簡單任務：2000-3000 tokens
  - 一般任務：3000-5000 tokens  
  - 複雜任務：5000-8000 tokens

## 🚀 快速設置步驟

1. **設置 API 密鑰**：
   ```bash
   cd focusflow-backend
   nano .env  # 或使用其他編輯器
   # 設置 ANTHROPIC_API_KEY=your_key_here
   ```

2. **選擇模型**（強烈推薦 Claude 3.5 Sonnet）：
   ```bash
   # 在 .env 文件中設置
   DEFAULT_MODEL=claude-3-5-sonnet-20241022
   ```

3. **重新啟動服務器**：
   ```bash
   npm start
   ```

4. **測試配置**：
   ```bash
   curl http://localhost:8080/api/models
   ```

## 📊 成本優化建議

### 降低成本的策略

1. **選擇合適的模型**：
   - **日常使用**：Claude 3.5 Sonnet（最佳選擇）
   - **預算有限**：Claude 3 Haiku
   - **複雜研究**：Claude 3 Opus

2. **調整參數**：
   - 降低 `maxTokens` 限制
   - 使用較低的 `temperature` (0.1-0.3)

3. **批量處理**：
   - 一次生成多個子任務
   - 避免頻繁的小請求

4. **緩存策略**：
   - 保存常用的回應
   - 重用相似的任務分解

## 🔧 疑難排解

### 常見問題

1. **API 密鑰錯誤**：
   ```
   Error: Invalid API key
   ```
   - 檢查密鑰是否正確複製
   - 確認密鑰未過期
   - 檢查 Anthropic 帳號餘額

2. **信用額度不足**：
   ```
   Error: credit balance too low
   ```
   - 前往 Anthropic Console 充值
   - 檢查用量限制

3. **模型不存在**：
   ```
   Error: model not found
   ```
   - 檢查模型名稱拼寫
   - 確保使用支援的模型 ID：`claude-3-5-sonnet-20241022`

4. **請求超時**：
   ```
   Error: Request timeout
   ```
   - 增加 `REQUEST_TIMEOUT` 值到 45000 或更高
   - 降低 `maxTokens` 參數
   - Claude 3.5 Sonnet 通常很快，如果超時可能是網路問題

## 📈 監控和分析

### 查看當前配置
```bash
curl http://localhost:8080/api/models
```

### 檢查服務狀態
```bash
curl http://localhost:8080/api/health-check
```

### 監控 API 使用量
- 在 Anthropic Console 中查看使用統計
- 設置用量警報
- 定期檢查成本報告

---

## 💡 最佳實踐建議

1. **使用 Claude 3.5 Sonnet**：目前最佳的平衡選擇
2. **設定適當的溫度值**：學習任務使用 0.1-0.3
3. **監控 API 使用量**：避免意外高費用
4. **定期備份配置**：保存有效的參數設置
5. **漸進式優化**：根據使用體驗調整配置

## 🆕 升級到 Claude 3.5 Sonnet 的優勢

- **更智能的回應**：比舊版本更準確和相關
- **更快的速度**：接近 Haiku 的速度，但保持高質量
- **更好的成本效益**：在價格相同的情況下提供更好的性能
- **更強的推理能力**：能處理更複雜的學習計劃制定

需要更多幫助？查看 [Anthropic API 文檔](https://docs.anthropic.com/) 或在 GitHub 上提交 issue。 