import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  TouchableOpacity,
  ScrollView,
  TextInput
} from "react-native";
import { AlertTriangle, Clock, Brain, Calendar, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { useTaskStore } from "@/store/taskStore";
import { useSettingsStore } from "@/store/settingsStore";

export interface ReflectionReason {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ReflectionModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  daysUntilDeadline: number;
  onReflectionComplete: (reasonId: string, customReason?: string) => void;
}

export default function ReflectionModal({
  visible,
  onClose,
  taskId,
  taskTitle,
  daysUntilDeadline,
  onReflectionComplete
}: ReflectionModalProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const reflectionReasons: ReflectionReason[] = [
    {
      id: "underestimated_duration",
      label: language === 'zh' ? "低估了子任務所需時間" : "Underestimated subtask durations",
      icon: <Clock size={20} color={Colors.light.primary} />
    },
    {
      id: "unexpected_events",
      label: language === 'zh' ? "太多意外事件" : "Too many unexpected events",
      icon: <AlertTriangle size={20} color={Colors.light.warning} />
    },
    {
      id: "easily_distracted",
      label: language === 'zh' ? "學習時容易分心" : "Easily distracted during study",
      icon: <Brain size={20} color={Colors.light.secondary} />
    },
    {
      id: "other",
      label: language === 'zh' ? "其他原因" : "Other",
      icon: <Calendar size={20} color={Colors.light.subtext} />
    }
  ];

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    if (reasonId === "other") {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomReason("");
    }
  };

  const handleSubmit = () => {
    if (selectedReason) {
      onReflectionComplete(
        selectedReason, 
        selectedReason === "other" ? customReason : undefined
      );
      // Reset state
      setSelectedReason(null);
      setCustomReason("");
      setShowCustomInput(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <AlertTriangle size={32} color={Colors.light.error} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {language === 'zh' ? "無法再延遲了" : "Cannot be delayed any further"}
          </Text>

          {/* Warning Message */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              {language === 'zh' 
                ? `距離「${taskTitle}」的截止日期只剩 ${daysUntilDeadline} 天。AI 自動排程已暫時鎖定，直到您調整計劃。`
                : `Only ${daysUntilDeadline} days left until the deadline for "${taskTitle}". AI scheduling is temporarily locked until you adjust the plan.`
              }
            </Text>
          </View>

          {/* Reflection Section */}
          <View style={styles.reflectionSection}>
            <Text style={styles.reflectionTitle}>
              {language === 'zh' 
                ? "看起來這個計劃有點太過雄心勃勃了——這完全沒關係。每個計劃都能幫助我們學習。花點時間反思一下：是什麼讓這次的估算特別困難？"
                : "It looks like this plan was a bit too ambitious — and that's totally okay. Every plan helps us learn. Take a moment to reflect: what made this round especially hard to estimate?"
              }
            </Text>

            <ScrollView style={styles.reasonsContainer}>
              {reflectionReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.id && styles.reasonButtonSelected
                  ]}
                  onPress={() => handleReasonSelect(reason.id)}
                >
                  <View style={styles.reasonIcon}>{reason.icon}</View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.reasonTextSelected
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder={language === 'zh' ? "請描述您的原因..." : "Please describe your reason..."}
                  placeholderTextColor={Colors.light.subtext}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={language === 'zh' ? "稍後處理" : "Handle Later"}
              onPress={onClose}
              variant="outline"
              size="medium"
              style={styles.actionButton}
            />
            <Button
              title={language === 'zh' ? "提交並調整計劃" : "Submit & Adjust Plan"}
              onPress={handleSubmit}
              variant="primary"
              size="medium"
              style={styles.actionButton}
              disabled={!selectedReason || (selectedReason === "other" && !customReason.trim())}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.lg,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.radius.xl,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  header: {
    alignItems: "center",
    paddingTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.error + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Theme.spacing.md,
    right: Theme.spacing.md,
    padding: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    textAlign: "center",
    marginTop: Theme.spacing.md,
    marginHorizontal: Theme.spacing.lg,
  },
  warningBox: {
    backgroundColor: Colors.light.warning + "15",
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  warningText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.warning,
    lineHeight: 20,
    textAlign: "center",
  },
  reflectionSection: {
    padding: Theme.spacing.lg,
  },
  reflectionTitle: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  reasonsContainer: {
    maxHeight: 200,
  },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  reasonButtonSelected: {
    backgroundColor: Colors.light.primary + "15",
    borderColor: Colors.light.primary,
  },
  reasonIcon: {
    marginRight: Theme.spacing.md,
  },
  reasonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    flex: 1,
  },
  reasonTextSelected: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  customInputContainer: {
    marginTop: Theme.spacing.md,
  },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  actionButtons: {
    flexDirection: "row",
    padding: Theme.spacing.lg,
    paddingTop: 0,
    gap: Theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
}); 