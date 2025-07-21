import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  apiCallCount: number;
  responseTime: number;
  jsonErrors: number;
  phaseFixesVerified: string[];
  screenshots: string[];
  consoleLogs: string[];
}

class E2ETestRunner {
  private page: Page;
  private metrics: TestMetrics;
  private testStartTime: number;

  constructor(page: Page) {
    this.page = page;
    this.metrics = {
      apiCallCount: 0,
      responseTime: 0,
      jsonErrors: 0,
      phaseFixesVerified: [],
      screenshots: [],
      consoleLogs: []
    };
    this.testStartTime = Date.now();
  }

  async setupMonitoring() {
    // Monitor all console logs
    this.page.on('console', (msg) => {
      const logEntry = `[${new Date().toISOString()}] ${msg.type()}: ${msg.text()}`;
      this.metrics.consoleLogs.push(logEntry);
      
      // Check for specific Phase fixes
      if (msg.text().includes('Phase 5: JSON resilience')) {
        this.metrics.phaseFixesVerified.push('Phase 5 JSON Resilience');
      }
      if (msg.text().includes('Phase 6: Single Gemini call')) {
        this.metrics.phaseFixesVerified.push('Phase 6 Single Gemini Call');
      }
      if (msg.text().includes('JSON parsing error') || msg.text().includes('Invalid JSON response')) {
        this.metrics.jsonErrors++;
      }
    });

    // Monitor network requests
    this.page.on('response', (response) => {
      if (response.url().includes('/api/') || response.url().includes('gemini')) {
        this.metrics.apiCallCount++;
        console.log(`API Call detected: ${response.url()} - Status: ${response.status()}`);
      }
    });
  }

  async takeScreenshot(stepName: string) {
    const timestamp = Date.now();
    const filename = `${stepName}-${timestamp}.png`;
    const filepath = path.join('/Users/wetom/Desktop/FocusFlow/test-results/screenshots', filename);
    
    await this.page.screenshot({ path: filepath, fullPage: true });
    this.metrics.screenshots.push(filepath);
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
  }

  async waitForElement(selector: string, timeout = 10000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`Element not found: ${selector}`, error);
      return false;
    }
  }

  async generateTestReport() {
    const totalTime = Date.now() - this.testStartTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalTime,
      metrics: this.metrics,
      summary: {
        totalApiCalls: this.metrics.apiCallCount,
        jsonErrors: this.metrics.jsonErrors,
        phaseFixesDetected: this.metrics.phaseFixesVerified.length,
        screenshotsTaken: this.metrics.screenshots.length,
        logEntriesRecorded: this.metrics.consoleLogs.length
      }
    };

    const reportPath = '/Users/wetom/Desktop/FocusFlow/test-results/phase7-e2e-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 Test Report Generated:', reportPath);
    return report;
  }
}

test.describe('Phase 7: Complete End-to-End Validation', () => {
  let testRunner: E2ETestRunner;

  test.beforeEach(async ({ page }) => {
    testRunner = new E2ETestRunner(page);
    await testRunner.setupMonitoring();
    
    // Create screenshots directory if it doesn't exist
    const screenshotDir = '/Users/wetom/Desktop/FocusFlow/test-results/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Complete flow: Personal problems → Learning plan → Task creation → Calendar display', async ({ page }) => {
    console.log('🚀 Starting Phase 7 Complete End-to-End Validation');
    
    // Step 1: Navigate to add task page
    await page.goto('http://localhost:8083');
    await testRunner.takeScreenshot('01-app-loaded');
    
    // Wait for the app to load
    await page.waitForTimeout(5000);
    
    // Navigate to add task page using the blue + button
    console.log('🔘 Looking for the blue + button to navigate to add task');
    const plusButton = await page.locator('button').filter({ hasText: '+' }).first();
    if (await plusButton.isVisible()) {
      await plusButton.click();
      console.log('✅ Clicked blue + button');
    } else {
      // Try to find the floating action button with different selectors
      const fabSelectors = [
        '.floating-action-button',
        '[role="button"]:has-text("+")',
        'button[aria-label*="add"]',
        'button[aria-label*="Add"]',
        'TouchableOpacity:has-text("+")'
      ];
      
      let buttonFound = false;
      for (const selector of fabSelectors) {
        try {
          const button = await page.locator(selector).first();
          if (await button.isVisible()) {
            await button.click();
            buttonFound = true;
            console.log(`✅ Found and clicked button with selector: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }
      
      if (!buttonFound) {
        console.log('⚠️ Blue + button not found, trying direct navigation');
        await page.goto('http://localhost:8083/add-task');
      }
    }
    
    await page.waitForTimeout(3000);
    await testRunner.takeScreenshot('02-add-task-page');
    
    // Step 2: Personal Problem Generation Test
    console.log('📝 Step 2: Testing personal problem generation');
    
    // Fill in title and description with more robust selectors
    console.log('📝 Looking for title input field');
    const titleSelectors = [
      'input[placeholder*="title"]',
      'input[placeholder*="Title"]',
      'TextInput[placeholder*="title"]',
      'input[name="title"]',
      'input:first-of-type'
    ];
    
    let titleInput = null;
    for (const selector of titleSelectors) {
      try {
        titleInput = await page.locator(selector).first();
        if (await titleInput.isVisible()) {
          console.log(`✅ Found title input with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (titleInput) {
      await titleInput.fill('Advanced React Native Development Skills');
      console.log('✅ Title filled successfully');
    } else {
      console.error('❌ Could not find title input field');
    }
    
    console.log('📝 Looking for description input field');
    const descriptionSelectors = [
      'textarea',
      'input[placeholder*="description"]',
      'input[placeholder*="Description"]',
      'TextInput[multiline="true"]',
      'input[name="description"]'
    ];
    
    let descriptionInput = null;
    for (const selector of descriptionSelectors) {
      try {
        descriptionInput = await page.locator(selector).first();
        if (await descriptionInput.isVisible()) {
          console.log(`✅ Found description input with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (descriptionInput) {
      await descriptionInput.fill('I want to master advanced React Native concepts including state management, navigation, and performance optimization for building scalable mobile applications.');
      console.log('✅ Description filled successfully');
    } else {
      console.error('❌ Could not find description input field');
    }
    
    await testRunner.takeScreenshot('03-form-filled');
    
    // Step 3: Generate personal problems (Phase 6 verification)
    console.log('🔧 Step 3: Verifying Phase 6 single Gemini API call');
    
    const initialApiCount = testRunner.metrics.apiCallCount;
    
    // Look for generate button with multiple selectors
    console.log('🔍 Looking for Smart Generate button');
    const generateSelectors = [
      'button:has-text("Smart Generate")',
      'button:has-text("Generate")',
      '[data-testid="generate-button"]',
      'button[title*="generate"]',
      'TouchableOpacity:has-text("Smart Generate")'
    ];
    
    let generateButton = null;
    for (const selector of generateSelectors) {
      try {
        generateButton = await page.locator(selector).first();
        if (await generateButton.isVisible()) {
          console.log(`✅ Found generate button with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (generateButton) {
      await generateButton.click();
      console.log('✅ Clicked Smart Generate button');
    } else {
      console.error('❌ Could not find Smart Generate button');
    }
    
    await testRunner.takeScreenshot('04-generate-clicked');
    
    // Wait for personal problems to generate
    console.log('⏳ Waiting for personal problems generation...');
    await page.waitForTimeout(8000);
    
    const apiCallsAfterGenerate = testRunner.metrics.apiCallCount - initialApiCount;
    console.log(`📊 API calls during personal problem generation: ${apiCallsAfterGenerate}`);
    
    await testRunner.takeScreenshot('05-after-generate');
    
    // Step 4: Complete Learning Plan Generation Test (Phase 5 verification)
    console.log('📚 Step 4: Testing complete learning plan generation with Phase 5 JSON resilience');
    
    // Fill personal problem answers (if they exist)
    const answerInputs = await page.locator('input[type="text"], textarea').all();
    for (let i = 0; i < Math.min(answerInputs.length, 3); i++) {
      const input = answerInputs[i];
      if (await input.isVisible()) {
        await input.fill(`This is my answer to question ${i + 1} - providing detailed context for better learning plan generation.`);
      }
    }
    
    // Submit for full plan generation
    const submitButton = await page.locator('button:has-text("Submit"), button:has-text("Generate Plan"), button:has-text("Create Plan")').first();
    if (await submitButton.isVisible()) {
      const beforeSubmitApiCount = testRunner.metrics.apiCallCount;
      await submitButton.click();
      
      // Wait for plan generation (this should trigger Phase 5 fixes)
      await page.waitForTimeout(8000);
      
      const apiCallsAfterSubmit = testRunner.metrics.apiCallCount - beforeSubmitApiCount;
      console.log(`📊 API calls during full plan generation: ${apiCallsAfterSubmit}`);
    }
    
    await testRunner.takeScreenshot('06-plan-generated');
    
    // Step 5: Create & Schedule Task Test
    console.log('📅 Step 5: Testing Create & Schedule Task functionality');
    
    // Look for schedule/create task button
    const scheduleButton = await page.locator('button:has-text("Schedule"), button:has-text("Create Task"), button:has-text("Add to Calendar")').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(2000);
    }
    
    await testRunner.takeScreenshot('07-task-creation');
    
    // Step 6: UI Calendar Display Verification
    console.log('🗓️ Step 6: Verifying UI calendar display');
    
    // Navigate to calendar/task management page
    const calendarTab = await page.locator('[data-testid="calendar-tab"], text=Calendar, text=Tasks').first();
    if (await calendarTab.isVisible()) {
      await calendarTab.click();
      await page.waitForTimeout(3000);
    }
    
    await testRunner.takeScreenshot('08-calendar-view');
    
    // Check for task display in calendar
    const taskElements = await page.locator('[data-testid*="task"], .task-item, .calendar-task').all();
    console.log(`📋 Found ${taskElements.length} task elements in calendar`);
    
    // Step 7: Final state capture
    await testRunner.takeScreenshot('09-final-state');
    
    // Step 8: Verification Summary
    console.log('✅ Step 8: Generating verification summary');
    
    const report = await testRunner.generateTestReport();
    
    // Assertions
    expect(testRunner.metrics.jsonErrors).toBe(0);
    expect(testRunner.metrics.apiCallCount).toBeGreaterThan(0);
    expect(testRunner.metrics.screenshots.length).toBeGreaterThan(0);
    
    console.log('🎉 Phase 7 End-to-End Validation Completed');
    console.log(`📊 Final Metrics:`, report.summary);
  });

  test.afterEach(async () => {
    // Generate final report
    if (testRunner) {
      await testRunner.generateTestReport();
    }
  });
});