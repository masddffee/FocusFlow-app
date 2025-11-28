import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { LearningPlan, ProficiencyLevel } from "@/types/task";

interface LearningPlanModalProps {
  visible: boolean;
  learningPlan: LearningPlan | null;
  subtasksCount: number;
  onClose: () => void;
  getTaskTypeLabel?: (type?: string) => string;
  getProficiencyLabel?: (proficiency: ProficiencyLevel) => string;
  getPhaseBreakdownText?: (taskType?: string) => string[];
}

export default function LearningPlanModal({
  visible,
  learningPlan,
  subtasksCount,
  onClose,
  getTaskTypeLabel,
  getProficiencyLabel,
  getPhaseBreakdownText,
}: LearningPlanModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Your Personalized {getTaskTypeLabel?.(learningPlan?.taskType) ?? "Learning"} Plan
          </Text>
          <Text style={styles.modalSubtitle}>
            A comprehensive plan based on your goals and preferences with spaced repetition integration
          </Text>
        </View>

        <ScrollView style={styles.modalContent}>
          {learningPlan && (
            <>
              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Achievable Goal</Text>
                <Text style={styles.planItem}>{learningPlan.achievableGoal}</Text>
              </View>

              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Recommended Tools & Resources</Text>
                {learningPlan.recommendedTools.map((tool, index) => (
                  <Text key={`learning-tool-${index}-${tool.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.planItem}>• {tool}</Text>
                ))}
              </View>

              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Progress Checkpoints</Text>
                {learningPlan.checkpoints.map((checkpoint, index) => (
                  <Text key={`learning-checkpoint-${index}-${checkpoint.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.planItem}>• {checkpoint}</Text>
                ))}
              </View>

              {learningPlan.skillBreakdown && learningPlan.skillBreakdown.length > 0 && (
                <View style={styles.planSection}>
                  <Text style={styles.planSectionTitle}>Skill Development Plan</Text>
                  {learningPlan.skillBreakdown.map((skill, index) => (
                    <View key={`learning-skill-${index}-${skill.skill.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.skillItem}>
                      <Text style={styles.skillName}>{skill.skill}</Text>
                      <Text style={styles.skillProgress}>
                        {getProficiencyLabel?.(skill.currentLevel) ?? skill.currentLevel} → {getProficiencyLabel?.(skill.targetLevel) ?? skill.targetLevel}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.planSection}>
                <Text style={styles.planSectionTitle}>Generated Subtasks</Text>
                <Text style={styles.planSubtext}>
                  {subtasksCount} specific, actionable subtasks have been created following the enhanced 6-phase methodology with spaced repetition:
                </Text>
                <View style={styles.phaseBreakdown}>
                  {getPhaseBreakdownText?.(learningPlan.taskType).map((phase, index) => (
                    <Text key={`phase-breakdown-${index}-${phase.substring(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.phaseItem}>{phase}</Text>
                  ))}
                </View>
                <Text style={styles.planSubtext}>
                  You can review and edit them after closing this modal. Spaced repetition will be automatically scheduled for long-term retention.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalButtons}>
          <Button
            title="Got it!"
            onPress={onClose}
            variant="primary"
            style={styles.fullWidthButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  planSection: {
    marginBottom: Theme.spacing.xl,
  },
  planSectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  planItem: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
    lineHeight: 22,
  },
  planSubtext: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 20,
    marginBottom: Theme.spacing.md,
  },
  phaseBreakdown: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  phaseItem: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  skillItem: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  skillName: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  skillProgress: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: "row",
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Theme.spacing.md,
  },
  fullWidthButton: {
    width: "100%",
  },
});
