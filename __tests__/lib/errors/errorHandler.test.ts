/**
 * ErrorHandler 統一錯誤處理框架測試
 * 
 * 測試範圍：
 * - 錯誤分類和包裝
 * - 重試機制
 * - 錯誤本地化
 * - 回退策略
 * - 錯誤記錄和監控
 */

import {
  ErrorHandler,
  UnifiedError,
  ErrorType,
  ErrorSeverity,
  ErrorMessageProvider,
  createError,
  withErrorHandling,
  ApiError
} from '../../../lib/errors/errorHandler';

// Mock i18n
jest.mock('../../../constants/i18n', () => ({
  t: jest.fn((key: string) => {
    const messages: Record<string, string> = {
      'errors.network': 'Network connection error',
      'errors.timeout': 'Request timeout',
      'errors.server': 'Server error',
      'errors.unknown': 'Unknown error',
      'errors.aiGeneration': 'AI generation failed',
      'errors.jsonParse': 'Data parsing error'
    };
    return messages[key] || key;
  })
}));

// Mock config
jest.mock('../../../config/appConfig', () => ({
  getConfig: () => ({
    api: { timeout: 5000 },
    isDevelopment: true,
    platform: 'test'
  })
}));

// Mock global error capture
const mockCaptureErrorSnapshot = jest.fn();
(global as any).captureErrorSnapshot = mockCaptureErrorSnapshot;

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('UnifiedError', () => {
    it('應該正確創建統一錯誤', () => {
      const context = {
        operation: 'test_operation',
        timestamp: Date.now(),
        retryable: true
      };

      const error = new UnifiedError(
        ErrorType.NETWORK,
        'Test error message',
        context,
        undefined,
        ErrorSeverity.HIGH
      );

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe('Test error message');
      expect(error.context).toBe(context);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.errorId).toMatch(/^err_/);
      expect(error.isRetryable()).toBe(true);
    });

    it('應該正確判斷錯誤是否可重試', () => {
      const retryableContext = {
        operation: 'test_op',
        timestamp: Date.now(),
        retryable: true
      };

      const nonRetryableContext = {
        operation: 'test_op',
        timestamp: Date.now(),
        retryable: false
      };

      const networkError = new UnifiedError(ErrorType.NETWORK, 'Network error', retryableContext);
      const validationError = new UnifiedError(ErrorType.VALIDATION_ERROR, 'Validation error', retryableContext);
      const timeoutError = new UnifiedError(ErrorType.TIMEOUT, 'Timeout error', nonRetryableContext);

      expect(networkError.isRetryable()).toBe(true);
      expect(validationError.isRetryable()).toBe(false); // 驗證錯誤不可重試
      expect(timeoutError.isRetryable()).toBe(false); // context 標記為不可重試
    });

    it('應該正確轉換為 JSON', () => {
      const context = {
        operation: 'test_operation',
        timestamp: Date.now(),
        retryable: true,
        metadata: { key: 'value' }
      };

      const originalError = new Error('Original error');
      const error = new UnifiedError(
        ErrorType.AI_GENERATION,
        'AI error',
        context,
        originalError,
        ErrorSeverity.MEDIUM
      );

      const json = error.toJSON();

      expect(json.errorId).toBe(error.errorId);
      expect(json.type).toBe(ErrorType.AI_GENERATION);
      expect(json.severity).toBe(ErrorSeverity.MEDIUM);
      expect(json.isRetryable).toBe(true);
      expect(json.originalError).toEqual({
        name: 'Error',
        message: 'Original error',
        stack: originalError.stack
      });
    });
  });

  describe('ErrorMessageProvider', () => {
    it('應該返回本地化錯誤訊息', () => {
      const context = {
        operation: 'test_op',
        timestamp: Date.now(),
        retryable: true
      };

      const message = ErrorMessageProvider.getMessage(ErrorType.NETWORK, context);
      expect(message).toBe('Network connection error');
    });

    it('應該處理變量插值', () => {
      const context = {
        operation: 'test_op',
        timestamp: Date.now(),
        retryable: true,
        metadata: { resource: 'user profile' }
      };

      // Mock i18n to return message with variables
      require('../../../constants/i18n').t.mockReturnValueOnce('Resource {{resource}} not found');

      const message = ErrorMessageProvider.getMessage(ErrorType.NOT_FOUND, context);
      expect(message).toBe('Resource user profile not found');
    });

    it('應該回退到默認英文訊息', () => {
      // Mock i18n to throw error
      require('../../../constants/i18n').t.mockImplementationOnce(() => {
        throw new Error('i18n error');
      });

      const context = {
        operation: 'test_op',
        timestamp: Date.now(),
        retryable: true
      };

      const message = ErrorMessageProvider.getMessage(ErrorType.NETWORK, context);
      expect(message).toBe('Network connection error. Please check your internet connection.');
    });
  });

  describe('ErrorHandler.wrapError', () => {
    it('應該正確分類網路錯誤', () => {
      const context = {
        operation: 'fetch_data',
        timestamp: Date.now(),
        retryable: true
      };

      // TypeError: Failed to fetch
      const fetchError = new TypeError('Failed to fetch');
      const wrappedError = ErrorHandler.wrapError(fetchError, context);

      expect(wrappedError.type).toBe(ErrorType.NETWORK);
      expect(wrappedError.severity).toBe(ErrorSeverity.HIGH);
    });

    it('應該正確分類超時錯誤', () => {
      const context = {
        operation: 'api_call',
        timestamp: Date.now(),
        retryable: true
      };

      const timeoutError = new Error('Request timeout after 5000ms');
      const wrappedError = ErrorHandler.wrapError(timeoutError, context);

      expect(wrappedError.type).toBe(ErrorType.TIMEOUT);
    });

    it('應該正確分類 JSON 解析錯誤', () => {
      const context = {
        operation: 'parse_response',
        timestamp: Date.now(),
        retryable: true
      };

      const jsonError = new SyntaxError('Unexpected token in JSON');
      const wrappedError = ErrorHandler.wrapError(jsonError, context);

      expect(wrappedError.type).toBe(ErrorType.JSON_PARSE_ERROR);
    });

    it('應該正確分類 HTTP 狀態碼錯誤', () => {
      const context = {
        operation: 'api_request',
        timestamp: Date.now(),
        retryable: true
      };

      const unauthorizedError = new Error('401 Unauthorized');
      const wrappedError = ErrorHandler.wrapError(unauthorizedError, context);

      expect(wrappedError.type).toBe(ErrorType.UNAUTHORIZED);
      expect(wrappedError.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('ErrorHandler.handle (重試機制)', () => {
    it('應該在成功時不重試', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await ErrorHandler.handle('test_operation', mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('應該在可重試錯誤時進行重試', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValue('success');

      const promise = ErrorHandler.handle('test_operation', mockFn, {
        retries: 3
      });

      // 推進時間以觸發重試
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // 允許微任務執行
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('應該在達到最大重試次數後拋出錯誤', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      const promise = ErrorHandler.handle('test_operation', mockFn, {
        retries: 2
      });

      // 推進時間以觸發所有重試
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      jest.advanceTimersByTime(4000);
      await Promise.resolve();

      await expect(promise).rejects.toThrow(UnifiedError);
      expect(mockFn).toHaveBeenCalledTimes(3); // 初始調用 + 2 次重試
    });

    it('應該在錯誤不可重試時不進行重試', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('400 Bad Request'));

      await expect(
        ErrorHandler.handle('test_operation', mockFn, { retries: 3 })
      ).rejects.toThrow(UnifiedError);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('應該使用回退值當所有重試失敗時', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      const promise = ErrorHandler.handle('test_operation', mockFn, {
        retries: 1,
        fallback: 'fallback_value'
      });

      // 推進時間以觸發重試
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const result = await promise;

      expect(result).toBe('fallback_value');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('應該正確計算指數退避延遲', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      const promise = ErrorHandler.handle('test_operation', mockFn, {
        retries: 2,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 100,
          delayMultiplier: 2,
          maxDelay: 1000,
          useJitter: false
        }
      });

      // 第一次重試：100ms 延遲
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      
      // 第二次重試：200ms 延遲
      jest.advanceTimersByTime(200);
      await Promise.resolve();

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('withErrorHandling 快捷函數', () => {
    it('應該作為 ErrorHandler.handle 的別名工作', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await withErrorHandling('test_op', mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('createError 快捷函數', () => {
    it('應該創建正確的統一錯誤', () => {
      const error = createError(
        ErrorType.AI_GENERATION,
        'AI failed',
        'generate_content',
        { model: 'gpt-4' }
      );

      expect(error.type).toBe(ErrorType.AI_GENERATION);
      expect(error.message).toBe('AI failed');
      expect(error.context.operation).toBe('generate_content');
      expect(error.context.metadata).toEqual({ model: 'gpt-4' });
    });
  });

  describe('ApiError 兼容性', () => {
    it('應該保持與舊 ApiError 的兼容性', () => {
      const apiError = new ApiError('API failed', 500, 'SERVER_ERROR');

      expect(apiError.message).toBe('API failed');
      expect(apiError.statusCode).toBe(500);
      expect(apiError.code).toBe('SERVER_ERROR');
      expect(apiError.type).toBe(ErrorType.SERVER);
      expect(apiError.getLocalizedMessage).toBeDefined();
    });

    it('應該正確轉換未知的錯誤代碼', () => {
      const apiError = new ApiError('Unknown error', 999, 'UNKNOWN_CODE');

      expect(apiError.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('錯誤記錄和監控', () => {
    beforeEach(() => {
      // 重置 console mocks
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('應該根據嚴重性記錄錯誤', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        ErrorHandler.handle('test_operation', mockFn)
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [ErrorHandler] INTERNAL_SERVER_ERROR'),
        expect.any(Object)
      );
    });

    it('應該在關鍵錯誤時捕獲錯誤快照', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Configuration error'));

      // 手動分類為 CONFIGURATION_ERROR
      jest.spyOn(ErrorHandler, 'wrapError').mockImplementation((error, context) => {
        return new UnifiedError(
          ErrorType.CONFIGURATION_ERROR,
          error.message,
          context,
          error,
          ErrorSeverity.CRITICAL
        );
      });

      await expect(
        ErrorHandler.handle('test_operation', mockFn)
      ).rejects.toThrow();

      expect(mockCaptureErrorSnapshot).toHaveBeenCalled();
    });
  });

  describe('超時處理', () => {
    it('應該在操作超時時拋出超時錯誤', async () => {
      const mockFn = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const promise = ErrorHandler.handle('timeout_test', mockFn, {
        timeout: 1000
      });

      jest.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('邊界情況', () => {
    it('應該處理空的重試配置', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await ErrorHandler.handle('test_op', mockFn, {
        retryConfig: {}
      });

      expect(result).toBe('success');
    });

    it('應該處理已經是 UnifiedError 的錯誤', () => {
      const originalError = new UnifiedError(
        ErrorType.NETWORK,
        'Network error',
        {
          operation: 'test',
          timestamp: Date.now(),
          retryable: true
        }
      );

      const wrappedError = ErrorHandler.wrapError(originalError, {
        operation: 'test2',
        timestamp: Date.now(),
        retryable: true
      });

      expect(wrappedError).toBe(originalError); // 應該返回原始錯誤
    });

    it('應該處理沒有 navigator 的環境', () => {
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      const error = createError(ErrorType.NETWORK, 'Test', 'test_op');
      expect(error.context.userAgent).toBe('FocusFlow/test');

      (global as any).navigator = originalNavigator;
    });
  });
});