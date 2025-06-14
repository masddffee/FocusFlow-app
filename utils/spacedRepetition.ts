import { EnhancedSubtask, SpacedRepetitionData, ReviewTask } from "@/types/task";

// SM-2 Algorithm implementation for spaced repetition
// Based on SuperMemo's SM-2 algorithm with modifications for learning tasks

export interface ReviewQuality {
  score: number; // 0-5
  label: string;
  description: string;
}

export const REVIEW_QUALITIES: ReviewQuality[] = [
  { score: 0, label: "Complete blackout", description: "No recall at all" },
  { score: 1, label: "Incorrect", description: "Incorrect response with familiar feeling" },
  { score: 2, label: "Difficult", description: "Correct response with serious difficulty" },
  { score: 3, label: "Hesitant", description: "Correct response with hesitation" },
  { score: 4, label: "Easy", description: "Correct response with some effort" },
  { score: 5, label: "Perfect", description: "Perfect response, effortless recall" },
];

export function initializeSpacedRepetition(): SpacedRepetitionData {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewDate: getNextReviewDate(1),
    reviewQuality: undefined,
  };
}

export function getNextReviewDate(intervalDays: number): string {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate.toISOString().split('T')[0];
}

export function calculateNextReview(
  currentData: SpacedRepetitionData,
  reviewQuality: number
): SpacedRepetitionData {
  let { easeFactor, interval, repetitions } = currentData;
  
  // Update ease factor based on review quality
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - reviewQuality) * (0.08 + (5 - reviewQuality) * 0.02)));
  
  if (reviewQuality < 3) {
    // Poor recall - reset repetitions and use short interval
    repetitions = 0;
    interval = 1;
  } else {
    // Good recall - increase interval
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }
  
  // Cap maximum interval at 365 days (1 year)
  interval = Math.min(interval, 365);
  
  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate: getNextReviewDate(interval),
    lastReviewDate: new Date().toISOString().split('T')[0],
    reviewQuality,
  };
}

export function isReviewDue(subtask: EnhancedSubtask): boolean {
  if (!subtask.spacedRepetition || !subtask.completed) {
    return false;
  }
  
  const today = new Date().toISOString().split('T')[0];
  return subtask.spacedRepetition.nextReviewDate <= today;
}

export function getSubtasksDueForReview(subtasks: EnhancedSubtask[]): EnhancedSubtask[] {
  return subtasks.filter(subtask => 
    subtask.completed && 
    !subtask.isReviewTask && 
    isReviewDue(subtask)
  );
}

export function generateReviewTask(originalSubtask: EnhancedSubtask): ReviewTask {
  const reviewTypes = ["recall", "practice", "application", "synthesis"] as const;
  const reviewType = reviewTypes[Math.floor(Math.random() * reviewTypes.length)];
  
  let title = "";
  let description = "";
  
  switch (reviewType) {
    case "recall":
      title = `Review: ${originalSubtask.title || "Key Concepts"}`;
      description = `Test your recall of key concepts from: ${originalSubtask.text}. Try to remember the main points without looking at your notes first.`;
      break;
    case "practice":
      title = `Practice: ${originalSubtask.title || "Skills Application"}`;
      description = `Practice the skills learned in: ${originalSubtask.text}. Complete similar exercises or problems to reinforce your understanding.`;
      break;
    case "application":
      title = `Apply: ${originalSubtask.title || "Real-world Application"}`;
      description = `Apply concepts from: ${originalSubtask.text} to a new scenario or problem. Think about how you would use this knowledge in practice.`;
      break;
    case "synthesis":
      title = `Synthesize: ${originalSubtask.title || "Connect Concepts"}`;
      description = `Connect and synthesize concepts from: ${originalSubtask.text} with other related topics you've learned. Identify patterns and relationships.`;
      break;
  }
  
  return {
    id: `review_${originalSubtask.id}_${Date.now()}`,
    originalSubtaskId: originalSubtask.id,
    title,
    description,
    reviewType,
    scheduledDate: new Date().toISOString().split('T')[0],
    difficulty: originalSubtask.difficulty || "medium",
    estimatedDuration: Math.max(15, Math.floor((originalSubtask.aiEstimatedDuration || 60) * 0.3)), // 30% of original duration
    completed: false,
  };
}

export function scheduleReviewTasks(
  completedSubtasks: EnhancedSubtask[],
  reviewPercentage: number = 20
): ReviewTask[] {
  const subtasksDueForReview = getSubtasksDueForReview(completedSubtasks);
  
  // Limit to a percentage of completed tasks to avoid overwhelming the user
  const maxReviewTasks = Math.max(1, Math.floor(completedSubtasks.length * (reviewPercentage / 100)));
  const selectedSubtasks = subtasksDueForReview.slice(0, maxReviewTasks);
  
  return selectedSubtasks.map(generateReviewTask);
}

export function updateSubtaskAfterReview(
  subtask: EnhancedSubtask,
  reviewQuality: number
): EnhancedSubtask {
  if (!subtask.spacedRepetition) {
    subtask.spacedRepetition = initializeSpacedRepetition();
  }
  
  const updatedSpacedRepetition = calculateNextReview(subtask.spacedRepetition, reviewQuality);
  
  return {
    ...subtask,
    spacedRepetition: updatedSpacedRepetition,
    reviewStatus: reviewQuality >= 4 ? "mastered" : "review",
  };
}

export function getOptimalReviewTime(): string {
  // Research suggests morning hours are optimal for review
  // Return a time between 8-10 AM
  const hour = 8 + Math.floor(Math.random() * 2);
  const minute = Math.floor(Math.random() * 60);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function calculateMasteryLevel(subtask: EnhancedSubtask): number {
  if (!subtask.spacedRepetition || !subtask.completed) {
    return 0;
  }
  
  const { repetitions, easeFactor, reviewQuality } = subtask.spacedRepetition;
  
  // Calculate mastery based on repetitions, ease factor, and last review quality
  let mastery = 0;
  
  // Base mastery from repetitions (0-50 points)
  mastery += Math.min(50, repetitions * 10);
  
  // Ease factor contribution (0-25 points)
  mastery += Math.min(25, (easeFactor - 1.3) * 20);
  
  // Last review quality contribution (0-25 points)
  if (reviewQuality !== undefined) {
    mastery += (reviewQuality / 5) * 25;
  }
  
  return Math.min(100, Math.max(0, mastery));
}

export function getReviewStatistics(subtasks: EnhancedSubtask[]) {
  const completedSubtasks = subtasks.filter(s => s.completed && !s.isReviewTask);
  const reviewableSubtasks = completedSubtasks.filter(s => s.spacedRepetition);
  const dueForReview = getSubtasksDueForReview(completedSubtasks);
  const masteredSubtasks = reviewableSubtasks.filter(s => calculateMasteryLevel(s) >= 80);
  
  const averageMastery = reviewableSubtasks.length > 0
    ? reviewableSubtasks.reduce((sum, s) => sum + calculateMasteryLevel(s), 0) / reviewableSubtasks.length
    : 0;
  
  return {
    totalSubtasks: completedSubtasks.length,
    reviewableSubtasks: reviewableSubtasks.length,
    dueForReview: dueForReview.length,
    masteredSubtasks: masteredSubtasks.length,
    averageMastery: Math.round(averageMastery),
    retentionRate: reviewableSubtasks.length > 0 
      ? Math.round((masteredSubtasks.length / reviewableSubtasks.length) * 100)
      : 0,
  };
}