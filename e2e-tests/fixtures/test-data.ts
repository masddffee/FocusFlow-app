/**
 * Test data fixtures for FocusFlow E2E tests
 */

export const testTasks = {
  simple: {
    title: 'Simple Test Task',
    description: 'A basic task for testing',
    priority: 'medium' as const,
    category: 'work',
    estimatedTime: 30,
  },
  
  highPriority: {
    title: 'High Priority Task',
    description: 'An urgent task that needs immediate attention',
    priority: 'high' as const,
    category: 'urgent',
    estimatedTime: 60,
    dueDate: '2024-12-31',
  },
  
  withSubtasks: {
    title: 'Complex Task with Subtasks',
    description: 'A task that will have multiple subtasks',
    priority: 'medium' as const,
    category: 'project',
    estimatedTime: 120,
    subtasks: [
      'Research and gather information',
      'Create initial draft',
      'Review and refine',
      'Final submission',
    ],
  },
  
  learning: {
    title: 'Learning Task',
    description: 'A task focused on learning and spaced repetition',
    priority: 'medium' as const,
    category: 'learning',
    estimatedTime: 45,
    learningPlan: {
      proficiencyLevel: 'beginner',
      reviewIntervals: [1, 3, 7, 14, 30],
    },
  },
  
  recurring: {
    title: 'Daily Recurring Task',
    description: 'A task that repeats daily',
    priority: 'low' as const,
    category: 'habit',
    estimatedTime: 15,
    recurring: {
      frequency: 'daily',
      interval: 1,
    },
  },
};

export const testUsers = {
  default: {
    name: 'Test User',
    email: 'test@example.com',
    language: 'en' as const,
    timezone: 'UTC',
    preferences: {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      soundEnabled: true,
      notificationsEnabled: true,
      darkMode: false,
    },
  },
  
  chinese: {
    name: '测试用户',
    email: 'test.zh@example.com',
    language: 'zh' as const,
    timezone: 'Asia/Shanghai',
    preferences: {
      focusDuration: 30,
      shortBreakDuration: 10,
      longBreakDuration: 20,
      sessionsUntilLongBreak: 3,
      soundEnabled: false,
      notificationsEnabled: true,
      darkMode: true,
    },
  },
  
  powerUser: {
    name: 'Power User',
    email: 'power@example.com',
    language: 'en' as const,
    timezone: 'America/New_York',
    preferences: {
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 30,
      sessionsUntilLongBreak: 2,
      soundEnabled: true,
      notificationsEnabled: true,
      darkMode: true,
    },
  },
};

export const testSessions = {
  shortFocus: {
    type: 'focus',
    duration: 5, // 5 minutes for testing
    taskId: 'test-task-1',
    notes: 'Test focus session',
  },
  
  longFocus: {
    type: 'focus',
    duration: 25,
    taskId: 'test-task-2',
    notes: 'Long focus session for testing',
  },
  
  shortBreak: {
    type: 'break',
    duration: 5,
    notes: 'Short break test',
  },
  
  longBreak: {
    type: 'break',
    duration: 15,
    notes: 'Long break test',
  },
};

export const testSchedules = {
  morning: {
    startTime: '09:00',
    endTime: '12:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    tasks: [testTasks.simple, testTasks.learning],
  },
  
  afternoon: {
    startTime: '14:00',
    endTime: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    tasks: [testTasks.highPriority, testTasks.withSubtasks],
  },
  
  evening: {
    startTime: '19:00',
    endTime: '21:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    tasks: [testTasks.recurring],
  },
};

export const testNotifications = {
  taskReminder: {
    type: 'task-reminder',
    title: 'Task Reminder',
    message: 'Don\'t forget to complete your task!',
    scheduledTime: '10:00',
  },
  
  breakReminder: {
    type: 'break-reminder',
    title: 'Break Time',
    message: 'Time to take a break!',
    scheduledTime: '14:30',
  },
  
  sessionComplete: {
    type: 'session-complete',
    title: 'Session Complete',
    message: 'Great job! You completed your focus session.',
  },
};

export const testApiResponses = {
  taskAnalysis: {
    status: 'success',
    data: {
      complexity: 'medium',
      estimatedTime: 45,
      suggestedBreakdown: [
        'Research phase (15 min)',
        'Implementation phase (20 min)',
        'Testing phase (10 min)',
      ],
      learningPlan: {
        proficiencyLevel: 'beginner',
        reviewSchedule: [1, 3, 7, 14, 30],
        concepts: ['concept1', 'concept2', 'concept3'],
      },
    },
  },
  
  subtaskGeneration: {
    status: 'success',
    data: {
      subtasks: [
        {
          title: 'Research requirements',
          description: 'Gather information about the task requirements',
          estimatedTime: 15,
          priority: 'high',
        },
        {
          title: 'Create implementation plan',
          description: 'Plan the steps for implementation',
          estimatedTime: 10,
          priority: 'high',
        },
        {
          title: 'Execute the plan',
          description: 'Implement the planned solution',
          estimatedTime: 30,
          priority: 'medium',
        },
        {
          title: 'Test and validate',
          description: 'Test the implementation and validate results',
          estimatedTime: 15,
          priority: 'medium',
        },
      ],
    },
  },
  
  learningPlan: {
    status: 'success',
    data: {
      plan: {
        title: 'Learning Plan for Test Task',
        proficiencyLevel: 'beginner',
        estimatedCompletionTime: 60,
        phases: [
          {
            phase: 'introduction',
            duration: 15,
            activities: ['Read overview', 'Watch introduction video'],
          },
          {
            phase: 'practice',
            duration: 30,
            activities: ['Complete exercises', 'Practice examples'],
          },
          {
            phase: 'review',
            duration: 15,
            activities: ['Review concepts', 'Self-assessment'],
          },
        ],
        reviewSchedule: [1, 3, 7, 14, 30],
      },
    },
  },
  
  error: {
    status: 'error',
    message: 'API request failed',
    code: 'API_ERROR',
  },
  
  networkError: {
    status: 'error',
    message: 'Network connection failed',
    code: 'NETWORK_ERROR',
  },
};

export const testLocalStorage = {
  empty: {},
  
  withTasks: {
    'focusflow-tasks': JSON.stringify([
      { id: '1', ...testTasks.simple, createdAt: new Date().toISOString() },
      { id: '2', ...testTasks.highPriority, createdAt: new Date().toISOString() },
    ]),
    'focusflow-settings': JSON.stringify(testUsers.default.preferences),
  },
  
  withSessions: {
    'focusflow-sessions': JSON.stringify([
      {
        id: '1',
        ...testSessions.shortFocus,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        completed: true,
      },
      {
        id: '2',
        ...testSessions.longFocus,
        startTime: new Date().toISOString(),
        completed: false,
      },
    ]),
  },
  
  withUserData: {
    'focusflow-user': JSON.stringify(testUsers.default),
    'focusflow-settings': JSON.stringify(testUsers.default.preferences),
    'focusflow-tasks': JSON.stringify([
      { id: '1', ...testTasks.simple, createdAt: new Date().toISOString() },
    ]),
  },
};

export const testUrls = {
  home: '/',
  tasks: '/tasks',
  focus: '/focus',
  stats: '/stats',
  profile: '/profile',
  addTask: '/add-task',
  taskDetail: '/task-detail',
  learningFeedback: '/learning-feedback',
};

export const testSelectors = {
  common: {
    loading: '[data-testid="loading"]',
    error: '[data-testid="error"]',
    toast: '[data-testid="toast"]',
    modal: '[data-testid="modal"]',
    button: '[data-testid="button"]',
    input: '[data-testid="input"]',
    select: '[data-testid="select"]',
    checkbox: '[data-testid="checkbox"]',
    radioButton: '[data-testid="radio-button"]',
    dropdown: '[data-testid="dropdown"]',
    tab: '[data-testid="tab"]',
    card: '[data-testid="card"]',
    list: '[data-testid="list"]',
    listItem: '[data-testid="list-item"]',
  },
  
  navigation: {
    tabBar: '[data-testid="tab-bar"]',
    tabHome: '[data-testid="tab-home"]',
    tabTasks: '[data-testid="tab-tasks"]',
    tabStats: '[data-testid="tab-stats"]',
    tabProfile: '[data-testid="tab-profile"]',
    backButton: '[data-testid="back-button"]',
    menuButton: '[data-testid="menu-button"]',
  },
  
  forms: {
    form: '[data-testid="form"]',
    formField: '[data-testid="form-field"]',
    formLabel: '[data-testid="form-label"]',
    formError: '[data-testid="form-error"]',
    submitButton: '[data-testid="submit-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    resetButton: '[data-testid="reset-button"]',
  },
};

export const testTimeouts = {
  short: 1000,
  medium: 5000,
  long: 10000,
  veryLong: 30000,
  apiRequest: 30000,
  navigation: 10000,
  animation: 2000,
  loading: 15000,
};

export const testViewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
};

export const testEnvironments = {
  development: {
    baseUrl: 'http://localhost:8080',
    apiUrl: 'http://localhost:8080/api',
    timeout: testTimeouts.long,
  },
  
  staging: {
    baseUrl: 'https://staging.focusflow.app',
    apiUrl: 'https://staging.focusflow.app/api',
    timeout: testTimeouts.veryLong,
  },
  
  production: {
    baseUrl: 'https://focusflow.app',
    apiUrl: 'https://focusflow.app/api',
    timeout: testTimeouts.veryLong,
  },
};