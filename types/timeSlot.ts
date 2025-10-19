export interface TimeSlot {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface DayTimeSlots {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface ScheduledTask {
  id: string; // 🆕 排程任務的唯一標識
  taskId: string; // 關聯的主任務 ID
  title: string; // 🆕 排程任務的標題
  date: string; // Format: "YYYY-MM-DD"
  timeSlot: TimeSlot;
  duration: number; // in minutes
  // 🆕 可選的子任務資訊
  subtaskId?: string; // 如果這是子任務的排程
  subtaskTitle?: string; // 子任務標題
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';