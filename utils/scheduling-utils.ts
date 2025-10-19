// utils/scheduling-utils.ts
// 共用工具函數，避免循環依賴

import { DayOfWeek } from "@/types/timeSlot";
import { Task } from "@/types/task";
import { calculateDaysUntil } from "@/utils/timeUtils";
import { log } from "@/lib/logger";

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