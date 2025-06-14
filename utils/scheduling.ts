import { Task } from "@/types/task";
import { TimeSlot, DayTimeSlots, ScheduledTask, CalendarEvent, DayOfWeek } from "@/types/timeSlot";

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