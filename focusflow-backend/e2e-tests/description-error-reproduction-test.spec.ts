import { test, expect, Page, Request, Response } from '@playwright/test';

// Phase 2: Minimal Difference Use Case Reproduction Test
// Core Mission: Reproduce the specific error "Invalid JSON response: Unexpected end of JSON input"
// when task description contains text
test.describe('Description Field JSON Error Reproduction', () => {
  let consoleLogs: string[] = [];
  let networkRequests: any[] = [];
  let networkResponses: any[] = [];
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleLogs = [];
    networkRequests = [];
    networkResponses = [];

    // Enhanced console monitoring with error tracking
    page.on('console', (msg) => {
      const logMessage = `[${new Date().toISOString()}] [${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(logMessage);
      console.log('🔍 Console:', logMessage);
      
      // Special attention to JSON parsing errors
      if (msg.text().includes('JSON') || msg.text().includes('SyntaxError') || msg.text().includes('Unexpected')) {
        console.log('🚨 POTENTIAL JSON ERROR DETECTED:', logMessage);
      }
    });

    // Enhanced network monitoring with response capture
    page.on('request', (request: Request) => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString(),
        postData: request.postData()
      };
      networkRequests.push(requestData);
      
      // Log API requests specifically
      if (request.url().includes('/api/')) {
        console.log('🌐 API REQUEST:', request.method(), request.url());
        if (request.postData()) {
          console.log('📄 Request Body:', request.postData());
        }
      }
    });

    page.on('response', async (response: Response) => {
      const responseData = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };
      
      // Capture response body for API calls
      if (response.url().includes('/api/')) {
        try {
          const responseText = await response.text();
          responseData.body = responseText;
          console.log('🔄 API RESPONSE:', response.status(), response.url());
          console.log('📄 Response Body:', responseText);
          
          // Check for JSON parsing issues
          if (responseText && !responseText.startsWith('{') && !responseText.startsWith('[')) {
            console.log('⚠️ NON-JSON RESPONSE DETECTED:', responseText);
          }
        } catch (error) {
          responseData.error = error.message;
          console.log('❌ Failed to read response body:', error.message);
        }
      }
      
      networkResponses.push(responseData);
    });

    // Navigate to application
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
  });

  test('Scenario A: Empty Description (Expected Success)', async () => {
    console.log('🟢 SCENARIO A: Testing with EMPTY description - Expected to succeed');
    
    await test.step('Navigate to add task page', async () => {
      await page.goto('http://localhost:8082/add-task');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: './test-results/scenario-a-01-add-task-page.png',
        fullPage: true 
      });
    });

    await test.step('Fill form with empty description', async () => {
      // Fill title only
      const titleInput = page.locator('input').first();
      await titleInput.fill('測試任務');
      
      // Ensure description is empty
      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill(''); // Explicitly empty
      }
      
      await page.screenshot({ 
        path: './test-results/scenario-a-02-form-filled.png',
        fullPage: true 
      });
      
      console.log('✅ Form filled with empty description');
    });

    await test.step('Execute Smart Generate and monitor', async () => {
      // Clear monitoring arrays
      consoleLogs = [];
      networkRequests = [];
      networkResponses = [];
      
      const smartGenerateButton = page.locator('text=Smart Generate')
        .or(page.locator('text=智慧生成'))
        .or(page.locator('[data-testid="smart-generate-button"]'))
        .first();
      
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      
      console.log('🎯 Clicking Smart Generate button...');
      await smartGenerateButton.click();
      
      // Wait for API processing
      await page.waitForTimeout(10000);
      
      await page.screenshot({ 
        path: './test-results/scenario-a-03-after-generate.png',
        fullPage: true 
      });
    });

    await test.step('Analyze Scenario A results', async () => {
      console.log('📊 SCENARIO A ANALYSIS:');
      console.log(`Console logs count: ${consoleLogs.length}`);
      console.log(`Network requests count: ${networkRequests.length}`);
      console.log(`Network responses count: ${networkResponses.length}`);
      
      // Look for errors
      const errorLogs = consoleLogs.filter(log => 
        log.includes('error') || log.includes('Error') || log.includes('JSON') || log.includes('SyntaxError')
      );
      
      console.log(`Error logs found: ${errorLogs.length}`);
      errorLogs.forEach(error => console.log('❌ Error:', error));
      
      // Check API calls
      const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));
      const apiResponses = networkResponses.filter(res => res.url.includes('/api/'));
      
      console.log(`API requests: ${apiRequests.length}`);
      console.log(`API responses: ${apiResponses.length}`);
      
      // Save scenario A data
      const scenarioAData = {
        scenario: 'A - Empty Description',
        consoleLogs,
        networkRequests: apiRequests,
        networkResponses: apiResponses,
        errorCount: errorLogs.length,
        timestamp: new Date().toISOString()
      };
      
      await page.evaluate((data) => {
        console.log('📋 SCENARIO A DATA:', JSON.stringify(data, null, 2));
      }, scenarioAData);
    });
  });

  test('Scenario B: With Description (Expected Failure)', async () => {
    console.log('🔴 SCENARIO B: Testing with DESCRIPTION text - Expected to fail with JSON error');
    
    await test.step('Navigate to add task page', async () => {
      await page.goto('http://localhost:8082/add-task');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: './test-results/scenario-b-01-add-task-page.png',
        fullPage: true 
      });
    });

    await test.step('Fill form with description text', async () => {
      // Fill title
      const titleInput = page.locator('input').first();
      await titleInput.fill('測試任務');
      
      // Fill description with text that causes the error
      const descriptionInput = page.locator('textarea').first();
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('這是一個簡單的描述文字');
      }
      
      await page.screenshot({ 
        path: './test-results/scenario-b-02-form-filled.png',
        fullPage: true 
      });
      
      console.log('✅ Form filled with description text');
    });

    await test.step('Execute Smart Generate and monitor for JSON error', async () => {
      // Clear monitoring arrays
      consoleLogs = [];
      networkRequests = [];
      networkResponses = [];
      
      const smartGenerateButton = page.locator('text=Smart Generate')
        .or(page.locator('text=智慧生成'))
        .or(page.locator('[data-testid="smart-generate-button"]'))
        .first();
      
      await expect(smartGenerateButton).toBeVisible({ timeout: 10000 });
      
      console.log('🎯 Clicking Smart Generate button...');
      await smartGenerateButton.click();
      
      // Wait longer for potential error to manifest
      await page.waitForTimeout(15000);
      
      await page.screenshot({ 
        path: './test-results/scenario-b-03-after-generate.png',
        fullPage: true 
      });
    });

    await test.step('Analyze Scenario B results and identify JSON error', async () => {
      console.log('📊 SCENARIO B ANALYSIS:');
      console.log(`Console logs count: ${consoleLogs.length}`);
      console.log(`Network requests count: ${networkRequests.length}`);
      console.log(`Network responses count: ${networkResponses.length}`);
      
      // Detailed error analysis
      const jsonErrors = consoleLogs.filter(log => 
        log.includes('Invalid JSON response') || 
        log.includes('Unexpected end of JSON input') ||
        log.includes('SyntaxError') ||
        log.includes('JSON.parse')
      );
      
      const allErrors = consoleLogs.filter(log => 
        log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')
      );
      
      console.log('🚨 JSON-specific errors found:');
      jsonErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      console.log('🚨 All errors found:');
      allErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      // Analyze API responses for malformed JSON
      const apiResponses = networkResponses.filter(res => res.url.includes('/api/'));
      console.log('🔍 Analyzing API responses:');
      apiResponses.forEach((response, index) => {
        console.log(`  Response ${index + 1}: ${response.status} ${response.url}`);
        if (response.body) {
          console.log(`    Body length: ${response.body.length}`);
          console.log(`    Body preview: ${response.body.substring(0, 200)}...`);
          
          // Check if response is valid JSON
          try {
            JSON.parse(response.body);
            console.log('    ✅ Valid JSON');
          } catch (error) {
            console.log(`    ❌ Invalid JSON: ${error.message}`);
          }
        }
      });
      
      // Save scenario B data
      const scenarioBData = {
        scenario: 'B - With Description',
        consoleLogs,
        networkRequests: networkRequests.filter(req => req.url.includes('/api/')),
        networkResponses: apiResponses,
        jsonErrorCount: jsonErrors.length,
        totalErrorCount: allErrors.length,
        timestamp: new Date().toISOString(),
        jsonErrors: jsonErrors,
        allErrors: allErrors
      };
      
      await page.evaluate((data) => {
        console.log('📋 SCENARIO B DATA:', JSON.stringify(data, null, 2));
      }, scenarioBData);
      
      // Check if we reproduced the expected error
      if (jsonErrors.length > 0) {
        console.log('🎯 SUCCESS: Reproduced the JSON parsing error!');
      } else {
        console.log('⚠️ WARNING: Expected JSON error not found');
      }
    });
  });

  test('Comparative Analysis: Scenario A vs B', async () => {
    console.log('🔬 COMPARATIVE ANALYSIS: Identifying the root cause of the difference');
    
    // This test will be used to compare results from both scenarios
    // Implementation note: In a real scenario, this would aggregate data from both previous tests
    
    await test.step('Generate differential analysis report', async () => {
      const analysisReport = {
        testPurpose: 'Reproduce JSON parsing error when description field contains text',
        expectedBehavior: {
          scenarioA: 'Empty description should work normally',
          scenarioB: 'Description with text should cause "Invalid JSON response: Unexpected end of JSON input"'
        },
        methodology: [
          'Monitor all console logs for JSON-related errors',
          'Capture complete API request/response cycle',
          'Compare network behavior between empty and filled description',
          'Identify exact point of failure in JSON parsing'
        ],
        keyMetrics: [
          'Console error count and types',
          'API response validity',
          'JSON parsing success/failure points',
          'Network request differences'
        ],
        timestamp: new Date().toISOString()
      };
      
      await page.evaluate((report) => {
        console.log('📊 ANALYSIS REPORT:', JSON.stringify(report, null, 2));
      }, analysisReport);
      
      console.log('✅ Comparative analysis framework established');
    });
  });

  test.afterEach(async () => {
    // Final cleanup and summary
    console.log('🧹 Test cleanup completed');
    console.log(`📈 Total console logs captured: ${consoleLogs.length}`);
    console.log(`📈 Total network requests: ${networkRequests.length}`);
    console.log(`📈 Total network responses: ${networkResponses.length}`);
  });
});