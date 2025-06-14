import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import { Task } from "@/types/task";

interface ScheduleItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onStart?: (task: Task) => void;
  showTime?: boolean;
}

export default function ScheduleItem({ 
  task, 
  onPress, 
  onStart, 
  showTime = true 
}: ScheduleItemProps) {
  const getTaskTypeColor = () => {
    switch (task.category) {
      case "work":
        return Colors.light.primary;
      case "study":
        return Colors.light.secondary;
      case "personal":
        return Colors.light.success;
      default:
        return Colors.light.primary;
    }
  };
  
  const getTaskTypeBadge = () => {
    switch (task.category) {
      case "work":
        return "Meeting";
      case "study":
        return "Focus";
      case "personal":
        return "Personal";
      default:
        return "Task";
    }
  };
  
  const formatTimeRange = () => {
    if (!task.scheduledTime || !task.duration) {
      return "No time set";
    }
    
    const [hours, minutes] = task.scheduledTime.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + task.duration);
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      });
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: getTaskTypeColor() }
      ]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {showTime && (
            <Text style={styles.timeRange}>{formatTimeRange()}</Text>
          )}
          
          <View style={[
            styles.typeBadge,
            { backgroundColor: getTaskTypeColor() }
          ]}>
            <Text style={styles.typeText}>{getTaskTypeBadge()}</Text>
          </View>
          
          <TouchableOpacity style={styles.moreButton}>
            <MoreHorizontal size={16} color={Colors.light.subtext} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title} numberOfLines={1}>
          {task.title}
        </Text>
        
        {task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        
        <View style={styles.footer}>
          <View style={styles.metaInfo}>
            {task.duration && (
              <Text style={styles.metaText}>{task.duration} min</Text>
            )}
            {task.difficulty && (
              <Text style={styles.metaText}>• {task.difficulty}</Text>
            )}
          </View>
          
          {onStart && !task.completed && (
            <Button
              title="Start"
              onPress={() => onStart(task)}
              size="small"
              style={styles.startButton}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    marginBottom: Theme.spacing.md,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  content: {
    padding: Theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  timeRange: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: "500",
    color: Colors.light.text,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
    marginRight: Theme.spacing.sm,
  },
  typeText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  moreButton: {
    padding: 4,
  },
  title: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  description: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginRight: Theme.spacing.sm,
  },
  startButton: {
    paddingHorizontal: Theme.spacing.lg,
  },
});