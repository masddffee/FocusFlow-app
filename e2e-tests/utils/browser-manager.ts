import { chromium, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * 單例模式瀏覽器管理器 - 防止重複開啟瀏覽器實例
 * DevOps 自動化工程師實作 - 確保資源正確管理
 */
export class BrowserManager {
  private static instance: Browser | null = null;
  private static contexts: BrowserContext[] = [];
  private static isCleaningUp = false;

  /**
   * 獲取安全的瀏覽器實例 - 防重複開啟
   */
  static async getSafeBrowser(): Promise<Browser> {
    if (!this.instance || !this.instance.isConnected()) {
      await this.cleanup();
      console.log('🚀 啟動新瀏覽器實例...');
      this.instance = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      console.log('✅ 瀏覽器實例已啟動');
    }
    return this.instance;
  }

  /**
   * 創建新的上下文實例
   */
  static async createContext(): Promise<BrowserContext> {
    const browser = await this.getSafeBrowser();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      permissions: ['clipboard-read', 'clipboard-write']
    });
    
    this.contexts.push(context);
    console.log(`📋 已創建上下文，總數: ${this.contexts.length}`);
    return context;
  }

  /**
   * 創建新頁面
   */
  static async createPage(): Promise<Page> {
    const context = await this.createContext();
    const page = await context.newPage();
    
    // 設置頁面錯誤監聽
    page.on('pageerror', err => {
      console.log('🚨 頁面錯誤:', err.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 Console 錯誤:', msg.text());
      }
    });

    return page;
  }

  /**
   * 強制清理所有瀏覽器資源
   */
  static async cleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    
    this.isCleaningUp = true;
    console.log('🧹 開始清理瀏覽器資源...');
    
    try {
      // 關閉所有上下文
      await Promise.all(
        this.contexts.map(async (context) => {
          try {
            await context.close();
          } catch (error) {
            console.log('⚠️ 上下文關閉錯誤:', error);
          }
        })
      );
      this.contexts = [];

      // 關閉瀏覽器實例
      if (this.instance) {
        try {
          await this.instance.close();
          console.log('✅ 瀏覽器實例已關閉');
        } catch (error) {
          console.log('⚠️ 瀏覽器關閉錯誤:', error);
        }
        this.instance = null;
      }

      // 清理殭屍進程
      await this.killZombieProcesses();
      
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * 清理殭屍進程
   */
  private static async killZombieProcesses(): Promise<void> {
    try {
      const { exec } = require('child_process');
      await new Promise<void>((resolve) => {
        exec('pkill -f "chromium.*playwright" || true', () => {
          console.log('🧹 已清理 Chromium 殭屍進程');
          resolve();
        });
      });
    } catch (error) {
      console.log('⚠️ 進程清理警告:', error);
    }
  }

  /**
   * 檢查瀏覽器健康狀態
   */
  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.instance || !this.instance.isConnected()) {
        return false;
      }
      
      const context = await this.instance.newContext();
      const page = await context.newPage();
      await page.goto('data:text/html,<h1>Health Check</h1>');
      const title = await page.title();
      await context.close();
      
      return title.length > 0;
    } catch (error) {
      console.log('❌ 健康檢查失敗:', error);
      return false;
    }
  }

  /**
   * 獲取當前資源統計
   */
  static getStats() {
    return {
      hasInstance: !!this.instance,
      isConnected: this.instance?.isConnected() || false,
      contextCount: this.contexts.length,
      isCleaningUp: this.isCleaningUp
    };
  }
}

/**
 * 智慧重試機制 - 指數退避算法
 */
export class RetryManager {
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          console.log(`❌ 重試失敗，已達最大重試次數 ${maxRetries}`);
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ 第 ${attempt + 1} 次重試失敗，${delay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

/**
 * 自動錯誤恢復管理器
 */
export class AutoRecovery {
  static async handleTestFailure(error: Error, page?: Page): Promise<void> {
    console.log('🚨 測試失敗，啟動自動恢復...');
    
    try {
      // 截圖保存錯誤狀態
      if (page) {
        const timestamp = Date.now();
        await page.screenshot({ 
          path: `test-results/error-recovery-${timestamp}.png`,
          fullPage: true 
        });
        console.log(`📸 錯誤截圖已保存: error-recovery-${timestamp}.png`);
      }
      
      // 分析錯誤類型並執行對應恢復策略
      if (error.message.includes('timeout')) {
        console.log('🔄 檢測到超時錯誤，執行超時恢復策略...');
        await this.handleTimeoutError();
      } else if (error.message.includes('disconnected')) {
        console.log('🔄 檢測到連線錯誤，執行重連恢復策略...');
        await this.handleDisconnectError();
      } else {
        console.log('🔄 執行通用恢復策略...');
        await this.handleGenericError();
      }
      
    } catch (recoveryError) {
      console.log('❌ 自動恢復失敗:', recoveryError);
    }
  }
  
  private static async handleTimeoutError(): Promise<void> {
    // 超時錯誤恢復：清理並重啟瀏覽器
    await BrowserManager.cleanup();
  }
  
  private static async handleDisconnectError(): Promise<void> {
    // 連線錯誤恢復：強制清理所有連線
    await BrowserManager.cleanup();
  }
  
  private static async handleGenericError(): Promise<void> {
    // 通用錯誤恢復：健康檢查
    const isHealthy = await BrowserManager.healthCheck();
    if (!isHealthy) {
      await BrowserManager.cleanup();
    }
  }
}