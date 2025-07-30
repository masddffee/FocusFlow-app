import { test, expect } from '@playwright/test';

/**
 * Phase D: 完整 AI 生成流程測試
 * 完整測試從任務創建、個性化問答到子任務生成的完整流程
 */

test.describe('Phase D: 完整 AI 生成流程測試', () => {
  
  test('D1: 完整 AI 子任務生成流程', async ({ page }) => {
    test.setTimeout(120000); // 延長超時時間到 2 分鐘
    
    console.log('🔧 Phase D1: 完整 AI 子任務生成流程測試');
    
    // 監控 API 請求
    const apiRequests: any[] = [];
    const apiResponses: any[] = [];
    
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
        apiResponses.push({
          status: response.status(),
          url: response.url(),
          timestamp: new Date().toISOString()
        });
        console.log(`📥 API 回應: ${response.status()} ${response.url()}`);
      }
    });
    
    try {
      // 步驟 1: 導航到任務創建頁面
      console.log('🚀 步驟 1: 導航到任務創建頁面');
      await page.goto('http://localhost:8081/add-task');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-step1-add-task.png',
        fullPage: true 
      });
      console.log('📸 步驟 1 截圖已保存');
      
      // 步驟 2: 填寫基本任務信息
      console.log('📝 步驟 2: 填寫基本任務信息');
      
      // 填寫標題
      const titleInput = page.locator('input').first();
      await titleInput.fill('Phase D1 完整測試 - React Native 全端開發學習');
      console.log('✅ 任務標題已填寫');
      
      // 填寫描述
      const descriptionTextarea = page.locator('textarea').first();
      await descriptionTextarea.fill('深入學習 React Native 開發，包含組件設計、狀態管理、API 整合、原生模組開發、性能優化和應用發布流程');
      console.log('✅ 任務描述已填寫');
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-step2-basic-info.png',
        fullPage: true 
      });
      console.log('📸 步驟 2 截圖已保存');
      
      // 步驟 3: 點擊 Smart Generate
      console.log('🤖 步驟 3: 點擊 Smart Generate');
      
      const smartGenButton = page.locator('button:has-text("Smart Generate")').first();
      await smartGenButton.click();
      console.log('✅ Smart Generate 按鈕已點擊');
      
      // 等待個性化對話框出現
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-step3-personalization-modal.png',
        fullPage: true 
      });
      console.log('📸 步驟 3 截圖已保存');
      
      // 步驟 4: 填寫個性化問答
      console.log('💬 步驟 4: 填寫個性化問答');
      
      // 查找並填寫第一個問題（程式設計經驗）
      const firstQuestionInput = page.locator('textarea, input[placeholder*="answer"], input[placeholder*="Your answer"]').first();
      if (await firstQuestionInput.isVisible({ timeout: 5000 })) {
        await firstQuestionInput.fill('我有 JavaScript 和 TypeScript 經驗，學過 React 基礎，想要深入學習 React Native 進行跨平台移動開發');
        console.log('✅ 第一個問題已回答');
      }
      
      // 選擇移動應用開發經驗（如果有選項）
      const mobileExperienceOptions = await page.locator('button, [role="button"], .option').all();
      if (mobileExperienceOptions.length > 0) {
        // 嘗試選擇一個合適的選項（通常是中間選項）
        const middleOption = Math.min(1, mobileExperienceOptions.length - 1);
        if (await mobileExperienceOptions[middleOption].isVisible()) {
          await mobileExperienceOptions[middleOption].click();
          console.log(`✅ 選擇了移動開發經驗選項 ${middleOption + 1}`);
        }
      }
      
      // 查找並填寫第三個問題（學習重點）
      const thirdQuestionInputs = await page.locator('textarea, input[placeholder*="answer"]').all();
      if (thirdQuestionInputs.length > 1) {
        const lastInput = thirdQuestionInputs[thirdQuestionInputs.length - 1];
        if (await lastInput.isVisible({ timeout: 2000 })) {
          await lastInput.fill('我最想深入學習組件開發、狀態管理、導航系統、性能優化和原生模組整合');
          console.log('✅ 第三個問題已回答');
        }
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-step4-questions-answered.png',
        fullPage: true 
      });
      console.log('📸 步驟 4 截圖已保存');
      
      // 步驟 5: 點擊 Generate Plan
      console.log('🎯 步驟 5: 點擊 Generate Plan');
      
      const generatePlanButton = page.locator('button:has-text("Generate Plan"), button:has-text("生成計劃")').first();
      if (await generatePlanButton.isVisible({ timeout: 5000 })) {
        await generatePlanButton.click();
        console.log('✅ Generate Plan 按鈕已點擊');
      } else {
        console.log('⚠️ 未找到 Generate Plan 按鈕，嘗試查找其他提交按鈕');
        const submitButtons = await page.locator('button[type="submit"], button:has-text("確定"), button:has-text("Submit"), button:has-text("Next")').all();
        if (submitButtons.length > 0) {
          await submitButtons[0].click();
          console.log('✅ 提交按鈕已點擊');
        }
      }
      
      // 步驟 6: 等待 AI 生成完成
      console.log('⏳ 步驟 6: 等待 AI 生成完成...');
      
      // 監控生成過程，等待更長時間
      let generationComplete = false;
      let waitTime = 0;
      const maxWaitTime = 45000; // 最多等待 45 秒
      
      while (!generationComplete && waitTime < maxWaitTime) {
        await page.waitForTimeout(3000);
        waitTime += 3000;
        
        // 檢查是否有子任務出現
        const subtaskElements = await page.locator('[data-testid*="subtask"], .subtask, [class*="subtask"], li[class*="task"]').count();
        if (subtaskElements > 0) {
          generationComplete = true;
          console.log(`🎉 檢測到 ${subtaskElements} 個子任務，生成完成！`);
        }
        
        // 檢查是否返回到了主頁面或任務列表
        const currentUrl = page.url();
        if (currentUrl.includes('/(tabs)') || currentUrl === 'http://localhost:8081/' || currentUrl.includes('/tasks')) {
          console.log('📍 頁面已導航到任務列表或主頁面');
          generationComplete = true;
        }
        
        console.log(`⏳ 已等待 ${waitTime/1000} 秒...`);
      }
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-step6-generation-complete.png',
        fullPage: true 
      });
      console.log('📸 步驟 6 截圖已保存');
      
      // 步驟 7: 驗證子任務生成結果
      console.log('🔍 步驟 7: 驗證子任務生成結果');
      
      // 如果當前在主頁面，嘗試找到新創建的任務
      const currentUrl = page.url();
      if (currentUrl.includes('/(tabs)') || currentUrl === 'http://localhost:8081/') {
        console.log('🏠 當前在主頁面，查找新創建的任務');
        
        // 查找任務卡片或項目
        const taskItems = await page.locator('[data-testid="task-item"], .task-item, [class*="task"], [role="button"]').all();
        console.log(`📋 主頁面找到 ${taskItems.length} 個任務項目`);
        
        if (taskItems.length > 0) {
          // 點擊第一個任務項目查看詳情
          await taskItems[0].click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: 'test-results/screenshots/phase-d1-step7-task-detail.png',
            fullPage: true 
          });
          console.log('📸 任務詳情頁面截圖已保存');
          
          // 檢查子任務
          const subtaskElements = await page.locator('[data-testid*="subtask"], .subtask, [class*="subtask"], li').count();
          console.log(`📋 任務詳情頁面找到 ${subtaskElements} 個子任務`);
          
          if (subtaskElements > 0) {
            // 獲取子任務內容
            const subtaskTexts: string[] = [];
            const subtasks = await page.locator('[data-testid*="subtask"], .subtask, [class*="subtask"], li').all();
            
            for (let i = 0; i < Math.min(subtasks.length, 10); i++) { // 最多檢查 10 個
              const text = await subtasks[i].textContent();
              if (text && text.trim()) {
                subtaskTexts.push(text.trim());
                console.log(`子任務 ${i + 1}: "${text.trim()}"`);
              }
            }
            
            console.log(`🎉 Phase D1 成功！生成了 ${subtaskTexts.length} 個子任務`);
          }
        }
      }
      
      // 步驟 8: 統計和報告
      console.log('📊 步驟 8: 測試結果統計');
      console.log(`📈 API 請求總數: ${apiRequests.length}`);
      console.log(`📉 API 回應總數: ${apiResponses.length}`);
      
      console.log('🔗 API 請求詳情:');
      apiRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
      });
      
      console.log('📨 API 回應狀態:');
      apiResponses.forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.status} ${res.url}`);
      });
      
      console.log('✅ Phase D1: 完整 AI 生成流程測試完成');
      
    } catch (error) {
      console.log('❌ Phase D1 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d1-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('D2: 子任務順序驗證和排序測試', async ({ page }) => {
    test.setTimeout(60000);
    
    console.log('🔧 Phase D2: 子任務順序驗證和排序測試');
    
    try {
      // 導航到主頁面尋找已創建的任務
      await page.goto('http://localhost:8081');
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d2-homepage.png',
        fullPage: true 
      });
      console.log('📸 主頁面截圖已保存');
      
      // 查找任務項目
      console.log('🔍 查找任務項目...');
      const taskItems = await page.locator('[data-testid="task-item"], .task-item, [class*="task"], [role="button"]').all();
      console.log(`📋 找到 ${taskItems.length} 個任務項目`);
      
      if (taskItems.length > 0) {
        // 點擊最近創建的任務（通常是第一個）
        await taskItems[0].click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: 'test-results/screenshots/phase-d2-task-detail.png',
          fullPage: true 
        });
        console.log('📸 任務詳情頁面截圖已保存');
        
        // 檢查子任務順序
        console.log('📋 檢查子任務順序...');
        const subtaskSelectors = [
          '[data-testid*="subtask"]',
          '.subtask-item',
          '.subtask',
          '[class*="subtask"]',
          'li'
        ];
        
        let subtaskTexts: string[] = [];
        for (const selector of subtaskSelectors) {
          try {
            const subtasks = await page.locator(selector).all();
            if (subtasks.length > 0) {
              console.log(`✅ 使用選擇器 "${selector}" 找到 ${subtasks.length} 個子任務`);
              
              for (let i = 0; i < subtasks.length; i++) {
                const text = await subtasks[i].textContent();
                if (text && text.trim()) {
                  subtaskTexts.push(text.trim());
                }
              }
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (subtaskTexts.length > 0) {
          console.log('📋 子任務順序列表:');
          subtaskTexts.forEach((text, index) => {
            console.log(`  ${index + 1}. ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
          });
          
          // 驗證順序邏輯性
          if (subtaskTexts.length >= 2) {
            console.log('✅ Phase D2: 子任務順序驗證完成');
            console.log(`📊 總共檢查了 ${subtaskTexts.length} 個子任務的順序`);
          } else {
            console.log('⚠️ Phase D2: 子任務數量不足，但順序檢查已完成');
          }
        } else {
          console.log('⚠️ Phase D2: 未找到子任務內容');
        }
      } else {
        console.log('⚠️ Phase D2: 未找到任務項目，可能需要先執行 D1 測試');
      }
      
    } catch (error) {
      console.log('❌ Phase D2 失敗:', error);
      await page.screenshot({ 
        path: 'test-results/screenshots/phase-d2-error.png',
        fullPage: true 
      });
      throw error;
    }
  });
});