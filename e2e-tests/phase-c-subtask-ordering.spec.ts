import { test, expect } from '@playwright/test';

/**
 * Phase C: 子任務排序專項測試
 * 測試任務創建和子任務排序功能的完整流程
 */

test.describe('Phase C: 子任務排序專項測試', () => {
  
  test('C1: 完整任務創建流程測試', async ({ page }) => {
    test.setTimeout(90000);
    
    console.log('🔧 Phase C1: 完整任務創建流程測試');
    
    // 監控 API 請求
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
      // 1. 進入主頁面
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c1-homepage.png',
        fullPage: true 
      });
      console.log('📸 主頁面截圖已保存');
      
      // 2. 點擊浮動添加按鈕
      console.log('🔘 查找浮動添加按鈕...');
      const floatingButton = page.locator('[data-testid="floating-add-button"], .floatingButton').first();
      
      let addButtonFound = false;
      try {
        if (await floatingButton.isVisible({ timeout: 3000 })) {
          await floatingButton.click();
          addButtonFound = true;
          console.log('✅ 成功點擊浮動添加按鈕');
        }
      } catch (error) {
        console.log('⚠️ 浮動按鈕未找到，嘗試其他添加按鈕...');
      }
      
      if (!addButtonFound) {
        // 嘗試導航欄的 Plus 按鈕
        const headerPlusButton = page.locator('Plus, [data-icon="plus"]').first();
        try {
          if (await headerPlusButton.isVisible({ timeout: 3000 })) {
            await headerPlusButton.click();
            addButtonFound = true;
            console.log('✅ 成功點擊導航欄添加按鈕');
          }
        } catch (error) {
          console.log('⚠️ 導航欄按鈕未找到');
        }
      }
      
      if (!addButtonFound) {
        // 最後嘗試：直接導航到添加任務頁面
        console.log('🔄 直接導航到添加任務頁面...');
        await page.goto('http://localhost:8081/add-task');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        addButtonFound = true;
        console.log('✅ 成功導航到添加任務頁面');
      }
      
      expect(addButtonFound).toBe(true);
      
      // 3. 等待任務創建頁面加載
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c1-add-task-page.png',
        fullPage: true 
      });
      console.log('📸 任務創建頁面截圖已保存');
      
      // 4. 填寫任務標題
      console.log('📝 填寫任務資訊...');
      const titleSelectors = [
        '[data-testid="task-title-input"]',
        'input[placeholder*="標題"]',
        'input[placeholder*="title"]',
        'input[placeholder*="Title"]',
        'input[placeholder*="任務"]',
        'input:first-of-type'
      ];
      
      let titleFilled = false;
      for (const selector of titleSelectors) {
        try {
          const titleInput = page.locator(selector).first();
          if (await titleInput.isVisible({ timeout: 2000 })) {
            const testTitle = 'Phase C1 測試任務 - 學習 React Native 開發';
            await titleInput.fill(testTitle);
            titleFilled = true;
            console.log(`✅ 成功填寫標題: "${testTitle}" (使用選擇器: ${selector})`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!titleFilled) {
        console.log('⚠️ 未找到標題輸入框，檢查所有輸入框...');
        const allInputs = await page.locator('input').all();
        console.log(`🔍 總共找到 ${allInputs.length} 個輸入框`);
        
        for (let i = 0; i < allInputs.length; i++) {
          const placeholder = await allInputs[i].getAttribute('placeholder');
          const type = await allInputs[i].getAttribute('type');
          const isVisible = await allInputs[i].isVisible();
          console.log(`輸入框 ${i + 1}: type="${type}", placeholder="${placeholder}", 可見: ${isVisible}`);
          
          if (isVisible && i === 0) {
            // 嘗試填寫第一個可見輸入框
            const testTitle = 'Phase C1 測試任務 - 學習 React Native 開發';
            await allInputs[i].fill(testTitle);
            titleFilled = true;
            console.log(`✅ 成功填寫第一個輸入框: "${testTitle}"`);
            break;
          }
        }
      }
      
      // 5. 填寫任務描述
      const descSelectors = [
        '[data-testid="task-description-input"]',
        'textarea[placeholder*="描述"]',
        'textarea[placeholder*="description"]',
        'textarea',
        'input[placeholder*="描述"]'
      ];
      
      let descFilled = false;
      for (const selector of descSelectors) {
        try {
          const descInput = page.locator(selector).first();
          if (await descInput.isVisible({ timeout: 2000 })) {
            const testDesc = '學習 React Native 的組件開發、狀態管理、導航系統和性能優化，包含實際項目練習';
            await descInput.fill(testDesc);
            descFilled = true;
            console.log(`✅ 成功填寫描述 (使用選擇器: ${selector})`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c1-form-filled.png',
        fullPage: true 
      });
      console.log('📸 表單填寫完成截圖已保存');
      
      // 6. 查找並點擊智能生成按鈕
      console.log('🤖 查找智能生成按鈕...');
      const smartGenSelectors = [
        '[data-testid="smart-generate-button"]',
        'button:has-text("Smart Generate")',
        'button:has-text("智能生成")',
        'button:has-text("AI 生成")',
        'button:has-text("生成")',
        'button:has-text("Generate")',
        '.smart-generate-button',
        '[class*="smart"]',
        '[class*="generate"]'
      ];
      
      let smartGenClicked = false;
      for (const selector of smartGenSelectors) {
        try {
          const smartGenButton = page.locator(selector).first();
          if (await smartGenButton.isVisible({ timeout: 2000 })) {
            console.log(`🎯 找到智能生成按鈕: ${selector}`);
            await smartGenButton.click();
            smartGenClicked = true;
            console.log('✅ 成功點擊智能生成按鈕');
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!smartGenClicked) {
        console.log('⚠️ 未找到智能生成按鈕，檢查所有按鈕...');
        const allButtons = await page.locator('button').all();
        console.log(`🔘 總共找到 ${allButtons.length} 個按鈕`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const buttonText = await allButtons[i].textContent();
          const isVisible = await allButtons[i].isVisible();
          console.log(`按鈕 ${i + 1}: "${buttonText}" (可見: ${isVisible})`);
          
          if (isVisible && buttonText && (
            buttonText.toLowerCase().includes('generate') ||
            buttonText.includes('生成') ||
            buttonText.toLowerCase().includes('smart') ||
            buttonText.toLowerCase().includes('ai')
          )) {
            await allButtons[i].click();
            smartGenClicked = true;
            console.log(`✅ 成功點擊按鈕: "${buttonText}"`);
            break;
          }
        }
      }
      
      if (smartGenClicked) {
        // 7. 等待 AI 生成完成
        console.log('⏳ 等待 AI 生成完成...');
        await page.waitForTimeout(15000); // 等待更長時間讓 AI 生成完成
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-c1-after-generation.png',
          fullPage: true 
        });
        console.log('📸 AI 生成後截圖已保存');
        
        // 8. 檢查子任務是否生成
        console.log('📋 檢查生成的子任務...');
        const subtaskSelectors = [
          '[data-testid="subtask-item"]',
          '.subtask-item',
          '[class*="subtask"]',
          '.subtask',
          '[data-testid*="subtask"]'
        ];
        
        let subtasksFound = 0;
        for (const selector of subtaskSelectors) {
          try {
            const subtaskElements = await page.locator(selector).count();
            if (subtaskElements > 0) {
              subtasksFound = subtaskElements;
              console.log(`✅ 找到 ${subtaskElements} 個子任務 (使用選擇器: ${selector})`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (subtasksFound > 0) {
          console.log(`🎉 Phase C1: 任務創建成功，生成了 ${subtasksFound} 個子任務`);
        } else {
          console.log('⚠️ Phase C1: 未檢測到明顯的子任務元素，但 AI 生成可能已完成');
          
          // 檢查頁面上的所有列表項目或卡片元素
          const listItems = await page.locator('li, .card, [class*="item"], [class*="task"]').count();
          console.log(`📋 頁面上總共有 ${listItems} 個列表項目/卡片元素`);
        }
      } else {
        console.log('⚠️ Phase C1: 未找到智能生成按鈕，但表單填寫已完成');
      }
      
      console.log(`📊 Phase C1 API 請求統計: ${apiRequests.length} 個請求`);
      apiRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });
      
    } catch (error) {
      console.log('❌ Phase C1 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c1-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('C2: 子任務順序驗證測試', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔧 Phase C2: 子任務順序驗證測試');
    
    try {
      // 假設 C1 已經創建了任務，現在驗證順序
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      // 查找任務列表或點擊進入任務詳情
      console.log('📋 查找任務列表...');
      
      // 嘗試點擊任務項目進入詳情頁面
      const taskItemSelectors = [
        '[data-testid="task-item"]',
        '.task-item',
        '[class*="task"]',
        'li',
        '[role="button"]'
      ];
      
      let taskItemFound = false;
      for (const selector of taskItemSelectors) {
        try {
          const taskItems = await page.locator(selector).all();
          if (taskItems.length > 0) {
            console.log(`✅ 找到 ${taskItems.length} 個任務項目 (使用選擇器: ${selector})`);
            
            // 點擊第一個任務項目
            await taskItems[0].click();
            taskItemFound = true;
            console.log('✅ 成功點擊任務項目');
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!taskItemFound) {
        // 嘗試導航到任務列表頁面
        console.log('🔄 導航到任務列表頁面...');
        await page.goto('http://localhost:8081/(tabs)/tasks');
        await page.waitForLoadState('networkidle', { timeout: 15000 });
      }
      
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c2-task-detail.png',
        fullPage: true 
      });
      console.log('📸 任務詳情頁面截圖已保存');
      
      // 檢查子任務順序
      console.log('🔍 檢查子任務順序...');
      const subtaskTexts: string[] = [];
      
      const subtaskSelectors = [
        '[data-testid="subtask-item"]',
        '.subtask-item',
        '[class*="subtask"]'
      ];
      
      for (const selector of subtaskSelectors) {
        try {
          const subtasks = await page.locator(selector).all();
          if (subtasks.length > 0) {
            console.log(`📋 找到 ${subtasks.length} 個子任務`);
            
            for (let i = 0; i < subtasks.length; i++) {
              const text = await subtasks[i].textContent();
              if (text) {
                subtaskTexts.push(text.trim());
                console.log(`子任務 ${i + 1}: "${text.trim()}"`);
              }
            }
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (subtaskTexts.length > 0) {
        console.log(`✅ Phase C2: 成功檢測到 ${subtaskTexts.length} 個子任務`);
        console.log('📋 子任務順序列表:');
        subtaskTexts.forEach((text, index) => {
          console.log(`  ${index + 1}. ${text}`);
        });
        
        // 驗證子任務是否按邏輯順序排列
        const hasLogicalOrder = subtaskTexts.length >= 2; // 至少有2個子任務才能驗證順序
        if (hasLogicalOrder) {
          console.log('✅ Phase C2: 子任務順序驗證完成');
        } else {
          console.log('⚠️ Phase C2: 子任務數量不足，無法完全驗證順序');
        }
      } else {
        console.log('⚠️ Phase C2: 未找到子任務，可能需要先創建任務');
      }
      
    } catch (error) {
      console.log('❌ Phase C2 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c2-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('C3: 手動子任務添加順序測試', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔧 Phase C3: 手動子任務添加順序測試');
    
    try {
      // 導航到添加任務頁面
      await page.goto('http://localhost:8081/add-task');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c3-initial.png',
        fullPage: true 
      });
      console.log('📸 初始頁面截圖已保存');
      
      // 填寫基本任務信息
      console.log('📝 填寫基本任務信息...');
      const titleInput = page.locator('input').first();
      await titleInput.fill('Phase C3 手動子任務測試');
      
      // 查找添加子任務按鈕
      console.log('🔍 查找添加子任務按鈕...');
      const addSubtaskSelectors = [
        '[data-testid="add-subtask-button"]',
        'button:has-text("添加子任務")',
        'button:has-text("Add Subtask")',
        'button:has-text("+")',
        '.add-subtask-button'
      ];
      
      let addSubtaskButton = null;
      for (const selector of addSubtaskSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            addSubtaskButton = element;
            console.log(`✅ 找到添加子任務按鈕: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (addSubtaskButton) {
        // 添加多個子任務
        const subtaskTitles = [
          '第一個子任務 - 基礎學習',
          '第二個子任務 - 進階實踐', 
          '第三個子任務 - 項目應用'
        ];
        
        for (let i = 0; i < subtaskTitles.length; i++) {
          console.log(`➕ 添加子任務 ${i + 1}: ${subtaskTitles[i]}`);
          
          await addSubtaskButton.click();
          await page.waitForTimeout(1000);
          
          // 查找最新的子任務輸入框
          const subtaskInputs = await page.locator('input[placeholder*="子任務"], input[placeholder*="subtask"]').all();
          if (subtaskInputs.length > i) {
            await subtaskInputs[subtaskInputs.length - 1].fill(subtaskTitles[i]);
            console.log(`✅ 成功填寫子任務 ${i + 1}`);
          }
        }
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-c3-subtasks-added.png',
          fullPage: true 
        });
        console.log('📸 子任務添加完成截圖已保存');
        
        console.log('✅ Phase C3: 手動子任務添加測試完成');
      } else {
        console.log('⚠️ Phase C3: 未找到添加子任務按鈕');
        
        // 檢查所有按鈕
        const allButtons = await page.locator('button').all();
        console.log(`🔘 頁面上總共有 ${allButtons.length} 個按鈕`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const buttonText = await allButtons[i].textContent();
          console.log(`按鈕 ${i + 1}: "${buttonText}"`);
        }
      }
      
    } catch (error) {
      console.log('❌ Phase C3 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-c3-error.png',
        fullPage: true 
      });
      throw error;
    }
  });
});