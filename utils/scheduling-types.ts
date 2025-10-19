// utils/scheduling-types.ts
// 共用類型定義，避免循環依賴

import { TimeSlot } from "@/types/timeSlot";

// 🔧 核心修復：智慧排程選項
export interface UrgencyLevel {
  level: 'emergency' | 'general' | 'long-term' | 'auto-check';
  reasoning?: string;
}

export interface SchedulingOptions {
  startDate?: Date;
  urgencyLevel?: UrgencyLevel; // 替代 startNextDay 的智慧排程
  startNextDay?: boolean; // 向後兼容，但會被 urgencyLevel 覆蓋
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

// 智能重新排程結果介面
export interface IntelligentRescheduleResult {
  success: boolean;
  newSlot?: {
    date: string;
    timeSlot: TimeSlot;
    duration: number;
  };
  originalSlot?: {
    date: string;
    timeSlot: TimeSlot;
    duration: number;
  };
  explanation: string;
  suggestions: string[];
  reason?: string;
}

// 智能重新排程選項
export interface RescheduleOptions {
  prioritizeUrgency?: boolean;
  maxDaysToSearch?: number;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
  considerTaskDifficulty?: boolean;
}