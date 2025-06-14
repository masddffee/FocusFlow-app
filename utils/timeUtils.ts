export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getGreeting(): string {
  const timeOfDay = getTimeOfDay();
  
  switch (timeOfDay) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    case 'night':
      return 'Good evening';
    default:
      return 'Hello';
  }
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

export function isThisWeek(date: Date): boolean {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

export function getRelativeTimeString(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  
  if (isThisWeek(date)) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
}

export function calculateDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function getTimeConstraintLevel(days: number): string {
  if (days <= 0) return "overdue";
  if (days <= 1) return "urgent";
  if (days <= 3) return "critical";
  if (days <= 7) return "high";
  if (days <= 14) return "moderate";
  if (days <= 30) return "normal";
  return "relaxed";
}

export function getTimeConstraintMessage(days: number): string {
  if (days <= 0) {
    return "⚠️ This task is overdue! Focus on immediate completion with high-impact actions.";
  }
  if (days === 1) {
    return "🔥 Due tomorrow! Emergency pace recommended - focus on essential tasks only.";
  }
  if (days <= 3) {
    return "⚡ Due in " + days + " days! Critical timeline - prioritize core requirements and skip non-essentials.";
  }
  if (days <= 7) {
    return "⏰ Due in " + days + " days. Accelerated pace recommended - focus on high-impact activities.";
  }
  if (days <= 14) {
    return "📅 Due in " + days + " days. Intensive approach suggested - balanced depth and efficiency.";
  }
  if (days <= 30) {
    return "📆 Due in " + days + " days. Moderate pace allows for comprehensive coverage.";
  }
  if (days <= 90) {
    return "🗓️ Due in " + days + " days. Relaxed timeline enables thorough exploration and mastery.";
  }
  return "📋 Due in " + days + " days. Extended timeline allows for deep learning and comprehensive skill development.";
}

export function getUrgencyColor(days: number): string {
  if (days <= 0) return "#DC2626"; // Red - overdue
  if (days <= 1) return "#DC2626"; // Red - urgent
  if (days <= 3) return "#EA580C"; // Orange-red - critical
  if (days <= 7) return "#F59E0B"; // Orange - high
  if (days <= 14) return "#EAB308"; // Yellow - moderate
  if (days <= 30) return "#10B981"; // Green - normal
  return "#6B7280"; // Gray - relaxed
}

export function formatTimeSlot(start: string, end: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function parseTimeSlot(timeSlot: string): { start: string; end: string } {
  const [start, end] = timeSlot.split(' - ');
  
  const parseTime = (time: string) => {
    const [timeStr, ampm] = time.split(' ');
    const [hours, minutes] = timeStr.split(':');
    let hour = parseInt(hours);
    
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };
  
  return {
    start: parseTime(start),
    end: parseTime(end)
  };
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function getMinutesBetween(start: string, end: string): number {
  const [startHours, startMins] = start.split(':').map(Number);
  const [endHours, endMins] = end.split(':').map(Number);
  
  const startTotalMins = startHours * 60 + startMins;
  const endTotalMins = endHours * 60 + endMins;
  
  return endTotalMins - startTotalMins;
}

export function isTimeSlotAvailable(
  start: string,
  end: string,
  existingSlots: Array<{ start: string; end: string }>
): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  
  for (const slot of existingSlots) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    
    // Check if there's any overlap
    if (
      (startMinutes >= slotStart && startMinutes < slotEnd) ||
      (endMinutes > slotStart && endMinutes <= slotEnd) ||
      (startMinutes <= slotStart && endMinutes >= slotEnd)
    ) {
      return false;
    }
  }
  
  return true;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export interface WeekDay {
  dayName: string;
  dayNumber: number;
  date: string;
  isToday: boolean;
  fullDate: Date;
}

export function getWeekDates(): WeekDay[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate the start of the week (Monday)
  const startOfWeek = new Date(today);
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Handle Sunday
  startOfWeek.setDate(today.getDate() - daysFromMonday);
  
  const weekDays: WeekDay[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    
    const isToday = date.toDateString() === today.toDateString();
    
    weekDays.push({
      dayName: dayNames[i],
      dayNumber: date.getDate(),
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      isToday: isToday,
      fullDate: new Date(date)
    });
  }
  
  return weekDays;
}