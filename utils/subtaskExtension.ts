import { ScheduledTask, TimeSlot } from "@/types/timeSlot";
import { log } from "@/lib/logger";

/**
 * 子任務延長業務邏輯工具函數
 * 遵循 CLAUDE.md 規範：統一日誌系統、錯誤處理、TypeScript 嚴格模式
 */

export interface ExtensionValidationResult {
  isValid: boolean;
  conflicts: ScheduledTask[];
  warnings: string[];
  suggestions: string[];
}

export interface AvailableSlot {
  start: string;
  end: string;
  actualDuration: number;
}

/**
 * 檢查指定日期和時間段是否與現有排程衝突
 */
export function validateTimeSlotConflict(
  targetDate: string,
  targetTimeSlot: TimeSlot,
  duration: number,
  existingScheduledTasks: ScheduledTask[],
  excludeTaskId?: string
): ExtensionValidationResult {
  try {
    const result: ExtensionValidationResult = {
      isValid: true,
      conflicts: [],
      warnings: [],
      suggestions: []
    };

    // 過濾同一天的排程任務（排除自己）
    const sameDayTasks = existingScheduledTasks.filter(
      task => task.date === targetDate && task.taskId !== excludeTaskId
    );

    const targetStartMinutes = timeToMinutes(targetTimeSlot.start);
    const targetEndMinutes = Math.min(
      timeToMinutes(targetTimeSlot.end),
      targetStartMinutes + duration
    );

    // 檢查每個已存在的任務
    for (const existingTask of sameDayTasks) {
      const existingStartMinutes = timeToMinutes(existingTask.timeSlot.start);
      const existingEndMinutes = timeToMinutes(existingTask.timeSlot.end);

      // 檢查時間重疊
      if (targetStartMinutes < existingEndMinutes && targetEndMinutes > existingStartMinutes) {
        result.isValid = false;
        result.conflicts.push(existingTask);
        
        log.warn(`時間段衝突: ${targetTimeSlot.start}-${minutesToTime(targetEndMinutes)} 與任務 ${existingTask.taskId} (${existingTask.timeSlot.start}-${existingTask.timeSlot.end})`, undefined, '子任務延長');
      }
    }

    // 生成建議
    if (!result.isValid) {
      result.suggestions.push("嘗試選擇其他時間段");
      result.suggestions.push("考慮分割子任務為較短的時間段");
      result.suggestions.push("檢查是否可以調整其他任務的時間");
    }

    // 生成警告
    if (targetStartMinutes < 8 * 60) { // 早於 8:00
      result.warnings.push("選擇的時間可能過早");
    }
    if (targetEndMinutes > 22 * 60) { // 晚於 22:00
      result.warnings.push("選擇的時間可能過晚");
    }

    return result;

  } catch (error) {
    log.error('驗證時間段衝突失敗', error, '子任務延長');
    return {
      isValid: false,
      conflicts: [],
      warnings: ["驗證過程發生錯誤"],
      suggestions: ["請稍後再試或聯繫技術支援"]
    };
  }
}

/**
 * 為指定日期計算所有可用的時間段
 */
export function calculateAvailableTimeSlots(
  targetDate: string,
  requiredDuration: number,
  userAvailableSlots: TimeSlot[],
  existingScheduledTasks: ScheduledTask[],
  excludeTaskId?: string
): AvailableSlot[] {
  try {
    const availableSlots: AvailableSlot[] = [];

    // 過濾同一天的已排程任務（排除自己）
    const sameDayTasks = existingScheduledTasks
      .filter(task => task.date === targetDate && task.taskId !== excludeTaskId)
      .sort((a, b) => timeToMinutes(a.timeSlot.start) - timeToMinutes(b.timeSlot.start));

    for (const userSlot of userAvailableSlots) {
      const slotStartMinutes = timeToMinutes(userSlot.start);
      const slotEndMinutes = timeToMinutes(userSlot.end);
      const totalSlotDuration = slotEndMinutes - slotStartMinutes;

      if (totalSlotDuration < requiredDuration) {
        continue; // 跳過太短的時間段
      }

      // 找出這個時間段內所有衝突的任務
      const conflictingTasks = sameDayTasks.filter(task => {
        const taskStart = timeToMinutes(task.timeSlot.start);
        const taskEnd = timeToMinutes(task.timeSlot.end);
        
        return (taskStart < slotEndMinutes && taskEnd > slotStartMinutes);
      });

      if (conflictingTasks.length === 0) {
        // 整個時間段都可用
        availableSlots.push({
          start: userSlot.start,
          end: userSlot.end,
          actualDuration: Math.min(totalSlotDuration, requiredDuration)
        });
      } else {
        // 找出可用的片段
        const availableFragments = findAvailableFragments(
          slotStartMinutes,
          slotEndMinutes,
          conflictingTasks,
          requiredDuration
        );

        availableSlots.push(...availableFragments);
      }
    }

    log.debug(`計算可用時間段: ${targetDate}, 需要 ${requiredDuration} 分鐘, 找到 ${availableSlots.length} 個可用時段`, undefined, '子任務延長');
    return availableSlots;

  } catch (error) {
    log.error('計算可用時間段失敗', error, '子任務延長');
    return [];
  }
}

/**
 * 在給定時間範圍內找出避開衝突任務的可用片段
 */
function findAvailableFragments(
  slotStartMinutes: number,
  slotEndMinutes: number,
  conflictingTasks: ScheduledTask[],
  requiredDuration: number
): AvailableSlot[] {
  const fragments: AvailableSlot[] = [];
  
  // 按開始時間排序衝突任務
  const sortedConflicts = conflictingTasks.sort(
    (a, b) => timeToMinutes(a.timeSlot.start) - timeToMinutes(b.timeSlot.start)
  );

  let currentStart = slotStartMinutes;

  for (const conflict of sortedConflicts) {
    const conflictStart = timeToMinutes(conflict.timeSlot.start);
    const conflictEnd = timeToMinutes(conflict.timeSlot.end);

    // 檢查衝突任務前是否有足夠空間
    if (currentStart < conflictStart && conflictStart - currentStart >= requiredDuration) {
      fragments.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(conflictStart),
        actualDuration: Math.min(conflictStart - currentStart, requiredDuration)
      });
    }

    // 移動到衝突任務結束後
    currentStart = Math.max(currentStart, conflictEnd);
  }

  // 檢查最後一個衝突任務後是否有足夠空間
  if (currentStart < slotEndMinutes && slotEndMinutes - currentStart >= requiredDuration) {
    fragments.push({
      start: minutesToTime(currentStart),
      end: minutesToTime(slotEndMinutes),
      actualDuration: Math.min(slotEndMinutes - currentStart, requiredDuration)
    });
  }

  return fragments;
}

/**
 * 執行子任務延長操作
 */
export function executeSubtaskExtension(
  taskId: string,
  newDate: string,
  newTimeSlot: TimeSlot,
  duration: number,
  existingTasks: ScheduledTask[],
  onRemoveTask: (taskId: string) => void,
  onAddTask: (task: Omit<ScheduledTask, 'id' | 'title'>) => void
): { success: boolean; message: string; error?: string } {
  try {
    // 驗證新的時間段
    const validationResult = validateTimeSlotConflict(
      newDate,
      newTimeSlot,
      duration,
      existingTasks,
      taskId
    );

    if (!validationResult.isValid) {
      const conflictIds = validationResult.conflicts.map(c => c.taskId).join(", ");
      return {
        success: false,
        message: `時間段衝突，與以下任務重疊: ${conflictIds}`,
        error: "CONFLICT"
      };
    }

    // 移除舊排程
    onRemoveTask(taskId);
    log.debug(`移除舊排程: ${taskId}`, undefined, '子任務延長');

    // 添加新排程
    const newScheduledTask = {
      taskId,
      date: newDate,
      timeSlot: newTimeSlot,
      duration
    };

    onAddTask(newScheduledTask);
    log.debug(`添加新排程: ${taskId} -> ${newDate} ${newTimeSlot.start}-${newTimeSlot.end}`, undefined, '子任務延長');

    return {
      success: true,
      message: `子任務已成功延長到 ${newDate} ${newTimeSlot.start}-${newTimeSlot.end}`
    };

  } catch (error) {
    log.error('執行子任務延長失敗', error, '子任務延長');
    return {
      success: false,
      message: "延長過程發生錯誤，請稍後再試",
      error: "SYSTEM_ERROR"
    };
  }
}

/**
 * 檢查日期是否為有效的未來日期
 */
export function isValidFutureDate(dateString: string): boolean {
  try {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return targetDate > today;
  } catch (error) {
    log.error('日期驗證失敗', error, '子任務延長');
    return false;
  }
}

/**
 * 獲取建議的延長日期（明天、後天、下週）
 */
export function getSuggestedExtensionDates(): { label: string; date: string }[] {
  const suggestions = [];
  const today = new Date();

  // 明天
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  suggestions.push({
    label: "明天",
    date: tomorrow.toISOString().split('T')[0]
  });

  // 後天
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(today.getDate() + 2);
  suggestions.push({
    label: "後天",
    date: dayAfterTomorrow.toISOString().split('T')[0]
  });

  // 下週同一天
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  suggestions.push({
    label: "下週",
    date: nextWeek.toISOString().split('T')[0]
  });

  return suggestions;
}

// 工具函數
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}