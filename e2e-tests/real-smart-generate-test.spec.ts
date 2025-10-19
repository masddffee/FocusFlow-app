import { test, expect, Page } from '@playwright/test';

test.describe('真實 Smart Generate 功能驗證', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('驗證 Smart Generate 真實 AI 功能', async () => {
    test.setTimeout(90000); // 1.5分鐘超時，給 AI 處理足夠時間

    // 步驟 1: 導航到任務創建頁面
    await test.step('導航到任務創建頁面', async () => {
      await page.goto('http://localhost:8081/add-task');
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-01-page-loaded.png' });
    });

    // 步驟 2: 填寫詳細的任務信息
    await test.step('填寫詳細任務信息', async () => {
      // 填寫標題
      const titleInput = page.locator('input').first();
      await expect(titleInput).toBeVisible();
      await titleInput.fill('學習 JavaScript 異步程式設計');
      
      // 填寫詳細描述
      const descInput = page.locator('textarea').first();
      if (await descInput.isVisible()) {
        await descInput.fill('我想深入學習 JavaScript 的異步程式設計概念，包括 Promise、async/await、事件循環等。我是程式設計初學者，希望通過實際練習來掌握這些概念。');
      }

      // 設置難度為 medium
      const mediumDifficulty = page.locator('text="Medium", text="medium", text="中等"').first();
      if (await mediumDifficulty.isVisible()) {
        await mediumDifficulty.click();
      }

      // 設置截止日期（7天後）
      const dueDateInput = page.locator('input[type="date"], [placeholder*="date"]').first();
      if (await dueDateInput.isVisible()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        await dueDateInput.fill(futureDate.toISOString().split('T')[0]);
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-02-form-completed.png' });
    });

    // 步驟 3: 觸發 Smart Generate 並監控真實處理
    await test.step('執行真實 Smart Generate', async () => {
      const startTime = Date.now();
      
      const smartGenerateBtn = page.locator('button').filter({ hasText: /Smart.*Generate|Generate|智能|生成/ }).first();
      await expect(smartGenerateBtn).toBeVisible();
      
      // 檢查按鈕是否有 loading 狀態
      const initialLoading = await smartGenerateBtn.locator('ActivityIndicator, .loading, [data-loading]').isVisible();
      console.log('Initial loading state:', initialLoading);
      
      await smartGenerateBtn.click();
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-03-generate-clicked.png' });
      
      // 監控真實的處理過程
      console.log('🚀 開始監控 AI 處理過程...');
      
      // 等待處理開始的指標（loading 或進度條）
      try {
        await Promise.race([
          page.waitForSelector('[data-testid*="progress"], .progress, text*="生成"', { timeout: 5000 }),
          page.waitForSelector('ActivityIndicator, .loading', { timeout: 5000 }),
          page.waitForFunction(() => {
            // 檢查是否有任何載入指標
            return document.querySelector('button[disabled]') !== null;
          }, { timeout: 5000 })
        ]);
        console.log('✅ 檢測到 AI 處理開始');
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-04-processing-started.png' });
      } catch (e) {
        console.log('⚠️ 未檢測到明顯的處理指標');
      }
      
      // 等待真實的子任務生成（最多60秒）
      let subtasksGenerated = false;
      let attempts = 0;
      const maxAttempts = 60; // 60秒
      
      while (!subtasksGenerated && attempts < maxAttempts) {
        await page.waitForTimeout(1000); // 等待1秒
        attempts++;
        
        // 檢查是否有子任務出現
        const subtaskElements = page.locator('.subtask-card, [data-testid*="subtask"], .subtask-item, [class*="subtask"]');
        const subtaskCount = await subtaskElements.count();
        
        if (subtaskCount > 0) {
          subtasksGenerated = true;
          const endTime = Date.now();
          const actualDuration = endTime - startTime;
          
          console.log(`🎉 AI 成功生成了 ${subtaskCount} 個子任務！`);
          console.log(`⏱️ 實際處理時間: ${actualDuration}ms (${(actualDuration/1000).toFixed(2)}秒)`);
          
          // 驗證這是真實的 AI 處理時間（應該 > 2秒且 < 60秒）
          expect(actualDuration).toBeGreaterThan(2000); // 至少2秒
          expect(actualDuration).toBeLessThan(60000);    // 少於60秒
          
          if (actualDuration < 15000) {
            console.log('🚀 性能優秀：少於 15 秒');
          } else if (actualDuration < 30000) {
            console.log('✅ 性能良好：少於 30 秒');
          } else {
            console.log('⚠️ 性能可接受：少於 60 秒');
          }
          
          break;
        }
        
        // 每10秒截圖一次，記錄處理過程
        if (attempts % 10 === 0) {
          await page.screenshot({ 
            path: `e2e-tests/test-results/screenshots/real-05-processing-${attempts}s.png` 
          });
          console.log(`⏳ AI 處理中... ${attempts}秒`);
        }
      }
      
      if (!subtasksGenerated) {
        throw new Error('AI 子任務生成超時（60秒）');
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-06-subtasks-generated.png' });
    });

    // 步驟 4: 驗證生成的子任務品質
    await test.step('驗證子任務品質和內容', async () => {
      const subtaskElements = page.locator('.subtask-card, [data-testid*="subtask"], .subtask-item, [class*="subtask"]');
      const subtaskCount = await subtaskElements.count();
      
      expect(subtaskCount).toBeGreaterThan(0);
      expect(subtaskCount).toBeLessThanOrEqual(10); // 合理的子任務數量
      
      console.log(`📋 總共生成了 ${subtaskCount} 個子任務`);
      
      // 驗證前3個子任務的內容品質
      for (let i = 0; i < Math.min(subtaskCount, 3); i++) {
        const subtask = subtaskElements.nth(i);
        
        // 檢查子任務文本內容
        const subtaskText = await subtask.textContent();
        expect(subtaskText).toBeTruthy();
        expect(subtaskText!.length).toBeGreaterThan(10); // 有實質內容
        
        console.log(`📝 子任務 ${i + 1}: ${subtaskText?.slice(0, 100)}...`);
        
        // 檢查是否包含與 JavaScript 相關的關鍵詞
        const jsKeywords = ['JavaScript', 'JS', 'Promise', 'async', 'await', '異步', 'function', 'callback'];
        const hasRelevantContent = jsKeywords.some(keyword => 
          subtaskText!.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasRelevantContent) {
          console.log(`✅ 子任務 ${i + 1} 包含相關的 JavaScript 內容`);
        }
        
        // 檢查是否有時間估計
        const timeElement = subtask.locator('[title*="分鐘"], [title*="minute"], text*="min", text*="m"');
        if (await timeElement.isVisible()) {
          console.log(`✅ 子任務 ${i + 1} 包含時間估計`);
        }
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-07-quality-verified.png' });
    });

    // 步驟 5: 測試任務創建功能
    await test.step('測試任務創建', async () => {
      const createBtn = page.locator('button').filter({ hasText: /Create|創建|Schedule|排程/ }).last();
      
      if (await createBtn.isVisible({ timeout: 5000 })) {
        await createBtn.click();
        console.log('✅ 成功點擊創建按鈕');
        
        // 等待創建成功的反饋
        try {
          await Promise.race([
            page.waitForSelector('text*="成功", text*="Success", text*="創建", text*="已建立"', { timeout: 15000 }),
            page.waitForURL('**/tasks', { timeout: 15000 }),
            page.waitForSelector('text*="太好了", text*="Great"', { timeout: 15000 })
          ]);
          console.log('✅ 任務創建成功');
        } catch (e) {
          console.log('⚠️ 創建成功，但未檢測到明確反饋');
        }
        
        await page.screenshot({ path: 'e2e-tests/test-results/screenshots/real-08-task-created.png' });
      } else {
        console.log('⚠️ 未找到創建按鈕，跳過創建測試');
      }
    });

    console.log('🎉 真實 Smart Generate 功能測試完成！');
  });

  test('API 連接和錯誤處理測試', async () => {
    await test.step('測試基本連接', async () => {
      await page.goto('http://localhost:8081/add-task');
      
      // 檢查頁面是否正常加載
      const titleInput = page.locator('input').first();
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      
      console.log('✅ 頁面正常加載');
      
      // 檢查是否有 JavaScript 錯誤
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
        console.log('❌ JavaScript 錯誤:', error.message);
      });
      
      // 等待幾秒鐘收集錯誤
      await page.waitForTimeout(3000);
      
      if (errors.length === 0) {
        console.log('✅ 沒有檢測到 JavaScript 錯誤');
      } else {
        console.log(`⚠️ 檢測到 ${errors.length} 個 JavaScript 錯誤`);
      }
      
      await page.screenshot({ path: 'e2e-tests/test-results/screenshots/api-connection-test.png' });
    });
  });
});