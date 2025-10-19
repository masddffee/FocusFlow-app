/**
 * 增強版 MCP 現實驗證測試
 * 
 * 這個測試專門用於檢測之前 MCP 測試的假陽性問題
 * 重點驗證：
 * 1. 後端 API 實際返回的數據結構
 * 2. 前端是否正確處理和顯示子任務
 * 3. 測試邏輯與用戶實際體驗的一致性
 */

import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:8081',
  timeout: 120000,
  testTask: {
    title: '學習 React Native 開發',
    description: '完整掌握 React Native 移動應用開發技能',
    dueDate: '2025-09-04',
    priority: 'medium',
    estimatedHours: 40
  }
};

test.describe('增強版 MCP 現實驗證測試', () => {
  test.setTimeout(180000);

  test('深度驗證：API 響應與 UI 顯示的一致性', async ({ page, request }) => {
    console.log('🔍 開始深度驗證測試');

    // 1. 直接測試後端 API
    console.log('📡 第一步：直接測試後端 API');
    
    // 測試個人化問題生成
    const personalizeResponse = await request.post('http://127.0.0.1:3000/api/jobs', {
      data: {
        type: 'personalization',
        params: {
          title: TEST_CONFIG.testTask.title,
          description: TEST_CONFIG.testTask.description,
          deadline: TEST_CONFIG.testTask.dueDate,
          priority: TEST_CONFIG.testTask.priority,
          estimatedHours: TEST_CONFIG.testTask.estimatedHours
        }
      }
    });

    expect(personalizeResponse.ok()).toBeTruthy();
    const personalizeData = await personalizeResponse.json();
    console.log(`✅ 個人化問題作業已提交: ${personalizeData.jobId}`);

    // 等待個人化問題完成
    let personalizationResult;
    for (let i = 0; i < 20; i++) {
      const statusResponse = await request.get(`http://127.0.0.1:3000/api/jobs/${personalizeData.jobId}`);
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        personalizationResult = statusData;
        console.log(`✅ 個人化問題生成完成，產生 ${statusData.result.questions.length} 個問題`);
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(`個人化問題生成失敗: ${statusData.error}`);
      }
      
      console.log(`⏳ 等待個人化問題完成... (${i + 1}/20) - 狀態: ${statusData.status}`);
      await page.waitForTimeout(2000);
    }

    expect(personalizationResult).toBeTruthy();
    expect(personalizationResult.result.questions).toBeTruthy();
    expect(Array.isArray(personalizationResult.result.questions)).toBeTruthy();
    expect(personalizationResult.result.questions.length).toBeGreaterThan(0);

    // 測試子任務生成（關鍵測試）
    console.log('🎯 第二步：測試子任務生成 API');
    const subtaskResponse = await request.post('http://127.0.0.1:3000/api/jobs', {
      data: {
        type: 'subtask_generation', // 🔧 正確的類型
        params: {
          title: TEST_CONFIG.testTask.title,
          description: TEST_CONFIG.testTask.description,
          deadline: TEST_CONFIG.testTask.dueDate,
          priority: TEST_CONFIG.testTask.priority,
          estimatedHours: TEST_CONFIG.testTask.estimatedHours,
          taskType: 'skill_learning',
          personalizationAnswers: {
            'q1': '我是初學者，希望從基礎開始學習',
            'q2': '希望能開發出完整的移動應用',
            'q3': '每天可以投入2-3小時學習'
          }
        }
      }
    });

    expect(subtaskResponse.ok()).toBeTruthy();
    const subtaskData = await subtaskResponse.json();
    console.log(`✅ 子任務生成作業已提交: ${subtaskData.jobId}`);

    // 等待子任務生成完成
    let subtaskResult;
    for (let i = 0; i < 30; i++) {
      const statusResponse = await request.get(`http://127.0.0.1:3000/api/jobs/${subtaskData.jobId}`);
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed') {
        subtaskResult = statusData;
        console.log(`✅ 子任務生成完成，產生 ${statusData.result.subtasks?.length || 0} 個子任務`);
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(`子任務生成失敗: ${statusData.error || statusData.message}`);
      }
      
      console.log(`⏳ 等待子任務生成完成... (${i + 1}/30) - 狀態: ${statusData.status}`);
      await page.waitForTimeout(3000);
    }

    // 🔍 關鍵驗證：檢查後端真實返回的數據
    expect(subtaskResult).toBeTruthy();
    expect(subtaskResult.result).toBeTruthy();
    expect(subtaskResult.result.subtasks).toBeTruthy();
    expect(Array.isArray(subtaskResult.result.subtasks)).toBeTruthy();
    expect(subtaskResult.result.subtasks.length).toBeGreaterThan(0);

    const firstSubtask = subtaskResult.result.subtasks[0];
    console.log('📋 第一個子任務結構驗證:');
    console.log(`  - title: ${firstSubtask.title || '❌ 缺失'}`);
    console.log(`  - text: ${firstSubtask.text || '❌ 缺失'}`);
    console.log(`  - startDate: ${firstSubtask.startDate || '❌ 缺失'}`);
    console.log(`  - endDate: ${firstSubtask.endDate || '❌ 缺失'}`);
    console.log(`  - aiEstimatedDuration: ${firstSubtask.aiEstimatedDuration || '❌ 缺失'}`);

    // 驗證關鍵字段
    expect(firstSubtask.title).toBeTruthy();
    expect(firstSubtask.text).toBeTruthy();
    expect(firstSubtask.startDate).toBeTruthy();
    expect(firstSubtask.endDate).toBeTruthy();
    expect(typeof firstSubtask.aiEstimatedDuration).toBe('number');

    // 2. 測試前端實際行為
    console.log('🌐 第三步：測試前端實際行為');
    
    await page.goto(`${TEST_CONFIG.baseURL}/add-task`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 填寫基本任務信息
    await page.locator('input').first().clear();
    await page.locator('input').first().fill(TEST_CONFIG.testTask.title);
    await page.locator('textarea').fill(TEST_CONFIG.testTask.description);

    // 設定截止日期
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.count() > 0) {
      await dateInput.fill(TEST_CONFIG.testTask.dueDate);
    }

    // 觸發 Smart Generate
    const smartGenerateButton = page.locator('text=Smart Generate');
    if (await smartGenerateButton.count() > 0) {
      await smartGenerateButton.click();
      console.log('✅ 點擊 Smart Generate 按鈕');
      await page.waitForTimeout(2000);
    }

    // 等待並處理個人化問題
    let foundPersonalizationQuestions = false;
    for (let i = 0; i < 15; i++) {
      const questionElements = await page.locator('textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').count();
      
      if (questionElements > 0 && !foundPersonalizationQuestions) {
        foundPersonalizationQuestions = true;
        console.log(`✅ 找到個人化問題: ${questionElements} 個`);
        
        // 回答問題
        const answerInputs = await page.locator('textarea:not([placeholder*="描述"]), input[type="text"]:not([value*="學習"])').all();
        const answers = [
          '我是初學者，希望從基礎開始學習',
          '希望能開發出完整的移動應用',
          '每天可以投入2-3小時學習'
        ];
        
        for (let j = 0; j < Math.min(answerInputs.length, answers.length); j++) {
          try {
            await answerInputs[j].fill(answers[j]);
            console.log(`✅ 回答問題 ${j + 1}: ${answers[j].substring(0, 20)}...`);
          } catch (error) {
            console.log(`⚠️ 回答問題 ${j + 1} 失敗:`, error.message);
          }
        }
        
        // 提交答案
        const submitButton = page.locator('text=Submit, text=Continue, text=Generate Plan, button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          console.log('✅ 提交個人化問題答案');
        }
        
        break;
      }
      
      await page.waitForTimeout(2000);
    }

    // 🎯 關鍵測試：等待並驗證實際的子任務顯示
    console.log('🔍 第四步：驗證子任務實際顯示');
    
    let actualSubtasksFound = false;
    let subtaskCount = 0;
    
    // 等待更長時間來確保子任務生成和顯示
    for (let i = 0; i < 40; i++) {
      console.log(`⏳ 檢查子任務顯示狀態... (${i + 1}/40)`);
      
      // 更精確的子任務檢測
      const subtaskTitles = await page.locator('[class*="subtask"] h3, [data-testid*="subtask"] .title, .subtask-title').allTextContents();
      const subtaskDescriptions = await page.locator('[class*="subtask"] p, [data-testid*="subtask"] .description, .subtask-description').allTextContents();
      const visibleText = await page.textContent('body');
      
      // 檢查實際的子任務內容，而不只是「子任務」這個詞
      const hasRealSubtaskContent = subtaskTitles.some(title => 
        title && title.length > 5 && !title.includes('子任務') && !title.includes('Subtasks')
      ) || subtaskDescriptions.some(desc => 
        desc && desc.length > 10 && desc.includes('學習') || desc.includes('設定') || desc.includes('練習')
      );
      
      if (hasRealSubtaskContent) {
        actualSubtasksFound = true;
        subtaskCount = Math.max(subtaskTitles.length, subtaskDescriptions.length);
        console.log(`✅ 找到真實子任務內容: ${subtaskCount} 個`);
        console.log('📋 子任務標題樣本:');
        subtaskTitles.slice(0, 3).forEach((title, idx) => {
          console.log(`  ${idx + 1}. ${title.substring(0, 50)}...`);
        });
        break;
      }
      
      // 檢查是否有錯誤訊息
      if (visibleText && (visibleText.includes('失敗') || visibleText.includes('錯誤') || visibleText.includes('Error'))) {
        console.log('⚠️ 檢測到錯誤訊息，停止等待');
        break;
      }
      
      await page.waitForTimeout(3000);
    }

    // 截圖當前狀態進行分析
    await page.screenshot({ 
      path: '/Users/wetom/Desktop/FocusFlow/test-results/screenshots/reality-check-final-state.png',
      fullPage: true 
    });

    // 🚨 關鍵驗證：對比 API 返回的子任務數量與 UI 顯示的數量
    console.log('\n📊 現實檢查結果對比:');
    console.log(`  - 後端 API 返回子任務數量: ${subtaskResult.result.subtasks.length}`);
    console.log(`  - 前端 UI 實際顯示數量: ${subtaskCount}`);
    console.log(`  - 是否找到真實子任務內容: ${actualSubtasksFound ? '✅ 是' : '❌ 否'}`);

    // 🎯 這裡是關鍵的一致性檢查
    if (subtaskResult.result.subtasks.length > 0 && !actualSubtasksFound) {
      console.log('🚨 發現問題：後端有子任務但前端未顯示！');
      
      // 詳細分析問題
      const bodyHTML = await page.innerHTML('body');
      const hasSubtaskWord = bodyHTML.includes('子任務') || bodyHTML.includes('subtask');
      const hasSubtaskData = bodyHTML.includes('duration') || bodyHTML.includes('difficulty');
      
      console.log('🔍 前端狀態詳細分析:');
      console.log(`  - 頁面包含「子任務」文字: ${hasSubtaskWord ? '是' : '否'}`);
      console.log(`  - 頁面包含子任務數據: ${hasSubtaskData ? '是' : '否'}`);
      
      throw new Error('數據不一致：後端返回了子任務但前端未正確顯示');
    }

    // 最終驗證
    expect(actualSubtasksFound).toBeTruthy();
    expect(subtaskCount).toBeGreaterThan(0);
    expect(subtaskCount).toEqual(subtaskResult.result.subtasks.length);

    console.log('🎉 現實檢查測試通過！前端與後端數據一致');
  });

  test('API 類型錯誤檢測測試', async ({ request }) => {
    console.log('🔍 開始 API 類型錯誤檢測');

    // 測試錯誤的 API 類型調用
    const wrongTypeResponse = await request.post('http://127.0.0.1:3000/api/jobs', {
      data: {
        type: 'learning_plan', // 🚨 這是問題的根源
        params: {
          title: '測試任務',
          description: '測試描述',
          clarificationResponses: {
            'q1': '測試答案'
          }
        }
      }
    });

    expect(wrongTypeResponse.ok()).toBeTruthy();
    const wrongTypeData = await wrongTypeResponse.json();

    // 等待處理完成
    let result;
    for (let i = 0; i < 20; i++) {
      const statusResponse = await request.get(`http://127.0.0.1:3000/api/jobs/${wrongTypeData.jobId}`);
      const statusData = await statusResponse.json();
      
      if (statusData.status === 'completed' || statusData.status === 'failed') {
        result = statusData;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('📋 learning_plan 類型返回結果:');
    console.log(`  - 包含 questions: ${result.result?.questions ? '是' : '否'}`);
    console.log(`  - 包含 subtasks: ${result.result?.subtasks ? '是' : '否'}`);
    console.log(`  - Questions 數量: ${result.result?.questions?.length || 0}`);
    console.log(`  - Subtasks 數量: ${result.result?.subtasks?.length || 0}`);

    // 🚨 這裡驗證了問題：learning_plan 類型返回問題，不是子任務
    expect(result.result?.questions).toBeTruthy();
    expect(result.result?.subtasks).toBeFalsy();

    console.log('✅ 確認問題：learning_plan 類型確實只返回問題，不返回子任務');
  });
});

test.afterAll(async () => {
  console.log('🏁 增強版 MCP 現實驗證測試完成');
});