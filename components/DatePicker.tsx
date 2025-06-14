import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Modal, Platform } from "react-native";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface DatePickerProps {
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

export default function DatePicker({
  selectedDate,
  onDateSelect,
  placeholder = "Select due date for dynamic range calculation",
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateSelect = (date: Date) => {
    const dateString = date.toISOString().split("T")[0];
    onDateSelect(dateString);
    setIsVisible(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const clearDate = () => {
    onDateSelect("");
    setIsVisible(false);
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setIsVisible(true)}>
        <Calendar size={16} color={Colors.light.subtext} />
        <Text style={[styles.triggerText, !selectedDate && styles.placeholder]}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </Text>
        {selectedDate && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              clearDate();
            }}
            style={styles.clearButton}
          >
            <X size={16} color={Colors.light.subtext} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Due Date</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarContainer}>
            <View style={styles.monthNavigation}>
              <TouchableOpacity
                onPress={() => navigateMonth("prev")}
                style={styles.navButton}
              >
                <ChevronLeft size={20} color={Colors.light.primary} />
              </TouchableOpacity>
              
              <Text style={styles.monthTitle}>{monthYear}</Text>
              
              <TouchableOpacity
                onPress={() => navigateMonth("next")}
                style={styles.navButton}
              >
                <ChevronRight size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((date, index) => (
                <View key={index} style={styles.dayCell}>
                  {date && (
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                        isDateSelected(date) && styles.selectedDay,
                        isToday(date) && !isDateSelected(date) && styles.todayDay,
                        isDateDisabled(date) && styles.disabledDay,
                      ]}
                      onPress={() => handleDateSelect(date)}
                      disabled={isDateDisabled(date)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isDateSelected(date) && styles.selectedDayText,
                          isToday(date) && !isDateSelected(date) && styles.todayDayText,
                          isDateDisabled(date) && styles.disabledDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleDateSelect(new Date())}
            >
              <Text style={styles.quickActionText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleDateSelect(tomorrow);
              }}
            >
              <Text style={styles.quickActionText}>Tomorrow</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                handleDateSelect(nextWeek);
              }}
            >
              <Text style={styles.quickActionText}>Next Week</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.light.card,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
  },
  placeholder: {
    color: Colors.light.subtext,
  },
  clearButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  calendarContainer: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.lg,
  },
  navButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
  },
  monthTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  weekDaysHeader: {
    flexDirection: "row",
    marginBottom: Theme.spacing.md,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.subtext,
    paddingVertical: Theme.spacing.sm,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%", // 100% / 7 days
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Theme.radius.md,
  },
  selectedDay: {
    backgroundColor: Colors.light.primary,
  },
  todayDay: {
    backgroundColor: Colors.light.primary + "20",
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
  },
  selectedDayText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  todayDayText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  disabledDayText: {
    color: Colors.light.subtext,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  quickActionButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickActionText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.primary,
    fontWeight: "500",
  },
});