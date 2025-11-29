import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Plus, Trash2, Save, Zap, Brain, HelpCircle, ArrowRight, Clock, Edit3, Lightbulb, AlertCircle, BookOpen, ExternalLink, Calendar } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import DatePicker from "@/components/DatePicker";
import PersonalizationModal from "@/components/task-creation/PersonalizationModal";
import LearningPlanModal from "@/components/task-creation/LearningPlanModal";
import QualityAlert from "@/components/task-creation/QualityAlert";
import TaskBasicForm from "@/components/task-creation/TaskBasicForm";
import TaskSettings from "@/components/task-creation/TaskSettings";
import SubtaskDisplay from "@/components/task-creation/SubtaskDisplay";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TaskDifficulty, ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel } from "@/types/task";
import { 
  generateEnhancedSubtasks as backendGenerateSubtasks,
  generateUnifiedLearningPlan,
  estimateTaskDuration,
  estimateSubtaskDuration
} from "@/utils/api";
import { findAvailableTimeSlot, scheduleSubtasks, convertSubtaskSchedulesToTasks, analyzeSchedulingFeasibility, generateSchedulingSuggestions } from "@/utils/scheduling";
import { calculateDaysUntil, getTimeConstraintLevel, getTimeConstraintMessage } from "@/utils/timeUtils";
import { log } from "@/lib/logger";
// Remove redundant import - now using getDynamicQuestions from API

export default function AddTaskScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const taskId = params.id;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [difficulty, setDifficulty] = useState<TaskDifficulty | "">("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "">("");
  const [subtasks, setSubtasks] = useState<EnhancedSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [schedulingMode, setSchedulingMode] = useState<"balanced" | "focused" | "flexible">("balanced");
  const [startNextDay, setStartNextDay] = useState(false);
  const [showSchedulingOptions, setShowSchedulingOptions] = useState(false);
  
  // Enhanced clarification workflow states
  const [showQualityAlert, setShowQualityAlert] = useState(false);
  const [qualityIssues] = useState<string[]>([]);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarificationResponses, setClarificationResponses] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isEstimatingDuration, setIsEstimatingDuration] = useState(false);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [showLearningPlan, setShowLearningPlan] = useState(false);
  const [detectedTaskType, setDetectedTaskType] = useState<"exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" | undefined>(undefined);
  
  // Proficiency tracking states (internal only, not displayed)
  const [currentProficiency, setCurrentProficiency] = useState<ProficiencyLevel>("beginner");
  const [targetProficiency, setTargetProficiency] = useState<ProficiencyLevel>("intermediate");
  
  // Time estimation states
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [tempDuration, setTempDuration] = useState("");
  
  const { tasks, addTask, updateTask, scheduledTasks, addScheduledTask } = useTaskStore();
  const { availableTimeSlots, autoSchedulingEnabled } = useSettingsStore();
  
  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");
        setDueDate(task.dueDate || "");
        setDifficulty(task.difficulty || "");
        setPriority(task.priority || "");
        setSubtasks(task.subtasks || []);
        setDetectedTaskType(task.taskType || undefined);
        setCurrentProficiency(task.currentProficiency || "beginner");
        setTargetProficiency(task.targetProficiency || "intermediate");
      }
    }
  }, [taskId, tasks]);

  const handlePersonalizationResponse = (questionId: string, response: string) => {
    setClarificationResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const calculateTimeConstraint = (selectedDate: string): { availableDays: number; timeContext: string; constraintLevel: string } => {
    if (!selectedDate) {
      return { availableDays: 0, timeContext: "", constraintLevel: "none" };
    }

    const availableDays = calculateDaysUntil(selectedDate);
    const constraintLevel = getTimeConstraintLevel(availableDays);
    const timeContext = getTimeConstraintMessage(availableDays);

    return { availableDays, timeContext, constraintLevel };
  };

  const handleSmartGenerate = async () => {
    if (!title.trim()) {
      Alert.alert(t('errors.required'), t('addTask.taskTitlePlaceholder'));
      return;
    }

    setIsAnalyzing(true);
    setIsGeneratingSubtasks(true);
    setShowQualityAlert(false);
    setShowPersonalizationModal(false);
    setLearningPlan(null);
    setSubtasks([]);
    setClarifyingQuestions([]);
    setClarificationResponses({});
    try {
      log.info("🚀 Using unified learning plan generation...");
      const currentLanguage = useSettingsStore.getState().language;
      // 第一次只請求個人化問題
      const unifiedResponse = await generateUnifiedLearningPlan({
        title: title.trim(),
        description: description.trim(),
        language: currentLanguage,
        taskType: detectedTaskType || 'skill_learning',
        currentProficiency: currentProficiency,
        targetProficiency: targetProficiency
      });
      const { personalizationQuestions } = unifiedResponse;
      if (personalizationQuestions && personalizationQuestions.length > 0) {
        setClarifyingQuestions(personalizationQuestions);
        setShowPersonalizationModal(true);
      } else {
        // 沒有個人化問題，直接生成
        const result = await generateUnifiedLearningPlan({
          title: title.trim(),
          description: description.trim(),
          language: currentLanguage,
          taskType: detectedTaskType || 'skill_learning',
          currentProficiency: currentProficiency,
          targetProficiency: targetProficiency,
          clarificationResponses: {} // 空
        });
        if (result.learningPlan) {
          setLearningPlan(result.learningPlan);
          setShowLearningPlan(true);
        }
        if (result.subtasks && result.subtasks.length > 0) {
          setSubtasks(result.subtasks);
          const { availableDays } = calculateTimeConstraint(dueDate);
          const contextMessage = getTaskTypeMessage(
            'skill_learning',
            result.subtasks.length,
            availableDays,
            currentProficiency,
            targetProficiency
          );
          Alert.alert("🤖 AI 學習計劃已生成", `✅ 已生成 ${result.subtasks.length} 個個人化子任務\n\n${contextMessage}`);
        } else {
          Alert.alert("⚠️ 警告", "未能生成子任務，請稍後再試。");
        }
      }
    } catch (error) {
      log.error("❌ Unified learning plan generation failed:", error);
      Alert.alert("❌ 錯誤", "無法生成學習計劃。請檢查網路連接或稍後再試。");
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingSubtasks(false);
    }
  };

  const handleQualityAlertContinue = () => {
    setShowQualityAlert(false);
    if (clarifyingQuestions.length > 0) {
      setShowPersonalizationModal(true);
    } else {
      generateSubtasksDirectly(detectedTaskType, currentProficiency, targetProficiency);
    }
  };

  const handleQualityAlertSkip = () => {
    setShowQualityAlert(false);
    generateSubtasksDirectly(detectedTaskType, currentProficiency, targetProficiency);
  };

  const generateSubtasksDirectly = async (
    taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general",
    currentProf?: ProficiencyLevel,
    targetProf?: ProficiencyLevel
  ) => {
    setIsGeneratingSubtasks(true);
    
    try {
      // Use detected task type if not explicitly provided
      const finalTaskType = taskType ?? detectedTaskType ?? "general";
      const finalCurrentProficiency = currentProf ?? currentProficiency;
      const finalTargetProficiency = targetProf ?? targetProficiency;
      
      // Calculate time constraint based on due date
      const { availableDays } = calculateTimeConstraint(dueDate);
      
      // Generate enhanced subtasks with comprehensive context
      const currentLanguage = useSettingsStore.getState().language;
      const subtasksResponse = await backendGenerateSubtasks({
        title, 
        description, 
        clarificationResponses, // Include personalization responses
        dueDate, // Include deadline context
        taskType: finalTaskType,
        currentProficiency: finalCurrentProficiency,
        targetProficiency: finalTargetProficiency,
        language: currentLanguage
      });
      const enhancedSubtasks = subtasksResponse.subtasks || [];
      
      if (enhancedSubtasks.length > 0) {
        setSubtasks(enhancedSubtasks);
        const contextMessage = getTaskTypeMessage(finalTaskType, enhancedSubtasks.length, availableDays, finalCurrentProficiency, finalTargetProficiency);
        Alert.alert("AI-Generated Learning Plan", contextMessage);
      } else {
        Alert.alert("Error", "Could not generate subtasks. Please try again or add them manually.");
      }
    } catch (error) {
      log.error("Generate subtasks error:", error);
      Alert.alert("Error", "Failed to generate subtasks. Please try again later.");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const getTaskTypeMessage = (
    taskType: string, 
    count: number, 
    availableDays: number, 
    currentProf: ProficiencyLevel, 
    targetProf: ProficiencyLevel
  ): string => {
    const urgencyNote = availableDays > 0 && availableDays <= 7 
      ? ` Tasks are optimized for your ${availableDays}-day timeline.`
      : availableDays > 7 && availableDays <= 30
      ? ` Tasks are balanced for your ${availableDays}-day timeline.`
      : availableDays > 30
      ? ` Tasks include comprehensive depth for your ${availableDays}-day timeline.`
      : "";

    const proficiencyNote = ` Designed to progress from ${currentProf} to ${targetProf} level.`;
    const spacedRepetitionNote = (taskType === "skill_learning" || taskType === "exam_preparation") 
      ? " Includes spaced repetition for long-term retention."
      : "";

    switch (taskType) {
      case "exam_preparation":
        return `Generated ${count} exam-focused subtasks with diagnostic assessment, practice problems, and test simulation.${urgencyNote}${proficiencyNote}${spacedRepetitionNote}`;
      case "skill_learning":
        return `Generated ${count} comprehensive subtasks following the enhanced 6-phase learning methodology.${urgencyNote}${proficiencyNote}${spacedRepetitionNote} You can edit durations by tapping the clock icon.`;
      case "project_completion":
        return `Generated ${count} project-focused subtasks covering planning, implementation, testing, and delivery phases.${urgencyNote}${proficiencyNote}`;
      case "habit_building":
        return `Generated ${count} habit-building subtasks focusing on consistency, tracking, and long-term sustainability.${urgencyNote}${proficiencyNote}`;
      case "challenge":
        return `Generated ${count} challenge-oriented subtasks with training, performance optimization, and achievement tracking.${urgencyNote}${proficiencyNote}`;
      default:
        return `Generated ${count} structured subtasks to help you complete this task efficiently.${urgencyNote}${proficiencyNote}`;
    }
  };

  const handlePersonalizationComplete = async () => {
    // 檢查所有必填問題
    const unansweredRequired = clarifyingQuestions.filter(
      q => q.required && !clarificationResponses[q.id]?.trim()
    );
    if (unansweredRequired.length > 0) {
      Alert.alert("Missing Information", "Please answer all required questions before proceeding.");
      return;
    }
    setShowPersonalizationModal(false);
    setIsGeneratingSubtasks(true);
    try {
      // 生成個人化子任務與學習計劃
      const currentLanguage = useSettingsStore.getState().language;
      const result = await generateUnifiedLearningPlan({
        title: title.trim(),
        description: description.trim(),
        language: currentLanguage,
        taskType: detectedTaskType || 'skill_learning',
        currentProficiency: currentProficiency,
        targetProficiency: targetProficiency,
        clarificationResponses
      });
      if (result.learningPlan) {
        setLearningPlan(result.learningPlan);
        setShowLearningPlan(true);
      }
      if (result.subtasks && result.subtasks.length > 0) {
        setSubtasks(result.subtasks);
        const { availableDays } = calculateTimeConstraint(dueDate);
        const contextMessage = getTaskTypeMessage(
          detectedTaskType || 'skill_learning',
          result.subtasks.length,
          availableDays,
          currentProficiency,
          targetProficiency
        );
        Alert.alert("Personalized Learning Plan Created", contextMessage);
      } else {
        Alert.alert("Error", "Could not generate personalized subtasks. Please try again or add them manually.");
      }
    } catch (error) {
      log.error("Personalization complete error:", error);
      Alert.alert("Error", "Failed to create personalized plan. Please try again later.");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleLearningPlanComplete = () => {
    setShowLearningPlan(false);
    const planType = getTaskTypeLabel(learningPlan?.taskType);
    const { availableDays } = calculateTimeConstraint(dueDate);
    Alert.alert(
      `${planType} Plan Applied`,
      `Generated ${subtasks.length} specific subtasks based on your personalized ${planType.toLowerCase()} plan.${availableDays > 0 ? ` Optimized for your ${availableDays}-day timeline.` : ""} You can edit durations and add more subtasks as needed.`
    );
  };

  const getTaskTypeLabel = (taskType?: string): string => {
    switch (taskType) {
      case "exam_preparation":
        return "Exam Preparation";
      case "skill_learning":
        return "Learning";
      case "project_completion":
        return "Project";
      case "habit_building":
        return "Habit Building";
      case "challenge":
        return "Challenge";
      default:
        return "Action";
    }
  };

  const getTaskTypeIcon = (taskType?: string): string => {
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

  const getProficiencyLabel = (proficiency: ProficiencyLevel): string => {
    switch (proficiency) {
      case "complete_beginner":
        return "Complete Beginner";
      case "beginner":
        return "Beginner";
      case "intermediate":
        return "Intermediate";
      case "advanced":
        return "Advanced";
      case "expert":
        return "Expert";
      default:
        return "Beginner";
    }
  };
  
  const handleAddSubtask = async () => {
    if (newSubtask.trim()) {
      // Estimate duration for the new subtask
      let estimatedDuration = 60;
      try {
        estimatedDuration = await estimateSubtaskDuration(newSubtask.trim(), difficulty as string);
      } catch (error) {
        log.error("Failed to estimate subtask duration:", error);
      }

      // 🔧 修復：計算安全的順序值，確保不會與現有子任務衝突
      const getNextSafeOrder = (existingSubtasks: EnhancedSubtask[]): number => {
        if (existingSubtasks.length === 0) return 1;
        
        // 找到當前最大的 order 值
        const maxOrder = Math.max(...existingSubtasks.map(s => s.order || 0));
        return maxOrder + 1;
      };

      const newSubtaskObj: EnhancedSubtask = {
        id: `subtask_${Date.now()}`,
        title: `Manual Task ${getNextSafeOrder(subtasks)}`,
        text: newSubtask.trim(),
        aiEstimatedDuration: estimatedDuration,
        difficulty: difficulty as TaskDifficulty || "medium",
        order: getNextSafeOrder(subtasks), // 🔧 使用安全的順序計算
        completed: false,
        skills: [],
        recommendedResources: [],
        prerequisites: [],
        phase: "practice",
        taskType: detectedTaskType || "general",
        proficiencyLevel: currentProficiency,
        targetProficiency: targetProficiency,
        learningPace: "moderate",
        reviewStatus: "not_started",
      };
      setSubtasks([...subtasks, newSubtaskObj]);
      setNewSubtask("");
    }
  };
  
  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(subtask => subtask.id !== id));
  };

  const handleSubtaskDurationEdit = (subtask: EnhancedSubtask) => {
    setEditingSubtaskId(subtask.id);
    const duration = subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60;
    setTempDuration(duration.toString());
  };

  const handleSubtaskDurationSave = (subtaskId: string) => {
    const duration = parseInt(tempDuration);
    if (!isNaN(duration) && duration > 0) {
      setSubtasks(subtasks.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, userEstimatedDuration: duration }
          : subtask
      ));
    }
    setEditingSubtaskId(null);
    setTempDuration("");
  };

  const handleSubtaskDurationCancel = () => {
    setEditingSubtaskId(null);
    setTempDuration("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }
    
    // Prevent multiple saves
    if (isEstimatingDuration) {
      return;
    }
    
    setIsEstimatingDuration(true);
    
    try {
      // Calculate total duration from subtasks or estimate
      let totalDuration = 0;
      if (subtasks.length > 0) {
        totalDuration = subtasks.reduce((total, subtask) => {
          return total + (subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60);
        }, 0);
        // Add 10% buffer for transitions
        totalDuration = Math.round(totalDuration * 1.1);
      } else {
        try {
          totalDuration = await estimateTaskDuration(title, description, difficulty as string, subtasks);
        } catch (error) {
          log.error("Duration estimation failed:", error);
          totalDuration = 60; // Default to 1 hour
        }
      }
      
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.trim(),
        difficulty: difficulty as TaskDifficulty | undefined,
        priority: priority as "low" | "medium" | "high" | undefined,
        subtasks: subtasks,
        duration: totalDuration,
        learningPlan: learningPlan || undefined,
        taskType: detectedTaskType || "general",
        currentProficiency: currentProficiency,
        targetProficiency: targetProficiency,
        reviewSchedule: (detectedTaskType === "skill_learning" || detectedTaskType === "exam_preparation") ? {
          enabled: true,
          nextReviewDate: dueDate ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
          reviewInterval: 3,
          reviewCount: 0,
          masteryLevel: 0,
        } : undefined,
      };
      
      if (taskId) {
        updateTask(taskId, taskData);
        Alert.alert("Success", "Task updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        // Create new task
        const newTaskId = Date.now().toString();
        const newTask = {
          id: newTaskId,
          ...taskData,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        addTask(taskData);
        
        // Auto-schedule if enabled
        if (autoSchedule && autoSchedulingEnabled && availableTimeSlots) {
          try {
            // Schedule subtasks instead of the whole task
            if (subtasks.length > 0) {
              // 🆕 排程前可行性分析
              const feasibilityAnalysis = analyzeSchedulingFeasibility(
                { ...newTask, subtasks },
                availableTimeSlots,
                scheduledTasks,
                [], // Calendar events - could be fetched if calendar sync is enabled
                {
                  startDate: new Date(),
                  maxDaysToSearch: dueDate ? Math.max(30, calculateDaysUntil(dueDate)) : 90,
                  bufferBetweenSubtasks: 5,
                  respectPhaseOrder: false,
                  dailyMaxHours: null,
                }
              );

              // 🆕 生成智能建議
              const suggestions = generateSchedulingSuggestions(feasibilityAnalysis, { ...newTask, subtasks });

              if (!suggestions.shouldProceed) {
                // 🆕 無法確保百分百排入，顯示詳細建議
                Alert.alert(
                  "⚠️ 自動排程分析",
                  suggestions.userMessage,
                  [
                    { 
                      text: "手動調整後重試", 
                      style: "cancel" 
                    },
                    {
                      text: "仍要建立任務",
                      onPress: () => {
                        Alert.alert(
                          "任務已建立",
                          "任務已成功建立，但未啟用自動排程。您可以稍後手動安排時間或調整設置後重新排程。",
                          [{ text: "了解", onPress: () => router.back() }]
                        );
                      }
                    }
                  ]
                );
                return; // 不執行自動排程
              }

              // 🔧 修復：使用簡化的排程邏輯
              const schedulingResult = scheduleSubtasks(
                subtasks,
                availableTimeSlots,
                scheduledTasks,
                [], // Calendar events - could be fetched if calendar sync is enabled
                {
                  startDate: new Date(),
                  startNextDay: true, // 🔧 修復：確保從隔天開始排程
                  maxDaysToSearch: dueDate ? Math.max(14, calculateDaysUntil(dueDate)) : 14
                }
              );
              
              if (schedulingResult.success) {
                // Convert subtask schedules to scheduled tasks and save them
                const subtaskScheduledTasks = convertSubtaskSchedulesToTasks(
                  schedulingResult.scheduledSubtasks,
                  newTaskId
                );
                
                // Add all scheduled subtasks
                subtaskScheduledTasks.forEach(scheduledTask => {
                  addScheduledTask(scheduledTask);
                });
                
                const { availableDays } = calculateTimeConstraint(dueDate);
                const timeConstraintNote = availableDays > 0 && availableDays <= 7 
                  ? ` Given your ${availableDays}-day deadline, subtasks have been prioritized for urgent completion.`
                  : "";
                
                let alertMessage = schedulingResult.message + timeConstraintNote;
                
                // Add details about the schedule
                if (schedulingResult.scheduledSubtasks.length > 0) {
                  const firstSubtask = schedulingResult.scheduledSubtasks[0];
                  const totalHours = Math.round(schedulingResult.totalScheduledMinutes / 60 * 10) / 10;
                  alertMessage += `\n\nFirst subtask scheduled for ${firstSubtask.date} at ${firstSubtask.timeSlot.start}.`;
                  alertMessage += `\nTotal study time: ${totalHours} hours.`;
                  
                  if (schedulingResult.completionDate && dueDate) {
                    const completionDate = new Date(schedulingResult.completionDate);
                    const dueDateObj = new Date(dueDate);
                    const daysBeforeDue = Math.ceil((dueDateObj.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysBeforeDue > 0) {
                      alertMessage += `\nAll subtasks will be completed ${daysBeforeDue} days before the due date.`;
                    }
                  }
                }
                
                Alert.alert(
                  "任務已建立並自動排程",
                  `${alertMessage}`,
                  [{ text: "太好了！", onPress: () => router.back() }]
                );
              } else {
                // 🔧 簡化：排程失敗處理
                Alert.alert(
                  "⚠️ 排程遇到問題",
                  schedulingResult.message + "\n\n建議：\n• 延長截止日期\n• 減少子任務數量\n• 增加可用學習時間\n• 縮短子任務時長",
                  [
                    {
                      text: "仍要建立任務",
                      onPress: () => {
                        Alert.alert(
                          "任務已建立",
                          "任務已成功建立，但未完成自動排程。您可以稍後手動安排時間。",
                          [{ text: "了解", onPress: () => router.back() }]
                        );
                      }
                    }
                  ]
                );
              }
            } else {
              // No subtasks, schedule the whole task
            const scheduledTask = findAvailableTimeSlot(
              { ...newTask, duration: totalDuration },
              availableTimeSlots,
              scheduledTasks
            );
            
            if (scheduledTask) {
              addScheduledTask(scheduledTask);
              const { availableDays } = calculateTimeConstraint(dueDate);
              const timeConstraintNote = availableDays > 0 && availableDays <= 7 
                ? ` Given your ${availableDays}-day deadline, this scheduling prioritizes urgent completion.`
                : "";
              Alert.alert(
                "Task Created & Scheduled",
                `Your task has been created and automatically scheduled for ${scheduledTask.date} at ${scheduledTask.timeSlot.start} (${totalDuration} minutes).${timeConstraintNote}`,
                [{ text: "Great!", onPress: () => router.back() }]
              );
            } else {
              Alert.alert(
                "Task Created",
                `Task created successfully with estimated duration of ${totalDuration} minutes. Could not find an available time slot automatically. You can schedule it manually from the tasks screen.`,
                [{ text: "OK", onPress: () => router.back() }]
              );
              }
            }
          } catch (schedulingError) {
            log.error("Auto-scheduling error:", schedulingError);
            Alert.alert(
              "Task Created",
              `Task created successfully with estimated duration of ${totalDuration} minutes. Auto-scheduling failed, but you can schedule it manually from the tasks screen.`,
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        } else {
          Alert.alert(
            "Task Created",
            `Task created successfully with estimated duration of ${totalDuration} minutes.`,
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      }
    } catch (error) {
      log.error("Save task error:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    } finally {
      setIsEstimatingDuration(false);
    }
  };

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
  >
    <Stack.Screen
      options={{
          title: taskId ? "Edit Task" : "Add Task",
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isEstimatingDuration}>
              {isEstimatingDuration ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <Save size={20} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <TaskBasicForm
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          detectedTaskType={detectedTaskType}
        />

        <TaskSettings
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          timeConstraintMessage={dueDate ? calculateTimeConstraint(dueDate).timeContext : undefined}
          priority={priority}
          onPriorityChange={setPriority}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          autoSchedule={autoSchedule}
          schedulingMode={schedulingMode}
          startNextDay={startNextDay}
          showSchedulingOptions={showSchedulingOptions}
          onAutoScheduleChange={setAutoSchedule}
          onSchedulingModeChange={setSchedulingMode}
          onStartNextDayChange={setStartNextDay}
          onToggleSchedulingOptions={() => setShowSchedulingOptions(!showSchedulingOptions)}
        />

        {/* Quality Alert Modal */}
        <QualityAlert
          visible={showQualityAlert}
          issues={qualityIssues}
          onClose={() => setShowQualityAlert(false)}
          onContinue={handleQualityAlertSkip}
          onImprove={handleQualityAlertContinue}
        />
        
        <View style={styles.inputGroup}>
          <View style={styles.subtaskHeader}>
            <Text style={styles.label}>Subtasks</Text>
            <Button
              title="Smart Generate"
              onPress={handleSmartGenerate}
              variant="outline"
              size="small"
              loading={isAnalyzing || isGeneratingSubtasks}
              icon={<Brain size={16} color={Colors.light.primary} />}
            />
          </View>

          <SubtaskDisplay
            subtasks={subtasks}
            newSubtask={newSubtask}
            onNewSubtaskChange={setNewSubtask}
            onAddSubtask={handleAddSubtask}
            onRemoveSubtask={handleRemoveSubtask}
            editingSubtaskId={editingSubtaskId}
            tempDuration={tempDuration}
            onStartEditDuration={handleSubtaskDurationEdit}
            onDurationChange={setTempDuration}
            onSaveDuration={handleSubtaskDurationSave}
            onCancelEditDuration={handleSubtaskDurationCancel}
            showTimeEstimate={true}
            showPhaseDistribution={true}
          />
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button
          title={taskId ? "Update Task" : "Create & Schedule Task"}
          onPress={handleSave}
          variant="primary"
          size="large"
          style={styles.button}
          loading={isEstimatingDuration}
          disabled={isEstimatingDuration}
          icon={autoSchedule && autoSchedulingEnabled && !taskId ? <Zap size={20} color="#FFFFFF" /> : undefined}
        />
      </View>

      {/* Personalization Modal */}
      <PersonalizationModal
        visible={showPersonalizationModal}
        questions={clarifyingQuestions}
        responses={clarificationResponses}
        isAnalyzing={isGeneratingSubtasks}
        onClose={() => setShowPersonalizationModal(false)}
        onResponseChange={handlePersonalizationResponse}
        onComplete={handlePersonalizationComplete}
      />

      {/* Learning Plan Modal */}
      <LearningPlanModal
        visible={showLearningPlan}
        plan={learningPlan}
        onClose={() => setShowLearningPlan(false)}
        onAccept={handleLearningPlanComplete}
      />
    </KeyboardAvoidingView>
  );
}

function getTaskTypeDescription(taskType: string): string {
  switch (taskType) {
    case "exam_preparation":
      return "AI detected this is exam preparation. Subtasks will focus on practice problems, test strategies, exam simulation, and spaced repetition for retention.";
    case "skill_learning":
      return "AI detected this is skill learning. Subtasks will include projects, real-world applications, portfolio development, and spaced repetition for mastery.";
    case "project_completion":
      return "AI detected this is a project. Subtasks will cover planning, implementation, testing, and delivery phases.";
    case "habit_building":
      return "AI detected this is habit building. Subtasks will focus on consistency, tracking, and long-term sustainability.";
    case "challenge":
      return "AI detected this is a challenge. Subtasks will include training, performance optimization, and achievement tracking.";
    default:
      return "AI will generate structured subtasks to help you complete this task efficiently.";
  }
}

function getPhaseBreakdownText(taskType?: string): string[] {
  switch (taskType) {
    case "exam_preparation":
      return [
        "📚 Diagnostic Assessment & Knowledge Review",
        "🛠️ Practice Problems & Skill Building",
        "🎯 Timed Practice & Test Strategies",
        "🤔 Error Analysis & Weak Area Review",
        "📝 Exam Simulation & Final Preparation",
        "🔄 Spaced Review & Retention"
      ];
    case "project_completion":
      return [
        "📚 Planning & Requirements Analysis",
        "🛠️ Implementation & Development",
        "🎯 Testing & Quality Assurance",
        "🤔 Review & Optimization",
        "📝 Delivery & Documentation"
      ];
    case "habit_building":
      return [
        "📚 Habit Design & Setup",
        "🛠️ Daily Practice & Consistency",
        "🎯 Integration & Optimization",
        "🤔 Progress Review & Adjustment",
        "📝 Sustainability & Mastery"
      ];
    case "challenge":
      return [
        "📚 Challenge Analysis & Strategy",
        "🛠️ Training & Skill Development",
        "🎯 Performance Testing & Optimization",
        "🤔 Results Analysis & Improvement",
        "📝 Achievement & Celebration"
      ];
    default:
      return [
        "📚 Knowledge Input",
        "🛠️ Practice & Hands-on",
        "🎯 Real-world Application",
        "🤔 Reflection & Review",
        "📝 Output & Presentation",
        "🔄 Spaced Repetition Review"
      ];
  }
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
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  textArea: {
    minHeight: 100,
  },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
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
  saveButton: {
    padding: Theme.spacing.sm,
  },
  // 🆕 排程模式相關樣式
  schedulingOptionsContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  schedulingModeContainer: {
    marginBottom: Theme.spacing.md,
  },
  schedulingModeTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  schedulingModeButtons: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  schedulingModeButton: {
    flex: 1,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
    alignItems: "center",
  },
  schedulingModeButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  schedulingModeButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 4,
  },
  schedulingModeButtonTextActive: {
    color: "#FFFFFF",
  },
  schedulingModeCharacteristics: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    textAlign: "center",
    lineHeight: 16,
  },
  startTimeContainer: {
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  startTimeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.xs,
  },
  startTimeLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  startTimeDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
  },
  schedulingModeDetails: {
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  schedulingModeDetailsTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  schedulingModeDetailsText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
    marginBottom: 2,
  },
});