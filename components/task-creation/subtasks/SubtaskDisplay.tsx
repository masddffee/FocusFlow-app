import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Plus, Trash2, Clock, Edit3, BookOpen, ExternalLink, Brain } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { EnhancedSubtask } from "@/types/task";

interface SubtaskDisplayProps {
  subtasks: EnhancedSubtask[];
  isAnalyzing: boolean;
  isGeneratingSubtasks: boolean;
  onSmartGenerate: () => void;
  onAddSubtask: (text: string) => void;
  onRemoveSubtask: (id: string) => void;
  onUpdateSubtaskDuration: (id: string, duration: number) => void;
  getTotalEstimatedTime: () => number;
  getPhaseStats: () => Record<string, number>;
  getPhaseLabel: (phase: string) => string;
  getPhaseIcon: (phase: string) => string;
  getPhaseColor: (phase: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}

export default function SubtaskDisplay({
  subtasks,
  isAnalyzing,
  isGeneratingSubtasks,
  onSmartGenerate,
  onAddSubtask,
  onRemoveSubtask,
  onUpdateSubtaskDuration,
  getTotalEstimatedTime,
  getPhaseStats,
  getPhaseLabel,
  getPhaseIcon,
  getPhaseColor,
  getDifficultyColor,
}: SubtaskDisplayProps) {
  const { t } = useTranslation();
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [tempDuration, setTempDuration] = useState("");

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(newSubtask.trim());
      setNewSubtask("");
    }
  };

  const handleSubtaskDurationEdit = (id: string, duration: number) => {
    setEditingSubtaskId(id);
    setTempDuration(duration.toString());
  };

  const handleSubtaskDurationSave = (id: string) => {
    const duration = parseInt(tempDuration);
    if (!isNaN(duration) && duration > 0) {
      onUpdateSubtaskDuration(id, duration);
    }
    setEditingSubtaskId(null);
    setTempDuration("");
  };

  const handleSubtaskDurationCancel = () => {
    setEditingSubtaskId(null);
    setTempDuration("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.subtaskHeader}>
        <Text style={styles.label}>Subtasks</Text>
        <Button
          title="Smart Generate"
          onPress={onSmartGenerate}
          variant="outline"
          size="small"
          loading={isAnalyzing || isGeneratingSubtasks}
          icon={<Brain size={16} color={Colors.light.primary} />}
        />
      </View>

      {subtasks.length > 0 && (
        <>
          <View style={styles.timeEstimateContainer}>
            <Text style={styles.timeEstimateText}>
              Total estimated time: {getTotalEstimatedTime()} minutes ({Math.round(getTotalEstimatedTime() / 60 * 10) / 10} hours)
            </Text>
          </View>

          {/* Phase Distribution */}
          {subtasks.some(s => s.phase) && (
            <View style={styles.phaseDistributionContainer}>
              <Text style={styles.phaseDistributionTitle}>Learning Phase Distribution</Text>
              <View style={styles.phaseDistribution}>
                {Object.entries(getPhaseStats()).map(([phase, count]) => (
                  count > 0 && (
                    <View key={phase} style={styles.phaseDistributionItem}>
                      <View style={[
                        styles.phaseDistributionDot,
                        { backgroundColor: getPhaseColor(phase) }
                      ]} />
                      <Text style={styles.phaseDistributionText}>
                        {getPhaseLabel(phase)}: {count}
                      </Text>
                    </View>
                  )
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {subtasks.map((subtask) => (
        <View key={subtask.id} style={styles.subtaskCard}>
          <View style={styles.subtaskContent}>
            <View style={styles.subtaskHeaderRow}>
              {subtask.title && (
                <Text style={styles.subtaskTitle}>
                  {getPhaseIcon(subtask.phase)} {subtask.title}
                </Text>
              )}
              {subtask.taskType === "exam_preparation" && (
                <View style={styles.examBadge}>
                  <Text style={styles.examBadgeText}>Exam</Text>
                </View>
              )}
              {subtask.isReviewTask && (
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>Review</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtaskText}>
              {subtask.text}
            </Text>

            {/* Recommended Resources */}
            {subtask.recommendedResources && subtask.recommendedResources.length > 0 && (
              <View style={styles.resourcesContainer}>
                <View style={styles.resourcesHeader}>
                  <BookOpen size={12} color={Colors.light.primary} />
                  <Text style={styles.resourcesTitle}>Recommended Resources:</Text>
                </View>
                {subtask.recommendedResources.slice(0, 3).map((resource, index) => (
                  <View key={`${subtask.id}-resource-${index}`} style={styles.resourceItem}>
                    <ExternalLink size={10} color={Colors.light.subtext} />
                    <Text style={styles.resourceText}>{resource}</Text>
                  </View>
                ))}
                {subtask.recommendedResources.length > 3 && (
                  <Text style={styles.moreResourcesText}>
                    +{subtask.recommendedResources.length - 3} more resources
                  </Text>
                )}
              </View>
            )}

            <View style={styles.subtaskMeta}>
              <View style={styles.subtaskDuration}>
                <Clock size={12} color={Colors.light.subtext} />
                {editingSubtaskId === subtask.id ? (
                  <View style={styles.durationEditContainer}>
                    <TextInput
                      style={styles.durationInput}
                      value={tempDuration}
                      onChangeText={setTempDuration}
                      keyboardType="numeric"
                      placeholder="60"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => handleSubtaskDurationSave(subtask.id)}
                      style={styles.durationSaveButton}
                    >
                      <Text style={styles.durationSaveText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubtaskDurationCancel}
                      style={styles.durationCancelButton}
                    >
                      <Text style={styles.durationCancelText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSubtaskDurationEdit(
                      subtask.id,
                      subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60
                    )}
                    style={styles.durationDisplay}
                  >
                    <Text style={styles.subtaskDurationText}>
                      {subtask.userEstimatedDuration || subtask.aiEstimatedDuration || 60}m
                    </Text>
                    <Edit3 size={10} color={Colors.light.subtext} />
                  </TouchableOpacity>
                )}
              </View>
              {subtask.difficulty && (
                <View style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(subtask.difficulty) }
                ]}>
                  <Text style={styles.difficultyBadgeText}>
                    {subtask.difficulty}
                  </Text>
                </View>
              )}
              {subtask.phase && (
                <View style={[
                  styles.phaseBadge,
                  { backgroundColor: getPhaseColor(subtask.phase) }
                ]}>
                  <Text style={styles.phaseBadgeText}>
                    {getPhaseLabel(subtask.phase)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onRemoveSubtask(subtask.id)}
            style={styles.removeSubtaskButton}
          >
            <Trash2 size={16} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addSubtaskContainer}>
        <TextInput
          style={styles.subtaskInput}
          value={newSubtask}
          onChangeText={setNewSubtask}
          placeholder={t('addTask.subtaskPlaceholder')}
          placeholderTextColor={Colors.light.subtext}
          onSubmitEditing={handleAddSubtask}
        />
        <TouchableOpacity
          style={styles.addSubtaskButton}
          onPress={handleAddSubtask}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  timeEstimateContainer: {
    backgroundColor: Colors.light.primary + "15",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  timeEstimateText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.primary,
    fontWeight: "500",
  },
  phaseDistributionContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  phaseDistributionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  phaseDistribution: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.sm,
  },
  phaseDistributionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phaseDistributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseDistributionText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
  },
  subtaskCard: {
    flexDirection: "row",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Theme.spacing.xs,
    marginBottom: 4,
  },
  subtaskTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  examBadge: {
    backgroundColor: Colors.light.warning + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
  },
  examBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.warning,
    fontWeight: "600",
  },
  reviewBadge: {
    backgroundColor: Colors.light.primary + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
  },
  reviewBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.primary,
    fontWeight: "600",
  },
  subtaskText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
    lineHeight: 20,
  },
  resourcesContainer: {
    backgroundColor: Colors.light.primary + "08",
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  resourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  resourcesTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  resourceText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    flex: 1,
  },
  moreResourcesText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.primary,
    fontStyle: "italic",
    marginTop: 2,
  },
  subtaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.xs,
    flexWrap: "wrap",
  },
  subtaskDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: Theme.typography.sizes.sm,
    width: 50,
    textAlign: "center",
  },
  durationSaveButton: {
    backgroundColor: Colors.light.success,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  durationSaveText: {
    color: "#FFFFFF",
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
  },
  durationCancelButton: {
    backgroundColor: Colors.light.error,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  durationCancelText: {
    color: "#FFFFFF",
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
  },
  durationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtaskDurationText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
  },
  difficultyBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.radius.sm,
  },
  phaseBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  removeSubtaskButton: {
    padding: 4,
  },
  addSubtaskContainer: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
  },
  addSubtaskButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: Theme.radius.md,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
