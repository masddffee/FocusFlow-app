import { test, expect, Page } from '@playwright/test';

test.describe('快速 API 連接測試', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('測試前端 Smart Generate 按鈕和網路請求', async () => {
    test.setTimeout(60000); // 1分鐘超時

    // 攔截網路請求
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('localhost:3000') || request.url().includes('subtasks')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
        console.log(`📡 API 請求: ${request.method()} ${request.url()}`);
      }
    });

    // 攔截網路響應
    page.on('response', response => {
      if (response.url().includes('localhost:3000') || response.url().includes('subtasks')) {
        console.log(`📨 API 響應: ${response.status()} ${response.url()}`);
      }
    });

    // 攔截 console 日誌
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ 前端錯誤: ${msg.text()}`);
      } else if (msg.text().includes('API') || msg.text().includes('Smart Generate') || msg.text().includes('子任務')) {
        console.log(`📝 前端日誌: ${msg.text()}`);
      }
    });

    // 導航到頁面
    await page.goto('http://localhost:8081/add-task');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'e2e-tests/test-results/screenshots/quick-01-loaded.png' });

    // 填寫表單
    const titleInput = page.locator('input').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('測試任務');

    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('這是一個測試任務描述');
    }

    await page.screenshot({ path: 'e2e-tests/test-results/screenshots/quick-02-form-filled.png' });

    // 點擊 Smart Generate
    const smartGenerateBtn = page.locator('button').filter({ hasText: /Smart.*Generate|Generate|智能|生成/ }).first();
    await expect(smartGenerateBtn).toBeVisible();
    
    console.log('🚀 點擊 Smart Generate 按鈕');
    await smartGenerateBtn.click();
    await page.screenshot({ path: 'e2e-tests/test-results/screenshots/quick-03-clicked.png' });

    // 等待一段時間讓請求發送
    await page.waitForTimeout(10000); // 等待10秒

    // 檢查是否發送了 API 請求
    console.log(`📊 總共攔截到 ${requests.length} 個相關的 API 請求`);
    
    if (requests.length > 0) {
      console.log('✅ 檢測到 API 請求');
      requests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`     數據: ${req.postData.slice(0, 200)}...`);
        }
      });
    } else {
      console.log('⚠️ 沒有檢測到 API 請求，可能存在連接問題');
    }

    await page.screenshot({ path: 'e2e-tests/test-results/screenshots/quick-04-after-wait.png' });

    // 檢查頁面是否有任何變化
    const pageContent = await page.content();
    const hasSubtasks = pageContent.includes('subtask') || 
                       pageContent.includes('子任務') || 
                       pageContent.includes('Task') ||
                       page.locator('.subtask-card, [data-testid*="subtask"]').isVisible();

    if (hasSubtasks) {
      console.log('✅ 檢測到子任務相關內容');
    } else {
      console.log('⚠️ 沒有檢測到子任務內容');
    }

    // 檢查按鈕狀態
    const isDisabled = await smartGenerateBtn.isDisabled();
    const hasLoadingIndicator = await page.locator('ActivityIndicator, .loading, [data-loading="true"]').isVisible();
    
    console.log(`🔘 按鈕狀態: ${isDisabled ? '禁用' : '啟用'}`);
    console.log(`⏳ 載入指示器: ${hasLoadingIndicator ? '顯示' : '隱藏'}`);

    await page.screenshot({ path: 'e2e-tests/test-results/screenshots/quick-05-final-state.png' });
  });

  test('直接測試後端 API', async () => {
    await test.step('測試 /subtasks-direct 端點', async () => {
      // 使用 page.evaluate 在瀏覽器中發送 fetch 請求
      const result = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:3000/subtasks-direct', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: '測試任務',
              description: '測試描述',
              language: 'zh',
              taskType: 'skill_learning'
            })
          });

          const data = await response.json();
          return {
            status: response.status,
            ok: response.ok,
            data: data
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });

      console.log('🔗 直接 API 測試結果:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.log(`❌ API 請求失敗: ${result.error}`);
      } else if (result.ok) {
        console.log('✅ API 請求成功');
        if (result.data.subtasks && result.data.subtasks.length > 0) {
          console.log(`📋 生成了 ${result.data.subtasks.length} 個子任務`);
        }
      } else {
        console.log(`⚠️ API 返回錯誤狀態: ${result.status}`);
      }
    });
  });
});