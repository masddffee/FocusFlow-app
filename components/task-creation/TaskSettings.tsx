import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import DatePicker from '@/components/DatePicker';
import SchedulingOptions from '@/components/task-creation/SchedulingOptions';
import { TaskDifficulty } from '@/types/task';
import { SchedulingMode } from '@/utils/scheduling';

interface TaskSettingsProps {
  // Due Date
  dueDate: string;
  onDueDateChange: (date: string) => void;
  timeConstraintMessage?: string;
  
  // Priority
  priority: "low" | "medium" | "high" | "";
  onPriorityChange: (priority: "low" | "medium" | "high" | "") => void;
  
  // Difficulty
  difficulty: TaskDifficulty | "";
  onDifficultyChange: (difficulty: TaskDifficulty | "") => void;
  
  // Scheduling
  autoSchedule: boolean;
  schedulingMode: SchedulingMode;
  startNextDay: boolean;
  showSchedulingOptions: boolean;
  onAutoScheduleChange: (enabled: boolean) => void;
  onSchedulingModeChange: (mode: SchedulingMode) => void;
  onStartNextDayChange: (enabled: boolean) => void;
  onToggleSchedulingOptions: () => void;
}

const TaskSettings: React.FC<TaskSettingsProps> = ({
  dueDate,
  onDueDateChange,
  timeConstraintMessage,
  priority,
  onPriorityChange,
  difficulty,
  onDifficultyChange,
  autoSchedule,
  schedulingMode,
  startNextDay,
  showSchedulingOptions,
  onAutoScheduleChange,
  onSchedulingModeChange,
  onStartNextDayChange,
  onToggleSchedulingOptions
}) => {
  const { t } = useTranslation();

  const calculateTimeConstraint = (selectedDate: string) => {
    if (!selectedDate) return { timeContext: '', constraintLevel: 'none' };
    
    const now = new Date();
    const target = new Date(selectedDate);
    const daysUntil = Math.ceil((target.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntil <= 3) {
      return { 
        timeContext: `⚡ 僅剩 ${daysUntil} 天，建議集中執行`, 
        constraintLevel: 'urgent' 
      };
    } else if (daysUntil <= 7) {
      return { 
        timeContext: `⏰ ${daysUntil} 天後到期，請及早規劃`, 
        constraintLevel: 'soon' 
      };
    } else {
      return { 
        timeContext: `📅 還有 ${daysUntil} 天，可從容規劃`, 
        constraintLevel: 'relaxed' 
      };
    }
  };

  return (
    <View style={styles.container}>
      {/* Due Date */}
      <View style={styles.inputGroup}>
        <View style={styles.dueDateHeader}>
          <Text style={styles.label}>Due Date (Optional)</Text>
          <Calendar size={16} color={Colors.light.primary} />
        </View>
        <DatePicker
          selectedDate={dueDate}
          onDateSelect={onDueDateChange}
          placeholder={t('addTask.dueDatePlaceholder')}
          minDate={new Date()}
        />
        {dueDate && (
          <View style={styles.timeConstraintInfo}>
            <Text style={styles.timeConstraintText}>
              {timeConstraintMessage || calculateTimeConstraint(dueDate).timeContext}
            </Text>
          </View>
        )}
      </View>

      {/* Scheduling Options */}
      <SchedulingOptions
        autoSchedule={autoSchedule}
        schedulingMode={schedulingMode}
        startNextDay={startNextDay}
        showOptions={showSchedulingOptions}
        onAutoScheduleChange={onAutoScheduleChange}
        onSchedulingModeChange={onSchedulingModeChange}
        onStartNextDayChange={onStartNextDayChange}
        onToggleOptions={onToggleSchedulingOptions}
      />
      
      {/* Priority */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.priority')}</Text>
        <View style={styles.difficultyContainer}>
          {(["low", "medium", "high"] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                priority === level && styles.selectedDifficultyButton
              ]}
              onPress={() => onPriorityChange(level)}
            >
              <Text style={[
                styles.difficultyButtonText,
                priority === level && styles.selectedDifficultyButtonText
              ]}>
                {getPriorityLabel(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Difficulty */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.difficulty')}</Text>
        <View style={styles.difficultyContainer}>
          {(["easy", "medium", "hard", "expert"] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyButton,
                difficulty === level && styles.selectedDifficultyButton
              ]}
              onPress={() => onDifficultyChange(level)}
            >
              <Text style={[
                styles.difficultyButtonText,
                difficulty === level && styles.selectedDifficultyButtonText
              ]}>
                {getDifficultyLabel(level)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const getPriorityLabel = (priority: string) => {
  const labels = {
    low: '🟢 低',
    medium: '🟡 中',
    high: '🔴 高'
  };
  return labels[priority as keyof typeof labels] || priority;
};

const getDifficultyLabel = (difficulty: string) => {
  const labels = {
    easy: '😊 簡單',
    medium: '🤔 中等',
    hard: '😤 困難',
    expert: '🔥 專家'
  };
  return labels[difficulty as keyof typeof labels] || difficulty;
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
  dueDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  timeConstraintInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6
  },
  timeConstraintText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center'
  },
  difficultyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  difficultyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 20,
    backgroundColor: Colors.light.background
  },
  selectedDifficultyButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary
  },
  difficultyButtonText: {
    fontSize: 14,
    color: Colors.light.text
  },
  selectedDifficultyButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});

export default TaskSettings;