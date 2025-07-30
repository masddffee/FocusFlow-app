import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { Plus, Trash2, Edit3, Clock, BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { log } from '@/lib/logger';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';
import Button from '@/components/Button';
import { EnhancedSubtask, TaskDifficulty } from '@/types/task';
import { estimateSubtaskDuration } from '@/utils/api';

interface SubtaskManagerProps {
  subtasks: EnhancedSubtask[];
  newSubtask: string;
  editingSubtaskId: string | null;
  tempDuration: string;
  isEstimatingDuration: boolean;
  onSubtasksChange: (subtasks: EnhancedSubtask[]) => void;
  onNewSubtaskChange: (text: string) => void;
  onEditingChange: (id: string | null) => void;
  onTempDurationChange: (duration: string) => void;
  onEstimatingChange: (isEstimating: boolean) => void;
}

export default function SubtaskManager({
  subtasks,
  newSubtask,
  editingSubtaskId,
  tempDuration,
  isEstimatingDuration,
  onSubtasksChange,
  onNewSubtaskChange,
  onEditingChange,
  onTempDurationChange,
  onEstimatingChange,
}: SubtaskManagerProps) {
  const { t } = useTranslation();

  // 🔧 修復：安全的順序計算函數
  const getNextSafeOrder = (existingSubtasks: EnhancedSubtask[]): number => {
    if (existingSubtasks.length === 0) return 1;
    
    // 找到當前最大的 order 值
    const maxOrder = Math.max(...existingSubtasks.map(s => s.order || 0));
    return maxOrder + 1;
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      const newSubtaskObj: EnhancedSubtask = {
        id: Date.now().toString(),
        title: newSubtask.trim(),
        text: newSubtask.trim(),
        completed: false,
        aiEstimatedDuration: 30,
        difficulty: 'medium' as TaskDifficulty,
        order: getNextSafeOrder(subtasks), // 🔧 使用安全的順序計算
        skills: [],
        recommendedResources: [],
        phase: 'practice'
      };
      
      log.info('Manual subtask added', { title: newSubtask.trim() });
      onSubtasksChange([...subtasks, newSubtaskObj]);
      onNewSubtaskChange('');
    }
  };

  const removeSubtask = (index: number) => {
    const subtaskTitle = subtasks[index]?.title;
    Alert.alert(
      t('addTask.deleteSubtask'),
      t('addTask.deleteSubtaskConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            log.info('Subtask removed', { title: subtaskTitle });
            const updatedSubtasks = subtasks.filter((_, i) => i !== index);
            onSubtasksChange(updatedSubtasks);
          }
        }
      ]
    );
  };

  const startEditingDuration = (subtask: EnhancedSubtask) => {
    onEditingChange(subtask.id);
    onTempDurationChange(subtask.aiEstimatedDuration?.toString() || '30');
  };

  const saveDuration = async (subtaskId: string) => {
    const duration = parseInt(tempDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert(t('addTask.error'), t('addTask.invalidDuration'));
      return;
    }

    const updatedSubtasks = subtasks.map(subtask =>
      subtask.id === subtaskId
        ? { ...subtask, aiEstimatedDuration: duration }
        : subtask
    );
    
    log.info('Subtask duration updated', { subtaskId, duration });
    onSubtasksChange(updatedSubtasks);
    onEditingChange(null);
    onTempDurationChange('');
  };

  const cancelEditingDuration = () => {
    onEditingChange(null);
    onTempDurationChange('');
  };

  const estimateAllDurations = async () => {
    if (subtasks.length === 0) return;

    onEstimatingChange(true);
    log.info('Estimating durations for all subtasks', { count: subtasks.length });

    try {
      const updatedSubtasks = await Promise.all(
        subtasks.map(async (subtask) => {
          try {
            const result = await estimateSubtaskDuration(subtask.text, subtask.difficulty);
            return {
              ...subtask,
              aiEstimatedDuration: result.success ? result.estimatedDuration : subtask.aiEstimatedDuration
            };
          } catch (error) {
            log.error('Failed to estimate subtask duration', error, 'SubtaskManager');
            return subtask;
          }
        })
      );
      
      onSubtasksChange(updatedSubtasks);
      log.info('Duration estimation completed');
    } catch (error) {
      log.error('Batch duration estimation failed', error, 'SubtaskManager');
      Alert.alert(t('addTask.error'), t('addTask.estimationFailed'));
    } finally {
      onEstimatingChange(false);
    }
  };

  const getDifficultyColor = (difficulty: TaskDifficulty) => {
    switch (difficulty) {
      case 'easy': return Colors.success;
      case 'medium': return Colors.warning;
      case 'hard': return Colors.danger;
      default: return Colors.text.secondary;
    }
  };

  const getDifficultyLabel = (difficulty: TaskDifficulty) => {
    switch (difficulty) {
      case 'easy': return t('addTask.difficultyEasy');
      case 'medium': return t('addTask.difficultyMedium');
      case 'hard': return t('addTask.difficultyHard');
      default: return difficulty;
    }
  };

  const totalEstimatedTime = subtasks.reduce((total, subtask) => 
    total + (subtask.aiEstimatedDuration || 0), 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('addTask.subtasks')}</Text>
        {subtasks.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Clock size={16} color={Colors.text.secondary} />
              <Text style={styles.summaryText}>
                {Math.round(totalEstimatedTime)} {t('common.minutes')}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <BarChart3 size={16} color={Colors.text.secondary} />
              <Text style={styles.summaryText}>
                {subtasks.length} {t('addTask.items')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {subtasks.length > 0 && (
        <TouchableOpacity
          style={styles.estimateAllButton}
          onPress={estimateAllDurations}
          disabled={isEstimatingDuration}
        >
          <Clock size={16} color={Colors.primary} />
          <Text style={styles.estimateAllText}>
            {isEstimatingDuration ? t('addTask.estimating') : t('addTask.estimateAllDurations')}
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {subtasks.map((subtask, index) => (
          <View key={subtask.id} style={styles.subtaskItem}>
            <View style={styles.subtaskHeader}>
              <Text style={styles.subtaskTitle}>{subtask.title}</Text>
              <View style={styles.subtaskMeta}>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(subtask.difficulty) + '20' }]}>
                  <Text style={[styles.difficultyText, { color: getDifficultyColor(subtask.difficulty) }]}>
                    {getDifficultyLabel(subtask.difficulty)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeSubtask(index)} style={styles.deleteButton}>
                  <Trash2 size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.durationContainer}>
              {editingSubtaskId === subtask.id ? (
                <View style={styles.durationEditContainer}>
                  <TextInput
                    style={styles.durationInput}
                    value={tempDuration}
                    onChangeText={onTempDurationChange}
                    keyboardType="numeric"
                    placeholder={t('addTask.durationPlaceholder')}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.durationSaveButton}
                    onPress={() => saveDuration(subtask.id)}
                  >
                    <Text style={styles.durationSaveText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.durationCancelButton}
                    onPress={cancelEditingDuration}
                  >
                    <Text style={styles.durationCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.durationDisplay}
                  onPress={() => startEditingDuration(subtask)}
                >
                  <Clock size={16} color={Colors.text.secondary} />
                  <Text style={styles.durationText}>
                    {subtask.aiEstimatedDuration || 30} {t('common.minutes')}
                  </Text>
                  <Edit3 size={14} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {subtask.text !== subtask.title && (
              <Text style={styles.subtaskDescription}>{subtask.text}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.addSubtaskContainer}>
        <TextInput
          style={styles.addSubtaskInput}
          placeholder={t('addTask.addSubtaskPlaceholder')}
          value={newSubtask}
          onChangeText={onNewSubtaskChange}
          onSubmitEditing={addSubtask}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={addSubtask} style={styles.addSubtaskButton}>
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  summary: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  estimateAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    marginBottom: 16,
  },
  estimateAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  subtaskItem: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  subtaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginRight: 12,
  },
  subtaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  durationContainer: {
    marginBottom: 8,
  },
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  durationEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.background.primary,
  },
  durationSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  durationSaveText: {
    fontSize: 12,
    color: Colors.background.primary,
    fontWeight: '500',
  },
  durationCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.text.secondary + '20',
    borderRadius: 6,
  },
  durationCancelText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  subtaskDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  addSubtaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  addSubtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text.primary,
    backgroundColor: Colors.background.secondary,
  },
  addSubtaskButton: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    padding: 12,
  },
});