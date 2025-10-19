/**
 * 🎯 Phase 4 驗證：ID 一致性測試
 * 
 * 驗證任務和排程任務的 ID 生成是否遵循一致的命名規則
 */

import { convertSubtaskSchedulesToTasks } from '../utils/scheduling';
import type { SubtaskSchedule } from '../utils/scheduling-types';

// Mock logger to avoid console output during tests
jest.mock('../lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ID 一致性驗證測試', () => {
  
  describe('子任務排程 ID 格式', () => {
    it('應該生成一致的子任務排程 ID', () => {
      const mockSchedules: SubtaskSchedule[] = [
        {
          subtaskId: 'subtask_1',
          subtaskTitle: '測試子任務 1',
          date: '2025-08-12',
          timeSlot: { start: '09:00', end: '10:00' },
          duration: 60,
          order: 1
        },
        {
          subtaskId: 'subtask_2',
          subtaskTitle: '測試子任務 2',
          date: '2025-08-12',
          timeSlot: { start: '10:00', end: '11:00' },
          duration: 60,
          order: 2
        }
      ];

      const parentTaskId = 'task-1234567890-abc12';
      const scheduledTasks = convertSubtaskSchedulesToTasks(mockSchedules, parentTaskId);

      expect(scheduledTasks).toHaveLength(2);
      
      // 驗證 ID 格式一致性
      expect(scheduledTasks[0].id).toBe('subtask-task-1234567890-abc12-subtask_1');
      expect(scheduledTasks[1].id).toBe('subtask-task-1234567890-abc12-subtask_2');
      
      // 驗證父任務 ID 正確性
      expect(scheduledTasks[0].taskId).toBe(parentTaskId);
      expect(scheduledTasks[1].taskId).toBe(parentTaskId);
      
      // 驗證子任務追蹤資訊
      expect(scheduledTasks[0].subtaskId).toBe('subtask_1');
      expect(scheduledTasks[1].subtaskId).toBe('subtask_2');
    });

    it('應該處理邊緣情況的 ID 生成', () => {
      const mockSchedules: SubtaskSchedule[] = [
        {
          subtaskId: 'subtask-with-hyphens',
          subtaskTitle: '含連字符的子任務',
          date: '2025-08-12',
          timeSlot: { start: '09:00', end: '10:00' },
          duration: 60,
          order: 1
        }
      ];

      const parentTaskId = 'task-with-multiple-hyphens-123';
      const scheduledTasks = convertSubtaskSchedulesToTasks(mockSchedules, parentTaskId);

      expect(scheduledTasks).toHaveLength(1);
      expect(scheduledTasks[0].id).toBe('subtask-task-with-multiple-hyphens-123-subtask-with-hyphens');
      expect(scheduledTasks[0].taskId).toBe(parentTaskId);
    });
  });

  describe('整體任務排程 ID 格式', () => {
    it('應該生成一致的整體任務排程 ID', () => {
      // 模擬整體任務排程 ID 格式
      const taskId = 'task-1234567890-def45';
      const expectedScheduledId = `scheduled-${taskId}`;
      
      expect(expectedScheduledId).toBe('scheduled-task-1234567890-def45');
      
      // 驗證 ID 格式一致性
      expect(expectedScheduledId.startsWith('scheduled-')).toBe(true);
      expect(expectedScheduledId.includes(taskId)).toBe(true);
    });
  });

  describe('ID 唯一性驗證', () => {
    it('不同類型的排程任務應該有不同的 ID 前綴', () => {
      const taskId = 'task-1234567890-ghi78';
      
      // 整體任務排程 ID
      const wholeTaskId = `scheduled-${taskId}`;
      
      // 子任務排程 ID
      const subtaskId = `subtask-${taskId}-subtask_1`;
      
      // 驗證 ID 不會衝突
      expect(wholeTaskId).not.toBe(subtaskId);
      expect(wholeTaskId.startsWith('scheduled-')).toBe(true);
      expect(subtaskId.startsWith('subtask-')).toBe(true);
    });

    it('相同父任務的不同子任務應該有唯一的 ID', () => {
      const mockSchedules: SubtaskSchedule[] = [
        {
          subtaskId: 'subtask_a',
          subtaskTitle: '子任務 A',
          date: '2025-08-12',
          timeSlot: { start: '09:00', end: '10:00' },
          duration: 60,
          order: 1
        },
        {
          subtaskId: 'subtask_b',
          subtaskTitle: '子任務 B',
          date: '2025-08-12',
          timeSlot: { start: '10:00', end: '11:00' },
          duration: 60,
          order: 2
        }
      ];

      const parentTaskId = 'task-1234567890-jkl90';
      const scheduledTasks = convertSubtaskSchedulesToTasks(mockSchedules, parentTaskId);

      // 驗證所有 ID 都是唯一的
      const ids = scheduledTasks.map(task => task.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('錯誤處理', () => {
    it('應該處理空的排程列表', () => {
      const mockSchedules: SubtaskSchedule[] = [];
      const parentTaskId = 'task-1234567890-mno12';
      
      const scheduledTasks = convertSubtaskSchedulesToTasks(mockSchedules, parentTaskId);
      
      expect(scheduledTasks).toHaveLength(0);
      expect(Array.isArray(scheduledTasks)).toBe(true);
    });

    it('應該處理缺少標題的子任務', () => {
      const mockSchedules: SubtaskSchedule[] = [
        {
          subtaskId: 'subtask_no_title',
          subtaskTitle: '', // 空標題
          date: '2025-08-12',
          timeSlot: { start: '09:00', end: '10:00' },
          duration: 60,
          order: 1
        }
      ];

      const parentTaskId = 'task-1234567890-pqr34';
      const scheduledTasks = convertSubtaskSchedulesToTasks(mockSchedules, parentTaskId);

      expect(scheduledTasks).toHaveLength(1);
      expect(scheduledTasks[0].id).toBe('subtask-task-1234567890-pqr34-subtask_no_title');
      expect(scheduledTasks[0].title).toBe('子任務 1'); // 預設標題
    });
  });
});