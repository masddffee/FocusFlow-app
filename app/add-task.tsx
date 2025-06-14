import React, { useState, useEffect } from "react";
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
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import DatePicker from "@/components/DatePicker";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TaskDifficulty, ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel } from "@/types/task";
import { 
  evaluateInputQuality,
  analyzeTaskForClarification, 
  generateEnhancedSubtasks, 
  generateLearningPlan,
  estimateTaskDuration,
  estimateSubtaskDuration
} from "@/utils/ai";
import { findAvailableTimeSlot } from "@/utils/scheduling";
import { calculateDaysUntil, getTimeConstraintLevel, getTimeConstraintMessage } from "@/utils/timeUtils";

export default function AddTaskScreen() {
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
      Alert.alert("Missing Information", "Please enter a task title first to get personalized suggestions");
      return;
    }

    setIsAnalyzing(true);
    setShowQualityAlert(false);
    setShowPersonalizationModal(false);
    
    try {
      // Step 1: Evaluate input quality
      const qualityEvaluation = await evaluateInputQuality(title, description);
      
      if (!qualityEvaluation.isSufficient) {
        // Input is insufficient, show quality alert and get clarification questions
        setQualityIssues(qualityEvaluation.reasons || []);
        
        // Generate clarification questions and auto-detect task type
        const analysis = await analyzeTaskForClarification(title, description);
        
        // Set detected task type and proficiency levels
        if (analysis.taskType) {
          setDetectedTaskType(analysis.taskType);
        }
        if (analysis.currentProficiency) {
          setCurrentProficiency(analysis.currentProficiency);
        }
        if (analysis.targetProficiency) {
          setTargetProficiency(analysis.targetProficiency);
        }
        
        if (analysis.needsClarification && analysis.questions) {
          setClarifyingQuestions(analysis.questions);
          setClarificationResponses({});
          setShowQualityAlert(true);
        } else {
          // Fallback: generate subtasks directly if analysis fails
          await generateSubtasksDirectly(analysis.taskType || undefined, analysis.currentProficiency, analysis.targetProficiency);
        }
      } else {
        // Input is sufficient, but still analyze for task type detection
        const analysis = await analyzeTaskForClarification(title, description);
        if (analysis.taskType) {
          setDetectedTaskType(analysis.taskType);
        }
        if (analysis.currentProficiency) {
          setCurrentProficiency(analysis.currentProficiency);
        }
        if (analysis.targetProficiency) {
          setTargetProficiency(analysis.targetProficiency);
        }
        
        // Generate subtasks directly
        await generateSubtasksDirectly(analysis.taskType || undefined, analysis.currentProficiency, analysis.targetProficiency);
      }
    } catch (error) {
      console.error("Smart generate error:", error);
      Alert.alert("Error", "Failed to analyze task. Please try again later.");
    } finally {
      setIsAnalyzing(false);
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
      const { availableDays, timeContext } = calculateTimeConstraint(dueDate);
      
      // Check if this is an educational task that might benefit from a learning plan
      const isEducational = finalTaskType === "skill_learning" || finalTaskType === "exam_preparation";

      if (isEducational) {
        // Try to generate learning plan first
        const plan = await generateLearningPlan(title, description);
        if (plan && plan.subtasks && plan.subtasks.length > 0) {
          setLearningPlan(plan);
          setSubtasks(plan.subtasks);
          setShowLearningPlan(true);
          return;
        }
      }

      // Generate enhanced subtasks with due date context, task type, and proficiency levels
      const enhancedSubtasks = await generateEnhancedSubtasks(
        title, 
        description, 
        undefined, 
        dueDate, 
        finalTaskType,
        finalCurrentProficiency,
        finalTargetProficiency
      );
      
      if (enhancedSubtasks.length > 0) {
        setSubtasks(enhancedSubtasks);
        const contextMessage = getTaskTypeMessage(finalTaskType, enhancedSubtasks.length, availableDays, finalCurrentProficiency, finalTargetProficiency);
        Alert.alert("Smart Subtasks Generated", contextMessage);
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
    // Check if all required questions are answered
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
      // Extract proficiency levels from responses
      let extractedCurrentProficiency = currentProficiency;
      let extractedTargetProficiency = targetProficiency;

      Object.entries(clarificationResponses).forEach(([question, answer]) => {
        const answerLower = answer.toLowerCase();
        if (question.toLowerCase().includes('current') || question.toLowerCase().includes('experience')) {
          if (answerLower.includes('never') || answerLower.includes('no experience')) {
            extractedCurrentProficiency = "complete_beginner";
          } else if (answerLower.includes('beginner') || answerLower.includes('basic')) {
            extractedCurrentProficiency = "beginner";
          } else if (answerLower.includes('intermediate') || answerLower.includes('some experience')) {
            extractedCurrentProficiency = "intermediate";
          } else if (answerLower.includes('advanced') || answerLower.includes('experienced')) {
            extractedCurrentProficiency = "advanced";
          } else if (answerLower.includes('expert') || answerLower.includes('professional')) {
            extractedCurrentProficiency = "expert";
          }
        }
        
        if (question.toLowerCase().includes('target') || question.toLowerCase().includes('goal')) {
          if (answerLower.includes('beginner') || answerLower.includes('basic')) {
            extractedTargetProficiency = "beginner";
          } else if (answerLower.includes('intermediate')) {
            extractedTargetProficiency = "intermediate";
          } else if (answerLower.includes('advanced')) {
            extractedTargetProficiency = "advanced";
          } else if (answerLower.includes('expert') || answerLower.includes('professional')) {
            extractedTargetProficiency = "expert";
          }
        }
      });

      setCurrentProficiency(extractedCurrentProficiency);
      setTargetProficiency(extractedTargetProficiency);

      // Update description with clarification responses
      const enhancedDescription = description + "\n\nAdditional Context:\n" + 
        Object.entries(clarificationResponses)
          .map(([q, a]) => `${q}: ${a}`)
          .join('\n');
      
      setDescription(enhancedDescription);

      // Check if this is an educational task
      const isEducational = detectedTaskType === "skill_learning" || detectedTaskType === "exam_preparation";

      if (isEducational) {
        // Generate learning plan
        const plan = await generateLearningPlan(title, enhancedDescription, clarificationResponses);
        if (plan && plan.subtasks && plan.subtasks.length > 0) {
          setLearningPlan(plan);
          setSubtasks(plan.subtasks);
          setShowLearningPlan(true);
        } else {
          // Fallback to enhanced subtasks
          const enhancedSubtasks = await generateEnhancedSubtasks(
            title, 
            enhancedDescription, 
            clarificationResponses, 
            dueDate, 
            detectedTaskType || undefined,
            extractedCurrentProficiency,
            extractedTargetProficiency
          );
          setSubtasks(enhancedSubtasks);
          const { availableDays } = calculateTimeConstraint(dueDate);
          const contextMessage = getTaskTypeMessage(detectedTaskType || "general", enhancedSubtasks.length, availableDays, extractedCurrentProficiency, extractedTargetProficiency);
          Alert.alert("Personalized Plan Created", contextMessage);
        }
      } else {
        // Generate enhanced subtasks
        const enhancedSubtasks = await generateEnhancedSubtasks(
          title, 
          enhancedDescription, 
          clarificationResponses, 
          dueDate, 
          detectedTaskType || undefined,
          extractedCurrentProficiency,
          extractedTargetProficiency
        );
        setSubtasks(enhancedSubtasks);
        const { availableDays } = calculateTimeConstraint(dueDate);
        Alert.alert(
          "Personalized Plan Created",
          `Generated ${enhancedSubtasks.length} customized subtasks based on your responses.${availableDays > 0 ? ` Optimized for your ${availableDays}-day timeline.` : ""} Review and adjust time estimates as needed.`
        );
      }
    } catch (error) {
      console.error("Personalization complete error:", error);
      Alert.alert("Error", "Failed to generate personalized plan. Please try again later.");
    } finally {
      setIsGeneratingSubtasks(false);
      setClarificationResponses({});
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
          } catch (schedulingError) {
            console.error("Auto-scheduling error:", schedulingError);
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
      console.error("Save task error:", error);
      Alert.alert("Error", "Failed to save task. Please try again.");
    } finally {
      setIsEstimatingDuration(false);
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
      case "review":
        return "#6366F1"; // Indigo
      default:
        return Colors.light.subtext;
    }
  };

  const getPhaseLabel = (phase?: string) => {
    switch (phase) {
      case "knowledge":
        return "Knowledge";
      case "practice":
        return "Practice";
      case "application":
        return "Application";
      case "reflection":
        return "Reflection";
      case "output":
        return "Output";
      case "review":
        return "Review";
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
      case "review":
        return "🔄";
      default:
        return "📋";
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
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to accomplish?"
            placeholderTextColor={Colors.light.subtext}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about this task..."
            placeholderTextColor={Colors.light.subtext}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Task Type Detection Display */}
        {detectedTaskType && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>AI Detected Task Type</Text>
            <View style={styles.detectedTypeContainer}>
              <View style={[
                styles.detectedTypeBadge,
                { backgroundColor: Colors.light.primary }
              ]}>
                <Text style={styles.detectedTypeIcon}>{getTaskTypeIcon(detectedTaskType)}</Text>
                <Text style={styles.detectedTypeText}>
                  {getTaskTypeLabel(detectedTaskType)}
                </Text>
              </View>
              <Text style={styles.detectedTypeDescription}>
                {getTaskTypeDescription(detectedTaskType)}
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
                <Text style={styles.qualityAlertTitle}>Help Us Personalize Your Plan</Text>
              </View>
              
              <Text style={styles.qualityAlertMessage}>
                To generate the most effective subtasks with dynamic range calculation, we need a bit more information. Your current input could be improved:
              </Text>
              
              <View style={styles.qualityIssuesList}>
                {qualityIssues.map((issue, index) => (
                  <Text key={index} style={styles.qualityIssueItem}>• {issue}</Text>
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
            placeholder="Select due date for dynamic range calculation"
            minDate={new Date()}
          />
          {dueDate && (
            <View style={styles.timeConstraintInfo}>
              <Text style={styles.timeConstraintText}>
                {calculateTimeConstraint(dueDate).timeContext}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
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
                Low
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
                Medium
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
                High
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Difficulty</Text>
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
                Easy
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
                Medium
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
                Hard
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
            </>
          )}
          
          {subtasks.map((subtask) => (
            <View key={subtask.id} style={styles.subtaskCard}>
              <View style={styles.subtaskContent}>
                <View style={styles.subtaskHeader}>
                  {subtask.title && (
                    <Text style={styles.subtaskTitle}>
                      {getPhaseIcon(subtask.phase)} {subtask.title}
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
                      <View key={index} style={styles.resourceItem}>
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
                      { backgroundColor: getPhaseColor(subtask.phase) }
                    ]}>
                      <Text style={styles.phaseBadgeText}>
                        {getPhaseLabel(subtask.phase)}
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
              placeholder="Add a subtask..."
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
                  Detected: {getTaskTypeIcon(detectedTaskType)} {getTaskTypeLabel(detectedTaskType)}
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
                        key={optionIndex}
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
              Your Personalized {getTaskTypeLabel(learningPlan?.taskType)} Plan
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
                    <Text key={index} style={styles.planItem}>• {tool}</Text>
                  ))}
                </View>
                
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Progress Checkpoints</Text>
                  {learningPlan.checkpoints.map((checkpoint, index) => (
                    <Text key={index} style={styles.planItem}>• {checkpoint}</Text>
                  ))}
                </View>

                {learningPlan.skillBreakdown && learningPlan.skillBreakdown.length > 0 && (
                  <View style={styles.planSection}>
                    <Text style={styles.planSectionTitle}>Skill Development Plan</Text>
                    {learningPlan.skillBreakdown.map((skill, index) => (
                      <View key={index} style={styles.skillItem}>
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
                      <Text key={index} style={styles.phaseItem}>{phase}</Text>
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
});