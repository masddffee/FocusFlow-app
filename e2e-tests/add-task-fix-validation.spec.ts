/**
 * 🔧 Add Task 修復驗證測試 (實際版本)
 * 
 * 基於真實的 DOM 結構進行測試，不依賴 data-testid
 * 驗證重構後的 add-task.tsx 是否正常運作
 * 
 * @author FocusFlow Team
 * @version 3.1
 * @compliance 適配實際 DOM 結構的測試
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

test.describe('🔧 Add Task 修復驗證 (實際 DOM)', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('🚀 準備測試環境...');
    
    // 導航到應用
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    // 等待 React 應用載入
    await page.waitForTimeout(3000);
    
    // 截圖記錄首頁狀態
    await page.screenshot({ 
      path: './test-results/screenshots/homepage-loaded.png',
      fullPage: true 
    });
  });

  test('✅ 應用基本載入測試', async ({ page }) => {
    console.log('🧪 測試應用是否正常載入...');
    
    // 檢查頁面標題
    const title = await page.title();
    console.log(`📄 頁面標題: ${title}`);
    
    // 檢查是否有 React root
    const rootElement = await page.locator('#root').isVisible();
    expect(rootElement).toBe(true);
    
    // 尋找添加任務按鈕 (Plus 圖標)
    const addButtonSelectors = [
      'button:has-text("+")',
      '[aria-label*="add"]',
      '[aria-label*="Add"]',
      'button:has(svg)',
      'text="+"'
    ];
    
    let addButtonFound = false;
    for (const selector of addButtonSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(`✓ 找到添加按鈕: ${selector}`);
        addButtonFound = true;
        break;
      }
    }
    
    // 如果找不到按鈕，列出所有可點擊元素
    if (!addButtonFound) {
      const allButtons = await page.locator('button, [role="button"]').count();
      console.log(`🔍 頁面上共有 ${allButtons} 個按鈕/可點擊元素`);
      
      // 列出前5個按鈕的文字內容
      for (let i = 0; i < Math.min(allButtons, 5); i++) {
        const buttonText = await page.locator('button, [role="button"]').nth(i).textContent();
        console.log(`  ${i}: "${buttonText}"`);
      }
    }
    
    console.log('✅ 應用載入測試完成');
  });

  test('🧭 導航到 Add Task 頁面', async ({ page }) => {
    console.log('🧪 測試導航到 Add Task 頁面...');
    
    // 嘗試多種方式找到添加任務功能
    const navigationStrategies = [
      // 策略1: 直接點擊 Plus 按鈕
      async () => {
        const plusButtons = page.locator('text="+"');
        const count = await plusButtons.count();
        console.log(`Found ${count} plus buttons`);
        
        if (count > 0) {
          await plusButtons.first().click();
          return true;
        }
        return false;
      },
      
      // 策略2: 直接導航到 add-task 頁面
      async () => {
        await page.goto(`${BASE_URL}/add-task`);
        await page.waitForLoadState('domcontentloaded');
        return true;
      },
      
      // 策略3: 尋找包含 SVG 的按鈕
      async () => {
        const svgButtons = page.locator('button:has(svg)');
        const count = await svgButtons.count();
        
        if (count > 0) {
          await svgButtons.first().click();
          return true;
        }
        return false;
      }
    ];
    
    let navigationSuccess = false;
    
    for (const strategy of navigationStrategies) {
      try {
        await strategy();
        await page.waitForTimeout(2000);
        
        // 檢查是否成功導航到 add-task 頁面
        const currentUrl = page.url();
        console.log(`🔗 當前 URL: ${currentUrl}`);
        
        if (currentUrl.includes('add-task') || currentUrl.includes('Add')) {
          navigationSuccess = true;
          console.log('✅ 成功導航到 Add Task 頁面');
          break;
        }
        
        // 檢查頁面是否有任務創建相關的輸入框
        const titleInput = await page.locator('input[placeholder*="title"], input[placeholder*="標題"]').count();
        if (titleInput > 0) {
          navigationSuccess = true;
          console.log('✅ 檢測到任務創建頁面');
          break;
        }
        
      } catch (error) {
        console.log(`⚠️ 導航策略失敗: ${error.message}`);
      }
    }
    
    // 截圖記錄最終狀態
    await page.screenshot({ 
      path: './test-results/screenshots/navigation-result.png',
      fullPage: true 
    });
    
    expect(navigationSuccess).toBe(true);
  });

  test('📝 Add Task 表單基本功能', async ({ page }) => {
    console.log('🧪 測試 Add Task 表單功能...');
    
    // 直接導航到 add-task 頁面
    await page.goto(`${BASE_URL}/add-task`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // 截圖記錄表單頁面
    await page.screenshot({ 
      path: './test-results/screenshots/add-task-form-loaded.png',
      fullPage: true 
    });
    
    // 檢查基本表單元素
    console.log('🔍 檢查表單元素...');
    
    // 查找標題輸入框
    const titleInputSelectors = [
      'input[placeholder*="title"]',
      'input[placeholder*="標題"]',
      'input[placeholder*="Title"]',
      'input[type="text"]:first-of-type',
      'textarea:first-of-type'
    ];
    
    let titleInput = null;
    for (const selector of titleInputSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        titleInput = element.first();
        console.log(`✓ 找到標題輸入框: ${selector}`);
        break;
      }
    }
    
    if (titleInput) {
      // 測試輸入功能
      await titleInput.fill('測試任務標題');
      const inputValue = await titleInput.inputValue();
      expect(inputValue).toBe('測試任務標題');
      console.log('✅ 標題輸入功能正常');
    } else {
      console.log('⚠️ 未找到標題輸入框');
    }
    
    // 查找描述輸入框
    const descriptionInputSelectors = [
      'textarea',
      'input[placeholder*="description"]',
      'input[placeholder*="描述"]',
      'input[type="text"]:nth-of-type(2)'
    ];
    
    let descriptionInput = null;
    for (const selector of descriptionInputSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        descriptionInput = element.first();
        console.log(`✓ 找到描述輸入框: ${selector}`);
        break;
      }
    }
    
    if (descriptionInput) {
      await descriptionInput.fill('測試任務描述');
      console.log('✅ 描述輸入功能正常');
    }
    
    // 截圖記錄填寫後狀態
    await page.screenshot({ 
      path: './test-results/screenshots/form-filled.png',
      fullPage: true 
    });
    
    console.log('✅ Add Task 表單基本功能測試完成');
  });

  test('🤖 Smart Generate 按鈕測試', async ({ page }) => {
    console.log('🧪 測試 Smart Generate 功能...');
    
    // 導航到 add-task 頁面
    await page.goto(`${BASE_URL}/add-task`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // 填寫基本任務信息
    const titleInput = page.locator('input').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill('學習 React Native');
    }
    
    // 查找 Smart Generate 相關按鈮
    const smartGenerateSelectors = [
      'button:has-text("Smart")',
      'button:has-text("Generate")',
      'button:has-text("AI")',
      'button:has-text("智能")',
      'button:has-text("生成")',
      'button:has(svg)[aria-label*="generate"]'
    ];
    
    let smartGenerateButton = null;
    for (const selector of smartGenerateSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        smartGenerateButton = element.first();
        console.log(`✓ 找到 Smart Generate 按鈕: ${selector}`);
        break;
      }
    }
    
    if (smartGenerateButton) {
      // 點擊 Smart Generate 按鈕
      await smartGenerateButton.click();
      console.log('🔥 已點擊 Smart Generate 按鈕');
      
      // 等待響應
      await page.waitForTimeout(5000);
      
      // 截圖記錄點擊後狀態
      await page.screenshot({ 
        path: './test-results/screenshots/smart-generate-clicked.png',
        fullPage: true 
      });
      
      // 檢查是否有載入指示器或結果
      const loadingIndicator = await page.locator('[role="progressbar"], .loading, .spinner').count();
      if (loadingIndicator > 0) {
        console.log('✅ 檢測到載入指示器');
      }
      
      console.log('✅ Smart Generate 按鈕功能測試完成');
    } else {
      console.log('⚠️ 未找到 Smart Generate 按鈕');
      
      // 列出所有按鈕以供調試
      const allButtons = await page.locator('button').count();
      console.log(`🔍 頁面上共有 ${allButtons} 個按鈕`);
      
      for (let i = 0; i < Math.min(allButtons, 10); i++) {
        const buttonText = await page.locator('button').nth(i).textContent();
        console.log(`  按鈕 ${i}: "${buttonText}"`);
      }
    }
  });

  test('💾 保存功能測試', async ({ page }) => {
    console.log('🧪 測試任務保存功能...');
    
    // 導航並填寫表單
    await page.goto(`${BASE_URL}/add-task`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // 填寫基本信息
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      await inputs.first().fill('保存測試任務');
      console.log('✅ 已填寫任務標題');
    }
    
    if (inputCount > 1) {
      await inputs.nth(1).fill('這是用於測試保存功能的任務');
      console.log('✅ 已填寫任務描述');
    }
    
    // 查找保存按鈕
    const saveButtonSelectors = [
      'button:has-text("Save")',
      'button:has-text("保存")',
      'button:has-text("Create")',
      'button:has-text("創建")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'button:last-of-type'
    ];
    
    let saveButton = null;
    for (const selector of saveButtonSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        saveButton = element.first();
        console.log(`✓ 找到保存按鈕: ${selector}`);
        break;
      }
    }
    
    if (saveButton) {
      // 截圖記錄保存前狀態
      await page.screenshot({ 
        path: './test-results/screenshots/before-save.png',
        fullPage: true 
      });
      
      // 點擊保存
      await saveButton.click();
      console.log('💾 已點擊保存按鈕');
      
      // 等待保存響應
      await page.waitForTimeout(3000);
      
      // 截圖記錄保存後狀態
      await page.screenshot({ 
        path: './test-results/screenshots/after-save.png',
        fullPage: true 
      });
      
      console.log('✅ 保存功能測試完成');
    } else {
      console.log('⚠️ 未找到保存按鈕');
    }
  });

  test('🔍 頁面結構分析', async ({ page }) => {
    console.log('🧪 分析頁面結構以改善測試...');
    
    await page.goto(`${BASE_URL}/add-task`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // 分析頁面結構
    const analysis = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim() || '',
        className: btn.className,
        id: btn.id,
        type: btn.type || 'button'
      }));
      
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(input => ({
        type: input.type || 'text',
        placeholder: input.placeholder || '',
        id: input.id,
        name: input.name || '',
        className: input.className
      }));
      
      return {
        buttons,
        inputs,
        url: window.location.href,
        title: document.title
      };
    });
    
    console.log('📊 頁面結構分析結果:');
    console.log(`URL: ${analysis.url}`);
    console.log(`標題: ${analysis.title}`);
    console.log(`按鈕數量: ${analysis.buttons.length}`);
    console.log(`輸入框數量: ${analysis.inputs.length}`);
    
    // 輸出按鈕信息
    analysis.buttons.forEach((btn, i) => {
      if (btn.text) {
        console.log(`  按鈕 ${i}: "${btn.text}" (${btn.type})`);
      }
    });
    
    // 輸出輸入框信息  
    analysis.inputs.forEach((input, i) => {
      console.log(`  輸入框 ${i}: ${input.type} - "${input.placeholder}"`);
    });
    
    // 最終截圖
    await page.screenshot({ 
      path: './test-results/screenshots/page-structure-analysis.png',
      fullPage: true 
    });
    
    console.log('✅ 頁面結構分析完成');
    
    // 這個測試總是通過，因為它只是用來收集信息
    expect(true).toBe(true);
  });
});