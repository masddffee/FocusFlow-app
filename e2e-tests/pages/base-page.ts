import { Page } from '@playwright/test';
import { TestHelpers, TestAssertions } from '../utils/test-helpers';

/**
 * Base Page Object Model for FocusFlow E2E tests
 * All page objects should extend this class
 */
export class BasePage {
  protected helpers: TestHelpers;
  protected assertions: TestAssertions;

  constructor(protected page: Page) {
    this.helpers = new TestHelpers(page);
    this.assertions = new TestAssertions(page);
  }

  /**
   * Navigate to a specific URL
   */
  async navigate(url: string) {
    await this.page.goto(url);
    await this.helpers.waitForAppReady();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for page to load completely
   */
  async waitForLoad() {
    await this.helpers.waitForAppReady();
    await this.helpers.waitForLoadingComplete();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string) {
    await this.helpers.takeScreenshot(name);
  }

  /**
   * Check if page has errors
   */
  async hasErrors(): Promise<boolean> {
    return await this.helpers.hasError();
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout?: number) {
    await this.helpers.waitForElement(selector, timeout);
  }

  /**
   * Click element
   */
  async click(selector: string) {
    await this.helpers.clickWithRetry(selector);
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string) {
    await this.helpers.fillInput(selector, value);
  }

  /**
   * Get text content
   */
  async getText(selector: string): Promise<string> {
    return await this.helpers.getTextContent(selector);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.helpers.isVisible(selector);
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout?: number) {
    await this.helpers.waitForToast(message, timeout);
  }

  /**
   * Common page elements
   */
  get commonSelectors() {
    return {
      appLoaded: '[data-testid="app-loaded"]',
      loading: '[data-testid="loading"]',
      error: '[data-testid="error"]',
      toast: '[data-testid="toast"]',
      backButton: '[data-testid="back-button"]',
      closeButton: '[data-testid="close-button"]',
      saveButton: '[data-testid="save-button"]',
      cancelButton: '[data-testid="cancel-button"]',
      confirmButton: '[data-testid="confirm-button"]',
      deleteButton: '[data-testid="delete-button"]',
    };
  }

  /**
   * Common navigation elements
   */
  get navigationSelectors() {
    return {
      tabHome: '[data-testid="tab-home"]',
      tabTasks: '[data-testid="tab-tasks"]',
      tabStats: '[data-testid="tab-stats"]',
      tabProfile: '[data-testid="tab-profile"]',
      activeTab: '[data-testid="active-tab"]',
    };
  }

  /**
   * Navigate to home tab
   */
  async navigateToHome() {
    await this.helpers.navigateToTab('home');
  }

  /**
   * Navigate to tasks tab
   */
  async navigateToTasks() {
    await this.helpers.navigateToTab('tasks');
  }

  /**
   * Navigate to stats tab
   */
  async navigateToStats() {
    await this.helpers.navigateToTab('stats');
  }

  /**
   * Navigate to profile tab
   */
  async navigateToProfile() {
    await this.helpers.navigateToTab('profile');
  }

  /**
   * Check which tab is currently active
   */
  async getActiveTab(): Promise<string> {
    return await this.helpers.getTextContent(this.navigationSelectors.activeTab);
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string) {
    await this.helpers.waitForNavigation(url);
  }

  /**
   * Common assertions
   */
  async assertPageLoaded() {
    await this.assertions.assertElementVisible(this.commonSelectors.appLoaded);
  }

  async assertNoErrors() {
    await this.assertions.assertNoErrors();
  }

  async assertUrlContains(expectedUrl: string) {
    await this.assertions.assertUrlContains(expectedUrl);
  }

  async assertElementVisible(selector: string) {
    await this.assertions.assertElementVisible(selector);
  }

  async assertElementHidden(selector: string) {
    await this.assertions.assertElementHidden(selector);
  }

  async assertElementText(selector: string, text: string) {
    await this.assertions.assertElementText(selector, text);
  }
}