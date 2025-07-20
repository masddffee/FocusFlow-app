import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Plus, Trash2, Save, Zap, Brain, HelpCircle, ArrowRight, Clock, Edit3, Lightbulb, MessageCircle, AlertCircle, BookOpen, ExternalLink, Calendar } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import DatePicker from "@/components/DatePicker";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TaskDifficulty, ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel, LearningPhase } from "@/types/task";
import { 
  getDynamicQuestions,
  generateEnhancedSubtasks as backendGenerateSubtasks,
  generatePlan,
  generateUnifiedLearningPlan,
  convertUnifiedPlanToAppFormat,
  evaluateInputQualitySafely,
  estimateTaskDuration,
  estimateSubtaskDuration
} from "@/utils/api";
import { findAvailableTimeSlot, scheduleSubtasks, convertSubtaskSchedulesToTasks, analyzeSchedulingFeasibility, generateSchedulingSuggestions, SchedulingMode, SCHEDULING_MODES } from "@/utils/scheduling";
import { calculateDaysUntil, getTimeConstraintLevel, getTimeConstraintMessage } from "@/utils/timeUtils";
// Remove redundant import - now using getDynamicQuestions from API

// 任務類型配置統一對象
const TASK_TYPE_CONFIG = {
  exam_preparation: {
    label: "Exam Preparation",
    icon: "🎓",
    description: "AI detected this is exam preparation. Subtasks will focus on practice problems, test strategies, exam simulation, and spaced repetition for retention."
  },
  skill_learning: {
    label: "Learning",
    icon: "🎯", 
    description: "AI detected this is skill learning. Subtasks will include projects, real-world applications, portfolio development, and spaced repetition for mastery."
  },
  project_completion: {
    label: "Project",
    icon: "🚀",
    description: "AI detected this is a project. Subtasks will cover planning, implementation, testing, and delivery phases."
  },
  habit_building: {
    label: "Habit Building",
    icon: "🔄",
    description: "AI detected this is habit building. Subtasks will focus on consistency, tracking, and long-term sustainability."
  },
  challenge: {
    label: "Challenge",
    icon: "⚡",
    description: "AI detected this is a challenge. Subtasks will include training, performance optimization, and achievement tracking."
  },
  general: {
    label: "Action",
    icon: "📋",
    description: "AI will generate structured subtasks to help you complete this task efficiently."
  }
} as const;

// 學習階段配置統一對象
const PHASE_CONFIG = {
  knowledge: {
    label: "Knowledge",
    icon: "📚",
    color: "#3B82F6" // Blue
  },
  practice: {
    label: "Practice", 
    icon: "🛠️",
    color: "#10B981" // Green
  },
  application: {
    label: "Application",
    icon: "🎯", 
    color: "#F59E0B" // Orange
  },
  reflection: {
    label: "Reflection",
    icon: "🤔",
    color: "#8B5CF6" // Purple
  },
  output: {
    label: "Output",
    icon: "📝",
    color: "#EF4444" // Red
  },
  review: {
    label: "Review",
    icon: "🔄",
    color: "#6366F1" // Indigo
  }
} as const;

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
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('flexible');
  const [startNextDay, setStartNextDay] = useState(true);
  const [showSchedulingOptions, setShowSchedulingOptions] = useState(false);
  
  // Enhanced clarification workflow states
  const [showQualityAlert, setShowQualityAlert] = useState(false);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
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
  
  // 時間約束計算函數（使用 useCallback 緩存）
  const calculateTimeConstraint = useCallback((selectedDate: string): { availableDays: number; timeContext: string; constraintLevel: string } => {
    if (!selectedDate) {
      return { availableDays: 0, timeContext: "", constraintLevel: "none" };
    }

    const availableDays = calculateDaysUntil(selectedDate);
    const constraintLevel = getTimeConstraintLevel(availableDays);
    const timeContext = getTimeConstraintMessage(availableDays);

    return { availableDays, timeContext, constraintLevel };
  }, []);
  
  // 使用 useMemo 緩存時間約束計算結果
  const timeConstraintInfo = useMemo(() => {
    return calculateTimeConstraint(dueDate);
  }, [dueDate, calculateTimeConstraint]);
  
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
      console.log("🚀 Using unified learning plan generation...");
      const currentLanguage = useSettingsStore.getState().language;
      
      // 📋 第一階段：請求個人化問題
      console.log("📋 第一階段：請求個人化問題...");
      const unifiedResponse = await generateUnifiedLearningPlan({
        title: title.trim(),
        description: description.trim(),
        language: currentLanguage,
        taskType: detectedTaskType || 'skill_learning',
        currentProficiency: currentProficiency,
        targetProficiency: targetProficiency
      });
      
      console.log("📊 第一階段 API 回應:", unifiedResponse);
      console.log("📝 Available keys:", Object.keys(unifiedResponse));
      
      const { personalizationQuestions } = unifiedResponse;
      if (personalizationQuestions && personalizationQuestions.length > 0) {
        console.log("✅ 收到", personalizationQuestions.length, "個個人化問題");
        setClarifyingQuestions(personalizationQuestions);
        setShowPersonalizationModal(true);
      } else {
        console.log("⚠️ 後端沒有返回個人化問題，但仍需走完整流程");
        // 即使沒有個人化問題，也要顯示一個基本問題給用戶
        const defaultQuestions: ClarifyingQuestion[] = [
          {
            id: "learning_goal",
            question: "請描述您希望通過這個任務達到什麼具體目標？",
            type: "text",
            required: true
          },
          {
            id: "current_experience", 
            question: "您在相關領域的經驗水平如何？",
            type: "choice",
            options: ["完全新手", "有一些了解", "中等水平", "較有經驗", "專家級別"],
            required: true
          }
        ];
        setClarifyingQuestions(defaultQuestions);
        setShowPersonalizationModal(true);
      }
    } catch (error) {
      console.error("❌ Unified learning plan generation failed:", error);
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
      const { availableDays, timeContext } = timeConstraintInfo;
      
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
      console.error("Generate subtasks error:", error);
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
      console.log("🎯 第二階段：生成個人化子任務...");
      console.log("📋 用戶回答:", clarificationResponses);
      
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
      
      console.log("📊 第二階段 API 回應:", result);
      console.log("📝 Available keys:", Object.keys(result));
      console.log("📋 result.subtasks:", result.subtasks);
      
      if (result.learningPlan) {
        setLearningPlan(result.learningPlan);
        setShowLearningPlan(true);
      }
      
      if (result.subtasks && result.subtasks.length > 0) {
        console.log("✅ 成功生成", result.subtasks.length, "個個人化子任務");
        setSubtasks(result.subtasks);
        const { availableDays } = timeConstraintInfo;
        const contextMessage = getTaskTypeMessage(
          detectedTaskType || 'skill_learning',
          result.subtasks.length,
          availableDays,
          currentProficiency,
          targetProficiency
        );
        Alert.alert("🎯 個人化學習計劃完成", `✅ 已生成 ${result.subtasks.length} 個個人化子任務\n\n${contextMessage}`);
      } else {
        console.error("❌ 第二階段 API 回應中沒有 subtasks");
        console.error("❌ 完整回應:", JSON.stringify(result, null, 2));
        Alert.alert("❌ 錯誤", "無法生成個人化子任務，請稍後重試或手動添加。");
      }
    } catch (error) {
      console.error("💥 第二階段個人化完成錯誤:", error);
      Alert.alert("❌ 錯誤", "生成個人化計劃失敗，請稍後重試。");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleLearningPlanComplete = () => {
    setShowLearningPlan(false);
    const taskTypeKey = learningPlan?.taskType as keyof typeof TASK_TYPE_CONFIG;
    const planType = TASK_TYPE_CONFIG[taskTypeKey]?.label || "Action";
    const { availableDays } = timeConstraintInfo;
    Alert.alert(
      `${planType} Plan Applied`,
      `Generated ${subtasks.length} specific subtasks based on your personalized ${planType.toLowerCase()} plan.${availableDays > 0 ? ` Optimized for your ${availableDays}-day timeline.` : ""} You can edit durations and add more subtasks as needed.`
    );
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
        console.error("Failed to estimate subtask duration:", error);
      }

      const newSubtaskObj: EnhancedSubtask = {
        id: `subtask_${Date.now()}`,
        title: `Manual Task ${subtasks.length + 1}`,
        text: newSubtask.trim(),
        aiEstimatedDuration: estimatedDuration,
        difficulty: difficulty as TaskDifficulty || "medium",
        order: subtasks.length + 1,
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

  const handleSubtaskDurationEdit = (subtaskId: string, currentDuration: number) => {
    setEditingSubtaskId(subtaskId);
    setTempDuration(currentDuration.toString());
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

  // 🆕 新增狀態驗證函數
  const verifyTaskCreated = async (taskId: string, retries = 3): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      const { tasks } = useTaskStore.getState();
      const taskExists = tasks.some(t => t.id === taskId);
      if (taskExists) {
        console.log(`✅ Task verification successful: ${taskId}`);
        return true;
      }
      console.log(`⏳ Task verification attempt ${i + 1}/${retries}: ${taskId}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.error(`❌ Task verification failed: ${taskId}`);
    return false;
  };

  // 🆕 安全導航函數
  const safeNavigateBack = async (taskId?: string, delay = 200) => {
    if (taskId) {
      const verified = await verifyTaskCreated(taskId);
      if (!verified) {
        console.error("Task not found in store, but continuing navigation");
      }
    }
    
    // 短暫延遲確保狀態更新完成
    setTimeout(() => {
      router.back();
    }, delay);
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
          console.error("Duration estimation failed:", error);
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
          { text: "OK", onPress: () => safeNavigateBack() }
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
        
        console.log(`🚀 Creating task: ${newTaskId} - ${taskData.title}`);
        const createdTaskId = addTask(taskData);
        console.log(`✅ Task created with ID: ${createdTaskId}`);
        
        // Auto-schedule if enabled
        if (autoSchedule && autoSchedulingEnabled && availableTimeSlots) {
          try {
            // Schedule subtasks instead of the whole task
            if (subtasks.length > 0) {
              // 🆕 創建完整的任務對象供分析和排程使用
              const taskForScheduling = {
                ...newTask,
                id: createdTaskId,
                subtasks
              };

              // 🆕 排程前可行性分析
              const feasibilityAnalysis = analyzeSchedulingFeasibility(
                taskForScheduling,
                availableTimeSlots,
                scheduledTasks,
                [], // Calendar events - could be fetched if calendar sync is enabled
                {
                  startDate: new Date(),
                  maxDaysToSearch: dueDate ? Math.max(30, calculateDaysUntil(dueDate)) : 90,
                  bufferBetweenSubtasks: schedulingMode === 'strict' ? 3 : 5,
                  respectPhaseOrder: false,
                  dailyMaxHours: null,
                }
              );

              // 🆕 生成智能建議
              const suggestions = generateSchedulingSuggestions(feasibilityAnalysis, taskForScheduling);

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
                          [{ text: "了解", onPress: () => safeNavigateBack(createdTaskId) }]
                        );
                      }
                    }
                  ]
                );
                return; // 不執行自動排程
              }

              // 🆕 使用新的排程模式進行智能排程
              const schedulingResult = scheduleSubtasks(
                taskForScheduling,
                availableTimeSlots,
                scheduledTasks,
                [], // Calendar events - could be fetched if calendar sync is enabled
                {
                  startDate: new Date(),
                  startNextDay: startNextDay, // 🆕 是否從隔天開始
                  maxDaysToSearch: dueDate ? Math.max(30, calculateDaysUntil(dueDate)) : 90,
                  bufferBetweenSubtasks: schedulingMode === 'strict' ? 3 : 5, // 🆕 嚴格模式減少緩衝時間
                  respectPhaseOrder: false,
                  dailyMaxHours: null,
                  mode: schedulingMode, // 🆕 排程模式
                  respectDependencies: true, // 🆕 考慮依賴關係
                  dependencies: [], // 🆕 依賴關係（可在未來擴展）
                  flexibilityFactor: schedulingMode === 'flexible' ? 0.7 : 0.3, // 🆕 彈性因子
                }
              );
              
              if (schedulingResult.success) {
                // Convert subtask schedules to scheduled tasks and save them
                const subtaskScheduledTasks = convertSubtaskSchedulesToTasks(
                  createdTaskId,
                  schedulingResult.scheduledSubtasks
                );
                
                // Add all scheduled subtasks
                subtaskScheduledTasks.forEach(scheduledTask => {
                  addScheduledTask(scheduledTask);
                });
                
                const { availableDays } = timeConstraintInfo;
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
                  `使用${SCHEDULING_MODES[schedulingMode].description}\n\n${alertMessage}`,
                  [{ text: "太好了！", onPress: () => safeNavigateBack(createdTaskId) }]
                );
              } else {
                // 🆕 排程失敗，提供詳細分析
                Alert.alert(
                  "⚠️ 排程遇到問題",
                  schedulingResult.message + "\n\n建議：\n• 延長截止日期\n• 減少子任務數量\n• 增加可用學習時間\n• 縮短子任務時長",
                  [
                    { 
                      text: "重新分析", 
                      onPress: () => {
                        const newAnalysis = analyzeSchedulingFeasibility(
                          taskForScheduling,
                          availableTimeSlots,
                          scheduledTasks,
                          []
                        );
                        const newSuggestions = generateSchedulingSuggestions(newAnalysis, taskForScheduling);
                        Alert.alert("詳細建議", newSuggestions.userMessage);
                      }
                    },
                    {
                      text: "仍要建立任務",
                      onPress: () => {
                        Alert.alert(
                          "任務已建立",
                          "任務已成功建立，但未完成自動排程。請根據建議調整後重新嘗試排程。",
                          [{ text: "了解", onPress: () => safeNavigateBack(createdTaskId) }]
                        );
                      }
                    }
                  ]
                );
              }
            } else {
              // No subtasks, schedule the whole task
            const scheduledTask = findAvailableTimeSlot(
              { ...newTask, id: createdTaskId, duration: totalDuration },
              availableTimeSlots,
              scheduledTasks
            );
            
            if (scheduledTask) {
              addScheduledTask(scheduledTask);
              const { availableDays } = timeConstraintInfo;
              const timeConstraintNote = availableDays > 0 && availableDays <= 7 
                ? ` Given your ${availableDays}-day deadline, this scheduling prioritizes urgent completion.`
                : "";
              Alert.alert(
                "Task Created & Scheduled",
                `Your task has been created and automatically scheduled for ${scheduledTask.date} at ${scheduledTask.timeSlot.start} (${totalDuration} minutes).${timeConstraintNote}`,
                [{ text: "Great!", onPress: () => safeNavigateBack(createdTaskId) }]
              );
            } else {
              Alert.alert(
                "Task Created",
                `Task created successfully with estimated duration of ${totalDuration} minutes. Could not find an available time slot automatically. You can schedule it manually from the tasks screen.`,
                [{ text: "OK", onPress: () => safeNavigateBack(createdTaskId) }]
              );
              }
            }
          } catch (schedulingError) {
            console.error("Auto-scheduling error:", schedulingError);
            Alert.alert(
              "Task Created",
              `Task created successfully with estimated duration of ${totalDuration} minutes. Auto-scheduling failed, but you can schedule it manually from the tasks screen.`,
              [{ text: "OK", onPress: () => safeNavigateBack(createdTaskId) }]
            );
          }
        } else {
          Alert.alert(
            "Task Created",
            `Task created successfully with estimated duration of ${totalDuration} minutes.`,
            [{ text: "OK", onPress: () => safeNavigateBack(createdTaskId) }]
          );
        }
      }
    } catch (error) {
      console.error("💥 Save task error:", error);
      
      // 🆕 詳細的錯誤處理和用戶反饋
      let errorMessage = "Failed to save task. Please try again.";
      let errorTitle = "Error";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to add task to store")) {
          errorTitle = "儲存失敗";
          errorMessage = "任務無法正確保存，請檢查網路連接或稍後再試。";
        } else if (error.message.includes("network")) {
          errorTitle = "網路錯誤";
          errorMessage = "網路連接異常，請檢查網路設定後重試。";
        } else {
          errorMessage = `保存任務時發生錯誤：${error.message}`;
        }
      }
      
      Alert.alert(errorTitle, errorMessage, [
        { 
          text: "重試", 
          onPress: () => {
            // 🆕 提供重試選項
            setIsEstimatingDuration(false);
            handleSave();
          }
        },
        { 
          text: "取消", 
          style: "cancel",
          onPress: () => setIsEstimatingDuration(false)
        }
      ]);
    } finally {
      // 確保加載狀態被重置
      if (isEstimatingDuration) {
        setIsEstimatingDuration(false);
      }
    }
  };

  const getTotalEstimatedTime = () => {
    return subtasks.reduce((total, subtask) => {
      return total + (subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60);
    }, 0);
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


  const getPhaseStats = () => {
    const phaseCount = {
      knowledge: 0,
      practice: 0,
      application: 0,
      reflection: 0,
      output: 0,
      review: 0,
    };

    subtasks.forEach(subtask => {
      if (subtask.phase && phaseCount.hasOwnProperty(subtask.phase)) {
        phaseCount[subtask.phase as keyof typeof phaseCount]++;
      }
    });

    return phaseCount;
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <Stack.Screen
        options={{
          title: isEstimatingDuration 
            ? (taskId ? "儲存中..." : "創建中...") 
            : (taskId ? "Edit Task" : "Add Task"),
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
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.taskTitle')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('addTask.taskTitlePlaceholder')}
            placeholderTextColor={Colors.light.subtext}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('addTask.descriptionPlaceholder')}
            placeholderTextColor={Colors.light.subtext}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Task Type Detection Display */}
        {detectedTaskType && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('addTask.aiDetectedType')}</Text>
            <View style={styles.detectedTypeContainer}>
              <View style={[
                styles.detectedTypeBadge,
                { backgroundColor: Colors.light.primary }
              ]}>
                <Text style={styles.detectedTypeIcon}>{TASK_TYPE_CONFIG[detectedTaskType]?.icon || "📋"}</Text>
                <Text style={styles.detectedTypeText}>
                  {TASK_TYPE_CONFIG[detectedTaskType]?.label || "Action"}
                </Text>
              </View>
              <Text style={styles.detectedTypeDescription}>
                {TASK_TYPE_CONFIG[detectedTaskType]?.description || "AI will generate structured subtasks to help you complete this task efficiently."}
              </Text>
            </View>
          </View>
        )}

        {/* Quality Alert Modal */}
        <Modal
          visible={showQualityAlert}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.qualityAlertOverlay}>
            <View style={styles.qualityAlertContainer}>
              <View style={styles.qualityAlertHeader}>
                <AlertCircle size={24} color={Colors.light.warning} />
                <Text style={styles.qualityAlertTitle}>{t('modals.qualityAlert.title')}</Text>
              </View>
              
              <Text style={styles.qualityAlertMessage}>
                {t('modals.qualityAlert.message')}
              </Text>
              
              <View style={styles.qualityIssuesList}>
                {qualityIssues.map((issue, index) => (
                  <Text key={`quality-issue-${index}-${issue.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.qualityIssueItem}>• {issue}</Text>
                ))}
              </View>
              
              <Text style={styles.qualityAlertSubMessage}>
                Would you like to answer a few quick questions to get personalized, actionable subtasks with spaced repetition?
              </Text>
              
              <View style={styles.qualityAlertButtons}>
                <Button
                  title="Skip for now"
                  onPress={handleQualityAlertSkip}
                  variant="outline"
                  size="small"
                  style={styles.qualityAlertButton}
                />
                <Button
                  title="Help me improve"
                  onPress={handleQualityAlertContinue}
                  variant="primary"
                  size="small"
                  style={styles.qualityAlertButton}
                  icon={<Lightbulb size={16} color="#FFFFFF" />}
                />
              </View>
            </View>
          </View>
        </Modal>
        
        <View style={styles.inputGroup}>
          <View style={styles.dueDateHeader}>
            <Text style={styles.label}>Due Date (Optional)</Text>
            <Calendar size={16} color={Colors.light.primary} />
          </View>
          <DatePicker
            selectedDate={dueDate}
            onDateSelect={setDueDate}
            placeholder={t('addTask.dueDatePlaceholder')}
            minDate={new Date()}
          />
          {dueDate && (
            <View style={styles.timeConstraintInfo}>
              <Text style={styles.timeConstraintText}>
                {timeConstraintInfo.timeContext}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.priority')}</Text>
          <View style={styles.difficultyContainer}>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                priority === "low" && styles.difficultyButtonActive,
                priority === "low" && { backgroundColor: Colors.light.success },
              ]}
              onPress={() => setPriority("low")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  priority === "low" && styles.difficultyTextActive,
                ]}
              >
                {t('priority.low')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                priority === "medium" && styles.difficultyButtonActive,
                priority === "medium" && { backgroundColor: Colors.light.warning },
              ]}
              onPress={() => setPriority("medium")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  priority === "medium" && styles.difficultyTextActive,
                ]}
              >
                {t('priority.medium')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                priority === "high" && styles.difficultyButtonActive,
                priority === "high" && { backgroundColor: Colors.light.error },
              ]}
              onPress={() => setPriority("high")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  priority === "high" && styles.difficultyTextActive,
                ]}
              >
                {t('priority.high')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.difficulty')}</Text>
          <View style={styles.difficultyContainer}>
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === "easy" && styles.difficultyButtonActive,
                difficulty === "easy" && { backgroundColor: Colors.light.success },
              ]}
              onPress={() => setDifficulty("easy")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === "easy" && styles.difficultyTextActive,
                ]}
              >
                {t('difficulty.easy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === "medium" && styles.difficultyButtonActive,
                difficulty === "medium" && { backgroundColor: Colors.light.warning },
              ]}
              onPress={() => setDifficulty("medium")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === "medium" && styles.difficultyTextActive,
                ]}
              >
                {t('difficulty.medium')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.difficultyButton,
                difficulty === "hard" && styles.difficultyButtonActive,
                difficulty === "hard" && { backgroundColor: Colors.light.error },
              ]}
              onPress={() => setDifficulty("hard")}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === "hard" && styles.difficultyTextActive,
                ]}
              >
                {t('difficulty.hard')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {autoSchedulingEnabled && !taskId && (
          <View style={styles.inputGroup}>
            <View style={styles.autoScheduleContainer}>
              <View style={styles.autoScheduleInfo}>
                <Zap size={20} color={Colors.light.primary} />
                <View style={styles.autoScheduleText}>
                  <Text style={styles.autoScheduleTitle}>AI Auto-Schedule</Text>
                  <Text style={styles.autoScheduleDescription}>
                    Automatically estimate duration and find the best time slot based on your availability, task priority, and deadline
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  autoSchedule && styles.toggleButtonActive,
                ]}
                onPress={() => setAutoSchedule(!autoSchedule)}
              >
                <View
                  style={[
                    styles.toggleIndicator,
                    autoSchedule && styles.toggleIndicatorActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
            
            {/* 🆕 排程選項 */}
            {autoSchedule && (
              <View style={styles.schedulingOptionsContainer}>
                {/* 排程模式選擇 */}
                <View style={styles.schedulingModeContainer}>
                  <Text style={styles.schedulingModeTitle}>排程模式</Text>
                  <View style={styles.schedulingModeButtons}>
                                    {Object.values(SCHEDULING_MODES).map((mode) => (
                  <TouchableOpacity
                    key={`scheduling-mode-${mode.mode}`}
                    style={[
                      styles.schedulingModeButton,
                      schedulingMode === mode.mode && styles.schedulingModeButtonActive,
                    ]}
                    onPress={() => setSchedulingMode(mode.mode)}
                  >
                        <Text style={[
                          styles.schedulingModeButtonText,
                          schedulingMode === mode.mode && styles.schedulingModeButtonTextActive,
                        ]}>
                          {mode.description}
                        </Text>
                        <Text style={styles.schedulingModeCharacteristics}>
                          {mode.characteristics[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 開始時間選擇 */}
                <View style={styles.startTimeContainer}>
                  <View style={styles.startTimeOption}>
                    <Text style={styles.startTimeLabel}>從隔天開始</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        startNextDay && styles.toggleButtonActive,
                      ]}
                      onPress={() => setStartNextDay(!startNextDay)}
                    >
                      <View
                        style={[
                          styles.toggleIndicator,
                          startNextDay && styles.toggleIndicatorActive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.startTimeDescription}>
                    {startNextDay 
                      ? "任務將從明天開始安排，給您更充足的準備時間" 
                      : "任務可能從今天就開始安排（如果有空檔）"
                    }
                  </Text>
                </View>

                {/* 排程模式詳細說明 */}
                <View style={styles.schedulingModeDetails}>
                  <Text style={styles.schedulingModeDetailsTitle}>
                    {SCHEDULING_MODES[schedulingMode].description}
                  </Text>
                  {SCHEDULING_MODES[schedulingMode].characteristics.map((characteristic, index) => (
                    <Text key={`scheduling-characteristic-${schedulingMode}-${index}`} style={styles.schedulingModeDetailsText}>
                      • {characteristic}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        
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

          {subtasks.length > 0 && (
            <>
              <View style={styles.timeEstimateContainer}>
                <Text style={styles.timeEstimateText}>
                  Total estimated time: {getTotalEstimatedTime()} minutes ({Math.round(getTotalEstimatedTime() / 60 * 10) / 10} hours)
                </Text>
              </View>

              {/* Phase Distribution */}
              {subtasks.some(s => s.phase) && (
                <View style={styles.phaseDistributionContainer}>
                  <Text style={styles.phaseDistributionTitle}>Learning Phase Distribution</Text>
                  <View style={styles.phaseDistribution}>
                    {Object.entries(getPhaseStats()).map(([phase, count]) => (
                      count > 0 && (
                        <View key={phase} style={styles.phaseDistributionItem}>
                          <View style={[
                            styles.phaseDistributionDot,
                            { backgroundColor: PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG]?.color || Colors.light.subtext }
                          ]} />
                          <Text style={styles.phaseDistributionText}>
                            {PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG]?.label || phase}: {count}
                          </Text>
                        </View>
                      )
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          
          {subtasks.map((subtask) => (
            <View key={subtask.id} style={styles.subtaskCard}>
              <View style={styles.subtaskContent}>
                <View style={styles.subtaskHeader}>
                  {subtask.title && (
                    <Text style={styles.subtaskTitle}>
                      {PHASE_CONFIG[subtask.phase as keyof typeof PHASE_CONFIG]?.icon || "📋"} {subtask.title}
                    </Text>
                  )}
                  {subtask.taskType === "exam_preparation" && (
                    <View style={styles.examBadge}>
                      <Text style={styles.examBadgeText}>Exam</Text>
                    </View>
                  )}
                  {subtask.isReviewTask && (
                    <View style={styles.reviewBadge}>
                      <Text style={styles.reviewBadgeText}>Review</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.subtaskText}>
                  {subtask.text}
                </Text>
                
                {/* Recommended Resources */}
                {subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
                  <View style={styles.resourcesContainer}>
                    <View style={styles.resourcesHeader}>
                      <BookOpen size={12} color={Colors.light.primary} />
                      <Text style={styles.resourcesTitle}>Recommended Resources:</Text>
                    </View>
                    {subtask.recommendedResources.slice(0, 3).map((resource, index) => (
                      <View key={`${subtask.id}-resource-${index}`} style={styles.resourceItem}>
                        <ExternalLink size={10} color={Colors.light.subtext} />
                        <Text style={styles.resourceText}>{resource}</Text>
                      </View>
                    ))}
                    {subtask.recommendedResources.length > 3 && (
                      <Text style={styles.moreResourcesText}>
                        +{subtask.recommendedResources.length - 3} more resources
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.subtaskMeta}>
                  <View style={styles.subtaskDuration}>
                    <Clock size={12} color={Colors.light.subtext} />
                    {editingSubtaskId === subtask.id ? (
                      <View style={styles.durationEditContainer}>
                        <TextInput
                          style={styles.durationInput}
                          value={tempDuration}
                          onChangeText={setTempDuration}
                          keyboardType="numeric"
                          placeholder="60"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => handleSubtaskDurationSave(subtask.id)}
                          style={styles.durationSaveButton}
                        >
                          <Text style={styles.durationSaveText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSubtaskDurationCancel}
                          style={styles.durationCancelButton}
                        >
                          <Text style={styles.durationCancelText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleSubtaskDurationEdit(
                          subtask.id,
                          subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60
                        )}
                        style={styles.durationDisplay}
                      >
                        <Text style={styles.subtaskDurationText}>
                          {subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60}m
                        </Text>
                        <Edit3 size={10} color={Colors.light.subtext} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {subtask.difficulty && (
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(subtask.difficulty) }
                    ]}>
                      <Text style={styles.difficultyBadgeText}>
                        {subtask.difficulty}
                      </Text>
                    </View>
                  )}
                  {subtask.phase && (
                    <View style={[
                      styles.phaseBadge,
                      { backgroundColor: PHASE_CONFIG[subtask.phase as keyof typeof PHASE_CONFIG]?.color || Colors.light.subtext }
                    ]}>
                      <Text style={styles.phaseBadgeText}>
                        {PHASE_CONFIG[subtask.phase as keyof typeof PHASE_CONFIG]?.label || subtask.phase}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveSubtask(subtask.id)}
                style={styles.removeSubtaskButton}
              >
                <Trash2 size={16} color={Colors.light.error} />
              </TouchableOpacity>
            </View>
          ))}
          
          <View style={styles.addSubtaskContainer}>
            <TextInput
              style={styles.subtaskInput}
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder={t('addTask.subtaskPlaceholder')}
              placeholderTextColor={Colors.light.subtext}
              onSubmitEditing={handleAddSubtask}
            />
            <TouchableOpacity
              style={styles.addSubtaskButton}
              onPress={handleAddSubtask}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button
          title={
            isEstimatingDuration 
              ? (taskId ? "更新中..." : "創建中...") 
              : (taskId ? "Update Task" : "Create & Schedule Task")
          }
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
      <Modal
        visible={showPersonalizationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Help us personalize your plan</Text>
            <Text style={styles.modalSubtitle}>
              Answer a few questions to get specific, actionable subtasks tailored to your needs with dynamic range calculation
            </Text>
            {detectedTaskType && (
              <View style={styles.detectedTypeInModal}>
                <Text style={styles.detectedTypeInModalText}>
                  Detected: {TASK_TYPE_CONFIG[detectedTaskType]?.icon || "📋"} {TASK_TYPE_CONFIG[detectedTaskType]?.label || "Action"}
                </Text>
              </View>
            )}
          </View>
          
          <ScrollView style={styles.modalContent}>
            {clarifyingQuestions.map((question, index) => (
              <View key={question.id} style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                  <HelpCircle size={16} color={Colors.light.primary} />
                  <Text style={styles.questionText}>
                    {question.question}
                    {question.required && <Text style={styles.required}> *</Text>}
                  </Text>
                </View>
                
                {question.type === "choice" && question.options ? (
                  <View style={styles.choiceContainer}>
                    {question.options.map((option, optionIndex) => (
                      <TouchableOpacity
                        key={`${question.id}-option-${optionIndex}`}
                        style={[
                          styles.choiceButton,
                          clarificationResponses[question.id] === option && styles.choiceButtonActive,
                        ]}
                        onPress={() => handlePersonalizationResponse(question.id, option)}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            clarificationResponses[question.id] === option && styles.choiceTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.questionInput}
                    value={clarificationResponses[question.id] || ""}
                    onChangeText={(text) => handlePersonalizationResponse(question.id, text)}
                    placeholder="Your answer..."
                    placeholderTextColor={Colors.light.subtext}
                    multiline={question.type === "text"}
                    numberOfLines={question.type === "text" ? 3 : 1}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              onPress={() => setShowPersonalizationModal(false)}
              variant="outline"
              style={styles.modalButton}
            />
            <Button
              title="Generate Plan"
              onPress={handlePersonalizationComplete}
              variant="primary"
              style={styles.modalButton}
              loading={isGeneratingSubtasks}
              icon={<ArrowRight size={16} color="#FFFFFF" />}
            />
          </View>
        </View>
      </Modal>

      {/* Learning Plan Modal */}
      <Modal
        visible={showLearningPlan}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Your Personalized {TASK_TYPE_CONFIG[learningPlan?.taskType as keyof typeof TASK_TYPE_CONFIG]?.label || "Action"} Plan
            </Text>
            <Text style={styles.modalSubtitle}>
              A comprehensive plan based on your goals and preferences with spaced repetition integration
            </Text>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {learningPlan && (
              <>
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Achievable Goal</Text>
                  <Text style={styles.planItem}>{learningPlan.achievableGoal}</Text>
                </View>
                
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Recommended Tools & Resources</Text>
                  {learningPlan.recommendedTools.map((tool, index) => (
                    <Text key={`learning-tool-${index}-${tool.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.planItem}>• {tool}</Text>
                  ))}
                </View>
                
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Progress Checkpoints</Text>
                  {learningPlan.checkpoints.map((checkpoint, index) => (
                    <Text key={`learning-checkpoint-${index}-${checkpoint.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.planItem}>• {checkpoint}</Text>
                  ))}
                </View>

                {learningPlan.skillBreakdown && learningPlan.skillBreakdown.length > 0 && (
                  <View style={styles.planSection}>
                    <Text style={styles.planSectionTitle}>Skill Development Plan</Text>
                    {learningPlan.skillBreakdown.map((skill, index) => (
                      <View key={`learning-skill-${index}-${skill.skill.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.skillItem}>
                        <Text style={styles.skillName}>{skill.skill}</Text>
                        <Text style={styles.skillProgress}>
                          {getProficiencyLabel(skill.currentLevel)} → {getProficiencyLabel(skill.targetLevel)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Generated Subtasks</Text>
                  <Text style={styles.planSubtext}>
                    {subtasks.length} specific, actionable subtasks have been created following the enhanced 6-phase methodology with spaced repetition:
                  </Text>
                  <View style={styles.phaseBreakdown}>
                    {getPhaseBreakdownText(learningPlan.taskType).map((phase, index) => (
                      <Text key={`phase-breakdown-${index}-${phase.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.phaseItem}>{phase}</Text>
                    ))}
                  </View>
                  <Text style={styles.planSubtext}>
                    You can review and edit them after closing this modal. Spaced repetition will be automatically scheduled for long-term retention.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <Button
              title="Got it!"
              onPress={handleLearningPlanComplete}
              variant="primary"
              style={styles.fullWidthButton}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
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
  dueDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  timeConstraintInfo: {
    backgroundColor: Colors.light.warning + "15",
    borderWidth: 1,
    borderColor: Colors.light.warning + "30",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  timeConstraintText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.warning,
    fontWeight: "500",
    lineHeight: 18,
  },
  detectedTypeContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  detectedTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginBottom: Theme.spacing.xs,
    gap: 4,
  },
  detectedTypeIcon: {
    fontSize: 14,
  },
  detectedTypeText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detectedTypeDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
  },
  detectedTypeInModal: {
    backgroundColor: Colors.light.primary + "15",
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
    alignSelf: "flex-start",
  },
  detectedTypeInModalText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  qualityAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.lg,
  },
  qualityAlertContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  qualityAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  qualityAlertTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
  },
  qualityAlertMessage: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
    lineHeight: 22,
  },
  qualityIssuesList: {
    marginBottom: Theme.spacing.md,
  },
  qualityIssueItem: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  qualityAlertSubMessage: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.lg,
    lineHeight: 22,
  },
  qualityAlertButtons: {
    flexDirection: "row",
    gap: Theme.spacing.md,
  },
  qualityAlertButton: {
    flex: 1,
  },
  difficultyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    alignItems: "center",
    marginHorizontal: 4,
    backgroundColor: Colors.light.card,
  },
  difficultyButtonActive: {
    borderColor: "transparent",
  },
  difficultyText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
  },
  difficultyTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  autoScheduleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
  },
  autoScheduleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  autoScheduleText: {
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  autoScheduleTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  autoScheduleDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginTop: 2,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.border,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  toggleIndicatorActive: {
    alignSelf: "flex-end",
  },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  timeEstimateContainer: {
    backgroundColor: Colors.light.primary + "15",
    borderWidth: 1,
    borderColor: Colors.light.primary + "30",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    alignItems: "center",
  },
  timeEstimateText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  phaseDistributionContainer: {
    backgroundColor: Colors.light.card,
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
  subtaskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
    flex: 1,
  },
  examBadge: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reviewBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  subtaskText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
    lineHeight: 22,
  },
  resourcesContainer: {
    backgroundColor: Colors.light.card,
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
  moreResourcesText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.primary,
    fontStyle: "italic",
    marginTop: 2,
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
  durationEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: Theme.typography.sizes.sm,
    minWidth: 40,
    textAlign: "center",
  },
  durationSaveButton: {
    backgroundColor: Colors.light.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationSaveText: {
    color: "#FFFFFF",
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "600",
  },
  durationCancelButton: {
    backgroundColor: Colors.light.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationCancelText: {
    color: "#FFFFFF",
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "600",
  },
  durationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  subtaskDurationText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  difficultyBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  phaseBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  removeSubtaskButton: {
    padding: 4,
    marginLeft: Theme.spacing.sm,
  },
  addSubtaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Theme.spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    marginRight: Theme.spacing.sm,
  },
  addSubtaskButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: Theme.spacing.xl,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Theme.spacing.md,
  },
  questionText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
    lineHeight: 22,
  },
  required: {
    color: Colors.light.error,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    textAlignVertical: "top",
  },
  choiceContainer: {
    gap: Theme.spacing.sm,
  },
  choiceButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
  },
  choiceButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  choiceText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: "center",
  },
  choiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: "100%",
  },
  planSection: {
    marginBottom: Theme.spacing.xl,
  },
  planSectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  planItem: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
    lineHeight: 22,
  },
  planSubtext: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 20,
    marginBottom: Theme.spacing.md,
  },
  phaseBreakdown: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  phaseItem: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  skillItem: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  skillName: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  skillProgress: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginTop: 2,
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