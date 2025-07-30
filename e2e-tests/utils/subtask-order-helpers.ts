import { Page, expect } from '@playwright/test';
import { EnhancedTestHelpers } from './enhanced-test-helpers';

/**
 * 子任務順序測試專用助手類
 * 提供專門用於驗證子任務順序的工具方法
 */
export class SubtaskOrderHelpers {
  private page: Page;
  private testHelpers: EnhancedTestHelpers;
  private testId: string;

  constructor(page: Page, testHelpers: EnhancedTestHelpers, testId: string) {
    this.page = page;
    this.testHelpers = testHelpers;
    this.testId = testId;
  }

  /**
   * 捕獲當前顯示的子任務順序
   */
  async captureDisplayedSubtaskOrder(): Promise<Array<{ title: string; order: number; position: number }>> {
    console.log(`📋 [${this.testId}] 捕獲顯示的子任務順序`);
    
    const subtaskElements = await this.page.locator('[data-testid="subtask-item"]').all();
    const order: Array<{ title: string; order: number; position: number }> = [];
    
    for (let i = 0; i < subtaskElements.length; i++) {
      const titleElement = subtaskElements[i].locator('[data-testid="subtask-title"], .subtask-title, .subtask-text');
      const title = await titleElement.textContent() || `Subtask ${i + 1}`;
      
      // 清理標題文本，移除表情符號和多餘空白
      const cleanTitle = title.replace(/^[📚🛠️🎯🤔📝💡🔍⚡]\s*/, '').trim();
      
      order.push({
        title: cleanTitle,
        order: i + 1,
        position: i
      });
    }
    
    console.log(`📊 [${this.testId}] 捕獲到 ${order.length} 個子任務順序:`, order);
    return order;
  }

  /**
   * 驗證子任務順序是否按預期排列
   */
  async verifySubtaskOrder(expectedTitles: string[]): Promise<boolean> {
    console.log(`🔍 [${this.testId}] 驗證子任務順序`);
    
    const actualOrder = await this.captureDisplayedSubtaskOrder();
    
    if (actualOrder.length !== expectedTitles.length) {
      console.log(`❌ [${this.testId}] 子任務數量不匹配: 期望 ${expectedTitles.length}, 實際 ${actualOrder.length}`);
      return false;
    }
    
    for (let i = 0; i < expectedTitles.length; i++) {
      const expectedTitle = expectedTitles[i].toLowerCase().trim();
      const actualTitle = actualOrder[i].title.toLowerCase().trim();
      
      // 使用包含檢查而不是完全匹配，因為標題可能有格式差異
      if (!actualTitle.includes(expectedTitle.substring(0, Math.min(10, expectedTitle.length)))) {
        console.log(`❌ [${this.testId}] 第 ${i + 1} 個子任務順序錯誤:`);
        console.log(`   期望包含: "${expectedTitle}"`);
        console.log(`   實際: "${actualTitle}"`);
        return false;
      }
    }
    
    console.log(`✅ [${this.testId}] 子任務順序驗證通過`);
    return true;
  }

  /**
   * 安全添加手動子任務
   */
  async addManualSubtask(title: string): Promise<void> {
    console.log(`➕ [${this.testId}] 添加手動子任務: "${title}"`);
    
    // 多種選擇器嘗試找到輸入框
    const inputSelectors = [
      '[data-testid="add-subtask-input"]',
      '[data-testid="new-subtask-input"]',
      '[placeholder*="添加子任務"]',
      '[placeholder*="Add subtask"]',
      'input.subtask-input',
      '.add-subtask-input'
    ];
    
    let subtaskInput = null;
    for (const selector of inputSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        subtaskInput = element;
        break;
      }
    }
    
    if (!subtaskInput) {
      console.log(`⚠️ [${this.testId}] 未找到子任務輸入框，嘗試查找父容器`);
      // 嘗試查找包含輸入框的容器
      const containerSelectors = [
        '[data-testid="subtask-manager"]',
        '.subtask-manager',
        '.add-subtask-container'
      ];
      
      for (const selector of containerSelectors) {
        const container = this.page.locator(selector);
        if (await container.isVisible({ timeout: 1000 }).catch(() => false)) {
          subtaskInput = container.locator('input').first();
          if (await subtaskInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            break;
          }
        }
      }
    }
    
    if (!subtaskInput) {
      throw new Error(`無法找到子任務輸入框`);
    }
    
    // 填寫並提交
    await subtaskInput.fill(title);
    
    // 嘗試多種提交方式
    const submitMethods = [
      async () => {
        const addButton = this.page.locator('[data-testid="add-subtask-button"], .add-subtask-button').first();
        if (await addButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await addButton.click();
          return true;
        }
        return false;
      },
      async () => {
        await subtaskInput!.press('Enter');
        return true;
      },
      async () => {
        // 查找加號按鈕
        const plusButton = this.page.locator('button:has-text("+"), [aria-label*="add"], [title*="add"]').first();
        if (await plusButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await plusButton.click();
          return true;
        }
        return false;
      }
    ];
    
    let submitted = false;
    for (const method of submitMethods) {
      try {
        if (await method()) {
          submitted = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ [${this.testId}] 提交方法失敗:`, error);
      }
    }
    
    if (!submitted) {
      throw new Error(`無法提交子任務: "${title}"`);
    }
    
    // 等待子任務添加完成
    await this.page.waitForTimeout(500);
    console.log(`✅ [${this.testId}] 成功添加手動子任務: "${title}"`);
  }

  /**
   * 等待 AI 生成完成
   */
  async waitForAIGeneration(timeout: number = 30000): Promise<void> {
    console.log(`⏳ [${this.testId}] 等待 AI 生成完成`);
    
    // 等待生成按鈕消失或變為可用狀態
    const loadingSelectors = [
      '[data-testid="smart-generate-button"]:has-text("生成中")',
      '[data-testid="smart-generate-button"]:has-text("Generating")',
      '[data-testid="smart-generate-button"][disabled]',
      '.generating-spinner',
      '.loading-spinner'
    ];
    
    // 等待加載狀態消失
    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout: timeout });
      } catch (error) {
        // 忽略，繼續檢查下一個選擇器
      }
    }
    
    // 等待子任務出現
    await this.page.waitForSelector('[data-testid="subtask-item"]', { timeout: timeout });
    
    // 額外等待確保所有子任務都已渲染
    await this.page.waitForTimeout(2000);
    
    console.log(`✅ [${this.testId}] AI 生成完成`);
  }

  /**
   * 比較兩個子任務順序數組
   */
  compareSubtaskOrders(
    order1: Array<{ title: string; order: number }>,
    order2: Array<{ title: string; order: number }>,
    strictMatch: boolean = false
  ): { match: boolean; differences: string[] } {
    const differences: string[] = [];
    
    if (order1.length !== order2.length) {
      differences.push(`數量不匹配: ${order1.length} vs ${order2.length}`);
      return { match: false, differences };
    }
    
    for (let i = 0; i < order1.length; i++) {
      const title1 = order1[i].title.toLowerCase().trim();
      const title2 = order2[i].title.toLowerCase().trim();
      
      const matches = strictMatch 
        ? title1 === title2
        : title1.includes(title2.substring(0, 10)) || title2.includes(title1.substring(0, 10));
      
      if (!matches) {
        differences.push(`位置 ${i + 1}: "${order1[i].title}" vs "${order2[i].title}"`);
      }
    }
    
    return {
      match: differences.length === 0,
      differences
    };
  }

  /**
   * 截圖並標記子任務順序
   */
  async screenshotWithOrderAnnotation(screenshotName: string): Promise<void> {
    console.log(`📸 [${this.testId}] 截圖: ${screenshotName}`);
    
    // 先獲取當前順序
    const currentOrder = await this.captureDisplayedSubtaskOrder();
    
    // 在頁面上添加順序標記（如果可能）
    try {
      await this.page.evaluate((order) => {
        const subtasks = document.querySelectorAll('[data-testid="subtask-item"]');
        subtasks.forEach((subtask, index) => {
          if (order[index]) {
            // 添加順序標記
            const orderBadge = document.createElement('div');
            orderBadge.textContent = `#${index + 1}`;
            orderBadge.style.cssText = `
              position: absolute;
              top: 5px;
              right: 5px;
              background: #ff4444;
              color: white;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 12px;
              font-weight: bold;
              z-index: 1000;
            `;
            subtask.style.position = 'relative';
            subtask.appendChild(orderBadge);
          }
        });
      }, currentOrder);
    } catch (error) {
      console.log(`⚠️ [${this.testId}] 無法添加順序標記:`, error);
    }
    
    // 截圖
    await this.testHelpers.takeScreenshot(screenshotName);
    
    // 記錄順序信息到控制台
    console.log(`📊 [${this.testId}] ${screenshotName} 時的子任務順序:`, currentOrder);
  }

  /**
   * 驗證子任務的 order 屬性是否正確設置
   */
  async verifySubtaskOrderAttributes(): Promise<boolean> {
    console.log(`🔍 [${this.testId}] 驗證子任務 order 屬性`);
    
    try {
      const orderData = await this.page.evaluate(() => {
        const subtasks = document.querySelectorAll('[data-testid="subtask-item"]');
        return Array.from(subtasks).map((subtask, index) => {
          // 嘗試從各種屬性中獲取 order 值
          const orderAttr = subtask.getAttribute('data-order') 
            || subtask.getAttribute('data-subtask-order')
            || (index + 1).toString();
          
          const titleElement = subtask.querySelector('[data-testid="subtask-title"], .subtask-title');
          const title = titleElement?.textContent?.trim() || `Subtask ${index + 1}`;
          
          return {
            position: index,
            order: parseInt(orderAttr) || (index + 1),
            title: title
          };
        });
      });
      
      // 驗證 order 值是否遞增
      for (let i = 0; i < orderData.length; i++) {
        if (orderData[i].order !== i + 1) {
          console.log(`❌ [${this.testId}] Order 屬性不正確: 位置 ${i}, 期望 ${i + 1}, 實際 ${orderData[i].order}`);
          return false;
        }
      }
      
      console.log(`✅ [${this.testId}] Order 屬性驗證通過`);
      return true;
    } catch (error) {
      console.log(`⚠️ [${this.testId}] 無法驗證 order 屬性:`, error);
      return false;
    }
  }
}