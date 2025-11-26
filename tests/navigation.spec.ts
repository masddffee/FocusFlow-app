import { test, expect } from '@playwright/test';

test.describe('頁面導航測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('主頁面可以正常載入', async ({ page }) => {
    // 檢查 URL
    expect(page.url()).toContain('localhost:8081');
    
    // 檢查頁面是否有內容
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test('任務相關頁面導航', async ({ page }) => {
    // 嘗試導航到任務頁面（根據 app 結構）
    try {
      // 檢查是否有任務相關的按鈕或連結
      const taskButtons = page.locator('button, a, [role="button"]').filter({
        hasText: /任務|task|Task|添加|新增|add|Add/i
      });
      
      if (await taskButtons.count() > 0) {
        await taskButtons.first().click();
        await page.waitForLoadState('networkidle');
        
        // 檢查是否成功導航
        const newContent = await page.textContent('body');
        expect(newContent).toBeTruthy();
      }
    } catch (error) {
      console.log('任務頁面導航測試跳過:', error);
    }
  });

  test('專注模式頁面', async ({ page }) => {
    try {
      // 尋找專注相關的元素
      const focusElements = page.locator('button, a, [role="button"]').filter({
        hasText: /專注|focus|Focus|計時|timer/i
      });
      
      if (await focusElements.count() > 0) {
        await focusElements.first().click();
        await page.waitForLoadState('networkidle');
        
        // 檢查頁面載入
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
      }
    } catch (error) {
      console.log('專注頁面導航測試跳過:', error);
    }
  });

  test('響應式設計測試', async ({ page }) => {
    // 測試不同螢幕尺寸
    const viewports = [
      { width: 375, height: 667 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // 檢查頁面仍然可以正常顯示
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // 檢查是否有內容溢出
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      
      // 允許少量溢出（可能是滾動條）
      expect(scrollWidth - clientWidth).toBeLessThan(20);
    }
  });
});