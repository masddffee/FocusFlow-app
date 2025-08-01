import { test, expect, Page } from '@playwright/test';
import { log } from '../lib/logger';

/**
 * 子任務逾期處理自動化測試
 * 遵循 CLAUDE.md 規範：統一日誌系統、錯誤處理、完整測試覆蓋
 */

test.describe('子任務逾期處理功能測試', () => {
  let page: Page;
  let testTaskId: string;
  let testSubtaskId: string;

  test.beforeAll(async ({ browser }) => {
    // 創建新的頁面實例
    const context = await browser.newContext();
    page = await context.newPage();
    
    // 設置測試環境
    await setupTestEnvironment();
  });

  test.afterAll(async () => {
    // 清理測試數據
    await cleanupTestData();
    await page.close();
  });

  test.beforeEach(async () => {
    // 創建測試用的逾期子任務
    await createOverdueSubtask();
  });

  /**
   * 測試 1: 子任務逾期檢測與決策框顯示
   */
  test('應該正確檢測子任務逾期並顯示決策框', async () => {
    log.info('開始測試：子任務逾期檢測');

    // 導航到任務列表頁面
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // 截圖：初始狀態
    await page.screenshot({ 
      path: 'test-results/screenshots/overdue-detection-initial.png',
      fullPage: true 
    });

    // 查找逾期的子任務項目
    const overdueSubtask = page.locator('[data-testid="schedule-item"]')
      .filter({ hasText: '逾期' });
    
    await expect(overdueSubtask).toBeVisible();
    log.info('✅ 逾期子任務已顯示');

    // 檢查逾期標示
    const overdueIcon = overdueSubtask.locator('[data-testid="overdue-icon"]');
    await expect(overdueIcon).toBeVisible();
    log.info('✅ 逾期圖標已顯示');

    // 點擊更多選項按鈕
    const moreButton = overdueSubtask.locator('[data-testid="more-button"]');
    await moreButton.click();

    // 截圖：決策框顯示
    await page.screenshot({ 
      path: 'test-results/screenshots/overdue-decision-box.png',
      fullPage: true 
    });

    // 驗證決策框包含正確的選項
    const decisionBox = page.locator('[data-testid="decision-box"]');
    await expect(decisionBox).toBeVisible();

    // 檢查三個選項是否存在
    await expect(decisionBox.locator('text=延長此子任務')).toBeVisible();
    await expect(decisionBox.locator('text=AI 重新排程')).toBeVisible();
    await expect(decisionBox.locator('text=移除此子任務')).toBeVisible();

    // 確保不包含錯誤的「延長任務截止日期」選項
    await expect(decisionBox.locator('text=延長任務截止日期')).not.toBeVisible();
    
    log.info('✅ 決策框選項驗證完成');
  });

  /**
   * 測試 2: 子任務延長功能（日曆選擇器）
   */
  test('應該能夠延長子任務並驗證日期選擇限制', async () => {
    log.info('開始測試：子任務延長功能');

    await navigateToOverdueSubtask();

    // 點擊「延長此子任務」選項
    const extendButton = page.locator('[data-testid="extend-subtask-button"]');
    await extendButton.click();

    // 等待子任務延長器顯示
    const extender = page.locator('[data-testid="subtask-date-time-extender"]');
    await expect(extender).toBeVisible();

    // 截圖：延長器界面
    await page.screenshot({ 
      path: 'test-results/screenshots/subtask-extender-opened.png',
      fullPage: true 
    });

    // 測試選擇過去日期（應該被阻止）
    const pastDate = getPastDate();
    await selectDate(pastDate);

    // 驗證錯誤提示
    const errorAlert = page.locator('[data-testid="invalid-date-alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    log.info('✅ 過去日期選擇被正確阻止');

    // 截圖：錯誤提示
    await page.screenshot({ 
      path: 'test-results/screenshots/past-date-error.png',
      fullPage: true 
    });

    // 點擊確定關閉錯誤提示
    await page.locator('text=確定').click();

    // 選擇有效的未來日期
    const futureDate = getFutureDate(2); // 後天
    await selectDate(futureDate);

    // 等待可用時間段加載
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });

    // 截圖：時間段選擇
    await page.screenshot({ 
      path: 'test-results/screenshots/time-slots-available.png',
      fullPage: true 
    });

    // 選擇第一個可用時間段
    const firstTimeSlot = page.locator('[data-testid="time-slot"]').first();
    await firstTimeSlot.click();

    // 點擊確認延長
    const confirmButton = page.locator('[data-testid="confirm-extension"]');
    await confirmButton.click();

    // 等待成功訊息
    const successAlert = page.locator('[data-testid="extension-success"]');
    await expect(successAlert).toBeVisible({ timeout: 10000 });

    // 截圖：延長成功
    await page.screenshot({ 
      path: 'test-results/screenshots/extension-success.png',
      fullPage: true 
    });

    log.info('✅ 子任務延長功能測試完成');
  });

  /**
   * 測試 3: AI 重新排程功能
   */
  test('應該能夠觸發 AI 重新排程並處理成功/失敗情況', async () => {
    log.info('開始測試：AI 重新排程功能');

    await navigateToOverdueSubtask();

    // 點擊「AI 重新排程」選項
    const rescheduleButton = page.locator('[data-testid="reschedule-button"]');
    await rescheduleButton.click();

    // 等待重新排程處理
    const loadingIndicator = page.locator('[data-testid="reschedule-loading"]');
    await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

    // 截圖：處理中狀態
    await page.screenshot({ 
      path: 'test-results/screenshots/ai-reschedule-processing.png',
      fullPage: true 
    });

    // 等待處理結果（最多30秒）
    await page.waitForSelector('[data-testid="reschedule-result"]', { 
      timeout: 30000 
    });

    const resultDialog = page.locator('[data-testid="reschedule-result"]');
    
    // 檢查是成功還是失敗
    const successMessage = resultDialog.locator('text=重新排程成功');
    const failureMessage = resultDialog.locator('text=無法重新排程');

    if (await successMessage.isVisible()) {
      log.info('✅ AI 重新排程成功');
      
      // 截圖：成功結果
      await page.screenshot({ 
        path: 'test-results/screenshots/ai-reschedule-success.png',
        fullPage: true 
      });

      // 檢查是否有優化建議
      const suggestions = resultDialog.locator('[data-testid="suggestions"]');
      await expect(suggestions).toBeVisible();

    } else if (await failureMessage.isVisible()) {
      log.info('⚠️ AI 重新排程失敗，檢查延長截止日期選項');
      
      // 截圖：失敗結果
      await page.screenshot({ 
        path: 'test-results/screenshots/ai-reschedule-failure.png',
        fullPage: true 
      });

      // 驗證是否提供「延長截止日期」選項
      const extendDeadlineButton = resultDialog.locator('text=延長截止日期');
      await expect(extendDeadlineButton).toBeVisible();
      log.info('✅ 失敗時正確提供延長截止日期選項');

      // 測試延長截止日期功能
      await extendDeadlineButton.click();
      
      const deadlineExtender = page.locator('[data-testid="deadline-extender"]');
      await expect(deadlineExtender).toBeVisible();

      // 截圖：截止日期延長器
      await page.screenshot({ 
        path: 'test-results/screenshots/deadline-extender.png',
        fullPage: true 
      });

    } else {
      throw new Error('未識別的重新排程結果');
    }

    log.info('✅ AI 重新排程功能測試完成');
  });

  /**
   * 測試 4: 子任務刪除功能
   */
  test('應該能夠刪除子任務並提供確認對話框', async () => {
    log.info('開始測試：子任務刪除功能');

    await navigateToOverdueSubtask();

    // 點擊「移除此子任務」選項
    const removeButton = page.locator('[data-testid="remove-subtask-button"]');
    await removeButton.click();

    // 等待確認對話框
    const confirmDialog = page.locator('[data-testid="remove-confirmation"]');
    await expect(confirmDialog).toBeVisible();

    // 截圖：刪除確認對話框
    await page.screenshot({ 
      path: 'test-results/screenshots/remove-confirmation.png',
      fullPage: true 
    });

    // 檢查警告訊息
    await expect(confirmDialog.locator('text=此操作無法復原')).toBeVisible();

    // 點擊取消，應該關閉對話框
    await confirmDialog.locator('text=取消').click();
    await expect(confirmDialog).not.toBeVisible();

    // 重新觸發刪除
    await removeButton.click();
    await expect(confirmDialog).toBeVisible();

    // 點擊確認刪除
    await confirmDialog.locator('text=移除').click();

    // 驗證子任務已被移除
    await page.waitForSelector('[data-testid="removal-success"]', { timeout: 5000 });

    // 截圖：刪除成功
    await page.screenshot({ 
      path: 'test-results/screenshots/subtask-removed.png',
      fullPage: true 
    });

    // 檢查任務列表中不再包含該子任務
    const taskList = page.locator('[data-testid="task-list"]');
    await expect(taskList.locator(`text=${testSubtaskId}`)).not.toBeVisible();

    log.info('✅ 子任務刪除功能測試完成');
  });

  /**
   * 測試 5: 衝突時段檢測
   */
  test('應該檢測並警告時間段衝突', async () => {
    log.info('開始測試：衝突時段檢測');

    // 創建衝突的排程
    await createConflictingSchedule();

    await navigateToOverdueSubtask();

    // 打開子任務延長器
    const extendButton = page.locator('[data-testid="extend-subtask-button"]');
    await extendButton.click();

    const extender = page.locator('[data-testid="subtask-date-time-extender"]');
    await expect(extender).toBeVisible();

    // 選擇有衝突的日期
    const conflictDate = getFutureDate(1);
    await selectDate(conflictDate);

    // 等待時間段加載
    await page.waitForSelector('[data-testid="time-slot-status"]', { timeout: 10000 });

    // 截圖：衝突檢測
    await page.screenshot({ 
      path: 'test-results/screenshots/conflict-detection.png',
      fullPage: true 
    });

    // 檢查是否顯示「無可用時間段」訊息
    const noSlotsMessage = page.locator('[data-testid="no-available-slots"]');
    if (await noSlotsMessage.isVisible()) {
      log.info('✅ 正確顯示無可用時間段警告');
    } else {
      // 如果有部分可用時間段，檢查是否標示衝突
      const conflictWarning = page.locator('[data-testid="conflict-warning"]');
      await expect(conflictWarning).toBeVisible();
      log.info('✅ 正確顯示時間段衝突警告');
    }

    log.info('✅ 衝突時段檢測測試完成');
  });

  /**
   * 輔助函數：設置測試環境
   */
  async function setupTestEnvironment() {
    try {
      log.info('設置測試環境...');
      
      // 設置測試數據
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 如果需要登錄或設置，在這裡處理
      // 這裡假設是開發環境，不需要特殊認證

      log.info('✅ 測試環境設置完成');
    } catch (error) {
      log.error('設置測試環境失敗:', error);
      throw error;
    }
  }

  /**
   * 輔助函數：創建逾期子任務
   */
  async function createOverdueSubtask() {
    try {
      log.info('創建測試用逾期子任務...');

      // 創建主任務
      await page.goto('/add-task');
      await page.fill('[data-testid="task-title"]', '測試主任務');
      await page.fill('[data-testid="task-description"]', '用於測試逾期處理的任務');
      
      // 設置截止日期為明天
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('[data-testid="due-date"]', tomorrow.toISOString().split('T')[0]);

      // 提交任務創建
      await page.click('[data-testid="create-task"]');

      // 等待任務創建完成
      await page.waitForSelector('[data-testid="task-created"]', { timeout: 10000 });

      // 獲取任務 ID
      testTaskId = await page.getAttribute('[data-testid="created-task"]', 'data-task-id') || '';

      // 模擬創建逾期的子任務排程
      await page.evaluate((taskId) => {
        // 這裡使用頁面內的 JavaScript 來模擬逾期子任務
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const overdueSubtask = {
          taskId: `${taskId}_subtask_1`,
          date: yesterday.toISOString().split('T')[0],
          timeSlot: { start: '09:00', end: '10:00' },
          duration: 60
        };

        // 添加到 localStorage 或其他狀態管理
        window.localStorage.setItem('test-overdue-subtask', JSON.stringify(overdueSubtask));
      }, testTaskId);

      testSubtaskId = `${testTaskId}_subtask_1`;
      log.info(`✅ 逾期子任務創建完成: ${testSubtaskId}`);

    } catch (error) {
      log.error('創建逾期子任務失敗:', error);
      throw error;
    }
  }

  /**
   * 輔助函數：導航到逾期子任務
   */
  async function navigateToOverdueSubtask() {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    const overdueSubtask = page.locator('[data-testid="schedule-item"]')
      .filter({ hasText: testSubtaskId });
    
    await expect(overdueSubtask).toBeVisible();

    const moreButton = overdueSubtask.locator('[data-testid="more-button"]');
    await moreButton.click();

    await expect(page.locator('[data-testid="decision-box"]')).toBeVisible();
  }

  /**
   * 輔助函數：選擇日期
   */
  async function selectDate(dateString: string) {
    const datePicker = page.locator('[data-testid="date-picker"]');
    await datePicker.click();

    // 等待日曆顯示
    await page.waitForSelector('[data-testid="calendar"]');

    // 選擇指定日期
    const targetDate = new Date(dateString);
    const dayButton = page.locator(`[data-testid="day-${targetDate.getDate()}"]`);
    await dayButton.click();
  }

  /**
   * 輔助函數：獲取過去日期
   */
  function getPastDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * 輔助函數：獲取未來日期
   */
  function getFutureDate(daysAhead: number): string {
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    return future.toISOString().split('T')[0];
  }

  /**
   * 輔助函數：創建衝突的排程
   */
  async function createConflictingSchedule() {
    await page.evaluate(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const conflictingTask = {
        taskId: 'conflict-task',
        date: tomorrow.toISOString().split('T')[0],
        timeSlot: { start: '09:00', end: '12:00' },
        duration: 180
      };

      window.localStorage.setItem('test-conflicting-task', JSON.stringify(conflictingTask));
    });
  }

  /**
   * 輔助函數：清理測試數據
   */
  async function cleanupTestData() {
    try {
      log.info('清理測試數據...');
      
      await page.evaluate(() => {
        // 清理所有測試相關的數據
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('test-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      });

      log.info('✅ 測試數據清理完成');
    } catch (error) {
      log.error('清理測試數據失敗:', error);
    }
  }
});

/**
 * 生成測試報告
 */
test.afterAll(async () => {
  const reportData = {
    timestamp: new Date().toISOString(),
    testSuite: '子任務逾期處理功能測試',
    summary: {
      total: 5,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    details: [
      '逾期檢測與決策框顯示',
      '子任務延長功能（日曆選擇器）',
      'AI 重新排程功能',
      '子任務刪除功能',
      '衝突時段檢測'
    ]
  };

  // 保存測試報告
  const fs = require('fs');
  fs.writeFileSync(
    'test-results/subtask-overdue-handling-report.json',
    JSON.stringify(reportData, null, 2)
  );

  log.info('✅ 測試報告已生成: test-results/subtask-overdue-handling-report.json');
});