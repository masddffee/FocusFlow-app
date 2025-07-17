# 🔐 FocusFlow 安全遷移指南

## 📋 概覽

為了提高 FocusFlow 應用程式的安全性，我們已經實施了重要的安全修復，移除了前端直接調用 LLM API 的不安全做法。本指南詳細說明了如何將現有代碼遷移到新的安全架構。

## ⚠️ 安全問題

### 之前的不安全做法
```typescript
// ❌ 不安全：前端直接調用 LLM API
import { evaluateInputQuality } from "@/utils/ai";
const result = await evaluateInputQuality(title, description);
```

### 安全風險
- **API 金鑰暴露**: 前端代碼中的 API 金鑰可被任何人查看
- **未經授權的使用**: 惡意用戶可能濫用暴露的 API 金鑰
- **成本控制失效**: 無法有效限制和監控 API 使用
- **安全審計困難**: 無法集中管理和記錄 API 調用

## 🔐 新的安全架構

### 安全的後端代理模式
```typescript
// ✅ 安全：通過後端代理調用
import { evaluateInputQualitySafely } from "@/utils/api";
const result = await evaluateInputQualitySafely(title, description, language);
```

### 安全優勢
- **API 金鑰保護**: 金鑰只存在於後端服務器
- **訪問控制**: 後端可以實施速率限制和驗證
- **成本監控**: 集中管理和監控所有 API 使用
- **錯誤處理**: 統一的錯誤處理和重試機制
- **快取優化**: 後端可以實施智能快取策略

## 🔄 遷移對照表

| 舊函數 (不安全) | 新函數 (安全) | 狀態 |
|----------------|-------------|------|
| `evaluateInputQuality()` | `evaluateInputQualitySafely()` | ✅ 已完成 |
| `generateProductivityTips()` | `generateProductivityTipsSafely()` | ✅ 已完成 |
| `generateLearningQuestions()` | `generateLearningQuestionsSafely()` | ✅ 已完成 |

## 📝 詳細遷移步驟

### 1. 更新導入語句

**之前 (不安全):**
```typescript
import { 
  evaluateInputQuality,
  generateProductivityTips,
  generateLearningQuestions 
} from "@/utils/ai";
```

**之後 (安全):**
```typescript
import { 
  evaluateInputQualitySafely,
  generateProductivityTipsSafely,
  generateLearningQuestionsSafely 
} from "@/utils/api";
import { useSettingsStore } from "@/store/settingsStore";
```

### 2. 更新函數調用

#### 輸入品質評估

**之前:**
```typescript
const result = await evaluateInputQuality(title, description);
if (!result.isSufficient) {
  // 處理不足的輸入
}
```

**之後:**
```typescript
const currentLanguage = useSettingsStore.getState().language;
const result = await evaluateInputQualitySafely(title, description, currentLanguage);

if (!result.isSufficient) {
  // 處理不足的輸入
  console.log(result.reasons);
}

// 檢查是否使用了備用方案
if (result.fallback) {
  console.warn('Using fallback validation due to network issues');
}
```

#### 生產力建議生成

**之前:**
```typescript
const tips = await generateProductivityTips(stats);
setProductivityTips(tips);
```

**之後:**
```typescript
const currentLanguage = useSettingsStore.getState().language;
const tipsResponse = await generateProductivityTipsSafely(stats, currentLanguage);

if (tipsResponse.tips && tipsResponse.tips.length > 0) {
  setProductivityTips(tipsResponse.tips);
  
  if (tipsResponse.fallback) {
    console.warn('Using fallback tips due to network issues');
  }
} else {
  console.error('No productivity tips received');
  setProductivityTips([]);
}
```

#### 學習問題生成

**之前:**
```typescript
const questions = await generateLearningQuestions(summary);
setQuestions(questions);
```

**之後:**
```typescript
const currentLanguage = useSettingsStore.getState().language;
const questionsResponse = await generateLearningQuestionsSafely(summary, currentLanguage);

if (questionsResponse.questions && questionsResponse.questions.length > 0) {
  setQuestions(questionsResponse.questions);
  
  if (questionsResponse.fallback) {
    console.warn('Using fallback questions due to network issues');
  }
} else {
  console.error('No questions could be generated');
  setQuestions([]);
}
```

## 🛡️ 新功能和改進

### 1. 統一的錯誤處理
所有安全函數都包含：
- 自動重試機制
- 智能後備方案
- 詳細的錯誤報告
- 網路問題的優雅降級

### 2. 多語言支持
```typescript
// 支援中英文
const language = useSettingsStore.getState().language; // 'zh' 或 'en'
const result = await evaluateInputQualitySafely(title, description, language);
```

### 3. 詳細的元數據
```typescript
const result = await evaluateInputQualitySafely(title, description, language);
console.log(result.metadata); // 包含評估方法和詳細信息
```

### 4. 後備策略
當網路問題導致 AI 服務不可用時，所有函數都提供本地後備方案：
- 基本驗證規則
- 預設建議清單
- 通用問題模板

## ✅ 已完成的修復

### 前端組件更新
- ✅ `app/add-task.tsx` - 已遷移到 `evaluateInputQualitySafely`
- ✅ `app/(tabs)/stats.tsx` - 已遷移到 `generateProductivityTipsSafely`
- ✅ `app/learning-feedback.tsx` - 已遷移到 `generateLearningQuestionsSafely`

### 後端 API 端點
- ✅ `POST /api/evaluate-input-quality` - 安全的輸入品質評估
- ✅ `POST /api/generate-productivity-tips` - 安全的生產力建議生成
- ✅ `POST /api/generate-learning-questions` - 安全的學習問題生成

### 前端 API 函數
- ✅ `utils/api.ts` - 所有新的安全 API 函數已實施

## 🔮 下一步計劃

### 即將移除的不安全函數
在下一版本中，以下函數將被完全移除：
- `utils/ai.ts` 中的 `evaluateInputQuality()`
- `utils/ai.ts` 中的 `generateProductivityTips()`
- `utils/ai.ts` 中的 `generateLearningQuestions()`

### 建議的最佳實踐
1. **避免前端直接 API 調用**: 始終通過後端代理
2. **實施速率限制**: 在後端添加適當的速率限制
3. **監控和記錄**: 記錄所有 AI API 使用情況
4. **錯誤處理**: 實施全面的錯誤處理和重試機制

## 📞 支援和疑難排解

如果您在遷移過程中遇到問題：

1. **檢查導入**: 確保從 `@/utils/api` 導入安全函數
2. **檢查語言參數**: 確保傳遞正確的語言參數
3. **檢查返回值**: 新函數返回對象而不是直接值
4. **檢查網路**: 確保後端服務正常運行

## ⭐ 安全檢查清單

在完成遷移後，請確認：

- [ ] 所有前端組件都使用安全的 API 函數
- [ ] 沒有直接從前端調用 LLM API
- [ ] 所有 API 金鑰都安全存儲在後端
- [ ] 實施了適當的錯誤處理
- [ ] 測試了後備方案的功能
- [ ] 確認多語言支持正常工作

---

**🔐 記住：安全性是持續的過程，而不是一次性的任務。定期審查和更新安全措施至關重要。** 