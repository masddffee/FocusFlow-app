import { test, expect } from '@playwright/test';

test.describe('應用健康檢查', () => {
  test('應用可以正常啟動和載入', async ({ page }) => {
    // 設置較長的超時時間
    test.setTimeout(60000);
    
    // 訪問應用
    await page.goto('http://localhost:8081');
    
    // 等待頁面載入完成
    await page.waitForLoadState('domcontentloaded');
    
    // 檢查頁面標題
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log('頁面標題:', title);
    
    // 檢查頁面內容
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(10);
    
    console.log('✅ 應用成功載入，頁面有內容');
  });

  test('後端 API 可以連接', async ({ page }) => {
    // 檢查後端健康狀態
    const response = await page.request.get('http://localhost:3000/');
    console.log('後端回應狀態:', response.status());
    
    // 404 是正常的，表示服務器在運行
    expect([200, 404]).toContain(response.status());
    
    console.log('✅ 後端服務正常運行');
  });

  test('基本頁面互動', async ({ page }) => {
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('domcontentloaded');
    
    // 檢查是否有可點擊的元素
    const clickableElements = page.locator('button, a, [role="button"]');
    const count = await clickableElements.count();
    
    console.log(`找到 ${count} 個可互動元素`);
    expect(count).toBeGreaterThan(0);
    
    // 嘗試點擊第一個可見的按鈕
    const firstButton = clickableElements.first();
    if (await firstButton.isVisible()) {
      await firstButton.click();
      console.log('✅ 成功點擊第一個按鈕');
    }
  });
});