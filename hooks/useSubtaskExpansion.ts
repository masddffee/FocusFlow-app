import { useState, useCallback } from "react";

/**
 * Custom hook to manage subtask expansion state
 * Provides functionality to expand/collapse individual subtasks
 */
export const useSubtaskExpansion = () => {
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  const toggleExpansion = useCallback((subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId);
      } else {
        newSet.add(subtaskId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = useCallback((subtaskId: string) => {
    return expandedSubtasks.has(subtaskId);
  }, [expandedSubtasks]);

  const expandAll = useCallback((subtaskIds: string[]) => {
    setExpandedSubtasks(new Set(subtaskIds));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSubtasks(new Set());
  }, []);

  return {
    expandedSubtasks,
    toggleExpansion,
    isExpanded,
    expandAll,
    collapseAll
  };
};
