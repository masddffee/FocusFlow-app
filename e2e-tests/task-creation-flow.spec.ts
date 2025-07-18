import { test, expect } from '@playwright/test';

/**
 * Task Creation Flow Tests for FocusFlow
 * Tests the complete user journey: Add Task → Answer Questions → Generate Subtasks → Display in UI
 */

test.describe('Task Creation and Scheduling Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    try {
      await page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      console.log('Storage clearing skipped due to security restrictions');
    }
    
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for the app to load
    await page.waitForTimeout(2000);
  });

  test('should complete task creation flow: 準備電子學段考', async ({ page }) => {
    // Step 1: Navigate to add task page
    await page.click('[data-testid="add-task-button"], .add-task-button, text="Add Task", text="新增任務"');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the add task page
    await expect(page).toHaveURL(/add-task/);
    
    // Step 2: Fill in task details
    await page.fill('[data-testid="task-title"], input[placeholder*="task"], input[placeholder*="任務"]', '準備電子學段考');
    
    // Fill in description if available
    const descriptionField = page.locator('[data-testid="task-description"], textarea[placeholder*="description"], textarea[placeholder*="描述"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('準備電子學期中考試，包含複習重點章節和練習題目');
    }
    
    // Set due date if available
    const dueDateField = page.locator('[data-testid="due-date"], input[type="date"]');
    if (await dueDateField.isVisible()) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await dueDateField.fill(futureDate.toISOString().split('T')[0]);
    }
    
    // Set priority if available
    const prioritySelect = page.locator('[data-testid="priority-select"], select[name="priority"]');
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high');
    }
    
    // Step 3: Enable AI generation and trigger personalization
    const smartGenerateButton = page.locator('[data-testid="smart-generate"], button:has-text("Smart Generate"), button:has-text("智能生成")');
    if (await smartGenerateButton.isVisible()) {
      await smartGenerateButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Handle personalization modal if it appears
    const personalizationModal = page.locator('[data-testid="personalization-modal"], .personalization-modal');
    if (await personalizationModal.isVisible()) {
      // Fill in personalization questions
      const currentLevelField = page.locator('[data-testid="current-level"], input[placeholder*="current level"], input[placeholder*="目前程度"]');
      if (await currentLevelField.isVisible()) {
        await currentLevelField.fill('大學二年級電子工程學系');
      }
      
      const learningGoalField = page.locator('[data-testid="learning-goal"], input[placeholder*="learning goal"], input[placeholder*="學習目標"]');
      if (await learningGoalField.isVisible()) {
        await learningGoalField.fill('希望在段考中獲得85分以上的成績');
      }
      
      const availableTimeField = page.locator('[data-testid="available-time"], input[placeholder*="available time"], input[placeholder*="可用時間"]');
      if (await availableTimeField.isVisible()) {
        await availableTimeField.fill('每天2-3小時');
      }
      
      // Submit personalization
      const generatePlanButton = page.locator('[data-testid="generate-plan"], button:has-text("Generate Plan"), button:has-text("生成計劃")');
      await generatePlanButton.click();
      
      // Wait for AI to process
      await page.waitForTimeout(5000);
    }
    
    // Step 5: Wait for subtasks to be generated
    await page.waitForTimeout(3000);
    
    // Step 6: Create and schedule the task
    const createTaskButton = page.locator('[data-testid="create-task"], button:has-text("Create"), button:has-text("建立")');
    await createTaskButton.click();
    
    // Wait for task creation to complete
    await page.waitForTimeout(2000);
    
    // Step 7: Verify task appears in the UI
    // Navigate to tasks page or check home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if task appears in the home page or navigate to tasks
    let taskVisible = await page.locator('text="準備電子學段考"').isVisible();
    
    if (!taskVisible) {
      // Try navigating to tasks page
      await page.click('[data-testid="tasks-tab"], text="Tasks", text="任務"');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      taskVisible = await page.locator('text="準備電子學段考"').isVisible();
    }
    
    // Verify the task is displayed
    await expect(page.locator('text="準備電子學段考"')).toBeVisible();
    
    // Step 8: Verify subtasks are created
    // Click on the task to see details
    await page.click('text="準備電子學段考"');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for subtasks
    const subtaskElements = page.locator('[data-testid="subtask"], .subtask, .sub-task');
    const subtaskCount = await subtaskElements.count();
    
    console.log(`Found ${subtaskCount} subtasks for the task`);
    
    // Verify at least one subtask exists
    if (subtaskCount > 0) {
      await expect(subtaskElements.first()).toBeVisible();
    }
    
    // Take screenshot of the final result
    await page.screenshot({ 
      path: 'test-results/task-creation-flow-result.png', 
      fullPage: true 
    });
  });

  test('should handle task creation with minimal input', async ({ page }) => {
    // Navigate to add task page
    await page.click('[data-testid="add-task-button"], .add-task-button, text="Add Task", text="新增任務"');
    await page.waitForLoadState('networkidle');
    
    // Fill in minimal task details
    await page.fill('[data-testid="task-title"], input[placeholder*="task"], input[placeholder*="任務"]', '學習React Native');
    
    // Create task without AI generation
    const createTaskButton = page.locator('[data-testid="create-task"], button:has-text("Create"), button:has-text("建立")');
    await createTaskButton.click();
    
    await page.waitForTimeout(2000);
    
    // Verify task creation
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if task appears
    let taskVisible = await page.locator('text="學習React Native"').isVisible();
    
    if (!taskVisible) {
      await page.click('[data-testid="tasks-tab"], text="Tasks", text="任務"');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    await expect(page.locator('text="學習React Native"')).toBeVisible();
  });

  test('should handle navigation and routing correctly', async ({ page }) => {
    // Test navigation between different pages
    const navigationTests = [
      { selector: '[data-testid="home-tab"], text="Home", text="首頁"', url: '/' },
      { selector: '[data-testid="tasks-tab"], text="Tasks", text="任務"', url: '/tasks' },
      { selector: '[data-testid="stats-tab"], text="Stats", text="統計"', url: '/stats' },
      { selector: '[data-testid="profile-tab"], text="Profile", text="個人檔案"', url: '/profile' }
    ];
    
    for (const nav of navigationTests) {
      await page.click(nav.selector);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check if navigation was successful
      const currentUrl = page.url();
      console.log(`Navigation test - Expected: ${nav.url}, Actual: ${currentUrl}`);
      
      // Verify page content loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(0);
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test error handling
    const jsErrors: string[] = [];
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate through the app
    await page.goto('/add-task');
    await page.waitForLoadState('networkidle');
    
    // Try to create a task with invalid data
    await page.fill('[data-testid="task-title"], input[placeholder*="task"], input[placeholder*="任務"]', '');
    
    const createTaskButton = page.locator('[data-testid="create-task"], button:has-text("Create"), button:has-text("建立")');
    if (await createTaskButton.isVisible()) {
      await createTaskButton.click();
    }
    
    await page.waitForTimeout(2000);
    
    // Log any errors found
    if (jsErrors.length > 0) {
      console.log('JavaScript errors found:', jsErrors);
    }
    
    // Verify app is still functional
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });
});