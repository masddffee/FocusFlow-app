/**
 * 一致性檢查輔助工具
 * 用於確保測試結果與實際用戶體驗的一致性
 */

export interface ConsistencyCheckResult {
  checkName: string;
  expected: any;
  actual: any;
  passed: boolean;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface ConsistencyReport {
  consistencyScore: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalFailures: number;
  warnings: number;
  failures: string[];
  details: ConsistencyCheckResult[];
  recommendations: string[];
}

export class ConsistencyChecker {
  private results: ConsistencyCheckResult[] = [];
  private failures: string[] = [];

  constructor(private testName: string = '') {}

  /**
   * 記錄一致性檢查結果
   */
  recordCheck(
    checkName: string, 
    expected: any, 
    actual: any, 
    passed: boolean,
    severity: 'critical' | 'warning' | 'info' = 'critical'
  ) {
    const result: ConsistencyCheckResult = {
      checkName,
      expected,
      actual,
      passed,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    if (!passed) {
      const failureMessage = `${severity.toUpperCase()}: ${checkName} - 預期: ${expected}, 實際: ${actual}`;
      this.failures.push(failureMessage);
      
      // 根據嚴重性決定日誌輸出
      if (severity === 'critical') {
        console.error(`❌ ${failureMessage}`);
      } else if (severity === 'warning') {
        console.warn(`⚠️ ${failureMessage}`);
      } else {
        console.log(`ℹ️ ${failureMessage}`);
      }
    } else {
      console.log(`✅ ${checkName}`);
    }

    return result;
  }

  /**
   * 批量檢查數據結構
   */
  validateDataStructure(
    data: any,
    expectedStructure: Record<string, any>,
    prefix: string = ''
  ) {
    Object.keys(expectedStructure).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const expectedType = expectedStructure[key];
      const actualValue = data?.[key];

      if (typeof expectedType === 'object' && expectedType.type) {
        // 複雜類型檢查
        this.recordCheck(
          `${fullKey} 類型檢查`,
          expectedType.type,
          typeof actualValue,
          typeof actualValue === expectedType.type,
          expectedType.severity || 'critical'
        );

        if (expectedType.minLength && Array.isArray(actualValue)) {
          this.recordCheck(
            `${fullKey} 最小長度`,
            `>=${expectedType.minLength}`,
            actualValue.length,
            actualValue.length >= expectedType.minLength,
            expectedType.severity || 'critical'
          );
        }

        if (expectedType.pattern && typeof actualValue === 'string') {
          const regex = new RegExp(expectedType.pattern);
          this.recordCheck(
            `${fullKey} 格式檢查`,
            expectedType.pattern,
            actualValue,
            regex.test(actualValue),
            expectedType.severity || 'warning'
          );
        }
      } else if (typeof expectedType === 'string') {
        // 簡單類型檢查
        this.recordCheck(
          `${fullKey} 存在性`,
          '存在',
          actualValue ? '存在' : '不存在',
          actualValue != null,
          'critical'
        );
      } else if (typeof expectedType === 'object') {
        // 嵌套對象檢查
        this.validateDataStructure(actualValue, expectedType, fullKey);
      }
    });
  }

  /**
   * 檢查 API 響應與前端顯示的一致性
   */
  validateApiUiConsistency(apiData: any, uiData: any) {
    // 數量一致性
    if (apiData.subtasks && Array.isArray(apiData.subtasks)) {
      this.recordCheck(
        'API 子任務數量與 UI 顯示一致',
        apiData.subtasks.length,
        uiData.displayedSubtaskCount || 0,
        apiData.subtasks.length === (uiData.displayedSubtaskCount || 0),
        'critical'
      );

      // 內容一致性檢查
      if (uiData.subtaskTitles && Array.isArray(uiData.subtaskTitles)) {
        const apiTitles = apiData.subtasks.map((s: any) => s.title || '').filter(Boolean);
        const matchingTitles = uiData.subtaskTitles.filter((uiTitle: string) =>
          apiTitles.some((apiTitle: string) => 
            this.isSimilarText(uiTitle, apiTitle, 0.8)
          )
        );

        this.recordCheck(
          '子任務標題內容匹配率',
          '≥80%',
          `${matchingTitles.length}/${uiData.subtaskTitles.length}`,
          (matchingTitles.length / Math.max(uiData.subtaskTitles.length, 1)) >= 0.8,
          'warning'
        );
      }
    }

    // 數據完整性檢查
    const apiDataComplete = apiData.subtasks?.every((s: any) => 
      s.title && s.text && s.startDate && s.endDate && s.aiEstimatedDuration
    ) || false;

    const uiDataComplete = uiData.hasSubtasksDisplayed && 
      uiData.displayedSubtaskCount > 0;

    this.recordCheck(
      '數據完整性一致',
      `API完整:${apiDataComplete}, UI顯示:${uiDataComplete}`,
      `匹配:${apiDataComplete === uiDataComplete}`,
      apiDataComplete === uiDataComplete,
      'critical'
    );
  }

  /**
   * 檢查用戶體驗質量
   */
  validateUserExperience(metrics: {
    loadTime?: number;
    errorCount?: number;
    interactionResponsive?: boolean;
    contentReadable?: boolean;
  }) {
    if (metrics.loadTime !== undefined) {
      this.recordCheck(
        '頁面載入時間',
        '<3000ms',
        `${metrics.loadTime}ms`,
        metrics.loadTime < 3000,
        'warning'
      );
    }

    if (metrics.errorCount !== undefined) {
      this.recordCheck(
        '錯誤訊息數量',
        0,
        metrics.errorCount,
        metrics.errorCount === 0,
        'critical'
      );
    }

    if (metrics.interactionResponsive !== undefined) {
      this.recordCheck(
        '互動回應性',
        true,
        metrics.interactionResponsive,
        metrics.interactionResponsive,
        'warning'
      );
    }

    if (metrics.contentReadable !== undefined) {
      this.recordCheck(
        '內容可讀性',
        true,
        metrics.contentReadable,
        metrics.contentReadable,
        'info'
      );
    }
  }

  /**
   * 生成一致性報告
   */
  getConsistencyReport(): ConsistencyReport {
    const totalChecks = this.results.length;
    const passedChecks = this.results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const criticalFailures = this.results.filter(r => !r.passed && r.severity === 'critical').length;
    const warnings = this.results.filter(r => !r.passed && r.severity === 'warning').length;
    
    const consistencyScore = totalChecks > 0 ? (passedChecks / totalChecks * 100) : 0;

    const recommendations = this.generateRecommendations();

    return {
      consistencyScore: Math.round(consistencyScore * 10) / 10,
      totalChecks,
      passedChecks,
      failedChecks,
      criticalFailures,
      warnings,
      failures: this.failures,
      details: this.results,
      recommendations
    };
  }

  /**
   * 重置檢查器
   */
  reset() {
    this.results = [];
    this.failures = [];
  }

  /**
   * 生成改進建議
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const criticalFailures = this.results.filter(r => !r.passed && r.severity === 'critical');
    const warnings = this.results.filter(r => !r.passed && r.severity === 'warning');

    if (criticalFailures.length > 0) {
      recommendations.push('🚨 修復所有關鍵性問題，這些問題會影響核心功能');
      
      const apiIssues = criticalFailures.filter(f => f.checkName.includes('API') || f.checkName.includes('數據'));
      if (apiIssues.length > 0) {
        recommendations.push('🔧 檢查前端與後端的數據傳輸和處理邏輯');
      }

      const uiIssues = criticalFailures.filter(f => f.checkName.includes('UI') || f.checkName.includes('顯示'));
      if (uiIssues.length > 0) {
        recommendations.push('🎨 檢查前端組件的渲染邏輯和狀態管理');
      }
    }

    if (warnings.length > 0) {
      recommendations.push('⚠️ 關注警告項目，這些可能影響用戶體驗');
      
      if (warnings.some(w => w.checkName.includes('載入時間'))) {
        recommendations.push('⚡ 優化頁面載入性能，考慮使用載入指示器');
      }

      if (warnings.some(w => w.checkName.includes('匹配率'))) {
        recommendations.push('🔗 改進前後端數據一致性，確保內容準確傳遞');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 所有檢查均通過，系統一致性良好');
    }

    return recommendations;
  }

  /**
   * 文本相似性檢查
   */
  private isSimilarText(text1: string, text2: string, threshold: number = 0.8): boolean {
    if (!text1 || !text2) return false;
    
    // 簡單的相似性檢查，可以使用更複雜的算法
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity >= threshold;
  }

  /**
   * 匯出報告為 JSON
   */
  exportReport(filename: string = `consistency-report-${Date.now()}.json`) {
    const report = this.getConsistencyReport();
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      const reportPath = path.join(process.cwd(), 'test-results', filename);
      
      // 確保目錄存在
      const dir = path.dirname(reportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 一致性報告已匯出: ${reportPath}`);
      
      return reportPath;
    } catch (error) {
      console.error('❌ 匯出報告失敗:', error);
      return null;
    }
  }
}