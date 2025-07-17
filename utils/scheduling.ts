import { Task, EnhancedSubtask, SubtaskSegment } from "@/types/task";
import { TimeSlot, DayTimeSlots, ScheduledTask, CalendarEvent, DayOfWeek } from "@/types/timeSlot";
import { calculateDaysUntil } from "@/utils/timeUtils";
import { 
  getSubtaskRemainingTime, 
  getSubtaskTotalDuration,
  shouldSplitSubtask,
  calculateSubtaskSegments,
  getNextSessionDuration,
  initializeSubtaskProgress,
  getSubtaskOriginalDuration,
  validateAndProtectSubtaskDuration,
  getSubtaskDurationSafely
} from "./subtaskProgress";

// 🆕 排程模式定義
export type SchedulingMode = 'strict' | 'flexible';

export interface SchedulingModeOptions {
  mode: SchedulingMode;
  description: string;
  characteristics: string[];
}

export const SCHEDULING_MODES: Record<SchedulingMode, SchedulingModeOptions> = {
  strict: {
    mode: 'strict',
    description: '嚴格模式 - 盡快完成',
    characteristics: [
      '最大化利用所有可用時間',
      '優先安排長時段學習',
      '緊密排程，減少空檔',
      '適合緊急截止日期'
    ]
  },
  flexible: {
    mode: 'flexible',
    description: '彈性模式 - 輕鬆分散',
    characteristics: [
      '分散排程，避免過度密集',
      '保留足夠休息時間',
      '更均勻的工作負荷',
      '適合長期學習計劃'
    ]
  }
};

// 🆕 依賴關係分析
export interface SubtaskDependency {
  subtaskId: string;
  dependsOn: string[]; // 依賴的子任務ID列表
  canStartEarly?: boolean; // 是否可以提前開始（部分依賴）
  minGapDays?: number; // 與前置任務的最小間隔天數
}

// 🆕 增強的排程選項
interface EnhancedSchedulingOptions {
  startDate?: Date;
  startNextDay?: boolean; // 🆕 是否從隔天開始
  maxDaysToSearch?: number;
  bufferBetweenSubtasks?: number;
  respectPhaseOrder?: boolean;
  dailyMaxHours?: number | null;
  mode?: SchedulingMode; // 🆕 排程模式
  respectDependencies?: boolean; // 🆕 是否考慮依賴關係
  dependencies?: SubtaskDependency[]; // 🆕 依賴關係定義
  flexibilityFactor?: number; // 🆕 彈性因子 (0.1-1.0)，越高越分散
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

export function isTimeSlotAvailable(
  timeSlot: TimeSlot,
  existingTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[],
  date: string
): boolean {
  try {
    const slotStart = timeToMinutes(timeSlot.start);
    const slotEnd = timeToMinutes(timeSlot.end);
    
    // Check against existing scheduled tasks
    const dayTasks = existingTasks.filter(task => task.date === date);
    for (const task of dayTasks) {
      const taskStart = timeToMinutes(task.timeSlot.start);
      const taskEnd = timeToMinutes(task.timeSlot.end);
      
      if (
        (slotStart >= taskStart && slotStart < taskEnd) ||
        (slotEnd > taskStart && slotEnd <= taskEnd) ||
        (slotStart <= taskStart && slotEnd >= taskEnd)
      ) {
        return false;
      }
    }
    
    // Check against calendar events
    for (const event of calendarEvents) {
      if (event.isAllDay) continue;
      
      const eventDate = new Date(event.start);
      if (getDateString(eventDate) !== date) continue;
      
      const eventStart = eventDate.getHours() * 60 + eventDate.getMinutes();
      const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();
      
      if (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      ) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Is time slot available error:", error);
    return false;
  }
}

export function findAvailableTimeSlot(
  task: Task,
  availableTimeSlots: DayTimeSlots,
  existingTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[] = [],
  startDate: Date = new Date(),
  maxDaysToSearch: number = 14
): ScheduledTask | null {
  try {
    const taskDuration = task.duration || 60; // Default to 60 minutes
    
    for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
      const currentDate = addDays(startDate, dayOffset);
      const dayOfWeek = getDayOfWeek(currentDate);
      const dateString = getDateString(currentDate);
      
      const daySlots = availableTimeSlots[dayOfWeek];
      if (!daySlots) continue;
      
      for (const slot of daySlots) {
        const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
        
        // Check if the task fits in this slot
        if (slotDuration >= taskDuration) {
          // Try to fit the task at the beginning of the slot
          const taskEndTime = timeToMinutes(slot.start) + taskDuration;
          const taskTimeSlot: TimeSlot = {
            start: slot.start,
            end: minutesToTime(taskEndTime),
          };
          
          if (isTimeSlotAvailable(taskTimeSlot, existingTasks, calendarEvents, dateString)) {
            return {
              taskId: task.id,
              date: dateString,
              timeSlot: taskTimeSlot,
              duration: taskDuration,
            };
          }
          
          // Try to find a smaller available window within the slot
          const slotStart = timeToMinutes(slot.start);
          const slotEnd = timeToMinutes(slot.end);
          
          for (let startTime = slotStart; startTime + taskDuration <= slotEnd; startTime += 15) {
            const endTime = startTime + taskDuration;
            const candidateSlot: TimeSlot = {
              start: minutesToTime(startTime),
              end: minutesToTime(endTime),
            };
            
            if (isTimeSlotAvailable(candidateSlot, existingTasks, calendarEvents, dateString)) {
              return {
                taskId: task.id,
                date: dateString,
                timeSlot: candidateSlot,
                duration: taskDuration,
              };
            }
          }
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
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 1) priority += 100;
      else if (daysUntilDue <= 3) priority += 50;
      else if (daysUntilDue <= 7) priority += 25;
    }
    
    // Task difficulty
    if (task.difficulty === "hard") priority += 30;
    else if (task.difficulty === "medium") priority += 20;
    else if (task.difficulty === "easy") priority += 10;
    
    // Task duration (longer tasks get higher priority to schedule early)
    if (task.duration) {
      if (task.duration >= 120) priority += 20;
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

export interface SubtaskSchedule {
  subtaskId: string;
  subtaskTitle: string;
  date: string;
  timeSlot: TimeSlot;
  duration: number;
  phase?: string;
  order: number;
  // 🆕 時間切割支援
  segmentIndex?: number; // 片段序號（從 1 開始）
  totalSegments?: number; // 總片段數
  isSegmented?: boolean; // 是否為切割的片段
  remainingDuration?: number; // 剩餘總時長
}

export interface SchedulingResult {
  success: boolean;
  scheduledSubtasks: SubtaskSchedule[];
  unscheduledSubtasks: string[];
  message: string;
  totalScheduledMinutes: number;
  completionDate?: string;
}

/**
 * Schedule subtasks based on their estimated duration and available time slots
 * Ensures all subtasks are completed before the due date if provided
 */
export function scheduleSubtasks(
  task: Task,
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[] = [],
  options: EnhancedSchedulingOptions = {}
): SchedulingResult {
  try {
    const {
      startDate = new Date(),
      startNextDay = true, // 🆕 預設從隔天開始
      maxDaysToSearch = 90,
      bufferBetweenSubtasks = 5,
      respectPhaseOrder = false,
      dailyMaxHours = null,
      mode = 'flexible', // 🆕 預設使用彈性模式
      respectDependencies = true, // 🆕 預設考慮依賴關係
      dependencies = [], // 🆕 依賴關係列表
      flexibilityFactor = 0.7 // 🆕 彈性因子，0.5=平衡，1.0=最分散
    } = options;

    // 🆕 計算實際開始日期
    const actualStartDate = new Date(startDate);
    if (startNextDay) {
      actualStartDate.setDate(actualStartDate.getDate() + 1);
      actualStartDate.setHours(0, 0, 0, 0); // 重置到隔天的開始
    }

    // Validate inputs
    if (!task.subtasks || task.subtasks.length === 0) {
      return {
        success: false,
        scheduledSubtasks: [],
        unscheduledSubtasks: [],
        message: "No subtasks to schedule",
        totalScheduledMinutes: 0
      };
    }

    // 🆕 計算有效截止期限，基於實際開始日期
    let effectiveMaxDays = maxDaysToSearch;
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 🆕 只在截止日期真的小於最大搜索天數時才限制，否則使用完整的搜索範圍
      // 這樣可以充分利用用戶的週期性時間表（如每週48小時）
      effectiveMaxDays = Math.min(maxDaysToSearch, Math.max(7, daysUntilDue));
      
      // 🆕 如果截止日期很寬鬆，保持使用完整的搜索範圍以更好分散任務
      if (daysUntilDue > maxDaysToSearch * 0.8) {
        effectiveMaxDays = maxDaysToSearch;
      }
    }

    // 🆕 初始化子任務進度追蹤並過濾未完成的子任務
    const initializedSubtasks = (task.subtasks || []).map(subtask => {
      // 🔧 關鍵修復：在初始化前先驗證和修正時長
      const validation = validateAndProtectSubtaskDuration(subtask);
      if (!validation.isValid) {
        console.warn(`🔧 Auto-correcting duration for subtask ${subtask.id}:`, validation.issues);
      }
      
      // 使用修正後的子任務進行初始化
      return initializeSubtaskProgress(validation.correctedSubtask);
    });
    
    const incompleteSubtasks = initializedSubtasks.filter(subtask => 
      getSubtaskRemainingTime(subtask) > 0
    );

    // 🆕 依賴關係分析
    const dependencyMap = new Map<string, string[]>();
    const reverseDependencyMap = new Map<string, string[]>();
    
    dependencies.forEach(dep => {
      dependencyMap.set(dep.subtaskId, dep.dependsOn);
      dep.dependsOn.forEach(prereq => {
        if (!reverseDependencyMap.has(prereq)) {
          reverseDependencyMap.set(prereq, []);
        }
        reverseDependencyMap.get(prereq)!.push(dep.subtaskId);
      });
    });

    // 🆕 拓撲排序以處理依賴關係
    const getTopologicalOrder = (subtasks: EnhancedSubtask[]) => {
      if (!respectDependencies || dependencies.length === 0) {
        return subtasks; // 如果不考慮依賴關係，直接返回
      }

      const visited = new Set<string>();
      const visiting = new Set<string>();
      const result: EnhancedSubtask[] = [];

      const visit = (subtaskId: string) => {
        if (visiting.has(subtaskId)) {
          console.warn(`檢測到循環依賴: ${subtaskId}`);
          return;
        }
        if (visited.has(subtaskId)) return;

        visiting.add(subtaskId);
        const deps = dependencyMap.get(subtaskId) || [];
        deps.forEach(depId => visit(depId));
        visiting.delete(subtaskId);
        visited.add(subtaskId);

        const subtask = subtasks.find(s => s.id === subtaskId);
        if (subtask) result.push(subtask);
      };

      subtasks.forEach(subtask => visit(subtask.id));
      
      // 添加沒有依賴關係的子任務
      subtasks.forEach(subtask => {
        if (!result.find(s => s.id === subtask.id)) {
          result.push(subtask);
        }
      });

      return result;
    };

    // 🆕 模式特定的排序邏輯
    const applyModeSpecificSorting = (subtasks: EnhancedSubtask[]) => {
      if (mode === 'strict') {
        // 嚴格模式：優先安排長時間任務，按剩餘時間降序
        return subtasks.sort((a, b) => {
          const aRemaining = getSubtaskRemainingTime(a);
          const bRemaining = getSubtaskRemainingTime(b);
          return bRemaining - aRemaining; // 降序
        });
      } else {
        // 彈性模式：混合排序，避免連續安排同類型任務
        return subtasks.sort((a, b) => {
          // 1. 按階段分散
          if (a.phase !== b.phase) {
            const phaseOrder = ["knowledge", "practice", "application", "reflection", "output", "review"];
            const aIndex = phaseOrder.indexOf(a.phase || "");
            const bIndex = phaseOrder.indexOf(b.phase || "");
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
          }
          
          // 2. 按難度交替
          const difficultyOrder = { "easy": 1, "medium": 2, "hard": 3 };
          const aDifficulty = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 2;
          const bDifficulty = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 2;
          
          // 3. 時間長度平衡
          const aRemaining = getSubtaskRemainingTime(a);
          const bRemaining = getSubtaskRemainingTime(b);
          
          return aDifficulty - bDifficulty || aRemaining - bRemaining;
        });
      }
    };

    // 應用排序邏輯
    const dependencyOrderedSubtasks = getTopologicalOrder(incompleteSubtasks);
    const sortedSubtasks = applyModeSpecificSorting(dependencyOrderedSubtasks);

    // Track scheduled subtasks and daily usage
    const scheduledSubtasks: SubtaskSchedule[] = [];
    const unscheduledSubtasks: string[] = [];
    const dailyUsage: Record<string, number> = {}; // date -> minutes used
    let totalScheduledMinutes = 0;

    // Create a copy of existing scheduled tasks to track conflicts
    const allScheduledSlots: ScheduledTask[] = [...existingScheduledTasks];

    // 🆕 預先計算所有可用時間窗口以提高效率，使用實際開始日期
    const allAvailableWindows = precomputeAvailableWindows(
      availableTimeSlots,
      allScheduledSlots,
      calendarEvents,
      actualStartDate,
      effectiveMaxDays
    );

    // 🆕 增強的子任務排程邏輯，支援更靈活的時間切割和進度記錄
    for (const subtask of sortedSubtasks) {
      const remainingTime = getSubtaskRemainingTime(subtask);
      if (remainingTime <= 0) continue; // Skip completed subtasks
      
      let totalScheduledForSubtask = 0;
      let segmentIndex = 1;
      const subtaskSegments: SubtaskSchedule[] = [];
      
      // 🆕 動態調整最小會話時長 - 更靈活的設定
      const baseMinSessionDuration = subtask.minSessionDuration || 5; // 🆕 降低最小會話時長到5分鐘
      const maxSessionDuration = subtask.maxSessionDuration || 180; // 🆕 增加最大會話時長到3小時

      // 🆕 多輪排程策略 - 逐輪降低要求以提高成功率
      for (let round = 1; round <= 4 && totalScheduledForSubtask < remainingTime; round++) {
        let currentMinSession: number;
        
        switch (round) {
          case 1:
            currentMinSession = baseMinSessionDuration; // 原始要求
            break;
          case 2:
            currentMinSession = Math.max(15, baseMinSessionDuration - 10); // 降低10分鐘
            break;
          case 3:
            currentMinSession = Math.max(10, baseMinSessionDuration - 15); // 降低15分鐘
            break;
          case 4:
            currentMinSession = Math.max(5, baseMinSessionDuration - 20); // 最低5分鐘
            break;
          default:
            currentMinSession = baseMinSessionDuration;
        }

        // 🆕 模式特定的時間窗口選擇邏輯
        const availableWindowsForRound = allAvailableWindows.filter(window => {
          const windowDuration = timeToMinutes(window.window.end) - timeToMinutes(window.window.start);
          return windowDuration >= currentMinSession;
        }).sort((a, b) => {
          const aDuration = timeToMinutes(a.window.end) - timeToMinutes(a.window.start);
          const bDuration = timeToMinutes(b.window.end) - timeToMinutes(b.window.start);
          
          if (mode === 'strict') {
            // 嚴格模式：優先選擇最早的時間和最大的窗口
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            
            // 1. 按日期排序（越早越好）
            if (aDate.getTime() !== bDate.getTime()) {
              return aDate.getTime() - bDate.getTime();
            }
            
            // 2. 同一天內按窗口大小排序（越大越好）
            return bDuration - aDuration;
          } else {
            // 彈性模式：分散排程，避免過度密集
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            
            // 計算與已排程任務的時間距離，優先選擇較分散的時間
            const getTimeDistanceScore = (date: string) => {
              const existingTasksOnDate = scheduledSubtasks.filter(s => s.date === date).length;
              const daysSinceStart = Math.floor((new Date(date).getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // 基於彈性因子計算分散程度
              const dispersalBonus = Math.floor(daysSinceStart * flexibilityFactor) * 10;
              const densityPenalty = existingTasksOnDate * 5;
              
              return dispersalBonus - densityPenalty;
            };
            
            const aScore = getTimeDistanceScore(a.date);
            const bScore = getTimeDistanceScore(b.date);
            
            // 1. 按分散得分排序
            if (Math.abs(aScore - bScore) > 5) {
              return bScore - aScore; // 分數越高越好
            }
            
            // 2. 適合度排序（剩餘時間較少時優先選擇剛好大小的窗口）
            if (remainingTime - totalScheduledForSubtask <= maxSessionDuration) {
              const aFit = Math.abs(aDuration - (remainingTime - totalScheduledForSubtask));
              const bFit = Math.abs(bDuration - (remainingTime - totalScheduledForSubtask));
              return aFit - bFit;
            }
            
            // 3. 時間平衡（避免過長或過短的會話）
            const idealDuration = Math.min(90, Math.max(30, remainingTime - totalScheduledForSubtask));
            const aBalance = Math.abs(aDuration - idealDuration);
            const bBalance = Math.abs(bDuration - idealDuration);
            return aBalance - bBalance;
          }
        });

        // Try to schedule this subtask using available windows
        for (const windowInfo of availableWindowsForRound) {
          if (totalScheduledForSubtask >= remainingTime) break;
          
          const { date, dayOfWeek, window } = windowInfo;
          
          // Check if this window has been used by current scheduling
          const isWindowAvailable = !allScheduledSlots.some(slot => 
            slot.date === date && 
            timeToMinutes(slot.timeSlot.start) < timeToMinutes(window.end) &&
            timeToMinutes(slot.timeSlot.end) > timeToMinutes(window.start)
          );
          
          if (!isWindowAvailable) continue;
          
          // Check daily limit (if enabled)
          const dailyUsedMinutes = dailyUsage[date] || 0;
          if (dailyMaxHours !== null && dailyUsedMinutes >= dailyMaxHours * 60) {
            continue;
          }
          
          const windowDuration = timeToMinutes(window.end) - timeToMinutes(window.start);
          
          // 🆕 更智能的時間分配邏輯
          if (windowDuration >= currentMinSession) {
            const remainingToSchedule = remainingTime - totalScheduledForSubtask;
            
            // 🆕 使用 getNextSessionDuration 智能計算最佳會話時長
            const idealSessionDuration = getNextSessionDuration(
              { ...subtask, remainingTime: remainingToSchedule }, 
              windowDuration - bufferBetweenSubtasks
            );
            
            // 確保會話時長滿足當前輪次的最小要求
            const actualSessionDuration = Math.max(
              Math.min(idealSessionDuration, remainingToSchedule),
              round <= 2 ? currentMinSession : Math.min(currentMinSession, remainingToSchedule)
            );
            
            // 🆕 更寬鬆的排程條件 - 允許較短的最終會話
            const canScheduleSession = actualSessionDuration >= currentMinSession || 
              (remainingToSchedule <= currentMinSession && actualSessionDuration >= Math.min(5, remainingToSchedule)) ||
              (round >= 3 && actualSessionDuration >= 5); // 第3輪及以後允許5分鐘的短會話
            
            if (canScheduleSession) {
              // Check daily limit constraint
              let canScheduleDaily = true;
              if (dailyMaxHours !== null) {
                const remainingDailyMinutes = (dailyMaxHours * 60) - dailyUsedMinutes;
                canScheduleDaily = actualSessionDuration <= remainingDailyMinutes;
              }
              
              if (canScheduleDaily) {
                // Schedule this segment
                const subtaskTimeSlot: TimeSlot = {
                  start: window.start,
                  end: minutesToTime(timeToMinutes(window.start) + actualSessionDuration)
                };

                // 🆕 智能判斷是否為分段任務
                const willBeSegmented = (remainingTime > maxSessionDuration) || 
                  (segmentIndex > 1) || 
                  (remainingTime - actualSessionDuration > 0 && remainingTime - actualSessionDuration >= currentMinSession);
                
                const subtaskSchedule: SubtaskSchedule = {
                  subtaskId: subtask.id,
                  subtaskTitle: subtask.title || subtask.text,
                  date: date,
                  timeSlot: subtaskTimeSlot,
                  duration: actualSessionDuration,
                  phase: subtask.phase,
                  order: subtask.order,
                  // 🆕 增強的時間切割資訊
                  segmentIndex: willBeSegmented ? segmentIndex : undefined,
                  totalSegments: undefined, // 稍後計算
                  isSegmented: willBeSegmented,
                  remainingDuration: remainingTime - totalScheduledForSubtask - actualSessionDuration
                };

                subtaskSegments.push(subtaskSchedule);
                
                // Update tracking
                const taskIdForSlot = willBeSegmented 
                  ? `${task.id}_${subtask.id}_segment_${segmentIndex}`
                  : `${task.id}_${subtask.id}`;
                
                allScheduledSlots.push({
                  taskId: taskIdForSlot,
                  date: date,
                  timeSlot: subtaskTimeSlot,
                  duration: actualSessionDuration
                });
                
                dailyUsage[date] = (dailyUsage[date] || 0) + actualSessionDuration;
                totalScheduledForSubtask += actualSessionDuration;
                totalScheduledMinutes += actualSessionDuration;
                segmentIndex++;
                
                // 🆕 如果已完成子任務排程，跳出所有循環
                if (totalScheduledForSubtask >= remainingTime) {
                  break;
                }
              }
            }
          }
        }
        
        // 🆕 如果這輪成功排程了一些時間，檢查是否可以繼續下一輪
        if (totalScheduledForSubtask > 0) {
          const successRate = totalScheduledForSubtask / remainingTime;
          // 如果已排程超過50%或完全排程，就不需要降低要求繼續下一輪
          if (successRate >= 0.5 || totalScheduledForSubtask >= remainingTime) {
            break;
          }
        }
      }

      // 🆕 更新總片段數和分段信息
      if (subtaskSegments.length > 1) {
        subtaskSegments.forEach(segment => {
          segment.totalSegments = subtaskSegments.length;
          segment.isSegmented = true;
        });
      } else if (subtaskSegments.length === 1) {
        // 單個片段的情況
        subtaskSegments[0].isSegmented = false;
        subtaskSegments[0].segmentIndex = undefined;
        subtaskSegments[0].totalSegments = undefined;
      }

      // Add segments to scheduled subtasks or mark as unscheduled
      if (subtaskSegments.length > 0 && totalScheduledForSubtask > 0) {
        scheduledSubtasks.push(...subtaskSegments);
        
        // 🔧 修復：正確記錄原始時長與排程時長的差異
        if (totalScheduledForSubtask < remainingTime) {
          const originalDuration = getSubtaskOriginalDuration(subtask);
          console.warn(`⚠️ Duration mismatch: scheduled=${totalScheduledForSubtask}min, original=${originalDuration}min for subtask ${subtask.id}`);
          console.warn(`Subtask ${subtask.id} partially scheduled: ${totalScheduledForSubtask}/${remainingTime} minutes remaining`);
        }
      } else {
        unscheduledSubtasks.push(subtask.id);
      }
    }

    // Determine completion date
    let completionDate: string | undefined;
    if (scheduledSubtasks.length > 0) {
      const sortedByDate = scheduledSubtasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      completionDate = sortedByDate[sortedByDate.length - 1].date;
    }

    // 🆕 改進的結果訊息生成 - 更詳細的排程分析
    let message = "";
    const totalSubtasks = sortedSubtasks.length;
    const scheduledSubtaskIds = new Set(scheduledSubtasks.map(s => s.subtaskId));
    const actualScheduledSubtasks = scheduledSubtaskIds.size;
    const partiallyScheduledSubtasks = Array.from(scheduledSubtaskIds).filter(subtaskId => {
      const subtask = sortedSubtasks.find(s => s.id === subtaskId);
      if (!subtask) return false;
      
      const totalScheduledTime = scheduledSubtasks
        .filter(s => s.subtaskId === subtaskId)
        .reduce((sum, s) => sum + s.duration, 0);
      const remainingTime = getSubtaskRemainingTime(subtask);
      
      return totalScheduledTime < remainingTime;
    }).length;
    
    if (actualScheduledSubtasks === totalSubtasks && partiallyScheduledSubtasks === 0) {
      message = `🎉 成功排程所有 ${actualScheduledSubtasks} 個子任務`;
      if (completionDate) {
        message += `，預計於 ${completionDate} 完成`;
      }
      if (task.dueDate && completionDate) {
        const scheduledDate = new Date(completionDate);
        const dueDate = new Date(task.dueDate);
        if (scheduledDate <= dueDate) {
          const daysBefore = Math.ceil((dueDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysBefore > 0) {
            message += `（提前 ${daysBefore} 天完成）`;
          }
        }
      }
    } else if (actualScheduledSubtasks > 0) {
      const scheduledSegments = scheduledSubtasks.length;
      message = `✅ 已排程 ${actualScheduledSubtasks} / ${totalSubtasks} 個子任務`;
      
      if (scheduledSegments > actualScheduledSubtasks) {
        message += `，分佈在 ${scheduledSegments} 個時間段中`;
      }
      
      if (partiallyScheduledSubtasks > 0) {
        message += `（其中 ${partiallyScheduledSubtasks} 個部分排程）`;
      }
      
      if (unscheduledSubtasks.length > 0) {
        message += `\n\n⚠️ 無法排程 ${unscheduledSubtasks.length} 個子任務`;
        if (task.dueDate) {
          message += `（截止日期限制）`;
        }
        
        // 🆕 提供具體的改進建議
        const totalUnscheduledTime = unscheduledSubtasks.reduce((total, subtaskId) => {
          const subtask = sortedSubtasks.find(s => s.id === subtaskId);
          return total + (subtask ? getSubtaskRemainingTime(subtask) : 0);
        }, 0);
        
        const hoursNeeded = Math.round(totalUnscheduledTime / 60 * 10) / 10;
        message += `\n需要額外 ${hoursNeeded} 小時的學習時間`;
      }
    } else {
      message = "❌ 無法排程任何子任務\n\n請檢查您的可用時間設置或延長截止日期";
    }

    // 🆕 計算排程成功率
    const successRate = actualScheduledSubtasks / totalSubtasks;
    const isHighSuccess = successRate >= 0.8;

    return {
      success: actualScheduledSubtasks > 0 && isHighSuccess,
      scheduledSubtasks,
      unscheduledSubtasks,
      message,
      totalScheduledMinutes,
      completionDate
    };
  } catch (error) {
    console.error("Schedule subtasks error:", error);
    return {
      success: false,
      scheduledSubtasks: [],
      unscheduledSubtasks: task.subtasks?.map(s => s.id) || [],
      message: "排程系統發生錯誤，請檢查您的設置或重試",
      totalScheduledMinutes: 0
    };
  }
}

/**
 * 🆕 預先計算所有可用時間窗口以提高排程效率
 */
interface WindowInfo {
  date: string;
  dayOfWeek: string;
  window: TimeSlot;
  originalSlot: TimeSlot;
}

function precomputeAvailableWindows(
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[],
  startDate: Date,
  maxDays: number
): WindowInfo[] {
  const allWindows: WindowInfo[] = [];
  
  for (let dayOffset = 0; dayOffset < maxDays; dayOffset++) {
    const currentDate = addDays(startDate, dayOffset);
    const dayOfWeek = getDayOfWeek(currentDate);
    const dateString = getDateString(currentDate);
    
    const daySlots = availableTimeSlots[dayOfWeek];
    if (!daySlots || daySlots.length === 0) continue;

    for (const slot of daySlots) {
      const windows = findAvailableWindows(
        slot,
        existingScheduledTasks.filter(s => s.date === dateString),
        calendarEvents.filter(e => {
          const eventDate = new Date(e.start);
          return getDateString(eventDate) === dateString;
        }),
        dateString
      );

      for (const window of windows) {
        allWindows.push({
          date: dateString,
          dayOfWeek,
          window,
          originalSlot: slot
        });
      }
    }
  }
  
  // 🆕 按窗口大小排序，優先使用較大的時間窗口
  return allWindows.sort((a, b) => {
    const aDuration = timeToMinutes(a.window.end) - timeToMinutes(a.window.start);
    const bDuration = timeToMinutes(b.window.end) - timeToMinutes(b.window.start);
    return bDuration - aDuration; // 大窗口優先
  });
}

/**
 * Find available time windows within a time slot
 */
function findAvailableWindows(
  slot: TimeSlot,
  existingTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[],
  date: string
): TimeSlot[] {
  try {
    const windows: TimeSlot[] = [];
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    
    // Collect all occupied time ranges
    const occupiedRanges: Array<{ start: number; end: number }> = [];
    
    // Add existing tasks
    existingTasks.forEach(task => {
      occupiedRanges.push({
        start: timeToMinutes(task.timeSlot.start),
        end: timeToMinutes(task.timeSlot.end)
      });
    });
    
    // Add calendar events
    calendarEvents.forEach(event => {
      if (!event.isAllDay) {
        const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
        const eventEnd = event.end.getHours() * 60 + event.end.getMinutes();
        occupiedRanges.push({ start: eventStart, end: eventEnd });
      }
    });
    
    // Sort occupied ranges by start time
    occupiedRanges.sort((a, b) => a.start - b.start);
    
    // Merge overlapping ranges
    const mergedRanges: Array<{ start: number; end: number }> = [];
    occupiedRanges.forEach(range => {
      if (mergedRanges.length === 0) {
        mergedRanges.push(range);
      } else {
        const last = mergedRanges[mergedRanges.length - 1];
        if (range.start <= last.end) {
          last.end = Math.max(last.end, range.end);
        } else {
          mergedRanges.push(range);
        }
      }
    });
    
    // Find free windows
    let currentStart = slotStart;
    
    mergedRanges.forEach(range => {
      // Only consider ranges that overlap with our slot
      if (range.end > slotStart && range.start < slotEnd) {
        const windowStart = Math.max(currentStart, slotStart);
        const windowEnd = Math.min(range.start, slotEnd);
        
        if (windowEnd > windowStart) {
          windows.push({
            start: minutesToTime(windowStart),
            end: minutesToTime(windowEnd)
          });
        }
        
        currentStart = Math.max(range.end, currentStart);
      }
    });
    
    // Add final window if there's space
    if (currentStart < slotEnd) {
      windows.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(slotEnd)
      });
    }
    
    return windows;
  } catch (error) {
    console.error("Find available windows error:", error);
    return [];
  }
}

/**
 * Convert subtask schedules to scheduled tasks for storage
 */
export function convertSubtaskSchedulesToTasks(
  taskId: string,
  subtaskSchedules: SubtaskSchedule[]
): ScheduledTask[] {
  return subtaskSchedules.map(schedule => {
    // 🆕 修正：正確處理子任務片段的 ID 格式，避免 ID 衝突
    let scheduledTaskId: string;
    
    if (schedule.isSegmented && schedule.segmentIndex && schedule.totalSegments) {
      // 分割的子任務片段：${taskId}_${subtaskId}_segment_${segmentIndex}
      scheduledTaskId = `${taskId}_${schedule.subtaskId}_segment_${schedule.segmentIndex}`;
    } else {
      // 普通子任務：${taskId}_${subtaskId}
      scheduledTaskId = `${taskId}_${schedule.subtaskId}`;
    }
    
    return {
      taskId: scheduledTaskId,
      date: schedule.date,
      timeSlot: schedule.timeSlot,
      duration: schedule.duration
    };
  });
}

/**
 * 🆕 排程可行性分析和預檢查
 */
export interface SchedulingFeasibilityAnalysis {
  isFeasible: boolean;
  totalRequiredTime: number; // 總需要時間（分鐘）
  totalAvailableTime: number; // 總可用時間（分鐘）
  timeDeficit: number; // 時間不足量（分鐘）
  issues: SchedulingIssue[];
  suggestions: SchedulingSuggestion[];
  canProceedWithAutoScheduling: boolean;
}

export interface SchedulingIssue {
  type: 'insufficient_time' | 'subtask_too_long' | 'deadline_too_tight' | 'no_suitable_slots';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSubtasks?: string[];
}

export interface SchedulingSuggestion {
  type: 'extend_deadline' | 'reduce_subtasks' | 'reduce_duration' | 'increase_availability' | 'enable_splitting';
  priority: 'high' | 'medium' | 'low';
  description: string;
  actionRequired: string;
  estimatedImpact: string;
}

/**
 * 🆕 排程前可行性分析 - 確保百分百排入或提供具體建議
 */
export function analyzeSchedulingFeasibility(
  task: Task,
  availableTimeSlots: DayTimeSlots,
  existingScheduledTasks: ScheduledTask[],
  calendarEvents: CalendarEvent[] = [],
  options: {
    startDate?: Date;
    maxDaysToSearch?: number;
    bufferBetweenSubtasks?: number;
    respectPhaseOrder?: boolean;
    dailyMaxHours?: number | null;
  } = {}
): SchedulingFeasibilityAnalysis {
  const {
    startDate = new Date(),
    maxDaysToSearch = 90,
    bufferBetweenSubtasks = 5,
    dailyMaxHours = null
  } = options;

  const issues: SchedulingIssue[] = [];
  const suggestions: SchedulingSuggestion[] = [];

  // 基本檢查
  if (!task.subtasks || task.subtasks.length === 0) {
    return {
      isFeasible: true,
      totalRequiredTime: 0,
      totalAvailableTime: 0,
      timeDeficit: 0,
      issues: [],
      suggestions: [],
      canProceedWithAutoScheduling: true
    };
  }

  // 計算總需要時間
  const totalRequiredTime = task.subtasks.reduce((total, subtask) => {
    // 🔧 修復：使用原始預估時長而非可能被壓縮的時長
    const originalDuration = getSubtaskOriginalDuration(subtask);
    const remainingTime = getSubtaskRemainingTime(subtask);
    return total + remainingTime;
  }, 0);

  // 計算截止日期限制
  let effectiveMaxDays = maxDaysToSearch;
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 🆕 完全修正邏輯：充分利用用戶配置的週期性時間表
    // 只在截止日期真的很緊迫且小於搜索範圍時才限制，否則使用完整搜索範圍
    effectiveMaxDays = Math.min(maxDaysToSearch, Math.max(7, daysUntilDue));
    
    // 🆕 如果截止日期寬鬆，保持使用完整的搜索範圍以更好分散任務
    if (daysUntilDue > maxDaysToSearch * 0.8) {
      effectiveMaxDays = maxDaysToSearch;
    }
    
    if (daysUntilDue <= 0) {
      issues.push({
        type: 'deadline_too_tight',
        severity: 'critical',
        description: '截止日期已過或為今天，無法進行排程',
        affectedSubtasks: task.subtasks.map(s => s.id)
      });
      
      suggestions.push({
        type: 'extend_deadline',
        priority: 'high',
        description: '延長任務截止日期',
        actionRequired: `設定截止日期至少為明天（${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}）或更晚`,
        estimatedImpact: '將使所有子任務可以被排程'
      });
    } else if (daysUntilDue <= 3) {
      issues.push({
        type: 'deadline_too_tight',
        severity: 'medium', // 🆕 降低嚴重程度，因為我們現在會利用更多可用時間
        description: `截止日期較為緊迫（僅剩 ${daysUntilDue} 天）`,
        affectedSubtasks: task.subtasks.map(s => s.id)
      });
    }
  }

  // 計算總可用時間
  const allAvailableWindows = precomputeAvailableWindows(
    availableTimeSlots,
    existingScheduledTasks,
    calendarEvents,
    startDate,
    effectiveMaxDays
  );

  let totalAvailableTime = 0;
  const dailyAvailableTime: Record<string, number> = {};

  allAvailableWindows.forEach(window => {
    const windowDuration = timeToMinutes(window.window.end) - timeToMinutes(window.window.start);
    totalAvailableTime += windowDuration;
    dailyAvailableTime[window.date] = (dailyAvailableTime[window.date] || 0) + windowDuration;
  });

  // 應用每日限制
  if (dailyMaxHours !== null) {
    const dailyLimitMinutes = dailyMaxHours * 60;
    let adjustedTotalTime = 0;
    
    Object.values(dailyAvailableTime).forEach(dailyTime => {
      adjustedTotalTime += Math.min(dailyTime, dailyLimitMinutes);
    });
    
    totalAvailableTime = adjustedTotalTime;
  }

  const timeDeficit = Math.max(0, totalRequiredTime - totalAvailableTime);

  // 時間不足分析
  if (timeDeficit > 0) {
    issues.push({
      type: 'insufficient_time',
      severity: timeDeficit > totalRequiredTime * 0.5 ? 'critical' : 'high',
      description: `可用時間不足：需要 ${totalRequiredTime} 分鐘，但只有 ${totalAvailableTime} 分鐘可用`,
      affectedSubtasks: task.subtasks.map(s => s.id)
    });

    // 建議延長截止日期
    const additionalDaysNeeded = Math.ceil(timeDeficit / (totalAvailableTime / effectiveMaxDays));
    suggestions.push({
      type: 'extend_deadline',
      priority: 'high',
      description: '延長任務截止日期',
      actionRequired: `將截止日期延長至少 ${additionalDaysNeeded} 天`,
      estimatedImpact: `將提供額外 ${additionalDaysNeeded * (totalAvailableTime / effectiveMaxDays)} 分鐘的學習時間`
    });

    // 建議減少子任務
    const subtasksToRemove = Math.ceil(task.subtasks.length * (timeDeficit / totalRequiredTime));
    suggestions.push({
      type: 'reduce_subtasks',
      priority: 'medium',
      description: '減少子任務數量',
      actionRequired: `考慮移除 ${subtasksToRemove} 個子任務或合併類似的子任務`,
      estimatedImpact: `將減少約 ${timeDeficit} 分鐘的學習時間需求`
    });

    // 建議減少子任務時長
    const averageReduction = Math.ceil(timeDeficit / task.subtasks.length);
    suggestions.push({
      type: 'reduce_duration',
      priority: 'medium',
      description: '減少子任務學習時長',
      actionRequired: `將每個子任務的時長平均減少 ${averageReduction} 分鐘`,
      estimatedImpact: '將使任務能夠在現有時間範圍內完成'
    });
  }

  // 檢查過長子任務 - 🆕 更智能的長子任務檢測
  const maxWindowSize = Math.max(...allAvailableWindows.map(w => 
    timeToMinutes(w.window.end) - timeToMinutes(w.window.start)
  ), 0);

  // 🆕 只有真正無法分割且超過最大窗口的子任務才算是問題
  const longSubtasks = task.subtasks.filter(subtask => {
    const remainingTime = getSubtaskRemainingTime(subtask);
    const canBeSplit = subtask.canBeSplit !== false; // 預設可分割
    const minSessionDuration = subtask.minSessionDuration || 5; // 預設5分鐘
    
    // 只有當子任務不可分割且沒有足夠大的窗口時才算是問題
    return !canBeSplit && remainingTime > maxWindowSize && maxWindowSize < minSessionDuration;
  });

  if (longSubtasks.length > 0 && maxWindowSize > 0) {
    issues.push({
      type: 'subtask_too_long',
      severity: 'high',
      description: `${longSubtasks.length} 個子任務的時長超過最大可用時間窗口（${maxWindowSize} 分鐘）`,
      affectedSubtasks: longSubtasks.map(s => s.id)
    });

    suggestions.push({
      type: 'enable_splitting',
      priority: 'high',
      description: '啟用時間切割功能',
      actionRequired: '允許長時間子任務被分割到多個學習時段',
      estimatedImpact: `將使 ${longSubtasks.length} 個長子任務能夠被成功排程`
    });

    suggestions.push({
      type: 'reduce_duration',
      priority: 'medium',
      description: '減少長子任務的時長',
      actionRequired: `將長子任務的時長減少到 ${maxWindowSize} 分鐘以內`,
      estimatedImpact: '將使子任務能夠完整排入單個時間窗口'
    });
  }

  // 檢查是否有足夠的時間窗口 - 🆕 更合理的最小時段要求
  const minSessionDuration = Math.min(...task.subtasks.map(s => s.minSessionDuration || 5)); // 🆕 降低到5分鐘
  const suitableWindows = allAvailableWindows.filter(w => 
    (timeToMinutes(w.window.end) - timeToMinutes(w.window.start)) >= minSessionDuration
  );

  if (suitableWindows.length === 0) {
    issues.push({
      type: 'no_suitable_slots',
      severity: 'critical',
      description: '沒有找到符合最小學習時長要求的時間窗口',
      affectedSubtasks: task.subtasks.map(s => s.id)
    });

    suggestions.push({
      type: 'increase_availability',
      priority: 'high',
      description: '增加可用學習時間',
      actionRequired: `增加至少 ${minSessionDuration} 分鐘的連續學習時段`,
      estimatedImpact: '將使自動排程功能可以使用'
    });
  }

  // 判斷是否可以進行自動排程 - 🆕 更寬鬆的條件
  const canProceedWithAutoScheduling = issues.length === 0 || 
    issues.every(issue => issue.severity === 'low' || issue.severity === 'medium') ||
    suitableWindows.length > 0; // 🆕 只要有可用窗口就允許嘗試

  const isFeasible = timeDeficit <= totalRequiredTime * 0.2 && suitableWindows.length > 0; // 🆕 允許20%的時間不足

  return {
    isFeasible,
    totalRequiredTime,
    totalAvailableTime,
    timeDeficit,
    issues,
    suggestions,
    canProceedWithAutoScheduling
  };
}

/**
 * 🆕 智能排程建議生成
 */
export function generateSchedulingSuggestions(
  feasibilityAnalysis: SchedulingFeasibilityAnalysis,
  task: Task
): {
  shouldProceed: boolean;
  userMessage: string;
  actionableSteps: string[];
} {
  const { issues, suggestions, canProceedWithAutoScheduling, timeDeficit } = feasibilityAnalysis;

  if (canProceedWithAutoScheduling) {
    return {
      shouldProceed: true,
      userMessage: "所有子任務都可以成功排入您的學習時間表中。",
      actionableSteps: []
    };
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');

  let userMessage = "⚠️ 自動排程遇到問題，無法確保所有子任務都能排入：\n\n";

  // 描述問題
  if (criticalIssues.length > 0) {
    userMessage += "🚨 關鍵問題：\n";
    criticalIssues.forEach(issue => {
      userMessage += `• ${issue.description}\n`;
    });
    userMessage += "\n";
  }

  if (highIssues.length > 0) {
    userMessage += "⚠️ 重要問題：\n";
    highIssues.forEach(issue => {
      userMessage += `• ${issue.description}\n`;
    });
    userMessage += "\n";
  }

  // 提供解決方案
  const actionableSteps: string[] = [];
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');

  if (highPrioritySuggestions.length > 0) {
    userMessage += "💡 建議解決方案（選擇其中一種）：\n\n";
    
    highPrioritySuggestions.forEach((suggestion, index) => {
      userMessage += `${index + 1}. **${suggestion.description}**\n`;
      userMessage += `   操作：${suggestion.actionRequired}\n`;
      userMessage += `   效果：${suggestion.estimatedImpact}\n\n`;
      
      actionableSteps.push(suggestion.actionRequired);
    });
  }

  // 添加時間統計信息
  if (timeDeficit > 0) {
    const hoursDeficit = Math.round(timeDeficit / 60 * 10) / 10;
    userMessage += `📊 時間分析：還需要 ${hoursDeficit} 小時的額外學習時間才能完成所有子任務。\n\n`;
  }

  userMessage += "請完成上述建議後再使用自動排程功能，以確保所有子任務都能成功排入。";

  return {
    shouldProceed: false,
    userMessage,
    actionableSteps
  };
}

export interface RescheduleResult {
  success: boolean;
  originalSlot?: {
    date: string;
    timeSlot: TimeSlot;
    duration: number;
  };
  newSlot?: {
    date: string;
    timeSlot: TimeSlot;
    duration: number;
  };
  reason: string;
  explanation: string;
  suggestions: string[];
  daysShifted?: number;
  impactedTasks?: Array<{
    id: string;
    title: string;
    originalTime: string;
    newTime: string;
    action: 'moved' | 'delayed' | 'compressed';
  }>;
}

export interface RescheduleOptions {
  prioritizeUrgency?: boolean; // 優先考慮緊急性
  allowLateDays?: boolean; // 允許排程到較晚的日期
  maxDaysToSearch?: number; // 最多搜尋天數
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  considerTaskDifficulty?: boolean; // 考慮任務難度匹配時間段
  allowTimeCompression?: boolean; // 允許壓縮其他任務時間
}

/**
 * 智能重新排程功能
 * 為逾期的子任務尋找最佳的新時段
 */
export function intelligentReschedule(
  overdueTask: {
    id: string;
    title: string;
    duration: number;
    priority?: 'low' | 'medium' | 'high';
    difficulty?: 'easy' | 'medium' | 'hard';
    dueDate?: string;
    isSubtask?: boolean;
    mainTaskId?: string;
    phase?: string;
  },
  currentSchedule: ScheduledTask[],
  availableTimeSlots: DayTimeSlots,
  calendarEvents: CalendarEvent[] = [],
  options: RescheduleOptions = {}
): RescheduleResult {
  try {
    const {
      prioritizeUrgency = true,
      allowLateDays = true,
      maxDaysToSearch = 14,
      preferredTimeOfDay = 'any',
      considerTaskDifficulty = true,
      allowTimeCompression = false
    } = options;

    // 尋找原始排程時段（用於比較）
    const originalScheduledTask = currentSchedule.find(st => st.taskId === overdueTask.id);
    
    // 計算任務優先級分數
    const priorityScore = calculateAdvancedTaskPriority(overdueTask);
    
    // 計算緊急程度
    const urgencyLevel = calculateUrgencyLevel(overdueTask.dueDate);
    
    // 尋找可用的時段選項
    const candidateSlots = findCandidateTimeSlots(
      overdueTask,
      currentSchedule,
      availableTimeSlots,
      calendarEvents,
      maxDaysToSearch,
      preferredTimeOfDay,
      considerTaskDifficulty
    );

    if (candidateSlots.length === 0) {
      return {
        success: false,
        reason: 'no_available_slots',
        explanation: generateNoSlotsExplanation(overdueTask, urgencyLevel),
        suggestions: generateRescheduleSuggestions(overdueTask, availableTimeSlots, urgencyLevel)
      };
    }

    // 選擇最佳時段
    const bestSlot = selectBestTimeSlot(candidateSlots, overdueTask, priorityScore, urgencyLevel);
    
    // 檢查是否需要移動其他任務
    const impactAnalysis = analyzeSchedulingImpact(bestSlot, currentSchedule, overdueTask);
    
    // 計算時間偏移
    const daysShifted = calculateDaysShifted(
      originalScheduledTask?.date || new Date().toISOString().split('T')[0],
      bestSlot.date
    );

    return {
      success: true,
      originalSlot: originalScheduledTask ? {
        date: originalScheduledTask.date,
        timeSlot: originalScheduledTask.timeSlot,
        duration: originalScheduledTask.duration
      } : undefined,
      newSlot: {
        date: bestSlot.date,
        timeSlot: bestSlot.timeSlot,
        duration: overdueTask.duration
      },
      reason: determineRescheduleReason(bestSlot, urgencyLevel, daysShifted),
      explanation: generateRescheduleExplanation(overdueTask, bestSlot, urgencyLevel, daysShifted),
      suggestions: generateOptimizationSuggestions(overdueTask, bestSlot, impactAnalysis),
      daysShifted,
      impactedTasks: impactAnalysis.impactedTasks
    };

  } catch (error) {
    console.error("Intelligent reschedule error:", error);
    return {
      success: false,
      reason: 'system_error',
      explanation: '重新排程時發生系統錯誤，請稍後再試。',
      suggestions: ['檢查網路連接', '重新啟動應用程式', '聯繫技術支援']
    };
  }
}

/**
 * 計算進階任務優先級（考慮更多因素）
 */
function calculateAdvancedTaskPriority(task: {
  duration: number;
  priority?: 'low' | 'medium' | 'high';
  difficulty?: 'easy' | 'medium' | 'hard';
  dueDate?: string;
  phase?: string;
}): number {
  let score = 0;

  // 基礎優先級
  switch (task.priority) {
    case 'high': score += 50; break;
    case 'medium': score += 30; break;
    case 'low': score += 10; break;
    default: score += 20;
  }

  // 截止日期緊急性
  if (task.dueDate) {
    const daysUntilDue = calculateDaysUntil(task.dueDate);
    if (daysUntilDue <= 1) score += 100;
    else if (daysUntilDue <= 3) score += 60;
    else if (daysUntilDue <= 7) score += 30;
    else if (daysUntilDue <= 14) score += 15;
  }

  // 任務難度（困難任務需要更好的時段）
  switch (task.difficulty) {
    case 'hard': score += 25; break;
    case 'medium': score += 15; break;
    case 'easy': score += 5; break;
  }

  // 學習階段權重
  switch (task.phase) {
    case 'knowledge': score += 20; break;
    case 'practice': score += 15; break;
    case 'application': score += 25; break;
    case 'reflection': score += 10; break;
    case 'output': score += 30; break;
    case 'review': score += 5; break;
  }

  // 任務時長（長任務更難安排）
  if (task.duration >= 120) score += 20;
  else if (task.duration >= 90) score += 15;
  else if (task.duration >= 60) score += 10;

  return score;
}

/**
 * 計算緊急程度
 */
function calculateUrgencyLevel(dueDate?: string): 'critical' | 'high' | 'medium' | 'low' {
  if (!dueDate) return 'low';
  
  const days = calculateDaysUntil(dueDate);
  if (days <= 1) return 'critical';
  if (days <= 3) return 'high';
  if (days <= 7) return 'medium';
  return 'low';
}

/**
 * 尋找候選時段
 */
function findCandidateTimeSlots(
  task: { duration: number; difficulty?: string; phase?: string },
  currentSchedule: ScheduledTask[],
  availableTimeSlots: DayTimeSlots,
  calendarEvents: CalendarEvent[],
  maxDaysToSearch: number,
  preferredTimeOfDay: string,
  considerTaskDifficulty: boolean
): Array<{
  date: string;
  timeSlot: TimeSlot;
  score: number;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}> {
  const candidates: Array<{
    date: string;
    timeSlot: TimeSlot;
    score: number;
    dayOfWeek: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
  }> = [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // 從明天開始搜尋

  for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
    const currentDate = addDays(startDate, dayOffset);
    const dayOfWeek = getDayOfWeek(currentDate);
    const dateString = getDateString(currentDate);
    
    const daySlots = availableTimeSlots[dayOfWeek];
    if (!daySlots || daySlots.length === 0) continue;

    for (const slot of daySlots) {
      const availableWindows = findAvailableWindows(
        slot,
        currentSchedule.filter(st => st.date === dateString),
        calendarEvents,
        dateString
      );

      for (const window of availableWindows) {
        const windowDuration = timeToMinutes(window.end) - timeToMinutes(window.start);
        
        if (windowDuration >= task.duration) {
          const timeOfDay = getTimeOfDayCategory(window.start);
          const score = calculateSlotScore(
            window,
            timeOfDay,
            dayOffset,
            task,
            preferredTimeOfDay,
            considerTaskDifficulty
          );

          // 🔧 Create properly sized time slot for task duration
          const startMinutes = timeToMinutes(window.start);
          const endMinutes = startMinutes + task.duration;
          const calculatedEndTime = minutesToTime(endMinutes);
          
          // 🚨 Validate that the calculated end time doesn't exceed the available window
          const windowEndMinutes = timeToMinutes(window.end);
          if (endMinutes > windowEndMinutes) {
            console.warn(`⚠️ Task duration ${task.duration}min exceeds available window ${windowDuration}min at ${window.start}-${window.end}`);
            continue; // Skip this candidate
          }

          // 🔧 Log successful time slot creation for debugging
          console.log(`✅ Created time slot: ${window.start}-${calculatedEndTime} (${task.duration}min) from window ${window.start}-${window.end} (${windowDuration}min)`);

          candidates.push({
            date: dateString,
            timeSlot: {
              start: window.start,
              end: calculatedEndTime
            },
            score,
            dayOfWeek,
            timeOfDay
          });
        }
      }
    }
  }

  // 按分數排序（高分優先）
  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * 獲取時段分類
 */
function getTimeOfDayCategory(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * 計算時段分數
 */
function calculateSlotScore(
  slot: TimeSlot,
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  dayOffset: number,
  task: { difficulty?: string; phase?: string },
  preferredTimeOfDay: string,
  considerTaskDifficulty: boolean
): number {
  let score = 100; // 基礎分數

  // 時間偏好加分
  if (preferredTimeOfDay === 'any' || preferredTimeOfDay === timeOfDay) {
    score += 20;
  }

  // 越早的日期分數越高
  score -= dayOffset * 5;

  // 任務難度與時段匹配
  if (considerTaskDifficulty && task.difficulty) {
    if (task.difficulty === 'hard' && timeOfDay === 'morning') score += 15;
    if (task.difficulty === 'medium' && timeOfDay !== 'evening') score += 10;
    if (task.difficulty === 'easy') score += 5;
  }

  // 學習階段與時段匹配
  if (task.phase) {
    switch (task.phase) {
      case 'knowledge':
        if (timeOfDay === 'morning') score += 10;
        break;
      case 'practice':
        if (timeOfDay === 'morning' || timeOfDay === 'afternoon') score += 8;
        break;
      case 'application':
        if (timeOfDay === 'afternoon') score += 10;
        break;
      case 'reflection':
        if (timeOfDay === 'evening') score += 12;
        break;
      case 'output':
        if (timeOfDay === 'morning' || timeOfDay === 'afternoon') score += 10;
        break;
    }
  }

  // 時段大小加分（避免過小的時段）
  const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
  if (slotDuration >= 120) score += 10;
  else if (slotDuration >= 90) score += 5;

  return score;
}

/**
 * 選擇最佳時段
 */
function selectBestTimeSlot(
  candidates: Array<{
    date: string;
    timeSlot: TimeSlot;
    score: number;
    dayOfWeek: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
  }>,
  task: { id: string; title: string },
  priorityScore: number,
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
): {
  date: string;
  timeSlot: TimeSlot;
  score: number;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
} {
  // 對於緊急任務，選擇最早的可用時段
  if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
    return candidates[0]; // 已按分數排序，第一個是最佳的
  }

  // 對於非緊急任務，可以考慮更多因素
  return candidates[0];
}

/**
 * 分析排程影響
 */
function analyzeSchedulingImpact(
  newSlot: { date: string; timeSlot: TimeSlot },
  currentSchedule: ScheduledTask[],
  task: { id: string; title: string; duration: number }
): {
  hasConflicts: boolean;
  impactedTasks: Array<{
    id: string;
    title: string;
    originalTime: string;
    newTime: string;
    action: 'moved' | 'delayed' | 'compressed';
  }>;
} {
  // 目前實現簡單版本，未來可以擴展到處理衝突
  return {
    hasConflicts: false,
    impactedTasks: []
  };
}

/**
 * 計算日期偏移
 */
function calculateDaysShifted(originalDate: string, newDate: string): number {
  const original = new Date(originalDate);
  const newDateObj = new Date(newDate);
  const diffTime = newDateObj.getTime() - original.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 確定重新排程原因
 */
function determineRescheduleReason(
  slot: { timeOfDay: string; dayOfWeek: string },
  urgencyLevel: string,
  daysShifted: number
): string {
  if (urgencyLevel === 'critical') {
    return 'urgent_deadline';
  } else if (daysShifted <= 1) {
    return 'next_available';
  } else if (slot.timeOfDay === 'morning') {
    return 'optimal_time';
  } else {
    return 'best_fit';
  }
}

/**
 * 生成重新排程說明
 */
function generateRescheduleExplanation(
  task: { title: string; duration: number; difficulty?: string },
  slot: { date: string; timeSlot: TimeSlot; timeOfDay: string; dayOfWeek: string },
  urgencyLevel: string,
  daysShifted: number
): string {
  const dateObj = new Date(slot.date);
  const formattedDate = dateObj.toLocaleDateString('zh-TW', { 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
  
  const timeRange = `${slot.timeSlot.start}-${slot.timeSlot.end}`;
  
  let explanation = `已成功將任務重新排程至 ${formattedDate} ${timeRange}`;
  
  if (urgencyLevel === 'critical') {
    explanation += `（緊急：距離截止日期不足2天）`;
  } else if (daysShifted <= 1) {
    explanation += `（明天的最佳可用時段）`;
  } else if (slot.timeOfDay === 'morning') {
    explanation += `（最佳學習時段：上午時間有助於提高專注力）`;
  }
  
  if (task.difficulty === 'hard' && slot.timeOfDay === 'morning') {
    explanation += `。由於這是高難度任務，安排在精力最佳的上午時段。`;
  } else if (task.duration >= 90) {
    explanation += `。考慮到任務時長較長（${task.duration}分鐘），選擇了充足的時間段。`;
  }
  
  return explanation;
}

/**
 * 生成無可用時段的說明
 */
function generateNoSlotsExplanation(
  task: { title: string; duration: number; dueDate?: string },
  urgencyLevel: string
): string {
  let explanation = `無法為「${task.title}」找到合適的時間段`;
  
  if (urgencyLevel === 'critical') {
    explanation += `，且任務即將到期。`;
  } else {
    explanation += `。需要 ${task.duration} 分鐘的連續時間，但現有安排過於緊密。`;
  }
  
  return explanation;
}

/**
 * 生成重新排程建議
 */
function generateRescheduleSuggestions(
  task: { duration: number; dueDate?: string },
  availableTimeSlots: DayTimeSlots,
  urgencyLevel: string
): string[] {
  const suggestions: string[] = [];
  
  if (urgencyLevel === 'critical') {
    suggestions.push('考慮延長任務截止日期');
    suggestions.push('將任務分解為更小的子任務');
    suggestions.push('取消其他非緊急活動以騰出時間');
  } else {
    suggestions.push('增加每日可用學習時段');
    suggestions.push('考慮將長時間任務拆分為多個較短的時段');
    suggestions.push('調整其他任務的優先級');
  }
  
  // 分析可用時段並提供具體建議
  const totalAvailableTime = calculateTotalAvailableTime(availableTimeSlots);
  if (totalAvailableTime < task.duration * 2) {
    suggestions.push('您的每日可用時間可能不足，建議增加學習時間配置');
  }
  
  return suggestions;
}

/**
 * 生成優化建議
 */
function generateOptimizationSuggestions(
  task: { title: string; duration: number },
  slot: { date: string; timeOfDay: string },
  impactAnalysis: { hasConflicts: boolean; impactedTasks: any[] }
): string[] {
  const suggestions: string[] = [];
  
  if (slot.timeOfDay === 'evening') {
    suggestions.push('考慮調整作息，將重要任務安排在上午以提高效率');
  }
  
  if (task.duration >= 120) {
    suggestions.push('考慮使用番茄鐘技巧，將長時間任務分成多個專注時段');
  }
  
  suggestions.push('設定提醒避免再次錯過排程時間');
  
  return suggestions;
}

/**
 * 計算總可用時間
 */
function calculateTotalAvailableTime(availableTimeSlots: DayTimeSlots): number {
  let totalMinutes = 0;
  
  Object.values(availableTimeSlots).forEach(daySlots => {
    daySlots.forEach((slot: TimeSlot) => {
      totalMinutes += timeToMinutes(slot.end) - timeToMinutes(slot.start);
    });
  });
  
  return totalMinutes / 7; // 每日平均可用時間
}

/**
 * 🔧 Validate duration integrity and suggest solutions for compression issues
 */
export function validateTaskDuration(
  task: {
    id: string;
    title: string;
    duration: number;
    originalDuration?: number;
    difficulty?: string;
  },
  availableTimeSlots: DayTimeSlots
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  recommendSplit: boolean;
  maxAvailableSlot: number;
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let recommendSplit = false;
  
  // Find maximum available time slot
  let maxAvailableSlot = 0;
  Object.values(availableTimeSlots).forEach(daySlots => {
    daySlots.forEach((slot: TimeSlot) => {
      const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
      maxAvailableSlot = Math.max(maxAvailableSlot, slotDuration);
    });
  });

  // Check for duration compression
  if (task.originalDuration && task.duration < task.originalDuration * 0.8) {
    const compressionPercent = Math.round((1 - task.duration / task.originalDuration) * 100);
    issues.push(`Duration compressed by ${compressionPercent}% (${task.originalDuration}min → ${task.duration}min)`);
    suggestions.push('Use original estimated duration for rescheduling');
  }

  // Check if task duration exceeds available slots
  if (task.duration > maxAvailableSlot) {
    issues.push(`Task duration (${task.duration}min) exceeds largest available slot (${maxAvailableSlot}min)`);
    recommendSplit = true;
    suggestions.push(`Split task into ${Math.ceil(task.duration / maxAvailableSlot)} sessions`);
    suggestions.push('Extend available time slots');
    suggestions.push('Consider reducing task scope');
  }

  // Check for unrealistically short durations
  if (task.duration < 15) {
    issues.push(`Duration too short (${task.duration}min) for meaningful work`);
    suggestions.push('Combine with related tasks');
    suggestions.push('Review task breakdown accuracy');
  }

  // Check difficulty vs duration mismatch
  if (task.difficulty === 'hard' && task.duration < 30) {
    issues.push('Hard task with very short duration may indicate compression');
    suggestions.push('Review task complexity and time estimates');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    recommendSplit,
    maxAvailableSlot
  };
}

/**
 * 🔧 Enhanced reschedule with duration validation
 */
export function intelligentRescheduleWithValidation(
  overdueTask: {
    id: string;
    title: string;
    duration: number;
    originalDuration?: number;
    priority?: 'low' | 'medium' | 'high';
    difficulty?: 'easy' | 'medium' | 'hard';
    dueDate?: string;
    isSubtask?: boolean;
    mainTaskId?: string;
    phase?: string;
  },
  currentSchedule: ScheduledTask[],
  availableTimeSlots: DayTimeSlots,
  calendarEvents: CalendarEvent[] = [],
  options: RescheduleOptions = {}
): RescheduleResult {
  // 🔧 Validate task duration first
  const validation = validateTaskDuration(overdueTask, availableTimeSlots);
  
  if (!validation.isValid) {
    console.warn(`⚠️ Duration validation failed for task ${overdueTask.id}:`, validation.issues);
    
    // If task should be split, provide splitting suggestion
    if (validation.recommendSplit) {
      return {
        success: false,
        reason: 'task_too_long',
        explanation: `Task duration (${overdueTask.duration}min) exceeds available time slots (max: ${validation.maxAvailableSlot}min). Consider splitting this task into smaller segments.`,
        suggestions: [
          ...validation.suggestions,
          'Split task into multiple shorter sessions',
          'Schedule across multiple days',
          'Increase available time slots'
        ]
      };
    }
  }

  // Use original duration if compression detected
  const adjustedTask = {
    ...overdueTask,
    duration: overdueTask.originalDuration && overdueTask.duration < overdueTask.originalDuration * 0.8 
      ? overdueTask.originalDuration 
      : overdueTask.duration
  };

  console.log(`🔧 Using adjusted duration: ${adjustedTask.duration}min (original: ${overdueTask.duration}min)`);

  // Proceed with standard rescheduling
  return intelligentReschedule(adjustedTask, currentSchedule, availableTimeSlots, calendarEvents, options);
}

/**
 * 🆕 根據 scheduledTasks 動態計算所有被佔用的時段
 * @param scheduledTasks - 當前所有已排程任務
 * @returns { [date: string]: Array<{ start: string; end: string }> }
 */
export function getTrueOccupiedTimeSlots(scheduledTasks: ScheduledTask[]): Record<string, Array<{ start: string; end: string }>> {
  const occupied: Record<string, Array<{ start: string; end: string }>> = {};
  scheduledTasks.forEach(task => {
    if (!occupied[task.date]) occupied[task.date] = [];
    occupied[task.date].push({ start: task.timeSlot.start, end: task.timeSlot.end });
  });
  return occupied;
}