import Colors from "@/constants/colors";
import { TFunction } from "i18next";

/**
 * Get color for a specific learning phase
 */
export const getPhaseColor = (phase?: string): string => {
  switch (phase) {
    case "knowledge":
      return "#3B82F6"; // Blue
    case "practice":
      return "#10B981"; // Green
    case "application":
      return "#F59E0B"; // Orange
    case "reflection":
      return "#8B5CF6"; // Purple
    case "output":
      return "#EF4444"; // Red
    default:
      return Colors.light.subtext;
  }
};

/**
 * Get localized label for a specific learning phase
 */
export const getPhaseLabel = (phase?: string, t?: TFunction): string => {
  if (!t) return phase || "";

  switch (phase) {
    case "knowledge":
      return t('phases.knowledge');
    case "practice":
      return t('phases.practice');
    case "application":
      return t('phases.application');
    case "reflection":
      return t('phases.reflection');
    case "output":
      return t('phases.output');
    case "review":
      return t('phases.review');
    default:
      return "";
  }
};

/**
 * Get emoji icon for a specific learning phase
 */
export const getPhaseIcon = (phase?: string): string => {
  switch (phase) {
    case "knowledge":
      return "📚";
    case "practice":
      return "🛠️";
    case "application":
      return "🎯";
    case "reflection":
      return "🤔";
    case "output":
      return "📝";
    case "review":
      return "🔄";
    default:
      return "⏱️";
  }
};
