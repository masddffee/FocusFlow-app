import { Alert } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "@/store/taskStore";
import { useTaskCreationStore } from "@/store/useTaskCreationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TaskDifficulty, ProficiencyLevel } from "@/types/task";
import {
    generateEnhancedSubtasks as backendGenerateSubtasks,
    generateUnifiedLearningPlan,
    estimateTaskDuration
} from "@/utils/api";
import {
    findAvailableTimeSlot,
    scheduleSubtasks,
    convertSubtaskSchedulesToTasks,
    analyzeSchedulingFeasibility,
    generateSchedulingSuggestions
} from "@/utils/scheduling";
import { calculateDaysUntil } from "@/utils/timeUtils";
import { calculateTimeConstraint, getTaskTypeMessage } from "@/utils/taskCreation";
import { log } from "@/lib/logger";

export const useTaskSubmission = (taskId?: string) => {
    const { t } = useTranslation();

    const {
        title, description, dueDate, difficulty, priority,
        subtasks, setSubtasks,
        autoSchedule,
        detectedTaskType,
        currentProficiency, targetProficiency,
        learningPlan, setLearningPlan, setShowLearningPlan,
        clarificationResponses, clarifyingQuestions, setClarifyingQuestions, setShowPersonalizationModal,
        showQualityAlert, setShowQualityAlert,
        isAnalyzing, setIsAnalyzing,
        isGeneratingSubtasks, setIsGeneratingSubtasks,
        isEstimatingDuration, setIsEstimatingDuration,
        resetGenerationState
    } = useTaskCreationStore();

    const { addTask, updateTask, scheduledTasks, addScheduledTask } = useTaskStore();
    const { availableTimeSlots, autoSchedulingEnabled } = useSettingsStore();

    // Helper: Process direct generation result
    const processDirectGenerationResult = (result: any) => {
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
    };

    // Helper: Generate unified plan without personalization
    const generateDirectUnifiedPlan = async () => {
        const currentLanguage = useSettingsStore.getState().language;
        const result = await generateUnifiedLearningPlan({
            title: title.trim(),
            description: description.trim(),
            language: currentLanguage,
            taskType: detectedTaskType || 'skill_learning',
            currentProficiency: currentProficiency,
            targetProficiency: targetProficiency,
            clarificationResponses: {}
        });
        processDirectGenerationResult(result);
    };

    const handleSmartGenerate = async () => {
        if (!title.trim()) {
            Alert.alert(t('errors.required'), t('addTask.taskTitlePlaceholder'));
            return;
        }

        resetGenerationState();

        try {
            log.info("🚀 Using unified learning plan generation...");
            const currentLanguage = useSettingsStore.getState().language;

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
                await generateDirectUnifiedPlan();
            }
        } catch (error) {
            log.error("❌ Unified learning plan generation failed:", error);
            Alert.alert("❌ 錯誤", "無法生成學習計劃。請檢查網路連接或稍後再試。");
        } finally {
            setIsAnalyzing(false);
            setIsGeneratingSubtasks(false);
        }
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

    // Helper: Calculate total duration from subtasks or estimate
    const calculateTotalDuration = async (): Promise<number> => {
        if (subtasks.length > 0) {
            const total = subtasks.reduce((sum, subtask) => {
                return sum + (subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60);
            }, 0);
            return Math.round(total * 1.1); // Add 10% buffer
        }

        try {
            return await estimateTaskDuration(title, description, difficulty as string, subtasks);
        } catch (error) {
            log.error("Duration estimation failed:", error);
            return 60; // Default to 1 hour
        }
    };

    // Helper: Prepare task data object
    const prepareTaskData = (totalDuration: number) => {
        return {
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
    };

    // Helper: Handle auto-scheduling logic (extracted to avoid nested try-catch issues)
    const handleAutoScheduling = async (
        newTaskId: string,
        newTask: any,
        totalDuration: number,
        currentSubtasks: any[],
        currentDueDate: string,
        currentAvailableTimeSlots: any,
        currentScheduledTasks: any[]
    ): Promise<void> => {
        if (currentSubtasks.length > 0) {
            // 🆕 排程前可行性分析
            const feasibilityAnalysis = analyzeSchedulingFeasibility(
                { ...newTask, subtasks: currentSubtasks },
                currentAvailableTimeSlots,
                currentScheduledTasks,
                [], // Calendar events
                {
                    startDate: new Date(),
                    maxDaysToSearch: currentDueDate ? Math.max(30, calculateDaysUntil(currentDueDate)) : 90,
                    bufferBetweenSubtasks: 5,
                    respectPhaseOrder: false,
                    dailyMaxHours: null,
                }
            );

            // 🆕 生成智能建議
            const suggestions = generateSchedulingSuggestions(feasibilityAnalysis, { ...newTask, subtasks: currentSubtasks });

            if (!suggestions.shouldProceed) {
                return new Promise<void>((resolve) => {
                    Alert.alert(
                        "⚠️ 自動排程分析",
                        suggestions.userMessage,
                        [
                            {
                                text: "手動調整後重試",
                                style: "cancel",
                                onPress: () => resolve()
                            },
                            {
                                text: "仍要建立任務",
                                onPress: () => {
                                    Alert.alert(
                                        "任務已建立",
                                        "任務已成功建立，但未啟用自動排程。您可以稍後手動安排時間或調整設置後重新排程。",
                                        [{ text: "了解", onPress: () => { router.back(); resolve(); } }]
                                    );
                                }
                            }
                        ]
                    );
                });
            }

            // 🔧 修復：使用簡化的排程邏輯
            const schedulingResult = scheduleSubtasks(
                currentSubtasks,
                currentAvailableTimeSlots,
                currentScheduledTasks,
                [], // Calendar events
                {
                    startDate: new Date(),
                    startNextDay: true,
                    maxDaysToSearch: currentDueDate ? Math.max(14, calculateDaysUntil(currentDueDate)) : 14
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

                const { availableDays } = calculateTimeConstraint(currentDueDate);
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

                    if (schedulingResult.completionDate && currentDueDate) {
                        const completionDate = new Date(schedulingResult.completionDate);
                        const dueDateObj = new Date(currentDueDate);
                        const daysBeforeDue = Math.ceil((dueDateObj.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysBeforeDue > 0) {
                            alertMessage += `\nAll subtasks will be completed ${daysBeforeDue} days before the due date.`;
                        }
                    }
                }

                return new Promise<void>((resolve) => {
                    Alert.alert(
                        "任務已建立並自動排程",
                        `${alertMessage}`,
                        [{ text: "太好了！", onPress: () => { router.back(); resolve(); } }]
                    );
                });
            } else {
                // 🔧 簡化：排程失敗處理
                return new Promise<void>((resolve) => {
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
                                        [{ text: "了解", onPress: () => { router.back(); resolve(); } }]
                                    );
                                }
                            }
                        ]
                    );
                });
            }
        } else {
            // No subtasks, schedule the whole task
            const scheduledTask = findAvailableTimeSlot(
                { ...newTask, duration: totalDuration },
                currentAvailableTimeSlots,
                currentScheduledTasks
            );

            if (scheduledTask) {
                addScheduledTask(scheduledTask);
                const { availableDays } = calculateTimeConstraint(currentDueDate);
                const timeConstraintNote = availableDays > 0 && availableDays <= 7
                    ? ` Given your ${availableDays}-day deadline, this scheduling prioritizes urgent completion.`
                    : "";
                return new Promise<void>((resolve) => {
                    Alert.alert(
                        "Task Created & Scheduled",
                        `Your task has been created and automatically scheduled for ${scheduledTask.date} at ${scheduledTask.timeSlot.start} (${totalDuration} minutes).${timeConstraintNote}`,
                        [{ text: "Great!", onPress: () => { router.back(); resolve(); } }]
                    );
                });
            } else {
                return new Promise<void>((resolve) => {
                    Alert.alert(
                        "Task Created",
                        `Task created successfully with estimated duration of ${totalDuration} minutes. Could not find an available time slot automatically. You can schedule it manually from the tasks screen.`,
                        [{ text: "OK", onPress: () => { router.back(); resolve(); } }]
                    );
                });
            }
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Error", "Task title is required");
            return;
        }

        if (isEstimatingDuration) return; // Prevent multiple saves

        setIsEstimatingDuration(true);

        try {
            const totalDuration = await calculateTotalDuration();
            const taskData = prepareTaskData(totalDuration);

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
                    // Use extracted helper function to avoid nested try-catch issues
                    await handleAutoScheduling(
                        newTaskId,
                        newTask,
                        totalDuration,
                        subtasks,
                        dueDate,
                        availableTimeSlots,
                        scheduledTasks
                    );
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
        // Note: getTaskTypeLabel is not imported here, need to import it or move it to utils
        // For now, let's assume it's available or we can just use the type string
        const planType = learningPlan?.taskType || "Learning";
        const { availableDays } = calculateTimeConstraint(dueDate);
        Alert.alert(
            `${planType} Plan Applied`,
            `Generated ${subtasks.length} specific subtasks based on your personalized ${planType.toLowerCase()} plan.${availableDays > 0 ? ` Optimized for your ${availableDays}-day timeline.` : ""} You can edit durations and add more subtasks as needed.`
        );
    };

    return {
        handleSmartGenerate,
        handleSave,
        generateSubtasksDirectly,
        handlePersonalizationComplete,
        handleLearningPlanComplete,
        handleQualityAlertContinue,
        handleQualityAlertSkip
    };
};
