# FocusFlow Testing Guide

## Overview

This guide provides comprehensive information about testing in the FocusFlow application, including unit tests, integration tests, and end-to-end (E2E) tests using Playwright MCP.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types](#test-types)
3. [Test Environment Setup](#test-environment-setup)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Data Management](#test-data-management)
7. [Continuous Integration](#continuous-integration)
8. [Debugging Tests](#debugging-tests)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \     <- Few, High-level, Slow
     /______\
    /        \
   /Integration\ <- More, Medium-level, Medium
  /____________\
 /              \
/  Unit Tests    \  <- Many, Low-level, Fast
/__________________\
```

### Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Core functionality and user journeys
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and authorization

## Test Types

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation

**Tools**: Jest, React Testing Library

**Location**: `__tests__/` directory

**Example**:
```typescript
// __tests__/i18n.test.ts
describe('i18n System', () => {
  it('should change language successfully', async () => {
    await i18n.changeLanguage('zh');
    expect(i18n.language).toBe('zh');
  });
});
```

### 2. Integration Tests

**Purpose**: Test interaction between components and services

**Tools**: Jest, Supertest (for API testing)

**Location**: `__tests__/integration/`

**Example**:
```typescript
// __tests__/integration/api.test.ts
describe('API Integration', () => {
  it('should create task via API', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send(testTask);
    expect(response.status).toBe(201);
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows

**Tools**: Playwright with MCP server

**Location**: `e2e-tests/`

**Example**:
```typescript
// e2e-tests/tasks.spec.ts
test('should create and complete task', async ({ page }) => {
  const tasksPage = new TasksPage(page);
  await tasksPage.createTask(testTask);
  await tasksPage.completeTask(0);
  await tasksPage.assertTaskCompleted(0);
});
```

## Test Environment Setup

### Prerequisites

1. **Node.js**: Version 18 or later
2. **Dependencies**: Install all project dependencies
3. **Environment**: Set up test environment variables
4. **Browsers**: Install Playwright browsers

### Setup Steps

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Set up environment variables
cp .env.example .env.test

# Start test servers
npm run dev
```

### Environment Variables

```bash
# .env.test
NODE_ENV=test
PLAYWRIGHT_TEST=true
PLAYWRIGHT_MCP_PORT=8081
PLAYWRIGHT_MCP_HOST=localhost
API_BASE_URL=http://localhost:8080
```

## Running Tests

### Command Reference

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm test

# Run E2E tests only
npm run e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- i18n.test.ts
npx playwright test tasks.spec.ts

# Run tests with specific pattern
npm test -- --grep "language"
npx playwright test --grep "navigation"
```

### Test Execution Options

```bash
# Headless mode (default)
npm run e2e

# Headed mode (visible browser)
npm run e2e:headed

# Debug mode
npm run e2e:debug

# UI mode
npm run e2e:ui

# Specific browser
npx playwright test --project=chromium-desktop
```

## Writing Tests

### Test Structure

```typescript
// Standard test structure
import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  });
});
```

### Page Object Model

```typescript
// pages/home-page.ts
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get selectors() {
    return {
      welcomeMessage: '[data-testid="welcome-message"]',
      addTaskButton: '[data-testid="add-task-button"]',
    };
  }

  async clickAddTask() {
    await this.click(this.selectors.addTaskButton);
  }

  async assertWelcomeMessage() {
    await this.assertElementVisible(this.selectors.welcomeMessage);
  }
}
```

### Test Data and Fixtures

```typescript
// fixtures/test-data.ts
export const testTasks = {
  simple: {
    title: 'Simple Test Task',
    description: 'A basic task for testing',
    priority: 'medium',
  },
  complex: {
    title: 'Complex Task',
    subtasks: ['Step 1', 'Step 2'],
    priority: 'high',
  },
};

// Using in tests
test('should create task', async ({ page }) => {
  const tasksPage = new TasksPage(page);
  await tasksPage.createTask(testTasks.simple);
  await tasksPage.assertTaskExists(testTasks.simple.title);
});
```

### Assertions and Expectations

```typescript
// Basic assertions
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeNull();
expect(value).toBeDefined();

// Playwright assertions
await expect(page.locator('text=Hello')).toBeVisible();
await expect(page).toHaveURL(/.*dashboard/);
await expect(page).toHaveTitle('FocusFlow');

// Custom assertions
await tasksPage.assertTaskCount(3);
await homePage.assertWelcomeMessage();
```

## Test Data Management

### Test Data Strategy

1. **Static Data**: Pre-defined test data for consistent testing
2. **Dynamic Data**: Generated data for specific test scenarios
3. **Fixtures**: Reusable test data sets
4. **Factories**: Generate test data programmatically

### Data Cleanup

```typescript
// Global setup
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

// Specific cleanup
test.afterEach(async ({ page }) => {
  // Clean up test data
  await page.evaluate(() => {
    localStorage.removeItem('test-data');
  });
});
```

### Mock Data

```typescript
// Mock API responses
test.beforeEach(async ({ page }) => {
  await page.route('**/api/tasks', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTasks),
    });
  });
});
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
```

### Test Reports

```bash
# Generate HTML report
npm run e2e:report

# Generate JUnit report
npx playwright test --reporter=junit

# Generate JSON report
npx playwright test --reporter=json
```

### Parallel Testing

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
});
```

## Debugging Tests

### Debug Tools

```bash
# Playwright Inspector
npx playwright test --debug

# VS Code extension
# Install "Playwright Test for VSCode"

# Browser DevTools
npx playwright test --headed

# Step-by-step debugging
npx playwright test --debug --headed
```

### Logging and Tracing

```typescript
// Enable tracing
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}

// Custom logging
console.log('Test checkpoint reached');
await page.screenshot({ path: 'debug.png' });
```

### Common Debug Scenarios

```typescript
// Wait for element
await page.waitForSelector('[data-testid="element"]');

// Check if element exists
const exists = await page.locator('[data-testid="element"]').count() > 0;

// Get element text
const text = await page.locator('[data-testid="element"]').textContent();

// Debug network requests
page.on('request', request => console.log(request.url()));
page.on('response', response => console.log(response.status()));
```

## Best Practices

### 1. Test Organization

- **Group related tests**: Use `describe` blocks
- **Descriptive names**: Clear test descriptions
- **Independent tests**: Tests should not depend on each other
- **Atomic tests**: One assertion per test when possible

### 2. Test Reliability

- **Wait for elements**: Use proper waiting strategies
- **Stable selectors**: Use `data-testid` attributes
- **Retry logic**: Handle flaky tests appropriately
- **Cleanup**: Clean up after tests

### 3. Performance

- **Parallel execution**: Run tests in parallel
- **Headless mode**: Use headless browsers in CI
- **Optimize selectors**: Use efficient locators
- **Minimize test data**: Use minimal required data

### 4. Maintenance

- **Regular updates**: Keep tests updated with UI changes
- **Code review**: Review test code like production code
- **Refactoring**: Improve test quality over time
- **Documentation**: Document complex test scenarios

### 5. Security Testing

```typescript
// Test authentication
test('should require authentication', async ({ page }) => {
  await page.goto('/protected-route');
  await expect(page).toHaveURL(/.*login/);
});

// Test authorization
test('should restrict access based on role', async ({ page }) => {
  await loginAs('user');
  await page.goto('/admin');
  await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
});
```

## Troubleshooting

### Common Issues

#### 1. Test Timeouts

```typescript
// Increase timeout
test.setTimeout(60000);

// Or in config
timeout: 60000,
```

#### 2. Element Not Found

```typescript
// Wait for element
await page.waitForSelector('[data-testid="element"]');

// Check if element exists
const exists = await page.locator('[data-testid="element"]').count() > 0;
```

#### 3. Flaky Tests

```typescript
// Add retry logic
test.describe.configure({ retries: 2 });

// Use stable selectors
await page.locator('[data-testid="stable-element"]').click();
```

#### 4. Network Issues

```typescript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Mock network requests
await page.route('**/api/**', route => route.fulfill({
  status: 200,
  body: JSON.stringify(mockData)
}));
```

### Debug Commands

```bash
# Run single test with debug
npx playwright test --debug test-name

# Show test trace
npx playwright show-trace trace.zip

# Generate test report
npx playwright test --reporter=html
```

## Test Metrics

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Performance Metrics

```typescript
// Measure test execution time
const startTime = Date.now();
await test.step('perform action', async () => {
  // Test logic
});
const endTime = Date.now();
console.log(`Test took ${endTime - startTime}ms`);
```

### Quality Metrics

- **Test Success Rate**: Percentage of passing tests
- **Test Execution Time**: Average time per test
- **Coverage**: Code coverage percentage
- **Flakiness**: Rate of inconsistent test results

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [E2E Testing Guide](https://playwright.dev/docs/best-practices)