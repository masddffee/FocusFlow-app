/**
 * 詳細用戶流程測試 - 模擬真實用戶場景
 * 
 * 這個測試文件涵蓋了 FocusFlow 的所有關鍵用戶流程：
 * 1. 任務創建完整流程（包含 Smart Generate）
 * 2. 子任務顯示與排程驗證
 * 3. 專注模式整合測試
 * 4. 錯誤處理和邊界條件
 * 5. 性能和響應度測試
 */

import { test, expect, Page } from '@playwright/test';

// 測試配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:8081',
  timeout: 60000,
  slowMo: 1000,
  tasks: {
    simple: {
      title: '學習基礎 JavaScript',
      description: '掌握 JavaScript 基本語法和概念',
      estimatedHours: 20,
      deadline: 7 // 7天後
    },
    complex: {
      title: '開發完整的 React Native 社交媒體應用',
      description: '建立類似 Instagram 的應用，包含用戶認證、照片分享、評論、私訊、推送通知等功能',
      estimatedHours: 80,
      deadline: 30 // 30天後
    },
    urgent: {
      title: '準備明天的技術面試',
      description: '複習演算法、數據結構、系統設計題目',
      estimatedHours: 8,
      deadline: 1 // 明天
    }
  }
};

class UserFlowTester {
  constructor(private page: Page) {}

  async waitForLoadComplete() {
    // 等待應用完全載入
    await this.page.waitForSelector('[data-testid="app-loaded"]', { timeout: 30000 });
    await this.page.waitForTimeout(2000); // 額外等待確保 JS 初始化完成
  }

  async createTask(taskData: typeof TEST_CONFIG.tasks.simple) {
    console.log(`📝 創建任務：${taskData.title}`);
    
    // 導航到任務創建頁面
    await this.page.click('[data-testid="add-task-button"]');
    await this.page.waitForSelector('[data-testid="task-creation-form"]');

    // 填寫基本信息
    await this.page.fill('[data-testid="task-title-input"]', taskData.title);
    await this.page.fill('[data-testid="task-description-input"]', taskData.description);
    
    // 設定預估時間
    await this.page.fill('[data-testid="estimated-hours-input"]', taskData.estimatedHours.toString());
    
    // 設定截止日期
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + taskData.deadline);
    await this.page.fill('[data-testid="deadline-input"]', deadline.toISOString().split('T')[0]);

    return { deadline, taskData };
  }

  async triggerSmartGenerate() {
    console.log('🤖 觸發 Smart Generate');
    await this.page.click('[data-testid="smart-generate-button"]');
    
    // 等待個人化問題生成
    await this.page.waitForSelector('[data-testid="personalization-questions"]', { timeout: 30000 });
    
    // 驗證問題數量（應該是動態決定，不是固定3個）
    const questions = await this.page.locator('[data-testid="personalization-question"]').count();
    console.log(`✅ 生成了 ${questions} 個個人化問題`);
    
    return questions;
  }

  async answerPersonalizationQuestions() {
    console.log('💬 回答個人化問題');
    
    const questions = await this.page.locator('[data-testid="personalization-question"]').count();
    
    // 模擬用戶回答每個問題
    for (let i = 0; i < questions; i++) {
      const questionElement = this.page.locator('[data-testid="personalization-question"]').nth(i);
      const answerInput = questionElement.locator('[data-testid="answer-input"]');
      
      const sampleAnswers = [
        '我想開發一個社交媒體應用，具備照片分享和評論功能',
        '我有基礎的 JavaScript 經驗，但對移動開發比較陌生',
        '我每天可以投入2-3小時學習，偏好實作導向的學習方式',
        '我最關心用戶界面設計和API整合這兩個方面',
        '我希望在一個月內掌握基本技能並開始開發自己的項目'
      ];
      
      await answerInput.fill(sampleAnswers[i] || `第${i+1}個問題的答案`);
    }
    
    // 提交答案
    await this.page.click('[data-testid="submit-answers-button"]');
    console.log('✅ 個人化問題回答完成');
  }

  async waitForSubtaskGeneration() {
    console.log('⏳ 等待子任務生成...');
    
    // 等待學習計劃生成完成
    await this.page.waitForSelector('[data-testid="learning-plan-modal"]', { timeout: 60000 });
    
    // 檢查生成的子任務數量
    const subtasks = await this.page.locator('[data-testid="generated-subtask"]').count();
    console.log(`✅ 生成了 ${subtasks} 個子任務`);
    
    // 驗證 AI 推理透明度
    const hasReasoning = await this.page.locator('[data-testid="ai-reasoning"]').count() > 0;
    console.log(`🧠 AI 推理透明度: ${hasReasoning ? '顯示' : '缺失'}`);
    
    return { subtasks, hasReasoning };
  }

  async acceptLearningPlan() {
    console.log('✅ 接受學習計劃');
    await this.page.click('[data-testid="accept-plan-button"]');
    
    // 等待任務創建完成並回到任務列表
    await this.page.waitForSelector('[data-testid="task-list"]', { timeout: 30000 });
  }

  async verifyTaskInList(taskTitle: string) {
    console.log(`🔍 驗證任務在列表中：${taskTitle}`);
    
    // 檢查任務是否出現在列表中
    const taskExists = await this.page.locator(`[data-testid="task-item"]:has-text("${taskTitle}")`).count() > 0;
    expect(taskExists).toBeTruthy();
    
    // 點擊進入任務詳情
    await this.page.click(`[data-testid="task-item"]:has-text("${taskTitle}")`);
    await this.page.waitForSelector('[data-testid="task-detail"]');
    
    return taskExists;
  }

  async verifySubtaskDisplay() {
    console.log('🔍 驗證子任務顯示同步');
    
    // 檢查子任務列表
    const subtaskCount = await this.page.locator('[data-testid="subtask-item"]').count();
    console.log(`📋 顯示了 ${subtaskCount} 個子任務`);
    
    // 驗證子任務排程信息
    if (subtaskCount > 0) {
      const firstSubtask = this.page.locator('[data-testid="subtask-item"]').first();
      
      // 檢查必要的排程信息
      const hasStartDate = await firstSubtask.locator('[data-testid="start-date"]').count() > 0;
      const hasEndDate = await firstSubtask.locator('[data-testid="end-date"]').count() > 0;
      const hasEstimatedTime = await firstSubtask.locator('[data-testid="estimated-time"]').count() > 0;
      const hasPriority = await firstSubtask.locator('[data-testid="priority"]').count() > 0;
      
      console.log(`📅 排程信息完整性:`, {
        startDate: hasStartDate,
        endDate: hasEndDate,
        estimatedTime: hasEstimatedTime,
        priority: hasPriority
      });
      
      return { subtaskCount, scheduleComplete: hasStartDate && hasEndDate && hasEstimatedTime && hasPriority };
    }
    
    return { subtaskCount: 0, scheduleComplete: false };
  }

  async testFocusMode() {
    console.log('🎯 測試專注模式');
    
    // 啟動專注模式
    await this.page.click('[data-testid="start-focus-button"]');
    await this.page.waitForSelector('[data-testid="focus-session"]', { timeout: 10000 });
    
    // 驗證專注界面元素
    const hasTimer = await this.page.locator('[data-testid="focus-timer"]').count() > 0;
    const hasTaskTitle = await this.page.locator('[data-testid="current-task-title"]').count() > 0;
    const hasSubtaskList = await this.page.locator('[data-testid="subtask-progress"]').count() > 0;
    
    console.log('🎯 專注模式界面檢查:', { hasTimer, hasTaskTitle, hasSubtaskList });
    
    // 模擬短暫的專注會話
    await this.page.waitForTimeout(3000);
    
    // 結束會話
    await this.page.click('[data-testid="end-session-button"]');
    
    return { hasTimer, hasTaskTitle, hasSubtaskList };
  }
}

// 測試套件開始
test.describe('FocusFlow 詳細用戶流程測試', () => {
  let userFlowTester: UserFlowTester;

  test.beforeEach(async ({ page }) => {
    userFlowTester = new UserFlowTester(page);
    
    // 導航到應用
    await page.goto(TEST_CONFIG.baseURL);
    await userFlowTester.waitForLoadComplete();
  });

  test('核心流程：簡單任務創建與基本功能驗證', async ({ page }) => {
    const { taskData } = await userFlowTester.createTask(TEST_CONFIG.tasks.simple);
    
    // 創建簡單任務（不使用 Smart Generate）
    await page.click('[data-testid="create-task-button"]');
    
    // 驗證任務出現在列表中
    await userFlowTester.verifyTaskInList(taskData.title);
    
    // 測試基本的任務操作
    await userFlowTester.testFocusMode();
  });

  test('完整流程：複雜任務 + Smart Generate + 子任務驗證', async ({ page }) => {
    const { taskData } = await userFlowTester.createTask(TEST_CONFIG.tasks.complex);
    
    // 觸發 Smart Generate
    const questionCount = await userFlowTester.triggerSmartGenerate();
    expect(questionCount).toBeGreaterThan(0);
    
    // 回答個人化問題
    await userFlowTester.answerPersonalizationQuestions();
    
    // 等待子任務生成
    const { subtasks, hasReasoning } = await userFlowTester.waitForSubtaskGeneration();
    expect(subtasks).toBeGreaterThan(0);
    
    // 接受學習計劃
    await userFlowTester.acceptLearningPlan();
    
    // 驗證任務和子任務顯示
    await userFlowTester.verifyTaskInList(taskData.title);
    const { subtaskCount, scheduleComplete } = await userFlowTester.verifySubtaskDisplay();
    
    expect(subtaskCount).toBe(subtasks);
    expect(scheduleComplete).toBeTruthy();
    
    // 測試專注模式
    const focusResult = await userFlowTester.testFocusMode();
    expect(focusResult.hasTimer).toBeTruthy();
    expect(focusResult.hasTaskTitle).toBeTruthy();
  });

  test('緊急任務：同日排程優先級測試', async ({ page }) => {
    const { taskData } = await userFlowTester.createTask(TEST_CONFIG.tasks.urgent);
    
    // 設定為緊急優先級
    await page.selectOption('[data-testid="priority-select"]', 'emergency');
    
    await userFlowTester.triggerSmartGenerate();
    await userFlowTester.answerPersonalizationQuestions();
    
    const { subtasks } = await userFlowTester.waitForSubtaskGeneration();
    await userFlowTester.acceptLearningPlan();
    
    // 驗證緊急任務的排程邏輯
    await userFlowTester.verifyTaskInList(taskData.title);
    const { scheduleComplete } = await userFlowTester.verifySubtaskDisplay();
    
    // 檢查是否有子任務安排在今天
    const todaySubtasks = await page.locator('[data-testid="subtask-item"][data-date="today"]').count();
    expect(todaySubtasks).toBeGreaterThan(0);
    
    expect(scheduleComplete).toBeTruthy();
  });

  test('錯誤處理：網路中斷情境', async ({ page }) => {
    // 模擬網路中斷
    await page.route('**/api/**', route => route.abort());
    
    const { taskData } = await userFlowTester.createTask(TEST_CONFIG.tasks.simple);
    
    // 嘗試觸發 Smart Generate（應該失敗）
    await page.click('[data-testid="smart-generate-button"]');
    
    // 驗證錯誤處理
    const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorMessage).toContain('網路');
    
    // 恢復網路
    await page.unroute('**/api/**');
    
    // 重試功能
    await page.click('[data-testid="retry-button"]');
    await page.waitForSelector('[data-testid="personalization-questions"]', { timeout: 30000 });
  });

  test('性能測試：大量子任務處理', async ({ page }) => {
    // 創建複雜任務以產生大量子任務
    const complexTask = {
      title: '全棧開發工程師完整訓練計劃',
      description: '從零開始學習前端、後端、數據庫、DevOps、系統設計等全棧開發技能',
      estimatedHours: 200,
      deadline: 90
    };
    
    const startTime = Date.now();
    
    await userFlowTester.createTask(complexTask);
    await userFlowTester.triggerSmartGenerate();
    await userFlowTester.answerPersonalizationQuestions();
    
    const { subtasks } = await userFlowTester.waitForSubtaskGeneration();
    const generationTime = Date.now() - startTime;
    
    console.log(`⏱️ 生成 ${subtasks} 個子任務耗時: ${generationTime}ms`);
    expect(generationTime).toBeLessThan(120000); // 應該在2分鐘內完成
    expect(subtasks).toBeGreaterThan(10); // 複雜任務應該產生較多子任務
    
    await userFlowTester.acceptLearningPlan();
    
    // 測試大量子任務的顯示性能
    const renderStart = Date.now();
    await userFlowTester.verifyTaskInList(complexTask.title);
    const renderTime = Date.now() - renderStart;
    
    console.log(`📊 大量子任務渲染耗時: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(3000); // 渲染應該在3秒內完成
  });

  test('數據一致性：並發操作測試', async ({ page }) => {
    // 快速連續創建多個任務，測試狀態管理的一致性
    const tasks = [
      { title: '任務A', description: '測試任務A' },
      { title: '任務B', description: '測試任務B' },
      { title: '任務C', description: '測試任務C' }
    ];
    
    // 並發創建任務
    const promises = tasks.map(async (taskData) => {
      await userFlowTester.createTask({ ...taskData, estimatedHours: 10, deadline: 7 });
      await page.click('[data-testid="create-task-button"]');
    });
    
    await Promise.all(promises);
    
    // 驗證所有任務都正確創建
    await page.waitForSelector('[data-testid="task-list"]');
    
    for (const task of tasks) {
      const taskExists = await page.locator(`[data-testid="task-item"]:has-text("${task.title}")`).count() > 0;
      expect(taskExists).toBeTruthy();
    }
  });
});

// 輔助函數：生成測試報告
test.afterAll(async () => {
  console.log('📊 詳細用戶流程測試完成');
  console.log('✅ 所有核心功能已驗證');
  console.log('🔧 如有失敗的測試，請檢查具體的錯誤信息進行修復');
});