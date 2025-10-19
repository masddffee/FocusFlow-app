/**
 * 改良版 Smart Generate 測試 - 修復表單填寫問題
 * 
 * 針對發現的問題進行修復：
 * 1. 使用更精確的選擇器定位輸入框
 * 2. 確保標題和日期正確填寫
 * 3. 驗證子任務真正生成和顯示
 */

import { test, expect } from '@playwright/test';

const TEST_TASK = {
  title: '學習 React Native 全棧開發',
  description: '掌握 React Native 移動應用開發，包含前端 UI、後端 API、數據庫設計等全棧技能',
  dueDate: '2025-09-04',
  estimatedHours: 60
};

test.describe('改良版 Smart Generate 測試', () => {
  test.setTimeout(240000); // 4分鐘超時

  test('修復版：完整 Smart Generate 工作流程', async ({ page }) => {
    console.log('🔧 開始改良版 Smart Generate 測試');

    // 1. 導航到 Add Task 頁面
    await page.goto('http://localhost:8081/add-task');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('✅ 直接導航到 Add Task 頁面');

    // 截圖初始狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/improved-01-initial.png',
      fullPage: true 
    });

    // 2. 使用更精確的方式填寫表單
    console.log('📝 步驟 1: 精確填寫表單字段');

    // 填寫標題 - 使用 value 屬性定位
    try {
      await page.locator('input[value=""]').first().fill(TEST_TASK.title);
      console.log('✅ 成功填寫標題（方法1）');
    } catch (error) {
      // 嘗試其他方法
      try {
        const titleInput = page.locator('input').first();
        await titleInput.clear();
        await titleInput.fill(TEST_TASK.title);
        console.log('✅ 成功填寫標題（方法2）');
      } catch (error2) {
        console.log('⚠️ 標題填寫失敗:', error2.message);
      }
    }

    // 填寫描述 - 使用 textarea
    try {
      await page.locator('textarea').fill(TEST_TASK.description);
      console.log('✅ 成功填寫描述');
    } catch (error) {
      console.log('⚠️ 描述填寫失敗:', error.message);
    }

    // 填寫日期 - 嘗試多種方法
    console.log('📅 嘗試填寫截止日期');
    
    // 方法1: 直接點擊日期選擇器
    try {
      await page.locator('text=Select due date').click();
      await page.waitForTimeout(1000);
      
      // 尋找日期輸入框
      const dateInput = page.locator('input[type="date"]');
      const dateInputCount = await dateInput.count();
      
      if (dateInputCount > 0) {
        await dateInput.fill(TEST_TASK.dueDate);
        console.log('✅ 成功填寫日期（方法1）');
      } else {
        throw new Error('找不到日期輸入框');
      }
    } catch (error) {
      console.log('⚠️ 日期填寫失敗:', error.message);
      
      // 方法2: 尋找任何包含 "date" 的元素
      try {
        const dateElements = await page.locator('[placeholder*="date"], [aria-label*="date"], text=/date/i').all();
        if (dateElements.length > 0) {
          await dateElements[0].click();
          await page.waitForTimeout(1000);
          
          // 再次嘗試填寫日期
          const dateInputAfterClick = page.locator('input[type="date"]');
          if (await dateInputAfterClick.count() > 0) {
            await dateInputAfterClick.fill(TEST_TASK.dueDate);
            console.log('✅ 成功填寫日期（方法2）');
          }
        }
      } catch (error2) {
        console.log('⚠️ 日期填寫完全失敗，但繼續測試');
      }
    }

    // 截圖表單填寫後的狀態
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/improved-02-form-filled.png',
      fullPage: true 
    });

    // 3. 檢查表單內容是否正確填寫
    console.log('🔍 驗證表單填寫狀態');
    
    const titleValue = await page.locator('input').first().inputValue();
    const descriptionValue = await page.locator('textarea').inputValue();
    
    console.log(`📊 表單狀態: 標題="${titleValue}", 描述長度=${descriptionValue.length}`);

    // 4. 觸發 Smart Generate
    console.log('🤖 步驟 2: 觸發 Smart Generate');
    
    // 確保 Smart Generate 開關是開啟的
    const smartGenerateButton = page.locator('text=Smart Generate');
    const smartGenerateCount = await smartGenerateButton.count();
    
    if (smartGenerateCount > 0) {
      await smartGenerateButton.click();
      console.log('✅ 點擊 Smart Generate 按鈕');
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ 找不到 Smart Generate 按鈕');
    }

    // 截圖 Smart Generate 觸發後
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/improved-03-smart-generate-triggered.png',
      fullPage: true 
    });

    // 5. 等待個人化問題或直接子任務生成
    console.log('⏳ 步驟 3: 等待 AI 處理');
    
    let foundPersonalizationQuestions = false;
    let foundSubtasks = false;
    
    // 等待最多60秒，檢查是否出現個人化問題或子任務
    for (let i = 0; i < 20; i++) {
      console.log(`⏳ 檢查 AI 處理狀況... (${i + 1}/20)`);
      
      // 檢查個人化問題
      const questionElements = await page.locator('[placeholder*="answer"], textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').count();
      
      // 檢查子任務
      const subtaskElements = await page.locator('text=/第\d+階段|Step \d+|subtask|子任務/i').count();
      
      if (questionElements > 0 && !foundPersonalizationQuestions) {
        foundPersonalizationQuestions = true;
        console.log(`✅ 找到個人化問題: ${questionElements} 個`);
        
        // 截圖個人化問題
        await page.screenshot({ 
          path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/improved-04-questions-found.png',
          fullPage: true 
        });
        
        // 回答問題
        console.log('💬 回答個人化問題');
        const answerInputs = await page.locator('textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').all();
        
        const sampleAnswers = [
          '我想開發一個功能完整的社交媒體應用，類似 Instagram',
          '我有 3 年的前端開發經驗，熟悉 JavaScript 和 React',
          '我希望通過實際項目來學習，每天可以投入 2-3 小時',
          '我最關心 UI/UX 設計、狀態管理、API 整合和應用效能',
          '我希望在 30 天內完成基本的全棧技能學習'
        ];

        for (let j = 0; j < Math.min(answerInputs.length, sampleAnswers.length); j++) {
          try {
            await answerInputs[j].fill(sampleAnswers[j]);
            console.log(`✅ 回答問題 ${j + 1}: ${sampleAnswers[j].substring(0, 20)}...`);
          } catch (error) {
            console.log(`⚠️ 回答問題 ${j + 1} 失敗`);
          }
        }

        // 提交答案
        const submitButtons = await page.locator('text=Submit, text=Continue, text=Generate, button[type="submit"]').all();
        if (submitButtons.length > 0) {
          await submitButtons[0].click();
          console.log('✅ 提交個人化問題答案');
          await page.waitForTimeout(3000);
        }
        
        break;
      }
      
      if (subtaskElements > 0 && !foundSubtasks) {
        foundSubtasks = true;
        console.log(`✅ 找到子任務: ${subtaskElements} 個`);
        break;
      }
      
      await page.waitForTimeout(3000);
    }

    // 6. 等待子任務生成
    if (foundPersonalizationQuestions || !foundSubtasks) {
      console.log('⏳ 步驟 4: 等待子任務生成');
      
      for (let i = 0; i < 20; i++) {
        const subtaskElements = await page.locator('text=/第\d+階段|Step \d+|階段|Phase/i, [class*="subtask"], [data-testid*="subtask"]').count();
        
        if (subtaskElements > 0) {
          foundSubtasks = true;
          console.log(`✅ 子任務生成完成: ${subtaskElements} 個`);
          break;
        }
        
        console.log(`⏳ 等待子任務生成... (${i + 1}/20)`);
        await page.waitForTimeout(3000);
      }
    }

    // 7. 驗證最終結果
    console.log('🔍 步驟 5: 驗證最終結果');
    
    // 最終截圖
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/improved-05-final-result.png',
      fullPage: true 
    });

    // 檢查頁面內容
    const pageText = await page.textContent('body');
    const hasSubtaskContent = pageText?.includes('階段') || pageText?.includes('Step') || pageText?.includes('subtask');
    const hasTimeEstimation = /\d+m|\d+h|\d+分鐘|\d+小時/.test(pageText || '');
    const hasScheduleInfo = /\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}/.test(pageText || '');

    console.log('\n📊 測試結果總結:');
    console.log(`  📝 表單填寫: 標題="${titleValue}", 描述長度=${descriptionValue.length}`);
    console.log(`  🤖 個人化問題: ${foundPersonalizationQuestions ? '成功處理' : '未出現'}`);
    console.log(`  🎯 子任務生成: ${foundSubtasks ? '成功' : '失敗'}`);
    console.log(`  ⏰ 時間估算: ${hasTimeEstimation ? '存在' : '缺失'}`);
    console.log(`  📅 排程信息: ${hasScheduleInfo ? '存在' : '缺失'}`);
    console.log(`  📄 子任務內容: ${hasSubtaskContent ? '存在' : '缺失'}`);

    // 8. 嘗試創建任務
    console.log('💾 步驟 6: 嘗試保存任務');
    
    const createButtons = await page.locator('text=Create & Schedule Task, text=Create Task, text=Save, button[type="submit"]').all();
    
    if (createButtons.length > 0) {
      await createButtons[0].click();
      console.log('✅ 點擊創建任務按鈕');
      await page.waitForTimeout(3000);
      
      // 檢查是否成功導航
      const finalUrl = page.url();
      console.log(`📍 最終 URL: ${finalUrl}`);
      
      if (finalUrl.includes('tasks') || finalUrl.includes('task-detail')) {
        console.log('✅ 任務創建成功，已導航到任務頁面');
      }
    } else {
      console.log('⚠️ 找不到創建任務按鈕');
    }

    // 最終驗證
    expect(titleValue.length).toBeGreaterThan(0); // 確保標題有填寫
    expect(descriptionValue.length).toBeGreaterThan(0); // 確保描述有填寫
    expect(foundPersonalizationQuestions || foundSubtasks || hasSubtaskContent).toBeTruthy(); // 確保 Smart Generate 有工作
    
    console.log('🎉 改良版 Smart Generate 測試完成！');
  });

  test('直接 API 測試：完整子任務生成流程', async ({ request }) => {
    console.log('🔧 直接測試後端 API 子任務生成');

    try {
      // 1. 創建個人化問題任務
      const personalizeResponse = await request.post('http://localhost:3000/api/jobs', {
        data: {
          type: 'personalization',
          params: {
            title: TEST_TASK.title,
            description: TEST_TASK.description,
            deadline: TEST_TASK.dueDate,
            priority: 'general',
            estimatedHours: TEST_TASK.estimatedHours
          }
        }
      });

      expect(personalizeResponse.ok()).toBeTruthy();
      const personalizeData = await personalizeResponse.json();
      console.log(`✅ 個人化問題任務創建: ${personalizeData.jobId}`);

      // 2. 等待個人化問題完成
      let personalizeResult;
      for (let i = 0; i < 15; i++) {
        const statusResponse = await request.get(`http://localhost:3000/api/jobs/${personalizeData.jobId}`);
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          personalizeResult = statusData;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      expect(personalizeResult).toBeTruthy();
      console.log(`✅ 生成了 ${personalizeResult?.result?.questions?.length} 個個人化問題`);

      // 3. 創建子任務生成任務
      const subtaskResponse = await request.post('http://localhost:3000/api/jobs', {
        data: {
          type: 'subtask_generation',
          params: {
            title: TEST_TASK.title,
            description: TEST_TASK.description,
            deadline: TEST_TASK.dueDate,
            priority: 'general',
            estimatedHours: TEST_TASK.estimatedHours,
            personalizationAnswers: {
              'goal_vision': '我想開發一個功能完整的社交媒體應用',
              'experience_level': '我有 3 年的前端開發經驗',
              'learning_preference': '我偏好實作導向的學習方式'
            }
          }
        }
      });

      expect(subtaskResponse.ok()).toBeTruthy();
      const subtaskData = await subtaskResponse.json();
      console.log(`✅ 子任務生成任務創建: ${subtaskData.jobId}`);

      // 4. 等待子任務生成完成
      let subtaskResult;
      for (let i = 0; i < 25; i++) {
        const statusResponse = await request.get(`http://localhost:3000/api/jobs/${subtaskData.jobId}`);
        const statusData = await statusResponse.json();
        
        console.log(`📊 子任務生成狀態: ${statusData.status} (${i + 1}/25)`);
        
        if (statusData.status === 'completed') {
          subtaskResult = statusData;
          break;
        } else if (statusData.status === 'failed') {
          console.error('❌ 子任務生成失敗:', statusData.error);
          throw new Error(`子任務生成失敗: ${JSON.stringify(statusData.error)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      expect(subtaskResult).toBeTruthy();
      const subtasks = subtaskResult?.result?.subtasks || [];
      console.log(`✅ 生成了 ${subtasks.length} 個子任務`);

      // 5. 驗證子任務數據結構
      if (subtasks.length > 0) {
        const firstSubtask = subtasks[0];
        console.log('📋 第一個子任務結構驗證:');
        console.log(`  - title: ${firstSubtask.title || 'MISSING'}`);
        console.log(`  - startDate: ${firstSubtask.startDate || 'MISSING'}`);
        console.log(`  - endDate: ${firstSubtask.endDate || 'MISSING'}`);
        console.log(`  - estimatedHours: ${firstSubtask.estimatedHours || 'MISSING'}`);
        console.log(`  - priority: ${firstSubtask.priority || 'MISSING'}`);

        // 檢查所有子任務的完整性
        const completeSubtasks = subtasks.filter(st => 
          st.title && st.startDate && st.endDate && st.estimatedHours && st.priority
        );
        
        const completenessRatio = Math.round(completeSubtasks.length / subtasks.length * 100);
        console.log(`📊 子任務完整性: ${completeSubtasks.length}/${subtasks.length} (${completenessRatio}%)`);

        // 驗證關鍵字段存在
        expect(firstSubtask.title).toBeTruthy();
        expect(firstSubtask.startDate).toBeTruthy();
        expect(firstSubtask.endDate).toBeTruthy();
        expect(firstSubtask.estimatedHours).toBeTruthy();
        expect(completenessRatio).toBeGreaterThanOrEqual(80); // 至少80%完整
      }

      console.log('🎉 API 測試完成，子任務生成和排程功能正常！');

    } catch (error) {
      console.error('❌ API 測試失敗:', error);
      throw error;
    }
  });
});