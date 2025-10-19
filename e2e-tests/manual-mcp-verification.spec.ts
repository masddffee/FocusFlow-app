/**
 * 手動 MCP 驗證測試
 * 直接測試 API 端點而不依賴 UI 元素
 */

import { test, expect } from '@playwright/test';

test.describe('Manual MCP Verification', () => {
  
  test('直接測試後端健康狀態', async ({ request }) => {
    console.log('🔍 檢查後端健康狀態...');
    
    const response = await request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);
    
    console.log('✅ 後端健康狀態正常');
  });

  test('直接測試 AI 任務創建 API', async ({ request }) => {
    console.log('🤖 測試 AI 任務創建...');
    
    const response = await request.post('http://localhost:3000/api/jobs', {
      data: {
        type: 'task_planning',
        params: {
          title: 'MCP 驗證測試任務',
          description: '這是一個用來驗證 MCP 功能是否正常的測試任務，目標是學習基本的程式設計概念',
          language: 'zh'
        }
      }
    });
    
    expect(response.status()).toBe(202);
    const jobData = await response.json();
    
    console.log(`📋 任務創建成功，Job ID: ${jobData.jobId}`);
    
    // 等待任務完成
    let completed = false;
    let attempts = 0;
    const maxAttempts = 20;
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await request.get(`http://localhost:3000/api/jobs/${jobData.jobId}`);
      const status = await statusResponse.json();
      
      console.log(`⏳ 任務狀態: ${status.status} (嘗試 ${attempts + 1}/${maxAttempts})`);
      
      if (status.status === 'completed') {
        completed = true;
        console.log('🎉 任務完成！');
        console.log(`📊 結果: ${JSON.stringify(status.result).substring(0, 200)}...`);
        
        // 驗證結果包含子任務
        expect(status.result).toBeDefined();
        expect(status.result.subtasks).toBeDefined();
        expect(Array.isArray(status.result.subtasks)).toBe(true);
        expect(status.result.subtasks.length).toBeGreaterThan(0);
        
        console.log(`✅ 生成了 ${status.result.subtasks.length} 個子任務`);
        
        // 檢查第一個子任務的品質
        const firstSubtask = status.result.subtasks[0];
        expect(firstSubtask.title).toBeDefined();
        expect(firstSubtask.text).toBeDefined();
        expect(firstSubtask.aiEstimatedDuration).toBeGreaterThan(10); // 至少 10 分鐘
        
        console.log(`📝 第一個子任務: "${firstSubtask.title}" (${firstSubtask.aiEstimatedDuration}分鐘)`);
        
      } else if (status.status === 'failed') {
        console.error('❌ 任務失敗:', status.error);
        throw new Error(`任務失敗: ${status.error}`);
      }
      
      attempts++;
    }
    
    if (!completed) {
      throw new Error('任務在規定時間內未完成');
    }
  });

  test('驗證前端頁面基本載入', async ({ page }) => {
    console.log('🌐 檢查前端頁面...');
    
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
    
    // 檢查頁面是否載入
    const title = await page.title();
    console.log(`📄 頁面標題: ${title}`);
    
    // 檢查是否有基本內容
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(100);
    
    console.log('✅ 前端頁面載入正常');
  });

  test('檢查任務創建頁面', async ({ page }) => {
    console.log('📝 檢查任務創建頁面...');
    
    await page.goto('http://localhost:8081/add-task');
    await page.waitForLoadState('networkidle');
    
    // 檢查頁面內容
    const content = await page.textContent('body');
    console.log(`📄 頁面內容長度: ${content.length} 字符`);
    
    // 查找輸入元素
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();
    const buttons = await page.locator('button').count();
    
    console.log(`🔍 發現元素: ${inputs} 個輸入框, ${textareas} 個文本區域, ${buttons} 個按鈕`);
    
    expect(inputs + textareas).toBeGreaterThan(0);
    expect(buttons).toBeGreaterThan(0);
    
    console.log('✅ 任務創建頁面元素正常');
  });
});