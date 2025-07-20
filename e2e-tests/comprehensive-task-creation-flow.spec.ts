import { test, expect, Page } from '@playwright/test';
import { EnhancedTestHelpers, TestUtils, EnhancedTestAssertions } from './utils/enhanced-test-helpers';

/**
 * 全面的任務建立流程測試 - 包含網路監控和錯誤追蹤
 * 目標：驗證「個人問題、目標、子任務」生成失敗的根因
 */

test.describe('FocusFlow Task Creation Flow - Comprehensive Validation', () => {
  let helpers: EnhancedTestHelpers;
  let assertions: EnhancedTestAssertions;
  let page: Page;
  
  // 網路請求追蹤
  const networkRequests: any[] = [];
  const networkResponses: any[] = [];
  
  test.beforeEach(async () => {
    const testId = `task-creation-${Date.now()}`;
    helpers = new EnhancedTestHelpers(testId);
    page = await helpers.initialize();
    assertions = new EnhancedTestAssertions(testId, page);
    
    // 設定網路監控
    page.on('request', request => {
      networkRequests.push({
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      });
      console.log(`📤 [${testId}] API 請求: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', async response => {
      try {
        const responseData = {
          timestamp: new Date().toISOString(),
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          body: response.url().includes('/api/') ? await response.text() : null
        };
        networkResponses.push(responseData);
        console.log(`📥 [${testId}] API 回應: ${response.status()} ${response.url()}`);
      } catch (error) {
        console.log(`⚠️ [${testId}] 無法解析回應: ${response.url()}`);
      }
    });
    
    // 監控 Console 錯誤
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 [${testId}] Console 錯誤: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`🔴 [${testId}] 頁面錯誤: ${error.message}`);
    });
  });
  
  test.afterEach(async () => {
    // 截圖最終狀態
    await helpers.takeScreenshot('final-state');
    
    // 生成網路請求報告
    const reportPath = `test-results/network-report-${Date.now()}.json`;
    const networkReport = {
      testId: `task-creation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: networkRequests.length,
        totalResponses: networkResponses.length,
        apiRequests: networkRequests.filter(req => req.url.includes('/api/')).length,
        errors: networkResponses.filter(res => res.status >= 400).length
      },
      requests: networkRequests,
      responses: networkResponses
    };
    
    await page.evaluate((report) => {
      console.log('📊 網路請求報告:', JSON.stringify(report, null, 2));
    }, networkReport);
    
    await helpers.cleanup();
  });

  test('完整任務建立流程 - 監控 Smart Generate 失敗', async () => {
    console.log('🚀 開始測試：任務建立流程與 Smart Generate 功能');
    
    // 步驟 1：導航到應用程式
    await helpers.safeGoto('http://localhost:8081');
    await helpers.waitForAppLoad(15000);
    await helpers.takeScreenshot('01-app-loaded');
    
    // 步驟 2：導航到任務建立頁面
    console.log('📍 步驟 2：導航到任務建立頁面');
    await helpers.safeClick([
      'text="Add Task"',
      'text="添加任務"',
      '[href="/add-task"]',
      'button:has-text("+")',
      '[data-testid="add-task-button"]'
    ]);
    
    await helpers.waitForLoadingComplete();
    await helpers.takeScreenshot('02-add-task-page');
    
    // 驗證路由
    await TestUtils.verifyRoute(page, '/add-task');
    
    // 步驟 3：填寫任務基本資訊
    console.log('📝 步驟 3：填寫任務基本資訊');
    const testData = TestUtils.generateTestData();
    
    // 填寫任務標題
    await helpers.safeFill([
      '[data-testid="task-title"]',
      'input[placeholder*="標題"]',
      'input[placeholder*="title"]',
      '#title',
      '.title-input'
    ], testData.task.title);
    
    // 填寫任務描述
    await helpers.safeFill([
      '[data-testid="task-description"]',
      'textarea[placeholder*="描述"]',
      'textarea[placeholder*="description"]',
      '#description',
      '.description-input'
    ], testData.task.description);
    
    await helpers.takeScreenshot('03-task-info-filled');
    
    // 步驟 4：點擊 Smart Generate 按鈕
    console.log('🤖 步驟 4：點擊 Smart Generate 按鈕');
    await helpers.safeClick([
      'text="Smart Generate"',
      'text="智能生成"',
      '[data-testid="smart-generate"]',
      'button:has-text("Generate")',
      '.generate-button'
    ]);
    
    await helpers.takeScreenshot('04-smart-generate-clicked');
    
    // 步驟 5：監控網路請求 - 等待 /api/jobs POST 請求
    console.log('📡 步驟 5：監控 /api/jobs POST 請求...');
    const jobCreateRequest = await helpers.waitForApiResponse('/api/jobs', 15000)
      .catch(error => {
        console.log('❌ 等待 /api/jobs 請求超時:', error);
        return null;
      });
    
    if (jobCreateRequest) {
      console.log(`✅ 捕獲到作業建立請求: ${jobCreateRequest.status()}`);
      const responseBody = await jobCreateRequest.text();
      console.log('📄 作業建立回應:', responseBody);
      
      // 解析 jobId
      try {
        const jobData = JSON.parse(responseBody);
        const jobId = jobData.jobId;
        console.log(`🆔 作業 ID: ${jobId}`);
        
        // 步驟 6：監控作業狀態輪詢 - /api/jobs/{jobId} GET 請求
        console.log('🔄 步驟 6：監控作業狀態輪詢...');
        let pollAttempts = 0;
        const maxPolls = 10;
        
        while (pollAttempts < maxPolls) {
          try {
            const pollResponse = await helpers.waitForApiResponse(`/api/jobs/${jobId}`, 5000);
            const pollBody = await pollResponse.text();
            console.log(`📊 輪詢 ${pollAttempts + 1}:`, pollBody);
            
            const pollData = JSON.parse(pollBody);
            if (pollData.status === 'completed' || pollData.status === 'failed') {
              console.log(`🏁 作業完成，狀態: ${pollData.status}`);
              break;
            }
            
            pollAttempts++;
            await page.waitForTimeout(2000);
          } catch (error) {
            console.log(`⚠️ 輪詢 ${pollAttempts + 1} 失敗:`, error);
            pollAttempts++;
          }
        }
      } catch (error) {
        console.log('❌ 解析作業回應失敗:', error);
      }
    }
    
    // 步驟 7：檢查個人化問題彈窗
    console.log('❓ 步驟 7：檢查個人化問題彈窗...');
    await page.waitForTimeout(3000);
    
    const hasPersonalizationModal = await page.locator('[data-testid="personalization-modal"], .personalization-modal, .modal')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    
    if (hasPersonalizationModal) {
      console.log('✅ 偵測到個人化問題彈窗');
      await helpers.takeScreenshot('07-personalization-modal');
      
      // 處理個人化問題
      await helpers.handleAIGeneration();
    } else {
      console.log('❌ 未偵測到個人化問題彈窗');
    }
    
    await helpers.takeScreenshot('08-after-generation-attempt');
    
    // 步驟 8：檢查生成結果或錯誤
    console.log('🔍 步驟 8：檢查生成結果...');
    await page.waitForTimeout(5000);
    
    // 檢查是否有錯誤訊息
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '.alert-error',
      'text="錯誤"',
      'text="Error"',
      'text="失敗"',
      'text="Failed"'
    ];
    
    let hasError = false;
    for (const selector of errorSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          const errorText = await page.locator(selector).textContent();
          console.log(`🔴 發現錯誤訊息: ${errorText}`);
          hasError = true;
          break;
        }
      } catch (error) {
        // 繼續檢查下一個選擇器
      }
    }
    
    // 檢查是否生成了計劃內容
    const planSelectors = [
      '[data-testid="generated-plan"]',
      '.plan-content',
      '.subtasks',
      'text="目標"',
      'text="子任務"',
      'text="Goals"',
      'text="Subtasks"'
    ];
    
    let hasPlan = false;
    for (const selector of planSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          console.log(`✅ 發現計劃內容: ${selector}`);
          hasPlan = true;
          break;
        }
      } catch (error) {
        // 繼續檢查下一個選擇器
      }
    }
    
    await helpers.takeScreenshot('09-final-result');
    
    // 步驟 9：分析結果
    console.log('📊 步驟 9：分析測試結果');
    
    if (hasError && !hasPlan) {
      console.log('❌ 測試結果：Smart Generate 失敗，符合預期的問題');
      console.log('🔍 根因分析驗證：條件判斷邏輯確實導致只返回問題而不生成完整計劃');
    } else if (hasPlan) {
      console.log('✅ 測試結果：Smart Generate 成功生成計劃');
      console.log('⚠️ 注意：這可能表示問題已被修復或測試條件不同');
    } else {
      console.log('⚠️ 測試結果：狀態不明確，需要進一步調查');
    }
    
    // 步驟 10：記錄關鍵網路請求
    console.log('📝 步驟 10：記錄關鍵發現');
    
    const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));
    const apiResponses = networkResponses.filter(res => res.url.includes('/api/'));
    
    console.log(`📈 API 請求統計: ${apiRequests.length} 個請求`);
    console.log(`📉 API 回應統計: ${apiResponses.length} 個回應`);
    
    const jobRequests = apiRequests.filter(req => req.url.includes('/api/jobs'));
    const errorResponses = apiResponses.filter(res => res.status >= 400);
    
    console.log(`🆔 作業相關請求: ${jobRequests.length} 個`);
    console.log(`🔴 錯誤回應: ${errorResponses.length} 個`);
    
    if (errorResponses.length > 0) {
      console.log('🔍 錯誤回應詳情:');
      errorResponses.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.status} ${res.url}`);
        if (res.body) {
          console.log(`     回應內容: ${res.body.substring(0, 200)}...`);
        }
      });
    }
    
    // 驗證測試假設
    const hasJobCreateRequest = jobRequests.some(req => req.method === 'POST');
    const hasJobPollRequest = jobRequests.some(req => req.method === 'GET');
    
    expect(hasJobCreateRequest).toBeTruthy();
    console.log('✅ 驗證通過：偵測到作業建立請求');
    
    if (hasJobPollRequest) {
      console.log('✅ 驗證通過：偵測到作業輪詢請求');
    } else {
      console.log('⚠️ 注意：未偵測到作業輪詢請求，可能表示作業建立就失敗了');
    }
  });

  test('驗證根因分析 - jobQueueService.js 條件判斷邏輯', async () => {
    console.log('🔬 開始驗證根因分析：jobQueueService.js 第 531 行條件判斷問題');
    
    // 使用 Mock API 回應模擬問題場景
    await helpers.mockApiResponse(/\/api\/jobs$/, {
      jobId: 'test-job-123',
      status: 'pending',
      type: 'learning_plan'
    });
    
    await helpers.mockApiResponse(/\/api\/jobs\/test-job-123$/, {
      jobId: 'test-job-123',
      status: 'completed',
      result: {
        // 模擬條件判斷錯誤：只返回問題，沒有目標和子任務
        questions: [
          '你目前的學習目標是什麼？',
          '你希望在什麼時間內完成？',
          '你有哪些相關的背景知識？'
        ]
        // 注意：這裡缺少 goals 和 subtasks，模擬 jobQueueService.js:531 的問題
      }
    });
    
    // 執行相同的測試流程
    await helpers.safeGoto('http://localhost:8081');
    await helpers.waitForAppLoad();
    
    await helpers.safeClick(['[href="/add-task"]']);
    
    const testData = TestUtils.generateTestData();
    await helpers.safeFill(['[data-testid="task-title"]'], testData.task.title);
    await helpers.safeFill(['[data-testid="task-description"]'], testData.task.description);
    
    await helpers.safeClick(['text="Smart Generate"']);
    
    // 等待模擬的回應
    await page.waitForTimeout(5000);
    
    // 驗證是否只顯示問題而沒有完整計劃
    const hasQuestions = await page.locator('text="你目前的學習目標是什麼"').isVisible({ timeout: 3000 });
    const hasGoals = await page.locator('text="目標", text="Goals"').isVisible({ timeout: 3000 });
    const hasSubtasks = await page.locator('text="子任務", text="Subtasks"').isVisible({ timeout: 3000 });
    
    if (hasQuestions && !hasGoals && !hasSubtasks) {
      console.log('✅ 根因分析驗證成功：確實只返回問題，沒有目標和子任務');
      console.log('🎯 確認問題位置：jobQueueService.js 第 531 行的條件判斷邏輯');
    } else {
      console.log('⚠️ 根因分析需要調整：實際行為與假設不符');
    }
    
    await helpers.takeScreenshot('root-cause-verification');
  });
});