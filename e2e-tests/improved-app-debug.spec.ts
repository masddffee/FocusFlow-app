import { test, expect } from '@playwright/test';

/**
 * Improved App Debug Tests for FocusFlow
 * Deep analysis of application issues and debugging
 */

test.describe('App Debug Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console logs and errors
    const logs: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // Store in page context for access in tests
    (page as any).testLogs = logs;
    (page as any).testErrors = errors;
  });

  test('should analyze React bundle loading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if React bundle is loaded
    const bundleScript = await page.locator('script[src*="entry.bundle"]').count();
    console.log('Bundle script elements:', bundleScript);
    
    // Check if React is available globally
    const reactExists = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             (window as any).React !== undefined;
    });
    console.log('React globally available:', reactExists);
    
    // Check if Expo modules are loaded
    const expoExists = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             (window as any).expo !== undefined;
    });
    console.log('Expo modules available:', expoExists);
    
    // Check Metro require function
    const metroRequire = await page.evaluate(() => {
      return typeof (window as any).__r === 'function';
    });
    console.log('Metro require function available:', metroRequire);
  });

  test('should analyze font loading issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for font loading errors
    const fontErrors = (page as any).testErrors.filter((error: string) => 
      error.includes('font') || error.includes('Font')
    );
    
    console.log('Font-related errors:', fontErrors);
    
    // Check if fonts are loaded
    const fontFaces = await page.evaluate(() => {
      return document.fonts ? document.fonts.size : 0;
    });
    console.log('Font faces loaded:', fontFaces);
    
    // Check FontAwesome availability
    const fontAwesome = await page.evaluate(() => {
      return typeof (window as any).FontAwesome !== 'undefined';
    });
    console.log('FontAwesome available:', fontAwesome);
  });

  test('should analyze splash screen behavior', async ({ page }) => {
    await page.goto('/');
    
    // Check initial DOM state
    const initialContent = await page.locator('body').innerHTML();
    console.log('Initial body content length:', initialContent.length);
    
    // Wait for potential splash screen changes
    await page.waitForTimeout(3000);
    
    // Check if splash screen is hiding
    const splashScreen = await page.locator('[data-testid="splash-screen"]').count();
    console.log('Splash screen elements:', splashScreen);
    
    // Check if app content appears
    const appContent = await page.locator('#root').innerHTML();
    console.log('App root content length:', appContent.length);
    
    // Check for expo-splash-screen module
    const splashModule = await page.evaluate(() => {
      return typeof (window as any).ExpoSplashScreen !== 'undefined';
    });
    console.log('Expo splash screen module available:', splashModule);
  });

  test('should analyze React component mounting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check React root mounting
    const reactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        hasChildren: root ? root.children.length > 0 : false,
        innerHTML: root ? root.innerHTML.substring(0, 200) : '',
        childNodes: root ? root.childNodes.length : 0
      };
    });
    
    console.log('React root analysis:', reactRoot);
    
    // Check for React rendering errors
    const reactErrors = (page as any).testErrors.filter((error: string) => 
      error.includes('React') || error.includes('render') || error.includes('component')
    );
    
    console.log('React-related errors:', reactErrors);
    
    // Check for component lifecycle
    const componentMounted = await page.evaluate(() => {
      // Check if any React components are mounted
      const root = document.getElementById('root');
      if (!root) return false;
      
      // Look for common React patterns
      const hasReactElements = root.querySelector('[data-reactroot]') !== null ||
                              root.querySelector('[data-react-checksum]') !== null ||
                              root.innerHTML.includes('react') ||
                              root.children.length > 0;
      
      return hasReactElements;
    });
    
    console.log('React components mounted:', componentMounted);
  });

  test('should analyze JavaScript execution flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all console logs
    const allLogs = (page as any).testLogs;
    console.log('All console logs:', allLogs);
    
    // Get all errors
    const allErrors = (page as any).testErrors;
    console.log('All JavaScript errors:', allErrors);
    
    // Check for specific error patterns
    const undefinedErrors = allErrors.filter((error: string) => 
      error.includes('undefined') || error.includes('Cannot read properties')
    );
    console.log('Undefined-related errors:', undefinedErrors);
    
    // Check module loading
    const moduleErrors = allErrors.filter((error: string) => 
      error.includes('module') || error.includes('import') || error.includes('require')
    );
    console.log('Module loading errors:', moduleErrors);
  });

  test('should analyze network requests', async ({ page }) => {
    const requests: string[] = [];
    const responses: string[] = [];
    
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      responses.push(`${response.status()} ${response.url()}`);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('Network requests:', requests);
    console.log('Network responses:', responses);
    
    // Check for failed requests
    const failedRequests = responses.filter(response => 
      response.startsWith('4') || response.startsWith('5')
    );
    console.log('Failed requests:', failedRequests);
    
    // Check bundle loading
    const bundleRequests = requests.filter(request => 
      request.includes('bundle') || request.includes('.js')
    );
    console.log('Bundle requests:', bundleRequests);
  });

  test('should analyze development vs production behavior', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check development mode
    const isDevelopment = await page.evaluate(() => {
      return (window as any).__DEV__ === true;
    });
    console.log('Development mode:', isDevelopment);
    
    // Check Metro bundler
    const metroInfo = await page.evaluate(() => {
      return {
        bundleStartTime: (window as any).__BUNDLE_START_TIME__,
        devMode: (window as any).__DEV__,
        metroPrefix: (window as any).__METRO_GLOBAL_PREFIX__
      };
    });
    console.log('Metro bundler info:', metroInfo);
    
    // Check for HMR (Hot Module Replacement)
    const hmrExists = await page.evaluate(() => {
      return typeof (window as any).__webpack_hot_reload__ !== 'undefined' ||
             typeof (window as any).module !== 'undefined' ||
             typeof (window as any).$RefreshReg$ !== 'undefined';
    });
    console.log('HMR available:', hmrExists);
  });

  test('should provide fix recommendations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const allErrors = (page as any).testErrors;
    const allLogs = (page as any).testLogs;
    
    // Analyze primary issues
    const hasUndefinedError = allErrors.some((error: string) => 
      error.includes('Cannot read properties of undefined')
    );
    
    const hasFontError = allErrors.some((error: string) => 
      error.includes('font') || error.includes('Font')
    );
    
    const hasModuleError = allErrors.some((error: string) => 
      error.includes('module') || error.includes('import')
    );
    
    const hasReactError = allErrors.some((error: string) => 
      error.includes('React') || error.includes('render')
    );
    
    // Generate recommendations
    const recommendations = [];
    
    if (hasUndefinedError) {
      recommendations.push('Fix undefined property access - likely module import issue');
    }
    
    if (hasFontError) {
      recommendations.push('Add font loading error handling or remove font dependencies');
    }
    
    if (hasModuleError) {
      recommendations.push('Check module imports and dependencies');
    }
    
    if (hasReactError) {
      recommendations.push('Add React error boundaries and proper error handling');
    }
    
    if (allErrors.length === 0) {
      recommendations.push('No JavaScript errors found - issue may be in rendering or timing');
    }
    
    console.log('Recommendations:', recommendations);
    
    // Check if app is actually working
    const reactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    
    if (!reactRoot) {
      recommendations.push('React root is empty - check component mounting and initialization');
    }
    
    console.log('Final recommendations:', recommendations);
  });
});