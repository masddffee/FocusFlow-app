import { create } from 'zustand';
import { TaskDifficulty, ClarifyingQuestion, EnhancedSubtask, LearningPlan, ProficiencyLevel } from '@/types/task';

interface TaskCreationState {
    // Basic Info
    title: string;
    description: string;

    // Task Settings
    dueDate: string;
    difficulty: TaskDifficulty | "";
    priority: "low" | "medium" | "high" | "";
    autoSchedule: boolean;
    schedulingMode: "balanced" | "focused" | "flexible";
    startNextDay: boolean;
    showSchedulingOptions: boolean;

    // Subtasks
    subtasks: EnhancedSubtask[];
    newSubtask: string;
    editingSubtaskId: string | null;

    // AI & Workflow States
    isAnalyzing: boolean;
    isGeneratingSubtasks: boolean;
    isEstimatingDuration: boolean;

    // Personalization & Learning Plan
    showPersonalizationModal: boolean;
    clarifyingQuestions: ClarifyingQuestion[];
    clarificationResponses: Record<string, string>;
    learningPlan: LearningPlan | null;
    showLearningPlan: boolean;
    detectedTaskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general" | undefined;

    // Proficiency
    currentProficiency: ProficiencyLevel;
    targetProficiency: ProficiencyLevel;

    // Quality Alert
    showQualityAlert: boolean;
    qualityIssues: string[];

    // AI Transparency
    diagnosticInsight: string | null;
    questioningStrategy: string | null;
    sufficiencyReasoning: string | null;

    // Actions
    setTitle: (title: string) => void;
    setDescription: (description: string) => void;
    setDueDate: (date: string) => void;
    setDifficulty: (difficulty: TaskDifficulty | "") => void;
    setPriority: (priority: "low" | "medium" | "high" | "") => void;
    setAutoSchedule: (auto: boolean) => void;
    setSchedulingMode: (mode: "balanced" | "focused" | "flexible") => void;
    setStartNextDay: (start: boolean) => void;
    setShowSchedulingOptions: (show: boolean) => void;

    setSubtasks: (subtasks: EnhancedSubtask[]) => void;
    setNewSubtask: (text: string) => void;
    setEditingSubtaskId: (id: string | null) => void;

    setIsAnalyzing: (isAnalyzing: boolean) => void;
    setIsGeneratingSubtasks: (isGenerating: boolean) => void;
    setIsEstimatingDuration: (isEstimating: boolean) => void;

    setShowPersonalizationModal: (show: boolean) => void;
    setClarifyingQuestions: (questions: ClarifyingQuestion[]) => void;
    setClarificationResponses: (responses: Record<string, string>) => void;
    setLearningPlan: (plan: LearningPlan | null) => void;
    setShowLearningPlan: (show: boolean) => void;
    setDetectedTaskType: (type: any) => void;

    setCurrentProficiency: (currentProficiency: ProficiencyLevel) => void;
    setTargetProficiency: (targetProficiency: ProficiencyLevel) => void;

    setShowQualityAlert: (showQualityAlert: boolean) => void;
    setQualityIssues: (qualityIssues: string[]) => void;

    setAiTransparency: (data: { diagnosticInsight?: string; questioningStrategy?: string; sufficiencyReasoning?: string }) => void;

    resetGenerationState: () => void;
    resetForm: () => void;
}

export const useTaskCreationStore = create<TaskCreationState>((set) => ({
    // Initial State
    title: '',
    description: '',
    dueDate: '',
    difficulty: '',
    priority: '',
    autoSchedule: true,
    schedulingMode: 'balanced',
    startNextDay: false,
    showSchedulingOptions: false,
    subtasks: [],
    newSubtask: '',
    editingSubtaskId: null,
    isAnalyzing: false,
    isGeneratingSubtasks: false,
    isEstimatingDuration: false,
    showPersonalizationModal: false,
    clarifyingQuestions: [],
    clarificationResponses: {},
    learningPlan: null,
    showLearningPlan: false,
    detectedTaskType: undefined,
    currentProficiency: 'beginner',
    targetProficiency: 'intermediate',
    showQualityAlert: false,
    qualityIssues: [],
    diagnosticInsight: null,
    questioningStrategy: null,
    sufficiencyReasoning: null,

    // Actions
    setTitle: (title) => set({ title }),
    setDescription: (description) => set({ description }),
    setDueDate: (dueDate) => set({ dueDate }),
    setDifficulty: (difficulty) => set({ difficulty }),
    setPriority: (priority) => set({ priority }),
    setAutoSchedule: (autoSchedule) => set({ autoSchedule }),
    setSchedulingMode: (schedulingMode) => set({ schedulingMode }),
    setStartNextDay: (startNextDay) => set({ startNextDay }),
    setShowSchedulingOptions: (showSchedulingOptions) => set({ showSchedulingOptions }),

    setSubtasks: (subtasks) => set({ subtasks }),
    setNewSubtask: (newSubtask) => set({ newSubtask }),
    setEditingSubtaskId: (editingSubtaskId) => set({ editingSubtaskId }),

    setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
    setIsGeneratingSubtasks: (isGeneratingSubtasks) => set({ isGeneratingSubtasks }),
    setIsEstimatingDuration: (isEstimatingDuration) => set({ isEstimatingDuration }),

    setShowPersonalizationModal: (showPersonalizationModal) => set({ showPersonalizationModal }),
    setClarifyingQuestions: (clarifyingQuestions) => set({ clarifyingQuestions }),
    setClarificationResponses: (clarificationResponses) => set({ clarificationResponses }),
    setLearningPlan: (learningPlan) => set({ learningPlan }),
    setShowLearningPlan: (showLearningPlan) => set({ showLearningPlan }),
    setDetectedTaskType: (detectedTaskType) => set({ detectedTaskType }),

    setCurrentProficiency: (currentProficiency) => set({ currentProficiency }),
    setTargetProficiency: (targetProficiency) => set({ targetProficiency }),

    setShowQualityAlert: (showQualityAlert) => set({ showQualityAlert }),
    setQualityIssues: (qualityIssues) => set({ qualityIssues }),

    setAiTransparency: (data) => set((state) => ({
        diagnosticInsight: data.diagnosticInsight ?? state.diagnosticInsight,
        questioningStrategy: data.questioningStrategy ?? state.questioningStrategy,
        sufficiencyReasoning: data.sufficiencyReasoning ?? state.sufficiencyReasoning
    })),

    resetGenerationState: () => set({
        isAnalyzing: false,
        isGeneratingSubtasks: false,
        showQualityAlert: false,
        showPersonalizationModal: false,
        learningPlan: null,
        subtasks: [],
        clarifyingQuestions: [],
        clarificationResponses: {},
        diagnosticInsight: null,
        questioningStrategy: null,
        sufficiencyReasoning: null
    }),

    resetForm: () => set({
        title: '',
        description: '',
        dueDate: '',
        difficulty: '',
        priority: '',
        autoSchedule: true,
        schedulingMode: 'balanced',
        startNextDay: false,
        subtasks: [],
        newSubtask: '',
        editingSubtaskId: null,
        isAnalyzing: false,
        isGeneratingSubtasks: false,
        isEstimatingDuration: false,
        showPersonalizationModal: false,
        clarifyingQuestions: [],
        clarificationResponses: {},
        learningPlan: null,
        showLearningPlan: false,
        detectedTaskType: undefined,
        currentProficiency: 'beginner',
        targetProficiency: 'intermediate',
        showQualityAlert: false,
        qualityIssues: [],
        diagnosticInsight: null,
        questioningStrategy: null,
        sufficiencyReasoning: null
    }),
}));
