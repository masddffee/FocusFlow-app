import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import { Calendar } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import DatePicker from "@/components/DatePicker";

interface TaskBasicFormProps {
  title: string;
  description: string;
  dueDate: string;
  detectedTaskType?: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDueDateChange: (date: string) => void;
  calculateTimeConstraint?: (date: string) => { timeContext: string };
  getTaskTypeIcon?: (type: string) => string;
  getTaskTypeDescription?: (type: string) => string;
}

export default function TaskBasicForm({
  title,
  description,
  dueDate,
  detectedTaskType,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  calculateTimeConstraint,
  getTaskTypeIcon,
  getTaskTypeDescription,
}: TaskBasicFormProps) {
  const { t } = useTranslation();

  return (
    <>
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
      {detectedTaskType && getTaskTypeIcon && getTaskTypeDescription && (
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
        {dueDate && calculateTimeConstraint && (
          <View style={styles.timeConstraintInfo}>
            <Text style={styles.timeConstraintText}>
              {calculateTimeConstraint(dueDate).timeContext}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  textArea: {
    minHeight: 100,
  },
  dueDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  timeConstraintInfo: {
    backgroundColor: Colors.light.warning + "15",
    borderWidth: 1,
    borderColor: Colors.light.warning + "30",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  timeConstraintText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.warning,
    fontWeight: "500",
    lineHeight: 18,
  },
  detectedTypeContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  detectedTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginBottom: Theme.spacing.xs,
    gap: 4,
  },
  detectedTypeIcon: {
    fontSize: 14,
  },
  detectedTypeText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detectedTypeDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
  },
});
