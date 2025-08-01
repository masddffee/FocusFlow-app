import { Task, EnhancedSubtask } from "@/types/task";
import { TimeSlot, DayTimeSlots, ScheduledTask, CalendarEvent, DayOfWeek } from "@/types/timeSlot";
import { calculateDaysUntil } from "@/utils/timeUtils";

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
}

export function timeToMinutes(time: string): number {
  try {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error("Time to minutes error:", error);
    return 0;
  }
}

export function minutesToTime(minutes: number): string {
  try {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  } catch (error) {
    console.error("Minutes to time error:", error);
    return "00:00";
  }
}

export function getDayOfWeek(date: Date): DayOfWeek {
  try {
    const days: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[date.getDay()];
  } catch (error) {
    console.error("Get day of week error:", error);
    return "monday";
  }
}

export function getDateString(date: Date): string {
  try {
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Get date string error:", error);
    return new Date().toISOString().split("T")[0];
  }
}

export function addDays(date: Date, days: number): Date {
  try {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  } catch (error) {
    console.error("Add days error:", error);
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
    console.error("Schedule subtasks error:", error);
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
    console.error("Find available time slot error:", error);
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
    console.error("Calculate task priority error:", error);
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
    console.error("Schedule multiple tasks error:", error);
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
    console.error("Reschedule conflicting tasks error:", error);
    return scheduledTasks;
  }
}