import { test, expect, Page, Browser } from '@playwright/test';
import { BrowserManager, RetryManager, AutoRecovery } from './utils/browser-manager';

/**
 * 🔍 專業自動化測試與前端開發工程師診斷套件
 * 針對 FocusFlow 任務管理系統的關鍵問題進行深度分析
 * 
 * 問題一：Create & Schedule Task 操作成功後，UI 未顯示新任務
 * 問題二：生成子任務（subtasks）速度遠慢於預期
 */

interface DiagnosticReport {
  timestamp: string;
  testName: string;
  phase: string;
  status: 'SUCCESS' | 'FAIL' | 'IN_PROGRESS';
  duration: number;
  screenshots: string[];
  consoleLogs: string[];
  networkRequests: any[];
  errors: string[];
  metrics: any;
  recommendations: string[];
}

interface TaskCreationMetrics {
  taskInputTime: number;
  aiGenerationTime: number;
  taskSaveTime: number;
  uiUpdateTime: number;
  totalTime: number;
  storeStateUpdated: boolean;
  uiElementsVisible: boolean;
  routingSuccess: boolean;
}

class DiagnosticManager {
  private reports: DiagnosticReport[] = [];
  
  createReport(testName: string, phase: string): DiagnosticReport {
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      testName,
      phase,
      status: 'IN_PROGRESS',
      duration: 0,
      screenshots: [],
      consoleLogs: [],
      networkRequests: [],
      errors: [],
      metrics: {},
      recommendations: []
    };
    this.reports.push(report);
    return report;
  }
  
  completeReport(report: DiagnosticReport, status: 'SUCCESS' | 'FAIL', startTime: number) {
    report.status = status;
    report.duration = Date.now() - startTime;
  }
  
  generateFinalReport(): string {
    const summary = {
      total: this.reports.length,
      success: this.reports.filter(r => r.status === 'SUCCESS').length,
      failed: this.reports.filter(r => r.status === 'FAIL').length,
      totalDuration: this.reports.reduce((sum, r) => sum + r.duration, 0)
    };
    
    return JSON.stringify({ summary, reports: this.reports }, null, 2);
  }
}

const diagnosticManager = new DiagnosticManager();

test.describe('🔍 FocusFlow 專業問題診斷套件', () => {
  let browser: Browser;
  let browserStats: any;
  
  test.beforeAll(async () => {
    // 使用 BrowserManager 確保無重複開啟
    browser = await BrowserManager.getSafeBrowser();
    browserStats = BrowserManager.getStats();
    console.log('🚀 瀏覽器管理器狀態:', browserStats);
  });
  
  test.afterAll(async () => {
    // 生成最終診斷報告
    const finalReport = diagnosticManager.generateFinalReport();
    console.log('\n📊 =============  最終診斷報告  =============');
    console.log(finalReport);
    
    // 寫入報告文件
    const fs = require('fs');
    fs.writeFileSync('test-results/professional-diagnosis-report.json', finalReport);
    
    // 清理瀏覽器資源
    await BrowserManager.cleanup();
  });

  test('🩺 問題一診斷：任務創建後 UI 未顯示問題', async ({ page }) => {
    const report = diagnosticManager.createReport('UI_DISPLAY_ISSUE', 'TASK_CREATION_ANALYSIS');
    const startTime = Date.now();
    const metrics: TaskCreationMetrics = {
      taskInputTime: 0,
      aiGenerationTime: 0,
      taskSaveTime: 0,
      uiUpdateTime: 0,
      totalTime: 0,
      storeStateUpdated: false,
      uiElementsVisible: false,
      routingSuccess: false
    };
    
    try {
      console.log('🔍 ============ 問題一診斷開始 ============');
      
      // 監控 Console 日誌和錯誤
      const consoleLogs: string[] = [];
      const errors: string[] = [];
      const networkRequests: any[] = [];
      
      page.on('console', msg => {
        const logMessage = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push(logMessage);
        if (msg.type() === 'error') {
          errors.push(logMessage);
        }
      });
      
      page.on('pageerror', error => {
        errors.push(`PageError: ${error.message}`);
      });
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      // 步驟 1: 導航到新增任務頁面
      console.log('📍 步驟 1: 導航到新增任務頁面');
      await page.goto('http://localhost:8081/');
      await page.waitForLoadState('networkidle');
      
      // 截圖：初始狀態
      await page.screenshot({ 
        path: 'test-results/diagnosis-01-initial-state.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-01-initial-state.png');
      
      // 檢查是否有新增任務按鈕
      let addTaskButton;
      const addTaskSelectors = [
        '[data-testid="add-task-button"]',
        'text="Add Task"',
        'text="新增任務"',
        'text="Create Task"',
        '[href="/add-task"]',
        'button:has-text("Add")',
        '.add-task'
      ];
      
      for (const selector of addTaskSelectors) {
        try {
          addTaskButton = page.locator(selector);
          if (await addTaskButton.isVisible()) {
            console.log(`✅ 找到新增任務按鈕: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!addTaskButton || !(await addTaskButton.isVisible())) {
        // 直接導航到 add-task 頁面
        console.log('🔄 直接導航到 /add-task 頁面');
        await page.goto('http://localhost:8081/add-task');
        await page.waitForLoadState('networkidle');
      } else {
        await addTaskButton.click();
        await page.waitForLoadState('networkidle');
      }
      
      // 步驟 2: 填寫任務詳情
      console.log('📍 步驟 2: 填寫任務詳情');
      const inputStartTime = Date.now();
      
      // 尋找標題輸入框
      const titleSelectors = [
        '[data-testid="task-title"]',
        'input[placeholder*="task"]',
        'input[placeholder*="任務"]',
        'input[placeholder*="title"]',
        'input[placeholder*="標題"]'
      ];
      
      let titleInput;
      for (const selector of titleSelectors) {
        try {
          titleInput = page.locator(selector);
          if (await titleInput.isVisible()) {
            console.log(`✅ 找到標題輸入框: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (titleInput && await titleInput.isVisible()) {
        await titleInput.fill('【診斷測試】準備電子學段考');
        console.log('✅ 任務標題填寫完成');
      } else {
        throw new Error('無法找到任務標題輸入框');
      }
      
      // 填寫描述（如果存在）
      const descriptionSelectors = [
        '[data-testid="task-description"]',
        'textarea[placeholder*="description"]',
        'textarea[placeholder*="描述"]'
      ];
      
      for (const selector of descriptionSelectors) {
        try {
          const descInput = page.locator(selector);
          if (await descInput.isVisible()) {
            await descInput.fill('這是一個診斷測試任務，用於檢測任務創建後的 UI 顯示問題');
            console.log('✅ 任務描述填寫完成');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      metrics.taskInputTime = Date.now() - inputStartTime;
      
      // 步驟 3: 設定到期日期和優先級
      console.log('📍 步驟 3: 設定任務屬性');
      
      // 設定到期日期
      const dueDateSelectors = [
        '[data-testid="due-date"]',
        'input[type="date"]',
        'input[placeholder*="date"]'
      ];
      
      for (const selector of dueDateSelectors) {
        try {
          const dateInput = page.locator(selector);
          if (await dateInput.isVisible()) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            await dateInput.fill(futureDate.toISOString().split('T')[0]);
            console.log('✅ 到期日期設定完成');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 設定優先級為高
      const prioritySelectors = [
        'button:has-text("high")',
        'button:has-text("高")',
        '[data-testid="priority-high"]'
      ];
      
      for (const selector of prioritySelectors) {
        try {
          const priorityBtn = page.locator(selector);
          if (await priorityBtn.isVisible()) {
            await priorityBtn.click();
            console.log('✅ 優先級設定為高');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 截圖：任務詳情填寫完成
      await page.screenshot({ 
        path: 'test-results/diagnosis-02-task-details-filled.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-02-task-details-filled.png');
      
      // 步驟 4: 觸發 AI 智能生成（如果可用）
      console.log('📍 步驟 4: 觸發 AI 智能生成');
      const aiStartTime = Date.now();
      
      const smartGenerateSelectors = [
        '[data-testid="smart-generate"]',
        'button:has-text("Smart Generate")',
        'button:has-text("智能生成")',
        'button:has-text("Generate")'
      ];
      
      let aiTriggered = false;
      for (const selector of smartGenerateSelectors) {
        try {
          const smartBtn = page.locator(selector);
          if (await smartBtn.isVisible() && await smartBtn.isEnabled()) {
            await smartBtn.click();
            console.log('✅ AI 智能生成已觸發');
            aiTriggered = true;
            
            // 等待 AI 處理完成
            await page.waitForTimeout(5000);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      metrics.aiGenerationTime = Date.now() - aiStartTime;
      
      if (aiTriggered) {
        // 檢查是否有個人化問題彈窗
        const personalizationModal = page.locator('[data-testid="personalization-modal"], .personalization-modal');
        if (await personalizationModal.isVisible()) {
          console.log('🔄 處理個人化問題彈窗...');
          
          // 快速填寫個人化問題
          const questions = await page.locator('input, textarea').all();
          for (let i = 0; i < Math.min(questions.length, 3); i++) {
            try {
              await questions[i].fill('診斷測試回答');
            } catch (e) {
              continue;
            }
          }
          
          // 提交個人化問題
          const generatePlanBtn = page.locator('button:has-text("Generate Plan"), button:has-text("生成計劃")');
          if (await generatePlanBtn.isVisible()) {
            await generatePlanBtn.click();
            await page.waitForTimeout(8000); // 等待 AI 生成
          }
        }
      }
      
      // 步驟 5: 保存任務並監控狀態變化
      console.log('📍 步驟 5: 保存任務並監控狀態變化');
      const saveStartTime = Date.now();
      
      // 截圖：保存前狀態
      await page.screenshot({ 
        path: 'test-results/diagnosis-03-before-save.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-03-before-save.png');
      
      // 獲取保存前的 Zustand 狀態
      const beforeSaveState = await page.evaluate(() => {
        return window.__ZUSTAND_STORE_STATE__ || null;
      });
      
      console.log('📊 保存前 Zustand 狀態:', beforeSaveState);
      
      // 尋找並點擊保存按鈕
      const saveSelectors = [
        '[data-testid="create-task"]',
        'button:has-text("Create & Schedule Task")',
        'button:has-text("Create Task")',
        'button:has-text("Save")',
        'button:has-text("建立")',
        'button:has-text("保存")',
        '.save-button'
      ];
      
      let saveButton;
      for (const selector of saveSelectors) {
        try {
          saveButton = page.locator(selector);
          if (await saveButton.isVisible() && await saveButton.isEnabled()) {
            console.log(`✅ 找到保存按鈕: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (saveButton && await saveButton.isVisible()) {
        // 點擊保存按鈕
        await saveButton.click();
        console.log('🔄 任務保存中...');
        
        // 等待保存完成
        await page.waitForTimeout(3000);
        
        metrics.taskSaveTime = Date.now() - saveStartTime;
        
        // 檢查是否出現成功提示
        const successIndicators = [
          'text="Success"',
          'text="成功"',
          'text="Task created"',
          'text="已建立"',
          '[data-testid="success-alert"]'
        ];
        
        let successFound = false;
        for (const indicator of successIndicators) {
          try {
            if (await page.locator(indicator).isVisible()) {
              console.log('✅ 發現成功提示');
              successFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // 等待路由變化
        await page.waitForTimeout(2000);
        
        // 步驟 6: 檢查 UI 狀態更新
        console.log('📍 步驟 6: 檢查 UI 狀態更新');
        const uiCheckStartTime = Date.now();
        
        // 獲取保存後的 Zustand 狀態
        const afterSaveState = await page.evaluate(() => {
          return window.__ZUSTAND_STORE_STATE__ || null;
        });
        
        console.log('📊 保存後 Zustand 狀態:', afterSaveState);
        
        // 檢查狀態是否確實更新
        if (beforeSaveState !== afterSaveState) {
          metrics.storeStateUpdated = true;
          console.log('✅ Zustand 狀態已更新');
        } else {
          console.log('❌ Zustand 狀態未更新');
        }
        
        // 檢查當前頁面 URL
        const currentUrl = page.url();
        console.log('🔗 當前頁面 URL:', currentUrl);
        
        if (currentUrl.includes('/add-task')) {
          console.log('🔄 仍在新增任務頁面，檢查是否有錯誤');
          metrics.routingSuccess = false;
        } else {
          console.log('✅ 已離開新增任務頁面');
          metrics.routingSuccess = true;
        }
        
        // 截圖：保存後狀態
        await page.screenshot({ 
          path: 'test-results/diagnosis-04-after-save.png',
          fullPage: true 
        });
        report.screenshots.push('diagnosis-04-after-save.png');
        
        // 步驟 7: 驗證任務是否在首頁顯示
        console.log('📍 步驟 7: 驗證任務在首頁顯示');
        
        // 導航到首頁
        await page.goto('http://localhost:8081/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // 截圖：首頁狀態
        await page.screenshot({ 
          path: 'test-results/diagnosis-05-home-page.png',
          fullPage: true 
        });
        report.screenshots.push('diagnosis-05-home-page.png');
        
        // 檢查任務是否顯示
        const taskDisplaySelectors = [
          'text="【診斷測試】準備電子學段考"',
          'text="準備電子學段考"',
          'text="診斷測試"',
          '[data-testid="task-item"]',
          '.task-item',
          '.schedule-item'
        ];
        
        let taskVisible = false;
        for (const selector of taskDisplaySelectors) {
          try {
            if (await page.locator(selector).isVisible()) {
              console.log(`✅ 在首頁找到任務: ${selector}`);
              taskVisible = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!taskVisible) {
          console.log('❌ 在首頁未找到任務，檢查任務列表頁面');
          
          // 嘗試導航到任務列表
          const taskTabSelectors = [
            '[data-testid="tasks-tab"]',
            'text="Tasks"',
            'text="任務"',
            '[href="/tasks"]'
          ];
          
          for (const selector of taskTabSelectors) {
            try {
              const tab = page.locator(selector);
              if (await tab.isVisible()) {
                await tab.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                console.log('🔄 已導航到任務列表頁面');
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          // 截圖：任務列表頁面
          await page.screenshot({ 
            path: 'test-results/diagnosis-06-tasks-page.png',
            fullPage: true 
          });
          report.screenshots.push('diagnosis-06-tasks-page.png');
          
          // 再次檢查任務是否顯示
          for (const selector of taskDisplaySelectors) {
            try {
              if (await page.locator(selector).isVisible()) {
                console.log(`✅ 在任務列表找到任務: ${selector}`);
                taskVisible = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        metrics.uiElementsVisible = taskVisible;
        metrics.uiUpdateTime = Date.now() - uiCheckStartTime;
        
        if (taskVisible) {
          console.log('✅ 任務成功顯示在 UI 中');
        } else {
          console.log('❌ 任務未在 UI 中顯示 - 這是主要問題！');
          
          // 深度診斷：檢查 DOM 內容
          const bodyText = await page.locator('body').textContent();
          console.log('🔍 頁面內容片段:', bodyText?.substring(0, 500));
          
          // 檢查是否有任何任務相關元素
          const allTasks = await page.locator('[data-testid*="task"], .task, .schedule').count();
          console.log('🔍 頁面中任務相關元素數量:', allTasks);
        }
        
      } else {
        throw new Error('無法找到保存按鈕');
      }
      
      metrics.totalTime = Date.now() - startTime;
      
      // 生成診斷建議
      const recommendations: string[] = [];
      
      if (!metrics.storeStateUpdated) {
        recommendations.push('Zustand 狀態未正確更新，檢查 addTask() 函數實現');
      }
      
      if (!metrics.routingSuccess) {
        recommendations.push('路由跳轉失敗，檢查 router.back() 或 router.push() 實現');
      }
      
      if (!metrics.uiElementsVisible) {
        recommendations.push('UI 未顯示新任務，檢查組件重新渲染邏輯和狀態訂閱');
      }
      
      if (metrics.aiGenerationTime > 15000) {
        recommendations.push('AI 生成時間過長，檢查 API 調用和 Job 系統效能');
      }
      
      report.metrics = metrics;
      report.recommendations = recommendations;
      report.consoleLogs = consoleLogs;
      report.errors = errors;
      report.networkRequests = networkRequests;
      
      diagnosticManager.completeReport(report, 'SUCCESS', startTime);
      
      console.log('🔍 ============ 問題一診斷完成 ============');
      console.log('📊 任務創建指標:', metrics);
      console.log('💡 診斷建議:', recommendations);
      
    } catch (error) {
      console.error('❌ 問題一診斷失敗:', error);
      report.errors.push(`診斷失敗: ${error.message}`);
      diagnosticManager.completeReport(report, 'FAIL', startTime);
      
      // 錯誤恢復
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    }
  });

  test('⚡ 問題二診斷：子任務生成速度慢問題', async ({ page }) => {
    const report = diagnosticManager.createReport('SUBTASK_GENERATION_SPEED', 'PERFORMANCE_ANALYSIS');
    const startTime = Date.now();
    
    try {
      console.log('🔍 ============ 問題二診斷開始 ============');
      
      // 監控網路請求和時間
      const networkTimings: any[] = [];
      const performanceMarkers: any[] = [];
      
      page.on('request', request => {
        networkTimings.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });
      
      page.on('response', response => {
        networkTimings.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      });
      
      // 導航到新增任務頁面
      await page.goto('http://localhost:8081/add-task');
      await page.waitForLoadState('networkidle');
      
      // 填寫任務資訊
      const titleInput = page.locator('input[placeholder*="task"], input[placeholder*="任務"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('【效能測試】React Native 進階開發');
      }
      
      const descInput = page.locator('textarea[placeholder*="description"], textarea[placeholder*="描述"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('深度學習 React Native 進階概念，包括效能優化、狀態管理、原生模組整合等複雜主題');
      }
      
      // 截圖：測試準備完成
      await page.screenshot({ 
        path: 'test-results/diagnosis-speed-01-prepared.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-speed-01-prepared.png');
      
      // 步驟 1: 測量 AI 智能生成速度
      console.log('📍 開始測量 AI 智能生成速度...');
      const aiStartTime = Date.now();
      performanceMarkers.push({ event: 'ai_generation_start', timestamp: aiStartTime });
      
      // 觸發智能生成
      const smartGenerateBtn = page.locator('button:has-text("Smart Generate"), button:has-text("智能生成")').first();
      if (await smartGenerateBtn.isVisible()) {
        await smartGenerateBtn.click();
        
        // 監控載入狀態
        const loadingIndicators = [
          '[data-testid="loading"]',
          '.loading',
          '.spinner',
          'text="生成中"',
          'text="Generating"'
        ];
        
        let loadingVisible = false;
        for (const indicator of loadingIndicators) {
          try {
            if (await page.locator(indicator).isVisible()) {
              console.log('🔄 檢測到載入狀態');
              loadingVisible = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // 等待個人化問題出現或子任務生成完成
        const maxWaitTime = 30000; // 30 秒最大等待時間
        const checkInterval = 1000;
        let elapsedTime = 0;
        let generationComplete = false;
        
        while (elapsedTime < maxWaitTime && !generationComplete) {
          await page.waitForTimeout(checkInterval);
          elapsedTime += checkInterval;
          
          // 檢查是否出現個人化問題彈窗
          const personalizationModal = page.locator('[data-testid="personalization-modal"], .personalization-modal');
          if (await personalizationModal.isVisible()) {
            const personalizationTime = Date.now() - aiStartTime;
            console.log(`✅ 個人化問題生成完成: ${personalizationTime}ms`);
            performanceMarkers.push({ 
              event: 'personalization_questions_ready', 
              timestamp: Date.now(),
              duration: personalizationTime 
            });
            
            // 快速填寫個人化問題
            await page.fill('input, textarea', '效能測試專用回答');
            
            // 提交並等待子任務生成
            const generatePlanBtn = page.locator('button:has-text("Generate Plan"), button:has-text("生成計劃")');
            if (await generatePlanBtn.isVisible()) {
              const subtaskStartTime = Date.now();
              await generatePlanBtn.click();
              performanceMarkers.push({ event: 'subtask_generation_start', timestamp: subtaskStartTime });
              
              // 等待子任務生成完成
              let subtaskGenerationComplete = false;
              let subtaskWaitTime = 0;
              const maxSubtaskWait = 45000; // 45 秒最大等待
              
              while (subtaskWaitTime < maxSubtaskWait && !subtaskGenerationComplete) {
                await page.waitForTimeout(1000);
                subtaskWaitTime += 1000;
                
                // 檢查是否有子任務出現
                const subtaskElements = await page.locator('[data-testid="subtask"], .subtask-card, .subtask').count();
                if (subtaskElements > 0) {
                  const subtaskCompleteTime = Date.now();
                  const subtaskDuration = subtaskCompleteTime - subtaskStartTime;
                  console.log(`✅ 子任務生成完成: ${subtaskDuration}ms, 數量: ${subtaskElements}`);
                  
                  performanceMarkers.push({ 
                    event: 'subtask_generation_complete', 
                    timestamp: subtaskCompleteTime,
                    duration: subtaskDuration,
                    subtaskCount: subtaskElements 
                  });
                  
                  subtaskGenerationComplete = true;
                }
                
                // 檢查是否生成完成但沒有子任務
                const completionIndicators = [
                  'text="Generated"',
                  'text="已生成"',
                  'text="完成"',
                  'button:has-text("Create")'
                ];
                
                for (const indicator of completionIndicators) {
                  try {
                    if (await page.locator(indicator).isVisible()) {
                      subtaskGenerationComplete = true;
                      console.log('🔚 生成流程完成');
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
              }
              
              if (!subtaskGenerationComplete) {
                console.log('⏰ 子任務生成超時');
                performanceMarkers.push({ 
                  event: 'subtask_generation_timeout', 
                  timestamp: Date.now(),
                  duration: maxSubtaskWait 
                });
              }
            }
            
            generationComplete = true;
          }
          
          // 檢查是否直接生成了子任務（無個人化問題）
          const subtaskElements = await page.locator('[data-testid="subtask"], .subtask-card, .subtask').count();
          if (subtaskElements > 0) {
            const directGenerationTime = Date.now() - aiStartTime;
            console.log(`✅ 直接生成子任務完成: ${directGenerationTime}ms, 數量: ${subtaskElements}`);
            performanceMarkers.push({ 
              event: 'direct_subtask_generation_complete', 
              timestamp: Date.now(),
              duration: directGenerationTime,
              subtaskCount: subtaskElements 
            });
            generationComplete = true;
          }
        }
        
        if (!generationComplete) {
          console.log('❌ AI 生成流程超時');
          performanceMarkers.push({ 
            event: 'ai_generation_timeout', 
            timestamp: Date.now(),
            duration: maxWaitTime 
          });
        }
        
      } else {
        console.log('❌ 無法找到智能生成按鈕');
      }
      
      // 截圖：生成完成狀態
      await page.screenshot({ 
        path: 'test-results/diagnosis-speed-02-generation-complete.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-speed-02-generation-complete.png');
      
      // 分析效能指標
      const totalGenerationTime = Date.now() - aiStartTime;
      const speedMetrics = {
        totalGenerationTime,
        performanceMarkers,
        networkTimings,
        recommendations: []
      };
      
      // 生成效能建議
      if (totalGenerationTime > 20000) {
        speedMetrics.recommendations.push('總生成時間超過 20 秒，建議優化 API 調用流程');
      }
      
      if (totalGenerationTime > 30000) {
        speedMetrics.recommendations.push('生成時間嚴重超時，檢查後端 Job 系統和 Gemini API 效能');
      }
      
      // 分析網路請求模式
      const apiRequests = networkTimings.filter(t => t.url?.includes('/api/'));
      if (apiRequests.length > 10) {
        speedMetrics.recommendations.push('API 請求過多，考慮批次處理或減少請求次數');
      }
      
      report.metrics = speedMetrics;
      report.networkRequests = networkTimings;
      
      console.log('🔍 ============ 問題二診斷完成 ============');
      console.log('📊 效能指標:', speedMetrics);
      
      diagnosticManager.completeReport(report, 'SUCCESS', startTime);
      
    } catch (error) {
      console.error('❌ 問題二診斷失敗:', error);
      report.errors.push(`診斷失敗: ${error.message}`);
      diagnosticManager.completeReport(report, 'FAIL', startTime);
      
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    }
  });

  test('🔄 端到端完整流程驗證', async ({ page }) => {
    const report = diagnosticManager.createReport('END_TO_END_FLOW', 'COMPLETE_WORKFLOW_TEST');
    const startTime = Date.now();
    
    try {
      console.log('🔍 ============ 端到端流程驗證開始 ============');
      
      // 使用 RetryManager 進行智慧重試
      await RetryManager.retryWithBackoff(async () => {
        // 完整任務創建流程
        await page.goto('http://localhost:8081/add-task');
        await page.waitForLoadState('networkidle');
        
        // 填寫任務
        const titleInput = page.locator('input').first();
        await titleInput.fill('【完整流程測試】機器學習專案');
        
        // 創建任務
        const createBtn = page.locator('button:has-text("Create"), button:has-text("建立")').first();
        await createBtn.click();
        
        // 驗證跳轉
        await page.waitForTimeout(3000);
        
        // 檢查任務是否出現
        await page.goto('http://localhost:8081/');
        await page.waitForLoadState('networkidle');
        
        const taskExists = await page.locator('text="機器學習專案"').isVisible();
        if (!taskExists) {
          throw new Error('任務未在 UI 中顯示');
        }
        
        console.log('✅ 端到端流程驗證成功');
      }, 3, 2000);
      
      // 截圖：最終成功狀態
      await page.screenshot({ 
        path: 'test-results/diagnosis-e2e-success.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-e2e-success.png');
      
      diagnosticManager.completeReport(report, 'SUCCESS', startTime);
      
    } catch (error) {
      console.error('❌ 端到端流程驗證失敗:', error);
      report.errors.push(`流程驗證失敗: ${error.message}`);
      diagnosticManager.completeReport(report, 'FAIL', startTime);
      
      // 截圖：失敗狀態
      await page.screenshot({ 
        path: 'test-results/diagnosis-e2e-failure.png',
        fullPage: true 
      });
      report.screenshots.push('diagnosis-e2e-failure.png');
      
      throw error;
    }
  });
});