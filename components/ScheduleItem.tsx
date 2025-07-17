import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { MoreHorizontal, BookOpen, Target, Brain, Clock, AlertCircle, Calendar, Shuffle, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { Task } from "@/types/task";
import { router } from "expo-router";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";

interface ExtendedTask extends Task {
  scheduledTime?: string;
  scheduledEndTime?: string;
  isSubtask?: boolean;
  isSegmented?: boolean;
  segmentIndex?: string;
  mainTaskId?: string;
  subtaskId?: string;
  phase?: string;
  scheduledDate?: string; // 🆕 排程日期
}

interface ScheduleItemProps {
  task: ExtendedTask;
  onPress: (task: ExtendedTask) => void;
  onStart?: (task: ExtendedTask) => void;
  showTime?: boolean;
  scheduledDate?: string; // 🆕 排程日期
  onReschedule?: (task: ExtendedTask) => void; // 🆕 重新排程回調
  onRemoveSchedule?: (taskId: string) => void; // 🆕 移除排程回調
}

export default function ScheduleItem({ 
  task, 
  onPress, 
  onStart, 
  showTime = true,
  scheduledDate,
  onReschedule,
  onRemoveSchedule
}: ScheduleItemProps) {
  const { t } = useTranslation();
  const [isOverdue, setIsOverdue] = useState(false);
  const [showDecisionBox, setShowDecisionBox] = useState(false);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState<number | null>(null);
  
  const { updateTask, removeScheduledTask } = useTaskStore();
  const { language } = useSettingsStore();

  // 🆕 檢查是否逾期
  useEffect(() => {
    if (!task.completed && task.scheduledTime && scheduledDate) {
      const now = new Date();
      const scheduleDateTime = new Date(scheduledDate);
      const [hours, minutes] = task.scheduledTime.split(':').map(Number);
      scheduleDateTime.setHours(hours, minutes, 0, 0);
      
      // 如果任務有持續時間，計算結束時間
      if (task.duration) {
        scheduleDateTime.setMinutes(scheduleDateTime.getMinutes() + task.duration);
      }
      
      // 檢查是否已經過了排程時間
      if (now > scheduleDateTime) {
        setIsOverdue(true);
        setShowDecisionBox(true);
      }
    }
    
    // 計算距離截止日期的天數
    if (task.dueDate) {
      const today = new Date();
      const dueDate = new Date(task.dueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilDeadline(diffDays);
    }
  }, [task, scheduledDate]);
  
  // 🆕 處理延長截止日期
  const handleExtendDeadline = () => {
    router.push({
      pathname: "/task-detail",
      params: { 
        id: task.mainTaskId || task.id,
        action: "extendDeadline"
      }
    });
    setShowDecisionBox(false);
  };
  
  // 🆕 處理重新分配子任務
  const handleReassignSubtask = () => {
    if (onReschedule) {
      onReschedule(task);
    } else {
      Alert.alert(
        language === 'zh' ? "重新排程" : "Reschedule",
        language === 'zh' 
          ? "AI 將為此子任務尋找下一個可用時段" 
          : "AI will find the next available time slot for this subtask",
        [
          { text: language === 'zh' ? "取消" : "Cancel", style: "cancel" },
          { 
            text: language === 'zh' ? "確認" : "Confirm", 
            onPress: () => {
              // 觸發 AI 重新排程
              if (task.id && onRemoveSchedule) {
                onRemoveSchedule(task.id);
              }
            }
          }
        ]
      );
    }
    setShowDecisionBox(false);
  };
  
  // 🆕 處理移除子任務
  const handleRemoveSubtask = () => {
    Alert.alert(
      language === 'zh' ? "移除子任務" : "Remove Subtask",
      language === 'zh' 
        ? "確定要移除此子任務嗎？此操作無法復原。" 
        : "Are you sure you want to remove this subtask? This action cannot be undone.",
      [
        { text: language === 'zh' ? "取消" : "Cancel", style: "cancel" },
        { 
          text: language === 'zh' ? "移除" : "Remove", 
          style: "destructive",
          onPress: () => {
            if (task.id && onRemoveSchedule) {
              onRemoveSchedule(task.id);
            }
          }
        }
      ]
    );
    setShowDecisionBox(false);
  };
  
  const getTaskTypeColor = () => {
    // 🆕 如果逾期，使用紅色
    if (isOverdue) {
      return Colors.light.error;
    }
    
    if (task.phase) {
      // Color based on learning phase for subtasks
      switch (task.phase) {
        case "knowledge":
          return "#3B82F6"; // Blue
        case "practice":
          return "#10B981"; // Green
        case "application":
          return "#F59E0B"; // Orange
        case "reflection":
          return "#8B5CF6"; // Purple
        case "output":
          return "#EF4444"; // Red
        case "review":
          return "#6366F1"; // Indigo
        default:
          return Colors.light.primary;
      }
    }
    
    switch (task.category) {
      case "work":
        return Colors.light.primary;
      case "study":
        return Colors.light.secondary;
      case "personal":
        return Colors.light.success;
      default:
        return Colors.light.primary;
    }
  };
  
  const getTaskTypeBadge = () => {
    if (task.isSubtask && task.phase) {
      // Show phase for subtasks
      return getPhaseLabel(task.phase);
    }
    
    switch (task.category) {
      case "work":
        return t('categories.work');
      case "study":
        return t('categories.study');
      case "personal":
        return t('categories.personal');
      default:
        return t('common.start');
    }
  };
  
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "knowledge":
        return `📚 ${t('phases.knowledge')}`;
      case "practice":
        return `🛠️ ${t('phases.practice')}`;
      case "application":
        return `🎯 ${t('phases.application')}`;
      case "reflection":
        return `🤔 ${t('phases.reflection')}`;
      case "output":
        return `📝 ${t('phases.output')}`;
      case "review":
        return `🔄 ${t('phases.review')}`;
      default:
        return t('common.start');
    }
  };
  
  const formatTimeRange = () => {
    if (!task.scheduledTime) {
      return t('schedule.noSchedule');
    }
    
    // 🆕 改進的時間計算：優先使用 scheduledEndTime
    if (task.scheduledEndTime) {
      return `${task.scheduledTime} - ${task.scheduledEndTime}`;
    }
    
    // 🆕 使用任務的實際 duration 來計算結束時間
    if (task.duration) {
    const [hours, minutes] = task.scheduledTime.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + task.duration);
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }
    
    return task.scheduledTime;
  };
  
  const handlePress = () => {
    if (task.isSubtask && task.mainTaskId) {
      // Navigate to main task detail for subtasks
      onPress({
        ...task,
        id: task.mainTaskId
      } as ExtendedTask);
    } else {
      onPress(task);
    }
  };

  // 🆕 智能處理 Start 按鈕 - 正確傳遞任務時長
  const handleStartPress = () => {
    try {
      if (onStart) {
        // Use the provided onStart callback
        onStart(task);
      } else {
        // 🆕 直接導航到 focus 並傳遞正確的參數
        const durationInSeconds = (task.duration || 25) * 60; // 轉換分鐘到秒
        
        console.log(`🚀 ScheduleItem: Starting focus for ${task.isSubtask ? 'subtask' : 'task'}: ${task.title}`);
        console.log(`⏱️ ScheduleItem: Duration: ${task.duration || 25}min (${durationInSeconds}s)`);
        
        router.push({
          pathname: "/focus",
          params: { 
            taskId: task.id,
            duration: durationInSeconds.toString()
          }
        });
      }
    } catch (error) {
      console.error("❌ ScheduleItem: Start navigation error:", error);
    }
  };
  
  return (
    <View>
    <TouchableOpacity
      style={[
        styles.container,
          { borderLeftColor: getTaskTypeColor() },
          isOverdue && styles.overdueContainer
      ]}
        onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {showTime && (
              <View style={styles.timeContainer}>
                <Text style={[styles.timeRange, isOverdue && styles.overdueText]}>
                  {formatTimeRange()}
                </Text>
                {isOverdue && (
                  <AlertCircle size={16} color={Colors.light.error} style={styles.overdueIcon} />
                )}
              </View>
          )}
          
          <View style={[
            styles.typeBadge,
            { backgroundColor: getTaskTypeColor() }
          ]}>
            <Text style={styles.typeText}>{getTaskTypeBadge()}</Text>
          </View>
          
            {task.isSubtask && (
              <View style={styles.subtaskBadge}>
                <Text style={styles.subtaskBadgeText}>
                  {task.isSegmented ? `${t('common.part')} ${task.segmentIndex}` : t('taskDetail.subtasks')}
                </Text>
              </View>
            )}
            
            {/* 🆕 更多操作按鈕 */}
            {task.isSubtask && !task.completed && (
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => setShowDecisionBox(!showDecisionBox)}
              >
            <MoreHorizontal size={16} color={Colors.light.subtext} />
          </TouchableOpacity>
            )}
        </View>
        
          <Text style={[styles.title, isOverdue && styles.overdueText]} numberOfLines={task.isSubtask ? 2 : 1}>
          {task.title}
        </Text>
        
          {task.description && !task.isSubtask && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        
        <View style={styles.footer}>
          <View style={styles.metaInfo}>
            {task.duration && (
                <Text style={styles.metaText}>{task.duration} {t('timeUnits.minutes', { count: 1 }).replace('1 ', '')}</Text>
            )}
            {task.difficulty && (
                <Text style={styles.metaText}>• {t(`difficulty.${task.difficulty}`)}</Text>
              )}
              {task.priority && !task.isSubtask && (
                <Text style={styles.metaText}>• {t(`priority.${task.priority}`)} {t('addTask.priority').toLowerCase()}</Text>
            )}
          </View>
          
            {!task.completed && (
            <Button
                title={t('common.start')}
                onPress={handleStartPress}
              size="small"
              style={styles.startButton}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
      
      {/* 🆕 決策框 */}
      {showDecisionBox && isOverdue && (
        <View style={styles.decisionBox}>
          <View style={styles.decisionHeader}>
            <AlertCircle size={20} color={Colors.light.warning} />
            <Text style={styles.decisionTitle}>
              {language === 'zh' ? "此子任務已逾期" : "This subtask is overdue"}
            </Text>
          </View>
          
          <Text style={styles.decisionDescription}>
            {language === 'zh' 
              ? "請選擇如何處理此逾期的子任務："
              : "Please choose how to handle this overdue subtask:"
            }
          </Text>
          
          <View style={styles.decisionOptions}>
            <TouchableOpacity style={styles.decisionButton} onPress={handleExtendDeadline}>
              <Calendar size={18} color={Colors.light.primary} />
              <Text style={styles.decisionButtonText}>
                {language === 'zh' ? "延長任務截止日期" : "Extend Task Deadline"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.decisionButton} onPress={handleReassignSubtask}>
              <Shuffle size={18} color={Colors.light.warning} />
              <Text style={styles.decisionButtonText}>
                {language === 'zh' ? "AI 重新排程" : "AI Reschedule"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.decisionButton, styles.removeButton]} onPress={handleRemoveSubtask}>
              <Trash2 size={18} color={Colors.light.error} />
              <Text style={[styles.decisionButtonText, styles.removeButtonText]}>
                {language === 'zh' ? "移除此子任務" : "Remove Subtask"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  content: {
    padding: Theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  timeRange: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: Colors.light.text,
  },
  overdueIcon: {
    marginLeft: 4,
  },
  overdueText: {
    color: Colors.light.error,
  },
  typeBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginRight: Theme.spacing.sm,
  },
  typeText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  subtaskBadge: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
    marginRight: Theme.spacing.sm,
  },
  subtaskBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  moreButton: {
    padding: 4,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  description: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginRight: Theme.spacing.sm,
  },
  startButton: {
    paddingHorizontal: Theme.spacing.lg,
  },
  overdueContainer: {
    borderWidth: 1,
    borderColor: Colors.light.error + "30",
    backgroundColor: Colors.light.error + "05",
  },
  decisionBox: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginTop: -Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.warning + "30",
  },
  decisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  decisionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
  },
  decisionDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.md,
    lineHeight: 20,
  },
  decisionOptions: {
    gap: Theme.spacing.sm,
  },
  decisionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  decisionButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  removeButton: {
    borderColor: Colors.light.error + "30",
    backgroundColor: Colors.light.error + "10",
  },
  removeButtonText: {
    color: Colors.light.error,
  },
});