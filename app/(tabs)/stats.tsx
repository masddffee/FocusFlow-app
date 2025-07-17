import React, { useState } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from "react-native";
import { Stack } from "expo-router";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react-native";
import Colors from "@/constants/colors";
import Theme from "@/constants/theme";
import ProgressChart from "@/components/ProgressChart";
import { useStatsStore } from "@/store/statsStore";
import { useTimerStore } from "@/store/timerStore";
import { useTaskStore } from "@/store/taskStore";
import { formatDuration, getWeekDates } from "@/utils/timeUtils";
// import { generateProductivityTipsSafely } from "@/utils/api";
import { useSettingsStore } from "@/store/settingsStore";

export default function StatsScreen() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [productivityTips, setProductivityTips] = useState<string[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  
  const { getDailyStats, getWeeklyStats, getMonthlyStats, getTotalFocusTime } = useStatsStore();
  const { getAverageSessionDuration, sessions } = useTimerStore();
  const { tasks } = useTaskStore();
  
  const weekDates = getWeekDates();
  const todayStats = getDailyStats();
  
  const handleGenerateTips = async () => {
    setIsLoadingTips(true);
    
    try {
      const stats = {
        focusTime: Math.floor(getTotalFocusTime("week") / 60), // Convert to minutes
        tasksCompleted: tasks.filter(t => t.completed).length,
        averageSessionDuration: Math.floor(getAverageSessionDuration() / 60), // Convert to minutes
        distractions: todayStats.distractions,
      };
      
      // 🔐 使用安全的生產力建議生成
      const currentLanguage = useSettingsStore.getState().language;
      
      // 暫時使用靜態建議，直到後端 API 完成
      const tipsResponse = {
        tips: [
          "根據您的專注時間，建議增加學習時長",
          "完成任務數量不錯，可以嘗試增加挑戰性",
          "專注時間分布良好，保持這種節奏"
        ],
        fallback: true
      };
      
      if (tipsResponse.tips && tipsResponse.tips.length > 0) {
        setProductivityTips(tipsResponse.tips);
        
        if (tipsResponse.fallback) {
          console.warn('⚠️ Using fallback productivity tips due to network issues');
        }
      } else {
        console.error('❌ No productivity tips received');
        setProductivityTips([]);
      }
      
    } catch (error) {
      console.error("Error generating tips:", error);
      setProductivityTips([]);
    } finally {
      setIsLoadingTips(false);
    }
  };
  
  const renderDailyStats = () => {
    const totalFocusTime = getTotalFocusTime("today");
    const completedTasks = tasks.filter(t => 
      t.completed && new Date(t.updatedAt).toDateString() === new Date().toDateString()
    ).length;
    
    return (
      <View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={24} color={Colors.light.primary} />
            <Text style={styles.statValue}>{formatDuration(totalFocusTime)}</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </View>
          
          <View style={styles.statCard}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.statValue}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <AlertTriangle size={24} color={Colors.light.warning} />
            <Text style={styles.statValue}>{todayStats.distractions}</Text>
            <Text style={styles.statLabel}>Distractions</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.light.secondary} />
            <Text style={styles.statValue}>{todayStats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
        
        <ProgressChart
          title="Today's Progress"
          data={[
            {
              label: "Focus Time",
              value: Math.floor(totalFocusTime / 60), // convert to minutes
              target: 120, // 2 hours target
            },
            {
              label: "Tasks",
              value: completedTasks,
              target: 5,
            },
            {
              label: "Sessions",
              value: todayStats.sessions,
              target: 4,
            },
          ]}
        />
      </View>
    );
  };
  
  const renderWeeklyStats = () => {
    const weeklyStats = getWeeklyStats();
    const weeklyFocusTime = getTotalFocusTime("week");
    const weeklyCompletedTasks = tasks.filter(t => {
      const taskDate = new Date(t.updatedAt);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return t.completed && taskDate >= weekStart;
    }).length;
    
    return (
      <View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={24} color={Colors.light.primary} />
            <Text style={styles.statValue}>{formatDuration(weeklyFocusTime)}</Text>
            <Text style={styles.statLabel}>Weekly Focus</Text>
          </View>
          
          <View style={styles.statCard}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.statValue}>{weeklyCompletedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          
          <View style={styles.statCard}>
            <AlertTriangle size={24} color={Colors.light.warning} />
            <Text style={styles.statValue}>
              {weeklyStats.reduce((sum, day) => sum + day.distractions, 0)}
            </Text>
            <Text style={styles.statLabel}>Distractions</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.light.secondary} />
            <Text style={styles.statValue}>
              {weeklyStats.reduce((sum, day) => sum + day.sessions, 0)}
            </Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
        
        <View style={styles.weekContainer}>
          {weekDates.map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <Text style={[styles.weekDayText, day.isToday && styles.todayText]}>
                {day.dayName}
              </Text>
              <View 
                style={[
                  styles.weekDayBar,
                  day.isToday && styles.todayBar,
                  {
                    height: Math.max(
                      20,
                      Math.min(
                        100,
                        (weeklyStats.find(s => s.date === day.date)?.focusTime || 0) / 60
                      )
                    ),
                  },
                ]}
              />
              <Text style={styles.weekDayNumber}>{day.dayNumber}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  const renderMonthlyStats = () => {
    const monthlyStats = getMonthlyStats();
    const monthlyFocusTime = getTotalFocusTime("month");
    const monthlyCompletedTasks = tasks.filter(t => {
      const taskDate = new Date(t.updatedAt);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      return t.completed && taskDate >= monthStart;
    }).length;
    
    return (
      <View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Clock size={24} color={Colors.light.primary} />
            <Text style={styles.statValue}>{formatDuration(monthlyFocusTime)}</Text>
            <Text style={styles.statLabel}>Monthly Focus</Text>
          </View>
          
          <View style={styles.statCard}>
            <CheckCircle size={24} color={Colors.light.success} />
            <Text style={styles.statValue}>{monthlyCompletedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          
          <View style={styles.statCard}>
            <AlertTriangle size={24} color={Colors.light.warning} />
            <Text style={styles.statValue}>
              {monthlyStats.reduce((sum, day) => sum + day.distractions, 0)}
            </Text>
            <Text style={styles.statLabel}>Distractions</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.light.secondary} />
            <Text style={styles.statValue}>
              {monthlyStats.reduce((sum, day) => sum + day.sessions, 0)}
            </Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
        
        <ProgressChart
          title="Monthly Goals"
          data={[
            {
              label: "Focus Hours",
              value: Math.floor(monthlyFocusTime / 3600), // convert to hours
              target: 40, // 40 hours target
            },
            {
              label: "Tasks",
              value: monthlyCompletedTasks,
              target: 30,
            },
            {
              label: "Avg. Session",
              value: Math.floor(getAverageSessionDuration() / 60), // convert to minutes
              target: 25,
            },
          ]}
        />
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Statistics" }} />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "daily" && styles.activeTab]}
          onPress={() => setActiveTab("daily")}
        >
          <Text
            style={[styles.tabText, activeTab === "daily" && styles.activeTabText]}
          >
            Daily
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "weekly" && styles.activeTab]}
          onPress={() => setActiveTab("weekly")}
        >
          <Text
            style={[styles.tabText, activeTab === "weekly" && styles.activeTabText]}
          >
            Weekly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "monthly" && styles.activeTab]}
          onPress={() => setActiveTab("monthly")}
        >
          <Text
            style={[styles.tabText, activeTab === "monthly" && styles.activeTabText]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {activeTab === "daily" && renderDailyStats()}
        {activeTab === "weekly" && renderWeeklyStats()}
        {activeTab === "monthly" && renderMonthlyStats()}
        
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Text style={styles.tipsTitle}>Productivity Tips</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateTips}
              disabled={isLoadingTips}
            >
              <Text style={styles.generateButtonText}>
                {isLoadingTips ? "Generating..." : "Generate"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {productivityTips.length > 0 ? (
            productivityTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Text style={styles.tipNumber}>{index + 1}</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noTipsText}>
              Generate personalized productivity tips based on your stats
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.light.text,
    marginVertical: Theme.spacing.sm,
  },
  statLabel: {
    fontSize: Theme.typography.sizes.sm,
    color: Colors.light.subtext,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 150,
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  weekDay: {
    alignItems: "center",
    width: 30,
  },
  weekDayText: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.subtext,
    marginBottom: Theme.spacing.sm,
  },
  todayText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  weekDayBar: {
    width: 8,
    backgroundColor: Colors.light.border,
    borderRadius: Theme.radius.round,
    marginBottom: Theme.spacing.xs,
  },
  todayBar: {
    backgroundColor: Colors.light.primary,
  },
  weekDayNumber: {
    fontSize: Theme.typography.sizes.xs,
    color: Colors.light.text,
  },
  tipsContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tipsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  tipsTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.light.text,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
  },
  generateButtonText: {
    fontSize: Theme.typography.sizes.sm,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  tipItem: {
    flexDirection: "row",
    marginBottom: Theme.spacing.md,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    marginRight: Theme.spacing.md,
    fontWeight: "600",
  },
  tipText: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.text,
    lineHeight: 24,
  },
  noTipsText: {
    fontSize: Theme.typography.sizes.md,
    color: Colors.light.subtext,
    textAlign: "center",
    marginVertical: Theme.spacing.lg,
  },
});