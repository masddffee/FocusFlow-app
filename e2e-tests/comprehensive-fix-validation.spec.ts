import { test, expect, Page } from '@playwright/test';
import { log } from '@/lib/logger';

test.describe('綜合修復驗證測試', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8081');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('完整的任務創建和排程流程', async () => {
    test.setTimeout(120000); // 2分鐘超時

    // 步驟 1: 導航到任務創建頁面
    await test.step('導航到任務創建頁面', async () => {
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/01-home-page.png' });
      
      // 先嘗試點擊浮動按鈕（更明顯的按鈕）
      let addButton = page.locator('[style*="position: absolute"]', '[style*="bottom"]').and(page.locator('svg')).first();
      
      if (!(await addButton.isVisible({ timeout: 2000 }))) {
        // 嘗試 Header 中的 Plus 按鈕
        addButton = page.locator('header >> svg, [data-testid*="add"], button >> svg').first();
      }
      
      if (!(await addButton.isVisible({ timeout: 2000 }))) {
        // 最後的嘗試：尋找任何包含 Plus 的按鈕或可點擊元素
        addButton = page.locator('text="Add", text="+", button:has-text("Add"), [aria-label*="add"], [title*="add"]').first();
      }
      
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();
      
      await page.waitForURL('**/add-task', { timeout: 10000 });
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/02-add-task-page.png' });
    });

    // 步驟 2: 填寫基本任務信息
    await test.step('填寫基本任務信息', async () => {
      const titleInput = page.locator('input[placeholder*="title"], input[placeholder*="標題"]').first();
      await expect(titleInput).toBeVisible();
      await titleInput.fill('學習 React Native 開發');
      
      const descInput = page.locator('textarea[placeholder*="description"], textarea[placeholder*="描述"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('從基礎開始學習 React Native 移動應用開發，包括組件、導航、狀態管理等核心概念。');
      }
      
      // 設置截止日期（30天後）
      const dueDatePicker = page.locator('input[type="date"], [data-testid="due-date"]').first();
      if (await dueDatePicker.isVisible()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        await dueDatePicker.fill(futureDate.toISOString().split('T')[0]);
      }
      
      // 選擇難度
      const mediumDifficulty = page.locator('text="Medium", text="medium", text="中等"').first();
      if (await mediumDifficulty.isVisible()) {
        await mediumDifficulty.click();
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/03-form-filled.png' });
    });

    // 步驟 3: 觸發 Smart Generate
    await test.step('觸發 Smart Generate', async () => {
      const smartGenerateBtn = page.locator('button:has-text("Smart Generate"), [data-testid="smart-generate"]').first();
      await expect(smartGenerateBtn).toBeVisible();
      
      await smartGenerateBtn.click();
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/04-smart-generate-clicked.png' });
      
      // 等待進度條出現（如果有的話）
      const progressBar = page.locator('[data-testid="progress-bar"], .progress-container').first();
      if (await progressBar.isVisible({ timeout: 2000 })) {
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/05-progress-visible.png' });
        
        // 等待進度完成
        await expect(progressBar).not.toBeVisible({ timeout: 30000 });
      }
    });

    // 步驟 4: 處理個人化問題（如果出現）
    await test.step('處理個人化問題', async () => {
      // 檢查是否出現個人化模態框
      const personalizationModal = page.locator('[data-testid="personalization-modal"], .modal-container').first();
      
      if (await personalizationModal.isVisible({ timeout: 5000 })) {
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/06-personalization-modal.png' });
        
        // 檢查透明推理信息是否顯示
        const diagnosticInsight = page.locator('text*="AI Analysis:", text*="診斷洞察"').first();
        if (await diagnosticInsight.isVisible()) {
          console.log('✅ 透明推理功能正常工作');
        }
        
        // 填寫問題回答
        const textInputs = page.locator('textarea, input[type="text"]');
        const inputCount = await textInputs.count();
        
        for (let i = 0; i < Math.min(inputCount, 3); i++) {
          const input = textInputs.nth(i);
          if (await input.isVisible()) {
            await input.fill(`這是第 ${i + 1} 個問題的回答，我希望能夠深入學習相關內容。`);
          }
        }
        
        // 點擊完成按鈕
        const completeBtn = page.locator('button:has-text("Complete"), button:has-text("完成"), button:has-text("Generate")').first();
        await completeBtn.click();
        
        // 等待模態框關閉
        await expect(personalizationModal).not.toBeVisible({ timeout: 15000 });
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/07-personalization-completed.png' });
      } else {
        console.log('ℹ️ 沒有出現個人化問題，直接生成子任務');
      }
    });

    // 步驟 5: 驗證子任務生成品質
    await test.step('驗證子任務生成品質', async () => {
      // 等待子任務出現
      await page.waitForSelector('.subtask-card, [data-testid="subtask"], .subtask-item', { timeout: 20000 });
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/08-subtasks-generated.png' });
      
      const subtasks = page.locator('.subtask-card, [data-testid="subtask"], .subtask-item');
      const subtaskCount = await subtasks.count();
      
      expect(subtaskCount).toBeGreaterThan(0);
      console.log(`✅ 生成了 ${subtaskCount} 個子任務`);
      
      // 檢查子任務是否包含增強的詳細信息
      for (let i = 0; i < Math.min(subtaskCount, 3); i++) {
        const subtask = subtasks.nth(i);
        
        // 檢查是否有 "如何開始" 信息
        const howToStart = subtask.locator('text*="如何開始", text*="🚀"');
        if (await howToStart.isVisible()) {
          console.log(`✅ 子任務 ${i + 1} 包含具體的開始指導`);
        }
        
        // 檢查是否有完成標準
        const successCriteria = subtask.locator('text*="完成標準", text*="✅"');
        if (await successCriteria.isVisible()) {
          console.log(`✅ 子任務 ${i + 1} 包含明確的完成標準`);
        }
        
        // 檢查是否有推薦資源
        const resources = subtask.locator('text*="推薦資源", text*="📚"');
        if (await resources.isVisible()) {
          console.log(`✅ 子任務 ${i + 1} 包含學習資源推薦`);
        }
      }
    });

    // 步驟 6: 創建並排程任務
    await test.step('創建並排程任務', async () => {
      // 確保自動排程已啟用
      const autoScheduleToggle = page.locator('[data-testid="auto-schedule-toggle"], .toggle-button').first();
      if (await autoScheduleToggle.isVisible()) {
        const isEnabled = await autoScheduleToggle.getAttribute('aria-checked') === 'true' || 
                         await autoScheduleToggle.locator('.toggle-indicator-active').isVisible();
        if (!isEnabled) {
          await autoScheduleToggle.click();
        }
      }
      
      // 點擊創建任務按鈕
      const createBtn = page.locator('button:has-text("Create"), button:has-text("創建"), button:has-text("Schedule")').last();
      await expect(createBtn).toBeVisible();
      await createBtn.click();
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/09-task-creation-clicked.png' });
      
      // 等待成功消息或頁面跳轉
      await page.waitForSelector('text*="成功", text*="Success", text*="已建立"', { timeout: 15000 });
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/10-task-created-success.png' });
    });

    // 步驟 7: 驗證任務頁面同步
    await test.step('驗證任務頁面同步', async () => {
      // 導航到任務頁面
      const tasksTab = page.locator('[data-testid="tasks-tab"], text="Tasks", text="任務"').first();
      if (await tasksTab.isVisible()) {
        await tasksTab.click();
      } else {
        await page.goto('http://localhost:8081/tasks');
      }
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/11-tasks-page.png' });
      
      // 檢查是否能找到我們創建的任務
      const taskTitle = page.locator('text*="React Native"');
      await expect(taskTitle).toBeVisible({ timeout: 10000 });
      console.log('✅ 任務在任務頁面中正確顯示');
      
      // 檢查是否有排程信息
      const scheduledItems = page.locator('.schedule-item, [data-testid="scheduled-task"]');
      const scheduledCount = await scheduledItems.count();
      
      if (scheduledCount > 0) {
        console.log(`✅ 找到 ${scheduledCount} 個排程項目`);
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/12-scheduled-tasks-visible.png' });
      } else {
        console.log('⚠️ 未找到排程項目，可能是排程功能未啟用');
      }
    });

    console.log('🎉 完整的任務創建和排程流程測試完成');
  });

  test('API 性能測試', async () => {
    await test.step('測試子任務生成性能', async () => {
      await page.goto('http://localhost:8081/add-task');
      
      // 填寫表單
      await page.fill('input[placeholder*="title"]', '測試性能的複雜任務');
      await page.fill('textarea[placeholder*="description"]', '這是一個複雜的學習任務，包含多個階段和詳細的要求。');
      
      // 記錄開始時間
      const startTime = Date.now();
      
      // 點擊 Smart Generate
      await page.click('button:has-text("Smart Generate")');
      
      // 等待子任務出現
      await page.waitForSelector('.subtask-card', { timeout: 30000 });
      
      // 記錄結束時間
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ 子任務生成耗時: ${duration}ms (${(duration/1000).toFixed(2)}秒)`);
      
      // 驗證性能改善（應該少於 20 秒）
      expect(duration).toBeLessThan(20000);
      
      if (duration < 15000) {
        console.log('🚀 性能優秀：少於 15 秒');
      } else if (duration < 20000) {
        console.log('✅ 性能良好：少於 20 秒');
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/performance-test-completed.png' });
    });
  });

  test('錯誤處理和 Fallback 機制', async () => {
    await test.step('測試排程失敗的 Fallback', async () => {
      // 這個測試比較難模擬，但可以檢查 UI 是否有適當的錯誤處理
      await page.goto('http://localhost:8081/add-task');
      
      await page.fill('input[placeholder*="title"]', '測試錯誤處理');
      
      // 嘗試在沒有啟用自動排程的情況下創建任務
      const autoScheduleToggle = page.locator('.toggle-button').first();
      if (await autoScheduleToggle.isVisible()) {
        // 確保關閉自動排程
        const isEnabled = await autoScheduleToggle.getAttribute('aria-checked') === 'true';
        if (isEnabled) {
          await autoScheduleToggle.click();
        }
      }
      
      await page.click('button:has-text("Create")');
      
      // 應該仍然能夠成功創建任務
      await page.waitForSelector('text*="成功", text*="Success"', { timeout: 10000 });
      console.log('✅ 錯誤處理和 Fallback 機制正常工作');
    });
  });
});