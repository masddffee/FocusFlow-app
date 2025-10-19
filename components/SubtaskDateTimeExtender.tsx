import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Alert,
  ScrollView
} from "react-native";
import { Calendar, Clock, X, AlertTriangle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";

interface SubtaskDateTimeExtenderProps {
  visible: boolean;
  onClose: () => void;
  subtaskId: string;
  subtaskTitle: string;
  currentDate: string;
  currentTimeSlot: { start: string; end: string };
  duration: number;
  onExtensionComplete: (newDate: string, newTimeSlot: { start: string; end: string }) => void;
}

export default function SubtaskDateTimeExtender({
  visible,
  onClose,
  subtaskId,
  subtaskTitle,
  currentDate,
  currentTimeSlot,
  duration,
  onExtensionComplete
}: SubtaskDateTimeExtenderProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { scheduledTasks } = useTaskStore();
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: string; end: string }[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 初始化選中日期為明天
  useEffect(() => {
    if (visible) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setSelectedDate(tomorrowStr);
      setSelectedTimeSlot(null);
      setConflictWarning("");
    }
  }, [visible]);

  // 當選中日期改變時，計算可用時間段
  useEffect(() => {
    if (selectedDate) {
      calculateAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate, scheduledTasks]);

  const calculateAvailableTimeSlots = (date: string) => {
    try {
      const { availableTimeSlots: userTimeSlots } = useSettingsStore.getState();
      const dateObj = new Date(date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[dateObj.getDay()] as keyof typeof userTimeSlots;
      const daySlots = userTimeSlots[dayOfWeek] || [];
      
      // 過濾掉已被佔用的時間段
      const occupiedSlots = scheduledTasks
        .filter(st => st.date === date && st.taskId !== subtaskId)
        .map(st => st.timeSlot);
      
      const availableSlots = daySlots.filter(slot => {
        const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start);
        if (slotDuration < duration) return false;
        
        // 檢查與已佔用時間段的衝突
        return !occupiedSlots.some(occupied => {
          const slotStart = timeToMinutes(slot.start);
          const slotEnd = Math.min(timeToMinutes(slot.end), slotStart + duration);
          const occupiedStart = timeToMinutes(occupied.start);
          const occupiedEnd = timeToMinutes(occupied.end);
          
          return (slotStart < occupiedEnd && slotEnd > occupiedStart);
        });
      });
      
      setAvailableTimeSlots(availableSlots);
      
    } catch (error) {
      console.error("計算可用時間段失敗:", error);
      setAvailableTimeSlots([]);
    }
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // 添加月份開始前的空白天數
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // 添加本月所有天數
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today; // 禁用今天及之前的日期
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) {
      Alert.alert(
        language === 'zh' ? "無效日期" : "Invalid Date",
        language === 'zh' ? "不能選擇今天或過去的日期" : "Cannot select today or past dates"
      );
      return;
    }
    
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setSelectedTimeSlot(null);
    setConflictWarning("");
  };

  const handleTimeSlotSelect = (slot: { start: string; end: string }) => {
    const adjustedSlot = {
      start: slot.start,
      end: minutesToTime(Math.min(timeToMinutes(slot.end), timeToMinutes(slot.start) + duration))
    };
    
    setSelectedTimeSlot(adjustedSlot);
    setConflictWarning("");
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert(
        language === 'zh' ? "請完成選擇" : "Please Complete Selection",
        language === 'zh' ? "請選擇日期和時間段" : "Please select both date and time slot"
      );
      return;
    }

    try {
      onExtensionComplete(selectedDate, selectedTimeSlot);
      onClose();
    } catch (error) {
      console.error("子任務延長失敗:", error);
      Alert.alert(
        language === 'zh' ? "延長失敗" : "Extension Failed",
        language === 'zh' ? "無法延長子任務，請稍後再試" : "Unable to extend subtask, please try again later"
      );
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'zh' ? "延長子任務" : "Extend Subtask"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* 任務信息 */}
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{subtaskTitle}</Text>
            <Text style={styles.taskMeta}>
              {language === 'zh' ? "當前時間" : "Current time"}: {formatDisplayDate(currentDate)} {currentTimeSlot.start}-{currentTimeSlot.end}
            </Text>
            <Text style={styles.taskMeta}>
              {language === 'zh' ? "持續時間" : "Duration"}: {duration} {language === 'zh' ? "分鐘" : "minutes"}
            </Text>
          </View>

          {/* 日期選擇 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'zh' ? "選擇新日期" : "Select New Date"}
            </Text>
            
            <View style={styles.calendarContainer}>
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                  <Text style={styles.navButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthYear}</Text>
                <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                  <Text style={styles.navButtonText}>{'>'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.weekDayText}>{day}</Text>
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
                          isDateDisabled(date) && styles.disabledDay,
                        ]}
                        onPress={() => handleDateSelect(date)}
                        disabled={isDateDisabled(date)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isDateSelected(date) && styles.selectedDayText,
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
          </View>

          {/* 時間段選擇 */}
          {selectedDate && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'zh' ? "選擇時間段" : "Select Time Slot"}
              </Text>
              
              {availableTimeSlots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <AlertTriangle size={24} color={Colors.light.warning} />
                  <Text style={styles.noSlotsText}>
                    {language === 'zh' ? "該日期沒有可用的時間段" : "No available time slots for this date"}
                  </Text>
                </View>
              ) : (
                <View style={styles.timeSlotsContainer}>
                  {availableTimeSlots.map((slot, index) => {
                    const adjustedEnd = minutesToTime(Math.min(timeToMinutes(slot.end), timeToMinutes(slot.start) + duration));
                    const isSelected = selectedTimeSlot?.start === slot.start;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeSlotButton,
                          isSelected && styles.selectedTimeSlot
                        ]}
                        onPress={() => handleTimeSlotSelect(slot)}
                      >
                        <Clock size={16} color={isSelected ? '#FFFFFF' : Colors.light.primary} />
                        <Text style={[
                          styles.timeSlotText,
                          isSelected && styles.selectedTimeSlotText
                        ]}>
                          {slot.start} - {adjustedEnd}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* 衝突警告 */}
          {conflictWarning && (
            <View style={styles.warningContainer}>
              <AlertTriangle size={20} color={Colors.light.warning} />
              <Text style={styles.warningText}>{conflictWarning}</Text>
            </View>
          )}
        </ScrollView>

        {/* 操作按鈕 */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>
              {language === 'zh' ? "取消" : "Cancel"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              (!selectedDate || !selectedTimeSlot) && styles.disabledButton
            ]} 
            onPress={handleConfirm}
            disabled={!selectedDate || !selectedTimeSlot}
          >
            <Text style={[
              styles.confirmButtonText,
              (!selectedDate || !selectedTimeSlot) && styles.disabledButtonText
            ]}>
              {language === 'zh' ? "確認延長" : "Confirm Extension"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: Theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  taskInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  taskTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  taskMeta: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.xs,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  calendarContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  navButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.background,
  },
  navButtonText: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  monthTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: Colors.light.subtext,
    paddingVertical: Theme.spacing.sm,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.radius.md,
  },
  selectedDay: {
    backgroundColor: Colors.light.primary,
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledDayText: {
    color: Colors.light.subtext,
  },
  timeSlotsContainer: {
    gap: Theme.spacing.sm,
  },
  timeSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  selectedTimeSlot: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  timeSlotText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  noSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.warning + '10',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  noSlotsText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.warning,
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.warning + '10',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  warningText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.warning,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.light.subtext,
  },
  confirmButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButtonText: {
    color: Colors.light.card,
  },
});