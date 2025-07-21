/**
 * AppConfig 配置系統測試
 * 
 * 測試範圍：
 * - 配置解析和默認值
 * - 環境變數覆寫
 * - 配置驗證
 * - 平台特定配置
 * - 開發/生產環境切換
 */

import { Platform } from 'react-native';
import { 
  getAppConfig, 
  getConfig, 
  resetConfig, 
  validateConfig,
  AppConfig 
} from '../../config/appConfig';

// Mock Platform.OS for testing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios', // 默認測試 iOS
  },
}));

// Mock __DEV__ for testing
const mockDev = jest.fn();
Object.defineProperty(global, '__DEV__', {
  get: mockDev,
  configurable: true,
});

describe('AppConfig', () => {
  // 在每個測試前重置配置和環境變數
  beforeEach(() => {
    resetConfig();
    
    // 清理環境變數
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_API_TIMEOUT;
    delete process.env.EXPO_PUBLIC_DEFAULT_MODEL;
    delete process.env.EXPO_PUBLIC_DEFAULT_MAX_TOKENS;
    delete process.env.EXPO_PUBLIC_MAX_CONCURRENT_JOBS;
    
    // 默認為開發環境
    mockDev.mockReturnValue(true);
  });

  afterEach(() => {
    resetConfig();
    jest.clearAllMocks();
  });

  describe('基本配置解析', () => {
    it('應該返回默認配置', () => {
      const config = getAppConfig();
      
      expect(config).toBeDefined();
      expect(config.api.baseUrl).toBe('http://localhost:8080/api'); // iOS 默認
      expect(config.api.timeout).toBe(10000);
      expect(config.api.retryCount).toBe(3);
      expect(config.ai.defaultModel).toBe('gemini-2.5-flash');
      expect(config.ai.maxTokens).toBe(2000);
      expect(config.ai.temperature).toBe(0.1);
      expect(config.queue.maxConcurrentJobs).toBe(3);
      expect(config.isDevelopment).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.platform).toBe('ios');
    });

    it('應該為 Android 返回正確的 API URL', () => {
      (Platform as any).OS = 'android';
      
      const config = getAppConfig();
      expect(config.api.baseUrl).toBe('http://10.0.2.2:8080/api');
    });

    it('應該為生產環境拋出錯誤（當沒有設定 API URL 時）', () => {
      mockDev.mockReturnValue(false);
      
      expect(() => {
        getAppConfig();
      }).toThrow('Production API URL must be set via EXPO_PUBLIC_API_BASE_URL environment variable');
    });
  });

  describe('環境變數覆寫', () => {
    it('應該使用環境變數覆寫 API 配置', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://custom-api.com/api';
      process.env.EXPO_PUBLIC_API_TIMEOUT = '15000';
      process.env.EXPO_PUBLIC_API_RETRY_COUNT = '5';
      
      const config = getAppConfig();
      
      expect(config.api.baseUrl).toBe('https://custom-api.com/api');
      expect(config.api.timeout).toBe(15000);
      expect(config.api.retryCount).toBe(5);
    });

    it('應該使用環境變數覆寫 AI 配置', () => {
      process.env.EXPO_PUBLIC_DEFAULT_MODEL = 'gemini-3.0-pro';
      process.env.EXPO_PUBLIC_DEFAULT_MAX_TOKENS = '4000';
      process.env.EXPO_PUBLIC_DEFAULT_TEMPERATURE = '0.7';
      process.env.EXPO_PUBLIC_REQUEST_TIMEOUT = '60000';
      
      const config = getAppConfig();
      
      expect(config.ai.defaultModel).toBe('gemini-3.0-pro');
      expect(config.ai.maxTokens).toBe(4000);
      expect(config.ai.temperature).toBe(0.7);
      expect(config.ai.requestTimeout).toBe(60000);
    });

    it('應該使用環境變數覆寫佇列配置', () => {
      process.env.EXPO_PUBLIC_MAX_CONCURRENT_JOBS = '5';
      process.env.EXPO_PUBLIC_JOB_TIMEOUT = '120000';
      process.env.EXPO_PUBLIC_JOB_EXPIRY_TIME = '3600000';
      process.env.EXPO_PUBLIC_POLL_INTERVAL = '2000';
      
      const config = getAppConfig();
      
      expect(config.queue.maxConcurrentJobs).toBe(5);
      expect(config.queue.jobTimeout).toBe(120000);
      expect(config.queue.jobExpiryTime).toBe(3600000);
      expect(config.queue.pollInterval).toBe(2000);
    });

    it('應該正確處理無效的環境變數值', () => {
      process.env.EXPO_PUBLIC_API_TIMEOUT = 'invalid';
      process.env.EXPO_PUBLIC_DEFAULT_MAX_TOKENS = 'not-a-number';
      process.env.EXPO_PUBLIC_DEFAULT_TEMPERATURE = 'invalid-float';
      
      const config = getAppConfig();
      
      // 應該使用默認值
      expect(config.api.timeout).toBe(10000);
      expect(config.ai.maxTokens).toBe(2000);
      expect(config.ai.temperature).toBe(0.1);
    });

    it('應該正確處理布林環境變數', () => {
      process.env.EXPO_PUBLIC_ENABLE_TEST_MODE = 'true';
      
      const config = getAppConfig();
      expect(config.test.enableTestMode).toBe(true);
      
      process.env.EXPO_PUBLIC_ENABLE_TEST_MODE = 'false';
      resetConfig();
      
      const config2 = getAppConfig();
      expect(config2.test.enableTestMode).toBe(false);
    });
  });

  describe('配置單例模式', () => {
    it('應該返回相同的配置實例', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      
      expect(config1).toBe(config2);
    });

    it('重置後應該返回新的配置實例', () => {
      const config1 = getConfig();
      resetConfig();
      const config2 = getConfig();
      
      expect(config1).not.toBe(config2);
    });

    it('環境變數變更後重置應該反映新配置', () => {
      const config1 = getConfig();
      expect(config1.api.timeout).toBe(10000);
      
      process.env.EXPO_PUBLIC_API_TIMEOUT = '20000';
      resetConfig();
      
      const config2 = getConfig();
      expect(config2.api.timeout).toBe(20000);
    });
  });

  describe('配置驗證', () => {
    it('應該驗證有效的配置', () => {
      const config = getAppConfig();
      const validation = validateConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('應該檢測無效的 API 配置', () => {
      const config: AppConfig = {
        ...getAppConfig(),
        api: {
          baseUrl: '',
          timeout: -1,
          retryCount: -5,
          jobTimeout: 60000,
        },
      };
      
      const validation = validateConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API baseUrl is required');
      expect(validation.errors).toContain('API timeout must be greater than 0');
      expect(validation.errors).toContain('API retryCount must be non-negative');
    });

    it('應該檢測無效的 AI 配置', () => {
      const config: AppConfig = {
        ...getAppConfig(),
        ai: {
          defaultModel: '',
          maxTokens: -100,
          temperature: 5.0,
          requestTimeout: 45000,
        },
      };
      
      const validation = validateConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('AI defaultModel is required');
      expect(validation.errors).toContain('AI maxTokens must be greater than 0');
      expect(validation.errors).toContain('AI temperature must be between 0 and 2');
    });

    it('應該檢測無效的佇列配置', () => {
      const config: AppConfig = {
        ...getAppConfig(),
        queue: {
          maxConcurrentJobs: 0,
          jobTimeout: 60000,
          jobExpiryTime: 1800000,
          pollInterval: 1000,
        },
      };
      
      const validation = validateConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Queue maxConcurrentJobs must be greater than 0');
    });
  });

  describe('生產環境配置', () => {
    beforeEach(() => {
      mockDev.mockReturnValue(false);
    });

    it('應該在生產環境中使用環境變數 API URL', () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'https://production-api.focusflow.com/api';
      
      const config = getAppConfig();
      
      expect(config.api.baseUrl).toBe('https://production-api.focusflow.com/api');
      expect(config.isDevelopment).toBe(false);
      expect(config.isProduction).toBe(true);
    });
  });

  describe('測試配置', () => {
    it('應該返回正確的測試配置', () => {
      process.env.EXPO_PUBLIC_TEST_API_URL = 'http://test-api.com/api';
      process.env.EXPO_PUBLIC_TEST_TIMEOUT = '45000';
      
      const config = getAppConfig();
      
      expect(config.test.testApiUrl).toBe('http://test-api.com/api');
      expect(config.test.testTimeout).toBe(45000);
    });
  });
});