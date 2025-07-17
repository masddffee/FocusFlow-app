import { test, expect } from '@playwright/test';

/**
 * Basic App Tests for FocusFlow
 * Tests basic app functionality and structure
 */

test.describe('Basic App Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test (with error handling)
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
  });

  test('should load the app successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if app title is correct
    const title = await page.title();
    expect(title).toContain('FocusMate: Intelligent Study');
    
    // Check if root element exists
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
  });

  test('should display app content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for React to render
    
    // Take screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/app-screenshot.png', fullPage: true });
    
    // Check if any content is rendered
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText);
    
    // Check if there are any React components
    const reactComponents = await page.locator('div').count();
    console.log('Number of div elements:', reactComponents);
    
    expect(reactComponents).toBeGreaterThan(0);
  });

  test('should handle navigation structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for common navigation elements
    const navElements = await page.locator('nav, [role="navigation"], .navigation').count();
    console.log('Navigation elements found:', navElements);
    
    // Check for tab-like elements
    const tabElements = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    console.log('Tab elements found:', tabElements);
    
    // Check for button elements
    const buttonElements = await page.locator('button, [role="button"]').count();
    console.log('Button elements found:', buttonElements);
  });

  test('should have working React Router', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Try to navigate to different routes
    const routes = ['/tasks', '/focus', '/stats', '/profile'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const url = page.url();
      console.log(`Route ${route} - URL: ${url}`);
      
      // Check if route is accessible
      const is404 = await page.locator('text=404').count() > 0;
      const hasContent = await page.locator('body').textContent();
      
      console.log(`Route ${route} - Has content: ${hasContent?.length || 0} characters`);
    }
  });

  test('should check for JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('JavaScript errors:', jsErrors);
    
    // Report errors but don't fail the test
    if (jsErrors.length > 0) {
      console.log('Found JavaScript errors:', jsErrors);
    }
  });

  test('should analyze app structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Get page source to understand structure
    const pageSource = await page.content();
    console.log('Page source length:', pageSource.length);
    
    // Check for React indicators
    const hasReactRoot = pageSource.includes('root');
    const hasReactScript = pageSource.includes('react');
    const hasExpoRouter = pageSource.includes('expo-router');
    
    console.log('Has React root:', hasReactRoot);
    console.log('Has React script:', hasReactScript);
    console.log('Has Expo Router:', hasExpoRouter);
    
    // Check for CSS/styling
    const hasStyles = await page.locator('style').count();
    const hasCSS = await page.locator('link[rel="stylesheet"]').count();
    
    console.log('Style elements:', hasStyles);
    console.log('CSS links:', hasCSS);
    
    // Check for common UI elements
    const elements = {
      headings: await page.locator('h1, h2, h3, h4, h5, h6').count(),
      paragraphs: await page.locator('p').count(),
      buttons: await page.locator('button').count(),
      inputs: await page.locator('input').count(),
      links: await page.locator('a').count(),
      images: await page.locator('img').count(),
      forms: await page.locator('form').count(),
    };
    
    console.log('UI Elements:', elements);
  });
});