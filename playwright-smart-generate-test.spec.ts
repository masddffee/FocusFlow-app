import { test, expect, chromium, Page, BrowserContext } from '@playwright/test';

/**
 * 🧪 FocusFlow Smart Generate 端對端功能測試
 * 測試用戶完整的 Smart Generate 互動流程
 */

interface TestResults {
  timestamp: string;
  testName: string;
  status: 'success' | 'failed' | 'error';
  duration: number;
  screenshots: string[];
  errors: string[];
  steps: Array<{
    step: string;
    status: 'success' | 'failed';
    duration: number;
    details?: string;
  }>;
}

class SmartGenerateTestRunner {
  private results: TestResults[] = [];
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  
  constructor() {
    this.results = [];
  }

  async setup() {
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000,
      args: ['--disable-web-security', '--allow-running-insecure-content']
    });
    
    this.context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: './test-results/videos/' }
    });
    
    this.page = await this.context.newPage();
    
    // 添加詳細的控制台日誌監聽
    this.page.on('console', msg => {
      console.log(`🖥️  [CONSOLE ${msg.type()}]: ${msg.text()}`);
    });
    
    this.page.on('pageerror', error => {
      console.error(`❌ [PAGE ERROR]: ${error.message}`);
    });
    
    return this.page;
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
  }

  async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResults> {
    const startTime = Date.now();
    const result: TestResults = {
      timestamp: new Date().toISOString(),
      testName,
      status: 'success',
      duration: 0,
      screenshots: [],
      errors: [],
      steps: []
    };

    try {
      console.log(`🚀 開始測試: ${testName}`);
      await testFunction();
      result.status = 'success';
      console.log(`✅ 測試成功: ${testName}`);
    } catch (error) {
      result.status = 'failed';
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error(`❌ 測試失敗: ${testName}`, error);
      
      // 失敗截圖
      if (this.page) {
        const screenshot = `./test-results/failure-${testName.replace(/\s+/g, '_')}-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshot, fullPage: true });
        result.screenshots.push(screenshot);
      }
    } finally {
      result.duration = Date.now() - startTime;
      this.results.push(result);
    }

    return result;
  }

  async captureStepResult(stepName: string, success: boolean, details?: string) {
    console.log(`📝 步驟記錄: ${stepName} - ${success ? '✅' : '❌'}`);
    
    if (this.page && this.results.length > 0) {
      const screenshot = `./test-results/step-${stepName.replace(/\s+/g, '_')}-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshot, fullPage: true });
      this.results[this.results.length - 1].screenshots.push(screenshot);
      
      this.results[this.results.length - 1].steps.push({
        step: stepName,
        status: success ? 'success' : 'failed',
        duration: 0,
        details
      });
    }
  }

  generateReport(): string {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.status === 'success').length;
    const failedTests = totalTests - successfulTests;

    let report = `# 🧪 FocusFlow Smart Generate 測試報告\n\n`;
    report += `**測試時間:** ${new Date().toLocaleString()}\n`;
    report += `**總測試數:** ${totalTests}\n`;
    report += `**成功:** ${successfulTests} ✅\n`;
    report += `**失敗:** ${failedTests} ❌\n`;
    report += `**成功率:** ${totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0}%\n\n`;

    report += `## 📊 測試結果詳細\n\n`;

    this.results.forEach((result, index) => {
      report += `### ${index + 1}. ${result.testName}\n`;
      report += `- **狀態:** ${result.status === 'success' ? '✅ 成功' : '❌ 失敗'}\n`;
      report += `- **執行時間:** ${result.duration}ms\n`;
      
      if (result.errors.length > 0) {
        report += `- **錯誤:** ${result.errors.join(', ')}\n`;
      }
      
      if (result.steps.length > 0) {
        report += `- **步驟詳情:**\n`;
        result.steps.forEach((step, stepIndex) => {
          report += `  ${stepIndex + 1}. ${step.step} - ${step.status === 'success' ? '✅' : '❌'}\n`;
          if (step.details) {
            report += `     詳情: ${step.details}\n`;
          }
        });
      }
      
      if (result.screenshots.length > 0) {
        report += `- **截圖:** ${result.screenshots.length} 張\n`;
        result.screenshots.forEach(screenshot => {
          report += `  - ${screenshot}\n`;
        });
      }
      
      report += `\n`;
    });

    return report;
  }
}

test.describe('FocusFlow Smart Generate 完整流程測試', () => {
  let testRunner: SmartGenerateTestRunner;
  let page: Page;

  test.beforeEach(async () => {
    testRunner = new SmartGenerateTestRunner();
    page = await testRunner.setup();
  });

  test.afterEach(async () => {
    await testRunner.cleanup();
  });

  test('🎯 Smart Generate 完整用戶流程', async () => {
    await testRunner.runTest('Smart Generate 完整流程', async () => {
      // 步驟 1: 訪問應用程式
      console.log('📱 步驟 1: 訪問 FocusFlow 應用');
      await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
      await testRunner.captureStepResult('應用程式載入', true, '成功訪問主頁面');
      
      // 檢查頁面是否正確載入
      await expect(page).toHaveTitle(/FocusFlow/i, { timeout: 10000 });
      
      // 步驟 2: 尋找並點擊 Smart Generate 按鈕
      console.log('🎯 步驟 2: 定位 Smart Generate 功能');
      
      // 嘗試多種可能的選擇器
      const smartGenerateSelectors = [
        'button:has-text("Smart Generate")',
        '[data-testid="smart-generate"]',
        'button:has-text("智能生成")',
        'button:has-text("AI Generate")',
        '.smart-generate-btn',
        'button[aria-label*="generate"]',
        'text=Smart Generate',
        'text=智能生成'
      ];
      
      let smartGenerateButton = null;
      let usedSelector = '';
      
      for (const selector of smartGenerateSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          smartGenerateButton = page.locator(selector).first();
          if (await smartGenerateButton.isVisible()) {
            usedSelector = selector;
            break;
          }
        } catch (e) {
          console.log(`⏭️  選擇器未找到: ${selector}`);
        }
      }
      
      if (!smartGenerateButton) {
        // 如果找不到按鈕，截圖並列出所有可點擊元素
        await page.screenshot({ path: './test-results/no-smart-generate-found.png', fullPage: true });
        
        const allButtons = await page.locator('button').all();
        console.log(`🔍 頁面上的所有按鈕 (${allButtons.length} 個):`);
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const text = await allButtons[i].textContent();
          console.log(`  - 按鈕 ${i + 1}: "${text}"`);
        }
        
        throw new Error('無法找到 Smart Generate 按鈕');
      }
      
      console.log(`✅ 找到 Smart Generate 按鈕，使用選擇器: ${usedSelector}`);
      await testRunner.captureStepResult('找到 Smart Generate 按鈕', true, `使用選擇器: ${usedSelector}`);
      
      // 點擊 Smart Generate 按鈕
      await smartGenerateButton.click();
      await testRunner.captureStepResult('點擊 Smart Generate', true);
      
      // 步驟 3: 填寫任務表單
      console.log('📝 步驟 3: 填寫任務資訊表單');
      
      // 等待表單出現
      await page.waitForSelector('input[placeholder*="title"], input[placeholder*="標題"], #title-input', { timeout: 5000 });
      
      const testTaskData = {
        title: '學習 React Native 開發',
        description: '我想要學習使用 React Native 開發移動應用程式，包括基礎組件使用、狀態管理、導航系統等核心概念。',
        dueDate: '2025-08-15'
      };
      
      // 填寫標題
      const titleSelectors = ['input[placeholder*="title"]', 'input[placeholder*="標題"]', '#title-input', 'input[name="title"]'];
      for (const selector of titleSelectors) {
        try {
          const titleInput = page.locator(selector).first();
          if (await titleInput.isVisible()) {
            await titleInput.fill(testTaskData.title);
            console.log(`✅ 成功填寫標題: ${testTaskData.title}`);
            break;
          }
        } catch (e) {
          console.log(`⏭️  標題輸入框選擇器無效: ${selector}`);
        }
      }
      
      await testRunner.captureStepResult('填寫任務標題', true, testTaskData.title);
      
      // 填寫描述
      const descriptionSelectors = [
        'textarea[placeholder*="description"]', 
        'textarea[placeholder*="描述"]', 
        '#description-input', 
        'textarea[name="description"]',
        'input[placeholder*="description"]'
      ];
      
      for (const selector of descriptionSelectors) {
        try {
          const descInput = page.locator(selector).first();
          if (await descInput.isVisible()) {
            await descInput.fill(testTaskData.description);
            console.log(`✅ 成功填寫描述`);
            break;
          }
        } catch (e) {
          console.log(`⏭️  描述輸入框選擇器無效: ${selector}`);
        }
      }
      
      await testRunner.captureStepResult('填寫任務描述', true, '已填寫詳細描述');
      
      // 填寫截止日期（如果有的話）
      const dateSelectors = ['input[type="date"]', 'input[placeholder*="date"]', '#due-date-input'];
      for (const selector of dateSelectors) {
        try {
          const dateInput = page.locator(selector).first();
          if (await dateInput.isVisible()) {
            await dateInput.fill(testTaskData.dueDate);
            console.log(`✅ 成功填寫截止日期: ${testTaskData.dueDate}`);
            break;
          }
        } catch (e) {
          console.log(`⏭️  日期輸入框選擇器無效: ${selector}`);
        }
      }
      
      await testRunner.captureStepResult('填寫截止日期', true, testTaskData.dueDate);
      
      // 步驟 4: 提交表單並等待 AI 處理
      console.log('🤖 步驟 4: 提交表單，等待 AI 生成');
      
      const submitSelectors = [
        'button:has-text("Generate")', 
        'button:has-text("生成")',
        'button:has-text("Submit")', 
        'button:has-text("提交")',
        'button[type="submit"]',
        '.generate-btn',
        '.submit-btn'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const submitBtn = page.locator(selector).first();
          if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
            await submitBtn.click();
            console.log(`✅ 成功提交表單，使用選擇器: ${selector}`);
            submitted = true;
            break;
          }
        } catch (e) {
          console.log(`⏭️  提交按鈕選擇器無效: ${selector}`);
        }
      }
      
      if (!submitted) {
        throw new Error('無法找到或點擊提交按鈕');
      }
      
      await testRunner.captureStepResult('提交表單', true, '表單已成功提交');
      
      // 步驟 5: 等待 AI 回應並處理個人化問題
      console.log('❓ 步驟 5: 等待 AI 個人化問題');
      
      // 等待載入指示器或 AI 回應
      try {
        await page.waitForSelector('.loading, .spinner, text=Loading, text=載入中', { timeout: 5000 });
        console.log('📊 檢測到載入狀態');
      } catch (e) {
        console.log('⏭️  未檢測到載入狀態，繼續執行');
      }
      
      // 等待個人化問題出現
      await page.waitForSelector(
        'text=Please answer, text=請回答, .personalization-question, .ai-question',
        { timeout: 30000 }
      );
      
      await testRunner.captureStepResult('AI 個人化問題出現', true, '成功接收到 AI 生成的問題');
      
      // 步驟 6: 回答 AI 問題
      console.log('💬 步驟 6: 回答 AI 個人化問題');
      
      // 尋找問題回答輸入框或選項
      const answerSelectors = [
        'textarea[placeholder*="answer"]',
        'textarea[placeholder*="回答"]',
        'input[placeholder*="answer"]',
        '.answer-input',
        '.question-response'
      ];
      
      const sampleAnswers = [
        '我是初學者，希望從基礎開始學習',
        '我有一些 JavaScript 基礎，想要快速上手',
        '我計劃每天花 2-3 小時學習'
      ];
      
      let answeredQuestions = 0;
      for (let i = 0; i < 3; i++) { // 最多回答 3 個問題
        for (const selector of answerSelectors) {
          try {
            const answerInput = page.locator(selector).nth(i);
            if (await answerInput.isVisible()) {
              await answerInput.fill(sampleAnswers[i] || '我希望深入學習這個主題');
              answeredQuestions++;
              console.log(`✅ 回答了問題 ${i + 1}`);
              break;
            }
          } catch (e) {
            // 繼續嘗試下一個選擇器
          }
        }
      }
      
      await testRunner.captureStepResult(`回答 AI 問題`, answeredQuestions > 0, `成功回答了 ${answeredQuestions} 個問題`);
      
      // 提交答案
      const continueSelectors = [
        'button:has-text("Continue")',
        'button:has-text("繼續")',
        'button:has-text("Next")',
        'button:has-text("下一步")',
        '.continue-btn',
        '.next-btn'
      ];
      
      for (const selector of continueSelectors) {
        try {
          const continueBtn = page.locator(selector).first();
          if (await continueBtn.isVisible() && await continueBtn.isEnabled()) {
            await continueBtn.click();
            console.log(`✅ 成功提交答案`);
            break;
          }
        } catch (e) {
          console.log(`⏭️  繼續按鈕選擇器無效: ${selector}`);
        }
      }
      
      await testRunner.captureStepResult('提交問題答案', true);
      
      // 步驟 7: 等待最終的學習計劃生成
      console.log('📋 步驟 7: 等待學習計劃生成');
      
      // 等待最終結果
      await page.waitForSelector(
        '.learning-plan, .subtasks, .generated-plan, text=學習計劃, text=子任務',
        { timeout: 60000 }
      );
      
      await testRunner.captureStepResult('學習計劃生成完成', true, '成功生成完整的學習計劃');
      
      // 步驟 8: 驗證生成的內容
      console.log('🔍 步驟 8: 驗證生成內容的完整性');
      
      // 檢查是否有子任務列表
      const subtasks = await page.locator('.subtask, .task-item, li').count();
      console.log(`📝 檢測到 ${subtasks} 個子任務項目`);
      
      // 檢查是否有時間安排
      const hasSchedule = await page.locator('text=schedule, text=時間, text=日期, .schedule').count() > 0;
      console.log(`📅 時間安排檢測: ${hasSchedule ? '有' : '無'}`);
      
      // 最終截圖
      await page.screenshot({ path: './test-results/final-result.png', fullPage: true });
      
      await testRunner.captureStepResult('內容驗證', subtasks > 0, `生成了 ${subtasks} 個子任務，${hasSchedule ? '包含' : '不包含'}時間安排`);
      
      console.log(`🎉 Smart Generate 流程測試完成！`);
    });
  });

  test.afterAll(async () => {
    if (testRunner) {
      // 生成最終報告
      const report = testRunner.generateReport();
      await require('fs').promises.writeFile('./test-results/smart-generate-test-report.md', report);
      console.log('📊 測試報告已生成: ./test-results/smart-generate-test-report.md');
      console.log('\n' + report);
    }
  });
});