import Colors from "@/constants/colors";
import { TaskDifficulty } from "@/types/task";

/**
 * Get color for task difficulty level
 */
export const getDifficultyColor = (difficulty?: string | TaskDifficulty): string => {
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

/**
 * Get color for task priority level
 */
export const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case "low":
      return Colors.light.success;
    case "medium":
      return Colors.light.warning;
    case "high":
      return Colors.light.error;
    default:
      return Colors.light.subtext;
  }
};
