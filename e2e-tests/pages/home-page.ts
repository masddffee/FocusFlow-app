import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Home Page Object Model for FocusFlow E2E tests
 * Represents the main dashboard/home screen
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to home page
   */
  async navigate() {
    await super.navigate('/');
  }

  /**
   * Home page specific selectors
   */
  get selectors() {
    return {
      ...this.commonSelectors,
      welcomeMessage: '[data-testid="welcome-message"]',
      quickActions: '[data-testid="quick-actions"]',
      todayTasks: '[data-testid="today-tasks"]',
      focusTimerSection: '[data-testid="focus-timer-section"]',
      startFocusButton: '[data-testid="start-focus-button"]',
      addTaskButton: '[data-testid="add-task-button"]',
      taskList: '[data-testid="task-list"]',
      taskItem: '[data-testid="task-item"]',
      emptyState: '[data-testid="empty-state"]',
      todayProgress: '[data-testid="today-progress"]',
      weekCalendar: '[data-testid="week-calendar"]',
      upcomingTasks: '[data-testid="upcoming-tasks"]',
      completedTasks: '[data-testid="completed-tasks"]',
      aiSuggestions: '[data-testid="ai-suggestions"]',
      languageSelector: '[data-testid="language-selector"]',
    };
  }

  /**
   * Check if welcome message is visible
   */
  async isWelcomeMessageVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.welcomeMessage);
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.selectors.welcomeMessage);
  }

  /**
   * Click add task button
   */
  async clickAddTask() {
    await this.click(this.selectors.addTaskButton);
  }

  /**
   * Click start focus button
   */
  async clickStartFocus() {
    await this.click(this.selectors.startFocusButton);
  }

  /**
   * Get today's tasks count
   */
  async getTodayTasksCount(): Promise<number> {
    const taskItems = await this.page.locator(this.selectors.taskItem);
    return await taskItems.count();
  }

  /**
   * Get task by index
   */
  async getTaskByIndex(index: number) {
    const taskItems = await this.page.locator(this.selectors.taskItem);
    return taskItems.nth(index);
  }

  /**
   * Click task by index
   */
  async clickTaskByIndex(index: number) {
    const task = await this.getTaskByIndex(index);
    await task.click();
  }

  /**
   * Get task title by index
   */
  async getTaskTitleByIndex(index: number): Promise<string> {
    const task = await this.getTaskByIndex(index);
    const titleElement = task.locator('[data-testid="task-title"]');
    return await titleElement.textContent() || '';
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.emptyState);
  }

  /**
   * Get today's progress percentage
   */
  async getTodayProgress(): Promise<string> {
    return await this.getText(this.selectors.todayProgress);
  }

  /**
   * Check if focus timer section is visible
   */
  async isFocusTimerVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.focusTimerSection);
  }

  /**
   * Check if week calendar is visible
   */
  async isWeekCalendarVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.weekCalendar);
  }

  /**
   * Get upcoming tasks count
   */
  async getUpcomingTasksCount(): Promise<number> {
    const upcomingTasks = await this.page.locator(this.selectors.upcomingTasks + ' ' + this.selectors.taskItem);
    return await upcomingTasks.count();
  }

  /**
   * Get completed tasks count
   */
  async getCompletedTasksCount(): Promise<number> {
    const completedTasks = await this.page.locator(this.selectors.completedTasks + ' ' + this.selectors.taskItem);
    return await completedTasks.count();
  }

  /**
   * Check if AI suggestions are visible
   */
  async areAISuggestionsVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.aiSuggestions);
  }

  /**
   * Click language selector
   */
  async clickLanguageSelector() {
    await this.click(this.selectors.languageSelector);
  }

  /**
   * Change language
   */
  async changeLanguage(language: 'en' | 'zh') {
    await this.clickLanguageSelector();
    const languageOption = `[data-testid="language-option-${language}"]`;
    await this.click(languageOption);
  }

  /**
   * Wait for tasks to load
   */
  async waitForTasksToLoad() {
    await this.waitForElement(this.selectors.taskList);
    await this.helpers.waitForLoadingComplete();
  }

  /**
   * Mark task as completed by index
   */
  async markTaskAsCompleted(index: number) {
    const task = await this.getTaskByIndex(index);
    const completeButton = task.locator('[data-testid="complete-task-button"]');
    await completeButton.click();
  }

  /**
   * Quick action shortcuts
   */
  async useQuickAction(action: 'add-task' | 'start-focus' | 'view-stats' | 'settings') {
    const quickActionsSelector = this.selectors.quickActions;
    const actionButton = `${quickActionsSelector} [data-testid="quick-action-${action}"]`;
    await this.click(actionButton);
  }

  /**
   * Assertions specific to home page
   */
  async assertHomePageLoaded() {
    await this.assertPageLoaded();
    await this.assertElementVisible(this.selectors.welcomeMessage);
    await this.assertElementVisible(this.selectors.quickActions);
  }

  async assertTasksVisible() {
    await this.assertElementVisible(this.selectors.taskList);
  }

  async assertEmptyState() {
    await this.assertElementVisible(this.selectors.emptyState);
  }

  async assertFocusTimerVisible() {
    await this.assertElementVisible(this.selectors.focusTimerSection);
  }

  async assertWeekCalendarVisible() {
    await this.assertElementVisible(this.selectors.weekCalendar);
  }

  async assertTaskCount(expectedCount: number) {
    const actualCount = await this.getTodayTasksCount();
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} tasks, but found ${actualCount}`);
    }
  }
}