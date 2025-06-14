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
            scheduledTasks: state.scheduledTasks.filter((st) => st.taskId !== id),
            learningNotes: state.learningNotes.filter((note) => note.taskId !== id),
            reviewTasks: state.reviewTasks.filter((rt) => rt.originalSubtaskId?.split('_')[0] !== id),
          }));
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
            scheduledTasks: state.scheduledTasks.filter((st) => st.taskId !== taskId),
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
    }),
    {
      name: "task-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);