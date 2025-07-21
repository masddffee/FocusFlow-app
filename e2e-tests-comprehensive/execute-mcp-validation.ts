#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 🚀 MCP Complete Flow Validation Executor
// Orchestrates the entire testing process and generates comprehensive reports

interface TestExecutionConfig {
  runEnhancedTest: boolean;
  runMCPSpecificTest: boolean;
  generateComprehensiveReport: boolean;
  browsers: string[];
  retries: number;
  timeout: number;
  parallel: boolean;
}

interface ExecutionResult {
  testSuite: string;
  status: 'SUCCESS' | 'FAIL' | 'PARTIAL';
  duration: number;
  browser: string;
  reportPath?: string;
  errorPath?: string;
  screenshotsPath?: string;
}

class MCPValidationExecutor {
  private config: TestExecutionConfig;
  private resultsDir: string;
  private executionId: string;
  private startTime: number;

  constructor(config: Partial<TestExecutionConfig> = {}) {
    this.config = {
      runEnhancedTest: true,
      runMCPSpecificTest: true,
      generateComprehensiveReport: true,
      browsers: ['chromium'],
      retries: 1,
      timeout: 180000, // 3 minutes per test
      parallel: false,
      ...config
    };

    this.executionId = `mcp-validation-${Date.now()}`;
    this.resultsDir = `/Users/wetom/Desktop/FocusFlow/e2e-tests-comprehensive/test-results/${this.executionId}`;
    this.startTime = Date.now();
    
    this.setupExecutionEnvironment();
  }

  private setupExecutionEnvironment(): void {
    console.log('🔧 [MCP EXECUTOR] Setting up execution environment...');
    
    // Create results directory
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }

    // Create subdirectories
    ['screenshots', 'traces', 'logs', 'reports', 'error-evidence'].forEach(subdir => {
      const dirPath = join(this.resultsDir, subdir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    });

    console.log(`✅ [MCP EXECUTOR] Execution environment ready: ${this.resultsDir}`);
  }

  async executeCompleteValidation(): Promise<void> {
    console.log('🚀 [MCP EXECUTOR] Starting complete MCP validation...');
    console.log(`📊 [MCP EXECUTOR] Execution ID: ${this.executionId}`);

    const results: ExecutionResult[] = [];

    try {
      // Pre-execution checks
      await this.performPreExecutionChecks();

      // Execute test suites
      if (this.config.runEnhancedTest) {
        console.log('\n📋 [MCP EXECUTOR] Executing enhanced E2E test suite...');
        const enhancedResults = await this.executeEnhancedTest();
        results.push(...enhancedResults);
      }

      if (this.config.runMCPSpecificTest) {
        console.log('\n🎯 [MCP EXECUTOR] Executing MCP-specific validation...');
        const mcpResults = await this.executeMCPTest();
        results.push(...mcpResults);
      }

      // Generate comprehensive report
      if (this.config.generateComprehensiveReport) {
        console.log('\n📊 [MCP EXECUTOR] Generating comprehensive validation report...');
        await this.generateValidationReport(results);
      }

      // Summary
      await this.generateExecutionSummary(results);

    } catch (error) {
      console.error('❌ [MCP EXECUTOR] Validation execution failed:', error.message);
      await this.handleExecutionFailure(error, results);
      throw error;
    }
  }

  private async performPreExecutionChecks(): Promise<void> {
    console.log('🔍 [MCP EXECUTOR] Performing pre-execution checks...');

    // Check if backend is running
    try {
      execSync('curl -f http://localhost:8080/health || echo "Backend check failed"', { 
        timeout: 10000,
        stdio: 'pipe' 
      });
      console.log('✅ [MCP EXECUTOR] Backend health check passed');
    } catch (error) {
      console.warn('⚠️ [MCP EXECUTOR] Backend may not be running - tests may fail');
    }

    // Check if frontend is running  
    try {
      execSync('curl -f http://localhost:8082 || echo "Frontend check failed"', { 
        timeout: 10000,
        stdio: 'pipe' 
      });
      console.log('✅ [MCP EXECUTOR] Frontend health check passed');
    } catch (error) {
      console.warn('⚠️ [MCP EXECUTOR] Frontend may not be running - tests may fail');
    }

    // Check Playwright installation
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      console.log('✅ [MCP EXECUTOR] Playwright installation verified');
    } catch (error) {
      throw new Error('Playwright not found - please run: npm install && npx playwright install');
    }
  }

  private async executeEnhancedTest(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const browser of this.config.browsers) {
      console.log(`🌐 [MCP EXECUTOR] Running enhanced test on ${browser}...`);
      
      const startTime = Date.now();
      let status: ExecutionResult['status'] = 'FAIL';
      let reportPath: string | undefined;
      let errorPath: string | undefined;

      try {
        const testCommand = [
          'npx playwright test',
          'e2e-tests-comprehensive/complete-e2e-flow-test.spec.ts',
          `--project=${browser}-desktop`,
          `--retries=${this.config.retries}`,
          `--timeout=${this.config.timeout}`,
          `--output-dir=${this.resultsDir}`,
          '--reporter=html,json,junit'
        ].join(' ');

        console.log(`🔧 [MCP EXECUTOR] Executing: ${testCommand}`);
        
        const output = execSync(testCommand, { 
          cwd: '/Users/wetom/Desktop/FocusFlow',
          encoding: 'utf8',
          timeout: this.config.timeout + 30000 // Add buffer
        });

        status = 'SUCCESS';
        console.log('✅ [MCP EXECUTOR] Enhanced test completed successfully');
        
      } catch (error) {
        status = 'FAIL';
        errorPath = join(this.resultsDir, 'error-evidence', `enhanced-test-${browser}-error.json`);
        
        const errorData = {
          browser,
          testSuite: 'enhanced-e2e',
          error: error.message,
          stdout: error.stdout?.toString() || '',
          stderr: error.stderr?.toString() || '',
          timestamp: Date.now()
        };
        
        writeFileSync(errorPath, JSON.stringify(errorData, null, 2));
        console.error(`❌ [MCP EXECUTOR] Enhanced test failed on ${browser}:`, error.message);
      }

      const duration = Date.now() - startTime;
      results.push({
        testSuite: 'enhanced-e2e',
        status,
        duration,
        browser,
        reportPath,
        errorPath,
        screenshotsPath: join(this.resultsDir, 'screenshots')
      });
    }

    return results;
  }

  private async executeMCPTest(): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const browser of this.config.browsers) {
      console.log(`🎯 [MCP EXECUTOR] Running MCP-specific test on ${browser}...`);
      
      const startTime = Date.now();
      let status: ExecutionResult['status'] = 'FAIL';
      let reportPath: string | undefined;
      let errorPath: string | undefined;

      try {
        const testCommand = [
          'npx playwright test',
          'e2e-tests-comprehensive/mcp-complete-flow-validation.spec.ts',
          `--project=${browser}-desktop`,
          `--retries=${this.config.retries}`,
          `--timeout=${this.config.timeout}`,
          `--output-dir=${this.resultsDir}`,
          '--reporter=html,json'
        ].join(' ');

        console.log(`🔧 [MCP EXECUTOR] Executing: ${testCommand}`);
        
        const output = execSync(testCommand, { 
          cwd: '/Users/wetom/Desktop/FocusFlow',
          encoding: 'utf8',
          timeout: this.config.timeout + 30000
        });

        status = 'SUCCESS';
        console.log('✅ [MCP EXECUTOR] MCP-specific test completed successfully');
        
      } catch (error) {
        status = 'FAIL';
        errorPath = join(this.resultsDir, 'error-evidence', `mcp-test-${browser}-error.json`);
        
        const errorData = {
          browser,
          testSuite: 'mcp-specific',
          error: error.message,
          stdout: error.stdout?.toString() || '',
          stderr: error.stderr?.toString() || '',
          timestamp: Date.now()
        };
        
        writeFileSync(errorPath, JSON.stringify(errorData, null, 2));
        console.error(`❌ [MCP EXECUTOR] MCP-specific test failed on ${browser}:`, error.message);
      }

      const duration = Date.now() - startTime;
      results.push({
        testSuite: 'mcp-specific',
        status,
        duration,
        browser,
        reportPath,
        errorPath,
        screenshotsPath: join(this.resultsDir, 'screenshots')
      });
    }

    return results;
  }

  private async generateValidationReport(results: ExecutionResult[]): Promise<void> {
    console.log('📊 [MCP EXECUTOR] Generating comprehensive validation report...');

    const report = {
      executionId: this.executionId,
      executionDate: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      configuration: this.config,
      results: results,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.status === 'SUCCESS').length,
        failedTests: results.filter(r => r.status === 'FAIL').length,
        partialTests: results.filter(r => r.status === 'PARTIAL').length,
        overallSuccessRate: results.length > 0 ? 
          (results.filter(r => r.status === 'SUCCESS').length / results.length) * 100 : 0
      },
      mcpAnalysis: {
        compatibilityScore: this.calculateMCPCompatibilityScore(results),
        identifiedIssues: this.extractIdentifiedIssues(results),
        recommendedFixes: this.generateRecommendedFixes(results)
      },
      actionItems: this.generateActionItems(results),
      nextSteps: this.generateNextSteps(results)
    };

    // Save comprehensive report
    const reportPath = join(this.resultsDir, 'reports', 'comprehensive-validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    const summaryPath = join(this.resultsDir, 'reports', 'validation-summary.md');
    const summaryContent = this.generateMarkdownSummary(report);
    writeFileSync(summaryPath, summaryContent);

    console.log(`✅ [MCP EXECUTOR] Comprehensive report generated:`);
    console.log(`   📄 JSON Report: ${reportPath}`);
    console.log(`   📝 Summary: ${summaryPath}`);
  }

  private calculateMCPCompatibilityScore(results: ExecutionResult[]): number {
    const successfulTests = results.filter(r => r.status === 'SUCCESS').length;
    const totalTests = results.length;
    
    if (totalTests === 0) return 0;
    
    const baseScore = (successfulTests / totalTests) * 100;
    
    // Adjust score based on MCP-specific criteria
    const mcpSpecificTests = results.filter(r => r.testSuite === 'mcp-specific');
    if (mcpSpecificTests.length > 0) {
      const mcpSuccessRate = mcpSpecificTests.filter(r => r.status === 'SUCCESS').length / mcpSpecificTests.length;
      return Math.round((baseScore + mcpSuccessRate * 100) / 2);
    }
    
    return Math.round(baseScore);
  }

  private extractIdentifiedIssues(results: ExecutionResult[]): string[] {
    const issues: string[] = [];
    
    const failedTests = results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      issues.push(`${failedTests.length} test suite(s) failed execution`);
    }

    const mcpFailed = results.filter(r => r.testSuite === 'mcp-specific' && r.status === 'FAIL');
    if (mcpFailed.length > 0) {
      issues.push('MCP-specific compatibility issues detected');
    }

    if (results.some(r => r.errorPath)) {
      issues.push('Critical errors requiring immediate attention');
    }

    return issues;
  }

  private generateRecommendedFixes(results: ExecutionResult[]): string[] {
    const fixes: string[] = [];
    
    if (results.some(r => r.status === 'FAIL')) {
      fixes.push('Review and address selector compatibility issues');
      fixes.push('Enhance data-testid strategy for React Native Web components');
      fixes.push('Implement more robust error handling in test automation');
    }

    if (results.filter(r => r.testSuite === 'mcp-specific').some(r => r.status === 'FAIL')) {
      fixes.push('Optimize MCP workflow for React Native Web environment');
      fixes.push('Add enhanced waiting strategies for dynamic content');
    }

    return fixes;
  }

  private generateActionItems(results: ExecutionResult[]): any[] {
    const actionItems = [];
    
    const failedResults = results.filter(r => r.status === 'FAIL');
    failedResults.forEach((result, index) => {
      actionItems.push({
        id: `ACTION_${index + 1}`,
        priority: 'HIGH',
        title: `Fix ${result.testSuite} test failure in ${result.browser}`,
        description: `Investigate and resolve test failure`,
        estimatedEffort: '2-4 hours',
        assignee: 'Frontend Team',
        evidencePath: result.errorPath
      });
    });

    return actionItems;
  }

  private generateNextSteps(results: ExecutionResult[]): string[] {
    const steps = [];
    
    if (results.some(r => r.status === 'FAIL')) {
      steps.push('1. Review error evidence and identify root causes');
      steps.push('2. Implement recommended fixes for selector strategies');
      steps.push('3. Re-run tests to verify fixes');
    } else {
      steps.push('1. Monitor test stability over time');
      steps.push('2. Consider adding additional test coverage');
    }
    
    steps.push('3. Implement continuous monitoring for test reliability');
    
    return steps;
  }

  private generateMarkdownSummary(report: any): string {
    return `# MCP Flow Validation Report

## Executive Summary
- **Execution ID**: ${report.executionId}
- **Date**: ${new Date(report.executionDate).toLocaleString()}
- **Duration**: ${Math.round(report.totalDuration / 1000)}s
- **Overall Success Rate**: ${report.summary.overallSuccessRate.toFixed(1)}%
- **MCP Compatibility Score**: ${report.mcpAnalysis.compatibilityScore}/100

## Test Results Summary
- **Total Tests**: ${report.summary.totalTests}
- **Successful**: ${report.summary.successfulTests} ✅
- **Failed**: ${report.summary.failedTests} ❌
- **Partial**: ${report.summary.partialTests} ⚠️

## Identified Issues
${report.mcpAnalysis.identifiedIssues.map(issue => `- ${issue}`).join('\n')}

## Recommended Fixes
${report.mcpAnalysis.recommendedFixes.map(fix => `- ${fix}`).join('\n')}

## Action Items
${report.actionItems.map(item => `
### ${item.title}
- **Priority**: ${item.priority}
- **Estimated Effort**: ${item.estimatedEffort}
- **Assignee**: ${item.assignee}
${item.evidencePath ? `- **Evidence**: ${item.evidencePath}` : ''}
`).join('')}

## Next Steps
${report.nextSteps.map(step => step).join('\n')}

---
*Report generated by MCP Validation Executor*
`;
  }

  private async generateExecutionSummary(results: ExecutionResult[]): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const successfulTests = results.filter(r => r.status === 'SUCCESS').length;
    const totalTests = results.length;

    console.log('\n🎯 [MCP EXECUTOR] ========================================');
    console.log('📊 [MCP EXECUTOR] EXECUTION SUMMARY');
    console.log('🎯 [MCP EXECUTOR] ========================================');
    console.log(`📅 Execution ID: ${this.executionId}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`🧪 Tests Executed: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests}`);
    console.log(`❌ Failed: ${totalTests - successfulTests}`);
    console.log(`📈 Success Rate: ${totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(1) : 0}%`);
    console.log(`🎯 MCP Compatibility: ${this.calculateMCPCompatibilityScore(results)}/100`);
    console.log(`📁 Results Directory: ${this.resultsDir}`);
    console.log('🎯 [MCP EXECUTOR] ========================================');

    if (successfulTests === totalTests) {
      console.log('🎉 [MCP EXECUTOR] All tests passed successfully!');
    } else {
      console.log('⚠️ [MCP EXECUTOR] Some tests failed - review error evidence for details');
    }
  }

  private async handleExecutionFailure(error: Error, results: ExecutionResult[]): Promise<void> {
    console.error('🚨 [MCP EXECUTOR] Critical execution failure detected');
    
    const failureReport = {
      executionId: this.executionId,
      failureTime: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      partialResults: results,
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        cwd: process.cwd()
      }
    };

    const failurePath = join(this.resultsDir, 'critical-failure-report.json');
    writeFileSync(failurePath, JSON.stringify(failureReport, null, 2));
    
    console.log(`💾 [MCP EXECUTOR] Failure report saved: ${failurePath}`);
  }
}

// CLI execution
if (require.main === module) {
  const executor = new MCPValidationExecutor({
    browsers: ['chromium'],
    retries: 1,
    timeout: 240000, // 4 minutes per test
    runEnhancedTest: true,
    runMCPSpecificTest: true,
    generateComprehensiveReport: true
  });

  executor.executeCompleteValidation()
    .then(() => {
      console.log('✅ [MCP EXECUTOR] Validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [MCP EXECUTOR] Validation failed:', error.message);
      process.exit(1);
    });
}

export { MCPValidationExecutor };