import React, { useEffect } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image 
} from "react-native";
import { Stack, router } from "expo-router";
import { Plus, Calendar, Clock, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import Button from "@/components/Button";
import TaskItem from "@/components/TaskItem";
import { useTaskStore } from "@/store/taskStore";
import { useStatsStore } from "@/store/statsStore";
import { useTimerStore } from "@/store/timerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { formatDuration } from "@/utils/timeUtils";
import { Task } from "@/types/task";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { tasks, getTodayTasks, scheduledTasks } = useTaskStore();
  const { getTotalFocusTime } = useStatsStore();
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = useSettingsStore();
  
  const todayTasks = getTodayTasks();
  const upcomingTasks = tasks.filter(task => !task.completed).slice(0, 3);
  
  // Use stats store for total focus time
  const totalFocusTimeToday = getTotalFocusTime("today");
  
  // Get today's scheduled tasks with proper null filtering
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayScheduledTasks = scheduledTasks
    .filter(st => st.date === todayDateStr)
    .map(st => {
      const task = tasks.find(t => t.id === st.taskId);
      if (!task) return null;
      return {
        ...task,
        scheduledTime: st.timeSlot.start,
        scheduledEndTime: st.timeSlot.end,
      };
    })
    .filter((task): task is Task & { scheduledTime: string; scheduledEndTime: string } => task !== null)
    .slice(0, 3);
  
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.push("/onboarding");
    }
  }, [hasCompletedOnboarding]);
  
  const handleAddTask = () => {
    router.push("/add-task");
  };
  
  const handleTaskPress = (task: Task & { scheduledTime?: string; scheduledEndTime?: string }) => {
    router.push({
      pathname: "/task-detail",
      params: { id: task.id },
    });
  };
  
  const handleStartFocus = (task: Task) => {
    router.push({
      pathname: "/focus",
      params: { taskId: task.id },
    });
  };
  
  const handleViewAllTasks = () => {
    router.push("/(tabs)/tasks");
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "FocusFlow",
          headerRight: () => (
            <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
              <Plus size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {formatDuration(totalFocusTimeToday)}
              </Text>
              <Text style={styles.statLabel}>{t('stats.focusTime')} {t('schedule.today')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {tasks.filter(task => task.completed).length}
              </Text>
              <Text style={styles.statLabel}>{t('stats.tasksCompleted')}</Text>
            </View>
          </View>
          
          {upcomingTasks.length > 0 ? (
            <View style={styles.focusContainer}>
              <Text style={styles.focusTitle}>{t('home.welcome')}</Text>
              <Button
                title={t('taskDetail.startFocus')}
                onPress={() => handleStartFocus(upcomingTasks[0])}
                variant="primary"
                size="large"
                style={styles.focusButton}
              />
            </View>
          ) : (
            <View style={styles.emptyFocusContainer}>
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=300&auto=format&fit=crop" }}
                style={styles.emptyImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>{t('tasks.noTasks')}</Text>
              <Text style={styles.emptyText}>
                {t('tasks.createFirst')}
              </Text>
              <Button
                title={t('home.addFirstTask')}
                onPress={handleAddTask}
                variant="primary"
                size="medium"
                style={styles.emptyButton}
              />
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.title')}</Text>
            <TouchableOpacity onPress={handleViewAllTasks} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t('tasks.allTasks')}</Text>
              <ChevronRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
          
          {todayScheduledTasks.length > 0 ? (
            todayScheduledTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onToggleComplete={() => {}}
                showTime={true}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('home.noTasks')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.upcomingTasks')}</Text>
            <TouchableOpacity onPress={handleViewAllTasks} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t('tasks.allTasks')}</Text>
              <ChevronRight size={16} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
          
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPress={() => handleTaskPress(task)}
                onToggleComplete={() => {}}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('tasks.noTasks')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('stats.productivityTips')}</Text>
          </View>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Pomodoro Technique</Text>
            <Text style={styles.tipText}>
              Work for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Time Blocking</Text>
            <Text style={styles.tipText}>
              Schedule specific time blocks for different types of work to improve productivity and reduce distractions.
            </Text>
          </View>
        </View>
      </ScrollView>
      
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl * 2,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
    textAlign: "center",
  },
  focusContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  focusTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.md,
  },
  focusButton: {
    width: "100%",
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.primary,
    marginRight: 2,
  },
  emptyContainer: {
    padding: Theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyFocusContainer: {
    padding: Theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: Theme.spacing.md,
  },
  emptyTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  emptyText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: "center",
    marginBottom: Theme.spacing.md,
  },
  emptyButton: {
    marginTop: Theme.spacing.sm,
  },
  tipCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tipTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Theme.spacing.sm,
  },
  tipText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 22,
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
  addButton: {
    padding: Theme.spacing.sm,
  },
});