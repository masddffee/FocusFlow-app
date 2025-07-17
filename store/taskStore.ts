import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Task, TaskDifficulty, TaskCategory, EnhancedSubtask, ReviewTask, ReviewStatus } from "@/types/task";
import { ScheduledTask } from "@/types/timeSlot";
import { 
  scheduleReviewTasks, 
  updateSubtaskAfterReview, 
  getSubtasksDueForReview,
  getReviewStatistics 
} from "@/utils/spacedRepetition";
import { Platform } from 'react-native';
import { translateTaskContent } from '@/utils/ai';

interface LearningNote {
  id: string;
  taskId: string;
  sessionId: string;
  summary: string;
  questions: Array<{ question: string; answer: string }>;
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  scheduledTasks: ScheduledTask[];
  learningNotes: LearningNote[];
  reviewTasks: ReviewTask[];
  
  // Task management
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "completed">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
  updateSubtaskDuration: (taskId: string, subtaskId: string, duration: number) => void;
  
  // 🆕 子任務進度追蹤
  updateSubtaskProgress: (taskId: string, subtaskId: string, sessionDuration: number, notes?: string) => void;
  getSubtaskRemainingTime: (taskId: string, subtaskId: string) => number;
  initializeSubtaskProgress: (subtask: EnhancedSubtask) => EnhancedSubtask;
  
  // Task queries
  getTodayTasks: () => Task[];
  getUpcomingTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getTasksForDate: (date: Date) => Task[];
  
  // Scheduling
  addScheduledTask: (scheduledTask: ScheduledTask) => void;
  removeScheduledTask: (taskId: string) => void;
  updateScheduledTasks: (scheduledTasks: ScheduledTask[]) => void;
  getScheduledTasksForDate: (date: string) => ScheduledTask[];
  
  // 🆕 排程記錄清理和維護
  cleanupOrphanedScheduledTasks: () => void;
  validateScheduledTasks: () => { valid: ScheduledTask[]; orphaned: ScheduledTask[] };
  
  // Learning notes
  saveLearningNote: (note: Omit<LearningNote, "id" | "createdAt" | "updatedAt">) => void;
  updateLearningNote: (id: string, updates: Partial<LearningNote>) => void;
  getLearningNotesForTask: (taskId: string) => LearningNote[];
  deleteLearningNote: (id: string) => void;
  
  // Spaced repetition and review system
  generateReviewTasks: (taskId?: string) => void;
  completeReviewTask: (reviewTaskId: string, reviewQuality: number) => void;
  getReviewTasksForToday: () => ReviewTask[];
  getReviewStatisticsForTask: (taskId: string) => any;
  updateSubtaskReview: (taskId: string, subtaskId: string, reviewQuality: number) => void;
  getSubtasksDueForReview: (taskId: string) => EnhancedSubtask[];
  scheduleAutomaticReviews: () => void;

  // Add translation method
  translateAllTasks: (targetLanguage: "en" | "zh") => Promise<boolean>;
  // 🆕 動態重建可用時段索引，確保所有佔用狀態與 scheduledTasks 一致
  rebuildTimeAvailabilityIndex: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [
        // Sample tasks for demonstration
        {
          id: "1",
          title: "Team Standup",
          description: "Google Meet • Weekly project sync",
          dueDate: new Date().toISOString().split('T')[0],
          duration: 60,
          category: "work",
          priority: "medium",
          difficulty: "easy",
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          taskType: "general",
          subtasks: [
            {
              id: "subtask_1_1",
              title: "Progress Review",
              text: "Review previous week's progress and identify completed milestones",
              aiEstimatedDuration: 15,
              difficulty: "easy",
              order: 1,
              completed: false,
              skills: ["communication", "project management"],
              recommendedResources: ["Project dashboard", "Weekly reports", "Team notes"],
              prerequisites: [],
              phase: "knowledge",
              taskType: "general",
              reviewStatus: "not_started" as ReviewStatus,
            },
            {
              id: "subtask_1_2", 
              title: "Goal Setting",
              text: "Prepare current week's goals and prioritize upcoming tasks",
              aiEstimatedDuration: 20,
              difficulty: "medium",
              order: 2,
              completed: false,
              skills: ["planning", "goal setting"],
              recommendedResources: ["Task management system", "Priority matrix", "Team calendar"],
              prerequisites: ["subtask_1_1"],
              phase: "practice",
              taskType: "general",
              reviewStatus: "not_started" as ReviewStatus,
            },
          ],
        },
        {
          id: "2",
          title: "AP Calculus Exam Preparation",
          description: "Comprehensive preparation for AP Calculus AB exam",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          duration: 1800, // 30 hours total
          category: "study",
          priority: "high",
          difficulty: "hard",
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          taskType: "exam_preparation",
          currentProficiency: "intermediate",
          targetProficiency: "advanced",
          learningPace: "intensive",
          reviewSchedule: {
            enabled: true,
            nextReviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reviewInterval: 3,
            reviewCount: 0,
            masteryLevel: 0,
          },
          learningPlan: {
            achievableGoal: "Master AP Calculus AB concepts and achieve a score of 4 or 5 on the exam",
            recommendedTools: ["Khan Academy", "College Board AP Central", "Graphing Calculator", "Stewart Calculus Textbook"],
            checkpoints: ["Complete diagnostic assessment", "Master limits and continuity", "Excel at derivatives", "Understand integrals", "Pass practice exams"],
            taskType: "exam_preparation",
            estimatedTimeToCompletion: 120,
            reviewSchedule: {
              enabled: true,
              frequency: "weekly",
              reviewPercentage: 25,
            },
            subtasks: [
              {
                id: "subtask_2_1",
                title: "Diagnostic Assessment: Pre-Calculus Readiness",
                text: "Complete comprehensive diagnostic test covering algebra, trigonometry, and function analysis. Identify specific knowledge gaps and create targeted review plan.",
                aiEstimatedDuration: 90,
                difficulty: "medium",
                order: 1,
                completed: false,
                skills: ["self-assessment", "mathematical foundations", "gap analysis"],
                recommendedResources: ["Khan Academy: Pre-Calculus Assessment", "College Board Prerequisites", "Paul's Online Math Notes"],
                prerequisites: [],
                phase: "knowledge",
                taskType: "exam_preparation",
                reviewStatus: "not_started" as ReviewStatus,
              },
              {
                id: "subtask_2_2",
                title: "Limits Theory and Practice Problems",
                text: "Study formal definition of limits and solve 50 practice problems covering direct substitution, factoring, and L'Hôpital's rule applications.",
                aiEstimatedDuration: 180,
                difficulty: "hard",
                order: 2,
                completed: false,
                skills: ["limit calculation", "algebraic manipulation", "problem-solving"],
                recommendedResources: ["Stewart Calculus Chapter 2", "Khan Academy: Limits", "AP Central Practice Problems"],
                prerequisites: ["subtask_2_1"],
                phase: "practice",
                taskType: "exam_preparation",
                reviewStatus: "not_started" as ReviewStatus,
              },
              {
                id: "subtask_2_3",
                title: "AP Exam Simulation: Full Practice Test",
                text: "Complete full-length AP Calculus AB practice exam under timed conditions. Analyze performance and identify areas for final review.",
                aiEstimatedDuration: 300,
                difficulty: "hard",
                order: 3,
                completed: false,
                skills: ["exam strategy", "time management", "stress management", "performance analysis"],
                recommendedResources: ["College Board Practice Exams", "Timer", "AP Central Scoring Guidelines"],
                prerequisites: ["subtask_2_2"],
                phase: "output",
                taskType: "exam_preparation",
                reviewStatus: "not_started" as ReviewStatus,
              },
            ],
          },
          subtasks: [
            {
              id: "subtask_2_1",
              title: "Diagnostic Assessment: Pre-Calculus Readiness",
              text: "Complete comprehensive diagnostic test covering algebra, trigonometry, and function analysis. Identify specific knowledge gaps and create targeted review plan.",
              aiEstimatedDuration: 90,
              difficulty: "medium",
              order: 1,
              completed: false,
              skills: ["self-assessment", "mathematical foundations", "gap analysis"],
              recommendedResources: ["Khan Academy: Pre-Calculus Assessment", "College Board Prerequisites", "Paul's Online Math Notes"],
              prerequisites: [],
              phase: "knowledge",
              taskType: "exam_preparation",
              reviewStatus: "not_started" as ReviewStatus,
            },
            {
              id: "subtask_2_2",
              title: "Limits Theory and Practice Problems",
              text: "Study formal definition of limits and solve 50 practice problems covering direct substitution, factoring, and L'Hôpital's rule applications.",
              aiEstimatedDuration: 180,
              difficulty: "hard",
              order: 2,
              completed: false,
              skills: ["limit calculation", "algebraic manipulation", "problem-solving"],
              recommendedResources: ["Stewart Calculus Chapter 2", "Khan Academy: Limits", "AP Central Practice Problems"],
              prerequisites: ["subtask_2_1"],
              phase: "practice",
              taskType: "exam_preparation",
              reviewStatus: "not_started" as ReviewStatus,
            },
            {
              id: "subtask_2_3",
              title: "AP Exam Simulation: Full Practice Test",
              text: "Complete full-length AP Calculus AB practice exam under timed conditions. Analyze performance and identify areas for final review.",
              aiEstimatedDuration: 300,
              difficulty: "hard",
              order: 3,
              completed: false,
              skills: ["exam strategy", "time management", "stress management", "performance analysis"],
              recommendedResources: ["College Board Practice Exams", "Timer", "AP Central Scoring Guidelines"],
              prerequisites: ["subtask_2_2"],
              phase: "output",
              taskType: "exam_preparation",
              reviewStatus: "not_started" as ReviewStatus,
            },
          ],
        },
        {
          id: "3",
          title: "Learn React Native Development",
          description: "Build mobile app development skills for cross-platform applications",
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days from now
          duration: 2400, // 40 hours total
          category: "study",
          priority: "medium",
          difficulty: "hard",
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          taskType: "skill_learning",
          currentProficiency: "beginner",
          targetProficiency: "intermediate",
          learningPace: "moderate",
          reviewSchedule: {
            enabled: true,
            nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reviewInterval: 7,
            reviewCount: 0,
            masteryLevel: 0,
          },
          learningPlan: {
            achievableGoal: "Build and deploy a complete React Native mobile application with navigation, state management, and API integration",
            recommendedTools: ["React Native CLI", "Expo", "VS Code", "Android Studio", "Xcode"],
            checkpoints: ["Set up development environment", "Master React fundamentals", "Build first mobile app", "Implement navigation", "Deploy to app stores"],
            taskType: "skill_learning",
            estimatedTimeToCompletion: 200,
            reviewSchedule: {
              enabled: true,
              frequency: "weekly",
              reviewPercentage: 20,
            },
            subtasks: [
              {
                id: "subtask_3_1",
                title: "Development Environment Setup",
                text: "Install and configure React Native development environment including Node.js, React Native CLI, Android Studio, and Xcode. Create first Hello World app.",
                aiEstimatedDuration: 120,
                difficulty: "medium",
                order: 1,
                completed: false,
                skills: ["environment setup", "tool configuration", "basic app creation"],
                recommendedResources: ["React Native Official Docs", "Expo Documentation", "YouTube: React Native Setup Guide"],
                prerequisites: [],
                phase: "knowledge",
                taskType: "skill_learning",
                reviewStatus: "not_started" as ReviewStatus,
              },
              {
                id: "subtask_3_2",
                title: "React Fundamentals Practice",
                text: "Complete 20 React exercises covering components, props, state, and hooks. Build 3 small practice applications to reinforce concepts.",
                aiEstimatedDuration: 240,
                difficulty: "medium",
                order: 2,
                completed: false,
                skills: ["React components", "state management", "hooks", "props"],
                recommendedResources: ["React Official Tutorial", "FreeCodeCamp React Course", "React Hooks Documentation"],
                prerequisites: ["subtask_3_1"],
                phase: "practice",
                taskType: "skill_learning",
                reviewStatus: "not_started" as ReviewStatus,
              },
              {
                id: "subtask_3_3",
                title: "Portfolio App Development Project",
                text: "Design and build a complete portfolio mobile application showcasing React Native skills. Include navigation, API integration, and professional UI/UX design.",
                aiEstimatedDuration: 480,
                difficulty: "hard",
                order: 3,
                completed: false,
                skills: ["full-stack development", "UI/UX design", "API integration", "project management"],
                recommendedResources: ["React Navigation Docs", "REST API tutorials", "UI component libraries", "App design inspiration"],
                prerequisites: ["subtask_3_2"],
                phase: "application",
                taskType: "skill_learning",
                reviewStatus: "not_started" as ReviewStatus,
              },
            ],
          },
          subtasks: [
            {
              id: "subtask_3_1",
              title: "Development Environment Setup",
              text: "Install and configure React Native development environment including Node.js, React Native CLI, Android Studio, and Xcode. Create first Hello World app.",
              aiEstimatedDuration: 120,
              difficulty: "medium",
              order: 1,
              completed: false,
              skills: ["environment setup", "tool configuration", "basic app creation"],
              recommendedResources: ["React Native Official Docs", "Expo Documentation", "YouTube: React Native Setup Guide"],
              prerequisites: [],
              phase: "knowledge",
              taskType: "skill_learning",
              reviewStatus: "not_started" as ReviewStatus,
            },
            {
              id: "subtask_3_2",
              title: "React Fundamentals Practice",
              text: "Complete 20 React exercises covering components, props, state, and hooks. Build 3 small practice applications to reinforce concepts.",
              aiEstimatedDuration: 240,
              difficulty: "medium",
              order: 2,
              completed: false,
              skills: ["React components", "state management", "hooks", "props"],
              recommendedResources: ["React Official Tutorial", "FreeCodeCamp React Course", "React Hooks Documentation"],
              prerequisites: ["subtask_3_1"],
              phase: "practice",
              taskType: "skill_learning",
              reviewStatus: "not_started" as ReviewStatus,
            },
            {
              id: "subtask_3_3",
              title: "Portfolio App Development Project",
              text: "Design and build a complete portfolio mobile application showcasing React Native skills. Include navigation, API integration, and professional UI/UX design.",
              aiEstimatedDuration: 480,
              difficulty: "hard",
              order: 3,
              completed: false,
              skills: ["full-stack development", "UI/UX design", "API integration", "project management"],
              recommendedResources: ["React Navigation Docs", "REST API tutorials", "UI component libraries", "App design inspiration"],
              prerequisites: ["subtask_3_2"],
              phase: "application",
              taskType: "skill_learning",
              reviewStatus: "not_started" as ReviewStatus,
            },
          ],
        },
      ],
      scheduledTasks: [
        {
          taskId: "1",
          date: new Date().toISOString().split('T')[0],
          timeSlot: { start: "09:00", end: "10:00" },
          duration: 60,
        },
        {
          taskId: "2",
          date: new Date().toISOString().split('T')[0],
          timeSlot: { start: "10:30", end: "12:00" },
          duration: 90,
        },
        {
          taskId: "3",
          date: new Date().toISOString().split('T')[0],
          timeSlot: { start: "14:00", end: "14:45" },
          duration: 45,
        },
      ],
      learningNotes: [],
      reviewTasks: [],
      
      addTask: (taskData) => {
        try {
          const now = new Date().toISOString();
          const newTask: Task = {
            id: Date.now().toString(),
            ...taskData,
            completed: false,
            createdAt: now,
            updatedAt: now,
          };
          
          set((state) => ({
            tasks: [...state.tasks, newTask],
          }));
          
          // 🆕 新增任務後清理無效的排程記錄
          setTimeout(() => {
            get().cleanupOrphanedScheduledTasks();
          }, 100);
        } catch (error) {
          console.error("Add task error:", error);
          throw error;
        }
      },
      
      updateTask: (id, updates) => {
        try {
          set((state) => ({
            tasks: state.tasks.map((task) => 
              task.id === id 
                ? { 
                    ...task, 
                    ...updates, 
                    updatedAt: new Date().toISOString() 
                  } 
                : task
            ),
          }));
        } catch (error) {
          console.error("Update task error:", error);
          throw error;
        }
      },
      
      deleteTask: (id) => {
        try {
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          }));
          // 🆕 同步移除所有相關的排程記錄（含子任務/片段）
          get().removeScheduledTask(id);
          // 🆕 重新建立可用時段索引，確保時段釋放
          if (typeof get().rebuildTimeAvailabilityIndex === 'function') {
            get().rebuildTimeAvailabilityIndex();
          }
        } catch (error) {
          console.error("Delete task error:", error);
          throw error;
        }
      },
      
      toggleTaskCompletion: (id) => {
        try {
          set((state) => {
            const updatedTasks = state.tasks.map((task) => {
              if (task.id === id) {
                const updatedTask = { 
                  ...task, 
                  completed: !task.completed,
                  updatedAt: new Date().toISOString() 
                };
                
                // If task is being completed and has review enabled, schedule reviews
                if (!task.completed && updatedTask.completed && task.reviewSchedule?.enabled) {
                  // Schedule automatic reviews for this task
                  setTimeout(() => {
                    get().generateReviewTasks(id);
                  }, 100);
                }
                
                return updatedTask;
              }
              return task;
            });
            
            return { tasks: updatedTasks };
          });
        } catch (error) {
          console.error("Toggle task completion error:", error);
          throw error;
        }
      },

      toggleSubtaskCompletion: (taskId, subtaskId) => {
        try {
          set((state) => ({
            tasks: state.tasks.map((task) => 
              task.id === taskId 
                ? {
                    ...task,
                    subtasks: task.subtasks?.map((subtask) => {
                      if (subtask.id === subtaskId) {
                        const updatedSubtask: EnhancedSubtask = { 
                          ...subtask, 
                          completed: !subtask.completed,
                          completedAt: !subtask.completed ? new Date().toISOString() : undefined,
                          reviewStatus: (!subtask.completed ? "learning" : "not_started") as ReviewStatus
                        };
                        
                        // Initialize spaced repetition if completing for first time
                        if (!subtask.completed && updatedSubtask.completed && !subtask.spacedRepetition) {
                          const { initializeSpacedRepetition } = require('@/utils/spacedRepetition');
                          updatedSubtask.spacedRepetition = initializeSpacedRepetition();
                        }
                        
                        return updatedSubtask;
                      }
                      return subtask;
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }));
        } catch (error) {
          console.error("Toggle subtask completion error:", error);
          throw error;
        }
      },

      updateSubtaskDuration: (taskId, subtaskId, duration) => {
        try {
          set((state) => ({
            tasks: state.tasks.map((task) => 
              task.id === taskId 
                ? {
                    ...task,
                    subtasks: task.subtasks?.map((subtask) =>
                      subtask.id === subtaskId
                        ? { ...subtask, userEstimatedDuration: duration }
                        : subtask
                    ),
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }));
        } catch (error) {
          console.error("Update subtask duration error:", error);
          throw error;
        }
      },

      // 🆕 子任務進度追蹤方法實現
      updateSubtaskProgress: (taskId: string, subtaskId: string, sessionDuration: number, notes?: string) => {
        try {
          set((state) => ({
            tasks: state.tasks.map((task) => 
              task.id === taskId 
                ? {
                    ...task,
                    subtasks: task.subtasks?.map((subtask) => {
                      if (subtask.id === subtaskId) {
                        // 🔧 導入並使用安全的時長更新函數
                        const { updateSubtaskProgress } = require('@/utils/subtaskProgress');
                        const updatedSubtask = updateSubtaskProgress(subtask, Math.floor(sessionDuration / 60), notes);
                        
                        return {
                          ...updatedSubtask,
                          lastStudiedAt: new Date().toISOString(),
                          studyNotes: notes ? [...(subtask.studyNotes || []), notes] : subtask.studyNotes
                        };
                      }
                      return subtask;
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }));
        } catch (error) {
          console.error("Update subtask progress error:", error);
          throw error;
        }
      },

      getSubtaskRemainingTime: (taskId: string, subtaskId: string) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === taskId);
          if (!task || !task.subtasks) return 0;
          
          const subtask = task.subtasks.find(s => s.id === subtaskId);
          if (!subtask) return 0;
          
          // 🔧 使用安全的時長獲取函數
          const { getSubtaskRemainingTime } = require('@/utils/subtaskProgress');
          return getSubtaskRemainingTime(subtask);
        } catch (error) {
          console.error("Get subtask remaining time error:", error);
          return 0;
        }
      },

      initializeSubtaskProgress: (subtask: EnhancedSubtask) => {
        try {
          // 🔧 使用新的初始化函數
          const { initializeSubtaskProgress } = require('@/utils/subtaskProgress');
          return initializeSubtaskProgress(subtask);
        } catch (error) {
          console.error("Initialize subtask progress error:", error);
          return subtask;
        }
      },
      
      getTodayTasks: () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return get().tasks.filter((task) => {
            if (!task.dueDate) return false;
            
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            return taskDate.getTime() === today.getTime() && !task.completed;
          });
        } catch (error) {
          console.error("Get today tasks error:", error);
          return [];
        }
      },
      
      getUpcomingTasks: () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return get().tasks.filter((task) => {
            if (!task.dueDate) return false;
            
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            return taskDate.getTime() > today.getTime() && !task.completed;
          });
        } catch (error) {
          console.error("Get upcoming tasks error:", error);
          return [];
        }
      },
      
      getCompletedTasks: () => {
        try {
          return get().tasks.filter((task) => task.completed);
        } catch (error) {
          console.error("Get completed tasks error:", error);
          return [];
        }
      },
      
      getTasksForDate: (date: Date) => {
        try {
          const targetDate = new Date(date);
          targetDate.setHours(0, 0, 0, 0);
          
          return get().tasks.filter((task) => {
            if (!task.dueDate) return false;
            
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            return taskDate.getTime() === targetDate.getTime();
          });
        } catch (error) {
          console.error("Get tasks for date error:", error);
          return [];
        }
      },
      
      addScheduledTask: (scheduledTask) => {
        try {
          set((state) => ({
            scheduledTasks: [...state.scheduledTasks, scheduledTask],
          }));
        } catch (error) {
          console.error("Add scheduled task error:", error);
          throw error;
        }
      },
      
      removeScheduledTask: (taskId) => {
        try {
          set((state) => ({
            // 🆕 修正：支援移除所有相關的排程記錄，包括子任務和片段
            scheduledTasks: state.scheduledTasks.filter((st) => {
              // 精確匹配
              if (st.taskId === taskId) return false;
              
              // 如果提供的 taskId 是主任務ID，清理所有相關子任務
              if (st.taskId.includes('_') && st.taskId.split('_')[0] === taskId) return false;
              
              // 如果提供的 taskId 是子任務ID，清理對應的片段
              if (taskId.includes('_') && st.taskId.includes(taskId)) {
                // 檢查是否為該子任務的片段
                if (st.taskId.startsWith(`${taskId}_segment_`) || st.taskId === taskId) {
                  return false;
                }
              }
              
              return true;
            }),
          }));
        } catch (error) {
          console.error("Remove scheduled task error:", error);
          throw error;
        }
      },
      
      updateScheduledTasks: (scheduledTasks) => {
        try {
          set({ scheduledTasks });
        } catch (error) {
          console.error("Update scheduled tasks error:", error);
          throw error;
        }
      },
      
      getScheduledTasksForDate: (date: string) => {
        try {
          return get().scheduledTasks.filter((st) => st.date === date);
        } catch (error) {
          console.error("Get scheduled tasks for date error:", error);
          return [];
        }
      },

      saveLearningNote: (noteData) => {
        try {
          const now = new Date().toISOString();
          const newNote: LearningNote = {
            id: Date.now().toString(),
            ...noteData,
            createdAt: now,
            updatedAt: now,
          };
          
          set((state) => ({
            learningNotes: [...state.learningNotes, newNote],
          }));
        } catch (error) {
          console.error("Save learning note error:", error);
          throw error;
        }
      },

      updateLearningNote: (id, updates) => {
        try {
          set((state) => ({
            learningNotes: state.learningNotes.map((note) =>
              note.id === id
                ? { ...note, ...updates, updatedAt: new Date().toISOString() }
                : note
            ),
          }));
        } catch (error) {
          console.error("Update learning note error:", error);
          throw error;
        }
      },

      getLearningNotesForTask: (taskId) => {
        try {
          return get().learningNotes.filter((note) => note.taskId === taskId);
        } catch (error) {
          console.error("Get learning notes for task error:", error);
          return [];
        }
      },

      deleteLearningNote: (id) => {
        try {
          set((state) => ({
            learningNotes: state.learningNotes.filter((note) => note.id !== id),
          }));
        } catch (error) {
          console.error("Delete learning note error:", error);
          throw error;
        }
      },

      // Spaced repetition and review system methods
      generateReviewTasks: (taskId) => {
        try {
          const state = get();
          let tasksToProcess = taskId ? [state.tasks.find(t => t.id === taskId)].filter(Boolean) : state.tasks;
          
          tasksToProcess.forEach(task => {
            if (task && task.subtasks && task.reviewSchedule?.enabled) {
              const completedSubtasks = task.subtasks.filter(s => s.completed && !s.isReviewTask);
              const reviewPercentage = task.learningPlan?.reviewSchedule?.reviewPercentage || 20;
              
              const newReviewTasks = scheduleReviewTasks(completedSubtasks, reviewPercentage);
              
              set((state) => ({
                reviewTasks: [...state.reviewTasks, ...newReviewTasks],
              }));
            }
          });
        } catch (error) {
          console.error("Generate review tasks error:", error);
        }
      },

      completeReviewTask: (reviewTaskId, reviewQuality) => {
        try {
          set((state) => {
            const reviewTask = state.reviewTasks.find(rt => rt.id === reviewTaskId);
            if (!reviewTask) return state;

            // Mark review task as completed
            const updatedReviewTasks = state.reviewTasks.map(rt =>
              rt.id === reviewTaskId
                ? { ...rt, completed: true, reviewQuality }
                : rt
            );

            // Update the original subtask's spaced repetition data
            const updatedTasks = state.tasks.map(task => ({
              ...task,
              subtasks: task.subtasks?.map(subtask => {
                if (subtask.id === reviewTask.originalSubtaskId) {
                  return updateSubtaskAfterReview(subtask, reviewQuality);
                }
                return subtask;
              }),
              updatedAt: new Date().toISOString()
            }));

            return {
              reviewTasks: updatedReviewTasks,
              tasks: updatedTasks,
            };
          });
        } catch (error) {
          console.error("Complete review task error:", error);
        }
      },

      getReviewTasksForToday: () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          return get().reviewTasks.filter(rt => 
            rt.scheduledDate <= today && !rt.completed
          );
        } catch (error) {
          console.error("Get review tasks for today error:", error);
          return [];
        }
      },

      getReviewStatisticsForTask: (taskId) => {
        try {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task || !task.subtasks) return null;
          
          return getReviewStatistics(task.subtasks);
        } catch (error) {
          console.error("Get review statistics error:", error);
          return null;
        }
      },

      updateSubtaskReview: (taskId, subtaskId, reviewQuality) => {
        try {
          set((state) => ({
            tasks: state.tasks.map((task) => 
              task.id === taskId 
                ? {
                    ...task,
                    subtasks: task.subtasks?.map((subtask) => {
                      if (subtask.id === subtaskId) {
                        return updateSubtaskAfterReview(subtask, reviewQuality);
                      }
                      return subtask;
                    }),
                    updatedAt: new Date().toISOString()
                  }
                : task
            ),
          }));
        } catch (error) {
          console.error("Update subtask review error:", error);
        }
      },

      getSubtasksDueForReview: (taskId) => {
        try {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task || !task.subtasks) return [];
          
          return getSubtasksDueForReview(task.subtasks);
        } catch (error) {
          console.error("Get subtasks due for review error:", error);
          return [];
        }
      },

      scheduleAutomaticReviews: () => {
        try {
          const state = get();
          const educationalTasks = state.tasks.filter(task => 
            task.reviewSchedule?.enabled && 
            (task.taskType === "skill_learning" || task.taskType === "exam_preparation")
          );
          
          educationalTasks.forEach(task => {
            get().generateReviewTasks(task.id);
          });
        } catch (error) {
          console.error("Schedule automatic reviews error:", error);
        }
      },

             // 🆕 排程記錄清理和維護
       cleanupOrphanedScheduledTasks: () => {
         try {
           const state = get();
           const today = new Date().toISOString().split('T')[0];
           
           // 保留：1. 未完成的任務，2. 未過截止日期的任務
           const validTaskIds = new Set(state.tasks
             .filter(task => !task.completed || (task.dueDate && task.dueDate >= today))
             .map(task => task.id)
           );
           
           // 過濾掉無效的排程記錄：
           // 1. 主任務不存在
           // 2. 子任務的主任務不存在
           // 3. 片段任務的主任務不存在
           const validScheduledTasks = state.scheduledTasks.filter(st => {
             // 提取主任務 ID
             const mainTaskId = st.taskId.includes('_') ? st.taskId.split('_')[0] : st.taskId;
             return validTaskIds.has(mainTaskId);
           });
           
           if (validScheduledTasks.length !== state.scheduledTasks.length) {
             const cleanedCount = state.scheduledTasks.length - validScheduledTasks.length;
             console.log(`Cleaned up ${cleanedCount} orphaned scheduled task records`);
             set({ scheduledTasks: validScheduledTasks });
           }
         } catch (error) {
           console.error("Cleanup orphaned scheduled tasks error:", error);
         }
       },

       validateScheduledTasks: () => {
         try {
           const state = get();
           const today = new Date().toISOString().split('T')[0];
           
           const validTaskIds = new Set(state.tasks
             .filter(task => !task.completed || (task.dueDate && task.dueDate >= today))
             .map(task => task.id)
           );
           
           const validScheduledTasks = state.scheduledTasks.filter(st => {
             const mainTaskId = st.taskId.includes('_') ? st.taskId.split('_')[0] : st.taskId;
             return validTaskIds.has(mainTaskId);
           });
           
           const orphanedTasks = state.scheduledTasks.filter(st => {
             const mainTaskId = st.taskId.includes('_') ? st.taskId.split('_')[0] : st.taskId;
             return !validTaskIds.has(mainTaskId);
           });
           
           return { valid: validScheduledTasks, orphaned: orphanedTasks };
         } catch (error) {
           console.error("Validate scheduled tasks error:", error);
           return { valid: [], orphaned: [] };
        }
      },

      // Add translation method
      translateAllTasks: async (targetLanguage: "en" | "zh") => {
        try {
          const currentTasks = get().tasks;
          const translatedTasks = await translateTaskContent(currentTasks, targetLanguage);
          
          set({ 
            tasks: translatedTasks
          });
          
          return true;
        } catch (error) {
          console.error("Failed to translate tasks:", error);
          return false;
        }
      },
      // 🆕 動態重建可用時段索引，確保所有佔用狀態與 scheduledTasks 一致
      rebuildTimeAvailabilityIndex: () => {
        try {
          // 取得所有已排程任務
          const scheduledTasks = get().scheduledTasks;
          // 動態計算所有被佔用的時段
          const { getTrueOccupiedTimeSlots } = require('@/utils/scheduling');
          const occupied = getTrueOccupiedTimeSlots(scheduledTasks);
          // 若有 useSettingsStore，則同步 blockedTimeSlots 或 availableTimeSlots
          try {
            const { useSettingsStore } = require('@/store/settingsStore');
            if (useSettingsStore && typeof useSettingsStore.getState === 'function') {
              // 假設有 setBlockedTimeSlots 或 setAvailableTimeSlots 方法
              // 這裡僅作為佔位，實際根據你的 store 結構調整
              // useSettingsStore.getState().setBlockedTimeSlots?.(occupied);
              // 或根據 occupied 計算新的 availableTimeSlots 再 setAvailableTimeSlots
            }
          } catch (e) {
            // 無法同步到 settingsStore 時忽略
          }
        } catch (error) {
          console.error("Rebuild time availability index error:", error);
        }
      },
    }),
    {
      name: "task-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// 跨平台事件管理器
class CrossPlatformEventManager {
  private listeners: { [key: string]: Function[] } = {};

  addEventListener(eventName: string, callback: Function) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  removeEventListener(eventName: string, callback: Function) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }
  }

  dispatchEvent(eventName: string, detail: any) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => {
        try {
          callback({ detail });
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }
}

// 創建全局事件管理器
const globalEventManager = new CrossPlatformEventManager();

// 設置全局引用供 TimerStore 使用 - 跨平台兼容
(globalThis as any).__taskStore = {
  getSubtaskRemainingTime: (taskId: string, subtaskId: string) => {
    return useTaskStore.getState().getSubtaskRemainingTime(taskId, subtaskId);
  }
};

// 設置全局事件管理器
(globalThis as any).__eventManager = globalEventManager;

// 監聽來自 TimerStore 的進度更新請求 - React Native 兼容
globalEventManager.addEventListener('updateSubtaskProgress', (event: any) => {
  const { taskId, subtaskId, sessionDuration, notes } = event.detail;
  try {
    useTaskStore.getState().updateSubtaskProgress(taskId, subtaskId, sessionDuration, notes);
  } catch (error) {
    console.error('Subtask progress update error:', error);
  }
});

// 🆕 在應用啟動時自動清理無效的排程記錄
setTimeout(() => {
  try {
    const taskStore = useTaskStore.getState();
    const { valid, orphaned } = taskStore.validateScheduledTasks();
    
    if (orphaned.length > 0) {
      console.log(`Found ${orphaned.length} orphaned scheduled task records on startup`);
      taskStore.cleanupOrphanedScheduledTasks();
      console.log(`Cleaned up orphaned scheduled tasks on startup`);
    } else {
      console.log(`All ${valid.length} scheduled task records are valid`);
    }
  } catch (error) {
    console.error('Initial scheduled tasks cleanup error:', error);
  }
}, 500); // 延遲執行，確保 Store 完全初始化