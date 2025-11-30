import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

export const taskDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  header: {
    marginBottom: Theme.spacing.lg,
  },
  titleContainer: {
    marginBottom: Theme.spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  taskTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  taskTypeIcon: {
    fontSize: 12,
  },
  taskTypeBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    alignSelf: "flex-start",
  },
  completedButton: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  completeButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.primary,
    fontWeight: "500",
    marginLeft: Theme.spacing.sm,
  },
  completedButtonText: {
    color: "#FFFFFF",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  metaText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginLeft: Theme.spacing.xs,
  },
  difficultyBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    backgroundColor: Colors.light.secondary,
    marginBottom: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  easyBadge: {
    backgroundColor: Colors.light.success,
  },
  mediumBadge: {
    backgroundColor: Colors.light.warning,
  },
  hardBadge: {
    backgroundColor: Colors.light.error,
  },
  difficultyText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  priorityBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginBottom: Theme.spacing.sm,
  },
  lowPriorityBadge: {
    backgroundColor: Colors.light.success,
  },
  mediumPriorityBadge: {
    backgroundColor: Colors.light.warning,
  },
  highPriorityBadge: {
    backgroundColor: Colors.light.error,
  },
  priorityText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  section: {
    marginBottom: Theme.spacing.xl,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  description: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 24,
  },
  learningPlanContainer: {
    gap: Theme.spacing.md,
  },
  learningPlanItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  learningPlanLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    minWidth: 80,
    marginRight: Theme.spacing.sm,
  },
  learningPlanValue: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    flex: 1,
    lineHeight: 22,
  },
  phaseDistributionContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
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
  subtasksContainer: {
    marginTop: Theme.spacing.sm,
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Theme.spacing.md,
  },
  subtaskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Theme.spacing.md,
    marginTop: 2,
  },
  subtaskCheckboxChecked: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.xs,
  },
  subtaskTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    lineHeight: 22,
    flex: 1,
  },
  examSubtaskBadge: {
    backgroundColor: Colors.light.secondary,
    borderRadius: 4,
    padding: 2,
    marginLeft: Theme.spacing.xs,
  },
  expandButton: {
    padding: 4,
    marginLeft: Theme.spacing.xs,
  },
  subtaskText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.xs,
  },
  subtaskTextCompleted: {
    textDecorationLine: "line-through",
    color: Colors.light.subtext,
  },
  resourcesContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  resourcesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.xs,
  },
  resourcesTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
    marginLeft: 4,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  resourceText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginLeft: 4,
    flex: 1,
    lineHeight: 16,
  },
  subtaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    flexWrap: "wrap",
  },
  subtaskDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtaskDurationText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  subtaskSchedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  subtaskScheduleText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  phaseBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  phaseBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  skillsBadge: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillsBadgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressItem: {
    alignItems: "center",
    flex: 1,
  },
  progressValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  buttonContainer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: "#FFFFFF",
  },
  button: {
    width: "100%",
  },
  headerButtons: {
    flexDirection: "row",
  },
  headerButton: {
    padding: Theme.spacing.sm,
    marginLeft: Theme.spacing.sm,
  },
  errorText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.error,
    textAlign: "center",
    marginTop: Theme.spacing.xl,
  },
  // 模態框樣式
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalCloseButton: {
    padding: Theme.spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  modalDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Theme.spacing.xl,
  },
  currentDeadlineInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  currentDeadlineLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.xs,
  },
  currentDeadlineValue: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
  },
  datePickerContainer: {
    marginBottom: Theme.spacing.xl,
  },
  datePickerLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: Theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.light.subtext,
  },
  confirmButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButtonText: {
    color: Colors.light.card,
  },
  // 🆕 Guidance styles
  guidanceContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary
  },
  guidanceItem: {
    marginBottom: 8
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  guidanceIcon: {
    fontSize: 12,
    marginRight: 6
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary
  },
  guidanceText: {
    fontSize: 12,
    color: Colors.light.text,
    lineHeight: 16,
    marginLeft: 18
  },
});
