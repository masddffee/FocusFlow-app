import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
} from "react-native";
import { AlertCircle, Lightbulb } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";

interface QualityAlertModalProps {
  visible: boolean;
  qualityIssues: string[];
  onContinue: () => void;
  onSkip: () => void;
}

export default function QualityAlertModal({
  visible,
  qualityIssues,
  onContinue,
  onSkip,
}: QualityAlertModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.qualityAlertOverlay}>
        <View style={styles.qualityAlertContainer}>
          <View style={styles.qualityAlertHeader}>
            <AlertCircle size={24} color={Colors.light.warning} />
            <Text style={styles.qualityAlertTitle}>Quality Alert</Text>
          </View>

          <Text style={styles.qualityAlertMessage}>
            We noticed some areas where we can help you get better results:
          </Text>

          <View style={styles.qualityIssuesList}>
            {qualityIssues.map((issue, index) => (
              <Text key={`quality-issue-${index}-${issue.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`} style={styles.qualityIssueItem}>• {issue}</Text>
            ))}
          </View>

          <Text style={styles.qualityAlertSubMessage}>
            Would you like to answer a few quick questions to get personalized, actionable subtasks with spaced repetition?
          </Text>

          <View style={styles.qualityAlertButtons}>
            <Button
              title="Skip for now"
              onPress={onSkip}
              variant="outline"
              size="small"
              style={styles.qualityAlertButton}
            />
            <Button
              title="Help me improve"
              onPress={onContinue}
              variant="primary"
              size="small"
              style={styles.qualityAlertButton}
              icon={<Lightbulb size={16} color="#FFFFFF" />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  qualityAlertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.lg,
  },
  qualityAlertContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  qualityAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  qualityAlertTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
  },
  qualityAlertMessage: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
    lineHeight: 22,
  },
  qualityIssuesList: {
    marginBottom: Theme.spacing.md,
  },
  qualityIssueItem: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.xs,
    lineHeight: 20,
  },
  qualityAlertSubMessage: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginBottom: Theme.spacing.lg,
    lineHeight: 22,
  },
  qualityAlertButtons: {
    flexDirection: "row",
    gap: Theme.spacing.md,
  },
  qualityAlertButton: {
    flex: 1,
  },
});
