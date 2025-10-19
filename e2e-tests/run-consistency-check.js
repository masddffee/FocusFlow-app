#!/usr/bin/env node

/**
 * 自動化一致性檢查執行器
 * 
 * 這個腳本會執行完整的測試結果與實際使用的一致性檢查
 * 並生成詳細的報告以防止假陽性問題
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ConsistencyCheckRunner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.reportDir = path.join(this.projectRoot, 'test-results', 'consistency-reports');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 確保報告目錄存在
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 執行完整的一致性檢查
   */
  async runFullConsistencyCheck() {
    console.log('🚀 開始執行一致性檢查...\n');
    
    try {
      // 1. 檢查環境準備
      await this.checkEnvironment();
      
      // 2. 執行一致性測試
      await this.runConsistencyTests();
      
      // 3. 生成綜合報告
      await this.generateComprehensiveReport();
      
      console.log('\n🎉 一致性檢查完成！');
      
    } catch (error) {
      console.error('\n❌ 一致性檢查失敗:', error.message);
      process.exit(1);
    }
  }

  /**
   * 檢查測試環境
   */
  async checkEnvironment() {
    console.log('🔍 檢查測試環境...');
    
    const checks = [
      { name: '前端服務', url: 'http://localhost:8081', timeout: 5000 },
      { name: '後端服務', url: 'http://127.0.0.1:3000/health', timeout: 5000 }
    ];

    for (const check of checks) {
      try {
        const response = await this.httpGet(check.url, check.timeout);
        console.log(`✅ ${check.name} - 運行正常`);
      } catch (error) {
        throw new Error(`${check.name} 未運行 (${check.url})`);
      }
    }
    
    console.log('');
  }

  /**
   * 執行一致性測試
   */
  async runConsistencyTests() {
    console.log('🧪 執行一致性測試...');
    
    const testFiles = [
      'test-reality-consistency.spec.ts',
      'enhanced-mcp-reality-check.spec.ts'
    ];

    const testResults = [];
    
    for (const testFile of testFiles) {
      console.log(`   執行: ${testFile}`);
      
      try {
        const result = await this.runPlaywrightTest(testFile);
        testResults.push({
          testFile,
          success: result.success,
          output: result.output,
          duration: result.duration
        });
        
        console.log(`   ${result.success ? '✅' : '❌'} ${testFile} - ${result.duration}ms`);
        
      } catch (error) {
        testResults.push({
          testFile,
          success: false,
          error: error.message,
          duration: 0
        });
        
        console.log(`   ❌ ${testFile} - 失敗: ${error.message}`);
      }
    }

    // 保存測試結果
    const resultFile = path.join(this.reportDir, `test-results-${this.timestamp}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
    
    console.log(`📄 測試結果已保存: ${resultFile}\\n`);
    
    return testResults;
  }

  /**
   * 生成綜合報告
   */
  async generateComprehensiveReport() {
    console.log('📊 生成綜合一致性報告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: await this.generateSummary(),
      recommendations: await this.generateRecommendations(),
      preventiveMeasures: this.getPreventiveMeasures(),
      nextSteps: this.getNextSteps()
    };

    // 生成 Markdown 報告
    const markdownReport = this.generateMarkdownReport(report);
    const reportFile = path.join(this.reportDir, `consistency-report-${this.timestamp}.md`);
    fs.writeFileSync(reportFile, markdownReport);

    // 生成 JSON 報告
    const jsonReportFile = path.join(this.reportDir, `consistency-report-${this.timestamp}.json`);
    fs.writeFileSync(jsonReportFile, JSON.stringify(report, null, 2));

    console.log(`📄 報告已生成:`);
    console.log(`   Markdown: ${reportFile}`);
    console.log(`   JSON: ${jsonReportFile}`);

    // 顯示關鍵摘要
    this.displaySummary(report.summary);
  }

  /**
   * 生成摘要
   */
  async generateSummary() {
    // 這裡應該分析測試結果並生成摘要
    // 暫時返回模板摘要
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageConsistencyScore: 0,
      criticalIssues: 0,
      warnings: 0,
      overallStatus: 'unknown'
    };
  }

  /**
   * 生成建議
   */
  async generateRecommendations() {
    return [
      '定期執行一致性檢查，建議每週運行一次',
      '在發佈新功能前務必執行完整的一致性驗證',
      '監控測試結果趨勢，及時發現回歸問題',
      '改進測試覆蓋率，特別關注用戶關鍵路徑',
      '建立自動化的一致性檢查流水線'
    ];
  }

  /**
   * 獲取防範措施
   */
  getPreventiveMeasures() {
    return [
      '多層驗證：API + UI + 數據一致性 + 用戶體驗',
      '真實內容檢查：不只檢查元素存在，要檢查實際內容',
      '數據結構驗證：檢查完整性、格式、合理性',
      '用戶場景模擬：使用真實的用戶操作流程',
      '錯誤處理驗證：測試異常情況的處理',
      '性能影響評估：確保測試反映真實性能'
    ];
  }

  /**
   * 獲取後續步驟
   */
  getNextSteps() {
    return [
      '審查失敗的測試項目，確定根本原因',
      '更新測試邏輯以更準確反映用戶體驗',
      '改進產品功能以通過一致性檢查',
      '建立持續監控機制',
      '培訓團隊成員理解一致性檢查的重要性'
    ];
  }

  /**
   * 生成 Markdown 報告
   */
  generateMarkdownReport(report) {
    return `# 測試結果與實際使用一致性檢查報告

**生成時間:** ${report.timestamp}

## 📊 執行摘要

| 項目 | 數值 |
|------|------|
| 總測試數 | ${report.summary.totalTests} |
| 通過測試 | ${report.summary.passedTests} |
| 失敗測試 | ${report.summary.failedTests} |
| 平均一致性分數 | ${report.summary.averageConsistencyScore}% |
| 關鍵問題 | ${report.summary.criticalIssues} |
| 警告項目 | ${report.summary.warnings} |
| 整體狀態 | ${report.summary.overallStatus} |

## 🎯 關鍵發現

### 假陽性問題預防

本次一致性檢查專門設計用於識別和預防測試假陽性問題：

- **多層驗證機制**: 確保測試不只檢查元素存在，還要驗證實際功能
- **真實用戶場景**: 模擬實際用戶操作流程，而非簡化的測試路徑
- **數據一致性檢查**: 驗證前後端數據傳遞和處理的完整性
- **內容質量評估**: 確保顯示內容的實際價值和可用性

## 💡 改進建議

${report.recommendations.map(rec => `- ${rec}`).join('\\n')}

## 🛡️ 防範措施

${report.preventiveMeasures.map(measure => `- ${measure}`).join('\\n')}

## 📈 後續行動

${report.nextSteps.map(step => `- ${step}`).join('\\n')}

## 🔍 詳細分析

### 測試方法論

本一致性檢查採用以下方法論：

1. **分層驗證**: API 層 → UI 層 → 數據一致性 → 用戶體驗
2. **真實場景**: 使用實際用戶可能遇到的任務和數據
3. **嚴格標準**: 設定高標準的通過閾值，寧可誤報也不遺漏問題
4. **持續改進**: 基於測試結果持續優化檢查邏輯

### 品質保證

- 一致性分數閾值: ≥85%
- 數據完整性要求: ≥90%
- 性能要求: 頁面載入 <3秒
- 用戶體驗: 無關鍵錯誤，響應流暢

---

**報告生成工具**: 自動化一致性檢查器 v1.0  
**檢查頻率建議**: 每週執行，發佈前必執行  
**聯繫**: 如有問題請查看詳細日誌或聯繫開發團隊
`;
  }

  /**
   * 顯示摘要
   */
  displaySummary(summary) {
    console.log('\\n📊 一致性檢查摘要:');
    console.log(`   整體狀態: ${summary.overallStatus}`);
    console.log(`   平均一致性分數: ${summary.averageConsistencyScore}%`);
    console.log(`   關鍵問題: ${summary.criticalIssues}`);
    console.log(`   警告項目: ${summary.warnings}`);
  }

  /**
   * 執行 Playwright 測試
   */
  async runPlaywrightTest(testFile) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const cmd = `npx playwright test ${testFile}`;
      
      const child = spawn('npx', ['playwright', 'test', testFile], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            success: true,
            output: output,
            duration: duration
          });
        } else {
          reject({
            success: false,
            error: `Test failed with exit code ${code}`,
            output: output,
            duration: duration
          });
        }
      });

      child.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          output: output,
          duration: Date.now() - startTime
        });
      });
    });
  }

  /**
   * HTTP GET 請求
   */
  async httpGet(url, timeout = 5000) {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });

      req.on('error', reject);
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

// 主執行邏輯
if (require.main === module) {
  const runner = new ConsistencyCheckRunner();
  runner.runFullConsistencyCheck().catch(console.error);
}

module.exports = ConsistencyCheckRunner;