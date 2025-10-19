import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TimerSession {
  taskId: string;
  duration: number; // in seconds
  startedAt: string;
  completedAt?: string;
  startTime: string; // for compatibility
  // 🆕 子任務支援
  isSubtask?: boolean;
  mainTaskId?: string;
  subtaskId?: string;
  segmentIndex?: number; // 子任務片段序號
  actualDuration?: number; // 實際學習時長（秒）
  notes?: string; // 學習筆記
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // in seconds
  targetTime: number; // in seconds
  currentTaskId: string | null;
  sessions: TimerSession[];
  lastSession: TimerSession | null;
  
  // 🆕 子任務支援
  currentSubtaskId: string | null;
  currentSegmentIndex?: number;
  
  // Actions
  startTimer: (taskId: string, duration: number, subtaskId?: string, segmentIndex?: number) => void;
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
  
  // 🆕 子任務相關方法
  startSubtaskSession: (mainTaskId: string, subtaskId: string, duration: number, segmentIndex?: number) => void;
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

      // 🆕 子任務支援
      currentSubtaskId: null,
      currentSegmentIndex: undefined,

      startTimer: (taskId: string, duration: number, subtaskId?: string, segmentIndex?: number) => {
        try {
          // Validate inputs
          if (!taskId || typeof taskId !== 'string') {
            throw new Error("Invalid task ID");
          }
          
          // Ensure duration is a valid number and convert to seconds if needed
          let validDuration = 25 * 60; // default 25 minutes in seconds
          
          if (typeof duration === 'number' && duration > 0) {
            validDuration = Math.floor(duration); // Ensure it's an integer
          } else if (typeof duration === 'string') {
            const parsed = parseInt(duration, 10);
            if (!isNaN(parsed) && parsed > 0) {
              validDuration = parsed;
            }
          }
          
          
          // 🆕 解析子任務信息
          let isSubtask = false;
          let mainTaskId: string | undefined;
          let extractedSubtaskId: string | undefined;
          
          if (taskId.includes('_')) {
            isSubtask = true;
            const parts = taskId.split('_');
            if (parts.includes('segment')) {
              const segmentPos = parts.indexOf('segment');
              mainTaskId = parts[0];
              extractedSubtaskId = parts.slice(1, segmentPos).join('_');
            } else {
              mainTaskId = parts[0];
              extractedSubtaskId = parts.slice(1).join('_');
            }
            
          }
          
          set({
            isRunning: true,
            isPaused: false,
            currentTime: validDuration,
            targetTime: validDuration,
            currentTaskId: taskId,
            currentSubtaskId: extractedSubtaskId || subtaskId,
            currentSegmentIndex: segmentIndex,
          });
        } catch (error) {
          console.error("❌ TimerStore: Start timer error:", error);
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
          console.error("❌ TimerStore: Start session error:", error);
          throw new Error("Failed to start session");
        }
      },

      pauseTimer: () => {
        try {
          set({ isPaused: true });
        } catch (error) {
          console.error("❌ TimerStore: Pause timer error:", error);
          throw new Error("Failed to pause timer");
        }
      },

      resumeTimer: () => {
        try {
          set({ isPaused: false });
        } catch (error) {
          console.error("❌ TimerStore: Resume timer error:", error);
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
              // 🆕 檢查是否為子任務
              const isSubtask = state.currentTaskId.includes('_');
              let mainTaskId: string | undefined;
              let subtaskId: string | undefined;
              
              if (isSubtask) {
                const parts = state.currentTaskId.split('_');
                if (parts.includes('segment')) {
                  const segmentPos = parts.indexOf('segment');
                  mainTaskId = parts[0];
                  subtaskId = parts.slice(1, segmentPos).join('_');
                } else {
                  mainTaskId = parts[0];
                  subtaskId = parts.slice(1).join('_');
                }
              }
              
              // Save as incomplete session
              const session: TimerSession = {
                taskId: state.currentTaskId,
                duration: actualDuration,
                startedAt: new Date(Date.now() - actualDuration * 1000).toISOString(),
                completedAt: new Date().toISOString(),
                startTime: new Date(Date.now() - actualDuration * 1000).toISOString(),
                // 🆕 子任務相關字段
                isSubtask,
                mainTaskId,
                subtaskId: state.currentSubtaskId || subtaskId,
                segmentIndex: state.currentSegmentIndex,
                actualDuration, // 實際學習時長
              };
              
              
              set({
                isRunning: false,
                isPaused: false,
                currentTime: 0,
                currentTaskId: null,
                currentSubtaskId: null,
                currentSegmentIndex: undefined,
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
                currentSubtaskId: null,
                currentSegmentIndex: undefined,
              });
            }
          } else {
            set({
              isRunning: false,
              isPaused: false,
              currentTime: 0,
              currentTaskId: null,
              currentSubtaskId: null,
              currentSegmentIndex: undefined,
            });
          }
        } catch (error) {
          console.error("❌ TimerStore: Stop timer error:", error);
          // Ensure we still stop the timer even if there's an error
          set({
            isRunning: false,
            isPaused: false,
            currentTime: 0,
            currentTaskId: null,
            currentSubtaskId: null,
            currentSegmentIndex: undefined,
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
            currentSubtaskId: null,
            currentSegmentIndex: undefined,
          });
        } catch (error) {
          console.error("❌ TimerStore: Reset timer error:", error);
          throw new Error("Failed to reset timer");
        }
      },

      tick: () => {
        try {
          const state = get();
          if (state.isRunning && !state.isPaused && state.currentTime > 0) {
            const newTime = state.currentTime - 1;
            
            if (newTime <= 0) {
              // Timer completed - trigger completion
              get().completeSession();
            } else {
              set({ currentTime: newTime });
            }
          }
        } catch (error) {
          console.error("❌ TimerStore: Timer tick error:", error);
          throw new Error("Timer tick failed");
        }
      },

      completeSession: () => {
        try {
          const state = get();
          
          if (state.currentTaskId) {
            // 🆕 檢查是否為子任務並加入相關信息
            const isSubtask = state.currentTaskId.includes('_');
            let mainTaskId: string | undefined;
            let subtaskId: string | undefined;
            
            if (isSubtask) {
              const parts = state.currentTaskId.split('_');
              if (parts.includes('segment')) {
                const segmentPos = parts.indexOf('segment');
                mainTaskId = parts[0];
                subtaskId = parts.slice(1, segmentPos).join('_');
              } else {
                mainTaskId = parts[0];
                subtaskId = parts.slice(1).join('_');
              }
            }
            
            const session: TimerSession = {
              taskId: state.currentTaskId,
              duration: state.targetTime,
              startedAt: new Date(Date.now() - state.targetTime * 1000).toISOString(),
              completedAt: new Date().toISOString(),
              startTime: new Date(Date.now() - state.targetTime * 1000).toISOString(),
              // 🆕 子任務相關字段
              isSubtask,
              mainTaskId,
              subtaskId: state.currentSubtaskId || subtaskId,
              segmentIndex: state.currentSegmentIndex,
              actualDuration: state.targetTime, // 完整完成的時長
            };
            
            
            set({
              isRunning: false,
              isPaused: false,
              currentTime: 0,
              currentTaskId: null,
              currentSubtaskId: null,
              currentSegmentIndex: undefined,
              sessions: [...state.sessions, session],
              lastSession: session,
            });
          }
        } catch (error) {
          console.error("❌ TimerStore: Complete session error:", error);
          throw new Error("Failed to complete session");
        }
      },

      clearLastSession: () => {
        try {
          set({ lastSession: null });
        } catch (error) {
          console.error("❌ TimerStore: Clear last session error:", error);
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
          console.error("❌ TimerStore: Get total focus time error:", error);
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
          console.error("❌ TimerStore: Get average session duration error:", error);
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
          console.error("❌ TimerStore: Get sessions by task ID error:", error);
          return [];
        }
      },

      // 🆕 子任務相關方法實現
      startSubtaskSession: (mainTaskId: string, subtaskId: string, duration: number, segmentIndex?: number) => {
        try {
          if (!mainTaskId || !subtaskId) {
            throw new Error("Invalid task or subtask ID");
          }
          
          // Validate duration
          let validDuration = 25 * 60; // default 25 minutes in seconds
          if (typeof duration === 'number' && duration > 0) {
            validDuration = Math.floor(duration); // Use as-is if already in seconds
          }
          
          const taskId = `${mainTaskId}_${subtaskId}${segmentIndex ? `_segment_${segmentIndex}` : ''}`;
          
          
          set({
            isRunning: true,
            isPaused: false,
            currentTime: validDuration,
            targetTime: validDuration,
            currentTaskId: taskId,
            currentSubtaskId: subtaskId,
            currentSegmentIndex: segmentIndex
          });
        } catch (error) {
          console.error("❌ TimerStore: Start subtask session error:", error);
          throw new Error("Failed to start subtask session");
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