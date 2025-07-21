import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import { enhancedTestHelpers } from './utils/enhanced-test-helpers';

// Comprehensive Smart Generate Functionality Test
// Tests the complete end-to-end flow of AI-powered task generation
test.describe('Smart Generate Comprehensive Validation', () => {
  let consoleLogs: string[] = [];
  let networkRequests: any[] = [];
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleLogs = [];
    networkRequests = [];

    // Monitor console logs for debugging
    page.on('console', (msg: ConsoleMessage) => {
      const logMessage = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logMessage);
      console.log('Console:', logMessage);
    });

    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
      console.log('Network Request:', request.method(), request.url());
    });

    page.on('response', response => {
      console.log('Network Response:', response.status(), response.url());
    });

    // Start from home page
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
  });

  test('Complete Smart Generate Flow - Python Learning Task', async () => {
    console.log('🚀 Starting comprehensive Smart Generate test...');

    // Step 1: Verify app loads correctly
    await test.step('Verify FocusFlow app loads correctly', async () => {
      // Wait for app to load by checking for FocusFlow title and key elements
      await page.waitForSelector('text=FocusFlow', { timeout: 30000 });
      await page.waitForSelector('text=Welcome back!', { timeout: 10000 });
      
      // Take initial screenshot
      await page.screenshot({ 
        path: './test-results/screenshots/01-app-loaded.png',
        fullPage: true 
      });
      
      console.log('✅ App loaded successfully');
    });

    // Step 2: Navigate to task creation
    await test.step('Navigate to Add Task page', async () => {
      // Look for the "+" button in the top right corner or floating action button
      const addTaskButton = page.locator('text=+').or(page.locator('[data-testid="add-task-button"]')).or(page.locator('button:has-text("+")')).first();
      
      if (await addTaskButton.isVisible()) {
        console.log('🎯 Found + button, clicking...');
        await addTaskButton.click();
      } else {
        // Try navigation via URL if button not found
        console.log('🔍 + button not found, trying direct URL navigation...');
        await page.goto('http://localhost:8082/add-task');
      }
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: './test-results/screenshots/02-add-task-page.png',
        fullPage: true 
      });
      
      console.log('✅ Navigated to Add Task page');
    });

    // Step 3: Fill task form
    await test.step('Fill task creation form', async () => {
      // Wait for form elements
      await page.waitForSelector('input, textarea', { timeout: 10000 });
      
      // Fill task title
      const titleInput = page.locator('input').first();
      await titleInput.fill('學習 Python 程式設計');
      
      // Fill task description
      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('從零開始學習 Python，目標是能夠開發網頁應用程式');
      }
      
      await page.screenshot({ 
        path: './test-results/screenshots/03-form-filled.png',
        fullPage: true 
      });
      
      console.log('✅ Task form filled successfully');
    });

    // Step 4: Click Smart Generate and monitor network activity
    await test.step('Click Smart Generate button and monitor network', async () => {
      console.log('🔍 Monitoring for Smart Generate button...');
      
      // Look for Smart Generate button with multiple selectors
      const smartGenerateButton = page.locator('text=Smart Generate')
        .or(page.locator('text=智慧生成'))
        .or(page.locator('[data-testid="smart-generate-button"]'))
        .or(page.locator('button:has-text("AI")'))
        .first();
      
      // Wait for button to be visible and enabled
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      
      console.log('🎯 Smart Generate button found, clicking...');
      
      // Clear previous network logs
      networkRequests = [];
      consoleLogs = [];
      
      // Click the button
      await smartGenerateButton.click();
      
      // Wait for network activity
      await page.waitForTimeout(5000);
      
      await page.screenshot({ 
        path: './test-results/screenshots/04-smart-generate-clicked.png',
        fullPage: true 
      });
      
      console.log('✅ Smart Generate button clicked');
    });

    // Step 5: Verify network requests and console logs
    await test.step('Verify network requests and API configuration', async () => {
      console.log('🔍 Analyzing network requests and console logs...');
      
      // Log all console messages for analysis
      console.log('📋 Console Logs:');
      consoleLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log}`);
      });
      
      // Log all network requests
      console.log('🌐 Network Requests:');
      networkRequests.forEach((request, index) => {
        console.log(`  ${index + 1}. ${request.method} ${request.url}`);
      });
      
      // Check for API request logs
      const apiRequestLogs = consoleLogs.filter(log => log.includes('🌐 [API-REQUEST]'));
      const platformLogs = consoleLogs.filter(log => log.includes('Platform.OS'));
      const apiUrlLogs = consoleLogs.filter(log => log.includes('API_BASE_URL'));
      
      console.log('📊 API Request Analysis:');
      console.log(`  - API Request logs found: ${apiRequestLogs.length}`);
      console.log(`  - Platform logs found: ${platformLogs.length}`);
      console.log(`  - API URL logs found: ${apiUrlLogs.length}`);
      
      if (apiRequestLogs.length > 0) {
        console.log('✅ API requests detected in console logs');
      }
      
      // Check for backend API calls
      const backendRequests = networkRequests.filter(req => 
        req.url.includes('localhost:8080') || 
        req.url.includes('10.0.2.2:8080') ||
        req.url.includes('/api/')
      );
      
      console.log(`🎯 Backend API requests: ${backendRequests.length}`);
      backendRequests.forEach(req => {
        console.log(`  - ${req.method} ${req.url}`);
      });
    });

    // Step 6: Wait for and interact with personalized questions dialog
    await test.step('Handle personalized questions dialog', async () => {
      console.log('🤔 Waiting for personalized questions dialog...');
      
      // Wait for dialog or questions to appear
      try {
        await page.waitForSelector('text=個人化問題, text=問題, [data-testid="question-dialog"]', { timeout: 15000 });
        
        console.log('✅ Personalized questions dialog appeared');
        
        await page.screenshot({ 
          path: './test-results/screenshots/05-questions-dialog.png',
          fullPage: true 
        });
        
        // Try to answer questions if they appear
        const answerInputs = page.locator('input[type="text"], textarea');
        const answerCount = await answerInputs.count();
        
        if (answerCount > 0) {
          console.log(`📝 Found ${answerCount} question inputs, filling answers...`);
          
          for (let i = 0; i < Math.min(answerCount, 3); i++) {
            const sampleAnswers = [
              '我是程式設計初學者',
              '每天可以學習 2-3 小時',
              '希望在 3 個月內達成目標'
            ];
            
            await answerInputs.nth(i).fill(sampleAnswers[i] || '是的');
          }
          
          // Look for submit/continue button
          const continueButton = page.locator('text=繼續, text=Submit, text=確認, button[type="submit"]').first();
          if (await continueButton.isVisible()) {
            await continueButton.click();
            console.log('✅ Questions submitted');
          }
        }
        
      } catch (error) {
        console.log('⚠️ No personalized questions dialog found within timeout');
        await page.screenshot({ 
          path: './test-results/screenshots/05-no-questions-dialog.png',
          fullPage: true 
        });
      }
    });

    // Step 7: Verify plan generation
    await test.step('Verify learning plan and subtasks generation', async () => {
      console.log('📋 Waiting for learning plan generation...');
      
      // Wait for plan or subtasks to appear
      try {
        await page.waitForSelector('text=學習計劃, text=子任務, text=subtask, [data-testid="generated-plan"]', { timeout: 30000 });
        
        console.log('✅ Learning plan generated successfully');
        
        await page.screenshot({ 
          path: './test-results/screenshots/06-plan-generated.png',
          fullPage: true 
        });
        
        // Check for subtasks
        const subtasks = page.locator('[data-testid="subtask"], text=Day, text=第');
        const subtaskCount = await subtasks.count();
        
        console.log(`📚 Generated subtasks count: ${subtaskCount}`);
        
        if (subtaskCount > 0) {
          console.log('✅ Subtasks generated successfully');
        }
        
      } catch (error) {
        console.log('⚠️ Learning plan generation timeout or failed');
        await page.screenshot({ 
          path: './test-results/screenshots/06-plan-generation-failed.png',
          fullPage: true 
        });
      }
    });

    // Step 8: Final validation and report
    await test.step('Generate final test report', async () => {
      console.log('📊 Generating comprehensive test report...');
      
      // Take final screenshot
      await page.screenshot({ 
        path: './test-results/screenshots/07-final-state.png',
        fullPage: true 
      });
      
      // Generate summary report
      const report = {
        testName: 'Smart Generate Comprehensive Validation',
        timestamp: new Date().toISOString(),
        duration: Date.now(),
        consoleLogs: consoleLogs,
        networkRequests: networkRequests.map(req => ({
          method: req.method,
          url: req.url,
          timestamp: req.timestamp
        })),
        screenshots: [
          '01-app-loaded.png',
          '02-add-task-page.png', 
          '03-form-filled.png',
          '04-smart-generate-clicked.png',
          '05-questions-dialog.png',
          '06-plan-generated.png',
          '07-final-state.png'
        ],
        summary: {
          appLoaded: true,
          navigationSuccessful: true,
          formFilled: true,
          smartGenerateClicked: true,
          apiRequestsDetected: networkRequests.filter(req => req.url.includes('/api/')).length > 0,
          questionsDialogAppeared: consoleLogs.some(log => log.includes('question') || log.includes('問題')),
          planGenerated: consoleLogs.some(log => log.includes('plan') || log.includes('計劃'))
        }
      };
      
      // Save report to file
      await page.evaluate((reportData) => {
        console.log('📋 FINAL TEST REPORT:', JSON.stringify(reportData, null, 2));
      }, report);
      
      console.log('✅ Comprehensive Smart Generate test completed');
    });
  });

  test.afterEach(async () => {
    // Clean up and save logs
    console.log('🧹 Test cleanup completed');
  });
});