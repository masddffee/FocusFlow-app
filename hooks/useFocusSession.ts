import { useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { TaskInfo } from './useTaskInfo';
import { useTaskStore } from '@/store/taskStore';
import { useStatsStore } from '@/store/statsStore';
import { useTimerStore } from '@/store/timerStore';

// Import Haptics for vibration with web compatibility
let Haptics: any = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
    // Haptics not available
  }
}

/**
 * useFocusSession Hook 參數
 */
export interface UseFocusSessionParams {
  taskInfo: TaskInfo | null;
  currentTime: number;
  targetTime: number;
  t: TFunction;
}

/**
 * useFocusSession Hook 返回值
 */
export interface UseFocusSessionReturn {
  handleSessionComplete: () => void;
}

/**
 * 從 focus.tsx 提取的 handleSessionComplete 邏輯
 *
 * @description Session 完成處理 - 包含子任務進度更新
 * @param params - Hook 參數
 * @returns { handleSessionComplete } - Session 完成處理函數
 *
 * @example
 * ```tsx
 * const { handleSessionComplete } = useFocusSession({
 *   taskInfo,
 *   currentTime,
 *   targetTime,
 *   t
 * });
 * ```
 */
export function useFocusSession({
  taskInfo,
  currentTime,
  targetTime,
  t,
}: UseFocusSessionParams): UseFocusSessionReturn {
  const { addSession } = useStatsStore();
  const { resetTimer } = useTimerStore();

  /**
   * 處理 Session 完成
   */
  const handleSessionComplete = useCallback(() => {
    try {
      // Vibrate on completion (mobile only)
      if (Platform.OS !== 'web' && Haptics) {
        try {
          Haptics.selectionAsync();
        } catch (error) {
          // Haptics failed silently
        }
      }

      // Add session to stats
      addSession(targetTime);

      // 更新子任務進度
      if (taskInfo?.isSubtask && taskInfo.mainTaskId && taskInfo.subtaskId) {
        const { updateSubtaskProgress } = useTaskStore.getState();
        const actualMinutes = Math.floor(targetTime / 60); // 轉換為分鐘

        try {
          updateSubtaskProgress(
            taskInfo.mainTaskId,
            taskInfo.subtaskId,
            actualMinutes,
            `Focus session completed: ${actualMinutes}min on ${new Date().toLocaleDateString()}`
          );
        } catch (progressError) {
          // Progress update failed
        }
      }

      // Show completion alert and navigate to feedback
      Alert.alert(
        t('focus.sessionComplete'),
        t('focus.sessionCompleteMessage'),
        [
          {
            text: t('focus.skipFeedback'),
            style: 'cancel',
            onPress: () => router.back(),
          },
          {
            text: t('focus.recordLearning'),
            onPress: () => {
              router.push({
                pathname: '/learning-feedback',
                params: {
                  taskId: taskInfo?.id || '',
                  duration: targetTime.toString(),
                  isSubtask: taskInfo?.isSubtask ? 'true' : 'false',
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      // Still navigate back even if there's an error
      router.back();
    }
  }, [targetTime, addSession, taskInfo, t]);

  return {
    handleSessionComplete,
  };
}
