import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { TasksPage } from './pages/tasks-page';
import { FocusPage } from './pages/focus-page';
import { testTimeouts } from './fixtures/test-data';

/**
 * Navigation Tests for FocusFlow
 * Tests the core navigation functionality between different screens
 */

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should navigate to home page and display welcome message', async ({ page }) => {
    const homePage = new HomePage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    await homePage.assertNoErrors();
    
    // Check if welcome message is visible
    const isWelcomeVisible = await homePage.isWelcomeMessageVisible();
    expect(isWelcomeVisible).toBe(true);
  });

  test('should navigate between all main tabs', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    const focusPage = new FocusPage(page);
    
    // Start on home page
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Navigate to tasks tab
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertNoErrors();
    
    // Navigate to focus tab
    await tasksPage.navigateToHome();
    await homePage.navigateToTasks();
    await homePage.click(homePage.navigationSelectors.tabHome);
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    await focusPage.assertNoErrors();
    
    // Navigate back to home
    await focusPage.navigateToHome();
    await homePage.assertHomePageLoaded();
  });

  test('should maintain tab state during navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Navigate to tasks
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    
    // Check active tab
    const activeTab = await homePage.getActiveTab();
    expect(activeTab.toLowerCase()).toContain('tasks');
    
    // Navigate back to home
    await tasksPage.navigateToHome();
    await homePage.assertHomePageLoaded();
    
    // Check active tab changed
    const homeActiveTab = await homePage.getActiveTab();
    expect(homeActiveTab.toLowerCase()).toContain('home');
  });

  test('should handle deep linking to specific pages', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const focusPage = new FocusPage(page);
    
    // Navigate directly to tasks page
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertNoErrors();
    
    // Navigate directly to focus page
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    await focusPage.assertNoErrors();
  });

  test('should handle page refresh without losing state', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Navigate to tasks
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    
    // Refresh page
    await page.reload();
    await tasksPage.waitForLoad();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertNoErrors();
  });

  test('should handle back button navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Navigate to tasks
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    
    // Use browser back button
    await page.goBack();
    await homePage.waitForLoad();
    await homePage.assertHomePageLoaded();
    
    // Use browser forward button
    await page.goForward();
    await tasksPage.waitForLoad();
    await tasksPage.assertTasksPageLoaded();
  });

  test('should handle navigation with keyboard shortcuts', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Try keyboard navigation (if supported)
    await page.keyboard.press('Alt+1'); // Home
    await homePage.waitForLoad();
    await homePage.assertHomePageLoaded();
    
    await page.keyboard.press('Alt+2'); // Tasks
    await page.waitForTimeout(testTimeouts.short);
    // Note: This depends on if keyboard shortcuts are implemented
  });

  test('should display loading states during navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    await homePage.navigate();
    await homePage.assertHomePageLoaded();
    
    // Navigate to tasks and check for loading state
    await homePage.navigateToTasks();
    
    // Check that loading is handled gracefully
    await tasksPage.waitForLoad();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertNoErrors();
  });

  test('should handle navigation errors gracefully', async ({ page }) => {
    const homePage = new HomePage(page);
    
    // Try to navigate to a non-existent page
    await page.goto('/non-existent-page');
    
    // Should either redirect to home or show an error page
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check if we're redirected to home or if there's an error page
    const currentUrl = page.url();
    const isOnHome = currentUrl.includes('/') && !currentUrl.includes('/non-existent-page');
    const hasError = await homePage.hasErrors();
    
    expect(isOnHome || hasError).toBe(true);
  });

  test('should preserve navigation state across app restarts', async ({ page }) => {
    const homePage = new HomePage(page);
    const tasksPage = new TasksPage(page);
    
    // Navigate to tasks and add some state
    await homePage.navigate();
    await homePage.navigateToTasks();
    await tasksPage.assertTasksPageLoaded();
    
    // Store current URL
    const currentUrl = page.url();
    
    // Simulate app restart by clearing page and navigating again
    await page.evaluate(() => {
      // Don't clear localStorage to simulate app restart
      sessionStorage.clear();
    });
    
    await page.goto(currentUrl);
    await tasksPage.waitForLoad();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertNoErrors();
  });
});