/**
 * 實時一致性監控系統
 * 
 * 這個系統會持續監控應用的一致性，
 * 當檢測到潛在的假陽性問題時會發出預警
 */

import { Page, Request } from '@playwright/test';

interface MonitoringMetrics {
  apiResponseTime: number;
  uiRenderTime: number;
  dataConsistency: number;
  errorCount: number;
  userExperienceScore: number;
}

interface InconsistencyAlert {
  level: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  timestamp: string;
  context: any;
}

export class ConsistencyMonitor {
  private alerts: InconsistencyAlert[] = [];
  private metrics: MonitoringMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(
    private page: Page,
    private request: Request,
    private config: {
      monitoringIntervalMs?: number;
      alertThresholds?: {
        apiResponseTime?: number;
        uiRenderTime?: number;
        consistencyScore?: number;
        errorCount?: number;
      };
    } = {}
  ) {
    this.config = {
      monitoringIntervalMs: 30000, // 30秒
      alertThresholds: {
        apiResponseTime: 5000,      // 5秒
        uiRenderTime: 3000,         // 3秒
        consistencyScore: 85,       // 85%
        errorCount: 0,              // 0個錯誤
      },
      ...this.config
    };
  }

  /**
   * 開始實時監控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('⚠️ 監控已經在運行中');
      return;
    }

    console.log('🔍 開始實時一致性監控...');
    this.isMonitoring = true;

    // 設定定期檢查
    this.monitoringInterval = setInterval(() => {
      this.performConsistencyCheck().catch(error => {
        this.addAlert('critical', 'monitoring-error', `監控檢查失敗: ${error.message}`, { error });
      });
    }, this.config.monitoringIntervalMs);

    // 監控頁面錯誤
    this.setupErrorListeners();

    // 監控網路請求
    this.setupNetworkMonitoring();

    console.log('✅ 實時監控已啟動');
  }

  /**
   * 停止監控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 停止實時一致性監控...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('✅ 監控已停止');
  }

  /**
   * 執行一致性檢查
   */
  private async performConsistencyCheck() {
    try {
      const startTime = Date.now();

      // 1. 檢查 API 響應時間
      const apiMetrics = await this.checkApiPerformance();

      // 2. 檢查 UI 渲染狀態
      const uiMetrics = await this.checkUIState();

      // 3. 檢查數據一致性
      const consistencyMetrics = await this.checkDataConsistency();

      // 4. 檢查錯誤狀態
      const errorMetrics = await this.checkErrorState();

      // 計算綜合指標
      const metrics: MonitoringMetrics = {
        apiResponseTime: apiMetrics.responseTime,
        uiRenderTime: uiMetrics.renderTime,
        dataConsistency: consistencyMetrics.consistencyScore,
        errorCount: errorMetrics.errorCount,
        userExperienceScore: this.calculateUXScore({
          apiResponseTime: apiMetrics.responseTime,
          uiRenderTime: uiMetrics.renderTime,
          errorCount: errorMetrics.errorCount
        })
      };

      this.metrics.push(metrics);

      // 檢查是否需要發出預警
      this.evaluateAlerts(metrics);

      const totalTime = Date.now() - startTime;
      console.log(`🔍 一致性檢查完成 (${totalTime}ms) - 一致性分數: ${metrics.dataConsistency}%`);

    } catch (error) {
      this.addAlert('critical', 'check-failure', `一致性檢查失敗: ${error.message}`, { error });
    }
  }

  /**
   * 檢查 API 性能
   */
  private async checkApiPerformance(): Promise<{ responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const healthResponse = await this.request.get('http://127.0.0.1:3000/health');
      const responseTime = Date.now() - startTime;

      if (!healthResponse.ok()) {
        this.addAlert('critical', 'api-health', `API 健康檢查失敗: ${healthResponse.status()}`, {
          status: healthResponse.status(),
          responseTime
        });
      }

      return { responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.addAlert('critical', 'api-error', `API 請求失敗: ${error.message}`, { error, responseTime });
      return { responseTime };
    }
  }

  /**
   * 檢查 UI 狀態
   */
  private async checkUIState(): Promise<{ renderTime: number }> {
    const startTime = Date.now();

    try {
      // 檢查頁面是否響應
      await this.page.waitForSelector('body', { timeout: 5000 });
      
      // 檢查是否有載入狀態
      const isLoading = await this.page.locator('[class*="loading"], .spinner').count() > 0;
      
      // 檢查是否有可見內容
      const hasVisibleContent = await this.page.locator('h1, h2, h3, .title, .content').count() > 0;

      const renderTime = Date.now() - startTime;

      if (isLoading) {
        this.addAlert('info', 'ui-loading', '頁面仍在載入中', { renderTime });
      }

      if (!hasVisibleContent) {
        this.addAlert('warning', 'ui-no-content', '頁面沒有可見內容', { renderTime });
      }

      return { renderTime };
    } catch (error) {
      const renderTime = Date.now() - startTime;
      this.addAlert('critical', 'ui-error', `UI 狀態檢查失敗: ${error.message}`, { error, renderTime });
      return { renderTime };
    }
  }

  /**
   * 檢查數據一致性
   */
  private async checkDataConsistency(): Promise<{ consistencyScore: number }> {
    try {
      // 檢查頁面上是否有預期的數據結構
      const subtaskElements = await this.page.locator('[class*="subtask"], [data-testid*="subtask"]').count();
      const personalizeElements = await this.page.locator('textarea, input[type="text"]').count();
      
      // 檢查內容質量
      const subtaskTitles = await this.page.locator('[class*="subtask"] h3, .subtask-title').allTextContents();
      const qualityContent = subtaskTitles.filter(title => 
        title && title.length > 5 && !title.includes('子任務') && !title.includes('subtask')
      );

      // 計算一致性分數
      let consistencyScore = 100;

      // 如果有子任務元素但沒有質量內容，扣分
      if (subtaskElements > 0 && qualityContent.length === 0) {
        consistencyScore -= 50;
        this.addAlert('critical', 'fake-positive', '檢測到假陽性：有子任務元素但沒有實際內容', {
          subtaskElements,
          qualityContent: qualityContent.length
        });
      }

      // 如果有空白輸入欄位但不應該有，扣分
      if (personalizeElements > 10) {
        consistencyScore -= 20;
        this.addAlert('warning', 'excessive-inputs', '過多的輸入欄位可能表示渲染問題', {
          inputCount: personalizeElements
        });
      }

      return { consistencyScore: Math.max(0, consistencyScore) };

    } catch (error) {
      this.addAlert('critical', 'consistency-check-error', `數據一致性檢查失敗: ${error.message}`, { error });
      return { consistencyScore: 0 };
    }
  }

  /**
   * 檢查錯誤狀態
   */
  private async checkErrorState(): Promise<{ errorCount: number }> {
    try {
      // 檢查頁面上的錯誤訊息
      const errorElements = await this.page.locator('.error, [class*="error"], [role="alert"], .failed').count();
      
      // 檢查控制台錯誤
      const consoleLogs = await this.page.evaluate(() => {
        return (window as any).__playwright_logs || [];
      });

      const consoleErrors = consoleLogs.filter((log: any) => log.level === 'error').length;
      const totalErrors = errorElements + consoleErrors;

      if (totalErrors > 0) {
        this.addAlert('warning', 'errors-detected', `檢測到 ${totalErrors} 個錯誤`, {
          domErrors: errorElements,
          consoleErrors: consoleErrors
        });
      }

      return { errorCount: totalErrors };

    } catch (error) {
      this.addAlert('critical', 'error-check-failure', `錯誤狀態檢查失敗: ${error.message}`, { error });
      return { errorCount: 1 }; // 將檢查失敗本身算作一個錯誤
    }
  }

  /**
   * 計算用戶體驗分數
   */
  private calculateUXScore(metrics: {
    apiResponseTime: number;
    uiRenderTime: number;
    errorCount: number;
  }): number {
    let score = 100;

    // API 響應時間影響
    if (metrics.apiResponseTime > 3000) score -= 20;
    else if (metrics.apiResponseTime > 1000) score -= 10;

    // UI 渲染時間影響
    if (metrics.uiRenderTime > 2000) score -= 15;
    else if (metrics.uiRenderTime > 1000) score -= 5;

    // 錯誤數量影響
    score -= metrics.errorCount * 10;

    return Math.max(0, score);
  }

  /**
   * 評估是否需要發出預警
   */
  private evaluateAlerts(metrics: MonitoringMetrics) {
    const thresholds = this.config.alertThresholds!;

    // API 響應時間預警
    if (metrics.apiResponseTime > thresholds.apiResponseTime!) {
      this.addAlert('warning', 'slow-api', `API 響應時間過長: ${metrics.apiResponseTime}ms`, {
        threshold: thresholds.apiResponseTime,
        actual: metrics.apiResponseTime
      });
    }

    // UI 渲染時間預警
    if (metrics.uiRenderTime > thresholds.uiRenderTime!) {
      this.addAlert('warning', 'slow-ui', `UI 渲染時間過長: ${metrics.uiRenderTime}ms`, {
        threshold: thresholds.uiRenderTime,
        actual: metrics.uiRenderTime
      });
    }

    // 一致性分數預警
    if (metrics.dataConsistency < thresholds.consistencyScore!) {
      this.addAlert('critical', 'low-consistency', `一致性分數過低: ${metrics.dataConsistency}%`, {
        threshold: thresholds.consistencyScore,
        actual: metrics.dataConsistency
      });
    }

    // 錯誤數量預警
    if (metrics.errorCount > thresholds.errorCount!) {
      this.addAlert('critical', 'high-errors', `錯誤數量過高: ${metrics.errorCount}`, {
        threshold: thresholds.errorCount,
        actual: metrics.errorCount
      });
    }

    // 用戶體驗分數預警
    if (metrics.userExperienceScore < 70) {
      this.addAlert('warning', 'poor-ux', `用戶體驗分數較低: ${metrics.userExperienceScore}%`, {
        score: metrics.userExperienceScore
      });
    }
  }

  /**
   * 設定錯誤監聽器
   */
  private setupErrorListeners() {
    // 監控頁面錯誤
    this.page.on('pageerror', (error) => {
      this.addAlert('critical', 'page-error', `頁面錯誤: ${error.message}`, { error: error.stack });
    });

    // 監控控制台錯誤
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.addAlert('warning', 'console-error', `控制台錯誤: ${msg.text()}`, { 
          type: msg.type(),
          text: msg.text()
        });
      }
    });

    // 監控請求失敗
    this.page.on('requestfailed', (request) => {
      this.addAlert('warning', 'request-failed', `請求失敗: ${request.url()}`, {
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });
  }

  /**
   * 設定網路監控
   */
  private setupNetworkMonitoring() {
    this.page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        this.addAlert('warning', 'http-error', `HTTP 錯誤: ${response.status()} ${response.url()}`, {
          status: response.status(),
          url: response.url()
        });
      }
    });
  }

  /**
   * 添加預警
   */
  private addAlert(level: 'critical' | 'warning' | 'info', type: string, message: string, context?: any) {
    const alert: InconsistencyAlert = {
      level,
      type,
      message,
      timestamp: new Date().toISOString(),
      context: context || {}
    };

    this.alerts.push(alert);

    // 限制預警數量，避免記憶體溢出
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }

    // 即時輸出重要預警
    const emoji = level === 'critical' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${level.toUpperCase()}] ${type}: ${message}`);

    if (context && Object.keys(context).length > 0) {
      console.log(`   詳細信息:`, context);
    }
  }

  /**
   * 獲取預警歷史
   */
  getAlerts(level?: 'critical' | 'warning' | 'info'): InconsistencyAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return this.alerts;
  }

  /**
   * 獲取監控指標
   */
  getMetrics(): MonitoringMetrics[] {
    return this.metrics;
  }

  /**
   * 清除歷史數據
   */
  clearHistory() {
    this.alerts = [];
    this.metrics = [];
    console.log('🧹 監控歷史數據已清除');
  }

  /**
   * 生成監控報告
   */
  generateMonitoringReport(): {
    summary: any;
    alerts: InconsistencyAlert[];
    metrics: MonitoringMetrics[];
  } {
    const criticalAlerts = this.getAlerts('critical');
    const warningAlerts = this.getAlerts('warning');
    const infoAlerts = this.getAlerts('info');

    const recentMetrics = this.metrics.slice(-10); // 最近10次檢查
    const avgConsistency = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.dataConsistency, 0) / recentMetrics.length 
      : 0;

    const summary = {
      monitoringDuration: this.isMonitoring ? 'Active' : 'Stopped',
      totalChecks: this.metrics.length,
      averageConsistencyScore: Math.round(avgConsistency * 10) / 10,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      infoAlerts: infoAlerts.length,
      lastCheckTime: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
    };

    return {
      summary,
      alerts: this.alerts,
      metrics: this.metrics
    };
  }
}

export default ConsistencyMonitor;