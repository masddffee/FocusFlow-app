/**
 * FocusFlow 統一配置管理系統
 * 
 * 用途：
 * - 統一管理所有硬編碼配置
 * - 支持環境變數覆寫
 * - 提供類型安全的配置訪問
 * - 支持開發/生產環境自動切換
 */

import { Platform } from 'react-native';

export interface ApiConfig {
  /** API 基礎 URL */
  baseUrl: string;
  /** 請求超時時間（毫秒） */
  timeout: number;
  /** 重試次數 */
  retryCount: number;
  /** 作業 API 超時時間（毫秒） */
  jobTimeout: number;
}

export interface AiConfig {
  /** 預設 AI 模型 */
  defaultModel: string;
  /** 最大 Token 數 */
  maxTokens: number;
  /** 生成溫度 */
  temperature: number;
  /** 請求超時時間（毫秒） */
  requestTimeout: number;
}

export interface QueueConfig {
  /** 最大並發作業數 */
  maxConcurrentJobs: number;
  /** 作業超時時間（毫秒） */
  jobTimeout: number;
  /** 作業過期時間（毫秒） */
  jobExpiryTime: number;
  /** 輪詢間隔（毫秒） */
  pollInterval: number;
}

export interface TestConfig {
  /** 測試環境 API URL */
  testApiUrl: string;
  /** 測試超時時間（毫秒） */
  testTimeout: number;
  /** 啟用測試模式 */
  enableTestMode: boolean;
}

export interface AppConfig {
  /** API 相關配置 */
  api: ApiConfig;
  /** AI 相關配置 */
  ai: AiConfig;
  /** 作業佇列相關配置 */
  queue: QueueConfig;
  /** 測試相關配置 */
  test: TestConfig;
  /** 是否為開發環境 */
  isDevelopment: boolean;
  /** 是否為生產環境 */
  isProduction: boolean;
  /** 當前平台 */
  platform: string;
}

/**
 * 獲取 API 基礎 URL
 * 支持環境變數覆寫，開發環境自動選擇合適的 localhost 地址
 */
function getApiBaseUrl(): string {
  // 優先使用環境變數
  const envApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // 開發環境自動配置
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api';  // Android 模擬器專用 IP
    }
    return 'http://localhost:8080/api';   // iOS 模擬器/實體設備
  }
  
  // 生產環境預設（應該通過環境變數設定）
  throw new Error('Production API URL must be set via EXPO_PUBLIC_API_BASE_URL environment variable');
}

/**
 * 安全地解析環境變數整數值
 */
function parseEnvInt(envVar: string | undefined, defaultValue: number): number {
  if (!envVar) return defaultValue;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 安全地解析環境變數浮點數值
 */
function parseEnvFloat(envVar: string | undefined, defaultValue: number): number {
  if (!envVar) return defaultValue;
  const parsed = parseFloat(envVar);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 安全地解析環境變數布林值
 */
function parseEnvBoolean(envVar: string | undefined, defaultValue: boolean): boolean {
  if (!envVar) return defaultValue;
  return envVar.toLowerCase() === 'true';
}

/**
 * 獲取完整的應用配置
 * 
 * 支持的環境變數：
 * - EXPO_PUBLIC_API_BASE_URL: API 基礎 URL
 * - EXPO_PUBLIC_API_TIMEOUT: API 超時時間
 * - EXPO_PUBLIC_API_RETRY_COUNT: API 重試次數
 * - EXPO_PUBLIC_DEFAULT_MODEL: AI 預設模型
 * - EXPO_PUBLIC_DEFAULT_MAX_TOKENS: AI 最大 Token 數
 * - EXPO_PUBLIC_DEFAULT_TEMPERATURE: AI 生成溫度
 * - EXPO_PUBLIC_REQUEST_TIMEOUT: AI 請求超時時間
 * - EXPO_PUBLIC_MAX_CONCURRENT_JOBS: 最大並發作業數
 * - EXPO_PUBLIC_JOB_TIMEOUT: 作業超時時間
 * - EXPO_PUBLIC_JOB_EXPIRY_TIME: 作業過期時間
 * - EXPO_PUBLIC_POLL_INTERVAL: 輪詢間隔
 * - EXPO_PUBLIC_ENABLE_TEST_MODE: 啟用測試模式
 */
export function getAppConfig(): AppConfig {
  const isDevelopment = __DEV__;
  const isProduction = !__DEV__;
  
  return {
    api: {
      baseUrl: getApiBaseUrl(),
      timeout: parseEnvInt(process.env.EXPO_PUBLIC_API_TIMEOUT, 10000),
      retryCount: parseEnvInt(process.env.EXPO_PUBLIC_API_RETRY_COUNT, 3),
      jobTimeout: parseEnvInt(process.env.EXPO_PUBLIC_JOB_TIMEOUT, 60000),
    },
    ai: {
      defaultModel: process.env.EXPO_PUBLIC_DEFAULT_MODEL || 'gemini-2.5-flash',
      maxTokens: parseEnvInt(process.env.EXPO_PUBLIC_DEFAULT_MAX_TOKENS, 2000),
      temperature: parseEnvFloat(process.env.EXPO_PUBLIC_DEFAULT_TEMPERATURE, 0.1),
      requestTimeout: parseEnvInt(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT, 45000),
    },
    queue: {
      maxConcurrentJobs: parseEnvInt(process.env.EXPO_PUBLIC_MAX_CONCURRENT_JOBS, 3),
      jobTimeout: parseEnvInt(process.env.EXPO_PUBLIC_JOB_TIMEOUT, 60000),
      jobExpiryTime: parseEnvInt(process.env.EXPO_PUBLIC_JOB_EXPIRY_TIME, 1800000), // 30 分鐘
      pollInterval: parseEnvInt(process.env.EXPO_PUBLIC_POLL_INTERVAL, 1000),
    },
    test: {
      testApiUrl: process.env.EXPO_PUBLIC_TEST_API_URL || 'http://localhost:8080/api',
      testTimeout: parseEnvInt(process.env.EXPO_PUBLIC_TEST_TIMEOUT, 30000),
      enableTestMode: parseEnvBoolean(process.env.EXPO_PUBLIC_ENABLE_TEST_MODE, false),
    },
    isDevelopment,
    isProduction,
    platform: Platform.OS,
  };
}

/**
 * 預設配置實例
 * 在應用啟動時創建，避免重複解析
 */
let configInstance: AppConfig | null = null;

/**
 * 獲取配置實例（單例模式）
 * 確保配置在整個應用生命週期中保持一致
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = getAppConfig();
    
    // 開發環境下輸出配置信息以便調試
    if (__DEV__) {
      console.log('📋 [AppConfig] Configuration loaded:', {
        apiBaseUrl: configInstance.api.baseUrl,
        aiModel: configInstance.ai.defaultModel,
        platform: configInstance.platform,
        isDevelopment: configInstance.isDevelopment,
      });
    }
  }
  
  return configInstance;
}

/**
 * 重置配置實例（主要用於測試）
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * 驗證配置完整性
 * 確保所有必要的配置都已正確設定
 */
export function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 驗證 API 配置
  if (!config.api.baseUrl) {
    errors.push('API baseUrl is required');
  }
  
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be greater than 0');
  }
  
  if (config.api.retryCount < 0) {
    errors.push('API retryCount must be non-negative');
  }
  
  // 驗證 AI 配置
  if (!config.ai.defaultModel) {
    errors.push('AI defaultModel is required');
  }
  
  if (config.ai.maxTokens <= 0) {
    errors.push('AI maxTokens must be greater than 0');
  }
  
  if (config.ai.temperature < 0 || config.ai.temperature > 2) {
    errors.push('AI temperature must be between 0 and 2');
  }
  
  // 驗證佇列配置
  if (config.queue.maxConcurrentJobs <= 0) {
    errors.push('Queue maxConcurrentJobs must be greater than 0');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}