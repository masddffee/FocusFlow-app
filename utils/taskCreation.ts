import { ProficiencyLevel } from "@/types/task";
import { calculateDaysUntil, getTimeConstraintLevel, getTimeConstraintMessage } from "./timeUtils";

/**
 * Calculate time constraint information for a task
 */
export function calculateTimeConstraint(selectedDate: string): {
  availableDays: number;
  timeContext: string;
  constraintLevel: string;
} {
  if (!selectedDate) {
    return { availableDays: 0, timeContext: "", constraintLevel: "none" };
  }

  const availableDays = calculateDaysUntil(selectedDate);
  const constraintLevel = getTimeConstraintLevel(availableDays);
  const timeContext = getTimeConstraintMessage(availableDays);

  return { availableDays, timeContext, constraintLevel };
}

/**
 * Get task type specific message with context
 */
export function getTaskTypeMessage(
  taskType: string,
  count: number,
  availableDays: number,
  currentProf: ProficiencyLevel,
  targetProf: ProficiencyLevel
): string {
  const urgencyNote =
    availableDays > 0 && availableDays <= 7
      ? ` Tasks are optimized for your ${availableDays}-day timeline.`
      : availableDays > 7 && availableDays <= 30
      ? ` Tasks are balanced for your ${availableDays}-day timeline.`
      : availableDays > 30
      ? ` Tasks include comprehensive depth for your ${availableDays}-day timeline.`
      : "";

  const proficiencyNote = ` Designed to progress from ${currentProf} to ${targetProf} level.`;
  const spacedRepetitionNote =
    taskType === "skill_learning" || taskType === "exam_preparation"
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
}

/**
 * Get human-readable label for task type
 */
export function getTaskTypeLabel(taskType?: string): string {
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
}

/**
 * Get emoji icon for task type
 */
export function getTaskTypeIcon(taskType?: string): string {
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
}

/**
 * Get human-readable label for proficiency level
 */
export function getProficiencyLabel(proficiency: ProficiencyLevel): string {
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
}
