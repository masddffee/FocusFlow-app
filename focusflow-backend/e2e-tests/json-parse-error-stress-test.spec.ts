import { test, expect, Page, ConsoleMessage, Request, Response } from '@playwright/test';

/**
 * JSON Parse Error Stress Test
 * 专门设计来重现 "Invalid JSON response: Unexpected end of JSON input" 错误
 * 
 * 重点策略：
 * 1. 高频并发轮询测试
 * 2. 网络中断模拟
 * 3. 响应截断模拟
 * 4. 超时场景测试
 * 5. 大数据量处理测试
 */

test.describe('JSON Parse Error Stress Testing', () => {
  let consoleLogs: Array<{
    type: string;
    text: string;
    timestamp: number;
    location?: string;
  }> = [];
  
  let networkActivity: Array<{
    type: 'request' | 'response';
    method?: string;
    url: string;
    status?: number;
    headers?: any;
    body?: string;
    timestamp: number;
    size?: number;
    isIncomplete?: boolean;
  }> = [];
  
  let errorDetails: Array<{
    message: string;
    source: string;
    stack?: string;
    timestamp: number;
  }> = [];

  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleLogs = [];
    networkActivity = [];
    errorDetails = [];

    // 增强的 console 监控
    page.on('console', (msg: ConsoleMessage) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()?.url || 'unknown'
      };
      consoleLogs.push(logEntry);
      
      // 重点监控 JSON 相关错误
      if (logEntry.text.includes('JSON') || 
          logEntry.text.includes('parse') || 
          logEntry.text.includes('Unexpected end') ||
          logEntry.text.includes('pollUntil') ||
          logEntry.text.includes('SyntaxError') ||
          logEntry.text.includes('invalid') ||
          logEntry.type === 'error') {
        console.log(`🚨 [JSON-RELATED] ${logEntry.type}: ${logEntry.text}`);
      }
    });

    // 页面错误监控
    page.on('pageerror', error => {
      const errorEntry = {
        message: error.message,
        source: 'page-error',
        stack: error.stack,
        timestamp: Date.now()
      };
      errorDetails.push(errorEntry);
      console.log(`💥 [PAGE-ERROR] ${error.message}`);
      if (error.stack) {
        console.log(`📍 [ERROR-STACK] ${error.stack}`);
      }
    });

    // 详细的网络响应监控，专注于检测截断的响应
    page.on('response', async (response: Response) => {
      try {
        if (response.url().includes('/api/ai') || response.url().includes('8080')) {
          const responseText = await response.text();
          const isIncomplete = responseText.trim() && 
                               !responseText.trim().endsWith('}') && 
                               !responseText.trim().endsWith(']') &&
                               responseText.trim().startsWith('{');
          
          const responseEntry = {
            type: 'response' as const,
            method: response.request().method(),
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            body: responseText,
            timestamp: Date.now(),
            size: responseText.length,
            isIncomplete
          };
          
          networkActivity.push(responseEntry);
          
          console.log(`🌐 [RESPONSE] ${response.status()} ${response.url()}`);
          console.log(`📦 [RESPONSE-SIZE] ${responseText.length} bytes`);
          
          if (isIncomplete) {
            console.log(`⚠️ [INCOMPLETE-JSON] Response appears to be truncated!`);
            console.log(`🔍 [LAST-100-CHARS] "${responseText.slice(-100)}"`);
          }
          
          // 测试 JSON 解析
          try {
            JSON.parse(responseText);
            console.log(`✅ [JSON-VALID] Response JSON is valid`);
          } catch (jsonError) {
            console.log(`❌ [JSON-INVALID] ${jsonError.message}`);
            console.log(`🔍 [PROBLEM-AREA] Around: "${responseText.slice(-100)}"`);
            
            // 这是我们要捕获的关键错误！
            errorDetails.push({
              message: `JSON Parse Error: ${jsonError.message}`,
              source: 'json-parse-response',
              stack: jsonError.stack,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.log(`⚠️ [RESPONSE-READ-ERROR] ${error.message}`);
        errorDetails.push({
          message: `Response Read Error: ${error.message}`,
          source: 'response-read',
          timestamp: Date.now()
        });
      }
    });

    // 启动前端应用
    console.log('🚀 Starting JSON Parse Error Stress Test...');
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
  });

  test('Stress Test 1: High-frequency Polling Scenario', async () => {
    console.log('🎯 开始高频轮询压力测试...');

    await test.step('Setup and Navigate', async () => {
      await page.waitForSelector('text=FocusFlow', { timeout: 30000 });
      
      // 导航到添加任务页面
      const addTaskButton = page.locator('text=+').or(page.locator('[data-testid="add-task-button"]')).first();
      if (await addTaskButton.isVisible()) {
        await addTaskButton.click();
      } else {
        await page.goto('http://localhost:8082/add-task');
      }
      
      await page.waitForLoadState('networkidle');
    });

    await test.step('Fill Form with Complex Description', async () => {
      // 使用复杂的描述来增加后端处理时间
      const titleInput = page.locator('input').first();
      await titleInput.fill('複雜的機器學習專案');
      
      const descriptionInput = page.locator('textarea').first();
      const complexDescription = `
      我想建立一個完整的機器學習管道，包括：
      1. 數據收集和清理
      2. 特徵工程和選擇
      3. 模型訓練和驗證
      4. 超參數調優
      5. 模型部署和監控
      6. A/B 測試框架
      7. 持續集成和部署
      8. 性能監控和日誌記錄
      9. 數據版本控制
      10. 模型版本管理
      這個專案需要涵蓋深度學習、自然語言處理、計算機視覺等多個領域
      `.trim();
      
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill(complexDescription);
      }
      
      console.log('✅ 复杂任务表单填写完成');
    });

    await test.step('Trigger Smart Generate and Monitor for Errors', async () => {
      console.log('🔍 开始触发 Smart Generate 并监控错误...');
      
      // 清空之前的日志
      consoleLogs = [];
      networkActivity = [];
      errorDetails = [];
      
      const smartGenerateButton = page.locator('text=Smart Generate')
        .or(page.locator('text=智慧生成'))
        .or(page.locator('[data-testid="smart-generate-button"]'))
        .first();
      
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      await smartGenerateButton.click();
      
      console.log('🎯 Smart Generate 已点击，开始监控...');
      
      // 长时间监控，寻找任何 JSON 解析错误
      const monitoringDuration = 60000; // 60秒
      const startTime = Date.now();
      let errorFound = false;
      
      while (Date.now() - startTime < monitoringDuration && !errorFound) {
        await page.waitForTimeout(2000);
        
        const elapsedTime = Date.now() - startTime;
        console.log(`⏱️ 监控进行中... ${Math.round(elapsedTime/1000)}s/60s`);
        
        // 检查是否有新的 JSON 解析错误
        const recentJsonErrors = errorDetails.filter(error => 
          error.timestamp > startTime && 
          (error.message.includes('JSON') || 
           error.message.includes('parse') || 
           error.message.includes('Unexpected end'))
        );
        
        if (recentJsonErrors.length > 0) {
          console.log(`🎯 发现 JSON 解析错误！`);
          recentJsonErrors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.message}`);
            console.log(`     Source: ${error.source}`);
            if (error.stack) {
              console.log(`     Stack: ${error.stack}`);
            }
          });
          errorFound = true;
          break;
        }
        
        // 检查是否有截断的响应
        const incompleteResponses = networkActivity.filter(activity => 
          activity.timestamp > startTime && 
          activity.isIncomplete
        );
        
        if (incompleteResponses.length > 0) {
          console.log(`🔍 发现 ${incompleteResponses.length} 个可能截断的响应`);
          incompleteResponses.forEach((response, index) => {
            console.log(`  ${index + 1}. URL: ${response.url}`);
            console.log(`     Size: ${response.size} bytes`);
            console.log(`     Last 50 chars: "${response.body?.slice(-50)}"`);
          });
        }
        
        // 检查控制台中的 JSON 相关错误
        const recentConsoleErrors = consoleLogs.filter(log => 
          log.timestamp > startTime && 
          log.type === 'error' &&
          (log.text.includes('JSON') || 
           log.text.includes('parse') || 
           log.text.includes('Unexpected end'))
        );
        
        if (recentConsoleErrors.length > 0) {
          console.log(`🚨 控制台发现 JSON 错误:`);
          recentConsoleErrors.forEach((log, index) => {
            console.log(`  ${index + 1}. ${log.text}`);
          });
          errorFound = true;
          break;
        }
      }
      
      await page.screenshot({ 
        path: './test-results/screenshots/stress-test-final.png',
        fullPage: true 
      });
      
      if (!errorFound) {
        console.log('⚠️ 在压力测试中未发现 JSON 解析错误');
      }
    });

    await test.step('Generate Final Error Report', async () => {
      const totalRequests = networkActivity.length;
      const incompleteResponses = networkActivity.filter(r => r.isIncomplete).length;
      const jsonErrors = errorDetails.filter(e => 
        e.message.includes('JSON') || 
        e.message.includes('parse')
      ).length;
      const consoleErrors = consoleLogs.filter(l => l.type === 'error').length;
      
      const errorReport = {
        testName: 'JSON Parse Error Stress Test',
        timestamp: new Date().toISOString(),
        summary: {
          totalNetworkRequests: totalRequests,
          incompleteResponses,
          jsonParseErrors: jsonErrors,
          consoleErrors,
          testDuration: '60 seconds'
        },
        findings: {
          jsonErrorsDetected: jsonErrors > 0,
          incompleteResponsesDetected: incompleteResponses > 0,
          consoleErrorsDetected: consoleErrors > 0
        },
        detailedErrors: errorDetails.map(error => ({
          message: error.message,
          source: error.source,
          timestamp: new Date(error.timestamp).toISOString()
        })),
        incompleteResponses: networkActivity
          .filter(r => r.isIncomplete)
          .map(r => ({
            url: r.url,
            size: r.size,
            timestamp: new Date(r.timestamp).toISOString(),
            lastChars: r.body?.slice(-50) || ''
          }))
      };
      
      console.log('📊 ===========================================');
      console.log('📊 JSON 解析错误压力测试报告');
      console.log('📊 ===========================================');
      console.log(JSON.stringify(errorReport, null, 2));
      
      if (jsonErrors === 0 && incompleteResponses === 0) {
        console.log('✅ 测试结论: 在当前测试条件下，系统表现稳定，未发现 JSON 解析错误');
        console.log('💡 建议: 可能需要更极端的测试条件来重现错误');
      } else {
        console.log('🎯 测试结论: 成功重现了 JSON 解析相关问题');
      }
    });
  });

  test('Stress Test 2: Network Interruption Simulation', async () => {
    console.log('🎯 开始网络中断模拟测试...');

    await test.step('Setup Network Interception', async () => {
      // 拦截 API 请求并模拟各种网络问题
      await page.route('**/api/jobs/**', async (route, request) => {
        const url = request.url();
        console.log(`🌐 [INTERCEPTED] ${request.method()} ${url}`);
        
        // 模拟不同类型的响应问题
        const randomFactor = Math.random();
        
        if (randomFactor < 0.1) {
          // 10% 概率：完全拒绝请求
          console.log(`❌ [SIMULATED] 网络完全中断`);
          route.abort('connectionrefused');
        } else if (randomFactor < 0.2) {
          // 10% 概率：超时
          console.log(`⏰ [SIMULATED] 请求超时`);
          await new Promise(resolve => setTimeout(resolve, 30000));
          route.abort('timeout');
        } else if (randomFactor < 0.3) {
          // 10% 概率：返回截断的 JSON
          console.log(`✂️ [SIMULATED] JSON 响应截断`);
          const originalResponse = await route.fetch();
          const originalText = await originalResponse.text();
          
          if (originalText.trim().startsWith('{')) {
            // 截断 JSON 的最后部分
            const truncatedLength = Math.floor(originalText.length * 0.7);
            const truncatedJson = originalText.substring(0, truncatedLength);
            
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: truncatedJson
            });
          } else {
            route.continue();
          }
        } else {
          // 正常继续
          route.continue();
        }
      });
    });

    await test.step('Execute Test with Network Issues', async () => {
      await page.goto('http://localhost:8082');
      await page.waitForLoadState('networkidle');
      
      // 导航并填写表单
      const addTaskButton = page.locator('text=+').first();
      if (await addTaskButton.isVisible()) {
        await addTaskButton.click();
      } else {
        await page.goto('http://localhost:8082/add-task');
      }
      
      await page.waitForLoadState('networkidle');
      
      const titleInput = page.locator('input').first();
      await titleInput.fill('網路中斷測試');
      
      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('測試網路中斷情況下的 JSON 解析錯誤');
      }
      
      // 触发 Smart Generate
      const smartGenerateButton = page.locator('text=Smart Generate').first();
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      
      console.log('🎯 在网络干扰条件下触发 Smart Generate...');
      await smartGenerateButton.click();
      
      // 监控 30 秒，寻找网络问题导致的 JSON 错误
      const startTime = Date.now();
      const monitoringDuration = 30000;
      
      while (Date.now() - startTime < monitoringDuration) {
        await page.waitForTimeout(2000);
        
        const recentErrors = errorDetails.filter(error => 
          error.timestamp > startTime
        );
        
        if (recentErrors.length > 0) {
          console.log(`🎯 网络干扰测试发现错误:`);
          recentErrors.forEach(error => {
            console.log(`- ${error.message}`);
          });
        }
      }
      
      await page.screenshot({ 
        path: './test-results/screenshots/network-interruption-test.png',
        fullPage: true 
      });
    });
  });

  test.afterEach(async () => {
    console.log('🧹 压力测试清理完成');
    
    // 输出最终统计
    const totalErrors = errorDetails.length;
    const jsonErrors = errorDetails.filter(e => 
      e.message.includes('JSON') || e.message.includes('parse')
    ).length;
    
    console.log(`📈 测试总结:`);
    console.log(`- 总错误数: ${totalErrors}`);
    console.log(`- JSON 解析错误: ${jsonErrors}`);
    console.log(`- 网络活动记录: ${networkActivity.length}`);
    console.log(`- 控制台日志: ${consoleLogs.length}`);
  });
});