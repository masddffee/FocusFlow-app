import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LearningSession } from "@/types/task";

interface DailyStats {
  date: string;
  focusTime: number; // in seconds
  tasksCompleted: number;
  sessions: number;
  distractions: number;
}

interface ProductivityStats {
  totalFocusTime: number; // in seconds
  totalTasksCompleted: number;
  totalSessions: number;
  averageSessionDuration: number; // in seconds
  longestStreak: number; // days
  currentStreak: number; // days
  lastActiveDate: string;
  weeklyGoal: number; // in minutes
  weeklyProgress: number; // in minutes
}

interface StatsState {
  stats: ProductivityStats;
  learningSessions: LearningSession[];
  dailyStats: DailyStats[];
  
  // Actions
  addFocusTime: (seconds: number) => void;
  completeTask: () => void;
  addSession: (duration: number) => void;
  updateStreak: () => void;
  setWeeklyGoal: (minutes: number) => void;
  addLearningSession: (session: LearningSession) => void;
  getLearningSessionsByTask: (taskId: string) => LearningSession[];
  getWeeklyStats: () => DailyStats[];
  getMonthlyStats: () => DailyStats[];
  getDailyStats: () => DailyStats;
  getTotalFocusTime: (period?: string) => number;
  resetStats: () => void;
}

const initialStats: ProductivityStats = {
  totalFocusTime: 0,
  totalTasksCompleted: 0,
  totalSessions: 0,
  averageSessionDuration: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastActiveDate: "",
  weeklyGoal: 300, // 5 hours default
  weeklyProgress: 0,
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      stats: initialStats,
      learningSessions: [],
      dailyStats: [],

      addFocusTime: (seconds: number) => {
        set((state) => {
          const newTotalTime = state.stats.totalFocusTime + seconds;
          const newTotalSessions = state.stats.totalSessions + 1;
          const newAverageSessionDuration = newTotalTime / newTotalSessions;
          
          // Update daily stats
          const today = getTodayDateString();
          const existingDayIndex = state.dailyStats.findIndex(day => day.date === today);
          
          let updatedDailyStats = [...state.dailyStats];
          if (existingDayIndex >= 0) {
            updatedDailyStats[existingDayIndex] = {
              ...updatedDailyStats[existingDayIndex],
              focusTime: updatedDailyStats[existingDayIndex].focusTime + seconds,
              sessions: updatedDailyStats[existingDayIndex].sessions + 1,
            };
          } else {
            updatedDailyStats.push({
              date: today,
              focusTime: seconds,
              tasksCompleted: 0,
              sessions: 1,
              distractions: 0,
            });
          }
          
          return {
            stats: {
              ...state.stats,
              totalFocusTime: newTotalTime,
              totalSessions: newTotalSessions,
              averageSessionDuration: newAverageSessionDuration,
              weeklyProgress: state.stats.weeklyProgress + Math.floor(seconds / 60),
            },
            dailyStats: updatedDailyStats,
          };
        });
        get().updateStreak();
      },

      completeTask: () => {
        set((state) => {
          // Update daily stats
          const today = getTodayDateString();
          const existingDayIndex = state.dailyStats.findIndex(day => day.date === today);
          
          let updatedDailyStats = [...state.dailyStats];
          if (existingDayIndex >= 0) {
            updatedDailyStats[existingDayIndex] = {
              ...updatedDailyStats[existingDayIndex],
              tasksCompleted: updatedDailyStats[existingDayIndex].tasksCompleted + 1,
            };
          } else {
            updatedDailyStats.push({
              date: today,
              focusTime: 0,
              tasksCompleted: 1,
              sessions: 0,
              distractions: 0,
            });
          }
          
          return {
            stats: {
              ...state.stats,
              totalTasksCompleted: state.stats.totalTasksCompleted + 1,
            },
            dailyStats: updatedDailyStats,
          };
        });
      },

      addSession: (duration: number) => {
        get().addFocusTime(duration);
      },

      updateStreak: () => {
        const today = new Date().toDateString();
        const state = get();
        const lastActiveDate = state.stats.lastActiveDate;
        
        if (lastActiveDate === today) {
          // Already updated today
          return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (lastActiveDate === yesterdayString) {
          // Continuing streak
          set((state) => ({
            stats: {
              ...state.stats,
              currentStreak: state.stats.currentStreak + 1,
              longestStreak: Math.max(state.stats.longestStreak, state.stats.currentStreak + 1),
              lastActiveDate: today,
            },
          }));
        } else if (lastActiveDate === "") {
          // First day
          set((state) => ({
            stats: {
              ...state.stats,
              currentStreak: 1,
              longestStreak: Math.max(state.stats.longestStreak, 1),
              lastActiveDate: today,
            },
          }));
        } else {
          // Streak broken
          set((state) => ({
            stats: {
              ...state.stats,
              currentStreak: 1,
              lastActiveDate: today,
            },
          }));
        }
      },

      setWeeklyGoal: (minutes: number) => {
        set((state) => ({
          stats: {
            ...state.stats,
            weeklyGoal: minutes,
          },
        }));
      },

      addLearningSession: (session: LearningSession) => {
        set((state) => ({
          learningSessions: [...state.learningSessions, session],
        }));
      },

      getLearningSessionsByTask: (taskId: string) => {
        return get().learningSessions.filter(session => session.taskId === taskId);
      },

      getWeeklyStats: () => {
        const state = get();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return state.dailyStats.filter(
          day => new Date(day.date) >= oneWeekAgo
        );
      },

      getMonthlyStats: () => {
        const state = get();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        return state.dailyStats.filter(
          day => new Date(day.date) >= oneMonthAgo
        );
      },

      getDailyStats: () => {
        const state = get();
        const today = getTodayDateString();
        const todayStats = state.dailyStats.find(day => day.date === today);
        
        return todayStats || {
          date: today,
          focusTime: 0,
          tasksCompleted: 0,
          sessions: 0,
          distractions: 0,
        };
      },

      getTotalFocusTime: (period?: string) => {
        const state = get();
        
        if (period === "today") {
          const today = getTodayDateString();
          const todayStats = state.dailyStats.find(day => day.date === today);
          return todayStats ? todayStats.focusTime : 0;
        }
        
        if (period === "week") {
          const weeklyStats = get().getWeeklyStats();
          return weeklyStats.reduce((total, day) => total + day.focusTime, 0);
        }
        
        if (period === "month") {
          const monthlyStats = get().getMonthlyStats();
          return monthlyStats.reduce((total, day) => total + day.focusTime, 0);
        }
        
        return state.stats.totalFocusTime;
      },

      resetStats: () => {
        set({
          stats: initialStats,
          learningSessions: [],
          dailyStats: [],
        });
      },
    }),
    {
      name: "stats-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);