import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for FocusFlow E2E tests');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend server...');
    await page.waitForLoadState('networkidle');
    
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend server...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if the app is properly loaded
    const title = await page.title();
    console.log(`✅ App loaded successfully with title: ${title}`);
    
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('🧹 Cleared browser storage');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;