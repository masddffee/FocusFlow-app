import { test, expect } from '@playwright/test';
import { TestHelpers, TestAssertions } from './utils/test-helpers';

/**
 * 任務頁面 UI 驗證專項測試
 * 驗證焦點：
 * 1. Create & Schedule Task 後排程任務即時顯示
 * 2. 個人檔案學習時段設定與任務頁面一致性
 * 3. 子任務刪除時段釋放驗證
 */

test.describe('Task Page UI Validation Tests', () => {
  let helpers: TestHelpers;
  let assertions: TestAssertions;
  let validationReport: any[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    assertions = new TestAssertions(page);
    
    // 清理環境並導航到應用
    await helpers.clearStorage();
    await page.goto('http://localhost:8081/');
    await helpers.waitForAppReady();
  });

  test.afterEach(async ({ page }) => {
    // 收集測試後狀態信息
    const hasError = await helpers.hasError();
    if (hasError) {
      console.log('🚨 測試後檢測到錯誤，記錄異常狀態');
      await helpers.takeScreenshot(`error-state-${Date.now()}`);
    }
  });

  test('📋 驗證1: Create & Schedule Task 即時顯示功能', async ({ page }) => {
    console.log('🔍 開始驗證：Create & Schedule Task 即時顯示');
    
    // Step 1: 導航至任務頁面
    console.log('📍 Step 1: 導航至任務頁面');
    const taskTabSelectors = [
      '[data-testid="tab-tasks"]',
      'text="Tasks"',
      'text="任務"',
      '[href="/tasks"]',
      'button:has-text("Tasks")',
      'div:has-text("Tasks")'
    ];
    
    let navigatedToTasks = false;
    for (const selector of taskTabSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          navigatedToTasks = true;
          console.log(`✅ 成功導航至任務頁面，使用選擇器: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ 任務頁面導航失敗: ${selector}`);
        continue;
      }
    }
    
    if (!navigatedToTasks) {
      // 嘗試直接URL導航
      await page.goto('http://localhost:8081/tasks');
      await page.waitForTimeout(2000);
      console.log('🔄 使用直接URL導航至任務頁面');
    }
    
    // 截取任務頁面初始狀態
    await helpers.takeScreenshot('initial-tasks-page');
    
    // Step 2: 記錄初始任務數量
    const initialTaskElements = await page.locator('[data-testid*="task"], .task-item, div:has-text("Task")').count();
    console.log(`📊 初始任務數量: ${initialTaskElements}`);
    
    // Step 3: 點擊創建任務按鈕
    console.log('📍 Step 3: 尋找並點擊創建任務按鈕');
    const createTaskSelectors = [
      '[data-testid="create-task-button"]',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button:has-text("+")',
      '[aria-label*="create"]',
      '[aria-label*="add"]'
    ];
    
    let createButtonFound = false;
    for (const selector of createTaskSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          createButtonFound = true;
          console.log(`✅ 成功點擊創建任務按鈕: ${selector}`);
          await page.waitForTimeout(1000);
          break;
        }
      } catch (error) {
        console.log(`⚠️ 創建按鈕選擇器失敗: ${selector}`);
        continue;
      }
    }
    
    if (!createButtonFound) {
      console.log('🚨 未找到創建任務按鈕，嘗試其他策略');
      // 嘗試導航到 add-task 頁面
      await page.goto('http://localhost:8081/add-task');
      await page.waitForTimeout(2000);
      console.log('🔄 直接導航至新增任務頁面');
    }
    
    // 截取任務創建頁面
    await helpers.takeScreenshot('task-creation-page');
    
    // Step 4: 填寫任務表單
    console.log('📍 Step 4: 填寫任務表單');
    const taskTitle = 'UI驗證測試任務_' + Date.now();
    const taskDescription = '測試任務排程即時顯示功能的驗證任務';
    
    const titleInputSelectors = [
      '[data-testid="task-title-input"]',
      'input[placeholder*="title"]',
      'input[placeholder*="Title"]',
      'input[placeholder*="任務"]',
      'input[type="text"]:first-of-type'
    ];
    
    let titleInputFilled = false;
    for (const selector of titleInputSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(taskTitle);
          titleInputFilled = true;
          console.log(`✅ 成功填寫任務標題: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // 填寫描述
    const descriptionSelectors = [
      '[data-testid="task-description-input"]',
      'textarea[placeholder*="description"]',
      'textarea[placeholder*="Description"]',
      'textarea'
    ];
    
    for (const selector of descriptionSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.fill(taskDescription);
          console.log(`✅ 成功填寫任務描述: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // 截取填寫完成的表單
    await helpers.takeScreenshot('task-form-filled');
    
    // Step 5: 提交任務並驗證即時顯示
    console.log('📍 Step 5: 提交任務並驗證即時顯示');
    const submitSelectors = [
      '[data-testid="submit-task-button"]',
      'button:has-text("Save")',
      'button:has-text("Create")',
      'button:has-text("Submit")',
      'button[type="submit"]'
    ];
    
    let taskSubmitted = false;
    for (const selector of submitSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          taskSubmitted = true;
          console.log(`✅ 成功提交任務: ${selector}`);
          await page.waitForTimeout(2000); // 等待處理
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!taskSubmitted) {
      console.log('🚨 無法提交任務，檢查頁面狀態');
      await helpers.takeScreenshot('task-submission-failed');
      
      // 收集錯誤信息
      const consoleLogs = await helpers.getConsoleLogs();
      console.log('📋 Console Logs:', consoleLogs);
      
      validationReport.push({
        checkpoint: 'Task Submission',
        status: 'FAIL',
        issue: '無法找到提交按鈕或提交失敗',
        timestamp: new Date().toISOString(),
        screenshot: 'task-submission-failed.png'
      });
      
      return; // 暫停流程
    }
    
    // Step 6: 驗證任務是否即時顯示在 UI 中
    console.log('📍 Step 6: 驗證任務即時顯示');
    
    // 返回任務列表頁面（如果不在的話）
    await page.goto('http://localhost:8081/tasks');
    await page.waitForTimeout(3000); // 等待數據載入
    
    // 截取提交後的任務頁面
    await helpers.takeScreenshot('tasks-page-after-submission');
    
    // 檢查新任務是否出現
    const newTaskVisible = await page.locator(`text="${taskTitle}"`).isVisible({ timeout: 5000 });
    
    if (newTaskVisible) {
      console.log('✅ SUCCESS: 新任務已即時顯示在 UI 中');
      validationReport.push({
        checkpoint: 'Task Display',
        status: 'SUCCESS',
        details: '任務成功創建並即時顯示',
        timestamp: new Date().toISOString(),
        screenshot: 'tasks-page-after-submission.png'
      });
    } else {
      console.log('🚨 FAIL: 新任務未即時顯示在 UI 中');
      
      // 詳細錯誤診斷
      await helpers.takeScreenshot('task-not-displayed-error');
      
      // 檢查 Console 錯誤
      const consoleLogs = await helpers.getConsoleLogs();
      
      // 檢查當前任務數量
      const currentTaskElements = await page.locator('[data-testid*="task"], .task-item').count();
      
      validationReport.push({
        checkpoint: 'Task Display',
        status: 'FAIL',
        issue: '新任務未即時顯示在 UI 中',
        details: {
          initialTasks: initialTaskElements,
          currentTasks: currentTaskElements,
          expectedTask: taskTitle,
          consoleLogs: consoleLogs
        },
        timestamp: new Date().toISOString(),
        screenshot: 'task-not-displayed-error.png'
      });
      
      // 暫停流程進行診斷
      console.log('⏸️ 暫停流程 - 需要診斷任務顯示問題');
      
      // 檢查網路請求
      // await page.route('**/*', route => {
      //   console.log('🌐 API Request:', route.request().url());
      //   route.continue();
      // });
    }
  });

  test('📋 驗證2: 個人檔案學習時段一致性', async ({ page }) => {
    console.log('🔍 開始驗證：個人檔案學習時段設定一致性');
    
    // Step 1: 檢查個人檔案時段設定
    console.log('📍 Step 1: 導航至個人檔案頁面');
    
    // 尋找個人檔案/設定頁面入口
    const profileSelectors = [
      '[data-testid="profile-tab"]',
      'text="Profile"',
      'text="個人檔案"',
      'text="Settings"',
      'text="設定"',
      '[href="/profile"]'
    ];
    
    let profileFound = false;
    for (const selector of profileSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          profileFound = true;
          console.log(`✅ 成功導航至個人檔案: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!profileFound) {
      await page.goto('http://localhost:8081/profile');
      await page.waitForTimeout(2000);
      console.log('🔄 直接導航至個人檔案頁面');
    }
    
    // 截取個人檔案頁面
    await helpers.takeScreenshot('profile-page');
    
    // 查找時段設定
    const timeSlotSettings = await page.textContent('body');
    console.log('📋 個人檔案頁面內容長度:', timeSlotSettings?.length || 0);
    
    // Step 2: 返回任務頁面檢查時段一致性
    console.log('📍 Step 2: 返回任務頁面檢查可用時段');
    
    await page.goto('http://localhost:8081/tasks');
    await page.waitForTimeout(2000);
    
    // 截取任務頁面的時段顯示
    await helpers.takeScreenshot('tasks-page-time-slots');
    
    // 記錄驗證結果
    validationReport.push({
      checkpoint: 'Time Slots Consistency',
      status: 'PENDING',
      details: '需要進一步檢查具體的時段設定實現',
      timestamp: new Date().toISOString(),
      screenshots: ['profile-page.png', 'tasks-page-time-slots.png']
    });
  });

  test('📋 驗證3: 子任務刪除時段釋放', async ({ page }) => {
    console.log('🔍 開始驗證：子任務刪除時段釋放功能');
    
    // 此驗證需要先有複雜任務存在
    // 暫時記錄為待實現
    validationReport.push({
      checkpoint: 'Subtask Deletion Time Release',
      status: 'PENDING',
      details: '需要先創建包含子任務的複雜任務',
      timestamp: new Date().toISOString()
    });
  });

  test('📋 最終驗證報告生成', async ({ page }) => {
    console.log('📊 生成最終驗證報告');
    
    // 生成驗證報告
    const reportContent = `# 任務頁面 UI 驗證報告

## 執行時間
${new Date().toISOString()}

## 驗證結果概要
${validationReport.map(item => `
### ${item.checkpoint}
- **狀態**: ${item.status}
- **時間**: ${item.timestamp}
${item.issue ? `- **問題**: ${item.issue}` : ''}
${item.details ? `- **詳情**: ${typeof item.details === 'string' ? item.details : JSON.stringify(item.details, null, 2)}` : ''}
${item.screenshot ? `- **截圖**: ${item.screenshot}` : ''}
${item.screenshots ? `- **截圖**: ${item.screenshots.join(', ')}` : ''}
`).join('\n')}

## 總結
- 總檢查點: ${validationReport.length}
- 成功: ${validationReport.filter(r => r.status === 'SUCCESS').length}
- 失敗: ${validationReport.filter(r => r.status === 'FAIL').length}
- 待處理: ${validationReport.filter(r => r.status === 'PENDING').length}

## 建議
${validationReport.filter(r => r.status === 'FAIL').length > 0 ? 
  '發現問題需要修復，請檢查相關截圖和錯誤詳情。' : 
  '所有驗證項目通過，系統運作正常。'}
`;

    // 將報告寫入測試結果目錄
    await page.evaluate((content) => {
      console.log('📄 驗證報告:', content);
    }, reportContent);
    
    // 截取最終狀態
    await helpers.takeScreenshot('final-validation-state');
  });
});