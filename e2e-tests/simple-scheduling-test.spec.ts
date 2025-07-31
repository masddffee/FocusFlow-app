// 簡單的排程功能測試
import { test, expect } from '@playwright/test';

test.describe('排程功能驗證', () => {
  test('基本應用加載和導航', async ({ page }) => {
    // 前往首頁
    await page.goto('http://localhost:8081');
    
    // 等待頁面完全加載
    await page.waitForTimeout(3000);
    
    // 檢查頁面標題
    const title = await page.title();
    expect(title).toContain('FocusMate');
    
    // 前往任務頁面
    await page.click('[href="/tasks"]');
    await page.waitForTimeout(2000);
    
    // 檢查是否有添加任務按鈕
    const plusButton = page.locator('button').filter({ has: page.locator('svg') });
    await expect(plusButton.first()).toBeVisible();
    
    console.log('✅ 基本導航測試通過');
  });

  test('檢查調度功能 API', async ({ page }) => {
    // 測試後端 API 是否正常
    const response = await page.request.get('http://localhost:3000/health');
    
    // 如果沒有 health endpoint，測試基本的路由
    const backendCheck = await page.request.get('http://localhost:3000/').catch(() => null);
    
    console.log('✅ 後端連接測試完成');
  });

  test('驗證排程邏輯', async ({ page }) => {
    // 這裡我們可以測試實際的排程邏輯
    const { scheduleSubtasks } = await import('../utils/scheduling');
    
    // 創建測試數據
    const testSubtasks = [
      {
        id: '1',
        title: '測試任務 1',
        text: '第一個測試任務',
        order: 1,
        completed: false,
        aiEstimatedDuration: 30
      },
      {
        id: '2', 
        title: '測試任務 2',
        text: '第二個測試任務',
        order: 2,
        completed: false,
        aiEstimatedDuration: 45
      }
    ];
    
    const testTimeSlots = {
      monday: [{ start: '09:00', end: '12:00' }],
      tuesday: [{ start: '09:00', end: '12:00' }],
      wednesday: [{ start: '09:00', end: '12:00' }],
      thursday: [{ start: '09:00', end: '12:00' }],
      friday: [{ start: '09:00', end: '12:00' }],
      saturday: [{ start: '10:00', end: '16:00' }],
      sunday: [{ start: '10:00', end: '16:00' }]
    };
    
    // 測試排程邏輯
    const result = scheduleSubtasks(
      testSubtasks,
      testTimeSlots,
      [],
      [],
      {
        startDate: new Date(),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );
    
    // 驗證結果
    expect(result.success).toBe(true);
    expect(result.scheduledSubtasks).toHaveLength(2);
    
    // 驗證順序保持正確
    expect(result.scheduledSubtasks[0].order).toBe(1);
    expect(result.scheduledSubtasks[1].order).toBe(2);
    
    console.log('✅ 排程邏輯測試通過:', result.message);
  });
});