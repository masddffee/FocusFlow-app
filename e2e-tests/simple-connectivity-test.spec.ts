import { test, expect } from '@playwright/test';

test('簡單連接測試', async ({ page }) => {
  test.setTimeout(30000);
  
  console.log('🌐 嘗試連接到應用...');
  
  try {
    await page.goto('http://localhost:8081', { timeout: 15000 });
    console.log('✅ 成功連接到應用');
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✅ 頁面加載完成');
    
    const title = await page.title();
    console.log(`📋 頁面標題: ${title}`);
    
    await page.screenshot({ path: 'test-results/screenshots/simple-test.png' });
    console.log('📸 截圖已保存');
    
    expect(title).toBeDefined();
    console.log('✅ 簡單連接測試通過');
    
  } catch (error) {
    console.log('❌ 連接測試失敗:', error);
    throw error;
  }
});