import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Clock, CheckCircle, Circle, Calendar } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  showTime?: boolean;
}

export default function TaskItem({ 
  task, 
  onPress, 
  onToggleComplete, 
  showTime = false 
}: TaskItemProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return Colors.light.success;
      case "medium":
        return Colors.light.warning;
      case "hard":
        return Colors.light.error;
      default:
        return Colors.light.subtext;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return Colors.light.error;
      case "medium":
        return Colors.light.warning;
      case "low":
        return Colors.light.success;
      default:
        return Colors.light.subtext;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, task.completed && styles.completedContainer]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onToggleComplete(task)}
      >
        {task.completed ? (
          <CheckCircle size={20} color={Colors.light.success} />
        ) : (
          <Circle size={20} color={Colors.light.subtext} />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              task.completed && styles.completedTitle,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          
          {showTime && task.scheduledTime && (
            <View style={styles.timeContainer}>
              <Clock size={14} color={Colors.light.primary} />
              <Text style={styles.timeText}>
                {formatTime(task.scheduledTime)}
                {task.scheduledEndTime && ` - ${formatTime(task.scheduledEndTime)}`}
              </Text>
            </View>
          )}
        </View>

        {task.description && (
          <Text
            style={[
              styles.description,
              task.completed && styles.completedDescription,
            ]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.tags}>
            {task.duration && (
              <View style={styles.tag}>
                <Clock size={12} color={Colors.light.subtext} />
                <Text style={styles.tagText}>{task.duration}m</Text>
              </View>
            )}

            {task.difficulty && (
              <View style={[styles.tag, { backgroundColor: getDifficultyColor(task.difficulty) + "20" }]}>
                <Text style={[styles.tagText, { color: getDifficultyColor(task.difficulty) }]}>
                  {task.difficulty}
                </Text>
              </View>
            )}

            {task.priority && (
              <View style={[styles.tag, { backgroundColor: getPriorityColor(task.priority) + "20" }]}>
                <Text style={[styles.tagText, { color: getPriorityColor(task.priority) }]}>
                  {task.priority} priority
                </Text>
              </View>
            )}
          </View>

          {task.dueDate && (
            <View style={styles.dueDateContainer}>
              <Calendar size={12} color={Colors.light.subtext} />
              <Text style={styles.dueDateText}>
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  completedContainer: {
    opacity: 0.6,
  },
  checkboxContainer: {
    marginRight: Theme.spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginRight: Theme.spacing.sm,
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: Colors.light.subtext,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  timeText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.primary,
    fontWeight: "500",
    marginLeft: 4,
  },
  description: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    lineHeight: 18,
    marginBottom: Theme.spacing.sm,
  },
  completedDescription: {
    textDecorationLine: "line-through",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.border + "50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginRight: 8,
  },
  tagText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    fontWeight: "500",
    marginLeft: 4,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueDateText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginLeft: 4,
  },
});