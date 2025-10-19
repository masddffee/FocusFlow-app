import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useTaskStore } from '@/store/taskStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TaskDifficulty, EnhancedSubtask, ClarifyingQuestion, LearningPlan, ProficiencyLevel } from '@/types/task';
import { SchedulingMode } from '@/utils/scheduling';
import { 
  generateTaskPlanningDirect,
  generateSubtasksDirect,
  isDirectApiSuccess,
  needsPersonalization,
  estimateTaskDuration,
  estimateSubtaskDuration
} from '@/utils/api';
import { 
  scheduleSubtasks, 
  convertSubtaskSchedulesToTasks, 
  inferUrgencyLevel,
  SCHEDULING_MODES
} from '@/utils/scheduling';
import { calculateDaysUntil } from '@/utils/timeUtils';
import { log } from '@/lib/logger';

export interface UseTaskCreationProps {
  taskId?: string;
}

export function useTaskCreation({ taskId }: UseTaskCreationProps = {}) {
  // Basic Task Data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [difficulty, setDifficulty] = useState<TaskDifficulty | "">("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "">("");
  
  // Scheduling States
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('balanced');
  const [startNextDay, setStartNextDay] = useState(false);
  const [showSchedulingOptions, setShowSchedulingOptions] = useState(false);
  
  // Subtasks & AI Generation
  const [subtasks, setSubtasks] = useState<EnhancedSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [detectedTaskType, setDetectedTaskType] = useState<string | undefined>();
  
  // Personalization States
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarificationResponses, setClarificationResponses] = useState<Record<string, string>>({});
  
  // Learning Plan States
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [showLearningPlan, setShowLearningPlan] = useState(false);
  
  // Quality Alert States (for backward compatibility)
  const [showQualityAlert, setShowQualityAlert] = useState(false);
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  
  // Loading States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isEstimatingDuration, setIsEstimatingDuration] = useState(false);
  
  // Proficiency (internal use)
  const [currentProficiency, setCurrentProficiency] = useState<ProficiencyLevel>("beginner");
  const [targetProficiency, setTargetProficiency] = useState<ProficiencyLevel>("intermediate");
  
  // Duration editing
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [tempDuration, setTempDuration] = useState("");
  
  // Stores
  const { tasks, addTask, updateTask, scheduledTasks, addScheduledTask } = useTaskStore();
  const { availableTimeSlots, autoSchedulingEnabled } = useSettingsStore();

  // Load existing task for editing
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

  // Smart Generate - Main AI Flow
  const handleSmartGenerate = async () => {
    if (!title.trim()) {
      Alert.alert("錯誤", "請輸入任務標題");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      log.info('🚀 [Smart Generate] Starting task planning...');
      
      // 🚀 單次智能任務規劃調用 (替代原本的 2 次 generateUnifiedLearningPlan 調用)
      const planningResult = await generateTaskPlanningDirect({
        title: title.trim(),
        description: description.trim(),
        language: useSettingsStore.getState().language,
        mode: 'auto' // 智能模式：自動判斷是否需要個人化問題
      });

      if (!isDirectApiSuccess(planningResult)) {
        throw new Error(planningResult.error || '任務規劃失敗');
      }

      // 檢查是否需要個人化問題
      if (needsPersonalization(planningResult)) {
        log.info('📝 Need personalization questions:', planningResult.questions?.length);
        setClarifyingQuestions(planningResult.questions || []);
        setShowPersonalizationModal(true);
        setDetectedTaskType(planningResult.taskType);
        
        // 保存學習計劃（如果有）
        if (planningResult.plan) {
          setLearningPlan(planningResult.plan);
        }
      } else {
        // 內容充分，直接生成子任務
        log.info('✅ Content sufficient, generating subtasks directly');
        await generateSubtasksFromPlanning(planningResult);
      }

    } catch (error) {
      log.error('❌ Smart generate failed:', error);
      Alert.alert("錯誤", error instanceof Error ? error.message : "智能生成失敗");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate subtasks from planning result
  const generateSubtasksFromPlanning = async (planningResult: any) => {
    setIsGeneratingSubtasks(true);
    
    try {
      const subtasksResult = await generateSubtasksDirect({
        title,
        description,
        taskType: planningResult.taskType || 'general',
        currentProficiency,
        targetProficiency,
        language: useSettingsStore.getState().language
      });

      if (isDirectApiSuccess(subtasksResult)) {
        setSubtasks(subtasksResult.subtasks || []);
        setDetectedTaskType(subtasksResult.taskType || planningResult.taskType);
        
        if (subtasksResult.learningPlan) {
          setLearningPlan(subtasksResult.learningPlan);
          setShowLearningPlan(true);
        }
        
        log.info(`✅ Generated ${subtasksResult.subtasks?.length || 0} subtasks`);
      } else {
        throw new Error(subtasksResult.error || '子任務生成失敗');
      }
    } catch (error) {
      log.error('❌ Subtask generation failed:', error);
      Alert.alert("錯誤", error instanceof Error ? error.message : "子任務生成失敗");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  // Handle personalization completion
  const handlePersonalizationComplete = async () => {
    // Validate required questions
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
      // Generate personalized subtasks
      const subtasksResult = await generateSubtasksDirect({
        title,
        description,
        clarificationResponses,
        dueDate,
        taskType: detectedTaskType,
        currentProficiency,
        targetProficiency,
        language: useSettingsStore.getState().language
      });

      if (isDirectApiSuccess(subtasksResult)) {
        setSubtasks(subtasksResult.subtasks || []);
        
        if (subtasksResult.learningPlan) {
          setLearningPlan(subtasksResult.learningPlan);
          setShowLearningPlan(true);
        }
        
        log.info(`✅ Generated ${subtasksResult.subtasks?.length || 0} personalized subtasks`);
      } else {
        throw new Error(subtasksResult.error || '個人化子任務生成失敗');
      }
    } catch (error) {
      log.error('❌ Personalization failed:', error);
      Alert.alert("Error", "Failed to create personalized plan. Please try again later.");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  // Handle personalization response
  const handlePersonalizationResponse = (questionId: string, response: string) => {
    setClarificationResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  // Save task with scheduling
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("錯誤", "請輸入任務標題");
      return;
    }

    setIsEstimatingDuration(true);

    try {
      // Generate task ID
      const newTaskId = taskId || Date.now().toString();
      
      // Estimate total duration
      const totalDuration = subtasks.length > 0 
        ? subtasks.reduce((sum, subtask) => sum + (subtask.estimatedDuration || 30), 0)
        : await estimateTaskDuration(title, description, difficulty);

      // Create task object
      const newTask = {
        id: newTaskId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        difficulty: difficulty || undefined,
        priority: priority || undefined,
        subtasks,
        estimatedDuration: totalDuration,
        taskType: detectedTaskType,
        currentProficiency,
        targetProficiency,
        createdAt: new Date().toISOString(),
        completed: false
      };

      // Save task
      if (taskId) {
        updateTask(newTaskId, newTask);
      } else {
        addTask(newTask);
      }

      // Handle automatic scheduling
      if (autoSchedule && autoSchedulingEnabled && subtasks.length > 0) {
        await scheduleTaskAutomatically(newTask, newTaskId);
      } else {
        Alert.alert("任務已建立", "任務已成功建立", [
          { text: "確定", onPress: () => router.back() }
        ]);
      }

    } catch (error) {
      log.error('❌ Save task failed:', error);
      Alert.alert("錯誤", "儲存任務時發生錯誤");
    } finally {
      setIsEstimatingDuration(false);
    }
  };

  // Schedule task automatically
  const scheduleTaskAutomatically = async (task: any, taskId: string) => {
    try {
      // Infer urgency level
      const urgencyLevel = inferUrgencyLevel({
        dueDate,
        priority: priority as 'low' | 'medium' | 'high' | undefined,
        taskType: task.taskType || 'general'
      });

      // Schedule subtasks
      const schedulingResult = scheduleSubtasks(
        subtasks,
        availableTimeSlots,
        scheduledTasks,
        [],
        {
          startDate: new Date(),
          urgencyLevel,
          maxDaysToSearch: dueDate ? Math.max(14, calculateDaysUntil(dueDate)) : 14
        }
      );

      if (schedulingResult.success) {
        // Convert and save scheduled tasks
        const subtaskScheduledTasks = convertSubtaskSchedulesToTasks(
          schedulingResult.scheduledSubtasks,
          taskId
        );

        subtaskScheduledTasks.forEach(scheduledTask => {
          addScheduledTask(scheduledTask);
        });

        Alert.alert(
          "任務已建立並自動排程",
          `成功安排 ${schedulingResult.scheduledSubtasks.length} 個子任務`,
          [{ text: "太好了！", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "⚠️ 排程遇到問題", 
          `${schedulingResult.message}\n\n建議：\n• 延長截止日期\n• 增加可用學習時間\n• 減少子任務數量`,
          [
            {
              text: "仍要建立任務",
              onPress: () => {
                Alert.alert("任務已建立", "任務已成功建立，但未完成自動排程。您可以稍後手動安排時間。",
                  [{ text: "了解", onPress: () => router.back() }]);
              }
            }
          ]
        );
      }
    } catch (error) {
      log.error('❌ Auto scheduling failed:', error);
      Alert.alert("排程錯誤", "自動排程失敗，但任務已建立");
    }
  };

  // Calculate total estimated time
  const getTotalEstimatedTime = () => {
    return subtasks.reduce((total, subtask) => total + (subtask.estimatedDuration || 30), 0);
  };

  // Quality alert handlers (placeholder)
  const handleQualityAlertContinue = () => {
    setShowQualityAlert(false);
    // Continue with task creation
  };

  const handleQualityAlertSkip = () => {
    setShowQualityAlert(false);
    // Skip quality check and continue
  };

  // Learning plan completion handler
  const handleLearningPlanComplete = () => {
    setShowLearningPlan(false);
  };

  return {
    // Basic Task Data
    title, setTitle,
    description, setDescription,
    dueDate, setDueDate,
    difficulty, setDifficulty,
    priority, setPriority,
    
    // Scheduling
    autoSchedule, setAutoSchedule,
    schedulingMode, setSchedulingMode,
    startNextDay, setStartNextDay,
    showSchedulingOptions, setShowSchedulingOptions,
    
    // Subtasks
    subtasks, setSubtasks,
    newSubtask, setNewSubtask,
    detectedTaskType,
    
    // Personalization
    showPersonalizationModal, setShowPersonalizationModal,
    clarifyingQuestions,
    clarificationResponses,
    handlePersonalizationResponse,
    handlePersonalizationComplete,
    
    // Learning Plan
    learningPlan,
    showLearningPlan, setShowLearningPlan,
    handleLearningPlanComplete,
    
    // Quality Alert
    showQualityAlert,
    qualityIssues,
    handleQualityAlertContinue,
    handleQualityAlertSkip,
    
    // Loading States
    isAnalyzing,
    isGeneratingSubtasks,
    isEstimatingDuration,
    
    // Duration Editing
    editingSubtaskId, setEditingSubtaskId,
    tempDuration, setTempDuration,
    
    // Actions
    handleSmartGenerate,
    handleSave,
    getTotalEstimatedTime,
    
    // Proficiency (internal)
    currentProficiency, setCurrentProficiency,
    targetProficiency, setTargetProficiency
  };
}