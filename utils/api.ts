import i18n from '../constants/i18n';
import { getConfig } from '../config/appConfig';
import { 
  ErrorHandler, 
  withErrorHandling, 
  UnifiedError, 
  ErrorType, 
  createError,
  ApiError // 保持兼容性
} from '../lib/errors/errorHandler';

// 🔧 Phase 5 修復：JSON 韌性工具函數
function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function attemptJSONRepair(text: string): string | null {
  try {
    // 常見的截斷模式修復
    let repairedText = text.trim();
    
    // 如果以逗號結尾，移除逗號並嘗試閉合
    if (repairedText.endsWith(',')) {
      repairedText = repairedText.slice(0, -1);
    }
    
    // 計算需要的閉合括號/大括號數量
    const openBraces = (repairedText.match(/\{/g) || []).length;
    const closeBraces = (repairedText.match(/\}/g) || []).length;
    const openBrackets = (repairedText.match(/\[/g) || []).length;
    const closeBrackets = (repairedText.match(/\]/g) || []).length;
    
    // 添加缺失的閉合符號
    const missingBraces = openBraces - closeBraces;
    const missingBrackets = openBrackets - closeBrackets;
    
    for (let i = 0; i < missingBrackets; i++) {
      repairedText += ']';
    }
    for (let i = 0; i < missingBraces; i++) {
      repairedText += '}';
    }
    
    // 驗證修復結果
    if (isValidJSON(repairedText)) {
      return repairedText;
    }
    
    return null;
  } catch {
    return null;
  }
}

// 🔧 Phase 1B: 使用統一配置系統替代硬編碼配置
const appConfig = getConfig();

// 🆕 作業狀態枚舉（與後端保持一致）
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
} as const;

// 🆕 作業類型枚舉（與後端保持一致）
export const JOB_TYPES = {
  TASK_PLANNING: 'task_planning',
  PERSONALIZATION: 'personalization', 
  SUBTASK_GENERATION: 'subtask_generation',
  LEARNING_PLAN: 'learning_plan'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];
export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];

// 🆕 作業提交結果介面
export interface JobSubmissionResult {
  jobId: string;
  type: JobType;
  status: JobStatus;
  estimatedDuration: number;
  message: string;
  pollEndpoint: string;
  createdAt: string;
}

// 🆕 作業狀態查詢結果介面
export interface JobStatusResult {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: {
    stage: string;
    message: string;
    percentage: number;
  };
  result?: any;
  error?: any;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  runningTime: number;
  estimatedDuration: number;
  estimatedRemainingTime?: number;
  isDelayed: boolean;
  message: string;
  polling?: {
    shouldContinue: boolean;
    nextPollDelay: number;
    maxPolls: number;
    timeoutWarning: boolean;
  };
}

// 🔧 Phase 1C: 移除舊的 ApiError 定義，使用統一錯誤處理框架

// HTTP methods type
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request options interface
interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// 🔧 Phase 1C: 使用統一錯誤處理框架重構的 API 請求函數
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  return withErrorHandling(
    `api_request_${endpoint}`,
    async () => {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = appConfig.api.timeout // 使用配置系統的超時設定
  } = options;

  const fullUrl = `${appConfig.api.baseUrl}${endpoint}`;
  
  // 🔧 詳細的網路調試日誌
  console.log('🌐 [API-REQUEST] 開始網路請求');
  console.log('🌐 [API-REQUEST] Platform:', appConfig.platform);
  console.log('🌐 [API-REQUEST] Environment:', appConfig.isDevelopment ? 'development' : 'production');
  console.log('🌐 [API-REQUEST] API Base URL:', appConfig.api.baseUrl);
  console.log('🌐 [API-REQUEST] Full URL:', fullUrl);
  console.log('🌐 [API-REQUEST] Method:', method);
  console.log('🌐 [API-REQUEST] Body:', body ? JSON.stringify(body) : 'none');

      const requestConfig: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
          ...headers,
        },
        ...(body && { body: JSON.stringify(body) }),
      };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log('🌐 [API-REQUEST] 發送 fetch 請求...');
        const response = await fetch(fullUrl, {
          ...requestConfig,
          signal: controller.signal,
        });

    clearTimeout(timeoutId);
    
    console.log('🌐 [API-REQUEST] 收到回應');
    console.log('🌐 [API-REQUEST] Status:', response.status);
    console.log('🌐 [API-REQUEST] Status Text:', response.statusText);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorData = await response.json();
            console.log('🌐 [API-REQUEST] Error data:', errorData);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // 無法解析錯誤回應，使用默認訊息
          }

          console.error('🌐 [API-REQUEST] HTTP 錯誤:', errorMessage);
          
          // 根據 HTTP 狀態碼創建適當的錯誤
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`${response.status} ${errorMessage}`);
          } else if (response.status >= 500) {
            throw new Error(`${response.status} ${errorMessage}`);
          } else {
            throw new Error(errorMessage);
          }
        }

    // 🔧 增強 JSON 解析韌性 - Phase 5 修復
    let responseText = '';
    try {
      responseText = await response.text();
      console.log('🌐 [API-REQUEST] Response text length:', responseText.length);
      
      // 檢查 JSON 完整性
      if (!isValidJSON(responseText)) {
        console.warn('🌐 [API-REQUEST] 偵測到不完整的 JSON 回應');
        console.log('🌐 [API-REQUEST] Raw text (last 100 chars):', responseText.slice(-100));
        
        // 嘗試修復截斷的 JSON
        const repairedJSON = attemptJSONRepair(responseText);
        if (repairedJSON) {
          console.log('🌐 [API-REQUEST] JSON 修復成功');
          const data = JSON.parse(repairedJSON);
          console.log('🌐 [API-REQUEST] 修復後資料keys:', Object.keys(data));
          return data as T;
        } else {
          throw new Error('JSON response appears truncated and cannot be repaired');
        }
      }
      
      const data = JSON.parse(responseText);
      console.log('🌐 [API-REQUEST] 成功收到資料');
      console.log('🌐 [API-REQUEST] Response keys:', Object.keys(data));
      return data as T;
    } catch (parseError) {
      console.error('🌐 [API-REQUEST] JSON 解析錯誤:', parseError);
      console.log('🌐 [API-REQUEST] Response text preview:', responseText.substring(0, 200));
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }

      } catch (error) {
        clearTimeout(timeoutId);
        
        console.error('🌐 [API-REQUEST] 網路錯誤詳情:', error);
        console.error('🌐 [API-REQUEST] Error type:', error?.constructor?.name);
        console.error('🌐 [API-REQUEST] Error message:', error?.message);

        // 讓統一錯誤處理框架來分類和處理錯誤
        throw error;
      }
    },
    {
      retries: appConfig.api.retryCount,
      timeout: timeout || appConfig.api.timeout,
      context: {
        endpoint,
        method: options.method || 'GET',
        params: body,
        metadata: {
          fullUrl: `${appConfig.api.baseUrl}${endpoint}`,
          hasBody: !!body
        }
      }
    }
  );
}

// ==========================================
// 🚀 新的非同步作業 API 系統
// ==========================================

/**
 * 🆕 提交作業到後端佇列
 * @param type - 作業類型
 * @param params - 作業參數
 * @param options - 額外選項
 * @returns 作業提交結果，包含 jobId
 */
export async function submitJob(
  type: JobType,
  params: Record<string, any>,
  options: Record<string, any> = {}
): Promise<JobSubmissionResult> {
  try {
    console.log(`🚀 [JOB-API] Submitting ${type} job...`);
    
    const response = await apiRequest<JobSubmissionResult>('/jobs', {
      method: 'POST',
      body: { type, params, options }
    });
    
    console.log(`✅ [JOB-API] Job submitted successfully: ${response.jobId}`);
    return response;
    
  } catch (error) {
    console.error(`❌ [JOB-API] Failed to submit ${type} job:`, error);
    throw error;
  }
}

/**
 * 🆕 輪詢作業狀態 (Phase 5 Enhanced)
 * @param jobId - 作業ID
 * @param retryCount - 重試次數
 * @returns 作業狀態詳情
 */
export async function pollJobStatus(jobId: string, retryCount: number = 0): Promise<JobStatusResult> {
  const maxRetries = 3;
  
  try {
    const response = await apiRequest<JobStatusResult>(`/jobs/${jobId}`);
    return response;
    
  } catch (error) {
    console.error(`❌ [JOB-API] Failed to poll job ${jobId} (attempt ${retryCount + 1}):`, error);
    
    // 🔧 Phase 5: 針對 JSON 錯誤的特殊重試邏輯
    if (error instanceof Error && error.message.includes('Invalid JSON response') && retryCount < maxRetries) {
      console.log(`🔄 [JOB-API] JSON 錯誤重試 ${retryCount + 1}/${maxRetries}，等待 ${(retryCount + 1) * 1000}ms...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
      return pollJobStatus(jobId, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * 🆕 取消作業
 * @param jobId - 作業ID
 * @returns 取消結果
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🗑️ [JOB-API] Cancelling job: ${jobId}`);
    
    const response = await apiRequest<{ success: boolean; message: string }>(`/jobs/${jobId}`, {
      method: 'DELETE'
    });
    
    console.log(`✅ [JOB-API] Job cancellation result:`, response);
    return response;
    
  } catch (error) {
    console.error(`❌ [JOB-API] Failed to cancel job ${jobId}:`, error);
    throw error;
  }
}

/**
 * 🆕 輪詢直到作業完成
 * @param jobId - 作業ID
 * @param onProgress - 進度回調函數
 * @param maxPolls - 最大輪詢次數
 * @returns 最終作業結果
 */
export async function pollUntilComplete(
  jobId: string,
  onProgress?: (status: JobStatusResult) => void,
  maxPolls: number = 120 // 默認最多輪詢2分鐘
): Promise<JobStatusResult> {
  let pollCount = 0;
  
  while (pollCount < maxPolls) {
    try {
      const status = await pollJobStatus(jobId);
      
      // 呼叫進度回調
      if (onProgress) {
        onProgress(status);
      }
      
      // 檢查是否完成
      if (status.status === JOB_STATUS.COMPLETED) {
        console.log(`✅ [JOB-API] Job ${jobId} completed successfully`);
        return status;
      }
      
      if (status.status === JOB_STATUS.FAILED) {
        console.error(`❌ [JOB-API] Job ${jobId} failed:`, status.error);
        throw new ApiError(
          status.error?.message || 'Job failed',
          undefined,
          'JOB_FAILED'
        );
      }
      
      // 等待下次輪詢
      const delay = status.polling?.nextPollDelay || 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      pollCount++;
      
    } catch (error) {
      if (error instanceof ApiError && error.code === 'JOB_FAILED') {
        throw error;
      }
      
      console.warn(`⚠️ [JOB-API] Poll attempt ${pollCount + 1} failed for job ${jobId}:`, error);
      
      // 🔧 Phase 5: 特殊處理 JSON 解析錯誤
      if (error instanceof Error && error.message.includes('Invalid JSON response')) {
        console.log(`🔧 [JOB-API] JSON 解析錯誤偵測，使用延長等待策略`);
        // 針對 JSON 錯誤使用更長的等待時間，讓後端有更多時間完成回應
        if (pollCount < maxPolls - 1) {
          const extendedDelay = 5000 + (pollCount * 1000); // 5-8秒的延長等待
          console.log(`⏳ [JOB-API] Extended delay for JSON error: ${extendedDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, extendedDelay));
          pollCount++;
          continue;
        }
      }
      
      // 如果是其他網路錯誤，等待後重試
      if (pollCount < maxPolls - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        pollCount++;
        continue;
      }
      
      throw error;
    }
  }
  
  // 超過最大輪詢次數
  throw new ApiError(
    'Job polling timeout - please check job status manually',
    undefined,
    'POLLING_TIMEOUT'
  );
}

// ==========================================
// 🎯 特定任務的便利函數
// ==========================================

/**
 * 🆕 提交完整任務規劃作業
 */
export async function submitTaskPlanningJob(params: {
  title: string;
  description?: string;
  language?: "en" | "zh";
}): Promise<JobSubmissionResult> {
  return submitJob(JOB_TYPES.TASK_PLANNING, params);
}

/**
 * 🆕 提交個人化問題生成作業
 */
export async function submitPersonalizationJob(params: {
  title: string;
  description?: string;
  language?: "en" | "zh";
}): Promise<JobSubmissionResult> {
  return submitJob(JOB_TYPES.PERSONALIZATION, params);
}

/**
 * 🆕 提交子任務生成作業
 */
export async function submitSubtaskGenerationJob(params: {
  title: string;
  description?: string;
  clarificationResponses?: Record<string, string>;
  dueDate?: string;
  taskType?: string;
  currentProficiency?: string;
  targetProficiency?: string;
  language?: "en" | "zh";
}): Promise<JobSubmissionResult> {
  return submitJob(JOB_TYPES.SUBTASK_GENERATION, params);
}

/**
 * 🆕 提交學習計劃生成作業
 */
export async function submitLearningPlanJob(params: {
  title: string;
  description?: string;
  clarificationResponses?: Record<string, string>;
  taskType?: string;
  currentProficiency?: string;
  targetProficiency?: string;
  language?: "en" | "zh";
}): Promise<JobSubmissionResult> {
  return submitJob(JOB_TYPES.LEARNING_PLAN, params);
}

// ==========================================
// 🔄 向後兼容的包裝函數（暫時保留）
// ==========================================

/**
 * @deprecated 使用新的 submitTaskPlanningJob + pollUntilComplete
 * 暫時保留以維持向後兼容性
 */
export async function getDynamicQuestions(
  title: string, 
  description?: string, 
  language: "en" | "zh" = "en"
): Promise<any> {
  console.warn('⚠️ getDynamicQuestions is deprecated. Use submitPersonalizationJob + pollUntilComplete instead.');
  
  const jobResult = await submitPersonalizationJob({ title, description, language });
  const finalResult = await pollUntilComplete(jobResult.jobId);
  
  return finalResult.result;
}

/**
 * @deprecated 使用新的 submitSubtaskGenerationJob + pollUntilComplete
 * 暫時保留以維持向後兼容性
 */
export async function generateEnhancedSubtasks(params: {
  title: string;
  description?: string;
  clarificationResponses?: Record<string, string>;
  dueDate?: string;
  taskType?: string;
  currentProficiency?: string;
  targetProficiency?: string;
  language?: "en" | "zh";
}): Promise<any> {
  console.warn('⚠️ generateEnhancedSubtasks is deprecated. Use submitSubtaskGenerationJob + pollUntilComplete instead.');
  
  const jobResult = await submitSubtaskGenerationJob(params);
  const finalResult = await pollUntilComplete(jobResult.jobId);
  
  return finalResult.result;
}

// ==========================================
// 🔧 工具函數
// ==========================================

/**
 * 獲取作業狀態的用戶友好描述
 */
export function getJobStatusMessage(status: JobStatusResult): string {
  switch (status.status) {
    case JOB_STATUS.PENDING:
      return `作業在佇列中等待處理，預計需要 ${Math.ceil(status.estimatedDuration / 1000)} 秒`;
    case JOB_STATUS.PROCESSING:
      const remaining = status.estimatedRemainingTime ? Math.ceil(status.estimatedRemainingTime / 1000) : 0;
      return `正在處理中，預計還需 ${remaining} 秒`;
    case JOB_STATUS.COMPLETED:
      return '處理完成！';
    case JOB_STATUS.FAILED:
      return `處理失敗：${status.error?.message || '未知錯誤'}`;
    case JOB_STATUS.TIMEOUT:
      return '處理時間較長但仍在進行中，請稍等...';
    default:
      return '未知狀態';
  }
}

/**
 * 檢查作業是否仍在運行
 */
export function isJobRunning(status: JobStatusResult): boolean {
  return status.status === JOB_STATUS.PENDING || 
         status.status === JOB_STATUS.PROCESSING || 
         status.status === JOB_STATUS.TIMEOUT;
}

/**
 * 檢查作業是否已完成（成功或失敗）
 */
export function isJobFinished(status: JobStatusResult): boolean {
  return status.status === JOB_STATUS.COMPLETED || 
         status.status === JOB_STATUS.FAILED;
}

// Helper function to display user-friendly error messages
export function handleApiError(error: unknown, fallbackMessage?: string): string {
  if (error instanceof ApiError) {
    return error.getLocalizedMessage();
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return fallbackMessage || i18n.t('errors.unknownError');
}

// 統一學習計劃生成（呼叫 Job API）
export async function generateUnifiedLearningPlan(params: {
  title: string;
  description?: string;
  language?: "en" | "zh";
  taskType?: string;
  currentProficiency?: string;
  targetProficiency?: string;
  clarificationResponses?: Record<string, string>;
}): Promise<any> {
  // 🔧 修復：使用正確的 learning_plan 類型
  const jobResult = await submitLearningPlanJob(params);
  const finalResult = await pollUntilComplete(jobResult.jobId);
  
  // 🔧 修復數據格式不匹配問題
  const result = finalResult.result || finalResult;
  
  // 如果後端返回 questions，轉換為前端期待的 personalizationQuestions
  if (result.questions && !result.personalizationQuestions) {
    result.personalizationQuestions = result.questions;
  }
  
  return result;
}

// 安全的輸入品質評估（可用 Job API 或 fallback）
export async function evaluateInputQualitySafely(
  title: string,
  description?: string,
  language: "en" | "zh" = "zh"
): Promise<{ isSufficient: boolean; reasons?: string[] }> {
  // 這裡可以直接用 generateUnifiedLearningPlan，然後只取 isSufficient
  const result = await generateUnifiedLearningPlan({ title, description, language });
  if (result && typeof result.isSufficient === 'boolean') {
    return { isSufficient: result.isSufficient, reasons: result.reasons || [] };
  }
  // fallback
  return {
    isSufficient: title.length > 5 && (description?.length ?? 0) > 10,
    reasons: title.length <= 5 || (description?.length ?? 0) <= 10
      ? ["請提供更詳細的資訊以獲得更好的 AI 協助"]
      : []
  };
}

// 轉換 unified plan 結構為 app 需要的格式
export function convertUnifiedPlanToAppFormat(data: any): {
  questions: any[];
  learningPlan: any;
  subtasks: any[];
} {
  return {
    questions: data.personalizationQuestions || [],
    learningPlan: data.learningPlan || null,
    subtasks: data.subtasks || []
  };
}

// 產生學習計劃（兼容 legacy，呼叫 unified job）
export async function generatePlan(params: {
  title: string;
  description?: string;
  clarificationResponses?: Record<string, string>;
  dueDate?: string;
  taskType?: string;
  currentProficiency?: string;
  targetProficiency?: string;
  language?: "en" | "zh";
}): Promise<any> {
  // 直接呼叫 generateUnifiedLearningPlan
  return await generateUnifiedLearningPlan(params);
}

// 🆕 安全的學習問題生成（呼叫後端 API）
export async function generateLearningQuestionsSafely(
  summary: string,
  language: "en" | "zh" = "zh"
): Promise<{ questions: string[]; fallback?: boolean }> {
  try {
    const response = await apiRequest<{ questions: string[]; fallback?: boolean }>(
      '/generate-learning-questions',
      {
        method: 'POST',
        body: { summary, language },
        timeout: 20000
      }
    );
    if (response && Array.isArray(response.questions)) {
      return response;
    }
    // fallback
    return {
      questions: language === 'zh'
        ? ["您認為這個主題的關鍵要點是什麼？", "如何將所學知識應用到實際情境？", "學習過程中遇到的最大挑戰是什麼？"]
        : ["What are the key points of this topic?", "How can you apply what you learned?", "What was the biggest challenge during learning?"],
      fallback: true
    };
  } catch (error) {
    return {
      questions: language === 'zh'
        ? ["您認為這個主題的關鍵要點是什麼？", "如何將所學知識應用到實際情境？", "學習過程中遇到的最大挑戰是什麼？"]
        : ["What are the key points of this topic?", "How can you apply what you learned?", "What was the biggest challenge during learning?"],
      fallback: true
    };
  }
}

// 🆕 時間估算函數（使用後端 API）
export async function estimateTaskDuration(
  title: string,
  description?: string,
  difficulty?: string,
  subtasks?: any[]
): Promise<number> {
  try {
    const response = await apiRequest<{ success: boolean; estimatedDuration: number; fallback?: number }>(
      '/estimate-task-duration',
      {
        method: 'POST',
        body: { title, description, difficulty, subtasks },
        timeout: 15000
      }
    );
    
    if (response.success && response.estimatedDuration) {
      return response.estimatedDuration;
    }
    
    return response.fallback || 60;
  } catch (error) {
    console.error('Task duration estimation failed:', error);
    return 60; // 默認 1 小時
  }
}

export async function estimateSubtaskDuration(
  subtaskText: string,
  difficulty?: string
): Promise<number> {
  try {
    const response = await apiRequest<{ success: boolean; estimatedDuration: number; fallback?: number }>(
      '/estimate-subtask-duration',
      {
        method: 'POST',
        body: { subtaskText, difficulty },
        timeout: 10000
      }
    );
    
    if (response.success && response.estimatedDuration) {
      return response.estimatedDuration;
    }
    
    return response.fallback || 30;
  } catch (error) {
    console.error('Subtask duration estimation failed:', error);
    return 30; // 默認 30 分鐘
  }
}

export default {
  submitJob,
  pollJobStatus,
  cancelJob,
  pollUntilComplete,
  submitTaskPlanningJob,
  submitPersonalizationJob,
  submitSubtaskGenerationJob,
  submitLearningPlanJob,
  generateUnifiedLearningPlan,
  evaluateInputQualitySafely,
  convertUnifiedPlanToAppFormat,
  generatePlan,
  generateLearningQuestionsSafely,
  estimateTaskDuration,
  estimateSubtaskDuration
}; 