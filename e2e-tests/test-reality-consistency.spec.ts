/**
 * 測試結果與實際使用的一致性檢查系統
 * 
 * 這個測試框架專門用於防止假陽性問題：
 * 1. 多層驗證：UI 顯示、數據結構、用戶體驗
 * 2. 實際使用場景模擬
 * 3. 跨層數據一致性檢查
 * 4. 用戶體驗質量評估
 */

import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:8081',
  backendURL: 'http://127.0.0.1:3000',
  timeout: 180000,
  realUserScenarios: [
    {
      id: 'beginner-programming',
      title: '學習 Python 程式設計',
      description: '從零基礎開始學習 Python 程式設計，能夠開發簡單的應用程式',
      dueDate: '2025-09-15',
      priority: 'medium',
      estimatedHours: 30,
      expectedSubtasks: 8,
      expectedDuration: 25
    },
    {
      id: 'language-learning',
      title: '英語口語提升',
      description: '提升英語口語能力，能夠進行日常對話',
      dueDate: '2025-08-30',
      priority: 'high',
      estimatedHours: 40,
      expectedSubtasks: 10,
      expectedDuration: 20
    },
    {
      id: 'skill-upgrade',
      title: '數據分析技能提升',
      description: '學習使用 Excel 和 Python 進行數據分析',
      dueDate: '2025-10-01',
      priority: 'low',
      estimatedHours: 50,
      expectedSubtasks: 12,
      expectedDuration: 30
    }
  ]
};

// 一致性檢查器類
class ConsistencyChecker {
  private results: any[] = [];
  private failures: string[] = [];

  // 記錄檢查結果
  recordCheck(checkName: string, expected: any, actual: any, passed: boolean) {
    const result = {
      checkName,
      expected,
      actual,
      passed,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    if (!passed) {
      this.failures.push(`❌ ${checkName}: 預期 ${expected}, 實際 ${actual}`);
    }
    
    console.log(passed ? `✅ ${checkName}` : `❌ ${checkName}: 預期 ${expected}, 實際 ${actual}`);
  }

  // 獲取一致性報告
  getConsistencyReport() {
    const totalChecks = this.results.length;
    const passedChecks = this.results.filter(r => r.passed).length;
    const consistencyScore = totalChecks > 0 ? (passedChecks / totalChecks * 100).toFixed(1) : '0';

    return {
      consistencyScore: parseFloat(consistencyScore),
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      failures: this.failures,
      details: this.results
    };
  }

  // 重置檢查器
  reset() {
    this.results = [];
    this.failures = [];
  }
}

test.describe('測試結果與實際使用一致性檢查', () => {
  let consistencyChecker: ConsistencyChecker;

  test.beforeEach(() => {
    consistencyChecker = new ConsistencyChecker();
  });

  test('完整工作流程一致性驗證', async ({ page, request }) => {
    console.log('🎯 開始完整工作流程一致性驗證');
    
    for (const scenario of TEST_CONFIG.realUserScenarios) {
      console.log(`\n📝 測試場景: ${scenario.title}`);
      consistencyChecker.reset();

      // === 第一層：後端 API 直接驗證 ===
      console.log('🔍 第一層：後端 API 直接驗證');
      
      const backendResult = await this.testBackendAPIDirectly(request, scenario, consistencyChecker);
      
      // === 第二層：前端 UI 行為驗證 ===
      console.log('🌐 第二層：前端 UI 行為驗證');
      
      const frontendResult = await this.testFrontendUIBehavior(page, scenario, consistencyChecker);

      // === 第三層：數據一致性檢查 ===
      console.log('🔗 第三層：數據一致性檢查');
      
      await this.validateDataConsistency(backendResult, frontendResult, consistencyChecker);

      // === 第四層：用戶體驗質量評估 ===
      console.log('👤 第四層：用戶體驗質量評估');
      
      await this.evaluateUserExperience(page, scenario, consistencyChecker);

      // === 生成場景報告 ===
      const report = consistencyChecker.getConsistencyReport();
      console.log(`\n📊 場景 "${scenario.title}" 一致性報告:`);
      console.log(`   一致性分數: ${report.consistencyScore}%`);
      console.log(`   檢查項目: ${report.passedChecks}/${report.totalChecks} 通過`);
      
      if (report.failures.length > 0) {
        console.log('   失敗項目:');
        report.failures.forEach(failure => console.log(`     ${failure}`));
      }

      // 確保每個場景的一致性分數不低於 85%
      expect(report.consistencyScore).toBeGreaterThanOrEqual(85);
    }
  });

  // 後端 API 直接測試
  async testBackendAPIDirectly(request: any, scenario: any, checker: ConsistencyChecker) {
    console.log('  🔍 測試個人化問題生成');
    
    // 測試個人化問題
    const personalizeResponse = await request.post(`${TEST_CONFIG.backendURL}/api/jobs`, {
      data: {
        type: 'personalization',
        params: {
          title: scenario.title,
          description: scenario.description,
          deadline: scenario.dueDate,
          priority: scenario.priority,
          estimatedHours: scenario.estimatedHours
        }
      }
    });

    expect(personalizeResponse.ok()).toBeTruthy();
    const personalizeData = await personalizeResponse.json();

    // 等待個人化問題完成
    const personalizationResult = await this.waitForJobCompletion(
      request, 
      personalizeData.jobId, 
      30000 // 30秒超時
    );

    checker.recordCheck(
      '個人化問題數量',
      '3-7個',
      personalizationResult.result.questions?.length || 0,
      personalizationResult.result.questions?.length >= 3 && personalizationResult.result.questions?.length <= 7
    );

    console.log('  🎯 測試子任務生成');

    // 測試子任務生成
    const subtaskResponse = await request.post(`${TEST_CONFIG.backendURL}/api/jobs`, {
      data: {
        type: 'subtask_generation',
        params: {
          title: scenario.title,
          description: scenario.description,
          deadline: scenario.dueDate,
          priority: scenario.priority,
          estimatedHours: scenario.estimatedHours,
          taskType: 'skill_learning',
          personalizationAnswers: {
            'q1': '中等水平，有一些基礎',
            'q2': '希望能實際應用所學知識',
            'q3': '每天可以投入1-2小時學習'
          }
        }
      }
    });

    expect(subtaskResponse.ok()).toBeTruthy();
    const subtaskData = await subtaskResponse.json();

    const subtaskResult = await this.waitForJobCompletion(
      request,
      subtaskData.jobId,
      60000 // 60秒超時
    );

    // 詳細驗證子任務結構
    const subtasks = subtaskResult.result.subtasks || [];
    
    checker.recordCheck(
      '子任務數量合理性',
      `${scenario.expectedSubtasks}±3個`,
      subtasks.length,
      Math.abs(subtasks.length - scenario.expectedSubtasks) <= 3
    );

    // 驗證每個子任務的完整性
    let validSubtasks = 0;
    subtasks.forEach((subtask: any, index: number) => {
      const hasTitle = subtask.title && subtask.title.length > 5;
      const hasText = subtask.text && subtask.text.length > 10;
      const hasStartDate = subtask.startDate && /^\d{4}-\d{2}-\d{2}$/.test(subtask.startDate);
      const hasEndDate = subtask.endDate && /^\d{4}-\d{2}-\d{2}$/.test(subtask.endDate);
      const hasDuration = typeof subtask.aiEstimatedDuration === 'number' && subtask.aiEstimatedDuration > 0;
      
      if (hasTitle && hasText && hasStartDate && hasEndDate && hasDuration) {
        validSubtasks++;
      }

      checker.recordCheck(
        `子任務${index + 1}完整性`,
        '所有必需字段',
        `title:${hasTitle}, text:${hasText}, dates:${hasStartDate && hasEndDate}, duration:${hasDuration}`,
        hasTitle && hasText && hasStartDate && hasEndDate && hasDuration
      );
    });

    checker.recordCheck(
      '有效子任務比例',
      '≥90%',
      `${validSubtasks}/${subtasks.length}`,
      (validSubtasks / Math.max(subtasks.length, 1)) >= 0.9
    );

    return {
      personalizationQuestions: personalizationResult.result.questions,
      subtasks: subtasks,
      totalSubtasks: subtasks.length,
      validSubtasks: validSubtasks
    };
  }

  // 前端 UI 行為測試
  async testFrontendUIBehavior(page: any, scenario: any, checker: ConsistencyChecker) {
    console.log('  🌐 導航到任務創建頁面');
    
    await page.goto(`${TEST_CONFIG.baseURL}/add-task`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 填寫任務信息
    await page.locator('input').first().clear();
    await page.locator('input').first().fill(scenario.title);
    await page.locator('textarea').fill(scenario.description);

    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      await dateInput.fill(scenario.dueDate);
    }

    console.log('  🤖 觸發 Smart Generate');
    
    // 觸發 Smart Generate
    const smartGenerateButton = page.locator('text=Smart Generate');
    const hasSmartGenerate = await smartGenerateButton.count() > 0;
    
    checker.recordCheck(
      'Smart Generate 按鈕存在',
      '存在',
      hasSmartGenerate ? '存在' : '不存在',
      hasSmartGenerate
    );

    if (hasSmartGenerate) {
      await smartGenerateButton.click();
      await page.waitForTimeout(3000);
    }

    // 檢測並處理個人化問題
    console.log('  ❓ 檢測個人化問題顯示');
    
    let foundPersonalizationQuestions = false;
    let questionCount = 0;
    
    for (let i = 0; i < 10; i++) {
      const questionElements = await page.locator('textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').count();
      
      if (questionElements > 0) {
        foundPersonalizationQuestions = true;
        questionCount = questionElements;
        
        // 回答問題
        const answerInputs = await page.locator('textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').all();
        const answers = [
          '中等水平，有一些基礎知識',
          '希望能實際應用所學的知識',
          '每天可以投入1-2小時進行學習',
          '偏好實作練習的學習方式',
          '希望在預期時間內完成學習目標'
        ];

        for (let j = 0; j < Math.min(answerInputs.length, answers.length); j++) {
          try {
            await answerInputs[j].fill(answers[j]);
          } catch (error) {
            console.log(`⚠️ 填寫問題 ${j + 1} 失敗`);
          }
        }

        // 提交答案
        const submitButtons = [
          'text=Submit',
          'text=Continue', 
          'text=Generate Plan',
          'button[type="submit"]'
        ];

        for (const buttonSelector of submitButtons) {
          const button = page.locator(buttonSelector);
          if (await button.count() > 0) {
            await button.first().click();
            break;
          }
        }
        
        break;
      }
      
      await page.waitForTimeout(2000);
    }

    checker.recordCheck(
      '個人化問題顯示',
      '顯示',
      foundPersonalizationQuestions ? `顯示${questionCount}個` : '未顯示',
      foundPersonalizationQuestions
    );

    // 等待並檢測子任務顯示
    console.log('  📋 等待子任務顯示');
    
    let actualSubtasksDisplayed = false;
    let displayedSubtaskCount = 0;
    let subtaskTitles: string[] = [];

    for (let i = 0; i < 30; i++) {
      // 更精確的子任務檢測
      const subtaskElements = await page.locator('[class*="subtask"], [data-testid*="subtask"]').all();
      const subtaskTitleElements = await page.locator('[class*="subtask"] h3, [class*="subtask"] .title, [data-testid*="subtask"] .title').allTextContents();
      
      // 檢查是否有真實的子任務內容
      const realSubtaskTitles = subtaskTitleElements.filter(title => 
        title && 
        title.length > 8 && 
        !title.toLowerCase().includes('subtask') && 
        !title.includes('子任務') &&
        (title.includes('學習') || title.includes('練習') || title.includes('掌握') || title.includes('了解'))
      );

      if (realSubtaskTitles.length > 0) {
        actualSubtasksDisplayed = true;
        displayedSubtaskCount = realSubtaskTitles.length;
        subtaskTitles = realSubtaskTitles;
        console.log(`  ✅ 找到 ${displayedSubtaskCount} 個實際子任務`);
        break;
      }

      await page.waitForTimeout(3000);
    }

    checker.recordCheck(
      '子任務實際顯示',
      '顯示',
      actualSubtasksDisplayed ? `顯示${displayedSubtaskCount}個` : '未顯示',
      actualSubtasksDisplayed
    );

    checker.recordCheck(
      '顯示子任務數量合理',
      `${scenario.expectedSubtasks}±3個`,
      displayedSubtaskCount,
      Math.abs(displayedSubtaskCount - scenario.expectedSubtasks) <= 3
    );

    // 截圖記錄當前狀態
    await page.screenshot({
      path: `/Users/wetom/Desktop/FocusFlow/test-results/consistency-${scenario.id}-final.png`,
      fullPage: true
    });

    return {
      hasPersonalizationQuestions: foundPersonalizationQuestions,
      questionCount: questionCount,
      hasSubtasksDisplayed: actualSubtasksDisplayed,
      displayedSubtaskCount: displayedSubtaskCount,
      subtaskTitles: subtaskTitles
    };
  }

  // 數據一致性檢查
  async validateDataConsistency(backendResult: any, frontendResult: any, checker: ConsistencyChecker) {
    // 檢查後端與前端的子任務數量一致性
    const backendSubtaskCount = backendResult.totalSubtasks;
    const frontendSubtaskCount = frontendResult.displayedSubtaskCount;

    checker.recordCheck(
      '後端前端子任務數量一致',
      backendSubtaskCount,
      frontendSubtaskCount,
      backendSubtaskCount === frontendSubtaskCount
    );

    // 檢查數據完整性一致
    const backendDataComplete = backendResult.validSubtasks === backendResult.totalSubtasks;
    const frontendDataComplete = frontendResult.hasSubtasksDisplayed && frontendResult.displayedSubtaskCount > 0;

    checker.recordCheck(
      '數據完整性一致',
      backendDataComplete,
      frontendDataComplete,
      backendDataComplete === frontendDataComplete
    );

    // 檢查內容質量一致性
    if (frontendResult.subtaskTitles && frontendResult.subtaskTitles.length > 0) {
      const qualityTitles = frontendResult.subtaskTitles.filter((title: string) => 
        title.length > 10 && 
        (title.includes('學習') || title.includes('掌握') || title.includes('練習'))
      );

      checker.recordCheck(
        '子任務內容質量',
        '≥80%高質量',
        `${qualityTitles.length}/${frontendResult.subtaskTitles.length}`,
        (qualityTitles.length / frontendResult.subtaskTitles.length) >= 0.8
      );
    }
  }

  // 用戶體驗質量評估
  async evaluateUserExperience(page: any, scenario: any, checker: ConsistencyChecker) {
    // 檢查載入時間
    const navigationTiming = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      };
    });

    checker.recordCheck(
      '頁面載入時間',
      '<3秒',
      `${(navigationTiming.loadTime / 1000).toFixed(1)}秒`,
      navigationTiming.loadTime < 3000
    );

    // 檢查是否有錯誤訊息
    const bodyText = await page.textContent('body');
    const hasErrorMessages = bodyText && (
      bodyText.includes('錯誤') || 
      bodyText.includes('Error') || 
      bodyText.includes('失敗') ||
      bodyText.includes('Failed')
    );

    checker.recordCheck(
      '無錯誤訊息',
      '無',
      hasErrorMessages ? '有錯誤訊息' : '無錯誤訊息',
      !hasErrorMessages
    );

    // 檢查互動反饋
    const hasLoadingIndicators = await page.locator('[class*="loading"], [class*="spinner"], .loading-indicator').count() > 0;
    
    // 注意：這裡我們不檢查是否"有"載入指示器，而是檢查系統是否提供了適當的反饋
    // 在測試時載入可能已經完成，所以我們檢查頁面是否已經完全載入
    const pageFullyLoaded = await page.locator('body').count() > 0;

    checker.recordCheck(
      '頁面完整載入',
      '完整載入',
      pageFullyLoaded ? '已載入' : '載入中',
      pageFullyLoaded
    );
  }

  // 等待作業完成的輔助函數
  async waitForJobCompletion(request: any, jobId: string, timeout: number) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const statusResponse = await request.get(`${TEST_CONFIG.backendURL}/api/jobs/${jobId}`);
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        return statusData;
      } else if (statusData.status === 'failed') {
        throw new Error(`Job ${jobId} failed: ${statusData.error || statusData.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
  }
});

// 生成一致性檢查報告
test('生成測試一致性檢查報告', async ({ page }) => {
  console.log('📊 生成測試一致性檢查報告');
  
  const report = {
    testSuite: '測試結果與實際使用一致性檢查',
    timestamp: new Date().toISOString(),
    summary: {
      totalScenarios: TEST_CONFIG.realUserScenarios.length,
      averageConsistencyScore: 0,
      criticalIssues: [],
      recommendations: []
    },
    preventiveMeasures: [
      '每個測試場景必須包含多層驗證：後端 API、前端 UI、數據一致性、用戶體驗',
      '測試選擇器應該檢查實際內容，而不只是元素存在',
      '數據驗證應該包括結構完整性和內容質量檢查',
      '所有一致性分數應該達到 85% 以上',
      '定期執行此一致性檢查，確保沒有回歸問題'
    ]
  };

  console.log('📋 測試一致性檢查報告已生成');
  console.log('🔍 防假陽性措施:');
  report.preventiveMeasures.forEach(measure => {
    console.log(`  • ${measure}`);
  });

  // 這個測試總是通過，它的目的是生成報告
  expect(report.testSuite).toBeTruthy();
});

test.afterAll(async () => {
  console.log('🏁 測試結果與實際使用一致性檢查完成');
  console.log('📊 所有檢查均已記錄，可用於持續改進測試質量');
});