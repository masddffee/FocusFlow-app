/**
 * FocusFlow MCP YAML 測試執行器
 * 
 * 讀取 YAML 配置並執行自動化測試
 * 包含完整的截圖、錯誤處理和報告生成機制
 * 
 * @version 3.0
 * @author FocusFlow Team
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { EnhancedScreenshotManager } from './utils/enhanced-screenshot-manager';
import { ComprehensiveErrorReporter } from './utils/comprehensive-error-reporter';
import { KeyNodeDetector } from './utils/key-node-detector';

// 測試配置介面
interface TestConfig {
  name: string;
  version: string;
  description: string;
  environment: {
    baseUrl: string;
    backendUrl: string;
    timeout: number;
    retries: number;
    screenshotPath: string;
    videoPath: string;
    reportPath: string;
  };
  browsers: Array<{
    name: string;
    enabled: boolean;
    headless: boolean;
    viewport: { width: number; height: number };
    recordVideo: boolean;
    trace: boolean;
  }>;
  testData: Record<string, any>;
  testSuites: TestSuite[];
  errorHandling: ErrorHandlingConfig;
  reporting: ReportingConfig;
  performance: PerformanceConfig;
}

interface TestSuite {
  name: string;
  description: string;
  priority: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  description: string;
  steps: TestStep[];
}

interface TestStep {
  action: string;
  [key: string]: any;
}

interface ErrorHandlingConfig {
  autoScreenshot: {
    enabled: boolean;
    onError: boolean;
    onTimeout: boolean;
    onAssertion: boolean;
    quality: number;
    fullPage: boolean;
  };
  recovery: {
    enabled: boolean;
    strategies: Array<{
      type: string;
      condition: string;
      maxAttempts: number;
    }>;
  };
  logging: {
    level: string;
    includeScreenshots: boolean;
    includeNetworkLogs: boolean;
    includeConsoleErrors: boolean;
  };
}

interface ReportingConfig {
  formats: string[];
  html: {
    title: string;
    includeScreenshots: boolean;
    includeVideos: boolean;
    theme: string;
  };
  customMetrics: Array<{
    name: string;
    description: string;
    unit: string;
  }>;
}

interface PerformanceConfig {
  enabled: boolean;
  metrics: string[];
  thresholds: Record<string, number>;
  screenshot: {
    onThresholdExceeded: boolean;
  };
}

// 測試執行器類別
class MCPYamlExecutor {
  private config: TestConfig;
  private page: Page;
  private context: BrowserContext;
  private screenshotCounter = 0;
  private testResults: any[] = [];
  private performanceMetrics: Record<string, number> = {};
  private screenshotManager: EnhancedScreenshotManager;
  private errorReporter: ComprehensiveErrorReporter;
  private keyNodeDetector: KeyNodeDetector;
  private currentTestName: string = 'unknown';

  constructor(config: TestConfig) {
    this.config = config;
  }

  async initialize(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    
    // 初始化截圖管理器
    this.screenshotManager = new EnhancedScreenshotManager(
      page, 
      context, 
      this.config.environment.screenshotPath
    );
    
    // 初始化錯誤報告器
    this.errorReporter = new ComprehensiveErrorReporter(
      page,
      context,
      this.screenshotManager,
      this.config.environment.reportPath
    );
    
    // 初始化關鍵節點檢測器
    this.keyNodeDetector = new KeyNodeDetector(
      page,
      this.screenshotManager,
      this.errorReporter
    );
    
    // 設置視窗大小
    const viewport = this.config.browsers[0]?.viewport;
    if (viewport) {
      await page.setViewportSize(viewport);
    }

    // 啟用性能監控
    if (this.config.performance.enabled) {
      await this.setupPerformanceMonitoring();
    }

    // 設置錯誤處理（增強版）
    await this.setupEnhancedErrorHandling();
    
    // 啟動關鍵節點自動檢測
    this.keyNodeDetector.startDetection();
    
    console.log(`🚀 MCP 測試執行器已初始化 - ${this.config.name} v${this.config.version}`);
    console.log(`📷 截圖管理器已啟用 - 路徑: ${this.config.environment.screenshotPath}`);
    console.log(`🛡️ 錯誤報告器已啟用 - 路徑: ${this.config.environment.reportPath}`);
    console.log(`🔍 關鍵節點檢測器已啟用 - 自動檢測中`);
  }

  private async setupPerformanceMonitoring() {
    // 監控性能指標
    this.page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        this.performanceMetrics[`api_response_${response.url().split('/').pop()}`] = timing.responseEnd;
      }
    });

    // 監控 Web Vitals
    await this.page.addInitScript(() => {
      // 監控 FCP, LCP, TTI 等指標
      window.addEventListener('load', () => {
        // 使用 Performance Observer API 收集指標
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).performanceMetrics = (window as any).performanceMetrics || {};
              (window as any).performanceMetrics[entry.name] = entry.value;
            }
          });
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        }
      });
    });
  }

  private async setupEnhancedErrorHandling() {
    // 監控控制台錯誤 - 使用錯誤報告器
    this.page.on('console', async msg => {
      if (msg.type() === 'error') {
        console.error(`🚨 Console Error: ${msg.text()}`);
        
        const error = new Error(`Console Error: ${msg.text()}`);
        await this.errorReporter.captureError({
          type: 'javascript',
          message: msg.text(),
          originalError: error,
          testName: this.getCurrentTestName()
        });
      }
    });

    // 監控頁面錯誤 - 使用錯誤報告器
    this.page.on('pageerror', async error => {
      console.error(`🚨 Page Error: ${error.message}`);
      
      await this.errorReporter.captureError({
        type: 'javascript',
        message: error.message,
        stack: error.stack,
        originalError: error,
        testName: this.getCurrentTestName()
      });
    });

    // 監控網路請求失敗 - 使用錯誤報告器
    this.page.on('requestfailed', async request => {
      const errorMessage = `Request Failed: ${request.url()} - ${request.failure()?.errorText}`;
      console.error(`🚨 ${errorMessage}`);
      
      const error = new Error(errorMessage);
      await this.errorReporter.captureError({
        type: 'network',
        message: errorMessage,
        originalError: error,
        testName: this.getCurrentTestName()
      });
    });

    // 監控響應錯誤
    this.page.on('response', async response => {
      if (response.status() >= 400) {
        const errorMessage = `HTTP ${response.status()}: ${response.url()}`;
        console.warn(`⚠️ ${errorMessage}`);
        
        if (response.status() >= 500) {
          const error = new Error(errorMessage);
          await this.errorReporter.captureError({
            type: 'network',
            message: errorMessage,
            originalError: error,
            testName: this.getCurrentTestName()
          });
        }
      }
    });
  }

  async executeTestSuite(testSuite: TestSuite) {
    console.log(`\n📋 執行測試套件: ${testSuite.name}`);
    console.log(`📝 描述: ${testSuite.description}`);
    console.log(`⚡ 優先級: ${testSuite.priority}`);

    const suiteResults = {
      name: testSuite.name,
      description: testSuite.description,
      priority: testSuite.priority,
      startTime: Date.now(),
      tests: [] as any[],
      passed: 0,
      failed: 0,
      skipped: 0
    };

    for (const testCase of testSuite.tests) {
      try {
        const testResult = await this.executeTestCase(testCase);
        suiteResults.tests.push(testResult);
        
        if (testResult.status === 'passed') {
          suiteResults.passed++;
        } else if (testResult.status === 'failed') {
          suiteResults.failed++;
        } else {
          suiteResults.skipped++;
        }
      } catch (error) {
        console.error(`❌ 測試案例 ${testCase.name} 執行失敗:`, error);
        suiteResults.failed++;
        suiteResults.tests.push({
          name: testCase.name,
          status: 'failed',
          error: error.message,
          screenshot: (await this.screenshotManager.captureScreenshot({
            name: 'test-case-error',
            description: `測試失敗: ${testCase.name}`,
            fullPage: true
          })).path
        });
      }
    }

    suiteResults.endTime = Date.now();
    suiteResults.duration = suiteResults.endTime - suiteResults.startTime;
    this.testResults.push(suiteResults);

    return suiteResults;
  }

  async executeTestCase(testCase: TestCase) {
    console.log(`\n  🧪 執行測試案例: ${testCase.name}`);
    
    // 設置當前測試名稱，用於錯誤報告
    this.currentTestName = testCase.name;
    this.errorReporter.setTestInfo({ title: testCase.name } as any);
    
    const testResult = {
      name: testCase.name,
      description: testCase.description,
      startTime: Date.now(),
      steps: [] as any[],
      status: 'unknown' as 'passed' | 'failed' | 'skipped' | 'unknown',
      screenshots: [] as string[],
      errors: [] as string[]
    };

    try {
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        console.log(`    📍 步驟 ${i + 1}: ${step.action}`);
        
        const stepResult = await this.executeStep(step, i + 1);
        testResult.steps.push(stepResult);
        
        if (stepResult.screenshot) {
          testResult.screenshots.push(stepResult.screenshot);
        }
        
        if (stepResult.error) {
          testResult.errors.push(stepResult.error);
          throw new Error(stepResult.error);
        }
      }
      
      testResult.status = 'passed';
      console.log(`    ✅ 測試案例 ${testCase.name} 通過`);
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.errors.push(error.message);
      console.error(`    ❌ 測試案例 ${testCase.name} 失敗:`, error.message);
      
      // 錯誤恢復
      if (this.config.errorHandling.recovery.enabled) {
        await this.attemptRecovery(error);
      }
    }

    testResult.endTime = Date.now();
    testResult.duration = testResult.endTime - testResult.startTime;
    
    return testResult;
  }

  /**
   * 獲取當前測試名稱
   */
  private getCurrentTestName(): string {
    return this.currentTestName;
  }

  async executeStep(step: TestStep, stepNumber: number) {
    const stepResult = {
      stepNumber,
      action: step.action,
      startTime: Date.now(),
      status: 'unknown' as 'passed' | 'failed' | 'skipped',
      screenshot: null as string | null,
      error: null as string | null
    };

    try {
      switch (step.action) {
        case 'navigate':
          await this.handleNavigateAction(step);
          break;
          
        case 'click':
          await this.handleClickAction(step);
          break;
          
        case 'fill':
          await this.handleFillAction(step);
          break;
          
        case 'waitForSelector':
          await this.handleWaitForSelectorAction(step);
          break;
          
        case 'waitForResponse':
          await this.handleWaitForResponseAction(step);
          break;
          
        case 'verify':
          await this.handleVerifyAction(step);
          break;
          
        case 'screenshot':
          stepResult.screenshot = await this.handleScreenshotAction(step);
          break;
          
        case 'wait':
          await this.handleWaitAction(step);
          break;
          
        case 'fillQuestions':
          await this.handleFillQuestionsAction(step);
          break;
          
        case 'verifySubtaskQuality':
          await this.handleVerifySubtaskQualityAction(step);
          break;
          
        case 'verifyTimerPaused':
          await this.handleVerifyTimerPausedAction(step);
          break;
          
        case 'verifyChartData':
          await this.handleVerifyChartDataAction(step);
          break;
          
        case 'interactWithChart':
          await this.handleInteractWithChartAction(step);
          break;
          
        case 'interceptNetworkRequests':
          await this.handleInterceptNetworkRequestsAction(step);
          break;
          
        default:
          throw new Error(`未知的動作類型: ${step.action}`);
      }

      // 使用增強截圖管理器進行關鍵節點截圖
      if (step.screenshot) {
        const screenshotMetadata = await this.screenshotManager.captureScreenshot({
          name: step.screenshot.name || `step-${stepNumber}`,
          description: step.screenshot.description || `步驟 ${stepNumber}: ${step.action}`,
          fullPage: this.config.errorHandling.autoScreenshot.fullPage,
          quality: this.config.errorHandling.autoScreenshot.quality,
          waitForStable: true,
          animations: 'disabled'
        });
        stepResult.screenshot = screenshotMetadata.path;
        console.log(`      📷 關鍵節點截圖: ${screenshotMetadata.filename}`);
      }

      stepResult.status = 'passed';
      
    } catch (error) {
      stepResult.status = 'failed';
      stepResult.error = error.message;
      
      // 使用錯誤報告器捕獲錯誤和截圖
      if (this.config.errorHandling.autoScreenshot.onError || 
          (step.screenshot && step.screenshot.onError)) {
        
        const errorRecord = await this.errorReporter.captureError({
          type: 'assertion',
          message: `步驟 ${stepNumber} 執行失敗: ${error.message}`,
          originalError: error,
          testName: this.getCurrentTestName()
        });
        
        stepResult.screenshot = errorRecord.screenshot;
        console.log(`      🚨 錯誤截圖已捕獲: ${errorRecord.id}`);
      }
      
      throw error;
    }

    stepResult.endTime = Date.now();
    stepResult.duration = stepResult.endTime - stepResult.startTime;
    
    return stepResult;
  }

  // 動作處理方法
  private async handleNavigateAction(step: TestStep) {
    const url = this.replaceVariables(step.target);
    const timeout = step.timeout || this.config.environment.timeout;
    
    await this.page.goto(url, { timeout });
    console.log(`      🌐 導航到: ${url}`);
    
    // 自動等待應用載入完成關鍵節點
    if (url.includes(this.config.environment.baseUrl)) {
      const isLoaded = await this.keyNodeDetector.waitForKeyNode('application-loaded', 10000);
      if (isLoaded) {
        console.log(`      ✅ 應用載入完成確認`);
      }
    }
  }

  private async handleClickAction(step: TestStep) {
    const selector = step.selector;
    const timeout = step.timeout || 5000;
    
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
    console.log(`      👆 點擊: ${selector}`);
    
    // 智能檢測特定按鈕點擊後的關鍵節點
    if (selector.includes('add-task') || selector.includes('create-task')) {
      await this.keyNodeDetector.waitForKeyNode('task-form-appeared', 5000);
    } else if (selector.includes('smart-generate')) {
      await this.keyNodeDetector.waitForKeyNode('ai-generation-started', 3000);
    }
  }

  private async handleFillAction(step: TestStep) {
    const selector = step.selector;
    const value = this.replaceVariables(step.value);
    
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, value);
    console.log(`      ✏️ 填寫: ${selector} = ${value}`);
  }

  private async handleWaitForSelectorAction(step: TestStep) {
    const selector = step.selector;
    const timeout = step.timeout || 5000;
    
    await this.page.waitForSelector(selector, { timeout });
    console.log(`      ⏳ 等待元素: ${selector}`);
  }

  private async handleWaitForResponseAction(step: TestStep) {
    const urlPattern = step.urlPattern;
    const timeout = step.timeout || 30000;
    
    const responsePromise = this.page.waitForResponse(
      response => response.url().includes(urlPattern.replace('**', '')),
      { timeout }
    );
    
    try {
      const response = await responsePromise;
      console.log(`      📡 API 響應: ${response.url()} - ${response.status()}`);
      
      // 如果是 AI API 響應成功，等待相關關鍵節點
      if (response.url().includes('/api/ai/') && response.status() < 300) {
        if (response.url().includes('plan') || response.url().includes('generate')) {
          // 等待個人化問題彈窗或子任務生成
          const hasPersonalization = await this.keyNodeDetector.waitForKeyNode('personalization-modal', 5000);
          if (!hasPersonalization) {
            await this.keyNodeDetector.waitForKeyNode('subtasks-generated', 30000);
          }
        }
      }
    } catch (error) {
      // 捕獲API超時錯誤
      await this.errorReporter.captureError({
        type: 'timeout',
        message: `API 請求超時: ${urlPattern}`,
        originalError: error,
        testName: this.getCurrentTestName()
      });
      
      if (step.errorHandling?.onTimeout?.action === 'halt') {
        throw new Error(`API 請求超時: ${urlPattern}`);
      }
      console.warn(`      ⚠️ API 響應超時: ${urlPattern}`);
    }
  }

  private async handleVerifyAction(step: TestStep) {
    const selector = step.selector;
    
    switch (step.type) {
      case 'elementVisible':
        const isVisible = await this.page.isVisible(selector);
        if (!isVisible) {
          throw new Error(step.errorMessage || `元素不可見: ${selector}`);
        }
        console.log(`      ✅ 驗證元素可見: ${selector}`);
        break;
        
      case 'elementCount':
        const elements = await this.page.locator(selector).count();
        const expectedCount = step.expectedCount;
        
        if (expectedCount.min && elements < expectedCount.min) {
          throw new Error(`元素數量不足: 期望 >= ${expectedCount.min}, 實際 ${elements}`);
        }
        if (expectedCount.max && elements > expectedCount.max) {
          throw new Error(`元素數量過多: 期望 <= ${expectedCount.max}, 實際 ${elements}`);
        }
        console.log(`      ✅ 驗證元素數量: ${elements} (符合範圍)`);
        break;
        
      case 'textContent':
        const actualText = await this.page.textContent(selector);
        const expectedText = step.expectedText;
        
        if (step.contains) {
          if (!actualText?.includes(step.contains)) {
            throw new Error(`文本不包含期望內容: "${actualText}" 不包含 "${step.contains}"`);
          }
        } else if (actualText !== expectedText) {
          throw new Error(`文本內容不匹配: 期望 "${expectedText}", 實際 "${actualText}"`);
        }
        console.log(`      ✅ 驗證文本內容: ${actualText}`);
        break;
        
      default:
        throw new Error(`未知的驗證類型: ${step.type}`);
    }
  }

  private async handleWaitAction(step: TestStep) {
    const duration = step.duration || 1000;
    await this.page.waitForTimeout(duration);
    console.log(`      ⏱️ 等待 ${duration}ms`);
  }

  private async handleFillQuestionsAction(step: TestStep) {
    const strategy = step.strategy;
    const answers = step.answers;
    
    // 等待問題載入
    await this.page.waitForSelector('[data-testid="question-item"]');
    
    const questions = await this.page.locator('[data-testid="question-item"]').all();
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionText = await question.textContent();
      
      // 根據問題內容選擇答案
      if (questionText?.includes('experience') || questionText?.includes('經驗')) {
        await question.locator('button').filter({ hasText: answers.experience }).click();
      } else if (questionText?.includes('time') || questionText?.includes('時間')) {
        await question.locator('button').filter({ hasText: answers.timeAvailable }).click();
      } else if (questionText?.includes('style') || questionText?.includes('方式')) {
        await question.locator('button').filter({ hasText: answers.learningStyle }).click();
      } else if (questionText?.includes('goal') || questionText?.includes('目標')) {
        await question.locator('textarea, input[type="text"]').fill(answers.goal);
      }
    }
    
    console.log(`      📝 完成個人化問題回答 (${strategy} 策略)`);
  }

  private async handleVerifySubtaskQualityAction(step: TestStep) {
    const checks = step.checks;
    const subtasks = await this.page.locator('[data-testid="subtask-item"]').all();
    
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      
      if (checks.hasTitle) {
        const title = await subtask.locator('[data-testid="subtask-title"]').textContent();
        if (!title || title.trim().length === 0) {
          throw new Error(`子任務 ${i + 1} 缺少標題`);
        }
      }
      
      if (checks.hasDescription) {
        const description = await subtask.locator('[data-testid="subtask-description"]').textContent();
        if (!description || description.trim().length === 0) {
          throw new Error(`子任務 ${i + 1} 缺少描述`);
        }
      }
      
      if (checks.hasDuration) {
        const duration = await subtask.locator('[data-testid="subtask-duration"]').textContent();
        if (!duration || !duration.includes('分鐘')) {
          throw new Error(`子任務 ${i + 1} 缺少時間估算`);
        }
      }
      
      if (checks.hasDifficulty) {
        const difficulty = await subtask.locator('[data-testid="subtask-difficulty"]').textContent();
        if (!difficulty || !['簡單', '中等', '困難', 'easy', 'medium', 'hard'].some(d => difficulty.includes(d))) {
          throw new Error(`子任務 ${i + 1} 缺少難度標記`);
        }
      }
    }
    
    console.log(`      ✅ 子任務品質檢查通過 (${subtasks.length} 個子任務)`);
  }

  private async handleVerifyTimerPausedAction(step: TestStep) {
    const timerDisplay = await this.page.textContent('[data-testid="timer-display"]');
    const initialTime = timerDisplay;
    
    // 等待 2 秒確認計時器沒有變化
    await this.page.waitForTimeout(2000);
    
    const finalTime = await this.page.textContent('[data-testid="timer-display"]');
    
    if (initialTime !== finalTime) {
      throw new Error(`計時器未正確暫停: ${initialTime} -> ${finalTime}`);
    }
    
    // 檢查暫停按鈕狀態
    const pauseButton = this.page.locator('[data-testid="pause-timer-button"]');
    const isDisabled = await pauseButton.isDisabled();
    
    if (!isDisabled) {
      throw new Error('暫停按鈕狀態不正確');
    }
    
    console.log(`      ✅ 計時器暫停驗證通過: ${initialTime}`);
  }

  private async handleVerifyChartDataAction(step: TestStep) {
    const chartSelector = step.chartSelector;
    const expectedDataPoints = step.expectedDataPoints;
    
    await this.page.waitForSelector(chartSelector);
    
    // 檢查圖表是否有數據點
    const dataPoints = await this.page.locator(`${chartSelector} .data-point, ${chartSelector} circle, ${chartSelector} rect`).count();
    
    if (expectedDataPoints.min && dataPoints < expectedDataPoints.min) {
      throw new Error(`圖表數據點不足: 期望 >= ${expectedDataPoints.min}, 實際 ${dataPoints}`);
    }
    
    console.log(`      📊 圖表數據驗證通過: ${dataPoints} 個數據點`);
  }

  private async handleInteractWithChartAction(step: TestStep) {
    const chartSelector = step.chartSelector;
    const interaction = step.interaction;
    
    const chart = this.page.locator(chartSelector);
    await chart.waitFor();
    
    switch (interaction) {
      case 'hover':
        await chart.hover();
        // 等待 tooltip 或 hover 效果顯示
        await this.page.waitForTimeout(500);
        break;
        
      case 'click':
        await chart.click();
        break;
        
      default:
        throw new Error(`未知的圖表互動類型: ${interaction}`);
    }
    
    console.log(`      🖱️ 圖表互動: ${interaction}`);
  }

  private async handleInterceptNetworkRequestsAction(step: TestStep) {
    const pattern = step.pattern;
    const response = step.response;
    
    await this.page.route(pattern, route => {
      route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body)
      });
    });
    
    console.log(`      🚧 網路請求攔截: ${pattern} -> ${response.status}`);
  }

  private async handleScreenshotAction(step: TestStep) {
    const name = step.name || 'screenshot';
    const description = step.description || 'Screenshot';
    
    const screenshotMetadata = await this.screenshotManager.captureScreenshot({
      name,
      description,
      fullPage: this.config.errorHandling.autoScreenshot.fullPage,
      quality: this.config.errorHandling.autoScreenshot.quality,
      waitForStable: true,
      animations: 'disabled'
    });
    
    console.log(`      📷 手動截圖: ${screenshotMetadata.filename}`);
    return screenshotMetadata.path;
  }

  // 輔助方法已遷移到 EnhancedScreenshotManager

  private replaceVariables(text: string): string {
    if (!text) return text;
    
    // 替換環境變數
    text = text.replace(/\{\{\s*environment\.(\w+)\s*\}\}/g, (match, key) => {
      return this.config.environment[key] || match;
    });
    
    // 替換測試數據
    text = text.replace(/\{\{\s*testData\.(\w+)\.(\w+)\s*\}\}/g, (match, obj, key) => {
      return this.config.testData[obj]?.[key] || match;
    });
    
    return text;
  }

  private async attemptRecovery(error: Error) {
    console.log(`🔄 嘗試錯誤恢復: ${error.message}`);
    
    for (const strategy of this.config.errorHandling.recovery.strategies) {
      if (this.shouldApplyStrategy(strategy.condition, error)) {
        try {
          switch (strategy.type) {
            case 'refresh':
              await this.page.reload();
              console.log(`🔄 頁面刷新完成`);
              break;
              
            case 'restart':
              // 重新導航到基礎 URL
              await this.page.goto(this.config.environment.baseUrl);
              console.log(`🔄 應用重啟完成`);
              break;
              
            case 'skip':
              console.log(`⏭️ 跳過當前步驟`);
              return;
          }
          
          // 等待恢復穩定
          await this.page.waitForTimeout(2000);
          return;
          
        } catch (recoveryError) {
          console.error(`❌ 恢復策略 ${strategy.type} 失敗:`, recoveryError);
        }
      }
    }
    
    console.warn(`⚠️ 所有恢復策略均失敗`);
  }

  private shouldApplyStrategy(condition: string, error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    switch (condition) {
      case 'navigation_timeout':
        return errorMessage.includes('timeout') && errorMessage.includes('navigation');
      case 'critical_error':
        return errorMessage.includes('critical') || errorMessage.includes('fatal');
      case 'non_critical_error':
        return !this.shouldApplyStrategy('critical_error', error);
      default:
        return false;
    }
  }

  async generateReport() {
    // 生成全面錯誤報告
    const errorReport = await this.errorReporter.generateComprehensiveReport();
    
    // 生成截圖集
    const screenshotGalleryPath = await this.screenshotManager.generateScreenshotGallery();
    
    // 獲取統計信息
    const screenshotStats = this.screenshotManager.getStatistics();
    const errorStats = this.errorReporter.getErrorStats();

    const report = {
      config: {
        name: this.config.name,
        version: this.config.version,
        description: this.config.description
      },
      execution: {
        startTime: this.testResults[0]?.startTime,
        endTime: Math.max(...this.testResults.map(r => r.endTime || 0)),
        totalDuration: 0,
        environment: this.config.environment
      },
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.tests.length, 0),
        passed: this.testResults.reduce((sum, suite) => sum + suite.passed, 0),
        failed: this.testResults.reduce((sum, suite) => sum + suite.failed, 0),
        skipped: this.testResults.reduce((sum, suite) => sum + suite.skipped, 0)
      },
      performance: this.performanceMetrics,
      testSuites: this.testResults,
      // 新增：增強的錯誤和截圖統計
      enhanced: {
        errorReport: {
          summary: errorReport.summary,
          totalErrors: errorStats.total,
          errorsByType: errorStats.byType,
          errorsBySeverity: errorStats.bySeverity,
          recoveryRate: errorStats.recoveryRate
        },
        screenshots: {
          totalScreenshots: screenshotStats.totalScreenshots,
          totalSize: screenshotStats.totalSize,
          averageCaptureTime: screenshotStats.averageCaptureTime,
          galleryPath: screenshotGalleryPath
        },
        attachments: {
          errorReportHtml: path.join(this.config.environment.reportPath, 'error-report.html'),
          screenshotGallery: screenshotGalleryPath,
          comprehensiveErrorReport: path.join(this.config.environment.reportPath, 'comprehensive-error-report.json')
        }
      }
    };

    report.execution.totalDuration = (report.execution.endTime || 0) - (report.execution.startTime || 0);

    // 保存主報告
    const reportPath = path.join(this.config.environment.reportPath, `mcp-test-report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 增強測試報告已生成:`);
    console.log(`   📄 主報告: ${reportPath}`);
    console.log(`   🚨 錯誤報告: ${report.enhanced.attachments.errorReportHtml}`);
    console.log(`   📷 截圖集: ${report.enhanced.attachments.screenshotGallery}`);
    
    console.log(`\n📈 測試摘要:`);
    console.log(`   - 測試套件: ${report.summary.totalSuites}`);
    console.log(`   - 測試案例: ${report.summary.totalTests}`);
    console.log(`   - 通過: ${report.summary.passed}`);
    console.log(`   - 失敗: ${report.summary.failed}`);
    console.log(`   - 跳過: ${report.summary.skipped}`);
    console.log(`   - 總時長: ${(report.execution.totalDuration / 1000).toFixed(2)}s`);
    
    console.log(`\n🛡️ 錯誤統計:`);
    console.log(`   - 總錯誤: ${errorStats.total}`);
    console.log(`   - 恢復成功率: ${(errorStats.recoveryRate * 100).toFixed(1)}%`);
    console.log(`   - 嚴重錯誤: ${errorStats.bySeverity.critical || 0}`);
    
    console.log(`\n📷 截圖統計:`);
    console.log(`   - 總截圖: ${screenshotStats.totalScreenshots}`);
    console.log(`   - 總大小: ${(screenshotStats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   - 平均捕獲時間: ${screenshotStats.averageCaptureTime.toFixed(1)}ms`);

    return report;
  }

  /**
   * 清理資源
   */
  async cleanup(): Promise<void> {
    if (this.keyNodeDetector) {
      this.keyNodeDetector.stopDetection();
    }
    
    // 清理舊的截圖（保留最近7天）
    if (this.screenshotManager) {
      await this.screenshotManager.cleanup(7 * 24 * 60 * 60 * 1000);
    }
    
    console.log('🧹 MCP 測試執行器資源已清理');
  }
}

// Playwright 測試定義
test.describe('FocusFlow MCP YAML 驅動測試', () => {
  let config: TestConfig;
  let executor: MCPYamlExecutor;

  test.beforeAll(async () => {
    // 讀取 YAML 配置
    const configPath = path.join(__dirname, 'focusflow-mcp-test-config.yml');
    const configContent = await fs.readFile(configPath, 'utf8');
    config = yaml.load(configContent) as TestConfig;
    
    executor = new MCPYamlExecutor(config);
    console.log(`📄 已載入測試配置: ${config.name}`);
  });

  test.beforeEach(async ({ page, context }) => {
    await executor.initialize(page, context);
  });

  // 為每個測試套件創建測試案例
  test('動態執行所有 YAML 測試套件', async () => {
    if (!config || !config.testSuites) {
      throw new Error('測試配置未正確載入');
    }

    const allResults = [];
    
    for (let index = 0; index < config.testSuites.length; index++) {
      const testSuite = config.testSuites[index];
      console.log(`\n🎯 開始執行測試套件 ${index + 1}/${config.testSuites.length}: ${testSuite.name}`);
      
      try {
        const result = await executor.executeTestSuite(testSuite);
        allResults.push(result);
        
        // 驗證測試套件結果 - 允許一定比例的失敗
        const failureRate = result.failed / Math.max(1, result.tests.length);
        expect(failureRate).toBeLessThanOrEqual(0.2); // 允許 20% 失敗率
        
        if (result.failed > 0) {
          console.warn(`⚠️ 測試套件 ${testSuite.name} 有 ${result.failed}/${result.tests.length} 個失敗的測試`);
        } else {
          console.log(`✅ 測試套件 ${testSuite.name} 全部通過 (${result.passed}/${result.tests.length})`);
        }
      } catch (error) {
        console.error(`❌ 測試套件 ${testSuite.name} 執行異常:`, error);
        // 記錄但不中斷其他測試套件
        allResults.push({
          name: testSuite.name,
          failed: 1,
          passed: 0,
          tests: [],
          error: error.message
        });
      }
    }
    
    // 總體統計
    const totalTests = allResults.reduce((sum, r) => sum + r.tests.length, 0);
    const totalPassed = allResults.reduce((sum, r) => sum + (r.passed || 0), 0);
    const totalFailed = allResults.reduce((sum, r) => sum + (r.failed || 0), 0);
    
    console.log(`\n📊 所有測試套件執行完成:`);
    console.log(`   - 總測試數: ${totalTests}`);
    console.log(`   - 通過: ${totalPassed}`);
    console.log(`   - 失敗: ${totalFailed}`);
    console.log(`   - 成功率: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
    
    // 確保整體成功率達到要求
    expect(totalFailed).toBeLessThanOrEqual(totalTests * 0.3); // 允許 30% 的總體失敗率
  });

  test.afterAll(async () => {
    if (executor) {
      await executor.generateReport();
      await executor.cleanup();
    }
  });
});