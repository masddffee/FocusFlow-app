// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native modules
jest.mock('react-native', () => ({
  StyleSheet: {
    create: jest.fn(styles => styles),
    flatten: jest.fn(styles => styles || {}),
    absoluteFill: {},
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Modal: 'Modal',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  // Add Touchable mock for react-native-svg compatibility
  Touchable: {
    Mixin: {},
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask',
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const mockIcon = () => 'MockIcon';
  return {
    Plus: mockIcon,
    Trash2: mockIcon,
    Save: mockIcon,
    Zap: mockIcon,
    Brain: mockIcon,
    HelpCircle: mockIcon,
    ArrowRight: mockIcon,
    Clock: mockIcon,
    Edit3: mockIcon,
    Lightbulb: mockIcon,
    MessageCircle: mockIcon,
    AlertCircle: mockIcon,
    BookOpen: mockIcon,
    ExternalLink: mockIcon,
    Calendar: mockIcon,
    Home: mockIcon,
    User: mockIcon,
    Settings: mockIcon,
    Search: mockIcon,
    Menu: mockIcon,
    X: mockIcon,
    Check: mockIcon,
    ChevronRight: mockIcon,
    ChevronLeft: mockIcon,
    ChevronUp: mockIcon,
    ChevronDown: mockIcon,
  };
});

// Mock expo modules
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  Stack: {
    Screen: ({ children }) => children,
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock Zustand stores
jest.mock('./store/taskStore', () => ({
  useTaskStore: () => ({
    tasks: [],
    addTask: jest.fn(),
    updateTask: jest.fn(),
    scheduledTasks: [],
    addScheduledTask: jest.fn(),
  }),
}));

jest.mock('./store/settingsStore', () => ({
  useSettingsStore: () => ({
    availableTimeSlots: [],
    autoSchedulingEnabled: true,
    language: 'en',
  }),
}));

// Mock custom components
jest.mock('./components/Button', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const MockButton = ({ children, title, onPress, testID, ...props }) => {
    // Handle both children and title props
    const text = children || title || 'Button';
    return React.createElement(Text, { testID }, `MockButton(${text})`);
  };
  return MockButton;
});

jest.mock('./components/DatePicker', () => {
  const MockDatePicker = ({ value, onChange, ...props }) => {
    return 'MockDatePicker';
  };
  return MockDatePicker;
});

jest.mock('./components/TaskItem', () => {
  const MockTaskItem = ({ task, ...props }) => {
    return `MockTaskItem(${task?.title || 'Unknown'})`;
  };
  return MockTaskItem;
});

jest.mock('./components/ScheduleItem', () => {
  const MockScheduleItem = ({ item, ...props }) => {
    return `MockScheduleItem(${item?.title || 'Unknown'})`;
  };
  return MockScheduleItem;
});

jest.mock('./components/LoadingScreen', () => {
  const MockLoadingScreen = ({ message, ...props }) => {
    return `MockLoadingScreen(${message || 'Loading...'})`;
  };
  return MockLoadingScreen;
});

jest.mock('./components/ErrorBoundary', () => {
  const MockErrorBoundary = ({ children, ...props }) => {
    return children;
  };
  return MockErrorBoundary;
});

jest.mock('./components/FocusTimer', () => {
  const MockFocusTimer = ({ duration, onComplete, ...props }) => {
    return `MockFocusTimer(${duration})`;
  };
  return MockFocusTimer;
});

jest.mock('./components/ProgressChart', () => {
  const MockProgressChart = ({ data, ...props }) => {
    return 'MockProgressChart';
  };
  return MockProgressChart;
});

jest.mock('./components/WeekCalendar', () => {
  const MockWeekCalendar = ({ tasks, onDateSelect, ...props }) => {
    return 'MockWeekCalendar';
  };
  return MockWeekCalendar;
});

jest.mock('./components/TimeSlotPicker', () => {
  const MockTimeSlotPicker = ({ availableSlots, onSelect, ...props }) => {
    return 'MockTimeSlotPicker';
  };
  return MockTimeSlotPicker;
});

jest.mock('./components/WheelTimePicker', () => {
  const MockWheelTimePicker = ({ value, onChange, ...props }) => {
    return 'MockWheelTimePicker';
  };
  return MockWheelTimePicker;
});

jest.mock('./components/ReflectionModal', () => {
  const MockReflectionModal = ({ visible, onClose, ...props }) => {
    return visible ? 'MockReflectionModal' : null;
  };
  return MockReflectionModal;
});

jest.mock('./components/CompanionView', () => {
  const MockCompanionView = ({ message, mood, ...props }) => {
    return `MockCompanionView(${message || 'Default message'})`;
  };
  return MockCompanionView;
});

jest.mock('./components/OnboardingStep', () => {
  const MockOnboardingStep = ({ step, onNext, ...props }) => {
    return `MockOnboardingStep(${step})`;
  };
  return MockOnboardingStep;
});

jest.mock('./components/WebCompatibleIcons', () => ({
  WebPlus: () => 'WebPlus',
  WebTrash: () => 'WebTrash',
  WebSave: () => 'WebSave',
  WebZap: () => 'WebZap',
  WebBrain: () => 'WebBrain',
}));

// Mock constants
jest.mock('./constants/colors', () => {
  const colors = {
    light: {
      primary: '#007AFF',
      background: '#FFFFFF',
      card: '#F2F2F7',
      text: '#000000',
      border: '#C6C6C8',
      notification: '#FF3B30',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
    },
    dark: {
      primary: '#0A84FF',
      background: '#000000',
      card: '#1C1C1E',
      text: '#FFFFFF',
      border: '#38383A',
      notification: '#FF453A',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
    },
  };
  return {
    default: colors,
    ...colors, // Also export directly for named imports
  };
});

jest.mock('./constants/theme', () => {
  const theme = {
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    radius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
    },
    typography: {
      sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
      },
      weights: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeights: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
      },
    },
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
    },
  };
  return {
    default: theme,
    ...theme, // Also export directly for named imports
  };
});

// Mock utility functions
jest.mock('./utils/scheduling', () => ({
  findAvailableTimeSlot: jest.fn(),
  scheduleSubtasks: jest.fn(),
  convertSubtaskSchedulesToTasks: jest.fn(),
  analyzeSchedulingFeasibility: jest.fn(),
  generateSchedulingSuggestions: jest.fn(),
  SCHEDULING_MODES: {
    flexible: { 
      mode: 'flexible', 
      description: '彈性模式',
      characteristics: ['彈性安排', '自動調整', '適應變化'],
      icon: '🔄',
      label: '彈性模式'
    },
    strict: { 
      mode: 'strict', 
      description: '嚴格模式',
      characteristics: ['固定時間', '精確安排', '嚴格執行'],
      icon: '⏰',
      label: '嚴格模式'
    },
  },
}));

jest.mock('./utils/timeUtils', () => ({
  calculateDaysUntil: jest.fn(() => 7),
  getTimeConstraintLevel: jest.fn(() => 'moderate'),
  getTimeConstraintMessage: jest.fn(() => 'You have 7 days to complete this task'),
  formatDuration: jest.fn((minutes) => `${minutes}m`),
  parseTimeString: jest.fn(),
}));

jest.mock('./utils/ai', () => ({
  generateLearningPlan: jest.fn(),
  generateSubtasks: jest.fn(),
  analyzeTaskComplexity: jest.fn(),
  suggestResources: jest.fn(),
}));

jest.mock('./utils/permissions', () => ({
  requestCalendarPermission: jest.fn(() => Promise.resolve(true)),
  requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
  checkPermissions: jest.fn(() => Promise.resolve({ calendar: true, notifications: true })),
}));

jest.mock('./utils/appRestart', () => ({
  restartApp: jest.fn(),
  isRestartRequired: jest.fn(() => false),
}));

jest.mock('./utils/subtaskProgress', () => ({
  calculateProgress: jest.fn(() => 0.5),
  updateProgress: jest.fn(),
  getProgressStats: jest.fn(() => ({ completed: 5, total: 10 })),
}));

jest.mock('./utils/spacedRepetition', () => ({
  calculateNextReview: jest.fn(),
  updateReviewSchedule: jest.fn(),
  getReviewsDue: jest.fn(() => []),
}));

// Mock types (for cases where types are imported dynamically)
jest.mock('./types/task', () => ({
  TaskDifficulty: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  },
  TaskPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  },
  LearningPhase: {
    KNOWLEDGE: 'knowledge',
    PRACTICE: 'practice',
    APPLICATION: 'application',
    REFLECTION: 'reflection',
    OUTPUT: 'output',
    REVIEW: 'review',
  },
  ProficiencyLevel: {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    EXPERT: 'expert',
  },
}));

// Mock API utilities
jest.mock('./utils/api', () => ({
  submitJob: jest.fn(),
  pollJobStatus: jest.fn(),
  cancelJob: jest.fn(),
  pollUntilComplete: jest.fn(),
  generateUnifiedLearningPlan: jest.fn(),
  generatePlan: jest.fn(),
  getDynamicQuestions: jest.fn(),
  generateEnhancedSubtasks: jest.fn(),
  apiRequest: jest.fn(),
  ApiError: jest.fn().mockImplementation((message, statusCode, code) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }),
  JOB_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
  },
  JOB_TYPES: {
    TASK_PLANNING: 'task_planning',
    PERSONALIZATION: 'personalization',
    SUBTASK_GENERATION: 'subtask_generation',
    LEARNING_PLAN: 'learning_plan',
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Setup global test utilities
global.createMockPromise = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};

// Error snapshot system
global.captureErrorSnapshot = (error, context) => {
  const snapshot = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    testInfo: {
      testPath: expect.getState().testPath,
      currentTestName: expect.getState().currentTestName,
    },
  };
  
  // In a real implementation, this would save to a file or send to a monitoring service
  console.error('[ERROR_SNAPSHOT]', JSON.stringify(snapshot, null, 2));
  return snapshot;
};

// Test data factories
global.testDataFactory = {
  createTask: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Task',
    description: 'Test task description',
    aiEstimatedDuration: 60,
    difficulty: 'medium',
    order: 1,
    completed: false,
    skills: ['testing', 'javascript'],
    recommendedResources: ['https://example.com/resource'],
    phase: 'knowledge',
    createdAt: '2025-01-20T12:00:00Z',
    updatedAt: '2025-01-20T12:00:00Z',
    ...overrides,
  }),
  
  createJobSubmissionResult: (overrides = {}) => ({
    jobId: '456e7890-e89b-12d3-a456-426614174111',
    type: 'task_planning',
    status: 'pending',
    estimatedDuration: 30000,
    message: '正在分析您的任務並規劃完整的學習路徑...',
    pollEndpoint: '/api/jobs/456e7890-e89b-12d3-a456-426614174111',
    createdAt: '2025-01-20T12:00:00Z',
    ...overrides,
  }),
  
  createJobStatusResult: (overrides = {}) => ({
    jobId: '456e7890-e89b-12d3-a456-426614174111',
    type: 'task_planning',
    status: 'completed',
    progress: {
      stage: 'completed',
      message: '處理完成！',
      percentage: 100,
    },
    result: {
      needsClarification: false,
      plan: {
        achievableGoal: 'Test goal',
        recommendedTools: ['Tool 1', 'Tool 2'],
        checkpoints: ['Checkpoint 1', 'Checkpoint 2'],
        estimatedTimeToCompletion: 120,
      },
      subtasks: [],
    },
    createdAt: Date.now() - 60000,
    startedAt: Date.now() - 30000,
    completedAt: Date.now(),
    runningTime: 30000,
    estimatedDuration: 30000,
    isDelayed: false,
    message: '處理完成！',
    ...overrides,
  }),
  
  createApiError: (message = 'Test error', statusCode = 500, code = 'TEST_ERROR') => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  },
  
  createGenerationParams: (overrides = {}) => ({
    title: 'Learn JavaScript',
    description: 'I want to learn JavaScript programming language',
    language: 'zh',
    clarificationResponses: {},
    ...overrides,
  }),
};

// Enhanced error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  global.captureErrorSnapshot(reason, { type: 'unhandledRejection', promise });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  global.captureErrorSnapshot(error, { type: 'uncaughtException' });
});

// Silence console warnings during tests (but keep errors for debugging)
const originalConsole = global.console;
global.console = {
  ...console,
  warn: jest.fn(),
  // Keep error for debugging purposes, but make it less noisy
  error: (...args) => {
    // Only log errors that are not related to our mocks
    if (!args.some(arg => typeof arg === 'string' && arg.includes('[ERROR_SNAPSHOT]'))) {
      originalConsole.error(...args);
    }
  },
};