import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  SafeAreaView
} from "react-native";
import { Stack, router } from "expo-router";
import { Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import ScheduleItem from "@/components/ScheduleItem";
import WeekCalendar from "@/components/WeekCalendar";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Task } from "@/types/task";
import ReflectionModal from "@/components/ReflectionModal";

type ViewMode = "day" | "week" | "month";

const DEADLINE_WARNING_DAYS = 3; // 提前警告天數

export default function TasksScreen() {
  const { t } = useTranslation();
  const { tasks, scheduledTasks, removeScheduledTask } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 反思模態框狀態
  const [reflectionModal, setReflectionModal] = useState<{
    visible: boolean;
    taskId: string;
    taskTitle: string;
    daysUntilDeadline: number;
  }>({
    visible: false,
    taskId: "",
    taskTitle: "",
    daysUntilDeadline: 0
  });
  
  // 檢查逾期和即將到期的任務
  useEffect(() => {
    const checkOverdueTasks = () => {
      const now = new Date();
      const dateString = selectedDate.toISOString().split('T')[0];
      const todayScheduled = scheduledTasks.filter(st => st.date === dateString);
      
      todayScheduled.forEach(st => {
        const task = tasks.find(t => t.id === st.taskId);
        if (!task || task.completed) return;
        
        const [hours, minutes] = st.timeSlot.start.split(':').map(Number);
        const scheduleDateTime = new Date(selectedDate);
        scheduleDateTime.setHours(hours, minutes, 0, 0);
        
        if (st.duration) {
          scheduleDateTime.setMinutes(scheduleDateTime.getMinutes() + st.duration);
        }
        
        // 檢查是否逾期
        if (now > scheduleDateTime) {
          // 檢查主任務的截止日期
          let mainTask = task;
          if (st.taskId.includes('_')) {
            const mainTaskId = st.taskId.split('_')[0];
            mainTask = tasks.find(t => t.id === mainTaskId) || task;
          }
          
          if (mainTask.dueDate) {
            const dueDate = new Date(mainTask.dueDate);
            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // 如果距離截止日期少於警告天數且未處理
            if (diffDays <= DEADLINE_WARNING_DAYS && diffDays > 0) {
              setReflectionModal({
                visible: true,
                taskId: mainTask.id,
                taskTitle: mainTask.title,
                daysUntilDeadline: diffDays
              });
            }
          }
        }
      });
    };
    
    // 檢查逾期任務
    checkOverdueTasks();
    
    // 每分鐘檢查一次
    const interval = setInterval(checkOverdueTasks, 60000);
    return () => clearInterval(interval);
  }, [selectedDate, scheduledTasks, tasks]);
  
  // 處理 AI 重新排程
  const handleRescheduleTask = async (task: Task & { scheduledTime?: string; dueDate?: string; mainTaskId?: string; phase?: string; subtaskId?: string }) => {
    try {
      const { availableTimeSlots } = useSettingsStore.getState();
      const { addScheduledTask } = useTaskStore.getState();

      // 🔧 FIX: Always use original subtask duration, not scheduled duration
      let originalDuration = task.duration || 60;
      
      // For subtasks, retrieve original estimated duration from source
      const isSubtaskTask = !!task.mainTaskId || task.id.includes('_');
      if (isSubtaskTask && task.mainTaskId && task.subtaskId) {
        const mainTask = tasks.find(t => t.id === task.mainTaskId);
        if (mainTask?.subtasks) {
          const originalSubtask = mainTask.subtasks.find(s => s.id === task.subtaskId);
          if (originalSubtask) {
            // 🎯 Priority: userEstimatedDuration > aiEstimatedDuration > fallback
            originalDuration = originalSubtask.userEstimatedDuration || originalSubtask.aiEstimatedDuration || 60;
            console.log(`🔍 Retrieved original subtask duration: ${originalDuration}min (was using: ${task.duration}min)`);
          }
        }
      }

      // 🚨 Detect and warn about significant duration compression
      if (task.duration && task.duration < originalDuration * 0.8) {
        const compressionPercent = Math.round((1 - task.duration / originalDuration) * 100);
        console.warn(`⚠️ Duration compression detected: ${originalDuration}min → ${task.duration}min (${compressionPercent}% reduction)`);
  
        const language = useSettingsStore.getState().language;
        Alert.alert(
          language === 'zh' ? '⚠️ 時間壓縮警告' : '⚠️ Duration Compression Warning',
          language === 'zh' 
            ? `檢測到任務時間被壓縮了 ${compressionPercent}%（${originalDuration}分鐘 → ${task.duration}分鐘）。將使用原始預估時間進行重新排程。`
            : `Task duration has been compressed by ${compressionPercent}% (${originalDuration}min → ${task.duration}min). Will use original estimated duration for rescheduling.`,
          [{ text: language === 'zh' ? '了解' : 'OK' }]
        );
      }

      // 準備重新排程的任務數據
      const isSubtask = !!task.mainTaskId || task.id.includes('_');
      const overdueTask = {
        id: task.id,
        title: task.title,
        duration: originalDuration, // 🔧 Use original duration, not compressed
        priority: task.priority,
        difficulty: task.difficulty,
        dueDate: task.dueDate,
        isSubtask: isSubtask,
        mainTaskId: task.mainTaskId,
        phase: task.phase,
      };

      console.log(`🎯 Rescheduling task: ${task.title}`);
      console.log(`📊 Duration: ${originalDuration}min | Difficulty: ${task.difficulty} | Priority: ${task.priority}`);

      // 從目前排程中移除
      const dateString = selectedDate.toISOString().split('T')[0];
      removeScheduledTask(task.id);

      // 使用增強的智能重新排程算法（包含驗證）
      const { intelligentRescheduleWithValidation } = await import('@/utils/scheduling');
      
      const rescheduleResult = intelligentRescheduleWithValidation(
        {
          ...overdueTask,
          originalDuration: task.duration // Pass original for comparison
        },
        scheduledTasks,
        availableTimeSlots,
        [], // Calendar events
        {
          prioritizeUrgency: true,
          maxDaysToSearch: 14,
          preferredTimeOfDay: 'any',
          considerTaskDifficulty: true,
        }
      );

      if (rescheduleResult.success && rescheduleResult.newSlot) {
        // 🔧 Validate duration consistency before creating scheduled task
        if (rescheduleResult.newSlot.duration !== originalDuration) {
          console.error(`❌ Duration mismatch: expected ${originalDuration}min, got ${rescheduleResult.newSlot.duration}min`);
          rescheduleResult.newSlot.duration = originalDuration; // Force correct duration
        }

        // 添加新的排程
        const newScheduledTask = {
          taskId: task.id,
          date: rescheduleResult.newSlot.date,
          timeSlot: rescheduleResult.newSlot.timeSlot,
          duration: rescheduleResult.newSlot.duration,
        };
        
        addScheduledTask(newScheduledTask);

        // 📊 Log successful rescheduling details
        console.log(`✅ Reschedule Success:`, {
          taskId: task.id,
          originalDuration: originalDuration,
          newDuration: rescheduleResult.newSlot.duration,
          newDate: rescheduleResult.newSlot.date,
          newTimeSlot: rescheduleResult.newSlot.timeSlot
        });

        // 顯示詳細的成功訊息
        const language = useSettingsStore.getState().language;
        const beforeAfterMessage = rescheduleResult.originalSlot 
          ? `\n\n${language === 'zh' ? '原時間' : 'Original'}: ${rescheduleResult.originalSlot.date} ${rescheduleResult.originalSlot.timeSlot.start}-${rescheduleResult.originalSlot.timeSlot.end}\n${language === 'zh' ? '新時間' : 'New time'}: ${rescheduleResult.newSlot.date} ${rescheduleResult.newSlot.timeSlot.start}-${rescheduleResult.newSlot.timeSlot.end}`
          : '';

        Alert.alert(
          language === 'zh' ? '🤖 AI 重新排程成功' : '🤖 AI Reschedule Successful',
          `${rescheduleResult.explanation}${beforeAfterMessage}`,
          [
            { text: language === 'zh' ? '查看建議' : 'View Suggestions', onPress: () => {
              const suggestionsText = rescheduleResult.suggestions.join('\n• ');
              Alert.alert(
                language === 'zh' ? '優化建議' : 'Optimization Suggestions',
                `• ${suggestionsText}`,
                [{ text: language === 'zh' ? '了解' : 'Got it' }]
              );
            }},
            { text: language === 'zh' ? '確定' : 'OK' }
          ]
        );
        
      } else {
        // 🔍 Enhanced failure analysis with debugging info
        console.error(`❌ Reschedule Failed:`, {
          taskId: task.id,
          title: task.title,
          requestedDuration: originalDuration,
          reason: rescheduleResult.reason,
          explanation: rescheduleResult.explanation
        });

        // 顯示失敗原因和建議
        const language = useSettingsStore.getState().language;
        const suggestionsText = rescheduleResult.suggestions.join('\n• ');
        
        Alert.alert(
          language === 'zh' ? '❌ 無法重新排程' : '❌ Unable to Reschedule',
          `${rescheduleResult.explanation}\n\n${language === 'zh' ? '建議：' : 'Suggestions:'}\n• ${suggestionsText}`,
          [
            { text: language === 'zh' ? '延長截止日期' : 'Extend Deadline', onPress: () => {
              router.push({
                pathname: "/task-detail",
                params: { 
                  id: task.mainTaskId || task.id,
                  action: "extendDeadline"
                }
              });
            }},
            { text: language === 'zh' ? '了解' : 'Got it', style: 'cancel' }
          ]
        );
      }
      
    } catch (error) {
      console.error("❌ Reschedule error:", error);
      const language = useSettingsStore.getState().language;
      Alert.alert(
        language === 'zh' ? '系統錯誤' : 'System Error', 
        language === 'zh' ? '重新排程時發生錯誤，請稍後再試。' : 'An error occurred during rescheduling. Please try again later.'
      );
    }
  };
  
  // 處理反思完成
  const handleReflectionComplete = (reasonId: string, customReason?: string) => {
    const { taskId } = reflectionModal;
    
    // 記錄反思原因（這裡可以保存到持久化存儲）
    console.log("Reflection completed:", { taskId, reasonId, customReason });
    
    // 導航到任務詳情頁面進行調整
    router.push({
      pathname: "/task-detail",
      params: { 
        id: taskId,
        action: "adjustPlan"
      }
    });
    
    setReflectionModal({
      visible: false,
      taskId: "",
      taskTitle: "",
      daysUntilDeadline: 0
    });
  };
  
  const handleTaskPress = (task: any) => {
      router.push({
        pathname: "/task-detail",
      params: { id: task.mainTaskId || task.id },
      });
  };
  
  const handleStartTask = (task: any) => {
    const durationInSeconds = (task.duration || 25) * 60;
    
      router.push({
        pathname: "/focus",
      params: { 
        taskId: task.id,
        duration: durationInSeconds.toString()
      },
      });
  };
  
  const getDateRange = () => {
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      };
      
      return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}, ${selectedDate.getFullYear()}`;
  };
  
  const navigateWeek = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedDate(newDate);
  };
  
  const getScheduleForSelectedDate = () => {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const dayScheduledTasks = scheduledTasks.filter(st => st.date === selectedDateStr);
      
      const scheduledTasksWithDetails = dayScheduledTasks
        .map(st => {
        const isSubtask = st.taskId.includes('_');
        
        if (isSubtask) {
          const taskIdParts = st.taskId.split('_');
          const mainTaskId = taskIdParts[0];
          const mainTask = tasks.find(t => t.id === mainTaskId);
          
          if (!mainTask || !mainTask.subtasks) return null;
          
          // Parse subtask ID
          let subtaskId: string;
          let isSegmented = false;
          let segmentIndex: string | null = null;
          
          const segmentPos = taskIdParts.indexOf('segment');
          if (segmentPos > 0 && segmentPos < taskIdParts.length - 1) {
            isSegmented = true;
            segmentIndex = taskIdParts[segmentPos + 1];
            subtaskId = taskIdParts.slice(1, segmentPos).join('_');
          } else {
            subtaskId = taskIdParts.slice(1).join('_');
          }
          
          const subtask = mainTask.subtasks.find(s => s.id === subtaskId);
          if (!subtask) return null;
          
          const subtaskTitle = subtask.title || subtask.text;
          let displayTitle = `${mainTask.title}: ${subtaskTitle}`;
          if (isSegmented && segmentIndex) {
            displayTitle += ` (${t('common.part')} ${segmentIndex})`;
          }
          
          // 🔧 FIX: Prioritize original subtask duration over scheduled duration
          // This prevents duration compression from cascading through rescheduling
          const originalDuration = subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60;
          const displayDuration = st.duration || originalDuration;
          
          // 🚨 Detect and log duration mismatches for debugging
          if (st.duration && st.duration !== originalDuration) {
            console.warn(`⚠️ Duration mismatch detected for ${subtask.text}: scheduled=${st.duration}min, original=${originalDuration}min`);
          }

          return {
            id: st.taskId,
            title: displayTitle,
            description: subtask.text,
            duration: displayDuration,
            difficulty: subtask.difficulty,
            phase: subtask.phase,
            completed: subtask.completed,
            scheduledTime: st.timeSlot.start,
            scheduledEndTime: st.timeSlot.end,
            isSubtask: true,
            isSegmented,
            segmentIndex,
            mainTaskId,
            subtaskId,
            category: mainTask.category,
            priority: mainTask.priority,
            timeSlotMinutes: timeToMinutes(st.timeSlot.start),
            // 🔧 Store both durations for debugging and rescheduling
            originalDuration: originalDuration,
            scheduledDuration: st.duration,
          };
        } else {
          const task = tasks.find(t => t.id === st.taskId);
          if (!task) return null;
          
          return {
            ...task,
            scheduledTime: st.timeSlot.start,
            scheduledEndTime: st.timeSlot.end,
            isSubtask: false,
            timeSlotMinutes: timeToMinutes(st.timeSlot.start),
          };
        }
        })
      .filter((task): task is any => task !== null);
    
    scheduledTasksWithDetails.sort((a, b) => a.timeSlotMinutes - b.timeSlotMinutes);
    
    return scheduledTasksWithDetails;
  };
  
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const getPeriodTitle = (hour: number): string => {
    if (hour < 12) return t('schedule.morning');
    if (hour < 18) return t('schedule.afternoon');
    return t('schedule.evening');
  };
  
  const groupTasksByPeriod = (tasks: any[]) => {
    const groups = new Map<string, any[]>();
    
    tasks.forEach(task => {
      const hour = parseInt(task.scheduledTime.split(':')[0]);
      const period = getPeriodTitle(hour);
      
      if (!groups.has(period)) {
        groups.set(period, []);
      }
      groups.get(period)!.push(task);
    });
      
    return Array.from(groups.entries()).map(([period, tasks]) => ({
      period,
      tasks
    }));
  };
  
  const scheduledTasksList = getScheduleForSelectedDate();
  const groupedTasks = groupTasksByPeriod(scheduledTasksList);
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: t('tabs.tasks'),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/add-task")}>
              <Plus size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      {/* Week Navigator */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => navigateWeek('prev')}>
          <ChevronLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.weekRange}>{getDateRange()}</Text>
        <TouchableOpacity onPress={() => navigateWeek('next')}>
          <ChevronRight size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
      
      {/* Week Calendar */}
      <WeekCalendar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
      
      {/* View Mode Tabs */}
      <View style={styles.viewModeTabs}>
        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeTab, viewMode === mode && styles.viewModeTabActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[
              styles.viewModeTabText,
              viewMode === mode && styles.viewModeTabTextActive
            ]}>
              {t(`viewMode.${mode}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Schedule View */}
      <ScrollView 
        style={styles.scheduleContainer}
        showsVerticalScrollIndicator={false}
      >
        {groupedTasks.map((group) => (
          <View key={group.period} style={styles.periodSection}>
            <Text style={styles.periodTitle}>{group.period}</Text>
            {group.tasks.map((task) => (
              <ScheduleItem
                key={task.id}
                task={task}
                onPress={handleTaskPress}
                onStart={handleStartTask}
                scheduledDate={selectedDate.toISOString().split('T')[0]}
                onReschedule={handleRescheduleTask}
                onRemoveSchedule={(taskId) => {
                  removeScheduledTask(taskId);
                }}
              />
            ))}
          </View>
        ))}
        
        {groupedTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Calendar size={48} color={Colors.light.subtext} />
            <Text style={styles.emptyText}>{t('tasks.noScheduledTasks')}</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Reflection Modal */}
      <ReflectionModal
        visible={reflectionModal.visible}
        onClose={() => setReflectionModal({ ...reflectionModal, visible: false })}
        taskId={reflectionModal.taskId}
        taskTitle={reflectionModal.taskTitle}
        daysUntilDeadline={reflectionModal.daysUntilDeadline}
        onReflectionComplete={handleReflectionComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  weekRange: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  viewModeTabs: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  viewModeTabActive: {
    borderBottomColor: Colors.light.primary,
  },
  viewModeTabText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
  },
  viewModeTabTextActive: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
  },
  periodSection: {
    marginBottom: Theme.spacing.lg,
  },
  periodTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.sm,
    textTransform: "uppercase",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Theme.spacing.xl * 2,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginTop: Theme.spacing.md,
  },
});