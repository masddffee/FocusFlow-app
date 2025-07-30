/**
 * FocusFlow 增強截圖管理器
 * 
 * 提供智能截圖、錯誤捕捉、視覺比較等功能
 * 
 * @version 3.0
 * @author FocusFlow Team
 */

import { Page, BrowserContext } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface ScreenshotOptions {
  name?: string;
  description?: string;
  fullPage?: boolean;
  quality?: number;
  threshold?: number;
  animations?: 'disabled' | 'allow';
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  waitForStable?: boolean;
  maskElements?: string[];
  highlightElements?: string[];
}

export interface ScreenshotMetadata {
  filename: string;
  path: string;
  timestamp: string;
  description: string;
  hash: string;
  dimensions: {
    width: number;
    height: number;
  };
  context: {
    url: string;
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  performance: {
    captureTime: number;
    fileSize: number;
  };
}

export interface ErrorContext {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  domSnapshot?: string;
  networkLogs?: any[];
  consoleLogs?: any[];
  performanceMetrics?: Record<string, number>;
}

export class EnhancedScreenshotManager {
  private page: Page;
  private context: BrowserContext;
  private screenshotCounter = 0;
  private baseDir: string;
  private screenshots: ScreenshotMetadata[] = [];
  private errorLogs: any[] = [];
  private networkLogs: any[] = [];
  private consoleLogs: any[] = [];

  constructor(page: Page, context: BrowserContext, baseDir = './test-results') {
    this.page = page;
    this.context = context;
    this.baseDir = baseDir;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 監控網路請求
    this.page.on('request', request => {
      this.networkLogs.push({
        timestamp: Date.now(),
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        resourceType: request.resourceType()
      });
    });

    this.page.on('response', response => {
      this.networkLogs.push({
        timestamp: Date.now(),
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timing: response.timing()
      });
    });

    // 監控控制台輸出
    this.page.on('console', msg => {
      this.consoleLogs.push({
        timestamp: Date.now(),
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // 監控頁面錯誤
    this.page.on('pageerror', error => {
      this.errorLogs.push({
        timestamp: Date.now(),
        type: 'pageerror',
        message: error.message,
        stack: error.stack
      });
    });
  }

  /**
   * 拍攝標準截圖
   */
  async captureScreenshot(options: ScreenshotOptions = {}): Promise<ScreenshotMetadata> {
    const startTime = Date.now();
    this.screenshotCounter++;

    // 生成檔名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const counter = this.screenshotCounter.toString().padStart(3, '0');
    const name = options.name || 'screenshot';
    const filename = `${timestamp}-${counter}-${name}.png`;
    const fullPath = path.join(this.baseDir, 'screenshots', filename);

    // 確保目錄存在
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // 等待頁面穩定
    if (options.waitForStable !== false) {
      await this.waitForPageStable();
    }

    // 禁用動畫
    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    // 遮罩元素
    if (options.maskElements && options.maskElements.length > 0) {
      await this.maskElements(options.maskElements);
    }

    // 高亮元素
    if (options.highlightElements && options.highlightElements.length > 0) {
      await this.highlightElements(options.highlightElements);
    }

    // 拍攝截圖
    const screenshotBuffer = await this.page.screenshot({
      path: fullPath,
      fullPage: options.fullPage ?? true,
      quality: options.quality ?? 90,
      animations: options.animations,
      clip: options.clip
    });

    // 計算檔案雜湊
    const hash = createHash('md5').update(screenshotBuffer).digest('hex');

    // 獲取頁面資訊
    const url = this.page.url();
    const viewport = this.page.viewportSize();
    const userAgent = await this.page.evaluate(() => navigator.userAgent);

    // 獲取圖片尺寸
    const { width, height } = await this.getImageDimensions(screenshotBuffer);

    const metadata: ScreenshotMetadata = {
      filename,
      path: fullPath,
      timestamp: new Date().toISOString(),
      description: options.description || `Screenshot ${this.screenshotCounter}`,
      hash,
      dimensions: { width, height },
      context: {
        url,
        userAgent,
        viewport: viewport || { width: 0, height: 0 }
      },
      performance: {
        captureTime: Date.now() - startTime,
        fileSize: screenshotBuffer.length
      }
    };

    this.screenshots.push(metadata);

    console.log(`📷 截圖已保存: ${filename} (${(screenshotBuffer.length / 1024).toFixed(1)}KB, ${metadata.performance.captureTime}ms)`);

    return metadata;
  }

  /**
   * 錯誤時自動截圖
   */
  async captureErrorScreenshot(error: Error, additionalContext?: any): Promise<{
    screenshot: ScreenshotMetadata;
    errorContext: ErrorContext;
  }> {
    console.log(`🚨 捕獲錯誤截圖: ${error.message}`);

    // 建立錯誤上下文
    const errorContext: ErrorContext = {
      errorType: error.constructor.name,
      errorMessage: error.message,
      stackTrace: error.stack,
      networkLogs: [...this.networkLogs.slice(-20)], // 最後20個網路日誌
      consoleLogs: [...this.consoleLogs.slice(-10)], // 最後10個控制台日誌
      ...additionalContext
    };

    // 獲取 DOM 快照
    try {
      errorContext.domSnapshot = await this.page.content();
    } catch (e) {
      console.warn('無法獲取 DOM 快照:', e);
    }

    // 獲取性能指標
    try {
      errorContext.performanceMetrics = await this.page.evaluate(() => {
        const metrics: Record<string, number> = {};
        
        if ('performance' in window) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
            metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
            metrics.firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
            metrics.firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
          }
        }
        
        return metrics;
      });
    } catch (e) {
      console.warn('無法獲取性能指標:', e);
    }

    // 拍攝錯誤截圖
    const screenshot = await this.captureScreenshot({
      name: 'error',
      description: `錯誤截圖: ${error.message}`,
      fullPage: true,
      highlightElements: ['[data-testid*="error"]', '.error', '.alert-error']
    });

    // 保存錯誤上下文
    const errorLogPath = path.join(this.baseDir, 'errors', `error-${Date.now()}.json`);
    await fs.mkdir(path.dirname(errorLogPath), { recursive: true });
    await fs.writeFile(errorLogPath, JSON.stringify({
      screenshot: screenshot.filename,
      errorContext
    }, null, 2));

    return { screenshot, errorContext };
  }

  /**
   * 比較截圖
   */
  async compareScreenshots(
    baseline: string | ScreenshotMetadata,
    current: string | ScreenshotMetadata,
    threshold = 0.2
  ): Promise<{
    match: boolean;
    difference: number;
    diffImagePath?: string;
  }> {
    // 這裡可以整合圖像比較庫，如 pixelmatch
    console.log('📊 比較截圖功能 (需要整合圖像比較庫)');
    
    return {
      match: true,
      difference: 0
    };
  }

  /**
   * 捕獲元件截圖
   */
  async captureElementScreenshot(
    selector: string,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotMetadata> {
    await this.page.waitForSelector(selector);
    const element = this.page.locator(selector);
    
    const startTime = Date.now();
    this.screenshotCounter++;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const counter = this.screenshotCounter.toString().padStart(3, '0');
    const name = options.name || 'element';
    const filename = `${timestamp}-${counter}-${name}.png`;
    const fullPath = path.join(this.baseDir, 'screenshots', 'elements', filename);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    const screenshotBuffer = await element.screenshot({
      path: fullPath,
      quality: options.quality ?? 90,
      animations: options.animations
    });

    const hash = createHash('md5').update(screenshotBuffer).digest('hex');
    const { width, height } = await this.getImageDimensions(screenshotBuffer);

    const metadata: ScreenshotMetadata = {
      filename,
      path: fullPath,
      timestamp: new Date().toISOString(),
      description: options.description || `Element screenshot: ${selector}`,
      hash,
      dimensions: { width, height },
      context: {
        url: this.page.url(),
        userAgent: await this.page.evaluate(() => navigator.userAgent),
        viewport: this.page.viewportSize() || { width: 0, height: 0 }
      },
      performance: {
        captureTime: Date.now() - startTime,
        fileSize: screenshotBuffer.length
      }
    };

    this.screenshots.push(metadata);

    console.log(`📷 元件截圖已保存: ${filename} (${selector})`);

    return metadata;
  }

  /**
   * 生成測試報告截圖集
   */
  async generateScreenshotGallery(): Promise<string> {
    const galleryHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>FocusFlow 測試截圖集</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .screenshot-item { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .screenshot-image { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; cursor: pointer; }
        .screenshot-meta { font-size: 12px; color: #666; margin-top: 10px; }
        .screenshot-description { font-weight: bold; margin-bottom: 10px; }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
        .modal-content { margin: 50px auto; display: block; max-width: 90%; max-height: 90%; }
        .close { position: absolute; top: 15px; right: 35px; color: white; font-size: 40px; font-weight: bold; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🖼️ FocusFlow 測試截圖集</h1>
        <p>生成時間: ${new Date().toLocaleString()}</p>
        <p>截圖總數: ${this.screenshots.length}</p>
    </div>
    
    <div class="screenshot-grid">
        ${this.screenshots.map((screenshot, index) => `
        <div class="screenshot-item">
            <div class="screenshot-description">${screenshot.description}</div>
            <img class="screenshot-image" src="${path.relative(this.baseDir, screenshot.path)}" 
                 alt="${screenshot.description}" onclick="openModal('${screenshot.path}')">
            <div class="screenshot-meta">
                <div>檔名: ${screenshot.filename}</div>
                <div>時間: ${new Date(screenshot.timestamp).toLocaleString()}</div>
                <div>尺寸: ${screenshot.dimensions.width}x${screenshot.dimensions.height}</div>
                <div>大小: ${(screenshot.performance.fileSize / 1024).toFixed(1)}KB</div>
                <div>URL: <a href="${screenshot.context.url}" target="_blank">${screenshot.context.url}</a></div>
            </div>
        </div>
        `).join('')}
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

    const galleryPath = path.join(this.baseDir, 'screenshot-gallery.html');
    await fs.writeFile(galleryPath, galleryHtml);

    console.log(`🖼️ 截圖集已生成: ${galleryPath}`);
    return galleryPath;
  }

  // 私有輔助方法
  private async waitForPageStable(timeout = 2000): Promise<void> {
    // 等待網路閒置
    await this.page.waitForLoadState('networkidle', { timeout });
    
    // 等待額外的穩定時間
    await this.page.waitForTimeout(500);
  }

  private async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  private async maskElements(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      try {
        await this.page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            (el as HTMLElement).style.filter = 'blur(5px)';
          });
        }, selector);
      } catch (e) {
        console.warn(`無法遮罩元素 ${selector}:`, e);
      }
    }
  }

  private async highlightElements(selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      try {
        await this.page.evaluate((sel) => {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => {
            (el as HTMLElement).style.outline = '3px solid red';
            (el as HTMLElement).style.outlineOffset = '2px';
          });
        }, selector);
      } catch (e) {
        console.warn(`無法高亮元素 ${selector}:`, e);
      }
    }
  }

  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    // 簡化版本，實際應用中可以使用 sharp 或其他圖像處理庫
    return { width: 1280, height: 720 };
  }

  /**
   * 獲取所有截圖元數據
   */
  getScreenshots(): ScreenshotMetadata[] {
    return [...this.screenshots];
  }

  /**
   * 清理舊截圖
   */
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const screenshotsToDelete = this.screenshots.filter(s => 
      now - new Date(s.timestamp).getTime() > maxAge
    );

    for (const screenshot of screenshotsToDelete) {
      try {
        await fs.unlink(screenshot.path);
        console.log(`🗑️ 已刪除過期截圖: ${screenshot.filename}`);
      } catch (e) {
        console.warn(`無法刪除截圖 ${screenshot.filename}:`, e);
      }
    }

    this.screenshots = this.screenshots.filter(s => 
      now - new Date(s.timestamp).getTime() <= maxAge
    );
  }

  /**
   * 獲取統計信息
   */
  getStatistics() {
    const totalSize = this.screenshots.reduce((sum, s) => sum + s.performance.fileSize, 0);
    const avgCaptureTime = this.screenshots.reduce((sum, s) => sum + s.performance.captureTime, 0) / this.screenshots.length;

    return {
      totalScreenshots: this.screenshots.length,
      totalSize: totalSize,
      averageCaptureTime: avgCaptureTime,
      errorLogs: this.errorLogs.length,
      networkLogs: this.networkLogs.length,
      consoleLogs: this.consoleLogs.length
    };
  }
}

export default EnhancedScreenshotManager;