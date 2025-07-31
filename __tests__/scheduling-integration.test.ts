// 排程功能整合測試
import { scheduleSubtasks } from '../utils/scheduling';
import { EnhancedSubtask } from '../types/task';
import { DayTimeSlots } from '../types/timeSlot';

describe('排程功能修復驗證', () => {
  const mockTimeSlots: DayTimeSlots = {
    monday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }],
    saturday: [{ start: '10:00', end: '16:00' }],
    sunday: [{ start: '10:00', end: '16:00' }]
  };

  const createTestSubtasks = (): EnhancedSubtask[] => [
    {
      id: '1',
      title: '學習 JavaScript 基礎',
      text: '學習變量、函數和物件的基本概念',
      order: 1,
      completed: false,
      aiEstimatedDuration: 60,
      difficulty: 'easy'
    },
    {
      id: '2',
      title: '練習 React 組件',
      text: '創建基本的 React 組件並理解 props',
      order: 2,
      completed: false,
      aiEstimatedDuration: 90,
      difficulty: 'medium'
    },
    {
      id: '3',
      title: '實作狀態管理',
      text: '使用 useState 和 useEffect 管理組件狀態',
      order: 3,
      completed: false,
      aiEstimatedDuration: 120,
      difficulty: 'hard'
    }
  ];

  test('應該保持子任務的原始順序', () => {
    const subtasks = createTestSubtasks();
    
    const result = scheduleSubtasks(
      subtasks,
      mockTimeSlots,
      [],
      [],
      {
        startDate: new Date('2025-07-30'),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );

    expect(result.success).toBe(true);
    expect(result.scheduledSubtasks).toHaveLength(3);
    
    // 驗證順序保持正確
    const scheduledOrders = result.scheduledSubtasks.map(s => s.order);
    expect(scheduledOrders).toEqual([1, 2, 3]);
    
    // 驗證是從隔天開始排程
    const scheduledDates = result.scheduledSubtasks.map(s => new Date(s.date));
    const startDate = new Date('2025-07-31'); // 隔天
    
    scheduledDates.forEach(date => {
      expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    });
  });

  test('應該正確處理子任務時長', () => {
    const subtasks = createTestSubtasks();
    
    const result = scheduleSubtasks(
      subtasks,
      mockTimeSlots,
      [],
      [],
      {
        startDate: new Date('2025-07-30'),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );

    expect(result.success).toBe(true);
    
    // 驗證時長正確映射
    expect(result.scheduledSubtasks[0].duration).toBe(60);
    expect(result.scheduledSubtasks[1].duration).toBe(90);
    expect(result.scheduledSubtasks[2].duration).toBe(120);
  });

  test('應該處理時間槽不足的情況', () => {
    const subtasks = createTestSubtasks();
    
    // 提供很少的時間槽
    const limitedTimeSlots: DayTimeSlots = {
      monday: [{ start: '09:00', end: '09:30' }], // 只有 30 分鐘
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };
    
    const result = scheduleSubtasks(
      subtasks,
      limitedTimeSlots,
      [],
      [],
      {
        startDate: new Date('2025-07-30'),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );

    // 應該失敗或者只安排部分任務
    expect(result.scheduledSubtasks.length).toBeLessThan(3);
    expect(result.unscheduledSubtasks.length).toBeGreaterThan(0);
  });

  test('應該跳過已完成的子任務', () => {
    const subtasks = createTestSubtasks();
    // 標記第二個任務為已完成
    subtasks[1].completed = true;
    
    const result = scheduleSubtasks(
      subtasks,
      mockTimeSlots,
      [],
      [],
      {
        startDate: new Date('2025-07-30'),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );

    expect(result.success).toBe(true);
    expect(result.scheduledSubtasks).toHaveLength(2);
    
    // 應該只包含第一和第三個任務
    const scheduledIds = result.scheduledSubtasks.map(s => s.subtaskId);
    expect(scheduledIds).toEqual(['1', '3']);
  });

  test('應該處理用戶自定義時長', () => {
    const subtasks = createTestSubtasks();
    // 設置用戶覆寫時長
    subtasks[0].userEstimatedDuration = 45;
    
    const result = scheduleSubtasks(
      subtasks,
      mockTimeSlots,
      [],
      [],
      {
        startDate: new Date('2025-07-30'),
        startNextDay: true,
        maxDaysToSearch: 7
      }
    );

    expect(result.success).toBe(true);
    // 應該使用用戶設定的時長而不是 AI 估計
    expect(result.scheduledSubtasks[0].duration).toBe(45);
  });
});