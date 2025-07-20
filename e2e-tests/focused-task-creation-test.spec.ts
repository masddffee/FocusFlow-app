import { test, expect, Page } from '@playwright/test';
import { EnhancedTestHelpers, TestUtils } from './utils/enhanced-test-helpers';

/**
 * 焦點任務建立測試 - 專注於驗證 Smart Generate 功能和網路請求
 */

test.describe('FocusFlow Smart Generate - Network Monitoring', () => {
  let helpers: EnhancedTestHelpers;
  let page: Page;
  
  // 網路請求追蹤
  const networkRequests: any[] = [];
  const networkResponses: any[] = [];
  
  test.beforeEach(async () => {
    const testId = `smart-generate-${Date.now()}`;
    helpers = new EnhancedTestHelpers(testId);
    page = await helpers.initialize();
    
    // 設定網路監控
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          timestamp: new Date().toISOString(),
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData()
        });
        console.log(`📤 API 請求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const responseData = {
            timestamp: new Date().toISOString(),
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: await response.text()
          };
          networkResponses.push(responseData);
          console.log(`📥 API 回應: ${response.status()} ${response.url()}`);
          if (responseData.body) {
            console.log(`   回應內容: ${responseData.body.substring(0, 200)}...`);
          }
        } catch (error) {
          console.log(`⚠️ 無法解析回應: ${response.url()}`);
        }
      }
    });
    
    // 監控錯誤
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console 錯誤: ${msg.text()}`);
      }
    });
  });
  
  test.afterEach(async () => {
    // 生成網路請求報告
    console.log('\n📊 測試完成 - 網路請求統計:');
    console.log(`總 API 請求: ${networkRequests.length}`);
    console.log(`總 API 回應: ${networkResponses.length}`);
    
    const jobRequests = networkRequests.filter(req => req.url.includes('/api/jobs'));
    console.log(`作業相關請求: ${jobRequests.length}`);
    
    if (jobRequests.length > 0) {
      console.log('\n🔍 作業請求詳情:');
      jobRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`     請求資料: ${req.postData.substring(0, 100)}...`);
        }
      });
    }
    
    const jobResponses = networkResponses.filter(res => res.url.includes('/api/jobs'));
    if (jobResponses.length > 0) {
      console.log('\n📋 作業回應詳情:');
      jobResponses.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.status} ${res.url}`);
        if (res.body) {
          console.log(`     回應內容: ${res.body.substring(0, 200)}...`);
        }
      });
    }
    
    await helpers.cleanup();
  });

  test('智能生成功能 - 完整流程監控', async () => {
    console.log('🚀 開始測試：Smart Generate 功能完整流程');
    
    // 步驟 1：載入應用程式
    await helpers.safeGoto('http://localhost:8081');
    await helpers.waitForAppLoad(15000);
    await helpers.takeScreenshot('01-app-loaded');
    
    // 步驟 2：點擊右上角的 + 按鈕
    console.log('➕ 步驟 2：點擊新增任務按鈕');
    
    // 根據實際 UI 使用正確的選擇器
    const addButtonSelectors = [
      'button:has(text("+"))',
      '[role="button"]:has(text("+"))',
      'button:visible:has-text("+")',
      'div:has(text("+"))',
      'text="+"',
      '.fixed button', // 浮動按鈕
      '[data-testid="add-task"]'
    ];
    
    let navigationSuccess = false;
    for (const selector of addButtonSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`✅ 找到新增按鈕: ${selector}`);
          await element.click();
          navigationSuccess = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ 按鈕選擇器失敗: ${selector}`);
        continue;
      }
    }
    
    if (!navigationSuccess) {
      // 嘗試點擊底部導航的 Tasks 標籤
      console.log('🔄 嘗試透過底部導航進入任務頁面');
      try {
        await helpers.safeClick(['text="Tasks"', '[role="tabpanel"]']);
        await page.waitForTimeout(2000);
        
        // 再次嘗試找新增按鈕
        await helpers.safeClick(addButtonSelectors);
        navigationSuccess = true;
      } catch (error) {
        console.log('❌ 無法通過底部導航進入');
      }
    }
    
    if (!navigationSuccess) {
      // 直接導航到 add-task 頁面
      console.log('🔄 直接導航到 /add-task');
      await page.goto('http://localhost:8081/add-task');
      await page.waitForTimeout(3000);
    }
    
    await helpers.takeScreenshot('02-add-task-page');
    
    // 步驟 3：填寫任務資訊
    console.log('📝 步驟 3：填寫任務資訊');
    const testData = TestUtils.generateTestData();
    
    // 更靈活的表單填寫
    const titleSelectors = [
      'input[placeholder*="title" i]',
      'input[placeholder*="標題" i]',
      'input[placeholder*="Title" i]',
      'input[type="text"]:visible',
      'input:visible:first'
    ];
    
    const descriptionSelectors = [
      'textarea[placeholder*="description" i]',
      'textarea[placeholder*="描述" i]',
      'textarea[placeholder*="Description" i]',
      'textarea:visible',
      'input[placeholder*="detail" i]'
    ];
    
    try {
      await helpers.safeFill(titleSelectors, testData.task.title);
      console.log(`✅ 成功填寫標題: ${testData.task.title}`);
    } catch (error) {
      console.log('⚠️ 填寫標題失敗:', error);
    }
    
    try {
      await helpers.safeFill(descriptionSelectors, testData.task.description);
      console.log(`✅ 成功填寫描述: ${testData.task.description}`);
    } catch (error) {
      console.log('⚠️ 填寫描述失敗:', error);
    }
    
    await helpers.takeScreenshot('03-form-filled');
    
    // 步驟 4：尋找並點擊 Smart Generate 按鈕
    console.log('🤖 步驟 4：尋找 Smart Generate 按鈕');
    
    const generateSelectors = [
      'button:has-text("Smart Generate")',
      'button:has-text("智能生成")',
      'button:has-text("Generate")',
      'button:has-text("生成")',
      'text="Smart Generate"',
      'text="智能生成"',
      '[data-testid="smart-generate"]',
      'button:visible:has-text("Smart")',
      'button[class*="generate"]'
    ];
    
    let generateFound = false;
    for (const selector of generateSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`✅ 找到生成按鈕: ${selector}`);
          await element.click();
          generateFound = true;
          await helpers.takeScreenshot('04-generate-clicked');
          break;
        }
      } catch (error) {
        console.log(`⚠️ 生成按鈕選擇器失敗: ${selector}`);
        continue;
      }
    }
    
    if (!generateFound) {
      console.log('❌ 無法找到 Smart Generate 按鈕');
      await helpers.takeScreenshot('04-no-generate-button');
      
      // 記錄當前頁面的所有按鈕
      const allButtons = await page.locator('button').all();
      console.log(`🔍 頁面上共有 ${allButtons.length} 個按鈕:`);
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const buttonText = await allButtons[i].textContent();
          console.log(`  按鈕 ${i + 1}: "${buttonText}"`);
        } catch (error) {
          console.log(`  按鈕 ${i + 1}: 無法讀取文字`);
        }
      }
      
      // 嘗試點擊任何包含 "generate" 或 "生成" 的按鈕
      try {
        await page.locator('button').filter({ hasText: /generate|生成|smart/i }).first().click();
        console.log('✅ 嘗試點擊包含相關關鍵字的按鈕');
        generateFound = true;
      } catch (error) {
        console.log('❌ 仍無法找到相關按鈕');
      }
    }
    
    if (generateFound) {
      // 步驟 5：監控 API 請求
      console.log('📡 步驟 5：監控 API 請求...');
      
      // 等待初始請求
      await page.waitForTimeout(5000);
      
      // 檢查是否有作業建立請求
      const hasJobRequest = networkRequests.some(req => 
        req.url.includes('/api/jobs') && req.method === 'POST'
      );
      
      if (hasJobRequest) {
        console.log('✅ 偵測到作業建立請求');
        
        // 等待更長時間以捕獲輪詢請求
        await page.waitForTimeout(15000);
        
        // 分析所有作業相關請求
        const jobRequests = networkRequests.filter(req => req.url.includes('/api/jobs'));
        console.log(`📊 作業請求總數: ${jobRequests.length}`);
        
        const postRequests = jobRequests.filter(req => req.method === 'POST');
        const getRequests = jobRequests.filter(req => req.method === 'GET');
        
        console.log(`📤 POST 請求 (建立作業): ${postRequests.length}`);
        console.log(`📥 GET 請求 (輪詢狀態): ${getRequests.length}`);
        
        // 分析回應
        const jobResponses = networkResponses.filter(res => res.url.includes('/api/jobs'));
        const errorResponses = jobResponses.filter(res => res.status >= 400);
        
        console.log(`📋 作業回應總數: ${jobResponses.length}`);
        console.log(`🔴 錯誤回應: ${errorResponses.length}`);
        
        if (errorResponses.length > 0) {
          console.log('🔍 錯誤回應詳情:');
          errorResponses.forEach(res => {
            console.log(`  ${res.status} ${res.url}: ${res.body}`);
          });
        }
      } else {
        console.log('❌ 未偵測到作業建立請求');
      }
      
      // 步驟 6：檢查 UI 回應
      console.log('🖥️ 步驟 6：檢查 UI 回應');
      
      // 檢查載入狀態
      const loadingIndicators = [
        'text="Loading"',
        'text="載入中"',
        '[data-testid="loading"]',
        '.loading',
        '.spinner'
      ];
      
      for (const indicator of loadingIndicators) {
        try {
          if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
            console.log(`⏳ 偵測到載入指示器: ${indicator}`);
            await page.waitForSelector(indicator, { state: 'hidden', timeout: 10000 });
            console.log('✅ 載入完成');
            break;
          }
        } catch (error) {
          // 繼續檢查下一個指示器
        }
      }
      
      await helpers.takeScreenshot('05-after-generate');
      
      // 檢查結果
      const errorMessages = await page.locator('text=/error|錯誤|failed|失敗/i').all();
      const successMessages = await page.locator('text=/success|成功|complete|完成/i').all();
      const planContent = await page.locator('text=/goal|目標|subtask|子任務/i').all();
      
      console.log(`🔴 錯誤訊息: ${errorMessages.length}`);
      console.log(`✅ 成功訊息: ${successMessages.length}`);
      console.log(`📋 計劃內容: ${planContent.length}`);
      
      if (errorMessages.length > 0) {
        console.log('🔍 錯誤訊息內容:');
        for (const msg of errorMessages) {
          try {
            const text = await msg.textContent();
            console.log(`  - ${text}`);
          } catch (error) {
            console.log('  - 無法讀取錯誤訊息');
          }
        }
      }
      
      if (planContent.length > 0) {
        console.log('📋 計劃內容片段:');
        for (let i = 0; i < Math.min(planContent.length, 3); i++) {
          try {
            const text = await planContent[i].textContent();
            console.log(`  - ${text}`);
          } catch (error) {
            console.log('  - 無法讀取計劃內容');
          }
        }
      }
    }
    
    await helpers.takeScreenshot('06-final-state');
    
    // 最終分析
    console.log('\n🎯 測試結果分析:');
    const totalApiRequests = networkRequests.length;
    const jobApiRequests = networkRequests.filter(req => req.url.includes('/api/jobs')).length;
    const errorApiResponses = networkResponses.filter(res => res.status >= 400).length;
    
    console.log(`📊 總 API 請求數: ${totalApiRequests}`);
    console.log(`🆔 作業相關請求: ${jobApiRequests}`);
    console.log(`🔴 錯誤回應數: ${errorApiResponses}`);
    
    if (jobApiRequests > 0) {
      console.log('✅ Smart Generate 功能已觸發 API 請求');
      if (errorApiResponses > 0) {
        console.log('⚠️ 發現 API 錯誤，符合預期的問題情況');
      } else {
        console.log('✅ API 請求正常，可能問題已修復');
      }
    } else {
      console.log('❌ Smart Generate 功能未觸發 API 請求');
    }
  });
});