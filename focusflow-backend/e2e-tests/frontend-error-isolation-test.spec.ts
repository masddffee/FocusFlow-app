import { test, expect, Page, ConsoleMessage, Request, Response } from '@playwright/test';

/**
 * Frontend Error Isolation Test
 * 专门用于重现和分析前端 "Invalid JSON response: Unexpected end of JSON input" 错误
 * 
 * 重点监控：
 * 1. 前端 console 错误的详细位置
 * 2. apiRequest 函数的调试日志
 * 3. pollUntilComplete 的轮询过程
 * 4. 网络请求格式差异
 * 5. JSON 回应截断问题
 * 6. 时序和超时问题
 */

test.describe('Frontend Error Isolation - JSON Parse Error Analysis', () => {
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

    // 启用详细的 console 监控
    page.on('console', (msg: ConsoleMessage) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()?.url || 'unknown'
      };
      consoleLogs.push(logEntry);
      
      // 特别关注 API 相关的日志
      if (logEntry.text.includes('API') || 
          logEntry.text.includes('JSON') || 
          logEntry.text.includes('pollUntil') ||
          logEntry.text.includes('apiRequest')) {
        console.log(`🔍 [FRONTEND-LOG] ${logEntry.type}: ${logEntry.text}`);
      }
    });

    // 监控页面错误
    page.on('pageerror', error => {
      const errorEntry = {
        message: error.message,
        source: 'page-error',
        stack: error.stack,
        timestamp: Date.now()
      };
      errorDetails.push(errorEntry);
      console.log(`❌ [PAGE-ERROR] ${error.message}`);
      if (error.stack) {
        console.log(`📍 [ERROR-STACK] ${error.stack}`);
      }
    });

    // 详细的网络请求监控
    page.on('request', (request: Request) => {
      const requestEntry = {
        type: 'request' as const,
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body: request.postData() || '',
        timestamp: Date.now()
      };
      networkActivity.push(requestEntry);
      
      // 关注 AI API 请求
      if (request.url().includes('/api/ai') || request.url().includes('8080')) {
        console.log(`🌐 [REQUEST] ${request.method()} ${request.url()}`);
        console.log(`📋 [REQUEST-HEADERS] ${JSON.stringify(request.headers(), null, 2)}`);
        if (request.postData()) {
          console.log(`📦 [REQUEST-BODY] ${request.postData()}`);
        }
      }
    });

    // 详细的网络响应监控
    page.on('response', async (response: Response) => {
      const responseEntry = {
        type: 'response' as const,
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now(),
        size: parseInt(response.headers()['content-length'] || '0')
      };
      
      // 尝试获取响应体（谨慎处理大响应）
      try {
        if (response.url().includes('/api/ai') || response.url().includes('8080')) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const responseText = await response.text();
            responseEntry.body = responseText;
            
            console.log(`🌐 [RESPONSE] ${response.status()} ${response.url()}`);
            console.log(`📋 [RESPONSE-HEADERS] ${JSON.stringify(response.headers(), null, 2)}`);
            console.log(`📦 [RESPONSE-BODY] Length: ${responseText.length}`);
            console.log(`📦 [RESPONSE-CONTENT] ${responseText.substring(0, 1000)}${responseText.length > 1000 ? '...' : ''}`);
            
            // 检查是否是不完整的 JSON
            if (responseText.trim() && !responseText.trim().endsWith('}') && !responseText.trim().endsWith(']')) {
              console.log(`⚠️ [INCOMPLETE-JSON] Response appears to be truncated!`);
              console.log(`🔍 [LAST-CHARS] "${responseText.slice(-50)}"`);
            }
            
            // 尝试解析 JSON 来检测问题
            try {
              JSON.parse(responseText);
              console.log(`✅ [JSON-VALID] Response JSON is valid`);
            } catch (jsonError) {
              console.log(`❌ [JSON-INVALID] ${jsonError.message}`);
              console.log(`🔍 [PROBLEM-AREA] Around: "${responseText.slice(-100)}"`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ [RESPONSE-READ-ERROR] ${error.message}`);
      }
      
      networkActivity.push(responseEntry);
    });

    // 启动前端应用
    console.log('🚀 Starting Frontend Error Isolation Test...');
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
  });

  test('Reproduce Frontend JSON Parse Error', async () => {
    console.log('🎯 开始重现前端 JSON 解析错误...');

    // Step 1: 验证应用加载
    await test.step('验证 FocusFlow 应用正确加载', async () => {
      await page.waitForSelector('text=FocusFlow', { timeout: 30000 });
      await page.waitForSelector('text=Welcome back!', { timeout: 10000 });
      
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-01-app-loaded.png',
        fullPage: true 
      });
      
      console.log('✅ 应用加载成功');
    });

    // Step 2: 导航到添加任务页面
    await test.step('导航到添加任务页面', async () => {
      const addTaskButton = page.locator('text=+').or(page.locator('[data-testid="add-task-button"]')).or(page.locator('button:has-text("+")')).first();
      
      if (await addTaskButton.isVisible()) {
        await addTaskButton.click();
      } else {
        await page.goto('http://localhost:8082/add-task');
      }
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-02-add-task-page.png',
        fullPage: true 
      });
      
      console.log('✅ 成功导航到添加任务页面');
    });

    // Step 3: 填写任务表单（使用测试数据）
    await test.step('填写任务创建表单', async () => {
      await page.waitForSelector('input, textarea', { timeout: 10000 });
      
      // 填写任务标题
      const titleInput = page.locator('input').first();
      await titleInput.fill('學習 Python');
      
      // 填写任务描述
      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('我想學習 Python 程式設計，目標是能夠開發網頁應用');
      }
      
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-03-form-filled.png',
        fullPage: true 
      });
      
      console.log('✅ 任务表单填写完成');
    });

    // Step 4: 点击 Smart Generate 并监控第一阶段
    await test.step('点击 Smart Generate 并监控第一阶段（个人化问题）', async () => {
      console.log('🔍 准备点击 Smart Generate 按钮...');
      
      // 清空之前的日志
      consoleLogs = [];
      networkActivity = [];
      errorDetails = [];
      
      const smartGenerateButton = page.locator('text=Smart Generate')
        .or(page.locator('text=智慧生成'))
        .or(page.locator('[data-testid="smart-generate-button"]'))
        .or(page.locator('button:has-text("AI")'))
        .first();
      
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      
      console.log('🎯 点击 Smart Generate 按钮...');
      await smartGenerateButton.click();
      
      // 等待第一阶段的网络活动
      await page.waitForTimeout(8000);
      
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-04-smart-generate-clicked.png',
        fullPage: true 
      });
      
      console.log('📊 第一阶段网络活动分析:');
      const phase1Requests = networkActivity.filter(activity => 
        activity.type === 'request' && 
        activity.timestamp > Date.now() - 10000 &&
        (activity.url.includes('/api/ai') || activity.url.includes('8080'))
      );
      console.log(`- 发现 ${phase1Requests.length} 个 AI API 请求`);
    });

    // Step 5: 处理个人化问题对话框
    await test.step('处理个人化问题对话框', async () => {
      console.log('🤔 等待个人化问题对话框...');
      
      try {
        // 等待对话框出现
        await page.waitForSelector('text=個人化問題, text=問題, [data-testid="question-dialog"]', { timeout: 15000 });
        
        console.log('✅ 个人化问题对话框出现');
        
        await page.screenshot({ 
          path: './test-results/screenshots/error-isolation-05-questions-dialog.png',
          fullPage: true 
        });
        
        // 填写答案
        const answerInputs = page.locator('input[type="text"], textarea');
        const answerCount = await answerInputs.count();
        
        if (answerCount > 0) {
          console.log(`📝 发现 ${answerCount} 个问题输入框，开始填写答案...`);
          
          const sampleAnswers = [
            '我是程式設計初學者',
            '每天可以學習 2-3 小時',
            '希望在 3 個月內達成目標'
          ];
          
          for (let i = 0; i < Math.min(answerCount, 3); i++) {
            await answerInputs.nth(i).fill(sampleAnswers[i] || '是的');
          }
          
          console.log('✅ 个人化问题答案填写完成');
        }
        
        // 点击提交按钮
        const continueButton = page.locator('text=繼續, text=Submit, text=確認, button[type="submit"]').first();
        if (await continueButton.isVisible()) {
          console.log('🎯 点击提交按钮，进入第二阶段...');
          
          // 清空网络活动日志，专注于第二阶段
          networkActivity = [];
          consoleLogs = [];
          errorDetails = [];
          
          await continueButton.click();
          console.log('✅ 个人化问题已提交，等待第二阶段处理...');
        }
        
      } catch (error) {
        console.log('⚠️ 个人化问题对话框未在预期时间内出现');
        await page.screenshot({ 
          path: './test-results/screenshots/error-isolation-05-no-questions-dialog.png',
          fullPage: true 
        });
        return; // 提前结束，因为没有达到第二阶段
      }
    });

    // Step 6: 监控第二阶段（完整计划生成）- 关键错误监控点
    await test.step('监控第二阶段 - 完整计划生成（错误重现关键点）', async () => {
      console.log('🚨 进入第二阶段监控 - 这里通常发生 JSON 解析错误...');
      
      // 设置更长的监控时间来捕获完整的轮询过程
      const monitoringDuration = 45000; // 45秒
      const startTime = Date.now();
      
      while (Date.now() - startTime < monitoringDuration) {
        await page.waitForTimeout(5000); // 每5秒检查一次
        
        const elapsedTime = Date.now() - startTime;
        console.log(`⏱️ 第二阶段监控进行中... ${Math.round(elapsedTime/1000)}s/${Math.round(monitoringDuration/1000)}s`);
        
        // 检查是否有新的错误
        const recentErrors = errorDetails.filter(error => error.timestamp > startTime);
        if (recentErrors.length > 0) {
          console.log(`❌ 发现 ${recentErrors.length} 个新错误:`);
          recentErrors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.message}`);
            if (error.stack) {
              console.log(`     Stack: ${error.stack.split('\n')[0]}`);
            }
          });
        }
        
        // 检查是否有 JSON 相关的 console 错误
        const recentJsonErrors = consoleLogs.filter(log => 
          log.timestamp > startTime && 
          (log.text.includes('JSON') || 
           log.text.includes('parse') || 
           log.text.includes('Unexpected end') ||
           log.text.includes('pollUntil'))
        );
        
        if (recentJsonErrors.length > 0) {
          console.log(`🔍 发现 ${recentJsonErrors.length} 个 JSON 相关日志:`);
          recentJsonErrors.forEach((log, index) => {
            console.log(`  ${index + 1}. [${log.type}] ${log.text}`);
          });
          
          // 如果发现错误，立即截图
          if (recentJsonErrors.some(log => log.type === 'error')) {
            await page.screenshot({ 
              path: './test-results/screenshots/error-isolation-06-json-error-detected.png',
              fullPage: true 
            });
            console.log('📸 JSON 错误截图已保存');
          }
        }
        
        // 检查是否有计划生成成功的迹象
        const planGenerated = page.locator('text=學習計劃, text=子任務, text=subtask, [data-testid="generated-plan"]');
        if (await planGenerated.isVisible()) {
          console.log('✅ 检测到计划生成成功，退出监控');
          break;
        }
      }
      
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-06-second-phase-end.png',
        fullPage: true 
      });
    });

    // Step 7: 分析和报告
    await test.step('生成错误分析报告', async () => {
      console.log('📊 生成详细的错误分析报告...');
      
      // 分析网络活动
      const aiApiRequests = networkActivity.filter(activity => 
        activity.url.includes('/api/ai') || activity.url.includes('8080')
      );
      
      const requestsByType = aiApiRequests.reduce((acc, activity) => {
        const key = `${activity.type}-${activity.method || 'unknown'}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 分析 console 日志
      const logsByType = consoleLogs.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 查找 JSON 相关问题
      const jsonIssues = consoleLogs.filter(log => 
        log.text.includes('JSON') || 
        log.text.includes('parse') || 
        log.text.includes('Unexpected end')
      );
      
      // 查找 API 请求问题
      const apiIssues = networkActivity.filter(activity => 
        activity.type === 'response' && 
        (activity.status! >= 400 || 
         (activity.body && activity.body.includes('error')))
      );
      
      const errorReport = {
        testName: 'Frontend Error Isolation Test',
        timestamp: new Date().toISOString(),
        duration: Date.now(),
        
        summary: {
          totalNetworkRequests: networkActivity.length,
          aiApiRequests: aiApiRequests.length,
          consoleLogCount: consoleLogs.length,
          errorCount: errorDetails.length,
          jsonIssuesFound: jsonIssues.length,
          apiIssuesFound: apiIssues.length
        },
        
        networkAnalysis: {
          requestsByType,
          aiApiDetails: aiApiRequests.map(activity => ({
            type: activity.type,
            method: activity.method,
            url: activity.url,
            status: activity.status,
            timestamp: new Date(activity.timestamp).toISOString(),
            bodyLength: activity.body?.length || 0,
            hasJsonBody: activity.body ? activity.body.trim().startsWith('{') : false,
            isCompleteJson: activity.body ? 
              (activity.body.trim().endsWith('}') || activity.body.trim().endsWith(']')) : false
          }))
        },
        
        consoleAnalysis: {
          logsByType,
          jsonRelatedLogs: jsonIssues.map(log => ({
            type: log.type,
            message: log.text,
            timestamp: new Date(log.timestamp).toISOString(),
            location: log.location
          })),
          apiRelatedLogs: consoleLogs.filter(log => 
            log.text.includes('API') || 
            log.text.includes('apiRequest') || 
            log.text.includes('pollUntil')
          ).map(log => ({
            type: log.type,
            message: log.text,
            timestamp: new Date(log.timestamp).toISOString()
          }))
        },
        
        errorAnalysis: {
          allErrors: errorDetails.map(error => ({
            message: error.message,
            source: error.source,
            timestamp: new Date(error.timestamp).toISOString(),
            stackTrace: error.stack?.split('\n')[0] || 'No stack trace'
          })),
          
          jsonParseErrors: errorDetails.filter(error => 
            error.message.includes('JSON') || 
            error.message.includes('parse') ||
            error.message.includes('Unexpected end')
          ),
          
          apiErrors: apiIssues.map(issue => ({
            url: issue.url,
            status: issue.status,
            method: issue.method,
            timestamp: new Date(issue.timestamp).toISOString(),
            responseBody: issue.body?.substring(0, 500) || 'No body'
          }))
        },
        
        recommendations: [
          jsonIssues.length > 0 ? '发现 JSON 解析问题，需要检查响应完整性' : 'JSON 解析正常',
          apiIssues.length > 0 ? '发现 API 响应错误，需要检查后端状态' : 'API 响应正常',
          errorDetails.length > 0 ? '发现页面错误，需要检查前端代码' : '前端运行正常'
        ]
      };
      
      // 输出详细报告
      console.log('📋 ===========================================');
      console.log('📋 前端错误隔离测试报告');
      console.log('📋 ===========================================');
      console.log(JSON.stringify(errorReport, null, 2));
      
      // 保存最终截图
      await page.screenshot({ 
        path: './test-results/screenshots/error-isolation-07-final-state.png',
        fullPage: true 
      });
      
      console.log('✅ 错误隔离测试完成');
    });
  });

  test.afterEach(async () => {
    console.log('🧹 错误隔离测试清理完成');
  });
});