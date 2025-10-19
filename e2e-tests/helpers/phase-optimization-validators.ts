/**
 * 🚀 Phase 優化驗證工具
 * 
 * 支援 Playwright MCP 測試中的專項驗證功能：
 * - 動態個人化問題生成驗證
 * - 分段式生成性能驗證  
 * - 排程同步驗證
 * - 透明度功能驗證
 * - 子任務指引完整性驗證
 * 
 * @author FocusFlow Team
 * @version 3.0
 * @compliance CLAUDE.md - 使用統一日誌系統、避免重複代碼
 */

import { Page, Locator } from '@playwright/test';
import { log } from '@/lib/logger';

export interface PersonalizationValidationResult {
  questionCount: number;
  hasRationale: boolean;
  hasComplexityExplanation: boolean;
  hasSufficiencyScore: boolean;
  questionTypes: string[];
  passed: boolean;
  errors: string[];
}

export interface PerformanceValidationResult {
  totalGenerationTime: number;
  stageTimes: Record<string, number>;
  expectedStages: string[];
  actualStages: string[];
  performanceImprovement: number;
  passed: boolean;
  errors: string[];
}

export interface SchedulingSyncValidationResult {
  taskStoreHasTask: boolean;
  scheduledTasksHasEntry: boolean;
  idsMatch: boolean;
  timeSlotsMatch: boolean;
  subtaskSchedulesCorrect: boolean;
  passed: boolean;
  errors: string[];
}

export class PhaseOptimizationValidators {
  constructor(private page: Page) {}

  /**
   * 🎯 Phase 2: 驗證動態個人化問題生成
   * 檢查問題數量是否符合任務複雜度，以及透明度功能
   */
  async validatePersonalizationSystem(
    expectedQuestionRange: { min: number; max: number },
    taskComplexity: 'simple' | 'medium' | 'complex'
  ): Promise<PersonalizationValidationResult> {
    log.info(`🔍 [VALIDATION] Starting personalization system validation for ${taskComplexity} task`);
    
    const result: PersonalizationValidationResult = {
      questionCount: 0,
      hasRationale: false,
      hasComplexityExplanation: false, 
      hasSufficiencyScore: false,
      questionTypes: [],
      passed: false,
      errors: []
    };

    try {
      // 等待個人化模態框出現
      await this.page.waitForSelector('[data-testid="personalization-modal"]', { timeout: 15000 });

      // 計算問題數量
      const questionItems = await this.page.$$('[data-testid="question-item"]');
      result.questionCount = questionItems.length;

      // 驗證問題數量範圍
      if (result.questionCount < expectedQuestionRange.min || result.questionCount > expectedQuestionRange.max) {
        result.errors.push(`問題數量 ${result.questionCount} 不在預期範圍 ${expectedQuestionRange.min}-${expectedQuestionRange.max}`);
      }

      // 檢查透明度功能
      result.hasRationale = await this.page.isVisible('[data-testid="ai-rationale-section"]');
      result.hasComplexityExplanation = await this.page.isVisible('[data-testid="complexity-explanation"]');
      result.hasSufficiencyScore = await this.page.isVisible('[data-testid="sufficiency-score"]');

      if (!result.hasRationale) {
        result.errors.push('缺少 AI 決策原因說明');
      }

      // 分析問題類型
      for (let i = 0; i < questionItems.length; i++) {
        const questionType = await questionItems[i].getAttribute('data-question-type');
        if (questionType) {
          result.questionTypes.push(questionType);
        }
      }

      // 驗證複雜任務的問題類型多樣性
      if (taskComplexity === 'complex') {
        const expectedTypes = ['diagnostic', 'skill_assessment', 'time_constraint', 'preference'];
        const missingTypes = expectedTypes.filter(type => !result.questionTypes.includes(type));
        
        if (missingTypes.length > 0) {
          result.errors.push(`複雜任務缺少問題類型: ${missingTypes.join(', ')}`);
        }
      }

      result.passed = result.errors.length === 0;

      log.info(`✅ [VALIDATION] Personalization validation completed`, {
        questionCount: result.questionCount,
        passed: result.passed,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(`驗證過程發生錯誤: ${error}`);
      log.error(`❌ [VALIDATION] Personalization validation failed:`, error);
    }

    return result;
  }

  /**
   * 🚀 Phase 4: 驗證分段式生成性能
   * 檢查生成階段、進度追蹤和性能改善
   */
  async validateSegmentedGenerationPerformance(): Promise<PerformanceValidationResult> {
    log.info(`🔍 [VALIDATION] Starting segmented generation performance validation`);
    
    const result: PerformanceValidationResult = {
      totalGenerationTime: 0,
      stageTimes: {},
      expectedStages: ['framework', 'details', 'personalization', 'complete'],
      actualStages: [],
      performanceImprovement: 0,
      passed: false,
      errors: []
    };

    const startTime = Date.now();

    try {
      // 等待進度模態框出現
      await this.page.waitForSelector('[data-testid="generation-progress-modal"]', { timeout: 5000 });

      // 追蹤各個階段
      for (const expectedStage of result.expectedStages) {
        const stageStartTime = Date.now();
        
        // 等待階段開始
        const stageSelector = `[data-testid="progress-stage-${expectedStage}"]`;
        const stageVisible = await this.page.waitForSelector(stageSelector, { timeout: 30000 }).catch(() => null);
        
        if (stageVisible) {
          result.actualStages.push(expectedStage);
          
          // 等待該階段完成（進度條更新）
          await this.page.waitForFunction(
            (stage) => {
              const progressElement = document.querySelector(`[data-testid="progress-stage-${stage}"] [data-testid="progress-bar"]`);
              return progressElement && progressElement.getAttribute('data-progress') !== '0';
            },
            expectedStage,
            { timeout: 15000 }
          );
          
          const stageEndTime = Date.now();
          result.stageTimes[expectedStage] = stageEndTime - stageStartTime;
          
          log.info(`📊 [VALIDATION] Stage ${expectedStage} completed in ${result.stageTimes[expectedStage]}ms`);
        } else {
          result.errors.push(`未檢測到階段: ${expectedStage}`);
        }
      }

      // 等待完成
      await this.page.waitForSelector('[data-testid="generation-complete"]', { timeout: 10000 });
      
      result.totalGenerationTime = Date.now() - startTime;

      // 計算性能改善 (對比 40-60 秒基準)
      const baselineTime = 50000; // 50秒基準
      result.performanceImprovement = Math.round((1 - result.totalGenerationTime / baselineTime) * 100);

      // 驗證性能標準
      if (result.totalGenerationTime > 25000) { // 25秒限制
        result.errors.push(`生成時間 ${result.totalGenerationTime}ms 超過 25秒限制`);
      }

      if (result.performanceImprovement < 30) { // 至少 30% 改善
        result.errors.push(`性能改善 ${result.performanceImprovement}% 低於 30% 目標`);
      }

      // 檢查是否包含所有預期階段
      const missingStages = result.expectedStages.filter(stage => !result.actualStages.includes(stage));
      if (missingStages.length > 0) {
        result.errors.push(`缺少階段: ${missingStages.join(', ')}`);
      }

      result.passed = result.errors.length === 0;

      log.info(`⚡ [VALIDATION] Performance validation completed`, {
        totalTime: result.totalGenerationTime,
        improvement: result.performanceImprovement,
        passed: result.passed
      });

    } catch (error) {
      result.errors.push(`性能驗證過程發生錯誤: ${error}`);
      log.error(`❌ [VALIDATION] Performance validation failed:`, error);
    }

    return result;
  }

  /**
   * 🔄 Phase 3: 驗證排程同步系統
   * 檢查 taskStore 和 scheduledTasks 狀態同步
   */
  async validateSchedulingSynchronization(): Promise<SchedulingSyncValidationResult> {
    log.info(`🔍 [VALIDATION] Starting scheduling synchronization validation`);
    
    const result: SchedulingSyncValidationResult = {
      taskStoreHasTask: false,
      scheduledTasksHasEntry: false,
      idsMatch: false,
      timeSlotsMatch: false,
      subtaskSchedulesCorrect: false,
      passed: false,
      errors: []
    };

    try {
      // 檢查 taskStore 狀態
      const taskStoreState = await this.page.evaluate(() => {
        return (window as any).__TASK_STORE_STATE__;
      });

      if (taskStoreState && taskStoreState.tasks && taskStoreState.tasks.length > 0) {
        result.taskStoreHasTask = true;
      } else {
        result.errors.push('taskStore 中沒有找到任務');
      }

      // 檢查 scheduledTasks 狀態
      const scheduledTasksState = await this.page.evaluate(() => {
        return (window as any).__SCHEDULED_TASKS_STATE__;
      });

      if (scheduledTasksState && scheduledTasksState.length > 0) {
        result.scheduledTasksHasEntry = true;
      } else {
        result.errors.push('scheduledTasks 中沒有找到排程項目');
      }

      // 驗證 ID 匹配
      if (result.taskStoreHasTask && result.scheduledTasksHasEntry) {
        const taskIds = taskStoreState.tasks.map((t: any) => t.id);
        const scheduledTaskIds = scheduledTasksState.map((st: any) => st.taskId);
        
        const hasMatchingIds = taskIds.some((id: string) => scheduledTaskIds.includes(id));
        result.idsMatch = hasMatchingIds;
        
        if (!hasMatchingIds) {
          result.errors.push('任務 ID 和排程任務 ID 不匹配');
        }
      }

      // 檢查 UI 元素可見性
      const scheduledTaskVisible = await this.page.isVisible('[data-testid="scheduled-task-item"]');
      if (!scheduledTaskVisible) {
        result.errors.push('排程任務在 UI 中不可見');
      }

      // 驗證子任務排程（如果存在）
      const subtaskSchedules = await this.page.$$('[data-testid="subtask-schedule-item"]');
      if (subtaskSchedules.length > 0) {
        // 檢查子任務 ID 格式
        for (const subtaskSchedule of subtaskSchedules) {
          const scheduleId = await subtaskSchedule.getAttribute('data-schedule-id');
          if (scheduleId && scheduleId.includes('-')) {
            result.subtaskSchedulesCorrect = true;
          } else {
            result.errors.push('子任務排程 ID 格式不正確');
            break;
          }
        }
      } else {
        result.subtaskSchedulesCorrect = true; // 沒有子任務排程也算正確
      }

      result.passed = result.errors.length === 0;

      log.info(`🔄 [VALIDATION] Scheduling sync validation completed`, {
        taskStoreHasTask: result.taskStoreHasTask,
        scheduledTasksHasEntry: result.scheduledTasksHasEntry,
        idsMatch: result.idsMatch,
        passed: result.passed
      });

    } catch (error) {
      result.errors.push(`排程同步驗證過程發生錯誤: ${error}`);
      log.error(`❌ [VALIDATION] Scheduling sync validation failed:`, error);
    }

    return result;
  }

  /**
   * 📋 Phase 1: 驗證子任務指引完整性
   * 檢查子任務是否包含 howToStart, successCriteria, nextSteps
   */
  async validateSubtaskGuidance(): Promise<{ passed: boolean; completeness: number; errors: string[] }> {
    log.info(`🔍 [VALIDATION] Starting subtask guidance validation`);
    
    try {
      const subtaskItems = await this.page.$$('[data-testid="subtask-item"]');
      let totalSubtasks = subtaskItems.length;
      let subtasksWithGuidance = 0;
      const errors: string[] = [];

      if (totalSubtasks === 0) {
        errors.push('沒有找到任何子任務');
        return { passed: false, completeness: 0, errors };
      }

      for (let i = 0; i < subtaskItems.length; i++) {
        const subtask = subtaskItems[i];
        
        const hasHowToStart = await subtask.$('[data-testid="guidance-how-to-start"]') !== null;
        const hasSuccessCriteria = await subtask.$('[data-testid="guidance-success-criteria"]') !== null;
        const hasNextSteps = await subtask.$('[data-testid="guidance-next-steps"]') !== null;
        
        const guidanceCount = [hasHowToStart, hasSuccessCriteria, hasNextSteps].filter(Boolean).length;
        
        if (guidanceCount >= 2) { // 至少包含 2/3 的指引要素
          subtasksWithGuidance++;
        } else {
          errors.push(`子任務 ${i + 1} 指引要素不足 (${guidanceCount}/3)`);
        }
      }

      const completeness = Math.round((subtasksWithGuidance / totalSubtasks) * 100);
      const passed = completeness >= 80; // 80% 的子任務需要有完整指引

      log.info(`📋 [VALIDATION] Subtask guidance validation completed`, {
        totalSubtasks,
        subtasksWithGuidance,
        completeness,
        passed
      });

      return { passed, completeness, errors };

    } catch (error) {
      log.error(`❌ [VALIDATION] Subtask guidance validation failed:`, error);
      return { passed: false, completeness: 0, errors: [`驗證過程發生錯誤: ${error}`] };
    }
  }

  /**
   * 📊 驗證性能監控儀表板
   */
  async validatePerformanceMonitor(): Promise<{ passed: boolean; metricsFound: string[]; errors: string[] }> {
    log.info(`🔍 [VALIDATION] Starting performance monitor validation`);
    
    try {
      await this.page.waitForSelector('[data-testid="performance-metrics-container"]', { timeout: 5000 });
      
      const expectedMetrics = [
        'AI 響應時間',
        '子任務生成速度',
        '記憶體使用',
        '用戶流程完成率',
        '錯誤發生率'
      ];
      
      const metricsFound: string[] = [];
      const errors: string[] = [];
      
      for (const expectedMetric of expectedMetrics) {
        const metricElement = await this.page.$(`[data-testid="metric-${expectedMetric}"]`);
        if (metricElement) {
          metricsFound.push(expectedMetric);
        } else {
          errors.push(`未找到指標: ${expectedMetric}`);
        }
      }
      
      const passed = metricsFound.length >= expectedMetrics.length * 0.8; // 80% 指標可見
      
      log.info(`📊 [VALIDATION] Performance monitor validation completed`, {
        metricsFound: metricsFound.length,
        expectedMetrics: expectedMetrics.length,
        passed
      });
      
      return { passed, metricsFound, errors };
      
    } catch (error) {
      log.error(`❌ [VALIDATION] Performance monitor validation failed:`, error);
      return { passed: false, metricsFound: [], errors: [`驗證過程發生錯誤: ${error}`] };
    }
  }
}

/**
 * 工具函數：等待元素並截圖
 */
export async function waitAndScreenshot(
  page: Page, 
  selector: string, 
  screenshotName: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.screenshot({ 
      path: `./test-results/screenshots/${screenshotName}.png`,
      fullPage: true
    });
    return true;
  } catch (error) {
    log.error(`❌ [SCREENSHOT] Failed to capture ${screenshotName}:`, error);
    return false;
  }
}

/**
 * 工具函數：測量操作執行時間
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await operation();
  const executionTime = Date.now() - startTime;
  
  log.info(`⏱️ [TIMING] ${operationName} completed in ${executionTime}ms`);
  
  return { result, executionTime };
}