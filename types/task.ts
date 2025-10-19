export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskCategory = "work" | "study" | "personal" | "health" | "other";
export type LearningPhase = "knowledge" | "practice" | "application" | "reflection" | "output" | "review";
export type ProficiencyLevel = "complete_beginner" | "beginner" | "intermediate" | "advanced" | "expert";
export type LearningPace = "relaxed" | "moderate" | "intensive" | "accelerated" | "emergency";
export type ReviewStatus = "not_started" | "learning" | "review" | "mastered";

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  scheduledTime?: string; // Format: "HH:MM"
  scheduledEndTime?: string; // Format: "HH:MM"
  duration?: number; // in minutes
  difficulty?: TaskDifficulty;
  category?: TaskCategory;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  subtasks?: EnhancedSubtask[];
  priority?: "low" | "medium" | "high";
  tags?: string[];
  learningPlan?: LearningPlan;
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  currentProficiency?: ProficiencyLevel;
  targetProficiency?: ProficiencyLevel;
  learningPace?: LearningPace;
  reviewSchedule?: ReviewSchedule;
}

export interface ReviewSchedule {
  enabled: boolean;
  nextReviewDate?: string;
  reviewInterval: number; // days
  reviewCount: number;
  lastReviewDate?: string;
  masteryLevel: number; // 0-100, affects review frequency
}

export interface SpacedRepetitionData {
  easeFactor: number; // 2.5 default, affects interval growth
  interval: number; // days until next review
  repetitions: number; // number of successful reviews
  nextReviewDate: string;
  lastReviewDate?: string;
  reviewQuality?: number; // 0-5, user's self-assessment of recall quality
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  type: "text" | "choice" | "scale" | "diagnostic_test";
  options?: string[]; // For choice type questions
  required: boolean;
  category?: "goal" | "level" | "method" | "timeline" | "resources" | "context" | "proficiency";
  // 🆕 透明度提升字段
  rationale?: string; // 解釋為何提出這個問題的原因
}

export interface TaskClarification {
  taskTitle: string;
  taskDescription?: string;
  questions: ClarifyingQuestion[];
  responses: Record<string, string>;
}

export interface EnhancedSubtask {
  id: string;
  title?: string; // Enhanced: specific, goal-focused title with action verb
  text: string; // Detailed description specifying exact topics, chapters, problem types, or activities
  howToStart?: string; // 🆕 Specific first action to begin this subtask
  successCriteria?: string; // 🆕 Clear completion indicators
  nextSteps?: string; // 🆕 What to do after completing this subtask
  estimatedDuration?: number; // in minutes (deprecated, use aiEstimatedDuration)
  userEstimatedDuration?: number; // user's manual override
  aiEstimatedDuration?: number; // AI's suggestion based on complexity and depth
  difficulty?: TaskDifficulty; // Easy (25%), Medium (50%), Hard (25%)
  order: number; // Sequence order within the learning progression
  category?: string;
  completed: boolean;
  completedAt?: string; // ISO date when completed
  
  // 🆕 進度追蹤功能
  timeSpent?: number; // 已投入的時間（分鐘）
  remainingTime?: number; // 剩餘時間（分鐘），若未設定則計算 totalDuration - timeSpent
  totalDuration?: number; // 總時長（分鐘），優先使用 userEstimatedDuration 或 aiEstimatedDuration
  progressPercentage?: number; // 完成百分比 (0-100)
  lastSessionTime?: number; // 上次學習時長（分鐘）
  sessionHistory?: {
    date: string;
    duration: number; // 該次學習時長（分鐘）
    notes?: string;
    // 🆕 增強會話資訊
    segmentInfo?: {
      segmentIndex: number;
      totalSegments: number;
      isSegmented: boolean;
    };
  }[];
  // 🆕 時間片段歷史記錄
  segmentHistory?: {
    segmentIndex: number;
    totalSegments: number;
    duration: number;
    completedAt: string;
    notes: string;
  }[];
  lastStudiedAt?: string; // 最後學習時間
  studyNotes?: string[]; // 學習筆記記錄
  
  // 🆕 時間切割支援
  canBeSplit?: boolean; // 是否可以被切割成多個時段
  minSessionDuration?: number; // 最小學習時段（分鐘），預設 25 分鐘
  maxSessionDuration?: number; // 最大學習時段（分鐘），預設 120 分鐘
  scheduledSegments?: SubtaskSegment[]; // 已排程的時間片段
  
  // 🆕 學習統計和效率分析
  learningStats?: {
    totalSessions: number;
    averageSessionDuration: number;
    learningEfficiency: number; // 0.5-1.2 範圍，1.0 為標準效率
    lastUpdated: string;
  };
  
  skills?: string[]; // Specific skills this subtask develops/requires
  resources?: string[]; // Recommended resources (deprecated, use recommendedResources)
  recommendedResources?: string[]; // Enhanced: specific, high-quality resources like textbook chapters, online courses, tools
  prerequisites?: string[]; // Other subtasks that should be completed first (logical dependencies)
  phase?: LearningPhase; // Which learning phase this subtask belongs to (knowledge, practice, application, reflection, output, review)
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  proficiencyLevel?: ProficiencyLevel; // Required proficiency level for this subtask
  targetProficiency?: ProficiencyLevel; // Proficiency level this subtask helps achieve
  learningPace?: LearningPace; // Pace at which this subtask should be completed
  reviewStatus?: ReviewStatus; // Current review status
  spacedRepetition?: SpacedRepetitionData; // Spaced repetition scheduling data
  isReviewTask?: boolean; // True if this is a generated review task
  originalSubtaskId?: string; // Reference to original subtask if this is a review
  reviewType?: "recall" | "practice" | "application" | "synthesis"; // Type of review
}

// 🆕 子任務時間片段接口
export interface SubtaskSegment {
  id: string;
  subtaskId: string;
  segmentIndex: number; // 片段序號（從 1 開始）
  totalSegments: number; // 總片段數
  duration: number; // 該片段時長（分鐘）
  scheduledDate: string; // 排程日期
  timeSlot: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
  completed: boolean;
  completedAt?: string;
  actualDuration?: number; // 實際學習時長（分鐘）
}

export interface LearningPlan {
  achievableGoal: string; // Single focused goal achievable within timeframe (depth over breadth)
  recommendedTools: string[]; // Specific tools, platforms, software, resources
  checkpoints: string[]; // Measurable milestones to track progress and maintain motivation
  subtasks?: EnhancedSubtask[]; // Optional: 30-50 detailed subtasks following 5-phase methodology
  skillBreakdown?: {
    skill: string; // Specific skill name
    currentLevel: ProficiencyLevel; // Current proficiency level
    targetLevel: ProficiencyLevel; // Target proficiency level
    subtasks?: string[]; // Related subtask IDs
  }[];
  estimatedTimeToCompletion?: number; // in hours (realistic 100-3000+ hours for mastery)
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  phaseDistribution?: {
    knowledge: number; // 20% - 6-10 tasks
    practice: number; // 40% - 12-20 tasks
    application: number; // 25% - 8-12 tasks
    reflection: number; // 10% - 3-5 tasks
    output: number; // 5% - 1-2 tasks
    review: number; // Variable based on spaced repetition needs
  };
  currentProficiency?: ProficiencyLevel;
  targetProficiency?: ProficiencyLevel;
  learningPace?: LearningPace;
  timeConstraint?: "urgent" | "moderate" | "extended" | "none";
  proficiencyGap?: "minimal" | "moderate" | "significant" | "major";
  reviewSchedule?: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
    reviewPercentage: number; // Percentage of completed subtasks to review
  };
}

export interface TaskAnalysis {
  needsClarification: boolean;
  isEducational: boolean;
  taskType: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  complexity: "simple" | "moderate" | "complex";
  estimatedDuration: number;
  suggestedBreakdown: string[];
  questions?: ClarifyingQuestion[];
  currentProficiency?: ProficiencyLevel;
  targetProficiency?: ProficiencyLevel;
  proficiencyGap?: "minimal" | "moderate" | "significant" | "major";
  recommendedPace?: LearningPace;
}

export interface SubtaskEstimation {
  subtaskId: string;
  aiEstimate: number;
  confidence: "low" | "medium" | "high";
  factors: string[]; // Factors that influenced the estimate
  alternatives?: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

export interface InputQualityEvaluation {
  isSufficient: boolean;
  reasons?: string[];
  suggestedImprovements?: string[]; // Specific suggestions for improvement
}

export interface LearningSession {
  id: string;
  taskId: string;
  taskTitle: string;
  duration: number; // in seconds
  summary: string;
  questions: Array<{ question: string; answer: string }>;
  completedAt: string;
  notes: string; // Markdown formatted notes
  subtasksCompleted?: string[]; // IDs of subtasks completed during this session
  phase?: LearningPhase; // Which learning phase this session focused on
  reviewQuality?: number; // 0-5, for spaced repetition algorithm
}

// Enhanced subtask generation context
export interface SubtaskGenerationContext {
  title: string;
  description: string;
  dueDate?: string;
  availableDays?: number;
  clarificationResponses?: Record<string, string>;
  taskType?: "exam_preparation" | "skill_learning" | "project_completion" | "habit_building" | "challenge" | "general";
  currentLevel?: ProficiencyLevel;
  targetLevel?: ProficiencyLevel;
  timeConstraint?: "urgent" | "moderate" | "extended" | "none";
  focusAreas?: string[]; // Specific topics or skills to emphasize
  learningPace?: LearningPace;
  proficiencyGap?: "minimal" | "moderate" | "significant" | "major";
}

// Phase-specific subtask requirements
export interface PhaseRequirements {
  knowledge: {
    startWithDiagnostic: boolean;
    includeResourceGathering: boolean;
    foundationalConcepts: boolean;
    prerequisiteVerification: boolean;
  };
  practice: {
    progressiveDifficulty: boolean;
    skillBuilding: boolean;
    errorAnalysis: boolean;
    timedPractice: boolean;
  };
  application: {
    realWorldProjects: boolean;
    practicalImplementation: boolean;
    creativeApplication: boolean;
    collaboration: boolean;
  };
  reflection: {
    selfAssessment: boolean;
    spacedRepetition: boolean;
    peerFeedback: boolean;
    metacognition: boolean;
  };
  output: {
    examSimulation?: boolean; // For exam preparation
    portfolioCreation?: boolean; // For skill learning
    projectDelivery?: boolean; // For project completion
    habitTracking?: boolean; // For habit building
    challengeCompletion?: boolean; // For challenges
    knowledgeSharing: boolean;
    professionalValidation: boolean;
  };
  review: {
    spacedRepetition: boolean;
    activeRecall: boolean;
    interleaving: boolean;
    elaborativeInterrogation: boolean;
  };
}

export interface DynamicRangeCalculation {
  currentProficiency: ProficiencyLevel;
  targetProficiency: ProficiencyLevel;
  availableDays: number;
  proficiencyGap: "minimal" | "moderate" | "significant" | "major";
  recommendedPace: LearningPace;
  subtaskCount: {
    minimum: number;
    optimal: number;
    maximum: number;
  };
  difficultyDistribution: {
    easy: number; // percentage
    medium: number; // percentage
    hard: number; // percentage
  };
  phaseAdjustments: {
    knowledge: number; // percentage adjustment from default
    practice: number;
    application: number;
    reflection: number;
    output: number;
    review: number; // new phase for spaced repetition
  };
  timeAllocation: {
    dailyHours: number;
    weeklyHours: number;
    totalHours: number;
  };
  priorityFocus: string[]; // High-priority topics to emphasize
  skipTopics?: string[]; // Topics to skip due to time constraints
  reviewStrategy: {
    enabled: boolean;
    initialInterval: number; // days
    maxInterval: number; // days
    reviewPercentage: number; // percentage of completed tasks to review
  };
}

export interface ReviewTask {
  id: string;
  originalSubtaskId: string;
  title: string;
  description: string;
  reviewType: "recall" | "practice" | "application" | "synthesis";
  scheduledDate: string;
  difficulty: TaskDifficulty;
  estimatedDuration: number;
  completed: boolean;
  reviewQuality?: number; // 0-5 rating from user
}