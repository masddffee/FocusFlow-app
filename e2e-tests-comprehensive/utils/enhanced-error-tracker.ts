import { Page, BrowserContext } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// 🚨 Enhanced Error Tracking System for MCP Flow Validation
// Comprehensive error evidence collection and analysis

export interface ErrorEvidence {
  errorId: string;
  timestamp: number;
  phase: string;
  errorType: 'SELECTOR_FAILURE' | 'NETWORK_ERROR' | 'API_TIMEOUT' | 'RENDERING_ISSUE' | 'MCP_COMPATIBILITY' | 'UNKNOWN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  errorMessage: string;
  stackTrace?: string;
  screenshots: string[];
  domSnapshot: string;
  networkTrace: any[];
  consoleLogs: string[];
  performanceMetrics: any;
  reproductionSteps: string[];
  potentialCauses: string[];
  recommendedFixes: string[];
}

export interface ErrorTrackingConfig {
  captureScreenshots: boolean;
  captureDOMSnapshots: boolean;
  captureNetworkTraces: boolean;
  captureConsoleLogs: boolean;
  capturePerformanceMetrics: boolean;
  maxErrorHistory: number;
  evidenceRetentionDays: number;
}

export class EnhancedErrorTracker {
  private page: Page;
  private context: BrowserContext;
  private config: ErrorTrackingConfig;
  private errorHistory: ErrorEvidence[] = [];
  private networkTrace: any[] = [];
  private consoleLogs: string[] = [];
  private baseEvidenceDir: string;

  constructor(
    page: Page, 
    context: BrowserContext, 
    config: Partial<ErrorTrackingConfig> = {}
  ) {
    this.page = page;
    this.context = context;
    this.config = {
      captureScreenshots: true,
      captureDOMSnapshots: true,
      captureNetworkTraces: true,
      captureConsoleLogs: true,
      capturePerformanceMetrics: true,
      maxErrorHistory: 50,
      evidenceRetentionDays: 7,
      ...config
    };
    
    this.baseEvidenceDir = '/Users/wetom/Desktop/FocusFlow/e2e-tests-comprehensive/test-results/error-evidence';
    this.setupTracking();
  }

  private setupTracking(): void {
    // Ensure evidence directory exists
    if (!existsSync(this.baseEvidenceDir)) {
      mkdirSync(this.baseEvidenceDir, { recursive: true });
    }

    // Network monitoring
    if (this.config.captureNetworkTraces) {
      this.page.on('request', (request) => {
        this.networkTrace.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
      });

      this.page.on('response', async (response) => {
        try {
          const responseData = response.status() >= 400 ? 
            { error: `HTTP ${response.status()}`, statusText: response.statusText() } :
            await response.json().catch(() => ({ body: 'Non-JSON response' }));

          this.networkTrace.push({
            type: 'response',
            url: response.url(),
            status: response.status(),
            headers: response.headers(),
            data: responseData,
            timing: response.timing(),
            timestamp: Date.now()
          });
        } catch (error) {
          this.networkTrace.push({
            type: 'response_error',
            url: response.url(),
            error: error.message,
            timestamp: Date.now()
          });
        }
      });
    }

    // Console monitoring
    if (this.config.captureConsoleLogs) {
      this.page.on('console', (msg) => {
        const logEntry = `[${new Date().toISOString()}] ${msg.type()}: ${msg.text()}`;
        this.consoleLogs.push(logEntry);
      });

      this.page.on('pageerror', (error) => {
        const errorEntry = `[PAGE ERROR] ${error.message}\n${error.stack}`;
        this.consoleLogs.push(errorEntry);
      });
    }
  }

  async captureError(
    phase: string,
    error: Error,
    reproductionSteps: string[] = [],
    additionalContext: any = {}
  ): Promise<ErrorEvidence> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    console.log(`🚨 [ERROR TRACKER] Capturing error evidence for: ${errorId}`);

    // Analyze error type and severity
    const { errorType, severity, potentialCauses, recommendedFixes } = this.analyzeError(error, additionalContext);

    const evidence: ErrorEvidence = {
      errorId,
      timestamp,
      phase,
      errorType,
      severity,
      errorMessage: error.message,
      stackTrace: error.stack,
      screenshots: [],
      domSnapshot: '',
      networkTrace: [],
      consoleLogs: [],
      performanceMetrics: {},
      reproductionSteps,
      potentialCauses,
      recommendedFixes
    };

    // Create phase-specific evidence directory
    const phaseEvidenceDir = join(this.baseEvidenceDir, phase.toLowerCase().replace(/\s+/g, '-'));
    if (!existsSync(phaseEvidenceDir)) {
      mkdirSync(phaseEvidenceDir, { recursive: true });
    }

    // Capture screenshots
    if (this.config.captureScreenshots) {
      try {
        const screenshotPath = join(phaseEvidenceDir, `${errorId}_screenshot.png`);
        await this.page.screenshot({ 
          path: screenshotPath, 
          fullPage: true,
          timeout: 10000
        });
        evidence.screenshots.push(screenshotPath);

        // Capture element-specific screenshot if selector error
        if (errorType === 'SELECTOR_FAILURE') {
          const elementScreenshotPath = join(phaseEvidenceDir, `${errorId}_element_context.png`);
          await this.page.screenshot({ 
            path: elementScreenshotPath, 
            fullPage: false,
            timeout: 10000
          });
          evidence.screenshots.push(elementScreenshotPath);
        }

        console.log(`📸 [ERROR TRACKER] Screenshots captured: ${evidence.screenshots.length}`);
      } catch (screenshotError) {
        console.warn(`⚠️ [ERROR TRACKER] Screenshot capture failed: ${screenshotError.message}`);
      }
    }

    // Capture DOM snapshot
    if (this.config.captureDOMSnapshots) {
      try {
        const domContent = await this.page.content();
        const domSnapshotPath = join(phaseEvidenceDir, `${errorId}_dom_snapshot.html`);
        writeFileSync(domSnapshotPath, domContent);
        evidence.domSnapshot = domSnapshotPath;

        // Enhanced DOM analysis
        const domAnalysis = await this.analyzeDOMStructure();
        const domAnalysisPath = join(phaseEvidenceDir, `${errorId}_dom_analysis.json`);
        writeFileSync(domAnalysisPath, JSON.stringify(domAnalysis, null, 2));

        console.log(`🔍 [ERROR TRACKER] DOM snapshot and analysis captured`);
      } catch (domError) {
        console.warn(`⚠️ [ERROR TRACKER] DOM capture failed: ${domError.message}`);
      }
    }

    // Capture network trace
    if (this.config.captureNetworkTraces) {
      evidence.networkTrace = [...this.networkTrace];
      const networkTracePath = join(phaseEvidenceDir, `${errorId}_network_trace.json`);
      writeFileSync(networkTracePath, JSON.stringify(evidence.networkTrace, null, 2));
      console.log(`🌐 [ERROR TRACKER] Network trace captured: ${evidence.networkTrace.length} entries`);
    }

    // Capture console logs
    if (this.config.captureConsoleLogs) {
      evidence.consoleLogs = [...this.consoleLogs];
      const consoleLogsPath = join(phaseEvidenceDir, `${errorId}_console_logs.json`);
      writeFileSync(consoleLogsPath, JSON.stringify(evidence.consoleLogs, null, 2));
      console.log(`📋 [ERROR TRACKER] Console logs captured: ${evidence.consoleLogs.length} entries`);
    }

    // Capture performance metrics
    if (this.config.capturePerformanceMetrics) {
      try {
        evidence.performanceMetrics = await this.capturePerformanceMetrics();
        const metricsPath = join(phaseEvidenceDir, `${errorId}_performance_metrics.json`);
        writeFileSync(metricsPath, JSON.stringify(evidence.performanceMetrics, null, 2));
        console.log(`⚡ [ERROR TRACKER] Performance metrics captured`);
      } catch (metricsError) {
        console.warn(`⚠️ [ERROR TRACKER] Performance metrics capture failed: ${metricsError.message}`);
      }
    }

    // Save comprehensive error evidence
    const evidencePath = join(phaseEvidenceDir, `${errorId}_complete_evidence.json`);
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

    // Add to error history
    this.errorHistory.push(evidence);
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }

    console.log(`✅ [ERROR TRACKER] Error evidence captured successfully: ${errorId}`);
    return evidence;
  }

  private analyzeError(error: Error, context: any): {
    errorType: ErrorEvidence['errorType'];
    severity: ErrorEvidence['severity'];
    potentialCauses: string[];
    recommendedFixes: string[];
  } {
    const errorMessage = error.message.toLowerCase();
    const stackTrace = error.stack?.toLowerCase() || '';

    let errorType: ErrorEvidence['errorType'] = 'UNKNOWN';
    let severity: ErrorEvidence['severity'] = 'MEDIUM';
    const potentialCauses: string[] = [];
    const recommendedFixes: string[] = [];

    // Analyze error type
    if (errorMessage.includes('selector') || errorMessage.includes('not found') || errorMessage.includes('locator')) {
      errorType = 'SELECTOR_FAILURE';
      severity = 'HIGH';
      potentialCauses.push('React Native Web DOM structure changes');
      potentialCauses.push('Missing or changed data-testid attributes');
      potentialCauses.push('Component rendering timing issues');
      recommendedFixes.push('Add enhanced data-testid attributes to components');
      recommendedFixes.push('Implement multi-strategy selector approaches');
      recommendedFixes.push('Add wait conditions for dynamic content');
    } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
      errorType = 'NETWORK_ERROR';
      severity = 'CRITICAL';
      potentialCauses.push('Backend service unavailable');
      potentialCauses.push('Network connectivity issues');
      potentialCauses.push('CORS configuration problems');
      recommendedFixes.push('Implement retry logic with exponential backoff');
      recommendedFixes.push('Add network health monitoring');
      recommendedFixes.push('Verify backend service status');
    } else if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
      errorType = 'API_TIMEOUT';
      severity = 'HIGH';
      potentialCauses.push('Slow API response times');
      potentialCauses.push('Job queue processing delays');
      potentialCauses.push('Backend resource constraints');
      recommendedFixes.push('Increase timeout values for AI operations');
      recommendedFixes.push('Implement progress indicators for long operations');
      recommendedFixes.push('Add job status polling mechanisms');
    } else if (errorMessage.includes('render') || errorMessage.includes('component') || errorMessage.includes('react')) {
      errorType = 'RENDERING_ISSUE';
      severity = 'MEDIUM';
      potentialCauses.push('React component lifecycle issues');
      potentialCauses.push('State management synchronization problems');
      potentialCauses.push('Conditional rendering logic errors');
      recommendedFixes.push('Add error boundaries to components');
      recommendedFixes.push('Implement proper loading states');
      recommendedFixes.push('Review component dependency management');
    } else if (errorMessage.includes('mcp') || context.mcpRelated) {
      errorType = 'MCP_COMPATIBILITY';
      severity = 'CRITICAL';
      potentialCauses.push('React Native Web compatibility issues');
      potentialCauses.push('MCP selector strategy limitations');
      potentialCauses.push('Platform-specific DOM differences');
      recommendedFixes.push('Implement React Native Web specific selectors');
      recommendedFixes.push('Add platform detection logic');
      recommendedFixes.push('Create MCP-optimized interaction patterns');
    }

    return { errorType, severity, potentialCauses, recommendedFixes };
  }

  private async analyzeDOMStructure(): Promise<any> {
    try {
      return await this.page.evaluate(() => {
        const analysis = {
          totalElements: document.querySelectorAll('*').length,
          dataTestIdElements: document.querySelectorAll('[data-testid]').length,
          buttons: document.querySelectorAll('button, div[role="button"]').length,
          inputs: document.querySelectorAll('input, textarea').length,
          interactiveElements: document.querySelectorAll('button, input, textarea, a, div[role="button"]').length,
          reactComponents: document.querySelectorAll('[data-reactroot] *').length,
          visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }).length,
          dataTestIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => 
            (el as HTMLElement).getAttribute('data-testid')
          ),
          pageStructure: {
            title: document.title,
            url: window.location.href,
            bodyClasses: document.body.className,
            headContent: document.head.innerHTML.length
          }
        };

        return analysis;
      });
    } catch (error) {
      return { error: `DOM analysis failed: ${error.message}` };
    }
  }

  private async capturePerformanceMetrics(): Promise<any> {
    try {
      return await this.page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          timing: {
            navigationStart: perfData.navigationStart,
            loadEventEnd: perfData.loadEventEnd,
            domContentLoadedEventEnd: perfData.domContentLoadedEventEnd,
            responseEnd: perfData.responseEnd,
            domInteractive: perfData.domInteractive
          },
          loadTimes: {
            totalLoadTime: perfData.loadEventEnd - perfData.navigationStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            responseTime: perfData.responseEnd - perfData.requestStart
          },
          paint: {
            firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
          },
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          resources: performance.getEntriesByType('resource').length
        };
      });
    } catch (error) {
      return { error: `Performance metrics capture failed: ${error.message}` };
    }
  }

  async generateErrorSummaryReport(): Promise<string> {
    const reportPath = join(this.baseEvidenceDir, `error_summary_${Date.now()}.json`);
    
    const summary = {
      totalErrors: this.errorHistory.length,
      errorsByType: this.groupErrorsByType(),
      errorsBySeverity: this.groupErrorsBySeverity(),
      errorsByPhase: this.groupErrorsByPhase(),
      commonCauses: this.extractCommonCauses(),
      recommendedActions: this.generateRecommendedActions(),
      timestamp: Date.now(),
      reportPeriod: {
        start: this.errorHistory.length > 0 ? Math.min(...this.errorHistory.map(e => e.timestamp)) : Date.now(),
        end: Date.now()
      }
    };

    writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`📊 [ERROR TRACKER] Error summary report generated: ${reportPath}`);
    
    return reportPath;
  }

  private groupErrorsByType(): Record<string, number> {
    return this.errorHistory.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupErrorsBySeverity(): Record<string, number> {
    return this.errorHistory.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupErrorsByPhase(): Record<string, number> {
    return this.errorHistory.reduce((acc, error) => {
      acc[error.phase] = (acc[error.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private extractCommonCauses(): string[] {
    const allCauses = this.errorHistory.flatMap(error => error.potentialCauses);
    const causeCount = allCauses.reduce((acc, cause) => {
      acc[cause] = (acc[cause] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(causeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([cause]) => cause);
  }

  private generateRecommendedActions(): string[] {
    const allFixes = this.errorHistory.flatMap(error => error.recommendedFixes);
    const fixCount = allFixes.reduce((acc, fix) => {
      acc[fix] = (acc[fix] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(fixCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([fix]) => fix);
  }

  getErrorHistory(): ErrorEvidence[] {
    return this.errorHistory;
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
    console.log('🧹 [ERROR TRACKER] Error history cleared');
  }
}

export default EnhancedErrorTracker;