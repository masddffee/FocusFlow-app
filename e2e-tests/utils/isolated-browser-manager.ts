import { chromium, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * 測試隔離瀏覽器管理器 - 每個測試使用獨立瀏覽器實例
 * 修復版本：解決資源競爭和生命週期衝突問題
 */
export class IsolatedBrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly testId: string;
  private isDestroyed = false;

  constructor(testId: string) {
    this.testId = testId;
  }

  /**
   * 初始化獨立瀏覽器實例
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error(`瀏覽器管理器已銷毀: ${this.testId}`);
    }

    console.log(`🚀 [${this.testId}] 初始化獨立瀏覽器實例...`);
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        permissions: ['clipboard-read', 'clipboard-write']
      });

      this.page = await this.context.newPage();

      // 設置錯誤監聽
      this.page.on('pageerror', err => {
        console.log(`🚨 [${this.testId}] 頁面錯誤:`, err.message);
      });

      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`🚨 [${this.testId}] Console 錯誤:`, msg.text());
        }
      });

      console.log(`✅ [${this.testId}] 瀏覽器實例初始化完成`);
    } catch (error) {
      console.error(`❌ [${this.testId}] 瀏覽器初始化失敗:`, error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 獲取頁面實例
   */
  getPage(): Page {
    if (!this.page || this.isDestroyed) {
      throw new Error(`頁面不可用或已銷毀: ${this.testId}`);
    }
    return this.page;
  }

  /**
   * 獲取瀏覽器實例
   */
  getBrowser(): Browser {
    if (!this.browser || this.isDestroyed) {
      throw new Error(`瀏覽器不可用或已銷毀: ${this.testId}`);
    }
    return this.browser;
  }

  /**
   * 檢查瀏覽器健康狀態
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.browser || !this.browser.isConnected() || this.isDestroyed) {
        return false;
      }

      if (!this.page) {
        return false;
      }

      // 簡單健康檢查
      await this.page.evaluate(() => document.title);
      return true;
    } catch (error) {
      console.log(`❌ [${this.testId}] 健康檢查失敗:`, error);
      return false;
    }
  }

  /**
   * 清理所有資源
   */
  async cleanup(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    console.log(`🧹 [${this.testId}] 開始清理瀏覽器資源...`);

    try {
      // 關閉頁面
      if (this.page) {
        try {
          await this.page.close();
          console.log(`✅ [${this.testId}] 頁面已關閉`);
        } catch (error) {
          console.log(`⚠️ [${this.testId}] 頁面關閉錯誤:`, error);
        }
        this.page = null;
      }

      // 關閉上下文
      if (this.context) {
        try {
          await this.context.close();
          console.log(`✅ [${this.testId}] 上下文已關閉`);
        } catch (error) {
          console.log(`⚠️ [${this.testId}] 上下文關閉錯誤:`, error);
        }
        this.context = null;
      }

      // 關閉瀏覽器
      if (this.browser) {
        try {
          await this.browser.close();
          console.log(`✅ [${this.testId}] 瀏覽器已關閉`);
        } catch (error) {
          console.log(`⚠️ [${this.testId}] 瀏覽器關閉錯誤:`, error);
        }
        this.browser = null;
      }

    } catch (error) {
      console.error(`❌ [${this.testId}] 清理過程發生錯誤:`, error);
    }
  }

  /**
   * 獲取資源統計
   */
  getStats() {
    return {
      testId: this.testId,
      hasInstance: !!this.browser,
      isConnected: this.browser?.isConnected() || false,
      hasContext: !!this.context,
      hasPage: !!this.page,
      isDestroyed: this.isDestroyed
    };
  }
}

/**
 * 增強型重試機制 - 支援瀏覽器重建
 */
export class EnhancedRetryManager {
  static async retryWithBrowserRecreation<T>(
    testId: string,
    operation: (browserManager: IsolatedBrowserManager) => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 2000
  ): Promise<T> {
    let lastError: Error;
    let browserManager: IsolatedBrowserManager | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 創建新的瀏覽器管理器
        browserManager = new IsolatedBrowserManager(`${testId}-retry-${attempt}`);
        await browserManager.initialize();

        // 執行操作
        const result = await operation(browserManager);

        // 成功後清理
        await browserManager.cleanup();
        return result;

      } catch (error) {
        lastError = error as Error;

        // 清理失敗的瀏覽器實例
        if (browserManager) {
          try {
            await browserManager.cleanup();
          } catch (cleanupError) {
            console.log(`⚠️ [${testId}] 清理失敗:`, cleanupError);
          }
        }

        if (attempt === maxRetries) {
          console.log(`❌ [${testId}] 重試失敗，已達最大重試次數 ${maxRetries}`);
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ [${testId}] 第 ${attempt + 1} 次重試失敗，${delay}ms 後重試...`);
        console.log(`🔍 [${testId}] 錯誤詳情: ${lastError.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * 增強型錯誤恢復管理器
 */
export class EnhancedAutoRecovery {
  static async handleTestFailure(
    testId: string,
    error: Error,
    browserManager?: IsolatedBrowserManager
  ): Promise<void> {
    console.log(`🚨 [${testId}] 測試失敗，啟動增強型自動恢復...`);

    try {
      // 保存錯誤狀態截圖
      if (browserManager && await browserManager.isHealthy()) {
        const timestamp = Date.now();
        const page = browserManager.getPage();
        await page.screenshot({
          path: `test-results/enhanced-error-recovery-${testId}-${timestamp}.png`,
          fullPage: true
        });
        console.log(`📸 [${testId}] 錯誤截圖已保存`);
      }

      // 記錄錯誤詳情
      console.log(`🔍 [${testId}] 錯誤分析:`, {
        message: error.message,
        stack: error.stack?.split('\n')[0],
        browserHealth: browserManager ? await browserManager.isHealthy() : 'N/A'
      });

      // 根據錯誤類型執行恢復策略
      if (error.message.includes('Target page, context or browser has been closed')) {
        console.log(`🔄 [${testId}] 檢測到瀏覽器關閉錯誤，建議使用隔離瀏覽器模式`);
        await this.handleBrowserClosedError(testId, browserManager);
      } else if (error.message.includes('timeout')) {
        console.log(`🔄 [${testId}] 檢測到超時錯誤，執行超時恢復策略`);
        await this.handleTimeoutError(testId, browserManager);
      } else {
        console.log(`🔄 [${testId}] 執行通用恢復策略`);
        await this.handleGenericError(testId, browserManager);
      }

    } catch (recoveryError) {
      console.log(`❌ [${testId}] 自動恢復失敗:`, recoveryError);
    } finally {
      // 確保清理資源
      if (browserManager) {
        await browserManager.cleanup();
      }
    }
  }

  private static async handleBrowserClosedError(
    testId: string,
    browserManager?: IsolatedBrowserManager
  ): Promise<void> {
    console.log(`🔧 [${testId}] 瀏覽器關閉錯誤恢復：清理殘留資源`);
    if (browserManager) {
      await browserManager.cleanup();
    }
    
    // 清理系統級殭屍進程
    await this.killZombieProcesses(testId);
  }

  private static async handleTimeoutError(
    testId: string,
    browserManager?: IsolatedBrowserManager
  ): Promise<void> {
    console.log(`🔧 [${testId}] 超時錯誤恢復：重設瀏覽器狀態`);
    if (browserManager && await browserManager.isHealthy()) {
      try {
        const page = browserManager.getPage();
        await page.goto('about:blank', { timeout: 5000 });
      } catch (error) {
        console.log(`⚠️ [${testId}] 重設頁面失敗:`, error);
        await browserManager.cleanup();
      }
    }
  }

  private static async handleGenericError(
    testId: string,
    browserManager?: IsolatedBrowserManager
  ): Promise<void> {
    console.log(`🔧 [${testId}] 通用錯誤恢復：執行健康檢查`);
    if (browserManager) {
      const isHealthy = await browserManager.isHealthy();
      if (!isHealthy) {
        await browserManager.cleanup();
      }
    }
  }

  private static async killZombieProcesses(testId: string): Promise<void> {
    try {
      const { exec } = require('child_process');
      await new Promise<void>((resolve) => {
        exec('pkill -f "chromium.*playwright" || true', () => {
          console.log(`🧹 [${testId}] 已清理 Chromium 殭屍進程`);
          resolve();
        });
      });
    } catch (error) {
      console.log(`⚠️ [${testId}] 進程清理警告:`, error);
    }
  }
}