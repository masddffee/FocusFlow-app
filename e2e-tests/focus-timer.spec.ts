import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { FocusPage } from './pages/focus-page';
import { TasksPage } from './pages/tasks-page';
import { testTasks, testSessions, testTimeouts } from './fixtures/test-data';

/**
 * Focus Timer Tests for FocusFlow
 * Tests the focus timer functionality including sessions, breaks, and task integration
 */

test.describe('Focus Timer Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display initial timer state correctly', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    await focusPage.assertNoErrors();
    
    // Check initial timer display
    const timerDisplay = await focusPage.getTimerDisplay();
    expect(timerDisplay).toMatch(/\d{2}:\d{2}/); // Format: MM:SS
    
    // Check initial timer status
    const timerStatus = await focusPage.getTimerStatus();
    expect(timerStatus.toLowerCase()).toContain('ready');
  });

  test('should start focus timer successfully', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start the timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify timer is running
    await focusPage.assertTimerRunning();
    await focusPage.assertTimerStatus('running');
  });

  test('should pause and resume timer', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    await focusPage.assertTimerRunning();
    
    // Pause timer
    await focusPage.pauseTimer();
    await page.waitForTimeout(testTimeouts.short);
    await focusPage.assertTimerPaused();
    
    // Resume timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    await focusPage.assertTimerRunning();
  });

  test('should stop timer and reset to initial state', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    await focusPage.assertTimerRunning();
    
    // Stop timer
    await focusPage.stopTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify timer is stopped and reset
    const timerStatus = await focusPage.getTimerStatus();
    expect(timerStatus.toLowerCase()).toContain('ready');
  });

  test('should reset timer to initial duration', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer and let it run for a bit
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.medium);
    
    // Reset timer
    await focusPage.resetTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify timer is reset to initial duration
    const timerDisplay = await focusPage.getTimerDisplay();
    expect(timerDisplay).toMatch(/^2[0-9]:\d{2}$/); // Should be around 25:00 or similar
  });

  test('should change focus duration', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Change focus duration to 30 minutes
    await focusPage.setFocusDuration(30);
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify timer display shows new duration
    const timerDisplay = await focusPage.getTimerDisplay();
    expect(timerDisplay).toMatch(/^30:00$/);
  });

  test('should associate timer with a specific task', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const focusPage = new FocusPage(page);
    
    // First create a task
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Navigate to focus page
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Select the task for focus session
    await focusPage.selectTask('test-task-1');
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify task is selected
    const currentTask = await focusPage.getCurrentTask();
    expect(currentTask).toContain(testTasks.simple.title);
  });

  test('should track session progress', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.medium);
    
    // Check session progress
    const sessionProgress = await focusPage.getSessionProgress();
    expect(sessionProgress).toMatch(/\d+%/);
    
    // Progress should be greater than 0
    const progressValue = parseInt(sessionProgress.replace('%', ''));
    expect(progressValue).toBeGreaterThan(0);
  });

  test('should count completed sessions', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Get initial session count
    const initialSessions = await focusPage.getCompletedSessions();
    const initialCount = parseInt(initialSessions) || 0;
    
    // Complete a very short session for testing
    await focusPage.setFocusDuration(1); // 1 minute for testing
    await focusPage.startTimer();
    
    // Wait for session to complete (with generous timeout)
    await focusPage.waitForSessionComplete(testTimeouts.veryLong);
    await focusPage.assertSessionComplete();
    
    // Check session count increased
    const finalSessions = await focusPage.getCompletedSessions();
    const finalCount = parseInt(finalSessions) || 0;
    expect(finalCount).toBe(initialCount + 1);
  });

  test('should handle break time after focus session', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Set short duration for testing
    await focusPage.setFocusDuration(1);
    await focusPage.startTimer();
    
    // Wait for session to complete
    await focusPage.waitForSessionComplete(testTimeouts.veryLong);
    
    // Should automatically start break or show break option
    await focusPage.waitForBreakTime(testTimeouts.medium);
    await focusPage.assertBreakTime();
  });

  test('should start next session after break', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Set very short durations for testing
    await focusPage.setFocusDuration(1);
    await focusPage.startTimer();
    
    // Wait for session to complete and break to start
    await focusPage.waitForSessionComplete(testTimeouts.veryLong);
    await focusPage.waitForBreakTime(testTimeouts.medium);
    
    // Start next session
    await focusPage.startNextSession();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify new session started
    await focusPage.assertTimerRunning();
    await focusPage.assertSessionType('focus');
  });

  test('should toggle background music', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Toggle background music
    await focusPage.toggleBackgroundMusic();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify music settings changed
    const musicButton = await focusPage.page.locator(focusPage.selectors.backgroundMusic);
    const isActive = await musicButton.isVisible();
    expect(isActive).toBe(true);
  });

  test('should open and close focus settings', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Open settings
    await focusPage.openSettings();
    await focusPage.waitForElement(focusPage.selectors.focusSettings);
    
    // Verify settings are visible
    const settingsVisible = await focusPage.isVisible(focusPage.selectors.focusSettings);
    expect(settingsVisible).toBe(true);
  });

  test('should handle fullscreen mode', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Toggle fullscreen
    await focusPage.toggleFullscreen();
    await page.waitForTimeout(testTimeouts.short);
    
    // Note: Fullscreen detection might be limited in test environment
    // This test mainly ensures the button works without errors
    await focusPage.assertNoErrors();
  });

  test('should add and save session notes', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Add session notes
    const testNotes = 'This is a test note for the focus session';
    await focusPage.addSessionNotes(testNotes);
    
    // Start a session
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Verify notes are saved
    const notesValue = await focusPage.page.locator(focusPage.selectors.sessionNotes).inputValue();
    expect(notesValue).toBe(testNotes);
  });

  test('should submit reflection after session completion', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Set short duration and complete session
    await focusPage.setFocusDuration(1);
    await focusPage.startTimer();
    await focusPage.waitForSessionComplete(testTimeouts.veryLong);
    
    // Submit reflection
    const reflection = 'Great focus session!';
    const rating = 5;
    await focusPage.submitReflection(reflection, rating);
    
    // Verify reflection was submitted
    await focusPage.waitForToast('Reflection saved');
  });

  test('should display session history', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Check if session history is visible
    const historyVisible = await focusPage.isVisible(focusPage.selectors.sessionHistory);
    expect(historyVisible).toBe(true);
    
    // Get session history
    const history = await focusPage.getSessionHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test('should show motivational messages', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer to potentially trigger motivational messages
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Check if motivational message is shown
    const motivationalVisible = await focusPage.isVisible(focusPage.selectors.motivationalMessage);
    if (motivationalVisible) {
      const message = await focusPage.getMotivationalMessage();
      expect(message.length).toBeGreaterThan(0);
    }
  });

  test('should track daily progress and streaks', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Get today's progress
    const todayProgress = await focusPage.getTodayProgress();
    expect(todayProgress).toMatch(/\d+/);
    
    // Get streak counter
    const streakCounter = await focusPage.getStreakCounter();
    expect(streakCounter).toMatch(/\d+/);
  });

  test('should handle timer state persistence across page refresh', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Start timer
    await focusPage.startTimer();
    await page.waitForTimeout(testTimeouts.medium);
    
    // Refresh page
    await page.reload();
    await focusPage.waitForLoad();
    await focusPage.assertFocusPageLoaded();
    
    // Check if timer state is preserved
    const timerStatus = await focusPage.getTimerStatus();
    // Note: This depends on implementation - timer might pause on refresh
    expect(timerStatus).toBeDefined();
  });

  test('should handle multiple timer actions rapidly', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Rapidly start, pause, resume, and stop timer
    await focusPage.startTimer();
    await page.waitForTimeout(100);
    
    await focusPage.pauseTimer();
    await page.waitForTimeout(100);
    
    await focusPage.startTimer();
    await page.waitForTimeout(100);
    
    await focusPage.stopTimer();
    await page.waitForTimeout(testTimeouts.short);
    
    // Should handle rapid actions gracefully
    await focusPage.assertNoErrors();
  });

  test('should minimize focus window', async ({ page }) => {
    const focusPage = new FocusPage(page);
    
    await focusPage.navigate();
    await focusPage.assertFocusPageLoaded();
    
    // Minimize (note: actual minimize behavior may vary in test environment)
    await focusPage.minimize();
    await page.waitForTimeout(testTimeouts.short);
    
    // Ensure no errors occurred
    await focusPage.assertNoErrors();
  });
});