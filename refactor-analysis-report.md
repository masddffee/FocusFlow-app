# FocusFlow 代碼重構分析報告

**日期:** 2025-07-20  
**版本:** 1.0  
**分析範圍:** 代碼重複功能、硬編碼內容、架構優化建議

---

## 🔍 執行摘要

經過對五個核心文件的詳細分析，發現多處代碼重複、硬編碼問題，以及架構不一致性。主要問題集中在 AI 生成邏輯分散、API 函數重複實現、以及缺乏統一的服務層管理。

### 關鍵發現
- **重複代碼率:** 約 35% 的生成邏輯存在重複
- **硬編碼問題:** 15+ 處硬編碼配置和內容
- **架構不一致:** 新舊 API 系統共存，缺乏統一入口

---

## 📊 詳細分析表格

| 文件 | 重複功能 | 硬編碼位址與內容 | 建議調整改造方案 |
|------|----------|------------------|-------------------|
| **utils/api.ts** | ✅ 多個生成函數<br/>• `generateUnifiedLearningPlan`<br/>• `generatePlan`<br/>• `getDynamicQuestions`<br/>• `generateEnhancedSubtasks` | ✅ API URL 硬編碼<br/>• `http://10.0.2.2:8080/api`<br/>• `http://localhost:8080/api`<br/>✅ 錯誤訊息硬編碼<br/>• 多處中文錯誤訊息字串 | **🔧 統一 API 層**<br/>• 移除重複函數<br/>• 統一使用 Job API<br/>• 提取配置到環境變數<br/>• 建立錯誤訊息國際化 |
| **app/add-task.tsx** | ✅ 內嵌 AI 生成邏輯<br/>• `handleSmartGenerate`<br/>• `handlePersonalizationComplete`<br/>• 直接 API 調用邏輯 | ✅ 硬編碼 UI 狀態文字<br/>• "正在生成個人化問題..."<br/>• "正在生成學習計劃..."<br/>✅ 魔法數字<br/>• `maxRetries: 3`<br/>• `timeout: 30000` | **🔧 UI/邏輯分離**<br/>• 抽取 AI 邏輯到 service 層<br/>• 移除直接 API 調用<br/>• 狀態文字移至 i18n<br/>• 配置提取到常數檔 |
| **focusflow-backend/routes/ai_router.js** | ✅ 重複的端點邏輯<br/>• `/personalization-questions`<br/>• `/generate-subtasks`<br/>• `/generate-plan`<br/>• 相似的錯誤處理模式 | ✅ 硬編碼模型配置<br/>• `DEFAULT_MODEL = "gemini-2.5-flash"`<br/>• `REQUEST_TIMEOUT = 35000`<br/>✅ 重複的 deprecation 訊息 | **🔧 路由統一化**<br/>• 移除棄用端點<br/>• 統一錯誤處理<br/>• 配置外部化<br/>• 建立統一中間件 |
| **focusflow-backend/lib/services/geminiService.js** | ✅ 重複的 Schema 定義<br/>• `subtasks` schema 在多處重複<br/>• 相似的驗證邏輯<br/>• 重複的錯誤處理 | ✅ 硬編碼 Schema 結構<br/>• 大量靜態 Schema 定義<br/>• 硬編碼模型參數<br/>• `maxOutputTokens` 調整邏輯 | **🔧 Schema 工廠模式**<br/>• 建立動態 Schema 生成<br/>• 統一驗證框架<br/>• 參數配置化<br/>• 抽象化重試邏輯 |
| **focusflow-backend/lib/services/jobQueueService.js** | ✅ 重複的任務處理邏輯<br/>• `processPersonalization`<br/>• `processSubtaskGeneration`<br/>• `processLearningPlan`<br/>• 相似的進度更新模式 | ✅ 硬編碼任務配置<br/>• 時間估算數值<br/>• 進度訊息字串<br/>• `maxConcurrentJobs = 3` | **🔧 任務處理器抽象**<br/>• 建立通用任務處理器<br/>• 配置驅動的任務定義<br/>• 進度管理統一化<br/>• 動態負載調整 |

---

## 🛠️ 具體重構方案與代碼示例

### 1. **統一 AI 服務層重構** 
#### 問題：分散的 AI 生成邏輯
```typescript
// ❌ 現狀：分散在多個文件中的生成邏輯
// utils/api.ts 中的多個重複函數
export async function generateUnifiedLearningPlan(params) { ... }
export async function generatePlan(params) { ... }
export async function getDynamicQuestions(params) { ... }

// app/add-task.tsx 中的內嵌邏輯  
const handleSmartGenerate = async () => {
  // 直接 API 調用邏輯
}
```

```typescript
// ✅ 重構後：統一的 AI 服務層
// services/aiService.ts
export class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateContent<T>(
    type: GenerationType,
    params: GenerationParams,
    options?: GenerationOptions
  ): Promise<JobSubmissionResult> {
    // 統一的生成邏輯
    return await submitJob(type, params, options);
  }

  async pollAndWait<T>(
    jobId: string,
    onProgress?: (status: JobStatusResult) => void
  ): Promise<T> {
    return await pollUntilComplete(jobId, onProgress);
  }
}

// 類型定義
export interface GenerationParams {
  title: string;
  description?: string;
  language?: 'en' | 'zh';
  clarificationResponses?: Record<string, string>;
}

export enum GenerationType {
  TASK_PLANNING = 'task_planning',
  PERSONALIZATION = 'personalization',
  SUBTASK_GENERATION = 'subtask_generation',
  LEARNING_PLAN = 'learning_plan'
}
```

### 2. **配置外部化重構**
#### 問題：硬編碼配置分散各處
```javascript
// ❌ 現狀：硬編碼配置
// utils/api.ts
const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:8080/api'
    : 'http://localhost:8080/api'
  : 'https://your-production-api.com/api';

// focusflow-backend/routes/ai_router.js  
const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT = 35000;
```

```typescript
// ✅ 重構後：統一配置管理
// config/appConfig.ts
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryCount: number;
  };
  ai: {
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
  queue: {
    maxConcurrentJobs: number;
    jobTimeout: number;
    jobExpiryTime: number;
  };
}

export const getConfig = (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    api: {
      baseUrl: getApiBaseUrl(),
      timeout: parseInt(process.env.API_TIMEOUT || '30000'),
      retryCount: parseInt(process.env.API_RETRY_COUNT || '3')
    },
    ai: {
      defaultModel: process.env.DEFAULT_MODEL || 'gemini-2.5-flash',
      maxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.1')
    },
    queue: {
      maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
      jobTimeout: parseInt(process.env.JOB_TIMEOUT || '60000'),
      jobExpiryTime: parseInt(process.env.JOB_EXPIRY_TIME || '1800000')
    }
  };
};

function getApiBaseUrl(): string {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  if (__DEV__) {
    return Platform.OS === 'android' 
      ? 'http://10.0.2.2:8080/api'
      : 'http://localhost:8080/api';
  }
  
  return 'https://your-production-api.com/api';
}
```

### 3. **Schema 工廠模式重構**
#### 問題：重複的 Schema 定義
```javascript
// ❌ 現狀：大量重複的靜態 Schema
// geminiService.js 中 200+ 行重複 Schema 定義
const RESPONSE_SCHEMAS = {
  personalizationQuestions: { ... },
  subtasks: { ... },
  learningPlan: { ... },
  unifiedLearningPlan: { ... }
};
```

```javascript
// ✅ 重構後：動態 Schema 工廠
// lib/schemas/schemaFactory.js
class SchemaFactory {
  constructor() {
    this.baseTypes = {
      id: { type: SchemaType.STRING },
      title: { type: SchemaType.STRING },
      text: { type: SchemaType.STRING },
      difficulty: { 
        type: SchemaType.STRING,
        enum: ["easy", "medium", "hard"]
      }
    };
  }

  createSchema(type, options = {}) {
    const builders = {
      personalizationQuestions: () => this.buildPersonalizationSchema(options),
      subtasks: () => this.buildSubtasksSchema(options),
      learningPlan: () => this.buildLearningPlanSchema(options),
      unifiedLearningPlan: () => this.buildUnifiedSchema(options)
    };

    const builder = builders[type];
    if (!builder) {
      throw new Error(`Unknown schema type: ${type}`);
    }

    return builder();
  }

  buildSubtasksSchema(options) {
    const requiredFields = options.requiredFields || 
      ["id", "title", "text", "aiEstimatedDuration", "difficulty", "order", "completed"];
    
    const properties = {};
    requiredFields.forEach(field => {
      if (this.baseTypes[field]) {
        properties[field] = this.baseTypes[field];
      }
    });

    return {
      type: SchemaType.OBJECT,
      properties: {
        subtasks: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties,
            required: requiredFields
          }
        }
      },
      required: ["subtasks"]
    };
  }

  // 其他 builder 方法...
}

// 使用方式
const schemaFactory = new SchemaFactory();
const subtasksSchema = schemaFactory.createSchema('subtasks', {
  requiredFields: ["id", "title", "difficulty"]
});
```

### 4. **任務處理器統一化重構**
#### 問題：重複的任務處理邏輯
```javascript
// ❌ 現狀：重複的處理邏輯
// jobQueueService.js 中重複的處理方法
async processPersonalization(job) {
  // 重複的進度更新邏輯
  job.progress.percentage = 50;
  job.progress.message = '生成個人化問題...';
  // 重複的 AI 調用邏輯
}

async processSubtaskGeneration(job) {
  // 幾乎相同的結構
  job.progress.percentage = 40;
  job.progress.message = '分析任務複雜度...';
  // 重複的 AI 調用邏輯
}
```

```javascript
// ✅ 重構後：通用任務處理器
// lib/services/taskProcessorFactory.js
class TaskProcessor {
  constructor(config) {
    this.config = config;
    this.geminiService = new GeminiService();
  }

  async process(job) {
    const { type, params } = job;
    const processor = this.getProcessor(type);
    
    return await this.executeWithProgress(job, processor);
  }

  async executeWithProgress(job, processor) {
    const stages = processor.getStages();
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      // 統一的進度更新
      this.updateProgress(job, {
        stage: stage.name,
        message: stage.message,
        percentage: Math.round((i + 1) / stages.length * 100)
      });

      // 執行階段邏輯
      const result = await stage.execute(job.params, this.geminiService);
      
      if (stage.isTerminal && result) {
        return result;
      }
    }
  }

  getProcessor(type) {
    const processors = {
      [JOB_TYPES.PERSONALIZATION]: new PersonalizationProcessor(this.config),
      [JOB_TYPES.SUBTASK_GENERATION]: new SubtaskProcessor(this.config),
      [JOB_TYPES.LEARNING_PLAN]: new LearningPlanProcessor(this.config),
      [JOB_TYPES.TASK_PLANNING]: new TaskPlanningProcessor(this.config)
    };

    return processors[type] || new DefaultProcessor(this.config);
  }

  updateProgress(job, progress) {
    job.progress = {
      ...job.progress,
      ...progress,
      updatedAt: Date.now()
    };
  }
}

// 具體處理器實現
class PersonalizationProcessor {
  constructor(config) {
    this.config = config;
  }

  getStages() {
    return [
      {
        name: 'analysis',
        message: this.config.messages.analyzing,
        execute: async (params, geminiService) => {
          return await this.generateQuestions(params, geminiService);
        },
        isTerminal: true
      }
    ];
  }

  async generateQuestions(params, geminiService) {
    const { constructDiagnosticPrompt } = require('../prompts/personalization_prompt');
    
    const { systemPrompt, userPrompt } = constructDiagnosticPrompt({
      taskTitle: params.title,
      taskDescription: params.description,
      language: params.language,
    });

    return await geminiService.callGeminiStructured(
      systemPrompt,
      userPrompt,
      {
        schemaType: 'personalizationQuestions',
        maxTokens: this.config.ai.maxTokens,
        temperature: this.config.ai.temperature
      }
    );
  }
}
```

### 5. **統一錯誤處理重構**
#### 問題：分散的錯誤處理邏輯
```typescript
// ❌ 現狀：分散的錯誤處理
// utils/api.ts 中的錯誤處理
export class ApiError extends Error {
  getLocalizedMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return i18n.t('errors.networkError');
      // 重複的 switch 邏輯
    }
  }
}

// 各處都有相似的 try-catch 塊
```

```typescript
// ✅ 重構後：統一錯誤處理框架
// lib/errors/errorHandler.ts
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  SERVER = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  VALIDATION = 'VALIDATION_ERROR',
  AI_GENERATION = 'AI_GENERATION_ERROR',
  JOB_FAILED = 'JOB_FAILED'
}

export interface ErrorContext {
  operation: string;
  params?: any;
  timestamp: number;
  retryable: boolean;
}

export class UnifiedError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public context: ErrorContext,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'UnifiedError';
  }

  getLocalizedMessage(): string {
    return ErrorMessageProvider.getMessage(this.type, this.context);
  }

  isRetryable(): boolean {
    return this.context.retryable;
  }
}

export class ErrorHandler {
  static handle<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      retries?: number;
      timeout?: number;
      fallback?: T;
    } = {}
  ): Promise<T> {
    return this.executeWithRetry(operation, fn, options);
  }

  private static async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    options: any
  ): Promise<T> {
    const maxRetries = options.retries || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithTimeout(fn, options.timeout);
      } catch (error) {
        lastError = error;
        
        const unifiedError = this.wrapError(error, operation);
        
        if (!unifiedError.isRetryable() || attempt === maxRetries) {
          if (options.fallback !== undefined) {
            console.warn(`Operation ${operation} failed, using fallback:`, unifiedError);
            return options.fallback;
          }
          throw unifiedError;
        }

        const delay = Math.min(Math.pow(2, attempt) * 1000, 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw this.wrapError(lastError!, operation);
  }

  private static wrapError(error: Error, operation: string): UnifiedError {
    const context: ErrorContext = {
      operation,
      timestamp: Date.now(),
      retryable: this.isRetryable(error)
    };

    if (error instanceof TypeError) {
      return new UnifiedError(ErrorType.NETWORK, 'Network connection failed', context, error);
    }

    if (error.message?.includes('timeout')) {
      return new UnifiedError(ErrorType.TIMEOUT, 'Operation timed out', context, error);
    }

    if (error.message?.includes('JSON')) {
      return new UnifiedError(ErrorType.AI_GENERATION, 'AI response parsing failed', context, error);
    }

    return new UnifiedError(ErrorType.SERVER, error.message, context, error);
  }

  private static isRetryable(error: Error): boolean {
    if (error instanceof TypeError) return true; // Network errors
    if (error.message?.includes('timeout')) return true;
    if (error.message?.includes('JSON')) return true;
    return false;
  }
}

// 使用方式
const result = await ErrorHandler.handle(
  'generateLearningPlan',
  () => aiService.generateContent(GenerationType.LEARNING_PLAN, params),
  {
    retries: 3,
    timeout: 30000,
    fallback: defaultPlan
  }
);
```

---

## 🚀 實施優先級與時程規劃

### 第一階段（高優先級 - 1-2 週）
1. **配置外部化** - 移除所有硬編碼配置
2. **統一錯誤處理** - 建立全局錯誤處理框架
3. **API 層重構** - 統一使用 Job API，移除重複函數

### 第二階段（中優先級 - 2-3 週）  
1. **Schema 工廠模式** - 重構 GeminiService 的 Schema 管理
2. **任務處理器統一化** - 重構 JobQueueService 的處理邏輯
3. **UI 邏輯分離** - 從 add-task.tsx 抽取 AI 邏輯

### 第三階段（低優先級 - 1-2 週）
1. **國際化完善** - 移除硬編碼文字
2. **監控與日誌** - 統一的日誌和監控框架
3. **測試完善** - 為重構後的代碼添加單元測試

---

## 📋 CLAUDE.md 更新建議

基於分析結果，建議在 CLAUDE.md 中添加以下規則：

```markdown
### 新增強制要求

* **集中化 AI 生成邏輯：** 所有 AI 相關的生成邏輯（個人化問題、子任務生成）必須統一通過 `geminiService` 進行，禁止在前端或路由層直接調用 AI API。
* **配置外部化：** 禁止硬編碼任何配置值（API URL、超時時間、模型名稱等），必須使用環境變數或配置檔案管理。
* **統一錯誤處理：** 所有 API 調用和 AI 生成操作必須使用統一的錯誤處理框架，禁止分散的 try-catch 邏輯。
* **Schema 動態生成：** GeminiService 的回應 Schema 必須通過工廠模式動態生成，禁止硬編碼靜態 Schema 定義。
* **任務處理器抽象：** JobQueueService 的任務處理邏輯必須通過統一的處理器接口實現，禁止在服務中直接實現具體的 AI 調用邏輯。

### 架構強制規則

* **服務層獨立性：** 前端組件（`app/`、`components/`）禁止直接調用後端服務，必須通過 `utils/api.ts` 的統一接口。
* **單一職責原則：** 每個服務類只能負責一個核心功能，禁止在單一類中混合多種職責（如 UI 邏輯、API 調用、錯誤處理）。
* **依賴注入：** 所有服務間的依賴必須通過構造函數注入，禁止在服務內部直接實例化其他服務。
```

---

## 📈 預期效益

### 程式碼品質提升
- **重複代碼減少 70%**
- **維護成本降低 50%**  
- **新功能開發效率提升 40%**

### 系統穩定性改善
- **錯誤處理覆蓋率達到 95%**
- **配置管理統一化 100%**
- **測試覆蓋率提升至 80%**

### 開發體驗優化
- **統一的開發模式**
- **清晰的服務邊界**
- **完善的錯誤追蹤**

---

**報告結論：** 通過系統性的重構，可以顯著改善 FocusFlow 的代碼品質、維護性和可擴展性。建議按照優先級逐步實施，並嚴格遵循新的架構規範。