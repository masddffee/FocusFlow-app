import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import Theme from '@/constants/theme';

interface TaskBasicFormProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  detectedTaskType?: string;
}

const TaskBasicForm: React.FC<TaskBasicFormProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  detectedTaskType
}) => {
  const { t } = useTranslation();

  const getTaskTypeIcon = (taskType: string) => {
    const icons = {
      exam_preparation: '📝',
      skill_learning: '🎯',
      project_completion: '🚀',
      habit_building: '🔄',
      challenge: '⚡',
      general: '📋'
    };
    return icons[taskType as keyof typeof icons] || '📋';
  };

  const getTaskTypeDescription = (taskType: string) => {
    const descriptions = {
      exam_preparation: 'AI將生成複習計劃和練習題目',
      skill_learning: 'AI將設計循序漸進的學習路徑',
      project_completion: 'AI將分解為可執行的步驟',
      habit_building: 'AI將設計習慣養成的階段性目標',
      challenge: 'AI將提供挑戰策略和里程碑',
      general: 'AI將根據內容智慧分析任務類型'
    };
    return descriptions[taskType as keyof typeof descriptions] || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.taskTitle')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
          placeholder={t('addTask.taskTitlePlaceholder')}
          placeholderTextColor={Colors.light.subtext}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder={t('addTask.descriptionPlaceholder')}
          placeholderTextColor={Colors.light.subtext}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Task Type Detection Display */}
      {detectedTaskType && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('addTask.aiDetectedType')}</Text>
          <View style={styles.detectedTypeContainer}>
            <View style={[
              styles.detectedTypeBadge,
              { backgroundColor: Colors.light.primary }
            ]}>
              <Text style={styles.detectedTypeIcon}>{getTaskTypeIcon(detectedTaskType)}</Text>
              <Text style={styles.detectedTypeText}>
                {t(`taskTypes.${detectedTaskType}`)}
              </Text>
            </View>
            <Text style={styles.detectedTypeDescription}>
              {getTaskTypeDescription(detectedTaskType)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12
  },
  detectedTypeContainer: {
    borderWidth: 1,
    borderColor: Colors.light.primaryLight,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9ff'
  },
  detectedTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  detectedTypeIcon: {
    fontSize: 12,
    marginRight: 4
  },
  detectedTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500'
  },
  detectedTypeDescription: {
    color: Colors.light.subtext,
    fontSize: 12,
    fontStyle: 'italic'
  }
});

export default TaskBasicForm;