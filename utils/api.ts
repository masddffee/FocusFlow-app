import i18n from '../constants/i18n';

// API configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8080/api' 
  : 'https://your-production-api.com/api';

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

// Generic API error class with i18n support
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  getLocalizedMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return i18n.t('errors.networkError');
      case 'SERVER_ERROR':
        return i18n.t('errors.serverError');
      case 'TIMEOUT':
        return i18n.t('errors.timeout');
      case 'NOT_FOUND':
        return i18n.t('errors.notFound');
      case 'UNAUTHORIZED':
        return i18n.t('errors.unauthorized');
      case 'FORBIDDEN':
        return i18n.t('errors.forbidden');
      case 'VALIDATION_ERROR':
        return i18n.t('errors.validationError');
      default:
        return i18n.t('errors.unknownError');
    }
  }
}

// HTTP methods type
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request options interface
interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// 🆕 簡化的 API 請求函數（移除複雜的錯誤修復邏輯）
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 10000 // 恢復為10秒，因為作業API不需要長超時
  } = options;

  const config: RequestInit = {
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode = 'SERVER_ERROR';

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // 無法解析錯誤回應，使用默認訊息
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof TypeError) {
      throw new ApiError(
        i18n.t('errors.networkError'),
        undefined,
        'NETWORK_ERROR'
      );
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        i18n.t('errors.timeout'),
        undefined,
        'TIMEOUT'
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      i18n.t('errors.unknownError'),
      undefined,
      'UNKNOWN_ERROR'
    );
  }
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
 * 🆕 輪詢作業狀態
 * @param jobId - 作業ID
 * @returns 作業狀態詳情
 */
export async function pollJobStatus(jobId: string): Promise<JobStatusResult> {
  try {
    const response = await apiRequest<JobStatusResult>(`/jobs/${jobId}`);
    return response;
    
  } catch (error) {
    console.error(`❌ [JOB-API] Failed to poll job ${jobId}:`, error);
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
      
      // 如果是網路錯誤，等待後重試
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
  // 這裡直接呼叫 submitLearningPlanJob，然後 pollUntilComplete
  const jobResult = await submitLearningPlanJob(params);
  const finalResult = await pollUntilComplete(jobResult.jobId);
  return finalResult.result || finalResult; // 兼容不同後端格式
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