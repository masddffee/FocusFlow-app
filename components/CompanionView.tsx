import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Coffee, Brain, Target, CheckCircle } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";

interface CompanionViewProps {
  isActive: boolean;
  isPaused: boolean;
  progress: number;
  currentTask?: {
    id: string;
    title: string;
    description?: string;
  } | null;
}

export default function CompanionView({ 
  isActive, 
  isPaused, 
  progress, 
  currentTask 
}: CompanionViewProps) {
  const getCompanionMessage = () => {
    if (!isActive && progress === 0) {
      return "Ready to focus? Let's begin your session!";
    }
    
    if (isPaused) {
      return "Take your time. I'll be here when you're ready to continue.";
    }
    
    if (isActive) {
      if (progress < 0.25) {
        return "Great start! You're building momentum.";
      } else if (progress < 0.5) {
        return "You're doing amazing! Keep that focus going.";
      } else if (progress < 0.75) {
        return "More than halfway there! You've got this.";
      } else if (progress < 0.95) {
        return "Almost finished! Stay strong.";
      } else {
        return "Incredible work! You're about to complete this session.";
      }
    }
    
    return "Well done! Ready for your next focus session?";
  };

  const getCompanionIcon = () => {
    if (!isActive && progress === 0) {
      return <Target size={24} color={Colors.light.primary} />;
    }
    
    if (isPaused) {
      return <Coffee size={24} color={Colors.light.secondary} />;
    }
    
    if (isActive) {
      return <Brain size={24} color={Colors.light.primary} />;
    }
    
    return <CheckCircle size={24} color={Colors.light.success} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {getCompanionIcon()}
      </View>
      
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          {getCompanionMessage()}
        </Text>
        
        {currentTask && (
          <Text style={styles.taskHint}>
            Focusing on: {currentTask.title}
          </Text>
        )}
      </View>
      
      {isActive && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.round(progress * 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  message: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Theme.spacing.xs,
  },
  taskHint: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    textAlign: "center",
    fontStyle: "italic",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: Theme.spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    fontWeight: "600",
  },
});