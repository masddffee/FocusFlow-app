import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Modal
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Play, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  GraduationCap,
  Target,
  BookOpen,
  ExternalLink,
  X
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import DatePicker from "@/components/DatePicker";
import { useTaskStore } from "@/store/taskStore";
import { useTimerStore } from "@/store/timerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatDuration } from "@/utils/timeUtils";
import { log } from "@/lib/logger";

export default function TaskDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; action?: string }>();
  const taskId = params.id;
  const action = params.action;
  
  const { tasks, toggleTaskCompletion, deleteTask, toggleSubtaskCompletion, updateTask } = useTaskStore();
  const { startSession, getSessionsByTaskId } = useTimerStore();
  const { language } = useSettingsStore();
  
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [showExtendDeadlineModal, setShowExtendDeadlineModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState<string>("");
  
  const task = tasks.find(t => t.id === taskId);
  const sessions = getSessionsByTaskId(taskId);
  
  const totalTimeSpent = sessions.reduce((total, session) => total + session.duration, 0);

  // 檢查是否需要打開延長截止日期對話框
  useEffect(() => {
    if (action === "extendDeadline") {
      log.info(`自動打開延長截止日期對話框: ${taskId}`);
      setShowExtendDeadlineModal(true);
    }
  }, [action, taskId]);
  
  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t('errors.taskNotFound')}</Text>
      </View>
    );
  }
  
  const handleStartFocus = () => {
    startSession(taskId);
    router.push({
      pathname: "/focus",
      params: { taskId },
    });
  };
  
  const handleToggleComplete = () => {
    toggleTaskCompletion(taskId);
  };
  
  const handleEdit = () => {
    router.push({
      pathname: "/add-task",
      params: { id: taskId },
    });
  };
  
  const handleDelete = () => {
    Alert.alert(
      t('alerts.deleteTaskTitle'),
      t('alerts.deleteTaskMessage'),
      [
        {
          text: t('alerts.cancel'),
          style: "cancel",
        },
        {
          text: t('alerts.delete'),
          onPress: () => {
            deleteTask(taskId);
            router.back();
          },
          style: "destructive",
        },
      ]
    );
  };
  
  const handleToggleSubtask = (subtaskId: string) => {
    toggleSubtaskCompletion(taskId, subtaskId);
  };

  // 處理延長截止日期
  const handleExtendDeadline = () => {
    if (!newDeadline) {
      Alert.alert(
        language === 'zh' ? "請選擇日期" : "Please Select Date",
        language === 'zh' ? "請選擇新的截止日期" : "Please select a new deadline"
      );
      return;
    }

    try {
      // 驗證新日期必須大於當前日期
      const selectedDate = new Date(newDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        Alert.alert(
          language === 'zh' ? "無效日期" : "Invalid Date",
          language === 'zh' ? "新截止日期必須大於今天" : "New deadline must be later than today"
        );
        return;
      }

      // 更新任務截止日期
      updateTask(taskId, {
        ...task,
        dueDate: newDeadline
      });

      log.info(`任務截止日期已延長: ${taskId} -> ${newDeadline}`);

      Alert.alert(
        language === 'zh' ? "延長成功" : "Extension Successful",
        language === 'zh' 
          ? `任務截止日期已延長至 ${selectedDate.toLocaleDateString('zh-CN')}` 
          : `Task deadline extended to ${selectedDate.toLocaleDateString('en-US')}`,
        [{ text: language === 'zh' ? "確定" : "OK" }]
      );

      setShowExtendDeadlineModal(false);
      setNewDeadline("");

    } catch (error) {
      log.error("延長截止日期失敗:", error);
      Alert.alert(
        language === 'zh' ? "延長失敗" : "Extension Failed",
        language === 'zh' ? "無法延長截止日期，請稍後再試" : "Unable to extend deadline, please try again later"
      );
    }
  };

  const toggleSubtaskExpansion = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId);
      } else {
        newSet.add(subtaskId);
      }
      return newSet;
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return Colors.light.success;
      case "medium":
        return Colors.light.warning;
      case "hard":
        return Colors.light.error;
      default:
        return Colors.light.subtext;
    }
  };

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
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
      default:
        return Colors.light.subtext;
    }
  };

  const getPhaseLabel = (phase?: string) => {
    switch (phase) {
      case "knowledge":
        return t('phases.knowledge');
      case "practice":
        return t('phases.practice');
      case "application":
        return t('phases.application');
      case "reflection":
        return t('phases.reflection');
      case "output":
        return t('phases.output');
      case "review":
        return t('phases.review');
      default:
        return "";
    }
  };

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case "knowledge":
        return "📚";
      case "practice":
        return "🛠️";
      case "application":
        return "🎯";
      case "reflection":
        return "🤔";
      case "output":
        return "📝";
      default:
        return "📋";
    }
  };

  const getPhaseStats = (): Record<string, number> => {
    if (!task.subtasks) return {};
    
    const phaseCount: Record<string, number> = {
      knowledge: 0,
      practice: 0,
      application: 0,
      reflection: 0,
      output: 0,
    };

    task.subtasks.forEach(subtask => {
      if (subtask.phase && phaseCount.hasOwnProperty(subtask.phase)) {
        phaseCount[subtask.phase]++;
      }
    });

    return phaseCount;
  };

  const getTaskTypeIcon = (taskType?: string) => {
    switch (taskType) {
      case "exam_preparation":
        return "🎓";
      case "skill_learning":
        return "🎯";
      case "project_completion":
        return "🚀";
      case "habit_building":
        return "🔄";
      case "challenge":
        return "⚡";
      default:
        return "📋";
    }
  };

  const getTaskTypeLabel = (taskType?: string) => {
    switch (taskType) {
      case "exam_preparation":
        return "Exam Prep";
      case "skill_learning":
        return "Skill Learning";
      case "project_completion":
        return "Project";
      case "habit_building":
        return "Habit";
      case "challenge":
        return "Challenge";
      default:
        return "General";
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Task Details",
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Edit size={20} color={Colors.light.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Trash2 size={20} color={Colors.light.error} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{task.title}</Text>
              {task.taskType && (
                <View style={styles.taskTypeBadge}>
                  <Text style={styles.taskTypeIcon}>{getTaskTypeIcon(task.taskType)}</Text>
                  <Text style={styles.taskTypeBadgeText}>{getTaskTypeLabel(task.taskType)}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                task.completed && styles.completedButton,
              ]}
              onPress={handleToggleComplete}
            >
              <CheckCircle
                size={24}
                color={task.completed ? "#FFFFFF" : Colors.light.primary}
              />
              <Text
                style={[
                  styles.completeButtonText,
                  task.completed && styles.completedButtonText,
                ]}
              >
                {task.completed ? "Completed" : "Mark Complete"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.metaContainer}>
            {task.dueDate && (
              <View style={styles.metaItem}>
                <Calendar size={16} color={Colors.light.subtext} />
                <Text style={styles.metaText}>{task.dueDate}</Text>
              </View>
            )}
            
            {task.duration && (
              <View style={styles.metaItem}>
                <Clock size={16} color={Colors.light.subtext} />
                <Text style={styles.metaText}>{task.duration} min</Text>
              </View>
            )}
            
            {task.difficulty && (
              <View style={[
                styles.difficultyBadge,
                task.difficulty === "easy" && styles.easyBadge,
                task.difficulty === "medium" && styles.mediumBadge,
                task.difficulty === "hard" && styles.hardBadge,
              ]}>
                <Text style={styles.difficultyText}>
                  {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                </Text>
              </View>
            )}

            {task.priority && (
              <View style={[
                styles.priorityBadge,
                task.priority === "low" && styles.lowPriorityBadge,
                task.priority === "medium" && styles.mediumPriorityBadge,
                task.priority === "high" && styles.highPriorityBadge,
              ]}>
                <Text style={styles.priorityText}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        {/* Learning Plan Information */}
        {task.learningPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {task.taskType === "exam_preparation" ? "Exam Preparation Plan" : 
               task.taskType === "skill_learning" ? "Learning Plan" :
               task.taskType === "project_completion" ? "Project Plan" :
               task.taskType === "habit_building" ? "Habit Building Plan" :
               task.taskType === "challenge" ? "Challenge Plan" : "Action Plan"}
            </Text>
            <View style={styles.learningPlanContainer}>
              <View style={styles.learningPlanItem}>
                <Text style={styles.learningPlanLabel}>Goal:</Text>
                <Text style={styles.learningPlanValue}>{task.learningPlan.achievableGoal}</Text>
              </View>
              
              {task.learningPlan.estimatedTimeToCompletion && (
                <View style={styles.learningPlanItem}>
                  <Text style={styles.learningPlanLabel}>Estimated Time:</Text>
                  <Text style={styles.learningPlanValue}>{task.learningPlan.estimatedTimeToCompletion} hours</Text>
                </View>
              )}

              {task.learningPlan.recommendedTools && task.learningPlan.recommendedTools.length > 0 && (
                <View style={styles.learningPlanItem}>
                  <Text style={styles.learningPlanLabel}>Tools:</Text>
                  <Text style={styles.learningPlanValue}>
                    {task.learningPlan.recommendedTools.slice(0, 3).join(", ")}
                    {task.learningPlan.recommendedTools.length > 3 && ` +${task.learningPlan.recommendedTools.length - 3} more`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {task.subtasks && task.subtasks.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowSubtasks(!showSubtasks)}
            >
              <Text style={styles.sectionTitle}>
                Subtasks ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
              </Text>
              {showSubtasks ? (
                <ChevronUp size={20} color={Colors.light.text} />
              ) : (
                <ChevronDown size={20} color={Colors.light.text} />
              )}
            </TouchableOpacity>

            {/* Phase Distribution */}
            {showSubtasks && task.subtasks.some(s => s.phase) && (
              <View style={styles.phaseDistributionContainer}>
                <Text style={styles.phaseDistributionTitle}>Learning Phase Distribution</Text>
                <View style={styles.phaseDistribution}>
                  {Object.entries(getPhaseStats()).map(([phase, count]) => (
                    count > 0 && (
                      <View key={phase} style={styles.phaseDistributionItem}>
                        <View style={[
                          styles.phaseDistributionDot,
                          { backgroundColor: getPhaseColor(phase) }
                        ]} />
                        <Text style={styles.phaseDistributionText}>
                          {getPhaseLabel(phase)}: {count}
                        </Text>
                      </View>
                    )
                  ))}
                </View>
              </View>
            )}
            
            {showSubtasks && (
              <View style={styles.subtasksContainer}>
                {/* 🔧 修復：按 order 欄位排序後再顯示 */}
                {task.subtasks
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((subtask, index) => (
                  <View key={subtask.id || index} style={styles.subtaskItem}>
                    <TouchableOpacity
                      style={[
                        styles.subtaskCheckbox,
                        subtask.completed && styles.subtaskCheckboxChecked,
                      ]}
                      onPress={() => handleToggleSubtask(subtask.id)}
                    >
                      {subtask.completed && (
                        <CheckCircle size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.subtaskContent}>
                      <View style={styles.subtaskHeader}>
                        <Text
                          style={[
                            styles.subtaskTitle,
                            subtask.completed && styles.subtaskTextCompleted,
                          ]}
                        >
                          {getPhaseIcon(subtask.phase)} {subtask.title || subtask.text}
                        </Text>
                        {subtask.taskType === "exam_preparation" && (
                          <View style={styles.examSubtaskBadge}>
                            <GraduationCap size={10} color="#FFFFFF" />
                          </View>
                        )}
                        {(subtask.recommendedResources && subtask.recommendedResources.length > 0) && (
                          <TouchableOpacity
                            onPress={() => toggleSubtaskExpansion(subtask.id)}
                            style={styles.expandButton}
                          >
                            {expandedSubtasks.has(subtask.id) ? (
                              <ChevronUp size={16} color={Colors.light.subtext} />
                            ) : (
                              <ChevronDown size={16} color={Colors.light.subtext} />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {subtask.title && subtask.text !== subtask.title && (
                        <Text
                          style={[
                            styles.subtaskText,
                            subtask.completed && styles.subtaskTextCompleted,
                          ]}
                        >
                          {subtask.text}
                        </Text>
                      )}

                      {/* Expanded Resources */}
                      {expandedSubtasks.has(subtask.id) && subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
                        <View style={styles.resourcesContainer}>
                          <View style={styles.resourcesHeader}>
                            <BookOpen size={12} color={Colors.light.primary} />
                            <Text style={styles.resourcesTitle}>Recommended Resources:</Text>
                          </View>
                          {subtask.recommendedResources.map((resource, resourceIndex) => (
                            <View key={resourceIndex} style={styles.resourceItem}>
                              <ExternalLink size={10} color={Colors.light.subtext} />
                              <Text style={styles.resourceText}>{resource}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.subtaskMeta}>
                        {(subtask.aiEstimatedDuration || subtask.userEstimatedDuration) && (
                          <View style={styles.subtaskDuration}>
                            <Clock size={12} color={Colors.light.subtext} />
                            <Text style={styles.subtaskDurationText}>
                              {t('timeUnits.minutes', { count: subtask.userEstimatedDuration || subtask.aiEstimatedDuration })}
                            </Text>
                          </View>
                        )}
                        {subtask.difficulty && (
                          <View style={[
                            styles.difficultyBadge,
                            subtask.difficulty === "easy" && styles.easyBadge,
                            subtask.difficulty === "medium" && styles.mediumBadge,
                            subtask.difficulty === "hard" && styles.hardBadge,
                          ]}>
                            <Text style={styles.difficultyText}>
                              {subtask.difficulty}
                            </Text>
                          </View>
                        )}
                        {subtask.phase && (
                          <View style={[
                            styles.phaseBadge,
                            { backgroundColor: getPhaseColor(subtask.phase) }
                          ]}>
                            <Text style={styles.phaseBadgeText}>
                              {getPhaseLabel(subtask.phase)}
                            </Text>
                          </View>
                        )}
                        {subtask.skills && subtask.skills.length > 0 && (
                          <View style={styles.skillsBadge}>
                            <Text style={styles.skillsBadgeText}>
                              {subtask.skills[0]}
                              {subtask.skills.length > 1 && ` +${subtask.skills.length - 1}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('taskDetail.progress')}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>
                {formatDuration(totalTimeSpent)}
              </Text>
              <Text style={styles.progressLabel}>{t('taskDetail.timeSpent')}</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{sessions.length}</Text>
              <Text style={styles.progressLabel}>{t('stats.sessions')}</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>
                {task.subtasks
                  ? Math.round(
                      (task.subtasks.filter(st => st.completed).length /
                        task.subtasks.length) *
                        100
                    )
                  : 0}
                %
              </Text>
              <Text style={styles.progressLabel}>{t('taskDetail.subtasks')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button
          title={t('taskDetail.startFocus')}
          onPress={handleStartFocus}
          variant="primary"
          size="large"
          icon={<Play size={20} color="#FFFFFF" />}
          style={styles.button}
          disabled={task.completed}
        />
      </View>

      {/* 延長截止日期模態框 */}
      <Modal
        visible={showExtendDeadlineModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExtendDeadlineModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {language === 'zh' ? "延長任務截止日期" : "Extend Task Deadline"}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowExtendDeadlineModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              {language === 'zh' 
                ? "由於無法重新排程所有子任務，請選擇新的截止日期以獲得更多時間安排。"
                : "Unable to reschedule all subtasks. Please select a new deadline to allow more time for scheduling."
              }
            </Text>

            <View style={styles.currentDeadlineInfo}>
              <Text style={styles.currentDeadlineLabel}>
                {language === 'zh' ? "當前截止日期" : "Current Deadline"}:
              </Text>
              <Text style={styles.currentDeadlineValue}>
                {task.dueDate 
                  ? new Date(task.dueDate).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')
                  : language === 'zh' ? "未設定" : "Not set"
                }
              </Text>
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerLabel}>
                {language === 'zh' ? "新截止日期" : "New Deadline"}:
              </Text>
              <DatePicker
                selectedDate={newDeadline}
                onDateSelect={setNewDeadline}
                placeholder={language === 'zh' ? "請選擇新的截止日期" : "Select new deadline"}
                minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // 至少明天
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowExtendDeadlineModal(false)}
            >
              <Text style={styles.cancelButtonText}>
                {language === 'zh' ? "取消" : "Cancel"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                !newDeadline && styles.disabledButton
              ]} 
              onPress={handleExtendDeadline}
              disabled={!newDeadline}
            >
              <Text style={[
                styles.confirmButtonText,
                !newDeadline && styles.disabledButtonText
              ]}>
                {language === 'zh' ? "確認延長" : "Confirm Extension"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  titleContainer: {
    marginBottom: Theme.spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  taskTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  taskTypeIcon: {
    fontSize: 12,
  },
  taskTypeBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    alignSelf: "flex-start",
  },
  completedButton: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  completeButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.primary,
    fontWeight: "500",
    marginLeft: Theme.spacing.sm,
  },
  completedButtonText: {
    color: "#FFFFFF",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  metaText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginLeft: Theme.spacing.xs,
  },
  difficultyBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.light.secondary,
    marginBottom: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  easyBadge: {
    backgroundColor: Colors.light.success,
  },
  mediumBadge: {
    backgroundColor: Colors.light.warning,
  },
  hardBadge: {
    backgroundColor: Colors.light.error,
  },
  difficultyText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  priorityBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginBottom: Theme.spacing.sm,
  },
  lowPriorityBadge: {
    backgroundColor: Colors.light.success,
  },
  mediumPriorityBadge: {
    backgroundColor: Colors.light.warning,
  },
  highPriorityBadge: {
    backgroundColor: Colors.light.error,
  },
  priorityText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  section: {
    marginBottom: Theme.spacing.xl,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 24,
  },
  learningPlanContainer: {
    gap: Theme.spacing.md,
  },
  learningPlanItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  learningPlanLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    minWidth: 80,
    marginRight: Theme.spacing.sm,
  },
  learningPlanValue: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    flex: 1,
    lineHeight: 22,
  },
  phaseDistributionContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  phaseDistributionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  phaseDistribution: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.sm,
  },
  phaseDistributionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phaseDistributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseDistributionText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
  },
  subtasksContainer: {
    marginTop: Theme.spacing.sm,
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Theme.spacing.md,
  },
  subtaskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Theme.spacing.md,
    marginTop: 2,
  },
  subtaskCheckboxChecked: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.xs,
  },
  subtaskTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    lineHeight: 22,
    flex: 1,
  },
  examSubtaskBadge: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 4,
    padding: 2,
    marginLeft: Theme.spacing.xs,
  },
  expandButton: {
    padding: 4,
    marginLeft: Theme.spacing.xs,
  },
  subtaskText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.xs,
  },
  subtaskTextCompleted: {
    textDecorationLine: "line-through",
    color: Colors.light.subtext,
  },
  resourcesContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  resourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.xs,
  },
  resourcesTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
    marginLeft: 4,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  resourceText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginLeft: 4,
    flex: 1,
    lineHeight: 16,
  },
  subtaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    flexWrap: "wrap",
  },
  subtaskDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtaskDurationText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  phaseBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  phaseBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  skillsBadge: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillsBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressItem: {
    alignItems: "center",
    flex: 1,
  },
  progressValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  buttonContainer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: "#FFFFFF",
  },
  button: {
    width: "100%",
  },
  headerButtons: {
    flexDirection: "row",
  },
  headerButton: {
    padding: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
  errorText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.error,
    textAlign: "center",
    marginTop: Theme.spacing.xl,
  },
  // 模態框樣式
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalCloseButton: {
    padding: Theme.spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  modalDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.xl,
  },
  currentDeadlineInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  currentDeadlineLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.xs,
  },
  currentDeadlineValue: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  datePickerContainer: {
    marginBottom: Theme.spacing.xl,
  },
  datePickerLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  modalFooter: {
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