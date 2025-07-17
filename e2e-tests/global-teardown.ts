import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * This runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for FocusFlow E2E tests');
  
  // Clean up any global resources
  // For example, you might want to clean up test data, stop services, etc.
  
  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;