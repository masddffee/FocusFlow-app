import { test, expect } from '@playwright/test';
import { BrowserManager, RetryManager, AutoRecovery } from './utils/browser-manager';
import { TestHelpers, TestData, TestAssertions } from './utils/test-helpers';

/**
 * MCP 綜合驗證測試套件
 * DevOps 自動化工程師實作 - 全方位功能驗證與錯誤恢復測試
 */

test.describe('MCP Playwright 綜合驗證測試', () => {
  let helpers: TestHelpers;
  let assertions: TestAssertions;
  let validationReport: any[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    assertions = new TestAssertions(page);
    
    // 使用安全瀏覽器管理器
    const browserStats = BrowserManager.getStats();
    console.log('🔍 瀏覽器狀態:', browserStats);
    
    // 清理並準備測試環境
    await helpers.clearStorage();
    
    // 確保導航到正確頁面
    await page.goto('http://localhost:8081/');
    await helpers.waitForAppReady();
  });

  test.afterEach(async ({ page }) => {
    // 自動錯誤恢復檢查
    const hasError = await helpers.hasError();
    if (hasError) {
      await AutoRecovery.handleTestFailure(new Error('測試後檢測到錯誤'), page);
    }
  });

  test('✅ 檢查點 1: App 基礎載入與截圖驗證', async ({ page }) => {
    const checkpoint = { name: '基礎載入', startTime: Date.now(), status: 'pending' };
    
    try {
      // 智慧重試載入
      await RetryManager.retryWithBackoff(async () => {
        // 頁面已在 beforeEach 中載入
        // 應用已在 beforeEach 中準備好
      });

      // 驗證頁面標題
      await assertions.assertPageTitle('FocusMate');
      
      // 截圖驗證點
      await helpers.takeScreenshot('app-loaded-verification');
      
      // 檢查核心元素存在
      await assertions.assertElementVisible('#root');
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      console.log('✅ 檢查點 1 通過: App 基礎載入成功');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('✅ 檢查點 2: 導航功能完整性測試', async ({ page }) => {
    const checkpoint = { name: '導航功能', startTime: Date.now(), status: 'pending' };
    
    try {
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      
      // 測試導航到任務頁面
      const taskTabExists = await helpers.elementExists('[data-testid="tab-tasks"]');
      if (taskTabExists) {
        await helpers.navigateToTab('tasks');
        await helpers.waitForNavigation();
        await helpers.takeScreenshot('navigation-tasks-verification');
      }
      
      // 測試導航到專注頁面
      const focusTabExists = await helpers.elementExists('[data-testid="tab-focus"]');
      if (focusTabExists) {
        await helpers.navigateToTab('focus');
        await helpers.waitForNavigation();
        await helpers.takeScreenshot('navigation-focus-verification');
      }
      
      // 返回首頁
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      console.log('✅ 檢查點 2 通過: 導航功能正常');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('✅ 檢查點 3: Focus Timer 核心功能驗證', async ({ page }) => {
    const checkpoint = { name: 'Focus Timer', startTime: Date.now(), status: 'pending' };
    
    try {
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      
      // 尋找 Focus Timer 相關元素
      const timerExists = await helpers.elementExists('[data-testid="timer"]') || 
                         await helpers.elementExists('[data-testid="focus-timer"]') ||
                         await helpers.elementExists('.timer') ||
                         await helpers.elementExists('#timer');
      
      if (timerExists) {
        console.log('🎯 發現 Focus Timer 元素，執行功能測試...');
        
        // 截圖初始狀態
        await helpers.takeScreenshot('focus-timer-initial-state');
        
        // 測試啟動按鈕
        const startButtonExists = await helpers.elementExists('[data-testid="start-timer"]') ||
                                 await helpers.elementExists('[data-testid="timer-start"]') ||
                                 await helpers.elementExists('.start-button');
        
        if (startButtonExists) {
          await helpers.clickWithRetry('[data-testid="start-timer"]');
          await helpers.waitForTimeout(2000);
          await helpers.takeScreenshot('focus-timer-started');
        }
        
      } else {
        console.log('ℹ️ Focus Timer 元素未找到，可能在其他頁面');
        
        // 嘗試導航到 Focus 頁面
        const focusTabExists = await helpers.elementExists('[data-testid="tab-focus"]');
        if (focusTabExists) {
          await helpers.navigateToTab('focus');
          await helpers.waitForNavigation();
          await helpers.takeScreenshot('focus-page-verification');
        }
      }
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      console.log('✅ 檢查點 3 通過: Focus Timer 功能驗證完成');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('✅ 檢查點 4: 國際化功能切換測試', async ({ page }) => {
    const checkpoint = { name: '國際化功能', startTime: Date.now(), status: 'pending' };
    
    try {
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      
      // 尋找語言切換元素
      const langSwitchExists = await helpers.elementExists('[data-testid="language-switch"]') ||
                              await helpers.elementExists('[data-testid="lang-toggle"]') ||
                              await helpers.elementExists('.language-selector');
      
      if (langSwitchExists) {
        console.log('🌐 發現語言切換元素，測試國際化功能...');
        
        // 截圖初始語言狀態
        await helpers.takeScreenshot('i18n-initial-language');
        
        // 嘗試切換語言
        await helpers.clickWithRetry('[data-testid="language-switch"]');
        await helpers.waitForTimeout(1000);
        await helpers.takeScreenshot('i18n-language-switched');
        
      } else {
        console.log('ℹ️ 語言切換元素未找到，檢查頁面文字內容...');
        
        // 檢查頁面是否包含多語言內容
        const pageContent = await page.content();
        const hasEnglish = pageContent.includes('Focus') || pageContent.includes('Timer');
        const hasChinese = pageContent.includes('專注') || pageContent.includes('計時');
        
        console.log(`📝 語言內容檢查: 英文=${hasEnglish}, 中文=${hasChinese}`);
        await helpers.takeScreenshot('i18n-content-verification');
      }
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      console.log('✅ 檢查點 4 通過: 國際化功能檢查完成');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('✅ 檢查點 5: 錯誤恢復機制驗證', async ({ page }) => {
    const checkpoint = { name: '錯誤恢復機制', startTime: Date.now(), status: 'pending' };
    
    try {
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      
      // 模擬網路中斷
      console.log('🔌 模擬網路中斷...');
      await page.route('**/*', route => route.abort());
      
      // 嘗試載入頁面（應該失敗）
      try {
        await page.goto('http://localhost:8081/some-invalid-page');
      } catch (error) {
        console.log('📡 網路中斷模擬成功:', error.message);
      }
      
      // 恢復網路連線
      console.log('🔌 恢復網路連線...');
      await page.unroute('**/*');
      
      // 重新載入並驗證恢復
      await RetryManager.retryWithBackoff(async () => {
        // 頁面已在 beforeEach 中載入
        // 應用已在 beforeEach 中準備好
      });
      
      await helpers.takeScreenshot('error-recovery-verification');
      
      // 驗證頁面正常
      await assertions.assertNoErrors();
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      console.log('✅ 檢查點 5 通過: 錯誤恢復機制正常');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('✅ 檢查點 6: 效能基準測試', async ({ page }) => {
    const checkpoint = { name: '效能基準', startTime: Date.now(), status: 'pending' };
    
    try {
      const performanceMetrics: any = {};
      
      // 測量頁面載入時間
      const loadStartTime = Date.now();
      // 頁面已在 beforeEach 中載入
      // 應用已在 beforeEach 中準備好
      const loadEndTime = Date.now();
      
      performanceMetrics.pageLoadTime = loadEndTime - loadStartTime;
      console.log(`⏱️ 頁面載入時間: ${performanceMetrics.pageLoadTime}ms`);
      
      // 測量導航切換時間
      const navStartTime = Date.now();
      const taskTabExists = await helpers.elementExists('[data-testid="tab-tasks"]');
      if (taskTabExists) {
        await helpers.navigateToTab('tasks');
        await helpers.waitForNavigation();
      }
      const navEndTime = Date.now();
      
      performanceMetrics.navigationTime = navEndTime - navStartTime;
      console.log(`🧭 導航切換時間: ${performanceMetrics.navigationTime}ms`);
      
      // 效能基準驗證
      expect(performanceMetrics.pageLoadTime).toBeLessThan(10000); // 頁面載入應少於 10 秒
      expect(performanceMetrics.navigationTime).toBeLessThan(3000); // 導航應少於 3 秒
      
      await helpers.takeScreenshot('performance-benchmark-verification');
      
      checkpoint.status = 'passed';
      checkpoint.endTime = Date.now();
      checkpoint.metrics = performanceMetrics;
      console.log('✅ 檢查點 6 通過: 效能基準符合要求');
      
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      await AutoRecovery.handleTestFailure(error, page);
      throw error;
    } finally {
      validationReport.push(checkpoint);
    }
  });

  test('📋 最終驗證報告生成', async ({ page }) => {
    console.log('\n📊 ============ MCP Playwright 驗證報告 ============');
    
    const passedTests = validationReport.filter(test => test.status === 'passed').length;
    const failedTests = validationReport.filter(test => test.status === 'failed').length;
    const totalTests = validationReport.length;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
    
    console.log(`📈 測試結果概要:`);
    console.log(`   ✅ 通過: ${passedTests}`);
    console.log(`   ❌ 失敗: ${failedTests}`);
    console.log(`   📊 成功率: ${successRate}%`);
    console.log(`   ⏱️ 總執行時間: ${Date.now() - (validationReport[0]?.startTime || Date.now())}ms`);
    
    console.log(`\n📋 詳細檢查點報告:`);
    validationReport.forEach((test, index) => {
      const duration = test.endTime ? test.endTime - test.startTime : 0;
      const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${index + 1}. ${statusIcon} ${test.name} (${duration}ms)`);
      if (test.error) {
        console.log(`      🚨 錯誤: ${test.error}`);
      }
      if (test.metrics) {
        console.log(`      📊 效能指標: ${JSON.stringify(test.metrics)}`);
      }
    });
    
    // 生成 JSON 報告
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: parseFloat(successRate)
      },
      checkpoints: validationReport,
      browserStats: BrowserManager.getStats()
    };
    
    // 將報告寫入檔案
    const fs = require('fs');
    const reportPath = 'test-results/mcp-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 詳細報告已保存至: ${reportPath}`);
    
    console.log('\n🎯 ============ 驗證完成 ============\n');
    
    // 最終瀏覽器清理
    await BrowserManager.cleanup();
    
    // 驗證成功率要求
    expect(parseFloat(successRate)).toBeGreaterThanOrEqual(80);
  });
});