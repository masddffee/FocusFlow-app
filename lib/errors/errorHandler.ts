/**
 * FocusFlow 統一錯誤處理框架
 * 
 * 用途：
 * - 統一錯誤類型定義和處理邏輯
 * - 提供智能重試機制
 * - 支持錯誤回退策略
 * - 統一錯誤訊息本地化
 * - 錯誤監控和追蹤
 */

import i18n from '../../constants/i18n';
import { getConfig } from '../../config/appConfig';

/**
 * 錯誤類型枚舉
 */
export enum ErrorType {
  // 網路錯誤
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  DNS_ERROR = 'DNS_ERROR',
  
  // 服務器錯誤
  SERVER = 'SERVER_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY = 'BAD_GATEWAY',
  
  // 客戶端錯誤
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // AI 和業務邏輯錯誤
  AI_GENERATION = 'AI_GENERATION_ERROR',
  AI_QUOTA_EXCEEDED = 'AI_QUOTA_EXCEEDED',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  
  // 作業相關錯誤
  JOB_FAILED = 'JOB_FAILED',
  JOB_TIMEOUT = 'JOB_TIMEOUT',
  JOB_CANCELLED = 'JOB_CANCELLED',
  
  // 系統錯誤
  UNKNOWN = 'UNKNOWN_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

/**
 * 錯誤嚴重性等級
 */
export enum ErrorSeverity {
  LOW = 'low',       // 可忽略的錯誤，有回退機制
  MEDIUM = 'medium', // 需要注意但不影響核心功能
  HIGH = 'high',     // 影響重要功能，需要處理
  CRITICAL = 'critical' // 系統關鍵錯誤，需要立即處理
}

/**
 * 錯誤上下文介面
 */
export interface ErrorContext {
  /** 操作名稱 */
  operation: string;
  /** 操作參數 */
  params?: any;
  /** 錯誤發生時間戳 */
  timestamp: number;
  /** 是否可重試 */
  retryable: boolean;
  /** 用戶ID（如果有） */
  userId?: string;
  /** 會話ID */
  sessionId?: string;
  /** 瀏覽器/平台信息 */
  userAgent?: string;
  /** 額外的上下文數據 */
  metadata?: Record<string, any>;
}

/**
 * 重試配置介面
 */
export interface RetryConfig {
  /** 最大重試次數 */
  maxRetries: number;
  /** 基礎延遲時間（毫秒） */
  baseDelay: number;
  /** 延遲倍數（指數退避） */
  delayMultiplier: number;
  /** 最大延遲時間（毫秒） */
  maxDelay: number;
  /** 是否使用抖動 */
  useJitter: boolean;
}

/**
 * 統一錯誤類別
 */
export class UnifiedError extends Error {
  public readonly errorId: string;
  public readonly timestamp: number;
  public readonly severity: ErrorSeverity;

  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly context: ErrorContext,
    public readonly originalError?: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'UnifiedError';
    this.errorId = this.generateErrorId();
    this.timestamp = Date.now();
    this.severity = severity;
    
    // 維持錯誤堆疊追蹤
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnifiedError);
    }
  }

  /**
   * 生成唯一錯誤ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `err_${timestamp}_${random}`;
  }

  /**
   * 獲取本地化錯誤訊息
   */
  getLocalizedMessage(): string {
    return ErrorMessageProvider.getMessage(this.type, this.context);
  }

  /**
   * 檢查是否可重試
   */
  isRetryable(): boolean {
    return this.context.retryable && this.isRetryableType();
  }

  /**
   * 檢查錯誤類型是否支持重試
   */
  private isRetryableType(): boolean {
    const retryableTypes = [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.CONNECTION_REFUSED,
      ErrorType.SERVER,
      ErrorType.INTERNAL_SERVER_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.BAD_GATEWAY,
      ErrorType.JSON_PARSE_ERROR,
      ErrorType.JOB_TIMEOUT,
      ErrorType.AI_GENERATION // 🔧 修復：AI 生成錯誤也應該可重試
    ];
    
    return retryableTypes.includes(this.type);
  }

  /**
   * 轉換為可序列化的對象
   */
  toJSON() {
    return {
      errorId: this.errorId,
      type: this.type,
      message: this.message,
      localizedMessage: this.getLocalizedMessage(),
      timestamp: this.timestamp,
      severity: this.severity,
      context: this.context,
      isRetryable: this.isRetryable(),
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * 錯誤訊息提供者
 */
export class ErrorMessageProvider {
  /**
   * 獲取本地化錯誤訊息
   */
  static getMessage(type: ErrorType, context: ErrorContext): string {
    const key = this.getI18nKey(type);
    
    try {
      // 嘗試獲取本地化訊息
      const message = i18n.t(key);
      
      // 如果訊息包含變量，進行替換
      if (message.includes('{{')) {
        return this.interpolateMessage(message, context);
      }
      
      return message;
    } catch (error) {
      // 回退到默認英文訊息
      return this.getDefaultMessage(type);
    }
  }

  /**
   * 獲取 i18n 鍵值
   */
  private static getI18nKey(type: ErrorType): string {
    const keyMap: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'errors.network',
      [ErrorType.TIMEOUT]: 'errors.timeout',
      [ErrorType.CONNECTION_REFUSED]: 'errors.connectionRefused',
      [ErrorType.DNS_ERROR]: 'errors.dnsError',
      [ErrorType.SERVER]: 'errors.server',
      [ErrorType.INTERNAL_SERVER_ERROR]: 'errors.internalServerError',
      [ErrorType.SERVICE_UNAVAILABLE]: 'errors.serviceUnavailable',
      [ErrorType.BAD_GATEWAY]: 'errors.badGateway',
      [ErrorType.BAD_REQUEST]: 'errors.badRequest',
      [ErrorType.UNAUTHORIZED]: 'errors.unauthorized',
      [ErrorType.FORBIDDEN]: 'errors.forbidden',
      [ErrorType.NOT_FOUND]: 'errors.notFound',
      [ErrorType.VALIDATION_ERROR]: 'errors.validation',
      [ErrorType.AI_GENERATION]: 'errors.aiGeneration',
      [ErrorType.AI_QUOTA_EXCEEDED]: 'errors.aiQuotaExceeded',
      [ErrorType.AI_MODEL_ERROR]: 'errors.aiModelError',
      [ErrorType.JSON_PARSE_ERROR]: 'errors.jsonParse',
      [ErrorType.JOB_FAILED]: 'errors.jobFailed',
      [ErrorType.JOB_TIMEOUT]: 'errors.jobTimeout',
      [ErrorType.JOB_CANCELLED]: 'errors.jobCancelled',
      [ErrorType.UNKNOWN]: 'errors.unknown',
      [ErrorType.CONFIGURATION_ERROR]: 'errors.configuration',
      [ErrorType.PERMISSION_DENIED]: 'errors.permissionDenied'
    };

    return keyMap[type] || 'errors.unknown';
  }

  /**
   * 訊息變量插值
   */
  private static interpolateMessage(message: string, context: ErrorContext): string {
    return message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context.metadata?.[key] || context[key as keyof ErrorContext] || match;
    });
  }

  /**
   * 獲取默認英文訊息
   */
  private static getDefaultMessage(type: ErrorType): string {
    const defaultMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Network connection error. Please check your internet connection.',
      [ErrorType.TIMEOUT]: 'Request timeout. Please try again.',
      [ErrorType.CONNECTION_REFUSED]: 'Connection refused. The server may be unavailable.',
      [ErrorType.DNS_ERROR]: 'DNS resolution failed. Please check your network settings.',
      [ErrorType.SERVER]: 'Server error occurred. Please try again later.',
      [ErrorType.INTERNAL_SERVER_ERROR]: 'Internal server error. Please contact support if this persists.',
      [ErrorType.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
      [ErrorType.BAD_GATEWAY]: 'Bad gateway. The server received an invalid response.',
      [ErrorType.BAD_REQUEST]: 'Invalid request. Please check your input.',
      [ErrorType.UNAUTHORIZED]: 'Unauthorized access. Please log in again.',
      [ErrorType.FORBIDDEN]: 'Access forbidden. You do not have permission for this action.',
      [ErrorType.NOT_FOUND]: 'Resource not found.',
      [ErrorType.VALIDATION_ERROR]: 'Validation error. Please check your input.',
      [ErrorType.AI_GENERATION]: 'AI generation failed. Please try again.',
      [ErrorType.AI_QUOTA_EXCEEDED]: 'AI quota exceeded. Please try again later.',
      [ErrorType.AI_MODEL_ERROR]: 'AI model error. Please try again.',
      [ErrorType.JSON_PARSE_ERROR]: 'Data parsing error. Please try again.',
      [ErrorType.JOB_FAILED]: 'Job execution failed. Please try again.',
      [ErrorType.JOB_TIMEOUT]: 'Job execution timeout. Please try again.',
      [ErrorType.JOB_CANCELLED]: 'Job was cancelled.',
      [ErrorType.UNKNOWN]: 'An unknown error occurred. Please try again.',
      [ErrorType.CONFIGURATION_ERROR]: 'Configuration error. Please contact support.',
      [ErrorType.PERMISSION_DENIED]: 'Permission denied. Please check your access rights.'
    };

    return defaultMessages[type] || 'An unknown error occurred.';
  }
}

/**
 * 統一錯誤處理器
 */
export class ErrorHandler {
  private static config = getConfig();

  /**
   * 處理錯誤並提供重試機制
   */
  static async handle<T>(
    operation: string,
    fn: () => Promise<T>,
    options: {
      retries?: number;
      timeout?: number;
      fallback?: T;
      retryConfig?: Partial<RetryConfig>;
      context?: Partial<ErrorContext>;
    } = {}
  ): Promise<T> {
    const retryConfig: RetryConfig = {
      maxRetries: options.retries || 3,
      baseDelay: 1000,
      delayMultiplier: 2,
      maxDelay: 8000,
      useJitter: true,
      ...options.retryConfig
    };

    const context: ErrorContext = {
      operation,
      timestamp: Date.now(),
      retryable: true,
      sessionId: ErrorHandler.generateSessionId(),
      userAgent: ErrorHandler.getUserAgent(),
      ...options.context
    };

    return ErrorHandler.executeWithRetry(fn, retryConfig, context, options.fallback);
  }

  /**
   * 執行帶重試的函數
   */
  private static async executeWithRetry<T>(
    fn: () => Promise<T>,
    retryConfig: RetryConfig,
    context: ErrorContext,
    fallback?: T
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= retryConfig.maxRetries) {
      try {
        // 如果有超時設定，使用超時控制
        const timeoutPromise = ErrorHandler.config.api.timeout > 0 
          ? ErrorHandler.withTimeout(fn(), ErrorHandler.config.api.timeout)
          : fn();

        return await timeoutPromise;
      } catch (error) {
        lastError = error as Error;
        
        const unifiedError = ErrorHandler.wrapError(error as Error, context);
        
        // 記錄錯誤
        ErrorHandler.logError(unifiedError, attempt + 1);
        
        // 如果不可重試或已達最大重試次數
        if (!unifiedError.isRetryable() || attempt === retryConfig.maxRetries) {
          if (fallback !== undefined) {
            console.warn(`🔄 [ErrorHandler] Operation ${context.operation} failed, using fallback:`, unifiedError.toJSON());
            return fallback;
          }
          throw unifiedError;
        }

        // 計算延遲時間
        const delay = ErrorHandler.calculateDelay(attempt, retryConfig);
        console.log(`🔄 [ErrorHandler] Retrying ${context.operation} in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        
        // 等待後重試
        await ErrorHandler.delay(delay);
        attempt++;
      }
    }

    // 如果所有重試都失敗了
    if (fallback !== undefined) {
      console.warn(`🔄 [ErrorHandler] All retries failed for ${context.operation}, using fallback`);
      return fallback;
    }

    throw ErrorHandler.wrapError(lastError!, context);
  }

  /**
   * 添加超時控制
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * 包裝錯誤為統一錯誤格式
   */
  static wrapError(error: Error, context: ErrorContext): UnifiedError {
    // 如果已經是統一錯誤，直接返回
    if (error instanceof UnifiedError) {
      return error;
    }

    const errorType = ErrorHandler.classifyError(error);
    const severity = ErrorHandler.determineSeverity(errorType);
    
    return new UnifiedError(errorType, error.message, context, error, severity);
  }

  /**
   * 分類錯誤類型
   */
  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // 網路錯誤
    if (name === 'typeerror' && (message.includes('fetch') || message.includes('network'))) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('timeout') || name.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }

    if (message.includes('connection refused') || message.includes('econnrefused')) {
      return ErrorType.CONNECTION_REFUSED;
    }

    if (message.includes('dns') || message.includes('enotfound')) {
      return ErrorType.DNS_ERROR;
    }

    // JSON 解析錯誤
    if (message.includes('json') || message.includes('parse') || name.includes('syntaxerror')) {
      return ErrorType.JSON_PARSE_ERROR;
    }

    // AI 相關錯誤
    if (message.includes('quota') || message.includes('rate limit')) {
      return ErrorType.AI_QUOTA_EXCEEDED;
    }

    if (message.includes('model') || message.includes('ai generation')) {
      return ErrorType.AI_GENERATION;
    }

    // 作業相關錯誤
    if (message.includes('job failed') || message.includes('job error')) {
      return ErrorType.JOB_FAILED;
    }

    if (message.includes('job timeout')) {
      return ErrorType.JOB_TIMEOUT;
    }

    // HTTP 狀態碼錯誤（如果錯誤中包含狀態碼信息）
    if (message.includes('400') || message.includes('bad request')) {
      return ErrorType.BAD_REQUEST;
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return ErrorType.UNAUTHORIZED;
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return ErrorType.FORBIDDEN;
    }

    if (message.includes('404') || message.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }

    if (message.includes('500') || message.includes('internal server error')) {
      return ErrorType.INTERNAL_SERVER_ERROR;
    }

    if (message.includes('502') || message.includes('bad gateway')) {
      return ErrorType.BAD_GATEWAY;
    }

    if (message.includes('503') || message.includes('service unavailable')) {
      return ErrorType.SERVICE_UNAVAILABLE;
    }

    // 默認分類
    return ErrorType.UNKNOWN;
  }

  /**
   * 確定錯誤嚴重性
   */
  private static determineSeverity(type: ErrorType): ErrorSeverity {
    const severityMap: Record<ErrorType, ErrorSeverity> = {
      [ErrorType.NETWORK]: ErrorSeverity.HIGH,
      [ErrorType.TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorType.CONNECTION_REFUSED]: ErrorSeverity.HIGH,
      [ErrorType.DNS_ERROR]: ErrorSeverity.HIGH,
      [ErrorType.SERVER]: ErrorSeverity.HIGH,
      [ErrorType.INTERNAL_SERVER_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorType.SERVICE_UNAVAILABLE]: ErrorSeverity.HIGH,
      [ErrorType.BAD_GATEWAY]: ErrorSeverity.HIGH,
      [ErrorType.BAD_REQUEST]: ErrorSeverity.MEDIUM,
      [ErrorType.UNAUTHORIZED]: ErrorSeverity.HIGH,
      [ErrorType.FORBIDDEN]: ErrorSeverity.HIGH,
      [ErrorType.NOT_FOUND]: ErrorSeverity.MEDIUM,
      [ErrorType.VALIDATION_ERROR]: ErrorSeverity.LOW,
      [ErrorType.AI_GENERATION]: ErrorSeverity.MEDIUM,
      [ErrorType.AI_QUOTA_EXCEEDED]: ErrorSeverity.HIGH,
      [ErrorType.AI_MODEL_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.JSON_PARSE_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorType.JOB_FAILED]: ErrorSeverity.MEDIUM,
      [ErrorType.JOB_TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorType.JOB_CANCELLED]: ErrorSeverity.LOW,
      [ErrorType.UNKNOWN]: ErrorSeverity.MEDIUM,
      [ErrorType.CONFIGURATION_ERROR]: ErrorSeverity.CRITICAL,
      [ErrorType.PERMISSION_DENIED]: ErrorSeverity.HIGH
    };

    return severityMap[type] || ErrorSeverity.MEDIUM;
  }

  /**
   * 計算重試延遲時間
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.delayMultiplier, attempt);
    delay = Math.min(delay, config.maxDelay);
    
    // 添加抖動以避免雷群效應
    if (config.useJitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.round(delay);
  }

  /**
   * 延遲執行
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 記錄錯誤
   */
  private static logError(error: UnifiedError, attempt: number): void {
    const logLevel = error.severity === ErrorSeverity.CRITICAL ? 'error' : 
                    error.severity === ErrorSeverity.HIGH ? 'error' : 
                    error.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';

    const logData = {
      errorId: error.errorId,
      type: error.type,
      operation: error.context.operation,
      attempt,
      retryable: error.isRetryable(),
      message: error.message,
      context: error.context
    };

    console[logLevel](`🚨 [ErrorHandler] ${error.type}:`, logData);

    // 在開發環境中，可以發送到錯誤監控服務
    if (ErrorHandler.config.isDevelopment && error.severity === ErrorSeverity.CRITICAL) {
      ErrorHandler.captureErrorSnapshot(error);
    }
  }

  /**
   * 捕獲錯誤快照（開發環境）
   */
  private static captureErrorSnapshot(error: UnifiedError): void {
    if (typeof global !== 'undefined' && global.captureErrorSnapshot) {
      global.captureErrorSnapshot(error, error.context);
    }
  }

  /**
   * 生成會話ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 獲取用戶代理字符串
   */
  private static getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return `FocusFlow/${ErrorHandler.config.platform}`;
  }
}

/**
 * 快捷錯誤處理函數
 */
export const withErrorHandling = ErrorHandler.handle;

/**
 * 創建統一錯誤的快捷函數
 */
export function createError(
  type: ErrorType,
  message: string,
  operation: string,
  metadata?: Record<string, any>
): UnifiedError {
  const context: ErrorContext = {
    operation,
    timestamp: Date.now(),
    retryable: true,
    metadata
  };
  
  return new UnifiedError(type, message, context);
}

/**
 * 兼容性：保留原有的 ApiError 導出
 * @deprecated 請使用 UnifiedError 替代
 */
export class ApiError extends UnifiedError {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    // 將舊的 code 轉換為新的 ErrorType
    const errorType = code ? 
      (Object.values(ErrorType).includes(code as ErrorType) ? 
        code as ErrorType : ErrorType.UNKNOWN) : 
      ErrorType.UNKNOWN;

    const context: ErrorContext = {
      operation: 'legacy_api_call',
      timestamp: Date.now(),
      retryable: true,
      metadata: { statusCode, legacyCode: code }
    };

    super(errorType, message, context);
    this.name = 'ApiError';
  }

  getLocalizedMessage(): string {
    return super.getLocalizedMessage();
  }
}