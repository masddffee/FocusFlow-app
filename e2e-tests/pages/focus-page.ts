import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Focus Page Object Model for FocusFlow E2E tests
 * Represents the focus timer/session screen
 */
export class FocusPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to focus page
   */
  async navigate() {
    await super.navigate('/focus');
  }

  /**
   * Focus page specific selectors
   */
  get selectors() {
    return {
      ...this.commonSelectors,
      pageTitle: '[data-testid="focus-page-title"]',
      timerDisplay: '[data-testid="timer-display"]',
      timerMinutes: '[data-testid="timer-minutes"]',
      timerSeconds: '[data-testid="timer-seconds"]',
      startButton: '[data-testid="start-button"]',
      pauseButton: '[data-testid="pause-button"]',
      stopButton: '[data-testid="stop-button"]',
      resetButton: '[data-testid="reset-button"]',
      timerStatus: '[data-testid="timer-status"]',
      sessionType: '[data-testid="session-type"]',
      currentTask: '[data-testid="current-task"]',
      sessionProgress: '[data-testid="session-progress"]',
      sessionCounter: '[data-testid="session-counter"]',
      focusSettings: '[data-testid="focus-settings"]',
      durationSelector: '[data-testid="duration-selector"]',
      taskSelector: '[data-testid="task-selector"]',
      backgroundMusic: '[data-testid="background-music"]',
      soundSettings: '[data-testid="sound-settings"]',
      breakReminder: '[data-testid="break-reminder"]',
      completedSessions: '[data-testid="completed-sessions"]',
      todayProgress: '[data-testid="today-progress"]',
      streakCounter: '[data-testid="streak-counter"]',
      motivationalMessage: '[data-testid="motivational-message"]',
      settingsButton: '[data-testid="settings-button"]',
      fullscreenButton: '[data-testid="fullscreen-button"]',
      minimizeButton: '[data-testid="minimize-button"]',
      sessionNotes: '[data-testid="session-notes"]',
      sessionHistory: '[data-testid="session-history"]',
      endSessionButton: '[data-testid="end-session-button"]',
      sessionComplete: '[data-testid="session-complete"]',
      breakTime: '[data-testid="break-time"]',
      nextSessionButton: '[data-testid="next-session-button"]',
      reflectionModal: '[data-testid="reflection-modal"]',
      reflectionInput: '[data-testid="reflection-input"]',
      ratingStars: '[data-testid="rating-stars"]',
      submitReflectionButton: '[data-testid="submit-reflection-button"]',
    };
  }

  /**
   * Start focus timer
   */
  async startTimer() {
    await this.click(this.selectors.startButton);
  }

  /**
   * Pause focus timer
   */
  async pauseTimer() {
    await this.click(this.selectors.pauseButton);
  }

  /**
   * Stop focus timer
   */
  async stopTimer() {
    await this.click(this.selectors.stopButton);
  }

  /**
   * Reset focus timer
   */
  async resetTimer() {
    await this.click(this.selectors.resetButton);
  }

  /**
   * Get timer display text
   */
  async getTimerDisplay(): Promise<string> {
    return await this.getText(this.selectors.timerDisplay);
  }

  /**
   * Get timer minutes
   */
  async getTimerMinutes(): Promise<string> {
    return await this.getText(this.selectors.timerMinutes);
  }

  /**
   * Get timer seconds
   */
  async getTimerSeconds(): Promise<string> {
    return await this.getText(this.selectors.timerSeconds);
  }

  /**
   * Get timer status
   */
  async getTimerStatus(): Promise<string> {
    return await this.getText(this.selectors.timerStatus);
  }

  /**
   * Get session type
   */
  async getSessionType(): Promise<string> {
    return await this.getText(this.selectors.sessionType);
  }

  /**
   * Get current task name
   */
  async getCurrentTask(): Promise<string> {
    return await this.getText(this.selectors.currentTask);
  }

  /**
   * Set focus duration
   */
  async setFocusDuration(minutes: number) {
    await this.click(this.selectors.durationSelector);
    await this.click(`[data-testid="duration-${minutes}"]`);
  }

  /**
   * Select task for focus session
   */
  async selectTask(taskId: string) {
    await this.click(this.selectors.taskSelector);
    await this.click(`[data-testid="task-option-${taskId}"]`);
  }

  /**
   * Toggle background music
   */
  async toggleBackgroundMusic() {
    await this.click(this.selectors.backgroundMusic);
  }

  /**
   * Open focus settings
   */
  async openSettings() {
    await this.click(this.selectors.settingsButton);
  }

  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen() {
    await this.click(this.selectors.fullscreenButton);
  }

  /**
   * Minimize focus window
   */
  async minimize() {
    await this.click(this.selectors.minimizeButton);
  }

  /**
   * Add session notes
   */
  async addSessionNotes(notes: string) {
    await this.fillInput(this.selectors.sessionNotes, notes);
  }

  /**
   * End current session
   */
  async endSession() {
    await this.click(this.selectors.endSessionButton);
  }

  /**
   * Get session progress percentage
   */
  async getSessionProgress(): Promise<string> {
    return await this.getText(this.selectors.sessionProgress);
  }

  /**
   * Get session counter
   */
  async getSessionCounter(): Promise<string> {
    return await this.getText(this.selectors.sessionCounter);
  }

  /**
   * Get completed sessions count
   */
  async getCompletedSessions(): Promise<string> {
    return await this.getText(this.selectors.completedSessions);
  }

  /**
   * Get today's progress
   */
  async getTodayProgress(): Promise<string> {
    return await this.getText(this.selectors.todayProgress);
  }

  /**
   * Get streak counter
   */
  async getStreakCounter(): Promise<string> {
    return await this.getText(this.selectors.streakCounter);
  }

  /**
   * Get motivational message
   */
  async getMotivationalMessage(): Promise<string> {
    return await this.getText(this.selectors.motivationalMessage);
  }

  /**
   * Check if timer is running
   */
  async isTimerRunning(): Promise<boolean> {
    const status = await this.getTimerStatus();
    return status.toLowerCase().includes('running') || status.toLowerCase().includes('active');
  }

  /**
   * Check if timer is paused
   */
  async isTimerPaused(): Promise<boolean> {
    const status = await this.getTimerStatus();
    return status.toLowerCase().includes('paused');
  }

  /**
   * Check if session is complete
   */
  async isSessionComplete(): Promise<boolean> {
    return await this.isVisible(this.selectors.sessionComplete);
  }

  /**
   * Check if break time is active
   */
  async isBreakTime(): Promise<boolean> {
    return await this.isVisible(this.selectors.breakTime);
  }

  /**
   * Start next session
   */
  async startNextSession() {
    await this.click(this.selectors.nextSessionButton);
  }

  /**
   * Wait for session to complete
   */
  async waitForSessionComplete(timeout: number = 60000) {
    await this.waitForElement(this.selectors.sessionComplete, timeout);
  }

  /**
   * Wait for break time
   */
  async waitForBreakTime(timeout: number = 60000) {
    await this.waitForElement(this.selectors.breakTime, timeout);
  }

  /**
   * Submit reflection after session
   */
  async submitReflection(reflection: string, rating: number) {
    await this.waitForElement(this.selectors.reflectionModal);
    await this.fillInput(this.selectors.reflectionInput, reflection);
    
    // Click rating stars
    const starSelector = `${this.selectors.ratingStars} [data-testid="star-${rating}"]`;
    await this.click(starSelector);
    
    await this.click(this.selectors.submitReflectionButton);
  }

  /**
   * Get session history
   */
  async getSessionHistory(): Promise<string[]> {
    const historyItems = await this.page.locator(this.selectors.sessionHistory + ' [data-testid="history-item"]');
    const count = await historyItems.count();
    const history: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const item = await historyItems.nth(i).textContent();
      if (item) history.push(item);
    }
    
    return history;
  }

  /**
   * Wait for timer to count down
   */
  async waitForTimerChange(initialTime: string, timeout: number = 10000) {
    await this.page.waitForFunction(
      ({ selector, initialTime }) => {
        const element = document.querySelector(selector);
        return element?.textContent !== initialTime;
      },
      { selector: this.selectors.timerDisplay, initialTime },
      { timeout }
    );
  }

  /**
   * Assertions specific to focus page
   */
  async assertFocusPageLoaded() {
    await this.assertPageLoaded();
    await this.assertElementVisible(this.selectors.pageTitle);
    await this.assertElementVisible(this.selectors.timerDisplay);
  }

  async assertTimerStatus(expectedStatus: string) {
    const status = await this.getTimerStatus();
    if (!status.toLowerCase().includes(expectedStatus.toLowerCase())) {
      throw new Error(`Expected timer status to contain "${expectedStatus}", but found "${status}"`);
    }
  }

  async assertSessionType(expectedType: string) {
    const sessionType = await this.getSessionType();
    if (sessionType !== expectedType) {
      throw new Error(`Expected session type "${expectedType}", but found "${sessionType}"`);
    }
  }

  async assertCurrentTask(expectedTask: string) {
    const currentTask = await this.getCurrentTask();
    if (currentTask !== expectedTask) {
      throw new Error(`Expected current task "${expectedTask}", but found "${currentTask}"`);
    }
  }

  async assertTimerRunning() {
    const isRunning = await this.isTimerRunning();
    if (!isRunning) {
      throw new Error('Expected timer to be running, but it is not');
    }
  }

  async assertTimerPaused() {
    const isPaused = await this.isTimerPaused();
    if (!isPaused) {
      throw new Error('Expected timer to be paused, but it is not');
    }
  }

  async assertSessionComplete() {
    await this.assertElementVisible(this.selectors.sessionComplete);
  }

  async assertBreakTime() {
    await this.assertElementVisible(this.selectors.breakTime);
  }

  async assertTimerDisplay(expectedTime: string) {
    const actualTime = await this.getTimerDisplay();
    if (actualTime !== expectedTime) {
      throw new Error(`Expected timer display "${expectedTime}", but found "${actualTime}"`);
    }
  }
}