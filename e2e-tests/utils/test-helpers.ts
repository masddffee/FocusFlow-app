import { Page, expect } from '@playwright/test';

/**
 * Utility functions for FocusFlow E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the app to be fully loaded
   */
  async waitForAppReady() {
    await this.page.waitForLoadState('networkidle');
    // Wait for React app to initialize
    await this.page.waitForSelector('#root', { timeout: 10000 });
    // Wait for app content to load
    await this.page.waitForTimeout(2000);
  }

  /**
   * Clear all local storage and session storage
   */
  async clearStorage() {
    try {
      await this.page.evaluate(() => {
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
  }

  /**
   * Wait for loading states to complete
   */
  async waitForLoadingComplete() {
    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading"]', { 
      state: 'hidden', 
      timeout: 5000 
    }).catch(() => {
      // Ignore if loading indicator doesn't exist
    });
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string) {
    if (url) {
      await this.page.waitForURL(url);
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(selector: string, retries: number = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.click(selector);
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Fill input with clear and type
   */
  async fillInput(selector: string, value: string) {
    await this.page.locator(selector).clear();
    await this.page.locator(selector).fill(value);
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 30000) {
    return await this.page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Mock API response
   */
  async mockApiResponse(url: string | RegExp, response: any) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Check if tab is active
   */
  async isTabActive(tabName: string): Promise<boolean> {
    const activeTab = await this.page.locator('[data-testid="active-tab"]');
    const tabText = await activeTab.textContent();
    return tabText?.toLowerCase().includes(tabName.toLowerCase()) || false;
  }

  /**
   * Navigate to tab
   */
  async navigateToTab(tabName: string) {
    const tabSelector = `[data-testid="tab-${tabName.toLowerCase()}"]`;
    await this.clickWithRetry(tabSelector);
    await this.waitForNavigation();
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout: number = 5000) {
    const toastSelector = '[data-testid="toast"]';
    await this.page.waitForSelector(toastSelector, { timeout });
    
    if (message) {
      const toastText = await this.page.locator(toastSelector).textContent();
      expect(toastText).toContain(message);
    }
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Get element text content
   */
  async getTextContent(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Wait for element to contain text
   */
  async waitForText(selector: string, text: string, timeout: number = 10000) {
    await this.page.waitForFunction(
      ({ selector, text }) => {
        const element = document.querySelector(selector);
        return element?.textContent?.includes(text);
      },
      { selector, text },
      { timeout }
    );
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for multiple elements
   */
  async waitForElements(selectors: string[], timeout: number = 10000) {
    await Promise.all(
      selectors.map(selector => 
        this.page.waitForSelector(selector, { timeout })
      )
    );
  }

  /**
   * Check if page has error
   */
  async hasError(): Promise<boolean> {
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '[role="alert"]',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for no loading states
   */
  async waitForNoLoading() {
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[data-testid="spinner"]'
    ];
    
    for (const selector of loadingSelectors) {
      await this.page.waitForSelector(selector, { 
        state: 'hidden', 
        timeout: 5000 
      }).catch(() => {
        // Ignore if selector doesn't exist
      });
    }
  }
}

/**
 * Test data helpers
 */
export class TestData {
  static generateTask() {
    return {
      title: `Test Task ${Date.now()}`,
      description: 'This is a test task for E2E testing',
      priority: 'high',
      estimatedTime: 60,
      category: 'work'
    };
  }

  static generateUser() {
    return {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      language: 'en'
    };
  }

  static generateFocusSession() {
    return {
      duration: 25,
      type: 'focus',
      taskId: 'test-task-id'
    };
  }
}

/**
 * Common assertions
 */
export class TestAssertions {
  constructor(private page: Page) {}

  async assertPageTitle(expectedTitle: string) {
    const title = await this.page.title();
    expect(title).toContain(expectedTitle);
  }

  async assertUrlContains(expectedUrl: string) {
    const url = this.page.url();
    expect(url).toContain(expectedUrl);
  }

  async assertElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async assertElementCount(selector: string, count: number) {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  async assertElementText(selector: string, text: string) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async assertNoErrors() {
    const helpers = new TestHelpers(this.page);
    const hasError = await helpers.hasError();
    expect(hasError).toBe(false);
  }
}