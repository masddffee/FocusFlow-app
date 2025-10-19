import { Task, EnhancedSubtask } from "@/types/task";
import { TimeSlot, DayTimeSlots, ScheduledTask, CalendarEvent, DayOfWeek } from "@/types/timeSlot";
import { calculateDaysUntil } from "@/utils/timeUtils";
import { log } from "@/lib/logger";

// 🔧 核心修復：簡化的排程選項
interface SchedulingOptions {
  startDate?: Date;
  startNextDay?: boolean; // 是否從隔天開始
  maxDaysToSearch?: number;
}

export interface SubtaskSchedule {
  subtaskId: string;
  subtaskTitle: string;
  date: string;
  timeSlot: TimeSlot;
  duration: number;
  order: number;
}

export interface SchedulingResult {
  success: boolean;
  scheduledSubtasks: SubtaskSchedule[];
  unscheduledSubtasks: string[];
  message: string;
  totalScheduledMinutes?: number;
  completionDate?: string;
}

// 🆕 新增：排程可行性分析介面
export interface SchedulingFeasibilityAnalysis {
  isFeasible: boolean;
  totalRequiredMinutes: number;
  totalAvailableMinutes: number;
  conflictingSubtasks: string[];
  suggestedAdjustments: string[];
  feasibilityScore: number; // 0-1 分數
}

// 🆕 新增：排程建議介面
export interface SchedulingSuggestions {
  shouldProceed: boolean;
  userMessage: string;
  alternatives: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export function timeToMinutes(time: string): number {
  try {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    log.error("Time to minutes error:", error);
    return 0;
  }
}

export function minutesToTime(minutes: number): string {
  try {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  } catch (error) {
    log.error("Minutes to time error:", error);
    return "00:00";
  }
}

export function getDayOfWeek(date: Date): DayOfWeek {
  try {
    const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[date.getDay()];
  } catch (error) {
    log.error("Get day of week error:", error);
    return "monday";
  }
}

export function getDateString(date: Date): string {
  try {
    return date.toISOString().split("T")[0];
  } catch (error) {
    log.error("Get date string error:", error);
    return new Date().toISOString().split("T")[0];
  }
}

export function addDays(date: Date, days: number): Date {
  try {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  } catch (error) {
    log.error("Add days error:", error);
    return new Date();
  }
}

// 🔧 關鍵修復：簡化的獲取子任務時長函數
function getSubtaskDuration(subtask: EnhancedSubtask): number {
  // 優先使用 user override，然後 AI estimation，最後 fallback
  return subtask.userEstimatedDuration || 
         subtask.aiEstimatedDuration || 
         subtask.estimatedDuration || 
         30; // 預設 30 分鐘
}

// 🔧 關鍵修復：簡化的排程函數
export function scheduleSubtasks(
  subtasks: EnhancedSubtask[],
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[] = [],
  calendarEvents: CalendarEvent[] = [],
  options: SchedulingOptions = {}
): SchedulingResult {
  try {
    // 🔧 修復核心問題：確保從隔天開始排程
    const startDate = options.startDate || new Date();
    const actualStartDate = options.startNextDay 
      ? addDays(startDate, 1) // 確保從隔天開始
      : startDate;
    
    const maxDaysToSearch = options.maxDaysToSearch || 14;

    // 🔧 核心修復：嚴格按照 order 欄位排序，保持 AI 生成的原始順序
    const sortedSubtasks = [...subtasks]
      .filter(subtask => !subtask.completed) // 只排程未完成的子任務
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // 升序，保持原始順序

    const scheduledSubtasks: SubtaskSchedule[] = [];
    const unscheduledSubtasks: string[] = [];

    // 複製現有排程任務列表以追蹤衝突
    const occupiedSlots: ScheduledTask[] = [...existingScheduledTasks];

    // 為每個子任務尋找時間槽
    for (const subtask of sortedSubtasks) {
      const duration = getSubtaskDuration(subtask);
      let scheduled = false;

      // 在指定日期範圍內尋找可用時間槽
      for (let dayOffset = 0; dayOffset < maxDaysToSearch && !scheduled; dayOffset++) {
        const targetDate = addDays(actualStartDate, dayOffset);
        const dateString = getDateString(targetDate);
        const dayOfWeek = getDayOfWeek(targetDate);
        
        // 獲取該日可用時間槽
        const daySlots = availableTimeSlots[dayOfWeek] || [];
        
        for (const slot of daySlots) {
          // 檢查時間槽是否足夠容納此子任務
          const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
          if (slotDuration < duration) continue;

          // 檢查是否與現有任務衝突
          const hasConflict = occupiedSlots.some(existingTask => {
            if (existingTask.date !== dateString) return false;
            
            const existingStart = timeToMinutes(existingTask.timeSlot.start);
            const existingEnd = timeToMinutes(existingTask.timeSlot.end);
            const newStart = timeToMinutes(slot.start);
            const newEnd = Math.min(timeToMinutes(slot.end), newStart + duration);
            
            return (newStart < existingEnd && newEnd > existingStart);
          });

          // 檢查是否與日曆事件衝突
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
            // 找到可用時間槽，進行排程
            const scheduleEntry: SubtaskSchedule = {
              subtaskId: subtask.id,
              subtaskTitle: subtask.title || subtask.text,
              date: dateString,
              timeSlot: {
                start: slot.start,
                end: minutesToTime(Math.min(timeToMinutes(slot.end), timeToMinutes(slot.start) + duration))
              },
              duration: duration,
              order: subtask.order || 0
            };

            scheduledSubtasks.push(scheduleEntry);

            // 添加到已佔用槽位列表
            occupiedSlots.push({
              taskId: `subtask-${subtask.id}`,
              date: dateString,
              timeSlot: scheduleEntry.timeSlot,
              duration: duration
            });

            scheduled = true;
            break;
          }
        }
      }

      if (!scheduled) {
        unscheduledSubtasks.push(subtask.id);
      }
    }

    const success = unscheduledSubtasks.length === 0;
    const message = success 
      ? `成功排程 ${scheduledSubtasks.length} 個子任務`
      : `成功排程 ${scheduledSubtasks.length} 個子任務，${unscheduledSubtasks.length} 個子任務無法安排`;

    return {
      success,
      scheduledSubtasks,
      unscheduledSubtasks,
      message
    };

  } catch (error) {
    log.error("Schedule subtasks error:", error);
    return {
      success: false,
      scheduledSubtasks: [],
      unscheduledSubtasks: subtasks.map(s => s.id),
      message: "排程過程發生錯誤"
    };
  }
}

// 🔧 轉換子任務排程為任務格式的輔助函數
export function convertSubtaskSchedulesToTasks(
  schedules: SubtaskSchedule[],
  parentTaskId: string
): ScheduledTask[] {
  return schedules.map(schedule => ({
    id: `${parentTaskId}-${schedule.subtaskId}`,
    taskId: schedule.subtaskId,
    title: schedule.subtaskTitle,
    date: schedule.date,
    timeSlot: schedule.timeSlot,
    duration: schedule.duration
  }));
}

// 保留原有函數以維持兼容性
export function findAvailableTimeSlot(
  task: Task,
  availableTimeSlots: DayTimeSlots,
  existingTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[] = []
): ScheduledTask | null {
  try {
    const duration = task.duration || 60;
    const startDate = task.createdAt ? new Date(task.createdAt) : new Date();
    const searchStartDate = addDays(startDate, 1); // 從隔天開始尋找

    const maxDaysToSearch = task.dueDate 
      ? Math.max(1, calculateDaysUntil(task.dueDate) - 1)
      : 14;

    for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
      const targetDate = addDays(searchStartDate, dayOffset);
      const dateString = getDateString(targetDate);
      const dayOfWeek = getDayOfWeek(targetDate);
      
      const daySlots = availableTimeSlots[dayOfWeek] || [];
      
      for (const slot of daySlots) {
        const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
        if (slotDuration < duration) continue;

        // 檢查衝突
        const hasConflict = existingTasks.some(existingTask => {
          if (existingTask.date !== dateString) return false;
          
          const existingStart = timeToMinutes(existingTask.timeSlot.start);
          const existingEnd = timeToMinutes(existingTask.timeSlot.end);
          const newStart = timeToMinutes(slot.start);
          const newEnd = Math.min(timeToMinutes(slot.end), newStart + duration);
          
          return (newStart < existingEnd && newEnd > existingStart);
        });

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
          return {
            taskId: task.id,
            date: dateString,
            timeSlot: {
              start: slot.start,
              end: minutesToTime(Math.min(timeToMinutes(slot.end), timeToMinutes(slot.start) + duration))
            },
            duration: duration
          };
        }
      }
    }

    return null;
  } catch (error) {
    log.error("Find available time slot error:", error);
    return null;
  }
}

export function calculateTaskPriority(task: Task): number {
  try {
    let priority = 0;
    
    // Due date urgency
    if (task.dueDate) {
      const daysUntil = calculateDaysUntil(task.dueDate);
      if (daysUntil <= 1) priority += 100;
      else if (daysUntil <= 3) priority += 60;
      else if (daysUntil <= 7) priority += 30;
      else priority += 10;
    }
    
    // Duration consideration
    if (task.duration) {
      if (task.duration >= 120) priority += 25;
      else if (task.duration >= 60) priority += 15;
      else priority += 10;
    }
    
    // Explicit priority
    if (task.priority === "high") priority += 40;
    else if (task.priority === "medium") priority += 20;
    else if (task.priority === "low") priority += 5;
    
    return priority;
  } catch (error) {
    log.error("Calculate task priority error:", error);
    return 0;
  }
}

export function scheduleMultipleTasks(
  tasks: Task[],
  availableTimeSlots: DayTimeSlots,
  existingTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[] = []
): ScheduledTask[] {
  try {
    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => 
      calculateTaskPriority(b) - calculateTaskPriority(a)
    );
    
    const scheduledTasks: ScheduledTask[] = [...existingTasks];
    const newScheduledTasks: ScheduledTask[] = [];
    
    for (const task of sortedTasks) {
      // Skip if task is already scheduled
      if (scheduledTasks.some(st => st.taskId === task.id)) {
        continue;
      }
      
      const scheduledTask = findAvailableTimeSlot(
        task,
        availableTimeSlots,
        scheduledTasks,
        calendarEvents
      );
      
      if (scheduledTask) {
        scheduledTasks.push(scheduledTask);
        newScheduledTasks.push(scheduledTask);
      }
    }
    
    return newScheduledTasks;
  } catch (error) {
    log.error("Schedule multiple tasks error:", error);
    return [];
  }
}

export function rescheduleConflictingTasks(
  calendarEvents: CalendarEvent[],
  scheduledTasks: ScheduledTask[],
  availableTimeSlots: DayTimeSlots,
  tasks: Task[]
): ScheduledTask[] {
  try {
    const conflictingTasks: ScheduledTask[] = [];
    const nonConflictingTasks: ScheduledTask[] = [];
    
    // Identify conflicting tasks
    for (const scheduledTask of scheduledTasks) {
      const hasConflict = calendarEvents.some(event => {
        if (event.isAllDay) return false;
        
        const eventDate = getDateString(event.start);
        if (eventDate !== scheduledTask.date) return false;
        
        const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
        const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();
        const taskStart = timeToMinutes(scheduledTask.timeSlot.start);
        const taskEnd = timeToMinutes(scheduledTask.timeSlot.end);
        
        return (
          (taskStart >= eventStart && taskStart < eventEnd) ||
          (taskEnd > eventStart && taskEnd <= eventEnd) ||
          (taskStart <= eventStart && taskEnd >= eventEnd)
        );
      });
      
      if (hasConflict) {
        conflictingTasks.push(scheduledTask);
      } else {
        nonConflictingTasks.push(scheduledTask);
      }
    }
    
    // Reschedule conflicting tasks
    const tasksToReschedule = conflictingTasks
      .map(st => tasks.find(t => t.id === st.taskId))
      .filter(Boolean) as Task[];
    
    const rescheduledTasks = scheduleMultipleTasks(
      tasksToReschedule,
      availableTimeSlots,
      nonConflictingTasks,
      calendarEvents
    );
    
    return [...nonConflictingTasks, ...rescheduledTasks];
  } catch (error) {
    log.error("Reschedule conflicting tasks error:", error);
    return scheduledTasks;
  }
}

// 🆕 新增：排程可行性分析函數
export function analyzeSchedulingFeasibility(
  task: Task,
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[],
  options: {
    startDate: Date;
    maxDaysToSearch: number;
    bufferBetweenSubtasks?: number;
    respectPhaseOrder?: boolean;
    dailyMaxHours?: number | null;
  }
): SchedulingFeasibilityAnalysis {
  try {
    const { startDate, maxDaysToSearch, bufferBetweenSubtasks = 5, dailyMaxHours } = options;
    const subtasks = task.subtasks || [];
    
    // 計算總需求時間
    const totalRequiredMinutes = subtasks.reduce((total, subtask) => {
      return total + getSubtaskDuration(subtask);
    }, 0);
    
    // 計算總可用時間
    let totalAvailableMinutes = 0;
    for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
      const targetDate = addDays(startDate, dayOffset);
      const dayOfWeek = getDayOfWeek(targetDate);
      const daySlots = availableTimeSlots[dayOfWeek] || [];
      
      for (const slot of daySlots) {
        const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
        totalAvailableMinutes += slotDuration;
      }
      
      // 如果有每日最大小時限制
      if (dailyMaxHours) {
        const maxDailyMinutes = dailyMaxHours * 60;
        const dayTotal = daySlots.reduce((total, slot) => {
          return total + (timeToMinutes(slot.end) - timeToMinutes(slot.start));
        }, 0);
        if (dayTotal > maxDailyMinutes) {
          totalAvailableMinutes -= (dayTotal - maxDailyMinutes);
        }
      }
    }
    
    // 分析衝突子任務
    const conflictingSubtasks: string[] = [];
    const suggestedAdjustments: string[] = [];
    
    // 基本可行性檢查
    const basicFeasibility = totalAvailableMinutes >= totalRequiredMinutes;
    
    if (!basicFeasibility) {
      const shortfallHours = Math.ceil((totalRequiredMinutes - totalAvailableMinutes) / 60);
      suggestedAdjustments.push(`需要額外 ${shortfallHours} 小時的可用時間`);
      suggestedAdjustments.push('考慮延長截止日期');
      suggestedAdjustments.push('減少子任務數量或縮短時長');
    }
    
    // 計算可行性分數
    const feasibilityScore = Math.min(1, totalAvailableMinutes / totalRequiredMinutes);
    
    // 進階分析：模擬實際排程
    const mockSchedulingResult = scheduleSubtasks(
      subtasks,
      availableTimeSlots,
      existingScheduledTasks,
      calendarEvents,
      { startDate, maxDaysToSearch }
    );
    
    const isFeasible = mockSchedulingResult.success && feasibilityScore >= 0.8;
    
    if (!isFeasible) {
      conflictingSubtasks.push(...mockSchedulingResult.unscheduledSubtasks);
      
      if (mockSchedulingResult.unscheduledSubtasks.length > 0) {
        suggestedAdjustments.push('增加每日可用學習時間');
        suggestedAdjustments.push('調整時間槽設定');
      }
    }
    
    return {
      isFeasible,
      totalRequiredMinutes,
      totalAvailableMinutes,
      conflictingSubtasks,
      suggestedAdjustments,
      feasibilityScore
    };
    
  } catch (error) {
    log.error("Analyze scheduling feasibility error:", error);
    return {
      isFeasible: false,
      totalRequiredMinutes: 0,
      totalAvailableMinutes: 0,
      conflictingSubtasks: [],
      suggestedAdjustments: ['系統分析錯誤，請稍後重試'],
      feasibilityScore: 0
    };
  }
}

// 🆕 新增：生成排程建議函數
export function generateSchedulingSuggestions(
  analysis: SchedulingFeasibilityAnalysis,
  task: Task
): SchedulingSuggestions {
  try {
    const { isFeasible, feasibilityScore, totalRequiredMinutes, totalAvailableMinutes, suggestedAdjustments } = analysis;
    
    let shouldProceed = true;
    let userMessage = '';
    let alternatives: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (!isFeasible) {
      shouldProceed = false;
      riskLevel = 'high';
      
      const requiredHours = Math.ceil(totalRequiredMinutes / 60);
      const availableHours = Math.floor(totalAvailableMinutes / 60);
      
      userMessage = `無法完全排程此任務。需要 ${requiredHours} 小時，但只有 ${availableHours} 小時可用。\n\n建議調整：\n${suggestedAdjustments.map(adj => `• ${adj}`).join('\n')}`;
      
      alternatives = [
        '延長任務截止日期',
        '增加每日可用時間',
        '將任務拆分為較小部分',
        '調整子任務時長估計',
        '暫時跳過部分子任務'
      ];
      
    } else if (feasibilityScore < 0.9) {
      riskLevel = 'medium';
      
      userMessage = `排程略顯緊湊（${Math.round(feasibilityScore * 100)}% 可行性）。建議調整以獲得更好的排程彈性。\n\n${suggestedAdjustments.length > 0 ? '建議：\n' + suggestedAdjustments.map(adj => `• ${adj}`).join('\n') : ''}`;
      
      alternatives = [
        '稍微延長截止日期以增加彈性',
        '適度增加每日學習時間',
        '預留緩衝時間應對意外狀況'
      ];
      
    } else {
      riskLevel = 'low';
      userMessage = `排程可行性良好（${Math.round(feasibilityScore * 100)}%）。系統將自動為您安排最佳時間。`;
      alternatives = [];
    }
    
    return {
      shouldProceed,
      userMessage,
      alternatives,
      riskLevel
    };
    
  } catch (error) {
    log.error("Generate scheduling suggestions error:", error);
    return {
      shouldProceed: false,
      userMessage: '無法分析排程建議，請稍後重試。',
      alternatives: [],
      riskLevel: 'high'
    };
  }
}