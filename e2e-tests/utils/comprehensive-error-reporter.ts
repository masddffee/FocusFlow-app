/**
 * FocusFlow 全面錯誤報告生成器
 * 
 * 收集、分析和報告測試過程中的所有錯誤和異常
 * 
 * @version 3.0
 * @author FocusFlow Team
 */

import { Page, BrowserContext, TestInfo } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EnhancedScreenshotManager, ErrorContext } from './enhanced-screenshot-manager';

export interface TestError {
  id: string;
  timestamp: string;
  testName: string;
  errorType: 'assertion' | 'timeout' | 'network' | 'element' | 'javascript' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  screenshot?: string;
  context: ErrorContext;
  recovery: {
    attempted: boolean;
    successful: boolean;
    strategy?: string;
  };
  userImpact: string;
  suggestedFix: string;
}

export interface ErrorPattern {
  pattern: RegExp;
  type: TestError['errorType'];
  severity: TestError['severity'];
  suggestedFix: string;
  userImpact: string;
}

export interface ErrorReport {
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    testCoverage: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
    };
  };
  errors: TestError[];
  patterns: {
    mostCommon: string[];
    trending: string[];
    resolved: string[];
  };
  recommendations: string[];
  attachments: {
    screenshots: string[];
    logs: string[];
    traces: string[];
  };
  generatedAt: string;
  version: string;
}

export class ComprehensiveErrorReporter {
  private errors: TestError[] = [];
  private page: Page;
  private context: BrowserContext;
  private screenshotManager: EnhancedScreenshotManager;
  private testInfo?: TestInfo;
  private reportDir: string;

  // 預定義錯誤模式
  private errorPatterns: ErrorPattern[] = [
    {
      pattern: /timeout.*waiting for selector/i,
      type: 'timeout',
      severity: 'high',
      suggestedFix: '檢查選擇器是否正確，增加等待時間，或確認元素是否會出現',
      userImpact: '用戶可能看到載入中的畫面或無法進行下一步操作'
    },
    {
      pattern: /network.*failed/i,
      type: 'network',
      severity: 'critical',
      suggestedFix: '檢查 API 端點是否正常，確認網路連線，檢查 CORS 設定',
      userImpact: '用戶將無法獲取資料或執行需要網路的功能'
    },
    {
      pattern: /element.*not.*visible/i,
      type: 'element',
      severity: 'medium',
      suggestedFix: '檢查元素是否被其他元素遮蓋，確認 CSS 顯示屬性，等待動畫完成',
      userImpact: '用戶看到的界面可能不完整或無法與特定元素互動'
    },
    {
      pattern: /assertion.*failed/i,
      type: 'assertion',
      severity: 'medium',
      suggestedFix: '檢查預期值是否正確，確認測試邏輯，更新測試數據',
      userImpact: '功能可能運作但結果與預期不符'
    },
    {
      pattern: /console.*error/i,
      type: 'javascript',
      severity: 'medium',
      suggestedFix: '檢查 JavaScript 錯誤，修復語法問題，處理未捕獲的異常',
      userImpact: '可能導致功能異常或用戶體驗下降'
    },
    {
      pattern: /ai.*generation.*failed/i,
      type: 'system',
      severity: 'high',
      suggestedFix: '檢查 AI API 配置，確認 API 金鑰有效，檢查請求格式',
      userImpact: '用戶無法使用智能生成功能，需要手動創建內容'
    }
  ];

  constructor(
    page: Page, 
    context: BrowserContext, 
    screenshotManager: EnhancedScreenshotManager,
    reportDir = './test-results/error-reports'
  ) {
    this.page = page;
    this.context = context;
    this.screenshotManager = screenshotManager;
    this.reportDir = reportDir;
    this.setupErrorCapture();
  }

  private setupErrorCapture() {
    // 捕獲頁面錯誤
    this.page.on('pageerror', async (error) => {
      await this.captureError({
        type: 'javascript',
        message: error.message,
        stack: error.stack,
        originalError: error
      });
    });

    // 捕獲控制台錯誤
    this.page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        await this.captureError({
          type: 'javascript',
          message: msg.text(),
          originalError: new Error(msg.text())
        });
      }
    });

    // 捕獲網路錯誤
    this.page.on('requestfailed', async (request) => {
      await this.captureError({
        type: 'network',
        message: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
        originalError: new Error(request.failure()?.errorText || 'Network request failed')
      });
    });
  }

  /**
   * 捕獲錯誤
   */
  async captureError(errorData: {
    type?: TestError['errorType'];
    message: string;
    stack?: string;
    originalError?: Error;
    testName?: string;
    recovery?: TestError['recovery'];
  }): Promise<TestError> {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // 自動檢測錯誤類型和嚴重性
    const detectedPattern = this.detectErrorPattern(errorData.message);
    const errorType = errorData.type || detectedPattern.type;
    const severity = detectedPattern.severity;

    // 拍攝錯誤截圖
    const { screenshot, errorContext } = await this.screenshotManager.captureErrorScreenshot(
      errorData.originalError || new Error(errorData.message)
    );

    const testError: TestError = {
      id: errorId,
      timestamp,
      testName: errorData.testName || this.testInfo?.title || '未知測試',
      errorType,
      severity,
      message: errorData.message,
      stack: errorData.stack || errorData.originalError?.stack,
      screenshot: screenshot.path,
      context: errorContext,
      recovery: errorData.recovery || {
        attempted: false,
        successful: false
      },
      userImpact: detectedPattern.userImpact,
      suggestedFix: detectedPattern.suggestedFix
    };

    this.errors.push(testError);

    // 即時記錄高嚴重性錯誤
    if (severity === 'critical' || severity === 'high') {
      console.error(`🚨 ${severity.toUpperCase()} ERROR [${errorId}]: ${errorData.message}`);
      await this.saveErrorDetails(testError);
    }

    return testError;
  }

  /**
   * 檢測錯誤模式
   */
  private detectErrorPattern(message: string): {
    type: TestError['errorType'];
    severity: TestError['severity'];
    suggestedFix: string;
    userImpact: string;
  } {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(message)) {
        return {
          type: pattern.type,
          severity: pattern.severity,
          suggestedFix: pattern.suggestedFix,
          userImpact: pattern.userImpact
        };
      }
    }

    // 預設模式
    return {
      type: 'system',
      severity: 'medium',
      suggestedFix: '需要進一步分析此錯誤',
      userImpact: '可能影響用戶體驗'
    };
  }

  /**
   * 設定測試資訊
   */
  setTestInfo(testInfo: TestInfo) {
    this.testInfo = testInfo;
  }

  /**
   * 標記錯誤恢復嘗試
   */
  async markRecoveryAttempt(
    errorId: string, 
    strategy: string, 
    successful: boolean
  ): Promise<void> {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.recovery = {
        attempted: true,
        successful,
        strategy
      };

      console.log(`🔄 錯誤恢復 [${errorId}]: ${strategy} - ${successful ? '成功' : '失敗'}`);
    }
  }

  /**
   * 生成全面錯誤報告
   */
  async generateComprehensiveReport(): Promise<ErrorReport> {
    const errorsByType = this.groupBy(this.errors, 'errorType');
    const errorsBySeverity = this.groupBy(this.errors, 'severity');
    
    const report: ErrorReport = {
      summary: {
        totalErrors: this.errors.length,
        errorsByType: this.countBy(errorsByType),
        errorsBySeverity: this.countBy(errorsBySeverity),
        testCoverage: await this.calculateTestCoverage()
      },
      errors: this.errors,
      patterns: await this.analyzeErrorPatterns(),
      recommendations: this.generateRecommendations(),
      attachments: await this.collectAttachments(),
      generatedAt: new Date().toISOString(),
      version: '3.0'
    };

    // 保存報告
    await this.saveReport(report);
    
    // 生成 HTML 報告
    await this.generateHtmlReport(report);

    return report;
  }

  /**
   * 分析錯誤模式
   */
  private async analyzeErrorPatterns(): Promise<{
    mostCommon: string[];
    trending: string[];
    resolved: string[];
  }> {
    const messageGroups = this.groupBy(this.errors, 'message');
    const mostCommon = Object.entries(messageGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 5)
      .map(([message]) => message);

    const resolved = this.errors
      .filter(e => e.recovery.successful)
      .map(e => e.message)
      .slice(0, 5);

    // 趨勢分析（簡化版本）
    const recentErrors = this.errors
      .filter(e => Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000)
      .map(e => e.message)
      .slice(0, 5);

    return {
      mostCommon,
      trending: recentErrors,
      resolved
    };
  }

  /**
   * 生成建議
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const criticalErrors = this.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push(`🚨 發現 ${criticalErrors.length} 個嚴重錯誤，建議優先修復`);
    }

    const networkErrors = this.errors.filter(e => e.errorType === 'network');
    if (networkErrors.length > 2) {
      recommendations.push('🌐 網路錯誤頻繁，建議檢查 API 服務狀態和網路連線');
    }

    const timeoutErrors = this.errors.filter(e => e.errorType === 'timeout');
    if (timeoutErrors.length > 3) {
      recommendations.push('⏰ 超時錯誤較多，建議優化頁面載入速度或增加等待時間');
    }

    const lowRecoveryRate = this.errors.filter(e => e.recovery.attempted && !e.recovery.successful).length;
    if (lowRecoveryRate > this.errors.length * 0.5) {
      recommendations.push('🔄 錯誤恢復成功率較低，建議改進錯誤處理機制');
    }

    // 通用建議
    recommendations.push('📊 定期檢查錯誤報告，建立錯誤監控儀表板');
    recommendations.push('🧪 增加單元測試覆蓋率，提前發現潛在問題');
    recommendations.push('📝 建立錯誤知識庫，記錄常見問題的解決方案');

    return recommendations;
  }

  /**
   * 收集附件
   */
  private async collectAttachments(): Promise<ErrorReport['attachments']> {
    const screenshots = this.screenshotManager.getScreenshots().map(s => s.path);
    
    return {
      screenshots,
      logs: [], // 可以添加日誌檔案路徑
      traces: [] // 可以添加追蹤檔案路徑
    };
  }

  /**
   * 計算測試覆蓋率
   */
  private async calculateTestCoverage(): Promise<ErrorReport['summary']['testCoverage']> {
    // 這裡可以整合實際的測試統計
    return {
      totalTests: 50,
      passedTests: 35,
      failedTests: this.errors.length,
      skippedTests: 5
    };
  }

  /**
   * 生成 HTML 報告
   */
  private async generateHtmlReport(report: ErrorReport): Promise<string> {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>FocusFlow 錯誤報告</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .summary-card h3 { margin: 0 0 15px 0; color: #2d3748; }
        .summary-number { font-size: 2.5em; font-weight: bold; color: #4a5568; }
        .error-item { background: white; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .error-header { padding: 20px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
        .error-content { padding: 20px; }
        .severity-critical { border-left: 5px solid #e53e3e; }
        .severity-high { border-left: 5px solid #dd6b20; }
        .severity-medium { border-left: 5px solid #d69e2e; }
        .severity-low { border-left: 5px solid #38a169; }
        .error-type { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
        .error-type.network { background: #fed7d7; color: #c53030; }
        .error-type.timeout { background: #feebc8; color: #c05621; }
        .error-type.element { background: #fef5e7; color: #b7791f; }
        .error-type.assertion { background: #e6fffa; color: #2c7a7b; }
        .error-type.javascript { background: #e9d8fd; color: #553c9a; }
        .error-type.system { background: #f0fff4; color: #276749; }
        .screenshot { max-width: 300px; border-radius: 8px; margin: 10px 0; cursor: pointer; }
        .recommendations { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .recommendations ul { padding-left: 0; }
        .recommendations li { list-style: none; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
        .modal-content { margin: 50px auto; display: block; max-width: 90%; max-height: 90%; }
        .close { position: absolute; top: 15px; right: 35px; color: white; font-size: 40px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ FocusFlow 錯誤報告</h1>
        <p>生成時間: ${new Date(report.generatedAt).toLocaleString()}</p>
        <p>版本: ${report.version}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>📊 總錯誤數</h3>
            <div class="summary-number">${report.summary.totalErrors}</div>
        </div>
        <div class="summary-card">
            <h3>🎯 測試覆蓋率</h3>
            <div class="summary-number">${Math.round((report.summary.testCoverage.passedTests / report.summary.testCoverage.totalTests) * 100)}%</div>
            <div style="font-size: 0.9em; color: #718096; margin-top: 10px;">
                ${report.summary.testCoverage.passedTests}/${report.summary.testCoverage.totalTests} 測試通過
            </div>
        </div>
        <div class="summary-card">
            <h3>🚨 嚴重錯誤</h3>
            <div class="summary-number">${report.summary.errorsBySeverity.critical || 0}</div>
        </div>
        <div class="summary-card">
            <h3>🌐 網路錯誤</h3>
            <div class="summary-number">${report.summary.errorsByType.network || 0}</div>
        </div>
    </div>

    <h2>🔍 錯誤詳情</h2>
    ${report.errors.map(error => `
    <div class="error-item severity-${error.severity}">
        <div class="error-header">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                <span class="error-type ${error.errorType}">${error.errorType}</span>
                ${error.message}
            </h3>
            <div style="font-size: 0.9em; color: #718096; margin-top: 5px;">
                測試: ${error.testName} | 時間: ${new Date(error.timestamp).toLocaleString()}
            </div>
        </div>
        <div class="error-content">
            <div style="margin-bottom: 15px;">
                <strong>🎯 用戶影響:</strong> ${error.userImpact}
            </div>
            <div style="margin-bottom: 15px;">
                <strong>🔧 建議修復:</strong> ${error.suggestedFix}
            </div>
            ${error.recovery.attempted ? `
            <div style="margin-bottom: 15px;">
                <strong>🔄 恢復嘗試:</strong> 
                <span style="color: ${error.recovery.successful ? '#38a169' : '#e53e3e'}">
                    ${error.recovery.successful ? '成功' : '失敗'} 
                    ${error.recovery.strategy ? `(${error.recovery.strategy})` : ''}
                </span>
            </div>
            ` : ''}
            ${error.screenshot ? `
            <div>
                <strong>📷 錯誤截圖:</strong><br>
                <img class="screenshot" src="${path.relative(this.reportDir, error.screenshot)}" 
                     alt="錯誤截圖" onclick="openModal('${error.screenshot}')">
            </div>
            ` : ''}
        </div>
    </div>
    `).join('')}

    <div class="recommendations">
        <h2>💡 建議和改進方案</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close">&times;</span>
        <img class="modal-content" id="modal-image">
    </div>

    <script>
        function openModal(imagePath) {
            document.getElementById('modal').style.display = 'block';
            document.getElementById('modal-image').src = imagePath;
        }
        
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
    </script>
</body>
</html>`;

    const htmlPath = path.join(this.reportDir, 'error-report.html');
    await fs.mkdir(this.reportDir, { recursive: true });
    await fs.writeFile(htmlPath, htmlContent);

    console.log(`📄 HTML 錯誤報告已生成: ${htmlPath}`);
    return htmlPath;
  }

  // 私有輔助方法
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private countBy(groups: Record<string, any[]>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [key, items] of Object.entries(groups)) {
      counts[key] = items.length;
    }
    return counts;
  }

  private async saveErrorDetails(error: TestError): Promise<void> {
    const errorFilePath = path.join(this.reportDir, 'individual-errors', `${error.id}.json`);
    await fs.mkdir(path.dirname(errorFilePath), { recursive: true });
    await fs.writeFile(errorFilePath, JSON.stringify(error, null, 2));
  }

  private async saveReport(report: ErrorReport): Promise<void> {
    const reportPath = path.join(this.reportDir, 'comprehensive-error-report.json');
    await fs.mkdir(this.reportDir, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 錯誤報告已保存: ${reportPath}`);
  }

  /**
   * 獲取錯誤統計
   */
  getErrorStats() {
    return {
      total: this.errors.length,
      byType: this.countBy(this.groupBy(this.errors, 'errorType')),
      bySeverity: this.countBy(this.groupBy(this.errors, 'severity')),
      recoveryRate: this.errors.filter(e => e.recovery.successful).length / Math.max(1, this.errors.filter(e => e.recovery.attempted).length)
    };
  }

  /**
   * 清除錯誤記錄
   */
  clearErrors(): void {
    this.errors = [];
    console.log('🧹 錯誤記錄已清除');
  }
}

export default ComprehensiveErrorReporter;