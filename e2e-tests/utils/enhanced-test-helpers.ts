import { Page, Browser, BrowserContext, expect } from '@playwright/test';
import { IsolatedBrowserManager, EnhancedRetryManager, EnhancedAutoRecovery } from './isolated-browser-manager';

/**
 * 增強型測試助手類 - 支援瀏覽器隔離和錯誤恢復
 * 版本：2.0 - 全面重構支援隔離瀏覽器模式
 */
export class EnhancedTestHelpers {
  private browserManager: IsolatedBrowserManager;
  private testId: string;

  constructor(testId: string) {
    this.testId = testId;
    this.browserManager = new IsolatedBrowserManager(testId);
  }

  /**
   * 初始化測試環境
   */
  async initialize(): Promise<Page> {
    await this.browserManager.initialize();
    return this.browserManager.getPage();
  }

  /**
   * 清理測試環境
   */
  async cleanup(): Promise<void> {
    await this.browserManager.cleanup();
  }

  /**
   * 安全導航 - 帶重試機制
   */
  async safeGoto(url: string, timeout: number = 30000): Promise<void> {
    const page = this.browserManager.getPage();
    
    await EnhancedRetryManager.retryWithBrowserRecreation(
      `${this.testId}-navigation`,
      async (tempBrowserManager) => {
        const tempPage = tempBrowserManager.getPage();
        await tempPage.goto(url, { timeout, waitUntil: 'networkidle' });
        
        // 如果成功，更新主頁面
        if (await this.browserManager.isHealthy()) {
          await page.goto(url, { timeout, waitUntil: 'networkidle' });
        }
      },
      2,
      1000
    );
  }

  /**
   * 等待應用程式載入完成
   */
  async waitForAppLoad(timeout: number = 10000): Promise<void> {
    const page = this.browserManager.getPage();
    
    // 等待基本 DOM 結構
    await page.waitForSelector('body', { timeout });
    
    // 等待 React 應用程式載入
    await page.waitForFunction(
      () => {
        // 檢查是否有 React 或應用程式特定的元素
        return document.querySelector('[data-testid], .app, #root') !== null ||
               document.title.length > 0;
      },
      { timeout }
    );
    
    // 額外等待確保渲染完成
    await page.waitForTimeout(2000);
  }

  /**
   * 清理瀏覽器存儲 - 帶錯誤處理
   */
  async clearStorage(): Promise<void> {
    const page = this.browserManager.getPage();
    
    try {
      await page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
      console.log(`✅ [${this.testId}] 瀏覽器存儲已清除`);
    } catch (error) {
      console.log(`⚠️ [${this.testId}] 存儲清除失敗，可能是安全限制:`, error);
    }
  }

  /**
   * 智能元素查找 - 支援多種選擇器
   */
  async findElement(selectors: string[], timeout: number = 10000) {
    const page = this.browserManager.getPage();
    
    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout: 2000 });
        console.log(`✅ [${this.testId}] 找到元素: ${selector}`);
        return element;
      } catch (error) {
        console.log(`⚠️ [${this.testId}] 元素未找到: ${selector}`);
        continue;
      }
    }
    
    throw new Error(`無法找到任何匹配的元素: ${selectors.join(', ')}`);
  }

  /**
   * 安全點擊 - 帶重試和滾動
   */
  async safeClick(selectors: string[], timeout: number = 10000): Promise<void> {
    const element = await this.findElement(selectors, timeout);
    
    // 滾動到元素可見
    await element.scrollIntoViewIfNeeded();
    
    // 等待元素可點擊
    await element.waitFor({ state: 'visible' });
    
    // 執行點擊
    await element.click();
    
    // 等待點擊效果
    await this.browserManager.getPage().waitForTimeout(500);
  }

  /**
   * 安全填寫 - 帶清除和驗證
   */
  async safeFill(selectors: string[], value: string, timeout: number = 10000): Promise<void> {
    const element = await this.findElement(selectors, timeout);
    
    // 清除現有內容
    await element.clear();
    
    // 填寫新內容
    await element.fill(value);
    
    // 驗證填寫結果
    const filledValue = await element.inputValue();
    if (filledValue !== value) {
      console.log(`⚠️ [${this.testId}] 填寫驗證失敗: 期望 "${value}", 實際 "${filledValue}"`);
    } else {
      console.log(`✅ [${this.testId}] 成功填寫: ${value}`);
    }
  }

  /**
   * 截圖保存 - 帶時間戳
   */
  async takeScreenshot(name: string, fullPage: boolean = true): Promise<string> {
    const page = this.browserManager.getPage();
    const timestamp = Date.now();
    const filename = `test-results/${name}-${this.testId}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: filename,
      fullPage 
    });
    
    console.log(`📸 [${this.testId}] 截圖已保存: ${filename}`);
    return filename;
  }

  /**
   * 等待並驗證任務顯示
   */
  async waitForTaskDisplay(taskTitle: string, timeout: number = 15000): Promise<boolean> {
    const page = this.browserManager.getPage();
    
    try {
      // 等待任務顯示
      await page.waitForSelector(`text="${taskTitle}"`, { timeout });
      console.log(`✅ [${this.testId}] 任務顯示成功: ${taskTitle}`);
      return true;
    } catch (error) {
      console.log(`❌ [${this.testId}] 任務未顯示: ${taskTitle}`);
      
      // 記錄當前頁面內容供調試
      const bodyText = await page.locator('body').textContent();
      console.log(`🔍 [${this.testId}] 當前頁面內容片段:`, bodyText?.substring(0, 300));
      
      return false;
    }
  }

  /**
   * 處理 AI 生成流程
   */
  async handleAIGeneration(timeout: number = 30000): Promise<boolean> {
    const page = this.browserManager.getPage();
    
    try {
      // 檢查是否有個人化問題彈窗
      const personalizationModal = page.locator('[data-testid="personalization-modal"], .personalization-modal');
      
      if (await personalizationModal.isVisible({ timeout: 5000 })) {
        console.log(`🤖 [${this.testId}] 處理個人化問題彈窗...`);
        
        // 填寫個人化問題
        const questions = await page.locator('input, textarea').all();
        for (let i = 0; i < Math.min(questions.length, 3); i++) {
          try {
            await questions[i].fill(`測試回答 ${i + 1}`);
          } catch (error) {
            console.log(`⚠️ [${this.testId}] 填寫問題 ${i + 1} 失敗:`, error);
          }
        }
        
        // 提交問題
        await this.safeClick([
          'button:has-text("Generate Plan")',
          'button:has-text("生成計劃")',
          '[data-testid="generate-plan"]'
        ]);
        
        // 等待 AI 生成完成
        await page.waitForTimeout(10000);
        console.log(`✅ [${this.testId}] AI 生成流程完成`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`❌ [${this.testId}] AI 生成流程處理失敗:`, error);
      return false;
    }
  }

  /**
   * 等待載入完成
   */
  async waitForLoadingComplete(timeout: number = 10000): Promise<void> {
    const page = this.browserManager.getPage();
    
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      'text="Loading"',
      'text="載入中"'
    ];
    
    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { state: 'hidden', timeout: 2000 });
      } catch (error) {
        // 忽略不存在的載入指示器
      }
    }
  }

  /**
   * 驗證頁面無錯誤
   */
  async verifyNoErrors(): Promise<boolean> {
    const page = this.browserManager.getPage();
    
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '[role="alert"]',
      'text="Error"',
      'text="錯誤"'
    ];
    
    for (const selector of errorSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 1000 })) {
          const errorText = await page.locator(selector).textContent();
          console.log(`❌ [${this.testId}] 發現錯誤: ${errorText}`);
          return false;
        }
      } catch (error) {
        // 忽略不存在的錯誤元素
      }
    }
    
    console.log(`✅ [${this.testId}] 頁面無錯誤`);
    return true;
  }

  /**
   * 錯誤恢復處理
   */
  async handleError(error: Error): Promise<void> {
    await EnhancedAutoRecovery.handleTestFailure(this.testId, error, this.browserManager);
  }

  /**
   * 獲取瀏覽器統計資訊
   */
  getStats() {
    return this.browserManager.getStats();
  }

  /**
   * 等待網路請求完成
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 30000) {
    const page = this.browserManager.getPage();
    
    return await page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * 模擬 API 回應
   */
  async mockApiResponse(url: string | RegExp, response: any) {
    const page = this.browserManager.getPage();
    
    await page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
}

/**
 * 測試工具函數
 */
export class TestUtils {
  /**
   * 創建測試專用的日期字串
   */
  static createTestDate(daysFromNow: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  /**
   * 生成測試專用任務標題
   */
  static createTestTaskTitle(prefix: string = '測試任務'): string {
    const timestamp = Date.now();
    return `${prefix} ${new Date().toLocaleDateString()} ${timestamp}`;
  }

  /**
   * 驗證 URL 路由
   */
  static async verifyRoute(page: Page, expectedPath: string): Promise<boolean> {
    const currentUrl = page.url();
    const match = currentUrl.includes(expectedPath);
    console.log(`🔗 路由驗證: 期望包含 "${expectedPath}", 實際 "${currentUrl}", 匹配: ${match}`);
    return match;
  }

  /**
   * 等待網路穩定
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 10000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      console.log('⚠️ 網路閒置等待超時，繼續執行...');
    }
  }

  /**
   * 生成隨機測試數據
   */
  static generateTestData() {
    const timestamp = Date.now();
    return {
      task: {
        title: `測試任務 ${timestamp}`,
        description: `這是一個自動化測試任務，創建於 ${new Date().toLocaleString()}`,
        priority: 'high',
        duration: 60
      },
      user: {
        name: `測試用戶 ${timestamp}`,
        email: `test${timestamp}@example.com`,
        language: 'zh'
      }
    };
  }
}

/**
 * 增強型測試斷言
 */
export class EnhancedTestAssertions {
  constructor(private testId: string, private page: Page) {}

  async assertPageTitle(expectedTitle: string) {
    const title = await this.page.title();
    expect(title).toContain(expectedTitle);
    console.log(`✅ [${this.testId}] 頁面標題驗證通過: ${title}`);
  }

  async assertUrlContains(expectedUrl: string) {
    const url = this.page.url();
    expect(url).toContain(expectedUrl);
    console.log(`✅ [${this.testId}] URL 驗證通過: ${url}`);
  }

  async assertElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
    console.log(`✅ [${this.testId}] 元素可見性驗證通過: ${selector}`);
  }

  async assertElementCount(selector: string, count: number) {
    await expect(this.page.locator(selector)).toHaveCount(count);
    console.log(`✅ [${this.testId}] 元素數量驗證通過: ${selector} = ${count}`);
  }

  async assertElementText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
    console.log(`✅ [${this.testId}] 元素文字驗證通過: ${selector} 包含 "${text}"`);
  }

  async assertNoConsoleErrors(): Promise<void> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // 等待一段時間收集錯誤
    await this.page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log(`❌ [${this.testId}] 發現 Console 錯誤:`, errors);
      throw new Error(`Console 錯誤: ${errors.join(', ')}`);
    }
    
    console.log(`✅ [${this.testId}] Console 無錯誤`);
  }
}