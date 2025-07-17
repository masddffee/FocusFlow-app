# Playwright MCP Setup Guide for FocusFlow

## Overview

This guide explains how to set up and use Playwright MCP (Model Context Protocol) for automated testing in the FocusFlow application. Playwright MCP provides AI-powered browser automation capabilities that enable intelligent testing workflows.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Tests](#running-tests)
5. [Test Structure](#test-structure)
6. [MCP Server](#mcp-server)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Prerequisites

- Node.js 18 or later
- npm or yarn package manager
- FocusFlow project setup completed
- Basic understanding of Playwright testing

## Installation

### 1. Install Dependencies

The Playwright MCP dependencies are already included in the project. If you need to install them manually:

```bash
npm install --save-dev @playwright/test @playwright/mcp playwright @types/jest
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Install MCP Server

```bash
npm run mcp:install
```

## Configuration

### Playwright Configuration

The main Playwright configuration is in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  webServer: [
    {
      command: 'npm run backend',
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run web',
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### MCP Server Configuration

The MCP server configuration is in `playwright-mcp.config.json`:

```json
{
  "name": "FocusFlow MCP Server",
  "server": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  },
  "browser": {
    "type": "chromium",
    "headless": false,
    "timeout": 30000
  },
  "permissions": {
    "allowedOrigins": [
      "http://localhost:8080",
      "https://localhost:8080"
    ]
  },
  "capabilities": {
    "tabs": true,
    "pdf": true,
    "history": true,
    "wait": true
  }
}
```

## Running Tests

### Basic Test Commands

```bash
# Run all E2E tests
npm run e2e

# Run tests in headed mode (visible browser)
npm run e2e:headed

# Run tests in debug mode
npm run e2e:debug

# Run tests with UI mode
npm run e2e:ui

# Show test report
npm run e2e:report
```

### Running Specific Tests

```bash
# Run specific test file
npx playwright test navigation.spec.ts

# Run tests matching a pattern
npx playwright test --grep "navigation"

# Run tests on specific browser
npx playwright test --project=chromium-desktop
```

### Running with MCP Server

```bash
# Start MCP server
npm run mcp:start

# Run tests with MCP server (in another terminal)
npm run e2e
```

## Test Structure

### Directory Structure

```
e2e-tests/
├── pages/              # Page Object Models
│   ├── base-page.ts
│   ├── home-page.ts
│   ├── tasks-page.ts
│   └── focus-page.ts
├── fixtures/           # Test data and fixtures
│   └── test-data.ts
├── utils/              # Test utilities
│   └── test-helpers.ts
├── *.spec.ts          # Test files
├── global-setup.ts    # Global setup
└── global-teardown.ts # Global teardown
```

### Test Categories

1. **Navigation Tests** (`navigation.spec.ts`)
   - Tab navigation
   - URL routing
   - Back/forward navigation
   - Deep linking

2. **Task Management Tests** (`tasks.spec.ts`)
   - CRUD operations
   - Task filtering and sorting
   - Subtask management
   - AI integration

3. **Focus Timer Tests** (`focus-timer.spec.ts`)
   - Timer functionality
   - Session management
   - Break handling
   - Progress tracking

4. **Internationalization Tests** (`internationalization.spec.ts`)
   - Language switching
   - Content localization
   - Cultural formatting

### Page Object Model Example

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get selectors() {
    return {
      welcomeMessage: '[data-testid="welcome-message"]',
      addTaskButton: '[data-testid="add-task-button"]',
      taskList: '[data-testid="task-list"]',
    };
  }

  async clickAddTask() {
    await this.click(this.selectors.addTaskButton);
  }

  async getWelcomeMessage(): Promise<string> {
    return await this.getText(this.selectors.welcomeMessage);
  }
}
```

## MCP Server

### Starting the MCP Server

```bash
# Start MCP server manually
npm run mcp:start

# Check MCP server status
npm run mcp:config
```

### MCP Server Features

- **Browser Automation**: Control browsers through accessibility tree
- **AI-Powered Testing**: Intelligent test generation and execution
- **Multi-tab Support**: Handle multiple browser tabs
- **File Operations**: Download and upload file handling
- **Network Interception**: Mock API responses

### MCP Server Endpoints

- Health Check: `http://localhost:8081/health`
- Status: `http://localhost:8081/status`
- Configuration: `http://localhost:8081/config`

## CI/CD Integration

### GitHub Actions Workflows

#### E2E Tests Workflow (`.github/workflows/e2e-tests.yml`)

```yaml
name: E2E Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e --project=${{ matrix.browser }}
```

#### MCP Server Workflow (`.github/workflows/playwright-mcp.yml`)

Dedicated workflow for MCP server testing including:
- Server setup and configuration
- Integration tests
- Performance tests
- Security tests
- Cross-platform compatibility

### Environment Variables

```bash
# Testing environment
NODE_ENV=test
PLAYWRIGHT_TEST=true

# MCP server configuration
PLAYWRIGHT_MCP_PORT=8081
PLAYWRIGHT_MCP_HOST=localhost
PLAYWRIGHT_MCP_ENABLED=true

# CI/CD specific
CI=true
PLAYWRIGHT_PERFORMANCE_TESTING=true
```

## Troubleshooting

### Common Issues

#### 1. MCP Server Won't Start

```bash
# Check if port is in use
lsof -i :8081

# Kill existing processes
pkill -f "playwright-mcp"

# Restart MCP server
npm run mcp:start
```

#### 2. Tests Fail in CI but Pass Locally

```bash
# Run tests in CI mode locally
CI=true npm run e2e

# Check for timing issues
npm run e2e:debug
```

#### 3. Browser Installation Issues

```bash
# Reinstall browsers
npx playwright install --force

# Install system dependencies
npx playwright install-deps
```

#### 4. Test Timeouts

```bash
# Increase timeout in playwright.config.ts
timeout: 60000, // 60 seconds

# Or use environment variable
PLAYWRIGHT_TIMEOUT=60000 npm run e2e
```

### Debug Mode

```bash
# Run single test in debug mode
npx playwright test --debug navigation.spec.ts

# Run with verbose output
npx playwright test --reporter=verbose

# Generate trace
npx playwright test --trace=on
```

### Log Analysis

```bash
# View test results
npm run e2e:report

# Check logs
tail -f test-results/results.log

# Analyze failures
npx playwright show-report
```

## Best Practices

### 1. Test Organization

- Use Page Object Model pattern
- Group related tests in describe blocks
- Keep tests independent and atomic
- Use descriptive test names

### 2. Test Data Management

- Use fixtures for test data
- Clean up data after tests
- Avoid hard-coded values
- Use environment-specific data

### 3. Assertions

- Use specific assertions
- Assert on multiple conditions
- Include meaningful error messages
- Test both positive and negative cases

### 4. Performance

- Run tests in parallel when possible
- Use headless mode for CI
- Optimize test execution time
- Monitor resource usage

### 5. Maintenance

- Keep tests simple and readable
- Regular test review and cleanup
- Update selectors when UI changes
- Monitor test stability

### 6. MCP Server Usage

- Start MCP server before tests
- Handle server failures gracefully
- Monitor server performance
- Use appropriate timeouts

## Advanced Features

### Custom Test Utilities

```typescript
// Custom test helper
export class TestHelpers {
  constructor(private page: Page) {}

  async waitForApiResponse(urlPattern: string) {
    return await this.page.waitForResponse(
      response => response.url().includes(urlPattern)
    );
  }

  async mockApiResponse(url: string, response: any) {
    await this.page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }
}
```

### Test Fixtures

```typescript
// Test fixture
export const testTasks = {
  simple: {
    title: 'Simple Test Task',
    description: 'A basic task for testing',
    priority: 'medium',
  },
  complex: {
    title: 'Complex Task',
    description: 'Task with subtasks',
    priority: 'high',
    subtasks: ['Step 1', 'Step 2', 'Step 3'],
  },
};
```

### Visual Testing

```typescript
// Visual regression test
test('homepage visual test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

## Support

For issues and questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review test logs and reports
3. Consult Playwright documentation
4. Check MCP server status
5. Create an issue in the project repository

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Integration Guide](https://playwright.dev/docs/ci)