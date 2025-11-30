import { useState, useCallback } from "react";
import { Task } from "@/types/task";
import { extendTaskDeadline } from "@/utils/taskActions";

/**
 * Custom hook to manage deadline extension functionality
 */
export const useDeadlineExtension = (
  task: Task,
  language: "en" | "zh",
  updateTask: (taskId: string, updates: Partial<Task>) => void
) => {
  const [showModal, setShowModal] = useState(false);
  const [newDeadline, setNewDeadline] = useState<string>("");

  const openModal = useCallback(() => {
    setShowModal(true);
    setNewDeadline(task.dueDate || "");
  }, [task.dueDate]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setNewDeadline("");
  }, []);

  const handleConfirm = useCallback(() => {
    const success = extendTaskDeadline({
      task,
      newDeadline,
      language,
      updateTask,
      onSuccess: closeModal,
      onError: closeModal
    });

    if (success) {
      closeModal();
    }
  }, [task, newDeadline, language, updateTask, closeModal]);

  return {
    showModal,
    newDeadline,
    setNewDeadline,
    openModal,
    closeModal,
    handleConfirm
  };
};
