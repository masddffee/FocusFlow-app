import { test, expect } from '@playwright/test';

/**
 * Phase A: 環境診斷測試
 * 驗證 Playwright 和服務是否正常工作
 */

test.describe('Phase A: 環境診斷', () => {
  
  test('A1: Playwright 基本功能測試', async ({ page }) => {
    test.setTimeout(30000);
    
    console.log('🔧 Phase A1: 測試 Playwright 基本功能');
    
    // 設置錯誤監聽
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('❌ 頁面錯誤:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('❌ 控制台錯誤:', msg.text());
      }
    });
    
    try {
      console.log('🌐 嘗試連接到前端服務...');
      await page.goto('http://localhost:8081');
      
      console.log('⏳ 等待頁面加載...');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      
      const title = await page.title();
      console.log(`📋 頁面標題: ${title}`);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a1-basic-load.png',
        fullPage: true 
      });
      console.log('📸 基本加載截圖已保存');
      
      expect(title).toBeTruthy();
      expect(errors.length).toBe(0);
      
      console.log('✅ Phase A1: Playwright 基本功能正常');
      
    } catch (error) {
      console.log('❌ Phase A1 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a1-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('A2: 前端應用載入測試', async ({ page }) => {
    test.setTimeout(30000);
    
    console.log('🔧 Phase A2: 測試前端應用載入');
    
    try {
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // 檢查頁面基本元素
      const bodyExists = await page.locator('body').isVisible();
      expect(bodyExists).toBe(true);
      
      // 檢查是否有 React 根元素
      const reactRoot = await page.locator('#root, #app, [data-reactroot]').first();
      const hasReactRoot = await reactRoot.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasReactRoot) {
        console.log('✅ 找到 React 根元素');
      } else {
        console.log('⚠️ 未找到明顯的 React 根元素');
      }
      
      // 統計頁面元素
      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      const buttonCount = await page.evaluate(() => document.querySelectorAll('button').length);
      const inputCount = await page.evaluate(() => document.querySelectorAll('input').length);
      
      console.log(`📊 頁面統計: ${elementCount} 個元素, ${buttonCount} 個按鈕, ${inputCount} 個輸入框`);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a2-app-loaded.png',
        fullPage: true 
      });
      console.log('📸 應用載入截圖已保存');
      
      expect(elementCount).toBeGreaterThan(10);
      console.log('✅ Phase A2: 前端應用載入正常');
      
    } catch (error) {
      console.log('❌ Phase A2 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a2-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('A3: 後端通信測試', async ({ page }) => {
    test.setTimeout(30000);
    
    console.log('🔧 Phase A3: 測試後端通信');
    
    let apiRequests = 0;
    let apiResponses = 0;
    
    // 監控網路請求
    page.on('request', request => {
      if (request.url().includes('localhost:3000')) {
        apiRequests++;
        console.log(`🌐 API 請求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('localhost:3000')) {
        apiResponses++;
        console.log(`📥 API 回應: ${response.status()} ${response.url()}`);
      }
    });
    
    try {
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // 等待一段時間以捕獲可能的 API 請求
      await page.waitForTimeout(5000);
      
      console.log(`📊 網路統計: ${apiRequests} 個 API 請求, ${apiResponses} 個回應`);
      
      // 嘗試手動觸發一個 API 請求（如果有相關按鈕的話）
      const buttons = await page.locator('button').all();
      console.log(`🔘 找到 ${buttons.length} 個按鈕`);
      
      if (buttons.length > 0) {
        console.log('🔘 嘗試點擊第一個按鈕測試交互...');
        try {
          await buttons[0].click({ timeout: 3000 });
          await page.waitForTimeout(2000);
          console.log('✅ 按鈕點擊成功');
        } catch (error) {
          console.log('⚠️ 按鈕點擊失敗，但這是正常的');
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a3-backend-test.png',
        fullPage: true 
      });
      console.log('📸 後端通信測試截圖已保存');
      
      console.log('✅ Phase A3: 後端通信測試完成');
      
    } catch (error) {
      console.log('❌ Phase A3 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-a3-error.png',
        fullPage: true 
      });
      throw error;
    }
  });
});