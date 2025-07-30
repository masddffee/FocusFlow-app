/**
 * FocusFlow 關鍵節點檢測器
 * 
 * 自動識別測試過程中的關鍵節點並觸發截圖和錯誤捕捉
 * 
 * @version 3.0
 * @author FocusFlow Team
 */

import { Page } from '@playwright/test';
import { EnhancedScreenshotManager } from './enhanced-screenshot-manager';
import { ComprehensiveErrorReporter } from './comprehensive-error-reporter';

export interface KeyNode {
  name: string;
  description: string;
  selector?: string;
  urlPattern?: RegExp;
  condition: () => Promise<boolean>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoScreenshot: boolean;
  waitForStable?: boolean;
}

export interface KeyNodeDetectionResult {
  detected: KeyNode[];
  screenshots: string[];
  timestamp: number;
}

export class KeyNodeDetector {
  private page: Page;
  private screenshotManager: EnhancedScreenshotManager;
  private errorReporter: ComprehensiveErrorReporter;
  private detectionInterval: number = 1000; // 1秒檢測一次
  private isDetecting: boolean = false;
  private detectionTimer?: NodeJS.Timeout;

  // 預定義的關鍵節點
  private keyNodes: KeyNode[] = [
    {
      name: 'application-loaded',
      description: '應用程式載入完成',
      selector: '[data-testid="main-container"]',
      condition: async () => {
        return await this.page.locator('[data-testid="main-container"]').isVisible();
      },
      priority: 'high',
      autoScreenshot: true,
      waitForStable: true
    },
    {
      name: 'task-form-appeared',
      description: '任務建立表單出現',
      selector: '[data-testid="task-form"]',
      condition: async () => {
        return await this.page.locator('[data-testid="task-form"]').isVisible();
      },
      priority: 'high',
      autoScreenshot: true,
      waitForStable: true
    },
    {
      name: 'ai-generation-started',
      description: 'AI 生成開始',
      selector: '[data-testid="ai-generating"]',
      condition: async () => {
        return await this.page.locator('[data-testid="ai-generating"], .loading, [data-testid="smart-generate-loading"]').isVisible();
      },
      priority: 'critical',
      autoScreenshot: true,
      waitForStable: false
    },
    {
      name: 'personalization-modal',
      description: '個人化問題彈窗',
      selector: '[data-testid="personalization-modal"]',
      condition: async () => {
        return await this.page.locator('[data-testid="personalization-modal"]').isVisible();
      },
      priority: 'high',
      autoScreenshot: true,
      waitForStable: true
    },
    {
      name: 'subtasks-generated',
      description: '子任務生成完成',
      selector: '[data-testid="subtasks-container"]',
      condition: async () => {
        const container = this.page.locator('[data-testid="subtasks-container"]');
        const subtasks = this.page.locator('[data-testid="subtask-item"]');
        
        if (!await container.isVisible()) return false;
        
        const count = await subtasks.count();
        return count >= 3; // 至少生成3個子任務才算完成
      },
      priority: 'critical',
      autoScreenshot: true,
      waitForStable: true
    },
    {
      name: 'timer-active',
      description: '專注計時器啟動',
      selector: '[data-testid="timer-display"]',
      condition: async () => {
        const timerDisplay = this.page.locator('[data-testid="timer-display"]');
        if (!await timerDisplay.isVisible()) return false;
        
        const timerText = await timerDisplay.textContent();
        return timerText !== '25:00'; // 計時器已開始變化
      },
      priority: 'medium',
      autoScreenshot: true,
      waitForStable: false
    },
    {
      name: 'error-dialog',
      description: '錯誤對話框出現',
      selector: '[data-testid="error-dialog"], .error-dialog, .alert-error',
      condition: async () => {
        return await this.page.locator('[data-testid="error-dialog"], .error-dialog, .alert-error').isVisible();
      },
      priority: 'critical',
      autoScreenshot: true,
      waitForStable: false
    },
    {
      name: 'network-request-timeout',
      description: '網路請求超時',
      condition: async () => {
        // 檢查是否有超時的網路請求指示器
        return await this.page.locator('[data-testid="network-timeout"], .timeout-indicator').isVisible();
      },
      priority: 'critical',
      autoScreenshot: true,
      waitForStable: true
    },
    {
      name: 'api-response-success',
      description: 'API 響應成功',
      urlPattern: /\/api\/(ai|task)/,
      condition: async () => {
        // 這個節點通過網路監控來檢測，而不是 DOM
        return false; // 由網路監控器處理
      },
      priority: 'medium',
      autoScreenshot: false
    },
    {
      name: 'chart-data-loaded',
      description: '圖表數據載入完成',
      selector: '[data-testid="productivity-chart"]',
      condition: async () => {
        const chart = this.page.locator('[data-testid="productivity-chart"]');
        if (!await chart.isVisible()) return false;
        
        // 檢查圖表是否有數據點
        const dataPoints = this.page.locator('[data-testid="productivity-chart"] .data-point, [data-testid="productivity-chart"] circle, [data-testid="productivity-chart"] rect');
        return (await dataPoints.count()) > 0;
      },
      priority: 'medium',
      autoScreenshot: true,
      waitForStable: true
    }
  ];

  constructor(
    page: Page,
    screenshotManager: EnhancedScreenshotManager,
    errorReporter: ComprehensiveErrorReporter
  ) {
    this.page = page;
    this.screenshotManager = screenshotManager;
    this.errorReporter = errorReporter;
    this.setupNetworkMonitoring();
  }

  /**
   * 設置網路監控，用於檢測 API 響應節點
   */
  private setupNetworkMonitoring() {
    this.page.on('response', async (response) => {
      const url = response.url();
      
      // 檢查 API 響應節點
      if (/\/api\/(ai|task)/.test(url)) {
        if (response.status() >= 200 && response.status() < 300) {
          await this.triggerKeyNodeDetection({
            name: 'api-response-success',
            description: `API 響應成功: ${url}`,
            condition: async () => true,
            priority: 'medium',
            autoScreenshot: true,
            waitForStable: false
          });
        }
      }
    });

    // 監控請求失敗
    this.page.on('requestfailed', async (request) => {
      await this.triggerKeyNodeDetection({
        name: 'network-request-failed',
        description: `網路請求失敗: ${request.url()}`,
        condition: async () => true,
        priority: 'critical',
        autoScreenshot: true,
        waitForStable: true
      });
    });
  }

  /**
   * 開始自動檢測關鍵節點
   */
  startDetection(): void {
    if (this.isDetecting) {
      console.warn('🔍 關鍵節點檢測已在運行中');
      return;
    }

    this.isDetecting = true;
    console.log('🔍 開始關鍵節點自動檢測');

    this.detectionTimer = setInterval(async () => {
      try {
        await this.detectKeyNodes();
      } catch (error) {
        console.error('🚨 關鍵節點檢測錯誤:', error);
      }
    }, this.detectionInterval);
  }

  /**
   * 停止自動檢測
   */
  stopDetection(): void {
    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = undefined;
    }
    this.isDetecting = false;
    console.log('🔍 關鍵節點檢測已停止');
  }

  /**
   * 檢測所有關鍵節點
   */
  private async detectKeyNodes(): Promise<KeyNodeDetectionResult> {
    const detectedNodes: KeyNode[] = [];
    const screenshots: string[] = [];

    for (const node of this.keyNodes) {
      try {
        const isDetected = await node.condition();
        
        if (isDetected) {
          detectedNodes.push(node);
          console.log(`🎯 檢測到關鍵節點: ${node.name} - ${node.description}`);

          if (node.autoScreenshot) {
            const screenshot = await this.captureKeyNodeScreenshot(node);
            if (screenshot) {
              screenshots.push(screenshot);
            }
          }

          // 觸發相應的錯誤處理或通知
          if (node.priority === 'critical' && node.name.includes('error')) {
            await this.errorReporter.captureError({
              type: 'system',
              message: `關鍵節點檢測: ${node.description}`,
              testName: 'key-node-detection'
            });
          }
        }
      } catch (error) {
        console.error(`❌ 檢測節點 ${node.name} 時發生錯誤:`, error);
      }
    }

    return {
      detected: detectedNodes,
      screenshots,
      timestamp: Date.now()
    };
  }

  /**
   * 手動觸發特定關鍵節點檢測
   */
  async triggerKeyNodeDetection(node: KeyNode): Promise<boolean> {
    try {
      const isDetected = await node.condition();
      
      if (isDetected) {
        console.log(`🎯 手動觸發關鍵節點: ${node.name} - ${node.description}`);

        if (node.autoScreenshot) {
          await this.captureKeyNodeScreenshot(node);
        }

        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ 手動觸發節點 ${node.name} 時發生錯誤:`, error);
      return false;
    }
  }

  /**
   * 為關鍵節點拍攝截圖
   */
  private async captureKeyNodeScreenshot(node: KeyNode): Promise<string | null> {
    try {
      // 如果需要等待穩定，先等待
      if (node.waitForStable) {
        await this.page.waitForTimeout(500);
        await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {
          // 忽略超時錯誤，繼續截圖
        });
      }

      const screenshotMetadata = await this.screenshotManager.captureScreenshot({
        name: `key-node-${node.name}`,
        description: `關鍵節點: ${node.description}`,
        fullPage: true,
        quality: 90,
        waitForStable: node.waitForStable,
        animations: 'disabled',
        // 如果有選擇器，可以高亮該元素
        highlightElements: node.selector ? [node.selector] : undefined
      });

      console.log(`📷 關鍵節點截圖已保存: ${screenshotMetadata.filename}`);
      return screenshotMetadata.path;
    } catch (error) {
      console.error(`❌ 關鍵節點 ${node.name} 截圖失敗:`, error);
      return null;
    }
  }

  /**
   * 添加自定義關鍵節點
   */
  addKeyNode(node: KeyNode): void {
    this.keyNodes.push(node);
    console.log(`➕ 已添加自定義關鍵節點: ${node.name}`);
  }

  /**
   * 移除關鍵節點
   */
  removeKeyNode(name: string): boolean {
    const index = this.keyNodes.findIndex(node => node.name === name);
    if (index !== -1) {
      this.keyNodes.splice(index, 1);
      console.log(`➖ 已移除關鍵節點: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * 獲取所有關鍵節點定義
   */
  getKeyNodes(): KeyNode[] {
    return [...this.keyNodes];
  }

  /**
   * 設置檢測間隔
   */
  setDetectionInterval(interval: number): void {
    this.detectionInterval = interval;
    
    // 如果正在檢測，重新啟動以應用新間隔
    if (this.isDetecting) {
      this.stopDetection();
      this.startDetection();
    }
  }

  /**
   * 檢查特定關鍵節點是否存在
   */
  async checkKeyNode(name: string): Promise<boolean> {
    const node = this.keyNodes.find(n => n.name === name);
    if (!node) {
      console.warn(`⚠️ 未找到關鍵節點: ${name}`);
      return false;
    }

    try {
      return await node.condition();
    } catch (error) {
      console.error(`❌ 檢查關鍵節點 ${name} 時發生錯誤:`, error);
      return false;
    }
  }

  /**
   * 等待特定關鍵節點出現
   */
  async waitForKeyNode(name: string, timeout: number = 30000): Promise<boolean> {
    const node = this.keyNodes.find(n => n.name === name);
    if (!node) {
      throw new Error(`未找到關鍵節點: ${name}`);
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        if (await node.condition()) {
          console.log(`✅ 關鍵節點已出現: ${name}`);
          
          if (node.autoScreenshot) {
            await this.captureKeyNodeScreenshot(node);
          }
          
          return true;
        }
      } catch (error) {
        console.error(`❌ 等待關鍵節點 ${name} 時發生錯誤:`, error);
      }
      
      await this.page.waitForTimeout(this.detectionInterval);
    }

    console.warn(`⏰ 等待關鍵節點 ${name} 超時 (${timeout}ms)`);
    return false;
  }
}

export default KeyNodeDetector;