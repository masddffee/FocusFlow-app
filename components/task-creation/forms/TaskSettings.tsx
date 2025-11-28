import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

type Priority = "" | "low" | "medium" | "high";
type Difficulty = "" | "easy" | "medium" | "hard";

interface TaskSettingsProps {
  priority: Priority;
  difficulty: Difficulty;
  autoSchedule: boolean;
  autoSchedulingEnabled: boolean;
  isEditMode: boolean;
  onPriorityChange: (priority: Priority) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onAutoScheduleChange: (enabled: boolean) => void;
}

export default function TaskSettings({
  priority,
  difficulty,
  autoSchedule,
  autoSchedulingEnabled,
  isEditMode,
  onPriorityChange,
  onDifficultyChange,
  onAutoScheduleChange,
}: TaskSettingsProps) {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.priority')}</Text>
        <View style={styles.difficultyContainer}>
          <TouchableOpacity
            style={[
              styles.difficultyButton,
              priority === "low" && styles.difficultyButtonActive,
              priority === "low" && { backgroundColor: Colors.light.success },
            ]}
            onPress={() => onPriorityChange("low")}
          >
            <Text
              style={[
                styles.difficultyText,
                priority === "low" && styles.difficultyTextActive,
              ]}
            >
              {t('priority.low')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              priority === "medium" && styles.difficultyButtonActive,
              priority === "medium" && { backgroundColor: Colors.light.warning },
            ]}
            onPress={() => onPriorityChange("medium")}
          >
            <Text
              style={[
                styles.difficultyText,
                priority === "medium" && styles.difficultyTextActive,
              ]}
            >
              {t('priority.medium')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              priority === "high" && styles.difficultyButtonActive,
              priority === "high" && { backgroundColor: Colors.light.error },
            ]}
            onPress={() => onPriorityChange("high")}
          >
            <Text
              style={[
                styles.difficultyText,
                priority === "high" && styles.difficultyTextActive,
              ]}
            >
              {t('priority.high')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t('addTask.difficulty')}</Text>
        <View style={styles.difficultyContainer}>
          <TouchableOpacity
            style={[
              styles.difficultyButton,
              difficulty === "easy" && styles.difficultyButtonActive,
              difficulty === "easy" && { backgroundColor: Colors.light.success },
            ]}
            onPress={() => onDifficultyChange("easy")}
          >
            <Text
              style={[
                styles.difficultyText,
                difficulty === "easy" && styles.difficultyTextActive,
              ]}
            >
              {t('difficulty.easy')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              difficulty === "medium" && styles.difficultyButtonActive,
              difficulty === "medium" && { backgroundColor: Colors.light.warning },
            ]}
            onPress={() => onDifficultyChange("medium")}
          >
            <Text
              style={[
                styles.difficultyText,
                difficulty === "medium" && styles.difficultyTextActive,
              ]}
            >
              {t('difficulty.medium')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              difficulty === "hard" && styles.difficultyButtonActive,
              difficulty === "hard" && { backgroundColor: Colors.light.error },
            ]}
            onPress={() => onDifficultyChange("hard")}
          >
            <Text
              style={[
                styles.difficultyText,
                difficulty === "hard" && styles.difficultyTextActive,
              ]}
            >
              {t('difficulty.hard')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {autoSchedulingEnabled && !isEditMode && (
        <View style={styles.inputGroup}>
          <View style={styles.autoScheduleContainer}>
            <View style={styles.autoScheduleInfo}>
              <Zap size={20} color={Colors.light.primary} />
              <View style={styles.autoScheduleText}>
                <Text style={styles.autoScheduleTitle}>AI Auto-Schedule</Text>
                <Text style={styles.autoScheduleDescription}>
                  Automatically estimate duration and find the best time slot based on your availability, task priority, and deadline
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                autoSchedule && styles.toggleButtonActive,
              ]}
              onPress={() => onAutoScheduleChange(!autoSchedule)}
            >
              <View
                style={[
                  styles.toggleIndicator,
                  autoSchedule && styles.toggleIndicatorActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  difficultyContainer: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    alignItems: "center",
    backgroundColor: Colors.light.card,
  },
  difficultyButtonActive: {
    borderColor: "transparent",
  },
  difficultyText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: "500",
  },
  difficultyTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  autoScheduleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  autoScheduleInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: Theme.spacing.sm,
  },
  autoScheduleText: {
    flex: 1,
  },
  autoScheduleTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  autoScheduleDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.border,
    justifyContent: "center",
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleIndicatorActive: {
    transform: [{ translateX: 22 }],
  },
});
