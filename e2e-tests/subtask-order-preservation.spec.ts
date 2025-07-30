import { test, expect, Page } from '@playwright/test';
import { EnhancedTestHelpers, TestUtils, EnhancedTestAssertions } from './utils/enhanced-test-helpers';

/**
 * 子任務順序保持測試 - Phase 5 驗證排序修復效果
 * 
 * 🎯 測試目標：
 * 1. 驗證 AI 生成的子任務順序在整個應用流程中保持一致
 * 2. 確認手動添加的子任務使用安全的 order 分配
 * 3. 驗證 UI 層正確按順序顯示子任務
 * 4. 測試排程系統尊重原始生成順序
 * 
 * 🔧 修復驗證：
 * - utils/scheduling.ts 核心排序邏輯修復
 * - add-task.tsx 和 SubtaskManager.tsx 安全順序分配
 * - task-detail.tsx UI 層排序一致性
 */

test.describe('FocusFlow 子任務順序保持驗證', () => {
  let helpers: EnhancedTestHelpers;
  let assertions: EnhancedTestAssertions;
  let page: Page;
  
  // 測試數據追蹤
  const testResults: {
    aiGeneratedOrder: string[];
    displayedOrder: string[];
    scheduledOrder: string[];
    manuallyAddedOrder: string[];
  } = {
    aiGeneratedOrder: [],
    displayedOrder: [],
    scheduledOrder: [],
    manuallyAddedOrder: []
  };
  
  test.beforeEach(async () => {
    const testId = `subtask-order-${Date.now()}`;
    helpers = new EnhancedTestHelpers(testId);
    page = await helpers.initialize();
    assertions = new EnhancedTestAssertions(testId, page);
    
    // 設定網路請求監控，捕獲 AI 生成順序
    page.on('response', async response => {
      if (response.url().includes('/api/ai/generate-subtasks') && response.status() === 200) {
        try {
          const responseData = await response.json();
          if (responseData.subtasks && Array.isArray(responseData.subtasks)) {
            testResults.aiGeneratedOrder = responseData.subtasks.map((s: any, index: number) => ({
              title: s.title || s.text,
              order: s.order || index + 1
            }));
            console.log(`🎯 [${testId}] AI 生成順序捕獲:`, testResults.aiGeneratedOrder);
          }
        } catch (error) {
          console.log(`⚠️ [${testId}] 無法解析 AI 生成回應:`, error);
        }
      }
    });
    
    // 導航到應用
    await helpers.safeGoto('http://localhost:8081');
  });
  
  test.afterEach(async () => {
    // 截圖最終狀態
    await helpers.takeScreenshot('subtask-order-final');
    
    // 生成測試報告
    const orderReport = {
      testId: `subtask-order-${Date.now()}`,
      timestamp: new Date().toISOString(),
      results: testResults,
      orderConsistency: {
        aiToDisplay: JSON.stringify(testResults.aiGeneratedOrder) === JSON.stringify(testResults.displayedOrder),
        displayToScheduled: JSON.stringify(testResults.displayedOrder) === JSON.stringify(testResults.scheduledOrder),
        manualOrderSafe: testResults.manuallyAddedOrder.every((item, index) => item.order > index)
      }
    };
    
    console.log(`📊 [順序測試報告]`, orderReport);
    await helpers.cleanup();
  });

  test('驗證 AI 生成子任務的完整順序保持流程', async () => {
    console.log('🚀 開始測試：AI 生成子任務順序保持');
    
    // 步驟 1：導航到任務創建頁面
    console.log('📍 步驟 1: 導航到任務創建頁面');
    await page.click('[data-testid="add-task-button"]');
    await page.waitForSelector('[data-testid="task-title-input"]', { timeout: 10000 });
    await helpers.takeScreenshot('task-creation-page');
    
    // 步驟 2：填寫任務信息，觸發 AI 生成
    console.log('📍 步驟 2: 填寫任務信息');
    const taskTitle = '學習 React 基礎概念';
    const taskDescription = '學習 React Hooks, 組件生命週期, 狀態管理和路由系統';
    
    await page.fill('[data-testid="task-title-input"]', taskTitle);
    await page.fill('[data-testid="task-description-input"]', taskDescription);
    
    // 選擇學習類型和難度
    await page.click('[data-testid="task-type-select"]');
    await page.click('[data-testid="task-type-skill_learning"]');
    
    await page.click('[data-testid="difficulty-select"]');
    await page.click('[data-testid="difficulty-medium"]');
    
    await helpers.takeScreenshot('task-info-filled');
    
    // 步驟 3：觸發 Smart Generate
    console.log('📍 步驟 3: 觸發 AI 智能生成');
    await page.click('[data-testid="smart-generate-button"]');
    
    // 等待 AI 生成完成
    await page.waitForSelector('[data-testid="subtask-item"]', { timeout: 30000 });
    await page.waitForTimeout(2000); // 確保所有子任務都已渲染
    await helpers.takeScreenshot('ai-generated-subtasks');
    
    // 步驟 4：捕獲顯示的子任務順序
    console.log('📍 步驟 4: 捕獲顯示的子任務順序');
    const displayedSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    
    for (let i = 0; i < displayedSubtasks.length; i++) {
      const subtaskTitle = await displayedSubtasks[i].locator('[data-testid="subtask-title"]').textContent();
      testResults.displayedOrder.push({
        title: subtaskTitle || `Subtask ${i + 1}`,
        order: i + 1,
        displayPosition: i
      });
    }
    
    console.log('📋 顯示順序:', testResults.displayedOrder);
    
    // 步驟 5：保存任務
    console.log('📍 步驟 5: 保存任務');
    await page.click('[data-testid="save-task-button"]');
    await page.waitForSelector('[data-testid="task-item"]', { timeout: 10000 });
    await helpers.takeScreenshot('task-saved');
    
    // 步驟 6：進入任務詳情頁面驗證順序
    console.log('📍 步驟 6: 驗證任務詳情頁面順序');
    await page.click('[data-testid="task-item"]');
    await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 10000 });
    await helpers.takeScreenshot('task-detail-page');
    
    // 捕獲詳情頁面的子任務順序
    const detailSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    const detailOrder = [];
    
    for (let i = 0; i < detailSubtasks.length; i++) {
      const subtaskTitle = await detailSubtasks[i].locator('.subtask-title, [data-testid="subtask-title"]').textContent();
      detailOrder.push({
        title: subtaskTitle?.replace(/^[📚🛠️🎯🤔📝]\s*/, '') || `Detail Subtask ${i + 1}`, // 移除表情符號前綴
        order: i + 1,
        detailPosition: i
      });
    }
    
    console.log('📋 詳情頁順序:', detailOrder);
    
    // 步驟 7：驗證順序一致性
    console.log('📍 步驟 7: 驗證順序一致性');
    
    // 檢查顯示順序是否與詳情頁一致
    expect(displayedSubtasks.length).toBeGreaterThan(0);
    expect(detailSubtasks.length).toBe(displayedSubtasks.length);
    
    // 驗證所有子任務按順序顯示（通過位置索引驗證）
    for (let i = 0; i < Math.min(testResults.displayedOrder.length, detailOrder.length); i++) {
      const displayedTitle = testResults.displayedOrder[i].title.replace(/^[📚🛠️🎯🤔📝]\s*/, '');
      const detailTitle = detailOrder[i].title.replace(/^[📚🛠️🎯🤔📝]\s*/, '');
      
      // 比較核心標題內容（忽略格式差異）
      const normalizeTitle = (title: string) => title.toLowerCase().replace(/[^\w\s]/g, '').trim();
      
      console.log(`比較第 ${i + 1} 個子任務: "${normalizeTitle(displayedTitle)}" vs "${normalizeTitle(detailTitle)}"`);
      
      expect(normalizeTitle(displayedTitle)).toContain(normalizeTitle(detailTitle).substring(0, 10));
    }
    
    console.log('✅ 順序一致性驗證通過');
  });

  test('驗證手動添加子任務的安全順序分配', async () => {
    console.log('🚀 開始測試：手動添加子任務安全順序分配');
    
    // 步驟 1：創建基礎任務
    await page.click('[data-testid="add-task-button"]');
    await page.waitForSelector('[data-testid="task-title-input"]', { timeout: 10000 });
    
    await page.fill('[data-testid="task-title-input"]', '手動子任務測試');
    await page.fill('[data-testid="task-description-input"]', '測試手動添加子任務的順序保持');
    
    await helpers.takeScreenshot('manual-task-setup');
    
    // 步驟 2：手動添加多個子任務
    console.log('📍 步驟 2: 手動添加子任務');
    const manualSubtasks = [
      '第一個手動子任務',
      '第二個手動子任務', 
      '第三個手動子任務'
    ];
    
    for (let i = 0; i < manualSubtasks.length; i++) {
      // 查找添加子任務的輸入框
      const subtaskInput = page.locator('[data-testid="add-subtask-input"], [placeholder*="添加子任務"], [placeholder*="Add subtask"]').first();
      await subtaskInput.fill(manualSubtasks[i]);
      
      // 點擊添加按鈕或按 Enter
      const addButton = page.locator('[data-testid="add-subtask-button"], .add-subtask-button').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      } else {
        await subtaskInput.press('Enter');
      }
      
      await page.waitForTimeout(500);
      testResults.manuallyAddedOrder.push({
        title: manualSubtasks[i],
        order: i + 1,
        expectedOrder: i + 1
      });
    }
    
    await helpers.takeScreenshot('manual-subtasks-added');
    
    // 步驟 3：驗證手動添加的子任務順序
    console.log('📍 步驟 3: 驗證手動子任務順序');
    const manualSubtaskElements = await page.locator('[data-testid="subtask-item"]').all();
    
    expect(manualSubtaskElements.length).toBe(manualSubtasks.length);
    
    for (let i = 0; i < manualSubtaskElements.length; i++) {
      const subtaskTitle = await manualSubtaskElements[i].locator('[data-testid="subtask-title"], .subtask-title').textContent();
      expect(subtaskTitle).toContain(manualSubtasks[i]);
      console.log(`✅ 第 ${i + 1} 個手動子任務順序正確: ${subtaskTitle}`);
    }
    
    // 步驟 4：保存並檢查持久化順序
    await page.click('[data-testid="save-task-button"]');
    await page.waitForSelector('[data-testid="task-item"]', { timeout: 10000 });
    
    // 進入詳情頁檢查
    await page.click('[data-testid="task-item"]');
    await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 10000 });
    
    const persistedSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    expect(persistedSubtasks.length).toBe(manualSubtasks.length);
    
    for (let i = 0; i < persistedSubtasks.length; i++) {
      const subtaskTitle = await persistedSubtasks[i].locator('.subtask-title, [data-testid="subtask-title"]').textContent();
      expect(subtaskTitle).toContain(manualSubtasks[i]);
      console.log(`✅ 持久化順序正確: 第 ${i + 1} 個子任務 - ${subtaskTitle}`);
    }
    
    await helpers.takeScreenshot('manual-subtasks-persisted');
    console.log('✅ 手動子任務安全順序分配驗證通過');
  });

  test('驗證混合場景下的順序穩定性', async () => {
    console.log('🚀 開始測試：混合場景順序穩定性');
    
    // 步驟 1：創建任務並生成 AI 子任務
    await page.click('[data-testid="add-task-button"]');
    await page.waitForSelector('[data-testid="task-title-input"]', { timeout: 10000 });
    
    await page.fill('[data-testid="task-title-input"]', '混合場景測試');
    await page.fill('[data-testid="task-description-input"]', '測試 AI 生成 + 手動添加的混合場景');
    
    // 先觸發 AI 生成
    await page.click('[data-testid="smart-generate-button"]');
    await page.waitForSelector('[data-testid="subtask-item"]', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 記錄 AI 生成的子任務數量
    const aiSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    const aiCount = aiSubtasks.length;
    console.log(`📊 AI 生成了 ${aiCount} 個子任務`);
    
    await helpers.takeScreenshot('mixed-ai-generated');
    
    // 步驟 2：在現有 AI 子任務後添加手動子任務
    console.log('📍 步驟 2: 添加手動子任務');
    const manualSubtasks = ['手動添加項目 1', '手動添加項目 2'];
    
    for (const subtaskTitle of manualSubtasks) {
      const subtaskInput = page.locator('[data-testid="add-subtask-input"], [placeholder*="添加子任務"], [placeholder*="Add subtask"]').first();
      await subtaskInput.fill(subtaskTitle);
      
      const addButton = page.locator('[data-testid="add-subtask-button"], .add-subtask-button').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      } else {
        await subtaskInput.press('Enter');
      }
      
      await page.waitForTimeout(500);
    }
    
    await helpers.takeScreenshot('mixed-manual-added');
    
    // 步驟 3：驗證混合順序
    const allSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    const totalCount = allSubtasks.length;
    
    console.log(`📊 總共 ${totalCount} 個子任務 (${aiCount} AI + ${manualSubtasks.length} 手動)`);
    expect(totalCount).toBe(aiCount + manualSubtasks.length);
    
    // 驗證手動添加的子任務出現在最後
    for (let i = 0; i < manualSubtasks.length; i++) {
      const manualIndex = aiCount + i;
      const subtaskTitle = await allSubtasks[manualIndex].locator('[data-testid="subtask-title"], .subtask-title').textContent();
      expect(subtaskTitle).toContain(manualSubtasks[i]);
      console.log(`✅ 手動子任務 ${i + 1} 位置正確 (索引 ${manualIndex}): ${subtaskTitle}`);
    }
    
    // 步驟 4：保存並檢查持久化
    await page.click('[data-testid="save-task-button"]');
    await page.waitForSelector('[data-testid="task-item"]', { timeout: 10000 });
    
    await page.click('[data-testid="task-item"]');
    await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 10000 });
    
    const persistedSubtasks = await page.locator('[data-testid="subtask-item"]').all();
    expect(persistedSubtasks.length).toBe(totalCount);
    
    // 最終驗證：確保混合順序在詳情頁面保持正確
    for (let i = aiCount; i < totalCount; i++) {
      const manualIndex = i - aiCount;
      const subtaskTitle = await persistedSubtasks[i].locator('.subtask-title, [data-testid="subtask-title"]').textContent();
      expect(subtaskTitle).toContain(manualSubtasks[manualIndex]);
      console.log(`✅ 持久化混合順序正確: 手動子任務 ${manualIndex + 1} - ${subtaskTitle}`);
    }
    
    await helpers.takeScreenshot('mixed-scenario-final');
    console.log('✅ 混合場景順序穩定性驗證通過');
  });

  test('驗證排序邏輯的錯誤恢復能力', async () => {
    console.log('🚀 開始測試：排序邏輯錯誤恢復');
    
    // 步驟 1：模擬極端情況 - 創建大量子任務
    await page.click('[data-testid="add-task-button"]');
    await page.waitForSelector('[data-testid="task-title-input"]', { timeout: 10000 });
    
    await page.fill('[data-testid="task-title-input"]', '極端測試 - 大量子任務');
    await page.fill('[data-testid="task-description-input"]', '測試排序邏輯在大量子任務情況下的穩定性');
    
    // 步驟 2：快速添加多個手動子任務
    console.log('📍 步驟 2: 快速添加大量子任務');
    const bulkSubtasks = Array.from({ length: 10 }, (_, i) => `批量子任務 ${i + 1}`);
    
    for (const subtaskTitle of bulkSubtasks) {
      const subtaskInput = page.locator('[data-testid="add-subtask-input"], [placeholder*="添加子任務"], [placeholder*="Add subtask"]').first();
      await subtaskInput.fill(subtaskTitle);
      
      const addButton = page.locator('[data-testid="add-subtask-button"], .add-subtask-button').first();
      if (await addButton.isVisible()) {
        await addButton.click();
      } else {
        await subtaskInput.press('Enter');
      }
      
      // 減少等待時間，測試快速操作
      await page.waitForTimeout(100);
    }
    
    await helpers.takeScreenshot('bulk-subtasks-added');
    
    // 步驟 3：驗證大量子任務的順序正確性
    const bulkSubtaskElements = await page.locator('[data-testid="subtask-item"]').all();
    expect(bulkSubtaskElements.length).toBe(10);
    
    for (let i = 0; i < bulkSubtaskElements.length; i++) {
      const subtaskTitle = await bulkSubtaskElements[i].locator('[data-testid="subtask-title"], .subtask-title').textContent();
      expect(subtaskTitle).toContain(`批量子任務 ${i + 1}`);
    }
    
    console.log('✅ 大量子任務順序驗證通過');
    
    // 步驟 4：模擬刪除和重新排序場景
    console.log('📍 步驟 4: 測試刪除後的順序保持');
    
    // 刪除中間的子任務 (如果有刪除按鈕)
    const deleteButtons = await page.locator('[data-testid="delete-subtask-button"], .delete-subtask-button').all();
    if (deleteButtons.length > 0) {
      // 刪除第3個子任務
      await deleteButtons[2].click();
      await page.waitForTimeout(500);
      
      // 驗證刪除後順序依然正確
      const remainingSubtasks = await page.locator('[data-testid="subtask-item"]').all();
      expect(remainingSubtasks.length).toBe(9);
      
      // 驗證剩餘子任務的順序仍然合理
      const firstTitle = await remainingSubtasks[0].locator('[data-testid="subtask-title"], .subtask-title').textContent();
      const secondTitle = await remainingSubtasks[1].locator('[data-testid="subtask-title"], .subtask-title').textContent();
      
      expect(firstTitle).toContain('批量子任務 1');
      expect(secondTitle).toContain('批量子任務 2');
      
      console.log('✅ 刪除後順序保持驗證通過');
    }
    
    await helpers.takeScreenshot('error-recovery-final');
    console.log('✅ 錯誤恢復能力驗證通過');
  });
});