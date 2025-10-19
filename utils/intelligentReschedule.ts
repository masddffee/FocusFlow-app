import { Task } from "@/types/task";
import { TimeSlot, DayTimeSlots, ScheduledTask, CalendarEvent } from "@/types/timeSlot";
import { log } from "@/lib/logger";
import { 
  timeToMinutes, 
  minutesToTime, 
  addDays, 
  getDateString, 
  getDayOfWeek, 
  calculateTaskPriority 
} from "@/utils/scheduling-utils";
import { IntelligentRescheduleResult, RescheduleOptions } from "@/utils/scheduling-types";

/**
 * 智能重新排程與驗證函數
 * 為逾期或衝突的任務尋找新的時間槽
 */
export function intelligentRescheduleWithValidation(
  task: Task & { originalDuration?: number },
  existingScheduledTasks: ScheduledTask[],
  availableTimeSlots: DayTimeSlots,
  calendarEvents: CalendarEvent[] = [],
  options: RescheduleOptions = {}
): IntelligentRescheduleResult {
  try {
    const {
      prioritizeUrgency = true,
      maxDaysToSearch = 14,
      preferredTimeOfDay = 'any',
      considerTaskDifficulty = true
    } = options;

    const duration = task.duration || 60;
    const startDate = new Date();
    const taskPriority = calculateTaskPriority(task);

    // 計算截止日期限制
    let searchDaysLimit = maxDaysToSearch;
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      searchDaysLimit = Math.min(maxDaysToSearch, Math.max(1, daysUntilDue - 1));
    }

    log.info(`[智能排程] 開始: ${task.title}, 搜尋範圍: ${searchDaysLimit} 天`);

    // 尋找最佳時間槽
    const bestSlot = findBestAvailableSlot(
      duration,
      availableTimeSlots,
      existingScheduledTasks,
      calendarEvents,
      searchDaysLimit,
      preferredTimeOfDay,
      taskPriority
    );

    if (bestSlot) {
      log.info(`[智能排程] 找到最佳時間槽: ${bestSlot.date} ${bestSlot.timeSlot.start}-${bestSlot.timeSlot.end}`);
      return {
        success: true,
        newSlot: bestSlot,
        explanation: `成功為任務「${task.title}」找到新的時間槽`,
        suggestions: generateRescheduleSuggestions(task, bestSlot),
      };
    } else {
      log.warn(`[智能排程] 無法找到合適時間槽: ${task.title}`);
      return {
        success: false,
        explanation: `無法在 ${searchDaysLimit} 天內為任務「${task.title}」找到合適的時間槽`,
        suggestions: [
          "考慮延長任務截止日期",
          "減少任務時長",
          "增加可用的學習時間段",
          "將任務分割為更小的子任務"
        ],
        reason: "NO_AVAILABLE_SLOTS"
      };
    }

  } catch (error) {
    log.error(`[智能排程] 錯誤:`, error);
    return {
      success: false,
      explanation: "重新排程過程發生錯誤",
      suggestions: ["請稍後再試或聯繫技術支援"],
      reason: "SYSTEM_ERROR"
    };
  }
}

/**
 * 尋找最佳可用時間槽
 */
function findBestAvailableSlot(
  duration: number,
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[],
  maxDays: number,
  preferredTimeOfDay: string,
  taskPriority: number
): { date: string; timeSlot: TimeSlot; duration: number } | null {
  
  const candidates: Array<{
    date: string;
    timeSlot: TimeSlot;
    duration: number;
    score: number;
  }> = [];

  // 搜尋未來的日期
  for (let dayOffset = 1; dayOffset <= maxDays; dayOffset++) {
    const targetDate = addDays(new Date(), dayOffset);
    const dateString = getDateString(targetDate);
    const dayOfWeek = getDayOfWeek(targetDate);
    
    const daySlots = availableTimeSlots[dayOfWeek] || [];
    
    for (const slot of daySlots) {
      const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
      if (slotDuration < duration) continue;

      // 檢查與已排程任務的衝突
      const hasConflict = existingScheduledTasks.some(existingTask => {
        if (existingTask.date !== dateString) return false;
        
        const existingStart = timeToMinutes(existingTask.timeSlot.start);
        const existingEnd = timeToMinutes(existingTask.timeSlot.end);
        const newStart = timeToMinutes(slot.start);
        const newEnd = Math.min(timeToMinutes(slot.end), newStart + duration);
        
        return (newStart < existingEnd && newEnd > existingStart);
      });

      // 檢查與日曆事件的衝突
      const hasCalendarConflict = calendarEvents.some(event => {
        if (event.isAllDay) return false;
        const eventDate = getDateString(event.start);
        if (eventDate !== dateString) return false;
        
        const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
        const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();
        const taskStart = timeToMinutes(slot.start);
        const taskEnd = Math.min(timeToMinutes(slot.end), taskStart + duration);
        
        return (taskStart < eventEnd && taskEnd > eventStart);
      });

      if (!hasConflict && !hasCalendarConflict) {
        const score = calculateSlotScore(slot, dayOffset, preferredTimeOfDay, taskPriority);
        candidates.push({
          date: dateString,
          timeSlot: {
            start: slot.start,
            end: minutesToTime(Math.min(timeToMinutes(slot.end), timeToMinutes(slot.start) + duration))
          },
          duration: duration,
          score
        });
      }
    }
  }

  // 選擇評分最高的時間槽
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      date: best.date,
      timeSlot: best.timeSlot,
      duration: best.duration
    };
  }

  return null;
}

/**
 * 計算時間槽評分
 */
function calculateSlotScore(
  slot: TimeSlot,
  dayOffset: number,
  preferredTimeOfDay: string,
  taskPriority: number
): number {
  let score = 100;

  // 日期偏好（越早越好）
  score -= dayOffset * 5;

  // 時間偏好評分
  const startHour = parseInt(slot.start.split(':')[0]);
  if (preferredTimeOfDay === 'morning' && startHour >= 6 && startHour < 12) {
    score += 20;
  } else if (preferredTimeOfDay === 'afternoon' && startHour >= 12 && startHour < 18) {
    score += 20;
  } else if (preferredTimeOfDay === 'evening' && startHour >= 18 && startHour < 22) {
    score += 20;
  }

  // 避免過早或過晚的時間
  if (startHour < 7 || startHour > 22) {
    score -= 30;
  }

  // 任務優先級加權
  score += taskPriority * 0.1;

  return score;
}

/**
 * 生成重新排程建議
 */
function generateRescheduleSuggestions(
  task: Task,
  newSlot: { date: string; timeSlot: TimeSlot; duration: number }
): string[] {
  const suggestions = [];
  
  const startHour = parseInt(newSlot.timeSlot.start.split(':')[0]);
  
  if (startHour < 8) {
    suggestions.push("建議調整作息以適應較早的學習時間");
  } else if (startHour > 20) {
    suggestions.push("注意晚間學習時的專注度和休息時間");
  }
  
  if (newSlot.duration >= 120) {
    suggestions.push("長時間學習建議每 45-60 分鐘休息一次");
  }
  
  if (task.difficulty === 'hard') {
    suggestions.push("困難任務建議安排在精神狀態最佳的時段");
  }

  if (startHour >= 9 && startHour <= 11) {
    suggestions.push("上午時段通常是注意力最集中的時間");
  }

  return suggestions;
}