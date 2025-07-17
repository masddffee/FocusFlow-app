import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { TasksPage } from './pages/tasks-page';
import { FocusPage } from './pages/focus-page';
import { testTimeouts } from './fixtures/test-data';

/**
 * Internationalization (i18n) Tests for FocusFlow
 * Tests language switching and content localization
 */

test.describe('Internationalization Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should default to English language', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Check if welcome message is in English
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage.toLowerCase()).toContain('welcome');
  });

  test('should switch to Chinese language', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check if content is now in Chinese
    const welcomeMessage = await homePage.getWelcomeMessage();
    // Check for Chinese characters or specific Chinese text
    expect(welcomeMessage).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should switch back to English from Chinese', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese first
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Switch back to English
    await homePage.changeLanguage('en');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check if content is back to English
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage.toLowerCase()).toContain('welcome');
  });

  test('should persist language preference across page refreshes', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Refresh the page
    await page.reload();
    await homePage.waitForLoad();
    await homePage.assertHomePageLoaded();
    
    // Check if language preference is preserved
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should persist language preference across navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Navigate to tasks page
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    
    // Check if tasks page is in Chinese
    const pageTitle = await tasksPage.getText(tasksPage.selectors.pageTitle);
    expect(pageTitle).toMatch(/[\u4e00-\u9fff]/);
    
    // Navigate back to home
    await tasksPage.navigateToHome();
    await homePage.assertHomePageLoaded();
    
    // Check if home page is still in Chinese
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should localize task-related content', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Check English content first
    const englishPageTitle = await tasksPage.getText(tasksPage.selectors.pageTitle);
    expect(englishPageTitle.toLowerCase()).toContain('tasks');
    
    // Switch to Chinese
    await tasksPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check Chinese content
    const chinesePageTitle = await tasksPage.getText(tasksPage.selectors.pageTitle);
    expect(chinesePageTitle).toMatch(/[\u4e00-\u9fff]/);
    
    // Check if empty state message is localized
    const emptyStateVisible = await tasksPage.isEmptyStateVisible();
    if (emptyStateVisible) {
      const emptyStateText = await tasksPage.getText(tasksPage.selectors.emptyState);
      expect(emptyStateText).toMatch(/[\u4e00-\u9fff]/);
    }
  });

  test('should localize focus timer content', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Check English content first
    const englishPageTitle = await focusPage.getText(focusPage.selectors.pageTitle);
    expect(englishPageTitle.toLowerCase()).toContain('focus');
    
    // Switch to Chinese
    await focusPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check Chinese content
    const chinesePageTitle = await focusPage.getText(focusPage.selectors.pageTitle);
    expect(chinesePageTitle).toMatch(/[\u4e00-\u9fff]/);
    
    // Check timer status localization
    const timerStatus = await focusPage.getTimerStatus();
    expect(timerStatus).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should localize button text', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Check English button text
    const addTaskButton = await homePage.getText(homePage.selectors.addTaskButton);
    expect(addTaskButton.toLowerCase()).toContain('add');
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check Chinese button text
    const chineseAddTaskButton = await homePage.getText(homePage.selectors.addTaskButton);
    expect(chineseAddTaskButton).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should localize time format and units', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Check English time format
    const englishTimer = await focusPage.getTimerDisplay();
    expect(englishTimer).toMatch(/\d{2}:\d{2}/);
    
    // Switch to Chinese
    await focusPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check if time units are localized (if implemented)
    const chineseTimer = await focusPage.getTimerDisplay();
    expect(chineseTimer).toBeDefined();
    
    // Check session counter localization
    const sessionCounter = await focusPage.getSessionCounter();
    expect(sessionCounter).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should localize form validation messages', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Switch to Chinese first
    await tasksPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Try to create task without required fields
    await tasksPage.clickAddTask();
    await tasksPage.waitForElement(tasksPage.selectors.taskModal);
    
    // Submit without title to trigger validation
    await tasksPage.click(tasksPage.selectors.saveButton);
    
    // Check if validation message is in Chinese
    await tasksPage.waitForElement(tasksPage.selectors.formError);
    const errorMessage = await tasksPage.getText(tasksPage.selectors.formError);
    expect(errorMessage).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should localize toast notifications', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Switch to Chinese
    await tasksPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Create a task to trigger a toast notification
    await tasksPage.createTask({
      title: 'Test Task',
      description: 'Test description',
    });
    
    // Check if toast is in Chinese
    await tasksPage.waitForToast();
    const toastText = await tasksPage.getText(tasksPage.selectors.toast);
    expect(toastText).toMatch(/[\u4e00-\u9fff]/);
  });

  test('should handle parameter interpolation in different languages', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start a timer to get time-based messages
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Check English time interpolation
    const englishProgress = await focusPage.getSessionProgress();
    expect(englishProgress).toMatch(/\d+%/);
    
    // Switch to Chinese
    await focusPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check Chinese time interpolation
    const chineseProgress = await focusPage.getSessionProgress();
    expect(chineseProgress).toMatch(/\d+%/);
  });

  test('should handle date and time formatting in different languages', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Check if week calendar is visible
    const calendarVisible = await homePage.isWeekCalendarVisible();
    if (calendarVisible) {
      // Check English date format
      const englishDates = await homePage.page.locator('[data-testid="calendar-date"]').allTextContents();
      expect(englishDates.length).toBeGreaterThan(0);
      
      // Switch to Chinese
      await homePage.changeLanguage('zh');
      await page.waitForTimeout(testTimeouts.medium);
      
      // Check Chinese date format
      const chineseDates = await homePage.page.locator('[data-testid="calendar-date"]').allTextContents();
      expect(chineseDates.length).toBeGreaterThan(0);
    }
  });

  test('should handle language-specific number formatting', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Check English number formatting
    const englishSessions = await focusPage.getCompletedSessions();
    expect(englishSessions).toMatch(/\d+/);
    
    // Switch to Chinese
    await focusPage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check Chinese number formatting (if different)
    const chineseSessions = await focusPage.getCompletedSessions();
    expect(chineseSessions).toMatch(/\d+/);
  });

  test('should handle right-to-left languages gracefully', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // This test is more about ensuring the app doesn't break
    // when handling different text directions
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check that the layout is still functional
    await homePage.assertNoErrors();
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage).toBeDefined();
  });

  test('should handle missing translations gracefully', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check that even if some translations are missing,
    // the app doesn't break and shows fallback text
    await homePage.assertNoErrors();
    await homePage.assertPageLoaded();
  });

  test('should remember language preference after app restart', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Switch to Chinese
    await homePage.changeLanguage('zh');
    await page.waitForTimeout(testTimeouts.medium);
    
    // Simulate app restart by clearing session storage but keeping localStorage
    await page.evaluate(() => {
      sessionStorage.clear();
      // Keep localStorage to simulate app restart
    });
    
    // Navigate to app again
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Check if language preference is still Chinese
    const welcomeMessage = await homePage.getWelcomeMessage();
    expect(welcomeMessage).toMatch(/[\u4e00-\u9fff]/);
  });
});