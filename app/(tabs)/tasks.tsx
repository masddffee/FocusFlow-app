import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from "react-native";
import { Stack, router } from "expo-router";
import { Plus, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import ScheduleItem from "@/components/ScheduleItem";
import WeekCalendar from "@/components/WeekCalendar";
import { useTaskStore } from "@/store/taskStore";
import { Task } from "@/types/task";

export default function TasksScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">("Day");
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  
  const { tasks, scheduledTasks } = useTaskStore();
  
  const handleAddTask = () => {
    try {
      router.push("/add-task");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };
  
  const handleTaskPress = (task: Task & { scheduledTime?: string; scheduledEndTime?: string }) => {
    try {
      router.push({
        pathname: "/task-detail",
        params: { id: task.id },
      });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };
  
  const handleStartTask = (task: Task & { scheduledTime?: string; scheduledEndTime?: string }) => {
    try {
      router.push({
        pathname: "/focus",
        params: { taskId: task.id },
      });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };
  
  const getDateRange = () => {
    try {
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      };
      
      return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}, ${selectedDate.getFullYear()}`;
    } catch (error) {
      console.error("Date range error:", error);
      return "Date Range";
    }
  };
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    try {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedDate(newDate);
    } catch (error) {
      console.error("Navigate week error:", error);
    }
  };
  
  const getScheduleForSelectedDate = () => {
    try {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      // Get scheduled tasks for the selected date
      const dayScheduledTasks = scheduledTasks.filter(st => st.date === selectedDateStr);
      
      // Get the actual task objects with proper null filtering
      const scheduledTasksWithDetails = dayScheduledTasks
        .map(st => {
          const task = tasks.find(t => t.id === st.taskId);
          if (!task) return null;
          return {
            ...task,
            scheduledTime: st.timeSlot.start,
            scheduledEndTime: st.timeSlot.end,
          };
        })
        .filter((task): task is Task & { scheduledTime: string; scheduledEndTime: string } => task !== null);
      
      // Group tasks by time periods
      const schedule = {
        morning: scheduledTasksWithDetails.filter(task => {
          const hour = parseInt(task.scheduledTime.split(':')[0]);
          return hour >= 6 && hour < 12;
        }),
        afternoon: scheduledTasksWithDetails.filter(task => {
          const hour = parseInt(task.scheduledTime.split(':')[0]);
          return hour >= 12 && hour < 18;
        }),
        evening: scheduledTasksWithDetails.filter(task => {
          const hour = parseInt(task.scheduledTime.split(':')[0]);
          return hour >= 18;
        }),
        unscheduled: tasks.filter(task => {
          // Tasks that are not scheduled but due today
          if (task.completed) return false;
          if (!task.dueDate) return false;
          
          const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
          const isScheduled = scheduledTasks.some(st => st.taskId === task.id);
          
          return taskDate === selectedDateStr && !isScheduled;
        })
      };
      
      return schedule;
    } catch (error) {
      console.error("Get schedule error:", error);
      return {
        morning: [],
        afternoon: [],
        evening: [],
        unscheduled: []
      };
    }
  };
  
  const schedule = getScheduleForSelectedDate();
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Schedule",
          headerTitleStyle: styles.headerTitle,
          headerRight: () => (
            <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
              <Plus size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={() => navigateWeek('prev')}>
          <ChevronLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <Text style={styles.dateRange}>{getDateRange()}</Text>
        
        <TouchableOpacity onPress={() => navigateWeek('next')}>
          <ChevronRight size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
      
      {/* Week Calendar */}
      <WeekCalendar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />
      
      {/* View Mode Tabs */}
      <View style={styles.viewModeContainer}>
        {["Day", "Week", "Month"].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.viewModeTab,
              viewMode === mode && styles.activeViewModeTab,
            ]}
            onPress={() => setViewMode(mode as any)}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === mode && styles.activeViewModeText,
              ]}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* AI Suggested Schedule */}
        {showAISuggestions && (
          <View style={styles.aiSuggestionsContainer}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>AI Suggested Schedule</Text>
              <View style={styles.optimizedBadge}>
                <Text style={styles.optimizedText}>Optimized</Text>
              </View>
            </View>
            
            <Text style={styles.aiDescription}>
              Based on your tasks and free time, here's an optimized schedule for today:
            </Text>
            
            <TouchableOpacity style={styles.applySuggestionsButton}>
              <Text style={styles.applySuggestionsText}>Apply Suggestions</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Morning Schedule */}
        {schedule.morning.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.timeSectionTitle}>Morning</Text>
            {schedule.morning.map((task) => (
              <ScheduleItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onStart={() => handleStartTask(task)}
              />
            ))}
          </View>
        )}
        
        {/* Afternoon Schedule */}
        {schedule.afternoon.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.timeSectionTitle}>Afternoon</Text>
            {schedule.afternoon.map((task) => (
              <ScheduleItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onStart={() => handleStartTask(task)}
              />
            ))}
          </View>
        )}
        
        {/* Evening Schedule */}
        {schedule.evening.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.timeSectionTitle}>Evening</Text>
            {schedule.evening.map((task) => (
              <ScheduleItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onStart={() => handleStartTask(task)}
              />
            ))}
          </View>
        )}
        
        {/* Unscheduled Tasks */}
        {schedule.unscheduled.length > 0 && (
          <View style={styles.timeSection}>
            <Text style={styles.timeSectionTitle}>Unscheduled</Text>
            {schedule.unscheduled.map((task) => (
              <ScheduleItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onStart={() => handleStartTask(task)}
                showTime={false}
              />
            ))}
          </View>
        )}
        
        {/* Empty State */}
        {Object.values(schedule).every(arr => arr.length === 0) && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No tasks scheduled</Text>
            <Text style={styles.emptyText}>
              Add tasks to see your optimized schedule
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddTask}
            >
              <Text style={styles.emptyButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleAddTask}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: "700",
    color: Colors.light.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  dateRange: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  viewModeContainer: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  viewModeTab: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    backgroundColor: Colors.light.card,
  },
  activeViewModeTab: {
    backgroundColor: Colors.light.primary,
  },
  viewModeText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "500",
    color: Colors.light.text,
  },
  activeViewModeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl * 2,
  },
  aiSuggestionsContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  aiTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  optimizedBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.sm,
  },
  optimizedText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  aiDescription: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.lg,
    lineHeight: 22,
  },
  applySuggestionsButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
    opacity: 0.9,
  },
  applySuggestionsText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  timeSection: {
    marginBottom: Theme.spacing.xl,
  },
  timeSectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Theme.spacing.xl,
    marginTop: Theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: "center",
    marginBottom: Theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
  },
  emptyButtonText: {
    fontSize: Theme.typography.sizes.md,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: Theme.spacing.xl,
    right: Theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});