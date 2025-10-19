/**
 * 完整用戶流程可視化測試
 * 
 * 這個測試會在 headful 模式下運行，讓用戶可以即時觀察整個流程
 * 並診斷性能問題和功能問題
 */

import { test, expect } from '@playwright/test';

// 性能監控類
class PerformanceMonitor {
  private metrics: Array<{
    step: string;
    startTime: number;
    endTime: number;
    duration: number;
    apiCalls: Array<{
      url: string;
      method: string;
      duration: number;
      status: number;
    }>;
  }> = [];
  
  private currentStep: string = '';
  private stepStartTime: number = 0;
  private apiCalls: any[] = [];

  startStep(step: string) {
    console.log(`🚀 開始步驟: ${step}`);
    this.currentStep = step;
    this.stepStartTime = Date.now();
    this.apiCalls = [];
  }

  recordApiCall(url: string, method: string, duration: number, status: number) {
    this.apiCalls.push({ url, method, duration, status });
    console.log(`📡 API 調用: ${method} ${url} (${duration}ms) - ${status}`);
  }

  endStep() {
    const endTime = Date.now();
    const duration = endTime - this.stepStartTime;
    
    this.metrics.push({
      step: this.currentStep,
      startTime: this.stepStartTime,
      endTime,
      duration,
      apiCalls: [...this.apiCalls]
    });

    console.log(`✅ 完成步驟: ${this.currentStep} (${duration}ms)`);
    if (this.apiCalls.length > 0) {
      console.log(`   API 調用數量: ${this.apiCalls.length}`);
      const totalApiTime = this.apiCalls.reduce((sum, call) => sum + call.duration, 0);
      console.log(`   API 總耗時: ${totalApiTime}ms`);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  generateReport() {
    console.log('\n📊 性能分析報告:');
    console.log('==========================================');
    
    let totalTime = 0;
    this.metrics.forEach((metric, index) => {
      totalTime += metric.duration;
      console.log(`${index + 1}. ${metric.step}`);
      console.log(`   耗時: ${metric.duration}ms`);
      console.log(`   API 調用: ${metric.apiCalls.length} 次`);
      
      if (metric.apiCalls.length > 0) {
        const apiTime = metric.apiCalls.reduce((sum, call) => sum + call.duration, 0);
        console.log(`   API 總耗時: ${apiTime}ms (${((apiTime / metric.duration) * 100).toFixed(1)}%)`);
      }
      
      // 標記慢步驟
      if (metric.duration > 30000) {
        console.log(`   🚨 性能警告: 此步驟耗時超過30秒`);
      } else if (metric.duration > 10000) {
        console.log(`   ⚠️ 性能提醒: 此步驟耗時較長`);
      }
      console.log('');
    });
    
    console.log(`總耗時: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}秒)`);
    console.log('==========================================\n');
  }
}

const TEST_CONFIG = {
  baseURL: 'http://localhost:8081',
  backendURL: 'http://127.0.0.1:3000',
  testTask: {
    title: '學習 React Native 移動應用開發',
    description: '從基礎到進階，掌握 React Native 開發技能，能夠獨立開發完整的移動應用程式，包含 UI 設計、狀態管理、API 整合等核心技術',
    dueDate: '2025-09-30',
    priority: 'medium',
    estimatedHours: 60
  },
  personalizationAnswers: [
    '我有基本的 JavaScript 和 React 經驗，但對移動應用開發還是新手',
    '希望能開發出一個完整的社交媒體應用，類似 Instagram 的功能',
    '每天可以投入 2-3 小時學習，偏好透過實際專案來學習',
    '最關心的是 UI/UX 設計、狀態管理、API 整合和性能優化',
    '希望在 2 個月內完成基本的移動應用開發技能'
  ]
};

test.describe('完整用戶流程可視化測試', () => {
  // 設定為 headful 模式並延長超時
  test.setTimeout(300000); // 5分鐘超時
  
  let monitor: PerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new PerformanceMonitor();
    
    // 設定頁面監控
    page.on('request', async (request) => {
      const startTime = Date.now();
      
      // 監控 API 請求
      request.response().then((response) => {
        if (response) {
          const duration = Date.now() - startTime;
          monitor.recordApiCall(
            request.url(), 
            request.method(), 
            duration, 
            response.status()
          );
        }
      }).catch(() => {
        // 請求失敗
        const duration = Date.now() - startTime;
        monitor.recordApiCall(request.url(), request.method(), duration, 0);
      });
    });

    // 設定控制台監控
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ 控制台錯誤: ${msg.text()}`);
      }
    });

    // 設定頁面錯誤監控
    page.on('pageerror', (error) => {
      console.log(`🚨 頁面錯誤: ${error.message}`);
    });
  });

  test('完整用戶流程 - 可視化執行', async ({ page }) => {
    console.log('🎬 開始完整用戶流程可視化測試');
    console.log('請注意瀏覽器窗口以觀察即時執行過程\n');

    // 步驟 1: 導航到任務創建頁面
    monitor.startStep('導航到任務創建頁面');
    await page.goto(`${TEST_CONFIG.baseURL}/add-task`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 讓用戶看清頁面
    monitor.endStep();

    // 截圖記錄初始狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-01-initial.png',
      fullPage: true 
    });

    // 步驟 2: 填寫基本任務信息
    monitor.startStep('填寫基本任務信息');
    console.log('📝 填寫任務標題...');
    await page.locator('input').first().clear();
    await page.locator('input').first().fill(TEST_CONFIG.testTask.title);
    await page.waitForTimeout(1000);

    console.log('📝 填寫任務描述...');
    await page.locator('textarea').fill(TEST_CONFIG.testTask.description);
    await page.waitForTimeout(1000);

    console.log('📅 設定截止日期...');
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      await dateInput.fill(TEST_CONFIG.testTask.dueDate);
      await page.waitForTimeout(1000);
    }

    // 設定優先級（如果有的話）
    const priorityButtons = page.locator('text="Medium", text="中等"');
    if (await priorityButtons.count() > 0) {
      await priorityButtons.first().click();
      await page.waitForTimeout(500);
    }

    monitor.endStep();

    // 截圖記錄填寫完成狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-02-form-filled.png',
      fullPage: true 
    });

    // 步驟 3: 觸發 Smart Generate
    monitor.startStep('觸發 Smart Generate');
    console.log('🤖 尋找並點擊 Smart Generate 按鈕...');
    
    const smartGenerateButton = page.locator('text=Smart Generate');
    await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
    
    await smartGenerateButton.click();
    console.log('✅ Smart Generate 已觸發，等待響應...');
    await page.waitForTimeout(3000);
    monitor.endStep();

    // 步驟 4: 等待個人化問題生成（重點監控）
    monitor.startStep('等待個人化問題生成');
    console.log('⏳ 等待個人化 Modal 出現...');
    
    let personalizationQuestionsFound = false;
    let questionElements = 0;
    
    // 等待個人化 Modal 出現
    try {
      await page.waitForSelector('text=Help us personalize your plan, text=個人化, [role="dialog"]', { timeout: 60000 });
      console.log('✅ 個人化 Modal 已出現');
      
      // 等待問題載入完成
      await page.waitForTimeout(3000);
      
      // 檢查實際的個人化問題輸入框（在 Modal 內）
      questionElements = await page.locator('[role="dialog"] textarea, [role="dialog"] input[type="text"]').count();
      
      if (questionElements > 0) {
        personalizationQuestionsFound = true;
        console.log(`✅ 在 Modal 中找到 ${questionElements} 個個人化問題輸入框`);
      } else {
        // 如果沒找到輸入框，檢查是否有問題文本
        const questionTexts = await page.locator('[role="dialog"] text*="?"').count();
        if (questionTexts > 0) {
          personalizationQuestionsFound = true;
          console.log(`✅ 找到 ${questionTexts} 個個人化問題文本`);
        }
      }
      
    } catch (error) {
      console.log(`⚠️ 等待個人化 Modal 超時: ${error.message}`);
      
      // 備用檢查：尋找任何個人化相關元素
      questionElements = await page.locator('textarea, input[type="text"]').count();
      if (questionElements > 2) { // 超過基本的標題和描述輸入框
        personalizationQuestionsFound = true;
        console.log(`✅ 備用檢查：找到 ${questionElements} 個輸入框`);
      }
    }
    
    monitor.endStep();

    if (!personalizationQuestionsFound) {
      await page.screenshot({ 
        path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-03-no-questions.png',
        fullPage: true 
      });
      throw new Error('個人化問題生成失敗或超時');
    }

    // 截圖記錄個人化問題狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-04-personalization-questions.png',
      fullPage: true 
    });

    // 步驟 5: 回答個人化問題
    monitor.startStep('回答個人化問題');
    console.log('💬 開始回答個人化問題...');
    
    // 優先在 Modal 內尋找輸入框
    let answerInputs = await page.locator('[role="dialog"] textarea, [role="dialog"] input[type="text"]').all();
    
    // 如果 Modal 內沒找到，使用更廣泛的選擇器
    if (answerInputs.length === 0) {
      answerInputs = await page.locator('textarea:not([placeholder*="描述"]):not([placeholder*="任務"]), input[type="text"]:not([value*="學習"]):not([placeholder*="任務"])').all();
    }
    
    console.log(`找到 ${answerInputs.length} 個問題輸入框`);
    
    // 如果仍然沒有找到足夠的輸入框，嘗試等待更長時間讓問題完全載入
    if (answerInputs.length < 3) {
      console.log('📍 輸入框數量較少，等待問題完全載入...');
      await page.waitForTimeout(5000);
      answerInputs = await page.locator('[role="dialog"] textarea, [role="dialog"] input[type="text"]').all();
      
      if (answerInputs.length === 0) {
        answerInputs = await page.locator('textarea, input[type="text"]').all();
        console.log(`重新掃描後找到 ${answerInputs.length} 個輸入框`);
      }
    }
    
    for (let i = 0; i < Math.min(answerInputs.length, TEST_CONFIG.personalizationAnswers.length); i++) {
      console.log(`📝 回答問題 ${i + 1}: ${TEST_CONFIG.personalizationAnswers[i].substring(0, 30)}...`);
      
      try {
        await answerInputs[i].scrollIntoViewIfNeeded();
        await answerInputs[i].clear();
        await answerInputs[i].fill(TEST_CONFIG.personalizationAnswers[i]);
        await page.waitForTimeout(1500); // 讓用戶看到輸入過程
        console.log(`✅ 成功填寫問題 ${i + 1}`);
      } catch (error) {
        console.log(`⚠️ 回答問題 ${i + 1} 時發生錯誤: ${error.message}`);
      }
    }
    
    // 處理選擇題選項
    console.log('🔘 處理選擇題選項...');
    
    // 選擇學習方式：透過實作專案學習
    const projectLearningOption = page.locator('text=透過實作專案學習');
    if (await projectLearningOption.count() > 0) {
      await projectLearningOption.click();
      console.log('✅ 選擇了學習方式：透過實作專案學習');
      await page.waitForTimeout(1000);
    }
    
    // 選擇每週投入時間：5-10 小時
    const timeOption = page.locator('text=5-10 小時');
    if (await timeOption.count() > 0) {
      await timeOption.click();
      console.log('✅ 選擇了每週時間：5-10 小時');
      await page.waitForTimeout(1000);
    }
    
    // 選擇作業系統：macOS
    const osOption = page.locator('text=macOS');
    if (await osOption.count() > 0) {
      await osOption.click();
      console.log('✅ 選擇了作業系統：macOS');
      await page.waitForTimeout(1000);
    }
    
    monitor.endStep();

    // 截圖記錄回答完成狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-05-answers-filled.png',
      fullPage: true 
    });

    // 步驟 6: 提交個人化問題答案
    monitor.startStep('提交個人化問題答案');
    console.log('📤 提交個人化問題答案...');
    
    // 增強的提交按鈕選擇器，包括 Modal 內的按鈕
    const submitButtons = [
      'button:has-text("Generate Plan")',           // 從截圖看到的確切文字
      '[role="dialog"] button:has-text("Generate Plan")',
      'text=Generate Plan',
      '[role="dialog"] text=Generate Plan',
      'button:has-text("Generate")',
      'button[type="submit"]',
      'text=Submit',
      'text=Continue', 
      'text=提交',
      'text=繼續',
      'text=生成計劃'
    ];

    let submitSuccess = false;
    for (const buttonSelector of submitButtons) {
      const button = page.locator(buttonSelector);
      const count = await button.count();
      
      if (count > 0) {
        console.log(`🔍 找到提交按鈕: ${buttonSelector}`);
        try {
          // 確保按鈕可見並可點擊
          await button.first().scrollIntoViewIfNeeded();
          await button.first().click();
          console.log(`✅ 成功點擊提交按鈕`);
          submitSuccess = true;
          await page.waitForTimeout(3000);
          break;
        } catch (error) {
          console.log(`⚠️ 點擊按鈕失敗: ${error.message}`);
        }
      }
    }

    if (!submitSuccess) {
      console.log('⚠️ 未找到提交按鈕，嘗試其他方法...');
      
      // 嘗試按 Enter 鍵
      try {
        await page.keyboard.press('Enter');
        console.log('✅ 按下 Enter 鍵');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`⚠️ 按 Enter 鍵失敗: ${error.message}`);
      }
    }
    
    monitor.endStep();

    // 步驟 7: 等待子任務生成（重點監控）
    monitor.startStep('等待子任務生成');
    console.log('⏳ 等待子任務生成...');
    
    let subtasksFound = false;
    let subtaskCount = 0;
    let subtaskTitles: string[] = [];
    
    // 監控子任務生成時間（最多3分鐘）
    for (let i = 0; i < 60; i++) {
      console.log(`⏳ 檢查子任務生成 (${i + 1}/60) - 已等待 ${(i + 1) * 3} 秒`);
      
      // 檢查子任務元素
      const subtaskElements = await page.locator('[class*="subtask"], [data-testid*="subtask"]').count();
      const titleElements = await page.locator('[class*="subtask"] h3, [class*="subtask"] .title, .subtask-title').allTextContents();
      
      // 檢查真實的子任務內容（不只是標題文字）
      const realSubtaskTitles = titleElements.filter(title => 
        title && 
        title.length > 8 && 
        !title.toLowerCase().includes('subtask') && 
        !title.includes('子任務') &&
        (title.includes('學習') || title.includes('掌握') || title.includes('了解') || title.includes('練習') || title.includes('建立'))
      );

      if (realSubtaskTitles.length > 0) {
        subtasksFound = true;
        subtaskCount = realSubtaskTitles.length;
        subtaskTitles = realSubtaskTitles;
        
        console.log(`✅ 找到 ${subtaskCount} 個真實子任務:`);
        realSubtaskTitles.slice(0, 3).forEach((title, idx) => {
          console.log(`   ${idx + 1}. ${title.substring(0, 50)}...`);
        });
        break;
      }

      // 檢查載入狀態
      const loadingElements = await page.locator('[class*="loading"], .spinner, .loading-indicator').count();
      if (loadingElements > 0) {
        console.log(`   ⏳ 系統正在處理中...`);
      }

      // 檢查錯誤
      const errorElements = await page.locator('.error, [class*="error"], [role="alert"]').count();
      if (errorElements > 0) {
        const errorText = await page.locator('.error, [class*="error"], [role="alert"]').first().textContent();
        console.log(`❌ 發現錯誤訊息: ${errorText}`);
        break;
      }
      
      await page.waitForTimeout(3000);
    }
    
    monitor.endStep();

    // 截圖記錄最終狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-06-final-state.png',
      fullPage: true 
    });

    // 驗證結果
    if (subtasksFound) {
      console.log(`\n🎉 測試成功完成！`);
      console.log(`   生成了 ${subtaskCount} 個子任務`);
      console.log(`   子任務範例:`);
      subtaskTitles.slice(0, 5).forEach((title, idx) => {
        console.log(`     ${idx + 1}. ${title}`);
      });
      
      expect(subtaskCount).toBeGreaterThan(0);
    } else {
      console.log(`\n❌ 測試失敗：未能生成子任務`);
      throw new Error('子任務生成失敗或超時');
    }

    // 生成性能報告
    console.log('\n' + '='.repeat(50));
    monitor.generateReport();
  });

  test.afterEach(async ({ page }) => {
    // 保存最終的性能數據
    const metrics = monitor.getMetrics();
    const reportPath = '/Users/wetom/Desktop/FocusFlow/test-results/visual-flow-performance-report.json';
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testDuration: metrics.reduce((sum, m) => sum + m.duration, 0),
        steps: metrics,
        summary: {
          totalSteps: metrics.length,
          slowSteps: metrics.filter(m => m.duration > 30000).length,
          totalApiCalls: metrics.reduce((sum, m) => sum + m.apiCalls.length, 0),
          averageStepTime: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length : 0
        }
      }, null, 2));
      
      console.log(`📄 性能報告已保存: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️ 保存性能報告失敗: ${error.message}`);
    }
  });
});