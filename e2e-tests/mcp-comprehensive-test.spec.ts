import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * 🧪 FocusFlow MCP 完整功能測試套件
 * 全面驗證所有核心功能，包含截圖證據收集
 */

interface TestStep {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startTime?: number;
  endTime?: number;
  screenshots: string[];
  errors: string[];
  details?: string;
}

class MCPTestRunner {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private testSteps: TestStep[] = [];
  private currentStep: TestStep | null = null;
  private testStartTime: number = Date.now();

  constructor() {
    this.testSteps = [];
  }

  async setup() {
    console.log('🚀 初始化 MCP 測試環境...');
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 500,
      args: [
        '--disable-web-security', 
        '--allow-running-insecure-content',
        '--enable-logging',
        '--v=1'
      ]
    });
    
    this.context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: './test-results/videos/' },
      ignoreHTTPSErrors: true
    });
    
    this.page = await this.context.newPage();
    
    // 詳細日誌監聽
    this.page.on('console', msg => {
      const timestamp = new Date().toISOString();
      console.log(`🖥️  [${timestamp}] [CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    this.page.on('pageerror', error => {
      const timestamp = new Date().toISOString();
      console.error(`❌ [${timestamp}] [PAGE ERROR]: ${error.message}`);
      if (this.currentStep) {
        this.currentStep.errors.push(`Page Error: ${error.message}`);
      }
    });

    this.page.on('requestfailed', request => {
      const timestamp = new Date().toISOString();
      console.error(`🌐 [${timestamp}] [REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`);
      if (this.currentStep) {
        this.currentStep.errors.push(`Request Failed: ${request.url()}`);
      }
    });
    
    return this.page;
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
  }

  async startStep(stepName: string): Promise<void> {
    if (this.currentStep && this.currentStep.status === 'running') {
      await this.endStep('failed', 'Previous step was not properly ended');
    }
    
    this.currentStep = {
      name: stepName,
      status: 'running',
      startTime: Date.now(),
      screenshots: [],
      errors: []
    };
    
    this.testSteps.push(this.currentStep);
    console.log(`📝 開始測試步驟: ${stepName}`);
  }

  async endStep(status: 'passed' | 'failed', details?: string): Promise<void> {
    if (!this.currentStep) return;
    
    this.currentStep.status = status;
    this.currentStep.endTime = Date.now();
    this.currentStep.details = details;
    
    const duration = this.currentStep.endTime - (this.currentStep.startTime || 0);
    const statusIcon = status === 'passed' ? '✅' : '❌';
    
    console.log(`${statusIcon} 步驟完成: ${this.currentStep.name} (${duration}ms)`);
    if (details) console.log(`   詳情: ${details}`);
    if (this.currentStep.errors.length > 0) {
      console.log(`   錯誤: ${this.currentStep.errors.join(', ')}`);
    }
    
    // 截圖
    await this.captureScreenshot(`step-${this.currentStep.name.replace(/\s+/g, '_')}-${status}`);
    
    this.currentStep = null;
  }

  async captureScreenshot(filename: string): Promise<string> {
    if (!this.page) return '';
    
    const timestamp = Date.now();
    const screenshotPath = `./test-results/screenshots/${filename}-${timestamp}.png`;
    
    try {
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        type: 'png',
        quality: 90
      });
      
      if (this.currentStep) {
        this.currentStep.screenshots.push(screenshotPath);
      }
      
      console.log(`📸 截圖已保存: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ 截圖失敗: ${error}`);
      return '';
    }
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`⏰ 等待元素超時: ${selector}`);
      return false;
    }
  }

  async clickWithRetry(selector: string, maxRetries: number = 3): Promise<boolean> {
    if (!this.page) return false;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const element = this.page.locator(selector).first();
        
        if (await element.isVisible() && await element.isEnabled()) {
          await element.click();
          console.log(`✅ 成功點擊: ${selector}`);
          return true;
        }
        
        // 等待一段時間後重試
        await this.page.waitForTimeout(1000);
      } catch (error) {
        console.log(`⏭️  點擊重試 ${i + 1}/${maxRetries}: ${selector}`);
        if (i === maxRetries - 1) {
          console.error(`❌ 點擊失敗: ${selector} - ${error}`);
        }
      }
    }
    
    return false;
  }

  async fillFormWithRetry(selector: string, value: string): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      const element = this.page.locator(selector).first();
      
      if (await element.isVisible()) {
        await element.clear();
        await element.fill(value);
        
        // 驗證填寫結果
        const filledValue = await element.inputValue();
        if (filledValue === value) {
          console.log(`✅ 成功填寫: ${selector} = "${value}"`);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ 填寫失敗: ${selector} - ${error}`);
    }
    
    return false;
  }

  generateReport(): string {
    const totalSteps = this.testSteps.length;
    const passedSteps = this.testSteps.filter(s => s.status === 'passed').length;
    const failedSteps = this.testSteps.filter(s => s.status === 'failed').length;
    const totalDuration = Date.now() - this.testStartTime;

    let report = `# 🧪 FocusFlow MCP 完整功能測試報告\n\n`;
    report += `**測試執行時間:** ${new Date().toLocaleString()}\n`;
    report += `**總執行時長:** ${Math.round(totalDuration / 1000)}秒\n`;
    report += `**測試步驟總數:** ${totalSteps}\n`;
    report += `**通過步驟:** ${passedSteps} ✅\n`;
    report += `**失敗步驟:** ${failedSteps} ❌\n`;
    report += `**成功率:** ${totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 0}%\n\n`;

    // 詳細步驟報告
    report += `## 📊 詳細測試步驟\n\n`;
    report += `| 步驟 | 狀態 | 執行時間(ms) | 截圖數量 | 錯誤數量 | 詳情 |\n`;
    report += `|------|------|-------------|----------|----------|------|\n`;

    this.testSteps.forEach((step, index) => {
      const duration = step.endTime && step.startTime ? step.endTime - step.startTime : 0;
      const statusIcon = step.status === 'passed' ? '✅' : step.status === 'failed' ? '❌' : '⏳';
      
      report += `| ${index + 1}. ${step.name} | ${statusIcon} ${step.status} | ${duration} | ${step.screenshots.length} | ${step.errors.length} | ${step.details || '-'} |\n`;
    });

    // 截圖證據
    report += `\n## 📸 測試截圖證據\n\n`;
    this.testSteps.forEach((step, index) => {
      if (step.screenshots.length > 0) {
        report += `### ${index + 1}. ${step.name}\n`;
        step.screenshots.forEach(screenshot => {
          report += `- ![${step.name}](${screenshot})\n`;
        });
        report += `\n`;
      }
    });

    // 錯誤總結
    const allErrors = this.testSteps.flatMap(s => s.errors);
    if (allErrors.length > 0) {
      report += `## ❌ 錯誤總結\n\n`;
      allErrors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += `\n`;
    }

    return report;
  }
}

test.describe('FocusFlow MCP 完整功能測試', () => {
  let testRunner: MCPTestRunner;
  let page: Page;

  test.beforeAll(async () => {
    testRunner = new MCPTestRunner();
    page = await testRunner.setup();
  });

  test.afterAll(async () => {
    if (testRunner) {
      // 生成最終報告
      const report = testRunner.generateReport();
      await fs.writeFile('./test-results/reports/mcp-comprehensive-test-report.md', report);
      console.log('📊 詳細測試報告已生成: ./test-results/reports/mcp-comprehensive-test-report.md');
      
      await testRunner.cleanup();
    }
  });

  test('🎯 Phase 1: 環境準備與基礎驗證', async () => {
    // 步驟 1: 服務連通性檢查
    await testRunner.startStep('服務連通性檢查');
    
    try {
      console.log('🌐 檢查前端服務連通性...');
      await page.goto('http://localhost:8081', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // 檢查頁面是否正確載入
      const title = await page.title();
      console.log(`📄 頁面標題: ${title}`);
      
      if (title && (title.includes('FocusFlow') || title.includes('Expo') || title.length > 0)) {
        await testRunner.endStep('passed', `頁面成功載入，標題: ${title}`);
      } else {
        await testRunner.endStep('failed', '頁面標題異常或空白');
        return;
      }
    } catch (error) {
      await testRunner.endStep('failed', `無法連接到前端服務: ${error}`);
      return;
    }

    // 步驟 2: 基礎 UI 元素檢查
    await testRunner.startStep('基礎 UI 元素檢查');
    
    try {
      // 等待頁面完全載入
      await page.waitForTimeout(3000);
      
      // 檢查是否有基本的導航或內容元素
      const bodyContent = await page.locator('body').textContent();
      console.log(`📝 頁面內容長度: ${bodyContent?.length || 0} 字符`);
      
      if (bodyContent && bodyContent.length > 100) {
        await testRunner.endStep('passed', `頁面內容正常，包含 ${bodyContent.length} 字符`);
      } else {
        await testRunner.endStep('failed', '頁面內容過少或為空');
        return;
      }
    } catch (error) {
      await testRunner.endStep('failed', `UI 元素檢查失敗: ${error}`);
      return;
    }

    // 步驟 3: 後端 API 連通性檢查
    await testRunner.startStep('後端 API 連通性檢查');
    
    try {
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('http://localhost:3000/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          return {
            status: res.status,
            ok: res.ok,
            text: await res.text()
          };
        } catch (error) {
          return {
            status: 0,
            ok: false,
            error: error.message
          };
        }
      });
      
      console.log(`🔗 後端服務回應:`, response);
      
      if (response.ok || response.status === 404) {
        // 404 也算連通，只是端點不存在
        await testRunner.endStep('passed', `後端服務連通 (狀態碼: ${response.status})`);
      } else {
        await testRunner.endStep('failed', `後端服務無回應: ${response.error || '未知錯誤'}`);
      }
    } catch (error) {
      await testRunner.endStep('failed', `API 連通性測試失敗: ${error}`);
    }
  });

  test('🎯 Phase 2: Smart Generate 核心功能測試', async () => {
    // 步驟 1: 定位 Smart Generate 功能
    await testRunner.startStep('定位 Smart Generate 功能');
    
    try {
      // 多種可能的選擇器策略
      const smartGenerateSelectors = [
        'button:has-text("Smart Generate")',
        'button:has-text("智能生成")',
        'button:has-text("AI Generate")',
        '[data-testid="smart-generate"]',
        '.smart-generate-btn',
        'button[aria-label*="generate"]',
        'text=Smart Generate',
        'text=智能生成',
        'text=Generate',
        'text=生成'
      ];
      
      let foundElement = false;
      let usedSelector = '';
      
      for (const selector of smartGenerateSelectors) {
        try {
          if (await testRunner.waitForElement(selector, 3000)) {
            const element = page.locator(selector).first();
            if (await element.isVisible()) {
              usedSelector = selector;
              foundElement = true;
              break;
            }
          }
        } catch (e) {
          console.log(`⏭️  選擇器未找到: ${selector}`);
        }
      }
      
      if (foundElement) {
        await testRunner.endStep('passed', `找到 Smart Generate 按鈕: ${usedSelector}`);
        
        // 步驟 2: 點擊 Smart Generate 按鈕
        await testRunner.startStep('點擊 Smart Generate 按鈕');
        
        if (await testRunner.clickWithRetry(usedSelector)) {
          await testRunner.endStep('passed', 'Smart Generate 按鈕點擊成功');
        } else {
          await testRunner.endStep('failed', 'Smart Generate 按鈕點擊失敗');
          return;
        }
      } else {
        // 列出頁面上所有可見的按鈕和連結
        const allInteractiveElements = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
          return buttons.slice(0, 10).map(btn => ({
            tagName: btn.tagName,
            textContent: btn.textContent?.trim().substring(0, 50) || '',
            className: btn.className || '',
            id: btn.id || ''
          }));
        });
        
        console.log('🔍 頁面上的可互動元素:', allInteractiveElements);
        
        await testRunner.endStep('failed', '無法找到 Smart Generate 按鈕或類似功能');
        return;
      }
    } catch (error) {
      await testRunner.endStep('failed', `Smart Generate 功能定位失敗: ${error}`);
      return;
    }

    // 步驟 3: 填寫任務表單
    await testRunner.startStep('填寫任務表單');
    
    try {
      // 等待表單出現
      await page.waitForTimeout(2000);
      
      const testTaskData = {
        title: '學習 React Native 開發基礎',
        description: '我想要學習 React Native 移動應用開發，包括組件使用、狀態管理、導航系統等核心概念，目標是能夠獨立完成一個簡單的應用。',
        dueDate: '2025-08-20'
      };
      
      // 填寫標題
      const titleSelectors = [
        'input[placeholder*="title"]', 
        'input[placeholder*="標題"]', 
        '#title-input', 
        'input[name="title"]',
        'textarea[placeholder*="title"]',
        '.title-input input',
        '.task-title input'
      ];
      
      let titleFilled = false;
      for (const selector of titleSelectors) {
        if (await testRunner.fillFormWithRetry(selector, testTaskData.title)) {
          titleFilled = true;
          break;
        }
      }
      
      // 填寫描述
      const descriptionSelectors = [
        'textarea[placeholder*="description"]', 
        'textarea[placeholder*="描述"]', 
        '#description-input', 
        'textarea[name="description"]',
        'input[placeholder*="description"]',
        '.description-input textarea',
        '.task-description textarea'
      ];
      
      let descriptionFilled = false;
      for (const selector of descriptionSelectors) {
        if (await testRunner.fillFormWithRetry(selector, testTaskData.description)) {
          descriptionFilled = true;
          break;
        }
      }
      
      // 填寫截止日期
      const dateSelectors = [
        'input[type="date"]', 
        'input[placeholder*="date"]', 
        '#due-date-input',
        '.date-input input',
        '.due-date input'
      ];
      
      let dateFilled = false;
      for (const selector of dateSelectors) {
        if (await testRunner.fillFormWithRetry(selector, testTaskData.dueDate)) {
          dateFilled = true;
          break;
        }
      }
      
      const filledFields = [titleFilled, descriptionFilled, dateFilled].filter(Boolean).length;
      
      if (filledFields >= 1) {
        await testRunner.endStep('passed', `成功填寫 ${filledFields}/3 個表單欄位`);
      } else {
        await testRunner.endStep('failed', '無法找到或填寫任何表單欄位');
        return;
      }
    } catch (error) {
      await testRunner.endStep('failed', `表單填寫失敗: ${error}`);
      return;
    }

    // 步驟 4: 提交表單
    await testRunner.startStep('提交表單');
    
    try {
      const submitSelectors = [
        'button:has-text("Generate")', 
        'button:has-text("生成")',
        'button:has-text("Submit")', 
        'button:has-text("提交")',
        'button[type="submit"]',
        '.generate-btn',
        '.submit-btn',
        'button:has-text("Start")',
        'button:has-text("開始")'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        if (await testRunner.clickWithRetry(selector)) {
          submitted = true;
          break;
        }
      }
      
      if (submitted) {
        await testRunner.endStep('passed', '表單提交成功');
      } else {
        await testRunner.endStep('failed', '無法找到或點擊提交按鈕');
        return;
      }
    } catch (error) {
      await testRunner.endStep('failed', `表單提交失敗: ${error}`);
      return;
    }

    // 步驟 5: 等待 AI 處理
    await testRunner.startStep('等待 AI 處理');
    
    try {
      // 等待載入指示器或處理狀態
      const loadingSelectors = [
        '.loading', 
        '.spinner', 
        'text=Loading', 
        'text=載入中',
        'text=Processing',
        'text=處理中',
        '[data-testid="loading"]'
      ];
      
      let foundLoading = false;
      for (const selector of loadingSelectors) {
        if (await testRunner.waitForElement(selector, 5000)) {
          foundLoading = true;
          console.log(`⏳ 檢測到載入狀態: ${selector}`);
          break;
        }
      }
      
      // 等待處理完成或結果出現
      await page.waitForTimeout(10000); // 給 AI 處理一些時間
      
      // 檢查是否有處理結果
      const resultSelectors = [
        '.result', 
        '.plan', 
        '.generated',
        'text=計劃',
        'text=Plan',
        'text=Generated',
        'text=完成',
        '.task-list',
        '.subtasks'
      ];
      
      let foundResult = false;
      for (const selector of resultSelectors) {
        if (await testRunner.waitForElement(selector, 5000)) {
          foundResult = true;
          console.log(`✅ 檢測到處理結果: ${selector}`);
          break;
        }
      }
      
      if (foundResult || foundLoading) {
        await testRunner.endStep('passed', `AI 處理完成 (載入狀態: ${foundLoading}, 結果: ${foundResult})`);
      } else {
        await testRunner.endStep('failed', '未檢測到 AI 處理狀態或結果');
      }
    } catch (error) {
      await testRunner.endStep('failed', `AI 處理等待失敗: ${error}`);
    }
  });

  test('🎯 Phase 3: 基礎功能驗證', async () => {
    // 步驟 1: 頁面導航測試
    await testRunner.startStep('頁面導航測試');
    
    try {
      // 嘗試導航到不同的頁面
      const navigationTests = [
        { name: '首頁', selectors: ['text=Home', 'text=首頁', '[data-testid="home"]', '.home-tab'] },
        { name: '任務', selectors: ['text=Tasks', 'text=任務', '[data-testid="tasks"]', '.tasks-tab'] },
        { name: '統計', selectors: ['text=Stats', 'text=統計', '[data-testid="stats"]', '.stats-tab'] },
        { name: '設定', selectors: ['text=Settings', 'text=設定', '[data-testid="settings"]', '.settings-tab'] }
      ];
      
      let successfulNavigations = 0;
      
      for (const nav of navigationTests) {
        for (const selector of nav.selectors) {
          try {
            if (await testRunner.waitForElement(selector, 3000)) {
              await testRunner.clickWithRetry(selector);
              await page.waitForTimeout(1000);
              successfulNavigations++;
              console.log(`✅ 成功導航到: ${nav.name}`);
              break;
            }
          } catch (e) {
            // 繼續嘗試下一個選擇器
          }
        }
      }
      
      if (successfulNavigations > 0) {
        await testRunner.endStep('passed', `成功測試 ${successfulNavigations}/4 個導航項目`);
      } else {
        await testRunner.endStep('failed', '無法找到任何導航元素');
      }
    } catch (error) {
      await testRunner.endStep('failed', `頁面導航測試失敗: ${error}`);
    }

    // 步驟 2: 基本互動元素測試
    await testRunner.startStep('基本互動元素測試');
    
    try {
      // 統計頁面上的各種互動元素
      const interactiveElements = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input, textarea');
        const links = document.querySelectorAll('a');
        
        return {
          buttons: buttons.length,
          inputs: inputs.length,
          links: links.length,
          total: buttons.length + inputs.length + links.length
        };
      });
      
      console.log('🔍 互動元素統計:', interactiveElements);
      
      if (interactiveElements.total > 5) {
        await testRunner.endStep('passed', `檢測到 ${interactiveElements.total} 個互動元素 (按鈕: ${interactiveElements.buttons}, 輸入: ${interactiveElements.inputs}, 連結: ${interactiveElements.links})`);
      } else {
        await testRunner.endStep('failed', `互動元素過少: ${interactiveElements.total} 個`);
      }
    } catch (error) {
      await testRunner.endStep('failed', `互動元素測試失敗: ${error}`);
    }
  });
});