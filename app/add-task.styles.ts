import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

export const addTaskStyles = StyleSheet.create({
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
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
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
  saveButton: {
    padding: Theme.spacing.sm,
  },
  schedulingOptionsContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  schedulingModeContainer: {
    marginBottom: Theme.spacing.md,
  },
  schedulingModeTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  schedulingModeButtons: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  schedulingModeButton: {
    flex: 1,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Theme.radius.md,
    backgroundColor: Colors.light.card,
    alignItems: "center",
  },
  schedulingModeButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  schedulingModeButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 4,
  },
  schedulingModeButtonTextActive: {
    color: "#FFFFFF",
  },
  schedulingModeCharacteristics: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    textAlign: "center",
    lineHeight: 16,
  },
  startTimeContainer: {
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  startTimeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.xs,
  },
  startTimeLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
  },
  startTimeDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
  },
  schedulingModeDetails: {
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  schedulingModeDetailsTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.xs,
  },
  schedulingModeDetailsText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
    marginBottom: 2,
  },
});
