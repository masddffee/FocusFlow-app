import { Alert } from "react-native";
import { Task } from "@/types/task";
import { log } from "@/lib/logger";

export interface ExtendDeadlineParams {
  task: Task;
  newDeadline: string;
  language: "en" | "zh";
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  onSuccess?: () => void;
  onError?: () => void;
}

/**
 * Extend task deadline with validation
 * @returns true if successful, false otherwise
 */
export const extendTaskDeadline = ({
  task,
  newDeadline,
  language,
  updateTask,
  onSuccess,
  onError
}: ExtendDeadlineParams): boolean => {
  // Validate newDeadline is provided
  if (!newDeadline) {
    Alert.alert(
      language === 'zh' ? "請選擇日期" : "Please Select Date",
      language === 'zh' ? "請選擇新的截止日期" : "Please select a new deadline"
    );
    return false;
  }

  try {
    // Validate new date must be greater than current date
    const selectedDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      Alert.alert(
        language === 'zh' ? "無效日期" : "Invalid Date",
        language === 'zh' ? "新截止日期必須大於今天" : "New deadline must be later than today"
      );
      return false;
    }

    // Update task deadline
    updateTask(task.id, {
      ...task,
      dueDate: newDeadline
    });

    // Show success message
    Alert.alert(
      language === 'zh' ? "延長成功" : "Extension Successful",
      language === 'zh'
        ? `任務截止日期已延長至 ${selectedDate.toLocaleDateString('zh-CN')}`
        : `Task deadline extended to ${selectedDate.toLocaleDateString('en-US')}`,
      [{ text: language === 'zh' ? "確定" : "OK", onPress: onSuccess }]
    );

    return true;
  } catch (error) {
    log.error("延長截止日期失敗:", error);
    Alert.alert(
      language === 'zh' ? "延長失敗" : "Extension Failed",
      language === 'zh' ? "無法延長截止日期，請稍後再試" : "Unable to extend deadline, please try again later",
      [{ text: language === 'zh' ? "確定" : "OK", onPress: onError }]
    );
    return false;
  }
};
