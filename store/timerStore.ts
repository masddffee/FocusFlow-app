import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TimerSession {
  taskId: string;
  duration: number; // in seconds
  startedAt: string;
  completedAt?: string;
  startTime: string; // for compatibility
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // in seconds
  targetTime: number; // in seconds
  currentTaskId: string | null;
  sessions: TimerSession[];
  lastSession: TimerSession | null;
  
  // Actions
  startTimer: (taskId: string, duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  completeSession: () => void;
  clearLastSession: () => void;
  getTotalFocusTime: (period?: string) => number;
  getAverageSessionDuration: () => number;
  getSessionsByTaskId: (taskId: string) => TimerSession[];
  startSession: (taskId: string) => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      targetTime: 25 * 60, // 25 minutes default
      currentTaskId: null,
      sessions: [],
      lastSession: null,

      startTimer: (taskId: string, duration: number) => {
        try {
          // Validate inputs
          if (!taskId || typeof taskId !== 'string') {
            throw new Error("Invalid task ID");
          }
          
          // Ensure duration is a valid number and convert to seconds if needed
          let validDuration = 25 * 60; // default 25 minutes
          
          if (typeof duration === 'number' && duration > 0) {
            validDuration = Math.floor(duration); // Ensure it's an integer
          } else if (typeof duration === 'string') {
            const parsed = parseInt(duration, 10);
            if (!isNaN(parsed) && parsed > 0) {
              validDuration = parsed;
            }
          }
          
          set({
            isRunning: true,
            isPaused: false,
            currentTime: validDuration,
            targetTime: validDuration,
            currentTaskId: taskId,
          });
        } catch (error) {
          console.error("Start timer error:", error);
          throw new Error("Failed to start timer");
        }
      },

      startSession: (taskId: string) => {
        try {
          if (!taskId || typeof taskId !== 'string') {
            throw new Error("Invalid task ID");
          }
          
          set({
            isRunning: true,
            isPaused: false,
            currentTime: 25 * 60,
            targetTime: 25 * 60, // 25 minutes default
            currentTaskId: taskId,
          });
        } catch (error) {
          console.error("Start session error:", error);
          throw new Error("Failed to start session");
        }
      },

      pauseTimer: () => {
        try {
          set({ isPaused: true });
        } catch (error) {
          console.error("Pause timer error:", error);
          throw new Error("Failed to pause timer");
        }
      },

      resumeTimer: () => {
        try {
          set({ isPaused: false });
        } catch (error) {
          console.error("Resume timer error:", error);
          throw new Error("Failed to resume timer");
        }
      },

      stopTimer: () => {
        try {
          const state = get();
          if (state.currentTaskId && state.currentTime > 0) {
            // Calculate actual duration (target - remaining)
            const actualDuration = state.targetTime - state.currentTime;
            
            if (actualDuration > 0) {
              // Save as incomplete session
              const session: TimerSession = {
                taskId: state.currentTaskId,
                duration: actualDuration,
                startedAt: new Date(Date.now() - actualDuration * 1000).toISOString(),
                completedAt: new Date().toISOString(),
                startTime: new Date(Date.now() - actualDuration * 1000).toISOString(),
              };
              
              set({
                isRunning: false,
                isPaused: false,
                currentTime: 0,
                currentTaskId: null,
                sessions: [...state.sessions, session],
                lastSession: session,
              });
            } else {
              // No meaningful time elapsed
              set({
                isRunning: false,
                isPaused: false,
                currentTime: 0,
                currentTaskId: null,
              });
            }
          } else {
            set({
              isRunning: false,
              isPaused: false,
              currentTime: 0,
              currentTaskId: null,
            });
          }
        } catch (error) {
          console.error("Stop timer error:", error);
          // Ensure we still stop the timer even if there's an error
          set({
            isRunning: false,
            isPaused: false,
            currentTime: 0,
            currentTaskId: null,
          });
          throw new Error("Failed to stop timer");
        }
      },

      resetTimer: () => {
        try {
          const state = get();
          set({
            isRunning: false,
            isPaused: false,
            currentTime: state.targetTime,
            currentTaskId: null,
          });
        } catch (error) {
          console.error("Reset timer error:", error);
          throw new Error("Failed to reset timer");
        }
      },

      tick: () => {
        try {
          const state = get();
          if (state.isRunning && !state.isPaused && state.currentTime > 0) {
            const newTime = state.currentTime - 1;
            
            if (newTime <= 0) {
              // Timer completed
              get().completeSession();
            } else {
              set({ currentTime: newTime });
            }
          }
        } catch (error) {
          console.error("Timer tick error:", error);
          throw new Error("Timer tick failed");
        }
      },

      completeSession: () => {
        try {
          const state = get();
          if (state.currentTaskId) {
            const session: TimerSession = {
              taskId: state.currentTaskId,
              duration: state.targetTime,
              startedAt: new Date(Date.now() - state.targetTime * 1000).toISOString(),
              completedAt: new Date().toISOString(),
              startTime: new Date(Date.now() - state.targetTime * 1000).toISOString(),
            };
            
            set({
              isRunning: false,
              isPaused: false,
              currentTime: 0,
              currentTaskId: null,
              sessions: [...state.sessions, session],
              lastSession: session,
            });
          }
        } catch (error) {
          console.error("Complete session error:", error);
          throw new Error("Failed to complete session");
        }
      },

      clearLastSession: () => {
        try {
          set({ lastSession: null });
        } catch (error) {
          console.error("Clear last session error:", error);
          throw new Error("Failed to clear last session");
        }
      },

      getTotalFocusTime: (period?: string) => {
        try {
          const state = get();
          
          if (period === "today") {
            const today = new Date().toDateString();
            const todaySessions = state.sessions.filter(
              session => new Date(session.startedAt).toDateString() === today
            );
            return todaySessions.reduce((total, session) => total + (session.duration || 0), 0);
          }
          
          if (period === "week") {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const weekSessions = state.sessions.filter(
              session => new Date(session.startedAt) >= oneWeekAgo
            );
            return weekSessions.reduce((total, session) => total + (session.duration || 0), 0);
          }
          
          if (period === "month") {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const monthSessions = state.sessions.filter(
              session => new Date(session.startedAt) >= oneMonthAgo
            );
            return monthSessions.reduce((total, session) => total + (session.duration || 0), 0);
          }
          
          return state.sessions.reduce((total, session) => total + (session.duration || 0), 0);
        } catch (error) {
          console.error("Get total focus time error:", error);
          return 0;
        }
      },

      getAverageSessionDuration: () => {
        try {
          const state = get();
          if (state.sessions.length === 0) return 0;
          
          const totalDuration = state.sessions.reduce((total, session) => total + (session.duration || 0), 0);
          return Math.floor(totalDuration / state.sessions.length);
        } catch (error) {
          console.error("Get average session duration error:", error);
          return 0;
        }
      },

      getSessionsByTaskId: (taskId: string) => {
        try {
          const state = get();
          if (!taskId || typeof taskId !== 'string') {
            return [];
          }
          return state.sessions.filter(session => session.taskId === taskId);
        } catch (error) {
          console.error("Get sessions by task ID error:", error);
          return [];
        }
      },
    }),
    {
      name: "timer-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        lastSession: state.lastSession,
      }),
    }
  )
);