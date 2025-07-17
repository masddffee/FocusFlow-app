import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { ScheduledTask } from "@/types/timeSlot";

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  scheduledTasks?: ScheduledTask[];
}

export default function WeekCalendar({ selectedDate, onDateSelect, scheduledTasks = [] }: WeekCalendarProps) {
  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    
    return days;
  };
  
  const weekDays = getWeekDays();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const isSelectedDate = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };
  
  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };
  
  // 🆕 檢查某日期是否有排程
  const hasScheduledTasks = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return scheduledTasks.some(task => task.date === dateStr);
  };
  
  // 🆕 獲取某日期的排程任務數量
  const getScheduledTaskCount = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return scheduledTasks.filter(task => task.date === dateStr).length;
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {weekDays.map((date, index) => (
          <TouchableOpacity
            key={date.toISOString()}
            style={[
              styles.dayContainer,
              isSelectedDate(date) && styles.selectedDayContainer,
              isToday(date) && !isSelectedDate(date) && styles.todayContainer,
            ]}
            onPress={() => onDateSelect(date)}
          >
            <Text
              style={[
                styles.dayName,
                isSelectedDate(date) && styles.selectedDayName,
              ]}
            >
              {dayNames[index]}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                isSelectedDate(date) && styles.selectedDayNumber,
                isToday(date) && !isSelectedDate(date) && styles.todayNumber,
              ]}
            >
              {date.getDate()}
            </Text>
            
            {/* 🆕 排程指示器 */}
            {hasScheduledTasks(date) && (
              <View style={styles.scheduleIndicator}>
                <Text style={styles.scheduleIndicatorText}>
                  {getScheduledTaskCount(date)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  scrollContainer: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 70,
    borderRadius: Theme.radius.lg,
    backgroundColor: Colors.light.card,
  },
  selectedDayContainer: {
    backgroundColor: Colors.light.primary,
  },
  todayContainer: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  dayName: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: Colors.light.subtext,
    marginBottom: 4,
  },
  selectedDayName: {
    color: "#FFFFFF",
  },
  dayNumber: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  selectedDayNumber: {
    color: "#FFFFFF",
  },
  todayNumber: {
    color: Colors.light.primary,
  },
  scheduleIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    padding: 2,
  },
  scheduleIndicatorText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});