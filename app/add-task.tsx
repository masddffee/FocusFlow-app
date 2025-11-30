import { useState, useEffect, useCallback, useRef } from "react";
import {
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
import { Save, Zap, Brain } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Button from "@/components/Button";
import { addTaskStyles as styles } from "./add-task.styles";
import PersonalizationModal from "@/components/task-creation/PersonalizationModal";
import LearningPlanModal from "@/components/task-creation/LearningPlanModal";
import QualityAlert from "@/components/task-creation/QualityAlert";
import TaskBasicForm from "@/components/task-creation/TaskBasicForm";
import TaskSettings from "@/components/task-creation/TaskSettings";
import SubtaskDisplay from "@/components/task-creation/SubtaskDisplay";
import { useTaskStore } from "@/store/taskStore";
import { useTaskCreationStore } from "@/store/useTaskCreationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { getTaskTypeLabel } from "@/utils/taskCreation";
import { useTaskSubmission } from "@/hooks/useTaskSubmission";
import { calculateTimeConstraint } from "@/utils/taskCreation";
import { generateUnifiedLearningPlan } from "@/utils/api";
import { log } from "@/lib/logger";

export default function AddTaskScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const taskId = params.id;

  // Use Global Store
  const {
    title, setTitle,
    description, setDescription,
    dueDate, setDueDate,
    difficulty, setDifficulty,
    priority, setPriority,
    subtasks, setSubtasks,
    newSubtask, setNewSubtask,
    autoSchedule, setAutoSchedule,
    schedulingMode, setSchedulingMode,
    startNextDay, setStartNextDay,

    // Workflow
    showQualityAlert, setShowQualityAlert,
    qualityIssues, setQualityIssues,
    showPersonalizationModal, setShowPersonalizationModal,
    clarifyingQuestions, setClarifyingQuestions,
    clarificationResponses, setClarificationResponses,
    isAnalyzing, setIsAnalyzing,
    isGeneratingSubtasks, setIsGeneratingSubtasks,
    isEstimatingDuration, setIsEstimatingDuration,
    learningPlan, setLearningPlan,
    showLearningPlan, setShowLearningPlan,
    detectedTaskType, setDetectedTaskType,

    // Proficiency
    currentProficiency, setCurrentProficiency,
    targetProficiency, setTargetProficiency,

    // UI
    editingSubtaskId, setEditingSubtaskId,
    resetForm, resetGenerationState
  } = useTaskCreationStore();

  const { tasks, addTask, updateTask, scheduledTasks, addScheduledTask } = useTaskStore();
  const { availableTimeSlots, autoSchedulingEnabled } = useSettingsStore();

  // Fix Bug 5: Remove tasks dependency to avoid race condition
  // Only load task data once when taskId changes, not every time tasks array updates
  const hasLoadedTask = useRef(false);

  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && !hasLoadedTask.current) {
        setTitle(task.title);
        setDescription(task.description || "");
        setDueDate(task.dueDate || "");
        setDifficulty(task.difficulty || "");
        setPriority(task.priority || "");
        setSubtasks(task.subtasks || []);
        setDetectedTaskType(task.taskType || undefined);
        setCurrentProficiency(task.currentProficiency || "beginner");
        setTargetProficiency(task.targetProficiency || "intermediate");
        hasLoadedTask.current = true;
      }
    } else {
      resetForm();
      hasLoadedTask.current = false;
    }
  }, [taskId]); // Removed 'tasks' dependency

  // Fix Bug 6: Add useCallback optimization to prevent unnecessary re-renders
  const handlePersonalizationResponse = useCallback((questionId: string, response: string) => {
    setClarificationResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  }, []); // No dependencies needed since we use functional update

  const {
    handleSmartGenerate,
    handleSave,
    generateSubtasksDirectly,
    handlePersonalizationComplete,
    handleLearningPlanComplete,
    handleQualityAlertContinue,
    handleQualityAlertSkip
  } = useTaskSubmission(taskId);

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
        <TaskBasicForm />

        <TaskSettings />

        {/* Quality Alert */}
        <QualityAlert
          onContinue={handleQualityAlertContinue}
          onImprove={() => setShowQualityAlert(false)}
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

          <SubtaskDisplay />
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
        onComplete={handlePersonalizationComplete}
      />

      {/* Learning Plan Modal */}
      <LearningPlanModal
        onAccept={handleLearningPlanComplete}
      />
    </KeyboardAvoidingView>
  );
}



