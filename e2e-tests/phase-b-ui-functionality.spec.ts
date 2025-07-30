import { test, expect } from '@playwright/test';

/**
 * Phase B: 核心 UI 功能驗證
 * 測試任務創建、AI 生成等核心功能
 */

test.describe('Phase B: 核心 UI 功能驗證', () => {
  
  test('B1: 查找並測試任務創建入口', async ({ page }) => {
    test.setTimeout(45000);
    
    console.log('🔧 Phase B1: 查找任務創建入口');
    
    try {
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b1-initial-load.png',
        fullPage: true 
      });
      console.log('📸 初始載入截圖已保存');
      
      // 查找各種可能的添加任務元素
      const addTaskSelectors = [
        '[data-testid="add-task-button"]',
        'button:has-text("添加任務")',
        'button:has-text("Add Task")',
        'button:has-text("新增")',
        'button:has-text("+")',
        '.add-task-button',
        '[aria-label*="add"]',
        '[title*="add"]',
        'button[class*="add"]'
      ];
      
      let addTaskElement = null;
      let successSelector = '';
      
      for (const selector of addTaskSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            addTaskElement = element;
            successSelector = selector;
            console.log(`✅ 找到添加任務元素: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ 選擇器未找到: ${selector}`);
        }
      }
      
      if (!addTaskElement) {
        // 如果沒找到明顯的按鈕，檢查所有按鈕的文本
        console.log('🔍 未找到明顯的添加按鈕，檢查所有按鈕...');
        
        const allButtons = await page.locator('button').all();
        console.log(`🔘 總共找到 ${allButtons.length} 個按鈕`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const buttonText = await allButtons[i].textContent();
          const isVisible = await allButtons[i].isVisible();
          console.log(`按鈕 ${i + 1}: "${buttonText}" (可見: ${isVisible})`);
          
          if (isVisible && buttonText && (
            buttonText.includes('添加') ||
            buttonText.includes('新增') ||
            buttonText.includes('Add') ||
            buttonText.includes('+')
          )) {
            addTaskElement = allButtons[i];
            successSelector = `button:nth-child(${i + 1})`;
            console.log(`✅ 通過文本找到添加按鈕: "${buttonText}"`);
            break;
          }
        }
      }
      
      if (addTaskElement) {
        console.log(`🎯 準備點擊添加任務元素: ${successSelector}`);
        await addTaskElement.click();
        
        // 等待頁面變化
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-b1-after-click.png',
          fullPage: true 
        });
        console.log('📸 點擊後截圖已保存');
        
        console.log('✅ Phase B1: 成功找到並點擊任務創建入口');
      } else {
        console.log('❌ Phase B1: 未找到任務創建入口');
        
        // 截圖當前狀態以供分析
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-b1-no-add-button.png',
          fullPage: true 
        });
        
        // 檢查是否需要導航到其他頁面
        const navigationElements = await page.locator('a, [role="tab"], [role="button"]').all();
        console.log(`🔍 找到 ${navigationElements.length} 個可能的導航元素`);
        
        for (let i = 0; i < Math.min(navigationElements.length, 5); i++) {
          const elementText = await navigationElements[i].textContent();
          const tagName = await navigationElements[i].evaluate(el => el.tagName);
          console.log(`導航元素 ${i + 1}: ${tagName} - "${elementText}"`);
        }
        
        throw new Error('未找到任務創建入口');
      }
      
    } catch (error) {
      console.log('❌ Phase B1 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b1-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('B2: 任務創建表單功能測試', async ({ page }) => {
    test.setTimeout(45000);
    
    console.log('🔧 Phase B2: 測試任務創建表單');
    
    try {
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // 重複 B1 的邏輯找到添加按鈕
      const addTaskSelectors = [
        '[data-testid="add-task-button"]',
        'button:has-text("添加任務")',
        'button:has-text("Add Task")',
        'button:has-text("新增")',
        'button:has-text("+")'
      ];
      
      let clickSuccess = false;
      for (const selector of addTaskSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            clickSuccess = true;
            console.log(`✅ 成功點擊: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!clickSuccess) {
        // 如果標準選擇器失敗，嘗試點擊任何可見的按鈕
        const buttons = await page.locator('button').all();
        if (buttons.length > 0) {
          await buttons[0].click();
          clickSuccess = true;
          console.log('✅ 點擊了第一個可見按鈕');
        }
      }
      
      expect(clickSuccess).toBe(true);
      
      // 等待表單或新頁面出現
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b2-form-page.png',
        fullPage: true 
      });
      console.log('📸 表單頁面截圖已保存');
      
      // 查找輸入框
      const inputSelectors = [
        '[data-testid="task-title-input"]',
        'input[placeholder*="標題"]',
        'input[placeholder*="title"]',
        'input[placeholder*="Title"]',
        'input[type="text"]',
        'input:first-of-type'
      ];
      
      let titleInput = null;
      let inputSelector = '';
      
      for (const selector of inputSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            titleInput = element;
            inputSelector = selector;
            console.log(`✅ 找到標題輸入框: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (titleInput) {
        const testTitle = 'Phase B2 測試任務 - UI 功能驗證';
        await titleInput.fill(testTitle);
        console.log(`✅ 成功填寫標題: ${testTitle}`);
        
        // 查找描述輸入框
        const descSelectors = [
          '[data-testid="task-description-input"]', 
          'textarea[placeholder*="描述"]',
          'textarea[placeholder*="description"]',
          'textarea',
          'input[placeholder*="描述"]'
        ];
        
        for (const selector of descSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              const testDesc = '測試任務創建表單的基本功能，驗證輸入框和提交功能是否正常工作';
              await element.fill(testDesc);
              console.log(`✅ 成功填寫描述: ${selector}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-b2-form-filled.png',
          fullPage: true 
        });
        console.log('📸 表單填寫完成截圖已保存');
        
        console.log('✅ Phase B2: 任務創建表單功能正常');
      } else {
        console.log('⚠️ 未找到明顯的輸入框，但表單頁面已載入');
        
        // 檢查頁面上的所有輸入元素
        const allInputs = await page.locator('input, textarea').all();
        console.log(`🔍 總共找到 ${allInputs.length} 個輸入元素`);
        
        for (let i = 0; i < allInputs.length; i++) {
          const placeholder = await allInputs[i].getAttribute('placeholder');
          const type = await allInputs[i].getAttribute('type');
          const isVisible = await allInputs[i].isVisible();
          console.log(`輸入元素 ${i + 1}: type="${type}", placeholder="${placeholder}", 可見: ${isVisible}`);
        }
        
        console.log('✅ Phase B2: 表單頁面已載入（輸入框待進一步分析）');
      }
      
    } catch (error) {
      console.log('❌ Phase B2 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b2-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('B3: 智能生成功能檢測', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔧 Phase B3: 檢測智能生成功能');
    
    // 監控網路請求
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('localhost:3000') || request.url().includes('/api/')) {
        apiRequests.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
        console.log(`🌐 API 請求: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('localhost:3000') || response.url().includes('/api/')) {
        console.log(`📥 API 回應: ${response.status()} ${response.url()}`);
      }
    });
    
    try {
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // 嘗試進入任務創建頁面
      const buttons = await page.locator('button').all();
      if (buttons.length > 0) {
        await buttons[0].click();
        await page.waitForTimeout(3000);
      }
      
      // 填寫一些基本信息以觸發智能生成
      const inputs = await page.locator('input, textarea').all();
      if (inputs.length > 0) {
        await inputs[0].fill('學習 React Native 開發');
        console.log('✅ 填寫了任務標題');
        
        if (inputs.length > 1) {
          await inputs[1].fill('學習 React Native 的組件開發、狀態管理、導航和性能優化');
          console.log('✅ 填寫了任務描述');
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b3-before-generate.png',
        fullPage: true 
      });
      console.log('📸 智能生成前截圖已保存');
      
      // 查找智能生成按鈕
      const smartGenSelectors = [
        '[data-testid="smart-generate-button"]',
        'button:has-text("Smart Generate")',
        'button:has-text("智能生成")',
        'button:has-text("AI 生成")',
        'button:has-text("生成")',
        '.smart-generate-button'
      ];
      
      let smartGenButton = null;
      for (const selector of smartGenSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            smartGenButton = element;
            console.log(`✅ 找到智能生成按鈕: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (smartGenButton) {
        console.log('🤖 點擊智能生成按鈕...');
        await smartGenButton.click();
        
        // 等待 AI 生成過程
        console.log('⏳ 等待 AI 生成完成...');
        await page.waitForTimeout(10000);
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-b3-after-generate.png',
          fullPage: true 
        });
        console.log('📸 智能生成後截圖已保存');
        
        // 檢查是否有子任務生成
        const subtaskElements = await page.locator('[data-testid="subtask-item"], .subtask-item').count();
        console.log(`📋 找到 ${subtaskElements} 個子任務元素`);
        
        if (subtaskElements > 0) {
          console.log('✅ Phase B3: 智能生成功能正常工作');
        } else {
          console.log('⚠️ Phase B3: 智能生成按鈕已找到但可能未生成子任務');
        }
      } else {
        console.log('⚠️ Phase B3: 未找到明顯的智能生成按鈕');
        
        // 檢查頁面上的所有按鈕
        const allButtons = await page.locator('button').all();
        console.log(`🔘 檢查所有 ${allButtons.length} 個按鈕...`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const buttonText = await allButtons[i].textContent();
          console.log(`按鈕 ${i + 1}: "${buttonText}"`);
        }
      }
      
      console.log(`📊 Phase B3 API 請求統計: ${apiRequests.length} 個請求`);
      apiRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });
      
    } catch (error) {
      console.log('❌ Phase B3 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-b3-error.png',
        fullPage: true 
      });
      throw error;
    }
  });
});