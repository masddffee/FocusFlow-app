import { StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

export const focusStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.xl,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: Theme.spacing.xl,
  },
  taskInfo: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  phaseIcon: {
    fontSize: 20,
    marginRight: Theme.spacing.sm,
  },
  taskTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    flex: 1,
    lineHeight: 28,
  },
  phaseLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.primary,
    marginBottom: Theme.spacing.sm,
  },
  taskDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    lineHeight: 22,
    marginBottom: Theme.spacing.sm,
  },
  progressInfo: {
    backgroundColor: Colors.light.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  progressValue: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.light.text,
  },
  timerSection: {
    alignItems: "center",
    marginBottom: Theme.spacing.xxl,
  },
  timeDisplay: {
    fontSize: 64,
    fontWeight: "300",
    color: Colors.light.text,
    marginTop: Theme.spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  timeLabel: {
    fontSize: Theme.typography.sizes.lg,
    color: Colors.light.subtext,
    marginTop: Theme.spacing.sm,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: "center",
    alignItems: "center",
  },
  companionSection: {
    flex: 1,
    justifyContent: "center",
  },
  settingsButton: {
    padding: Theme.spacing.sm,
  },
});
