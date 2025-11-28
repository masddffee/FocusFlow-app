import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { HelpCircle, ArrowRight } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { ClarifyingQuestion } from "@/types/task";

interface PersonalizationModalProps {
  visible: boolean;
  questions: ClarifyingQuestion[];
  responses: Record<string, string>;
  onResponse: (questionId: string, response: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  detectedTaskType?: string;
  getTaskTypeIcon?: (type: string) => string;
  getTaskTypeLabel?: (type: string) => string;
  isGeneratingSubtasks?: boolean;
}

export default function PersonalizationModal({
  visible,
  questions,
  responses,
  onResponse,
  onSubmit,
  onClose,
  detectedTaskType,
  getTaskTypeIcon,
  getTaskTypeLabel,
  isGeneratingSubtasks = false,
}: PersonalizationModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Help us personalize your plan</Text>
          <Text style={styles.modalSubtitle}>
            Answer a few questions to get specific, actionable subtasks tailored to your needs with dynamic range calculation
          </Text>
          {detectedTaskType && getTaskTypeIcon && getTaskTypeLabel && (
            <View style={styles.detectedTypeInModal}>
              <Text style={styles.detectedTypeInModalText}>
                Detected: {getTaskTypeIcon(detectedTaskType)} {getTaskTypeLabel(detectedTaskType)}
              </Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.modalContent}>
          {questions.map((question) => (
            <View key={question.id} style={styles.questionContainer}>
              <View style={styles.questionHeader}>
                <HelpCircle size={16} color={Colors.light.primary} />
                <Text style={styles.questionText}>
                  {question.question}
                  {question.required && <Text style={styles.required}> *</Text>}
                </Text>
              </View>

              {question.type === "choice" && question.options ? (
                <View style={styles.choiceContainer}>
                  {question.options.map((option, optionIndex) => (
                    <TouchableOpacity
                      key={`${question.id}-option-${optionIndex}`}
                      style={[
                        styles.choiceButton,
                        responses[question.id] === option && styles.choiceButtonActive,
                      ]}
                      onPress={() => onResponse(question.id, option)}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          responses[question.id] === option && styles.choiceTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.questionInput}
                  value={responses[question.id] || ""}
                  onChangeText={(text) => onResponse(question.id, text)}
                  placeholder="Your answer..."
                  placeholderTextColor={Colors.light.subtext}
                  multiline={question.type === "text"}
                  numberOfLines={question.type === "text" ? 3 : 1}
                />
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.modalButtons}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="outline"
            style={styles.modalButton}
          />
          <Button
            title="Generate Plan"
            onPress={onSubmit}
            variant="primary"
            style={styles.modalButton}
            loading={isGeneratingSubtasks}
            icon={<ArrowRight size={16} color="#FFFFFF" />}
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
  detectedTypeInModal: {
    backgroundColor: Colors.light.primary + "15",
    borderRadius: Theme.radius.sm,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
    alignSelf: "flex-start",
  },
  detectedTypeInModalText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: Theme.spacing.xl,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Theme.spacing.md,
  },
  questionText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
    lineHeight: 22,
  },
  required: {
    color: Colors.light.error,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    textAlignVertical: "top",
  },
  choiceContainer: {
    gap: Theme.spacing.sm,
  },
  choiceButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
  },
  choiceButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  choiceText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: "center",
  },
  choiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
