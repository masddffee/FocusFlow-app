import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from '@/types/task';
import { getSubtaskTotalDuration, getSubtaskRemainingTime } from '@/utils/subtaskProgress';

/**
 * 任務信息接口
 */
export interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  isSubtask: boolean;
  isSegmented: boolean;
  segmentIndex: string | null;
  mainTaskId?: string;
  subtaskId?: string;
  mainTaskTitle?: string;
  subtaskTitle?: string;
  phase?: string;
  difficulty?: string;
  totalDuration: number; // 分鐘
  remainingTime: number; // 分鐘
  timeSpent: number; // 分鐘
  progressPercentage: number;
  suggestedDuration: number; // 分鐘
  suggestedDurationSeconds: number; // 秒
  completed: boolean;
  lastSessionTime?: number;
  sessionHistory?: any[];
}

/**
 * useTaskInfo Hook 參數
 */
export interface UseTaskInfoParams {
  taskId?: string;
  tasks: Task[];
  duration?: string;
}

/**
 * 從 focus.tsx 提取的 calculateTaskInfo 邏輯
 *
 * @description 智能獲取任務信息和計算正確的時長
 * @param params - Hook 參數
 * @returns taskInfo - 任務信息對象，如果任務不存在則返回 null
 *
 * @example
 * ```tsx
 * const taskInfo = useTaskInfo({ taskId, tasks, duration });
 * ```
 */
export function useTaskInfo({ taskId, tasks, duration }: UseTaskInfoParams): TaskInfo | null {
  const { t } = useTranslation();
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);

  /**
   * 計算任務信息
   */
  const calculateTaskInfo = useCallback((): TaskInfo | null => {
    if (!taskId) return null;

    // 檢查是否為子任務（包含下劃線）
    if (taskId.includes('_')) {
      // 解析子任務 ID
      const parts = taskId.split('_');
      let mainTaskId: string;
      let subtaskId: string;
      let isSegmented = false;
      let segmentIndex: string | null = null;

      // 智能解析子任務 ID 格式
      if (parts.length === 2) {
        // 簡單格式: mainTaskId_subtaskId
        [mainTaskId, subtaskId] = parts;
      } else if (parts.includes('segment')) {
        // 分段格式: mainTaskId_subtaskId_segment_index
        const segmentPos = parts.indexOf('segment');
        mainTaskId = parts[0];
        subtaskId = parts.slice(1, segmentPos).join('_');
        isSegmented = true;
        segmentIndex = parts[segmentPos + 1];
      } else {
        // 複雜格式: 取第一個作為主任務ID，其餘組合為子任務ID
        mainTaskId = parts[0];
        subtaskId = parts.slice(1).join('_');
      }

      const mainTask = tasks.find(t => t.id === mainTaskId);
      if (!mainTask || !mainTask.subtasks) {
        return null;
      }

      const subtask = mainTask.subtasks.find(s => s.id === subtaskId);
      if (!subtask) {
        return null;
      }

      // 計算準確的剩餘時間和總時長
      const totalDuration = getSubtaskTotalDuration(subtask); // 分鐘
      const remainingTime = getSubtaskRemainingTime(subtask); // 分鐘
      const timeSpent = subtask.timeSpent || 0; // 分鐘
      const progressPercentage = totalDuration > 0 ? Math.min(100, Math.round((timeSpent / totalDuration) * 100)) : 0;

      // 計算本次學習建議時長
      let suggestedDuration = remainingTime;

      // 如果有 URL 參數指定時長，使用較小值
      if (duration) {
        const urlDuration = parseInt(duration, 10);
        if (!isNaN(urlDuration) && urlDuration > 0) {
          suggestedDuration = Math.min(remainingTime, Math.floor(urlDuration / 60)); // 轉換秒到分鐘
        }
      }

      // 如果沒有剩餘時間，但允許額外學習
      if (remainingTime <= 0) {
        suggestedDuration = 25; // 預設 25 分鐘額外學習
      }

      const subtaskTitle = subtask.title || subtask.text?.substring(0, 50) || `子任務 ${subtask.order || ''}`;
      let displayTitle = `${mainTask.title}: ${subtaskTitle}`;

      if (isSegmented && segmentIndex) {
        displayTitle += ` (${t('common.part')} ${segmentIndex})`;
      }

      return {
        id: taskId,
        title: displayTitle,
        description: subtask.text || subtask.title,
        isSubtask: true,
        isSegmented,
        segmentIndex,
        mainTaskId,
        subtaskId,
        mainTaskTitle: mainTask.title,
        subtaskTitle,
        phase: subtask.phase,
        difficulty: subtask.difficulty,
        totalDuration, // 分鐘
        remainingTime, // 分鐘
        timeSpent, // 分鐘
        progressPercentage,
        suggestedDuration, // 分鐘
        // 用於 timer 的秒數
        suggestedDurationSeconds: suggestedDuration * 60,
        completed: subtask.completed || false,
        lastSessionTime: subtask.lastSessionTime || 0,
        sessionHistory: subtask.sessionHistory || [],
      };
    } else {
      // 一般任務
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        return null;
      }

      // 計算任務建議時長
      let suggestedDuration = task.duration || 25; // 預設分鐘

      if (duration) {
        const urlDuration = parseInt(duration, 10);
        if (!isNaN(urlDuration) && urlDuration > 0) {
          suggestedDuration = Math.floor(urlDuration / 60); // 轉換秒到分鐘
        }
      }

      return {
        ...task,
        isSubtask: false,
        isSegmented: false,
        segmentIndex: null,
        suggestedDuration, // 分鐘
        suggestedDurationSeconds: suggestedDuration * 60,
        totalDuration: suggestedDuration,
        remainingTime: suggestedDuration,
        timeSpent: 0,
        progressPercentage: 0,
      };
    }
  }, [taskId, tasks, duration, t]);

  /**
   * 初始化任務信息
   */
  useEffect(() => {
    const info = calculateTaskInfo();
    setTaskInfo(info);
  }, [calculateTaskInfo]);

  return taskInfo;
}
