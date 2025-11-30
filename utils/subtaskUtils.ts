import { EnhancedSubtask } from "@/types/task";

/**
 * Calculate statistics for subtask phases
 * Returns a record of phase counts
 */
export const getPhaseStats = (subtasks?: EnhancedSubtask[]): Record<string, number> => {
  if (!subtasks) return {};

  const phaseCount: Record<string, number> = {
    knowledge: 0,
    practice: 0,
    application: 0,
    reflection: 0,
    output: 0,
  };

  subtasks.forEach(subtask => {
    if (subtask.phase && phaseCount.hasOwnProperty(subtask.phase)) {
      phaseCount[subtask.phase]++;
    }
  });

  return phaseCount;
};

/**
 * Calculate total completed subtasks
 */
export const getCompletedSubtasksCount = (subtasks?: EnhancedSubtask[]): number => {
  if (!subtasks) return 0;
  return subtasks.filter(st => st.completed).length;
};

/**
 * Calculate subtask completion percentage
 */
export const getSubtaskCompletionPercentage = (subtasks?: EnhancedSubtask[]): number => {
  if (!subtasks || subtasks.length === 0) return 0;
  const completed = getCompletedSubtasksCount(subtasks);
  return Math.round((completed / subtasks.length) * 100);
};

/**
 * Calculate total estimated time for all subtasks
 */
export const getTotalEstimatedTime = (subtasks?: EnhancedSubtask[]): number => {
  if (!subtasks) return 0;
  return subtasks.reduce((total, subtask) => total + (subtask.estimatedDuration || 30), 0);
};
