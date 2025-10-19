/**
 * 🚀 Phase 優化綜合驗證測試
 * 
 * 驗證所有 Phase 1-4 優化功能的端到端測試：
 * - Phase 1: 子任務內容與指引優化
 * - Phase 2: 個人化流程 UX 透明度提升  
 * - Phase 3: 排程同步問題修復
 * - Phase 4: 性能瓶頸優化
 * 
 * @author FocusFlow Team
 * @version 3.0
 * @compliance CLAUDE.md - 遵循統一測試規範
 */

import { test, expect } from '@playwright/test';
import { 
  PhaseOptimizationValidators, 
  waitAndScreenshot, 
  measureExecutionTime 
} from './helpers/phase-optimization-validators';

// 測試配置
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8081',
  timeout: 30000,
  testData: {
    simpleTask: {
      title: '學習基礎英文單字',
      description: '每天背誦10個新單字'
    },
    mediumTask: {
      title: '學習 React Native 開發',
      description: '完整學習 React Native 移動應用開發，包括組件開發、狀態管理、導航等核心概念'
    },
    complexTask: {
      title: '建立完整的 AI 對話系統',
      description: '使用 Python 和機器學習技術建立智能對話系統，包含自然語言處理、意圖識別、對話管理和響應生成'
    }
  }
};

test.describe('🚀 Phase 1-4 優化功能綜合驗證', () => {
  let validators: PhaseOptimizationValidators;

  test.beforeEach(async ({ page }) => {
    validators = new PhaseOptimizationValidators(page);
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForLoadState('networkidle');
  });

  test.describe('🎯 Phase 2: 動態個人化問題生成系統', () => {
    
    test('簡單任務應生成 1-3 個個人化問題', async ({ page }) => {
      // 導航到任務創建頁面
      await page.click('[data-testid="add-task-button"]');
      await waitAndScreenshot(page, '[data-testid="task-form"]', 'simple-task-form-loaded');

      // 填寫簡單任務
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.simpleTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.simpleTask.description);
      await waitAndScreenshot(page, '[data-testid="task-form"]', 'simple-task-form-filled');

      // 點擊智能生成
      await page.click('[data-testid="smart-generate-button"]');

      // 驗證個人化系統
      const result = await validators.validatePersonalizationSystem(
        { min: 1, max: 3 },
        'simple'
      );

      await waitAndScreenshot(page, '[data-testid="personalization-modal"]', 'simple-task-personalization-result');

      // 斷言
      expect(result.passed, `個人化驗證失敗: ${result.errors.join(', ')}`).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(1);
      expect(result.questionCount).toBeLessThanOrEqual(3);
      expect(result.hasRationale, '缺少 AI 決策原因說明').toBe(true);
    });

    test('複雜任務應生成 6-8 個個人化問題', async ({ page }) => {
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.complexTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.complexTask.description);
      await page.click('[data-testid="smart-generate-button"]');

      const result = await validators.validatePersonalizationSystem(
        { min: 6, max: 8 },
        'complex'
      );

      await waitAndScreenshot(page, '[data-testid="personalization-modal"]', 'complex-task-personalization-result');

      expect(result.passed, `複雜任務個人化驗證失敗: ${result.errors.join(', ')}`).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(6);
      expect(result.questionCount).toBeLessThanOrEqual(8);
      
      // 驗證問題類型多樣性
      expect(result.questionTypes.length, '複雜任務問題類型不夠多樣化').toBeGreaterThan(2);
    });

    test('中等任務應生成 3-5 個個人化問題', async ({ page }) => {
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.mediumTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.mediumTask.description);
      await page.click('[data-testid="smart-generate-button"]');

      const result = await validators.validatePersonalizationSystem(
        { min: 3, max: 5 },
        'medium'
      );

      await waitAndScreenshot(page, '[data-testid="personalization-modal"]', 'medium-task-personalization-result');

      expect(result.passed, `中等任務個人化驗證失敗: ${result.errors.join(', ')}`).toBe(true);
      expect(result.questionCount).toBeGreaterThanOrEqual(3);
      expect(result.questionCount).toBeLessThanOrEqual(5);
    });
  });

  test.describe('⚡ Phase 4: 分段式生成性能優化', () => {
    
    test('分段式生成應在 25 秒內完成並顯示進度', async ({ page }) => {
      // 創建複雜任務觸發分段式生成
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.complexTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.complexTask.description);
      await page.click('[data-testid="smart-generate-button"]');

      // 等待並回答個人化問題
      await page.waitForSelector('[data-testid="personalization-modal"]');
      
      // 模擬回答個人化問題
      const questionItems = await page.$$('[data-testid="question-item"]');
      for (let i = 0; i < questionItems.length; i++) {
        const questionInput = await questionItems[i].$('input, select, textarea');
        if (questionInput) {
          const inputType = await questionInput.getAttribute('type') || 'text';
          if (inputType === 'text' || inputType === 'textarea') {
            await questionInput.fill('中等程度經驗');
          } else if (inputType === 'radio' || inputType === 'checkbox') {
            await questionInput.check();
          }
        }
      }

      await waitAndScreenshot(page, '[data-testid="personalization-modal"]', 'personalization-questions-answered');
      await page.click('[data-testid="complete-personalization-button"]');

      // 驗證分段式生成性能
      const { result: performanceResult, executionTime } = await measureExecutionTime(
        () => validators.validateSegmentedGenerationPerformance(),
        'Segmented Generation Performance'
      );

      await waitAndScreenshot(page, '[data-testid="generation-complete"]', 'segmented-generation-complete');

      // 斷言性能要求
      expect(performanceResult.passed, `性能驗證失敗: ${performanceResult.errors.join(', ')}`).toBe(true);
      expect(performanceResult.totalGenerationTime, '生成時間超過 25 秒限制').toBeLessThan(25000);
      expect(performanceResult.performanceImprovement, '性能改善低於 30% 目標').toBeGreaterThanOrEqual(30);
      expect(performanceResult.actualStages.length, '缺少預期的生成階段').toBeGreaterThanOrEqual(3);
    });

    test('性能監控儀表板應正確顯示指標', async ({ page }) => {
      // 導航到設定頁面
      await page.goto(`${TEST_CONFIG.baseUrl}/profile`);
      await page.waitForLoadState('networkidle');

      // 點擊性能監控按鈕
      await page.scrollIntoViewIfNeeded('[data-testid="performance-monitor-button"]');
      await page.click('[data-testid="performance-monitor-button"]');

      await waitAndScreenshot(page, '[data-testid="performance-monitor-modal"]', 'performance-monitor-opened');

      // 驗證性能監控儀表板
      const monitorResult = await validators.validatePerformanceMonitor();

      expect(monitorResult.passed, `性能監控驗證失敗: ${monitorResult.errors.join(', ')}`).toBe(true);
      expect(monitorResult.metricsFound.length, '性能指標數量不足').toBeGreaterThanOrEqual(4);

      // 測試刷新功能
      await page.click('[data-testid="refresh-metrics-button"]');
      await page.waitForTimeout(2000); // 等待刷新完成
      
      await waitAndScreenshot(page, '[data-testid="performance-metrics-container"]', 'performance-metrics-refreshed');
    });
  });

  test.describe('🔄 Phase 3: 排程同步系統', () => {
    
    test('任務排程應正確同步到 scheduledTasks', async ({ page }) => {
      // 創建帶排程的任務
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', '測試排程同步任務');
      await page.fill('[data-testid="task-description-input"]', '用於驗證排程同步功能的測試任務');

      // 啟用排程功能
      await page.check('[data-testid="enable-scheduling-checkbox"]');
      await page.click('[data-testid="smart-generate-button"]');

      // 等待生成完成
      await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 30000 });
      await page.click('[data-testid="save-task-button"]');

      // 導航到任務列表驗證排程同步
      await page.goto(`${TEST_CONFIG.baseUrl}/tasks`);
      await page.waitForLoadState('networkidle');

      await waitAndScreenshot(page, '[data-testid="tasks-container"]', 'tasks-with-schedules');

      // 驗證排程同步
      const syncResult = await validators.validateSchedulingSynchronization();

      expect(syncResult.passed, `排程同步驗證失敗: ${syncResult.errors.join(', ')}`).toBe(true);
      expect(syncResult.taskStoreHasTask, 'taskStore 中沒有找到任務').toBe(true);
      expect(syncResult.scheduledTasksHasEntry, 'scheduledTasks 中沒有找到排程項目').toBe(true);
      expect(syncResult.idsMatch, '任務 ID 和排程任務 ID 不匹配').toBe(true);
    });

    test('子任務完成時應清理對應的排程項目', async ({ page }) => {
      // 假設已有帶子任務排程的任務
      await page.goto(`${TEST_CONFIG.baseUrl}/tasks`);
      
      // 找到第一個有子任務的任務並展開
      const taskItem = await page.$('[data-testid="task-item-with-subtasks"]');
      if (taskItem) {
        await taskItem.click();
        await waitAndScreenshot(page, '[data-testid="expanded-task"]', 'task-expanded-with-subtasks');

        // 標記第一個子任務為完成
        const firstSubtask = await page.$('[data-testid="subtask-item"]:first-child [data-testid="subtask-complete-checkbox"]');
        if (firstSubtask) {
          await firstSubtask.check();
          await page.waitForTimeout(1000); // 等待狀態更新

          // 驗證排程清理
          const syncResult = await validators.validateSchedulingSynchronization();
          expect(syncResult.passed, '子任務完成後排程清理失敗').toBe(true);

          await waitAndScreenshot(page, '[data-testid="tasks-container"]', 'after-subtask-completion');
        }
      }
    });
  });

  test.describe('📋 Phase 1: 子任務指引完整性', () => {
    
    test('生成的子任務應包含完整的行動指引', async ({ page }) => {
      // 創建任務並生成子任務
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.mediumTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.mediumTask.description);
      await page.click('[data-testid="smart-generate-button"]');

      // 等待並完成個人化問題（簡化）
      try {
        await page.waitForSelector('[data-testid="personalization-modal"]', { timeout: 15000 });
        await page.click('[data-testid="complete-personalization-button"]');
      } catch (e) {
        // 如果沒有個人化問題，直接繼續
      }

      // 等待子任務生成完成
      await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 45000 });
      await waitAndScreenshot(page, '[data-testid="subtasks-container"]', 'subtasks-with-guidance');

      // 驗證子任務指引完整性
      const guidanceResult = await validators.validateSubtaskGuidance();

      expect(guidanceResult.passed, `子任務指引驗證失敗: ${guidanceResult.errors.join(', ')}`).toBe(true);
      expect(guidanceResult.completeness, '子任務指引完整性低於 80%').toBeGreaterThanOrEqual(80);

      // 檢查具體的指引元素
      const subtaskItems = await page.$$('[data-testid="subtask-item"]');
      expect(subtaskItems.length, '沒有生成任何子任務').toBeGreaterThan(0);

      // 驗證至少有一個子任務包含完整指引
      const hasCompleteGuidance = await page.$('[data-testid="guidance-how-to-start"]');
      expect(hasCompleteGuidance, '沒有找到任何行動指引').toBeTruthy();
    });
  });

  test.describe('🔧 整合測試：端到端完整流程', () => {
    
    test('完整用戶流程：從任務創建到排程完成', async ({ page }) => {
      console.log('🚀 開始端到端完整流程測試');

      // Step 1: 創建複雜任務
      await page.click('[data-testid="add-task-button"]');
      await page.fill('[data-testid="task-title-input"]', TEST_CONFIG.testData.complexTask.title);
      await page.fill('[data-testid="task-description-input"]', TEST_CONFIG.testData.complexTask.description);
      await waitAndScreenshot(page, '[data-testid="task-form"]', 'e2e-task-form-filled');

      // Step 2: 觸發智能生成
      const { executionTime: generationTime } = await measureExecutionTime(
        async () => {
          await page.click('[data-testid="smart-generate-button"]');
          await page.waitForSelector('[data-testid="personalization-modal"]', { timeout: 15000 });
        },
        'Personalization Modal Loading'
      );

      // Step 3: 驗證個人化問題
      const personalizationResult = await validators.validatePersonalizationSystem(
        { min: 6, max: 8 },
        'complex'
      );
      expect(personalizationResult.passed, '個人化階段失敗').toBe(true);

      // Step 4: 回答個人化問題並提交
      const questionItems = await page.$$('[data-testid="question-item"]');
      for (let i = 0; i < Math.min(questionItems.length, 3); i++) {
        const input = await questionItems[i].$('input, select, textarea');
        if (input) {
          await input.fill(`專業級別回答 ${i + 1}`);
        }
      }
      
      await waitAndScreenshot(page, '[data-testid="personalization-modal"]', 'e2e-questions-answered');
      await page.click('[data-testid="complete-personalization-button"]');

      // Step 5: 驗證分段式生成性能
      const performanceResult = await validators.validateSegmentedGenerationPerformance();
      expect(performanceResult.passed, '分段式生成性能不符合要求').toBe(true);

      // Step 6: 驗證子任務指引
      await page.waitForSelector('[data-testid="subtasks-container"]', { timeout: 30000 });
      const guidanceResult = await validators.validateSubtaskGuidance();
      expect(guidanceResult.passed, '子任務指引不完整').toBe(true);

      // Step 7: 啟用排程並保存任務
      await page.check('[data-testid="enable-scheduling-checkbox"]');
      await waitAndScreenshot(page, '[data-testid="subtasks-with-scheduling"]', 'e2e-scheduling-enabled');
      await page.click('[data-testid="save-task-button"]');

      // Step 8: 驗證排程同步
      await page.goto(`${TEST_CONFIG.baseUrl}/tasks`);
      await page.waitForLoadState('networkidle');
      const syncResult = await validators.validateSchedulingSynchronization();
      expect(syncResult.passed, '排程同步失敗').toBe(true);

      await waitAndScreenshot(page, '[data-testid="tasks-container"]', 'e2e-final-task-list');

      console.log(`✅ 端到端測試完成！個人化生成時間: ${generationTime}ms, 總體性能提升: ${performanceResult.performanceImprovement}%`);
    });
  });
});