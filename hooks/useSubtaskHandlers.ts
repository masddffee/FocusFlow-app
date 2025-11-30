import { useState } from 'react';
import { Alert } from 'react-native';
import { TFunction } from 'i18next';
import { EnhancedSubtask } from '@/types/task';

interface UseSubtaskHandlersProps {
  subtasks: EnhancedSubtask[];
  newSubtask: string;
  setSubtasks: (subtasks: EnhancedSubtask[]) => void;
  setNewSubtask: (text: string) => void;
  setEditingSubtaskId: (id: string | null) => void;
  t: TFunction;
}

export const useSubtaskHandlers = ({
  subtasks,
  newSubtask,
  setSubtasks,
  setNewSubtask,
  setEditingSubtaskId,
  t
}: UseSubtaskHandlersProps) => {
  const [tempDuration, setTempDuration] = useState("");

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;

    const newSubtaskObj: EnhancedSubtask = {
      id: Date.now().toString(),
      title: newSubtask.trim(),
      text: newSubtask.trim(),
      completed: false,
      aiEstimatedDuration: 30,
      difficulty: 'medium',
      order: subtasks.length + 1,
      skills: [],
      recommendedResources: [],
      phase: 'practice'
    };

    setSubtasks([...subtasks, newSubtaskObj]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    Alert.alert(
      t('addTask.deleteSubtask'),
      t('addTask.deleteSubtaskConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setSubtasks(subtasks.filter(t => t.id !== id));
          }
        }
      ]
    );
  };

  const handleStartEditDuration = (subtask: EnhancedSubtask) => {
    setEditingSubtaskId(subtask.id);
    setTempDuration(subtask.aiEstimatedDuration?.toString() || '30');
  };

  const handleSaveDuration = (subtaskId: string) => {
    const duration = parseInt(tempDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert(t('addTask.error'), t('addTask.invalidDuration'));
      return;
    }

    setSubtasks(subtasks.map(s =>
      s.id === subtaskId
        ? { ...s, aiEstimatedDuration: duration }
        : s
    ));
    setEditingSubtaskId(null);
    setTempDuration('');
  };

  const handleCancelEditDuration = () => {
    setEditingSubtaskId(null);
    setTempDuration('');
  };

  return {
    tempDuration,
    setTempDuration,
    handleAddSubtask,
    handleRemoveSubtask,
    handleStartEditDuration,
    handleSaveDuration,
    handleCancelEditDuration
  };
};
