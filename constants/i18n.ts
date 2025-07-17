import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 英文翻譯
const en = {
  // Tab Navigation
  tabs: {
    home: 'Home',
    tasks: 'Tasks',
    stats: 'Stats',
    profile: 'Profile'
  },
  
  // Home Screen
  home: {
    title: 'Today\'s Schedule',
    welcome: 'Welcome back!',
    noTasks: 'No tasks scheduled for today',
    addFirstTask: 'Add your first task',
    todayProgress: 'Today\'s Progress',
    upcomingTasks: 'Upcoming Tasks',
    completedTasks: 'Completed Tasks'
  },

  // Tasks Screen
  tasks: {
    title: 'Tasks',
    allTasks: 'All Tasks',
    pending: 'Pending',
    completed: 'Completed',
    overdue: 'Overdue',
    addTask: 'Add Task',
    noTasks: 'No tasks found',
    createFirst: 'Create your first task to get started',
    schedule: 'Schedule',
    filters: 'Filters',
    sortBy: 'Sort by',
    dueDate: 'Due Date',
    priority: 'Priority',
    difficulty: 'Difficulty',
    category: 'Category',
    weekView: 'Week View',
    listView: 'List View',
    noScheduledTasks: 'No scheduled tasks',
    rescheduled: 'Task rescheduled successfully',
    rescheduleError: 'Failed to reschedule task',
    aiRescheduleSuccess: '🤖 AI Reschedule Successful',
    aiRescheduleFailure: '❌ Unable to Reschedule',
    viewSuggestions: 'View Suggestions',
    optimizationSuggestions: 'Optimization Suggestions',
    extendDeadline: 'Extend Deadline',
    originalTime: 'Original',
    newTime: 'New time',
    suggestions: 'Suggestions:',
    systemError: 'System Error',
    rescheduleErrorMessage: 'An error occurred during rescheduling. Please try again later.',
    durationCompressionWarning: '⚠️ Duration Compression Warning',
    taskTooLong: 'Task Too Long for Available Slots',
    splitTaskRecommendation: 'Consider splitting this task into smaller segments',
    durationValidationFailed: 'Duration validation failed',
    usingOriginalDuration: 'Using original estimated duration'
  },

  // Stats Screen
  stats: {
    title: 'Statistics',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    focusTime: 'Focus Time',
    tasksCompleted: 'Tasks Completed',
    distractions: 'Distractions',
    sessions: 'Sessions',
    todayProgress: 'Today\'s Progress',
    productivityTips: 'Productivity Tips',
    generate: 'Generate',
    insights: 'Insights',
    streaks: 'Streaks',
    goals: 'Goals',
    achievements: 'Achievements'
  },

  // Add Task Screen
  addTask: {
    title: 'Add Task',
    editTitle: 'Edit Task',
    taskTitle: 'Task Title',
    taskTitlePlaceholder: 'What do you need to accomplish?',
    description: 'Description (Optional)',
    descriptionPlaceholder: 'Add details about this task...',
    dueDate: 'Due Date (Optional)',
    dueDatePlaceholder: 'Select due date for dynamic range calculation',
    priority: 'Priority',
    difficulty: 'Difficulty',
    subtasks: 'Subtasks',
    smartGenerate: 'Smart Generate',
    addSubtask: 'Add a subtask...',
    createTask: 'Create & Schedule Task',
    updateTask: 'Update Task',
    save: 'Save',
    aiDetectedType: 'AI Detected Task Type',
    autoSchedule: 'AI Auto-Schedule',
    autoScheduleDesc: 'Automatically estimate duration and find the best time slot based on your availability, task priority, and deadline',
    schedulingMode: 'Scheduling Mode',
    startNextDay: 'Start Next Day',
    totalEstimatedTime: 'Total estimated time: {{minutes}} minutes ({{hours}} hours)',
    phaseDistribution: 'Learning Phase Distribution'
  },

  // Task Detail Screen
  taskDetail: {
    title: 'Task Details',
    startFocus: 'Start Focus',
    edit: 'Edit',
    delete: 'Delete',
    markComplete: 'Mark Complete',
    markIncomplete: 'Mark Incomplete',
    subtasks: 'Subtasks',
    progress: 'Progress',
    timeSpent: 'Time Spent',
    estimatedTime: 'Estimated Time',
    actualTime: 'Actual Time',
    notes: 'Notes',
    resources: 'Resources',
    dependencies: 'Dependencies',
    schedule: 'Schedule',
    reschedule: 'Reschedule'
  },
  
  // View modes
  viewMode: {
    day: 'Day',
    week: 'Week',
    month: 'Month'
  },

  // Focus Screen
  focus: {
    title: 'Focus Session',
    focusSession: 'Focus Session',
    focusTime: 'Focus Time',
    paused: 'Paused',
    readyToStart: 'Ready to Start',
    loadingTask: 'Loading task...',
    sessionComplete: 'Session Complete!',
    sessionCompleteMessage: 'Great job! Would you like to record what you learned?',
    skipFeedback: 'Skip',
    recordLearning: 'Record Learning',
    stopSession: 'Stop Session',
    stopSessionMessage: 'Are you sure you want to stop this focus session?',
    stopAndSave: 'Stop & Save',
    resetTimer: 'Reset Timer',
    resetTimerMessage: 'Are you sure you want to reset the timer?',
    reset: 'Reset',
    progress: 'Progress',
    timeSpent: 'Time Spent',
    remaining: 'Remaining',
    segment: 'Segment',
  },
  
  // Profile Screen
  profile: {
    title: 'Profile',
    notifications: 'Notifications',
    notificationsDesc: 'Enable Notifications',
    calendar: 'Calendar',
    calendarSync: 'Sync with Calendar',
    studySchedule: 'Study Schedule',
    availableTimeSlots: 'Available Time Slots',
    timeSlotsDesc: '{{hours}}h per week configured',
    autoScheduling: 'Auto-Scheduling',
    autoSchedulingDesc: 'Automatically schedule tasks in available slots',
    focusTimer: 'Focus Timer',
    defaultFocusDuration: 'Default Focus Duration',
    defaultBreakDuration: 'Default Break Duration',
    companion: 'Companion',
    companionType: 'Companion Type',
    companionTheme: 'Companion Theme',
    appearance: 'Appearance',
    language: 'Language',
    languageDesc: 'App Language',
    darkMode: 'Dark Mode',
    soundHaptics: 'Sound & Haptics',
    soundEffects: 'Sound Effects',
    vibration: 'Vibration',
    app: 'App',
    resetOnboarding: 'Reset Onboarding',
    version: 'FocusFlow v1.0.0',
    configure: 'Configure',
    account: 'Account',
    backup: 'Backup & Sync',
    privacy: 'Privacy',
    help: 'Help & Support'
  },

  // Language Options
  languages: {
    english: 'English',
    chinese: '繁體中文'
  },

  // Priority Levels
  priority: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    critical: 'Critical'
  },

  // Difficulty Levels
  difficulty: {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert'
  },

  // Task Categories
  categories: {
    work: 'Work',
    study: 'Study',
    personal: 'Personal',
    health: 'Health',
    hobby: 'Hobby',
    social: 'Social',
    finance: 'Finance',
    home: 'Home'
  },

  // Task Types
  taskTypes: {
    general: 'General Task',
    exam_preparation: 'Exam Preparation',
    skill_learning: 'Skill Learning',
    project_completion: 'Project Completion',
    habit_building: 'Habit Building',
    challenge: 'Challenge'
  },

  // Learning Phases
  phases: {
    knowledge: 'Knowledge',
    practice: 'Practice',
    application: 'Application',
    reflection: 'Reflection',
    output: 'Output',
    review: 'Review'
  },
  
  // Companion Types
  companionTypes: {
    plant: 'Plant',
    animal: 'Animal',
    landscape: 'Landscape'
  },
  
  // Companion Themes
  companionThemes: {
    forest: 'Forest',
    ocean: 'Ocean',
    space: 'Space',
    desert: 'Desert'
  },
  
  // Time Durations
  timeUnits: {
    minutes: '{{count}} min',
    hours: '{{count}}h',
    hourMinutes: '{{hours}}h {{minutes}}m',
    seconds: '{{count}} sec',
    days: '{{count}} days',
    weeks: '{{count}} weeks'
  },

  // Schedule
  schedule: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    noSchedule: 'No scheduled tasks',
    reschedule: 'Reschedule',
    timeSlot: 'Time Slot',
    duration: 'Duration',
    startTime: 'Start Time',
    endTime: 'End Time',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    scheduled: 'Scheduled',
    unscheduled: 'Unscheduled',
    hours: 'Hours'
  },

  // Onboarding
  onboarding: {
    welcome: 'Welcome to FocusFlow',
    getStarted: 'Get Started',
    skip: 'Skip',
    next: 'Next',
    complete: 'Complete Setup',
    step1Title: 'Welcome to FocusFlow',
    step1Desc: 'Your AI-powered productivity assistant that transforms vague tasks into clear, actionable subtasks.',
    step2Title: 'Create Your Account',
    step2Desc: 'Set up your account to personalize your experience and sync your data across devices securely.',
    step3Title: 'Configure Study Schedule',
    step3Desc: 'Configure your available time slots for each day. Our AI will use this to automatically schedule your tasks.',
    step4Title: 'Enable Notifications',
    step4Desc: 'Get intelligent reminders for upcoming tasks, focus sessions, and break times.',
    step5Title: 'Calendar Integration',
    step5Desc: 'Connect your calendar to analyze your free time and avoid scheduling conflicts.',
    step6Title: 'Ready to Start',
    step6Desc: 'Your personalized productivity workspace is ready. Start by creating your first task.'
  },

  // Modals
  modals: {
    personalization: {
      title: 'Help us personalize your plan',
      subtitle: 'Answer a few questions to get specific, actionable subtasks tailored to your needs',
      generatePlan: 'Generate Plan',
      cancel: 'Cancel',
      required: 'Required'
    },
    learningPlan: {
      title: 'Your Personalized Learning Plan',
      subtitle: 'A comprehensive plan based on your goals and preferences',
      achievableGoal: 'Achievable Goal',
      recommendedTools: 'Recommended Tools & Resources',
      progressCheckpoints: 'Progress Checkpoints',
      skillBreakdown: 'Skill Development Plan',
      generatedSubtasks: 'Generated Subtasks',
      gotIt: 'Got it!'
    },
    qualityAlert: {
      title: 'Help Us Personalize Your Plan',
      message: 'To generate the most effective subtasks with dynamic range calculation, we need a bit more information.',
      improve: 'Help me improve',
      skipForNow: 'Skip for now'
    }
  },

  // Messages and Notifications
  messages: {
    taskCreated: 'Task created successfully',
    taskUpdated: 'Task updated successfully',
    taskDeleted: 'Task deleted successfully',
    taskCompleted: 'Task completed!',
    sessionStarted: 'Focus session started',
    sessionPaused: 'Session paused',
    sessionCompleted: 'Session completed successfully',
    breakStarted: 'Break time started',
    dataSync: 'Data synchronized',
    errorOccurred: 'An error occurred',
    networkError: 'Network connection error',
    retry: 'Retry',
    dismiss: 'Dismiss'
  },
  
  // Alerts and Dialogs
  alerts: {
    notificationPermission: 'Notification Permission',
    notificationMessage: 'Please enable notifications in your device settings to receive reminders.',
    calendarPermission: 'Calendar Permission',
    calendarMessage: 'Please enable calendar access in your device settings to sync your tasks.',
    resetOnboardingTitle: 'Reset Onboarding',
    resetOnboardingMessage: 'Are you sure you want to reset the onboarding process? You will see the introduction screens again next time you open the app.',
    deleteTaskTitle: 'Delete Task',
    deleteTaskMessage: 'Are you sure you want to delete this task? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    reset: 'Reset',
    confirm: 'Confirm',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    focusDurationTitle: 'Focus Duration',
    focusDurationMessage: 'Select default focus session duration',
    breakDurationTitle: 'Break Duration',
    breakDurationMessage: 'Select default break duration',
    companionTypeTitle: 'Companion Type',
    companionTypeMessage: 'Select your focus companion',
    companionThemeTitle: 'Companion Theme',
    companionThemeMessage: 'Select your companion theme',
    languageTitle: 'Change Language',
    languageMessage: 'Select your preferred language. All interface and task content will be translated.',
    languageChanged: 'Language Changed',
    languageChangedMessage: 'Interface and all task content have been translated to English.',
    translationWarning: 'Translation Warning',
    translationWarningMessage: 'Language changed but some task content may not have been translated. Please check your tasks.',
    restartRequired: 'Restart Required',
    restartRequiredMessage: 'Please restart the app to ensure all content is properly translated to your selected language.',
    autoRestartMessage: 'The app will restart automatically to complete the language change. Restart now?',
    manualRestartMessage: 'Please manually close and reopen the app to complete the language change.',
    restartNow: 'Restart Now'
  },
  
  // Time Slot Modal
  timeSlotModal: {
    title: 'Study Schedule',
    description: 'Set your available study times for each day of the week. The app will use these slots to automatically schedule your tasks and focus sessions.',
    close: 'Close',
    addTimeSlot: 'Add Time Slot',
    removeTimeSlot: 'Remove Time Slot',
    copyToAll: 'Copy to All Days',
    totalHours: 'Total Hours'
  },

  // Days of Week
  days: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun'
  },

  // Months
  months: {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    may_short: 'May',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Oct',
    nov: 'Nov',
    dec: 'Dec'
  },
  
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    close: 'Close',
    start: 'Start',
    stop: 'Stop',
    pause: 'Pause',
    resume: 'Resume',
    continue: 'Continue',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    complete: 'Complete',
    incomplete: 'Incomplete',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    update: 'Update',
    create: 'Create',
    select: 'Select',
    clear: 'Clear',
    apply: 'Apply',
    reset: 'Reset',
    settings: 'Settings',
    help: 'Help',
    about: 'About',
    part: 'Part',
    task: 'Task'
  },

  // Error Messages
  errors: {
    required: 'This field is required',
    invalid: 'Invalid input',
    networkError: 'Network connection error',
    serverError: 'Server error occurred',
    timeout: 'Request timeout',
    notFound: 'Not found',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    validationError: 'Validation error',
    unknownError: 'Unknown error occurred',
    taskNotFound: 'Task Not Found',
    taskNotFoundMessage: 'The selected task could not be found.',
    timerStartFailed: 'Failed to Start Timer',
    timerStartFailedMessage: 'Could not start the focus session. Please try again.',
    startTimerFailed: 'Failed to Start',
    startTimerFailedMessage: 'Could not start focus session. Please try again.',
    pauseTimerFailed: 'Failed to Pause',
    pauseTimerFailedMessage: 'Could not pause the timer.',
    resumeTimerFailed: 'Failed to Resume',
    resumeTimerFailedMessage: 'Could not resume the timer.',
    stopTimerFailed: 'Failed to Stop',
    stopTimerFailedMessage: 'Could not stop the timer.',
    resetTimerFailed: 'Failed to Reset',
    resetTimerFailedMessage: 'Could not reset the timer.',
  }
};

// 繁體中文翻譯
const zh = {
  // Tab Navigation
  tabs: {
    home: '首頁',
    tasks: '任務',
    stats: '統計',
    profile: '個人檔案'
  },
  
  // Home Screen
  home: {
    title: '今日行程',
    welcome: '歡迎回來！',
    noTasks: '今日沒有安排任務',
    addFirstTask: '新增您的第一個任務',
    todayProgress: '今日進度',
    upcomingTasks: '即將到來的任務',
    completedTasks: '已完成任務'
  },

  // Tasks Screen
  tasks: {
    title: '任務',
    allTasks: '所有任務',
    pending: '待完成',
    completed: '已完成',
    overdue: '已逾期',
    addTask: '新增任務',
    noTasks: '找不到任務',
    createFirst: '建立您的第一個任務以開始使用',
    schedule: '排程',
    filters: '篩選',
    sortBy: '排序方式',
    dueDate: '截止日期',
    priority: '優先級',
    difficulty: '難度',
    category: '分類',
    weekView: '週檢視',
    listView: '清單檢視',
    noScheduledTasks: '沒有排程任務',
    rescheduled: '任務已成功重新排程',
    rescheduleError: '重新排程任務失敗',
    aiRescheduleSuccess: '🤖 AI 重新排程成功',
    aiRescheduleFailure: '❌ 無法重新排程',
    viewSuggestions: '查看建議',
    optimizationSuggestions: '優化建議',
    extendDeadline: '延長截止日期',
    originalTime: '原時間',
    newTime: '新時間',
    suggestions: '建議：',
    systemError: '系統錯誤',
    rescheduleErrorMessage: '重新排程時發生錯誤，請稍後再試。',
    durationCompressionWarning: '⚠️ 時間壓縮警告',
    taskTooLong: '任務時間超出可用時段',
    splitTaskRecommendation: '建議將此任務分割為較小的片段',
    durationValidationFailed: '時間驗證失敗',
    usingOriginalDuration: '使用原始預估時間'
  },

  // Stats Screen
  stats: {
    title: '統計',
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    focusTime: '專注時間',
    tasksCompleted: '已完成任務',
    distractions: '分心次數',
    sessions: '專注時段',
    todayProgress: '今日進度',
    productivityTips: '生產力建議',
    generate: '生成',
    insights: '深度分析',
    streaks: '連續紀錄',
    goals: '目標',
    achievements: '成就'
  },

  // Add Task Screen
  addTask: {
    title: '新增任務',
    editTitle: '編輯任務',
    taskTitle: '任務標題',
    taskTitlePlaceholder: '您需要完成什麼？',
    description: '描述（選填）',
    descriptionPlaceholder: '新增關於此任務的詳細資訊...',
    dueDate: '截止日期（選填）',
    dueDatePlaceholder: '選擇截止日期以進行動態範圍計算',
    priority: '優先級',
    difficulty: '難度',
    subtasks: '子任務',
    smartGenerate: '智能生成',
    addSubtask: '新增子任務...',
    createTask: '建立並排程任務',
    updateTask: '更新任務',
    save: '儲存',
    aiDetectedType: 'AI 偵測任務類型',
    autoSchedule: 'AI 自動排程',
    autoScheduleDesc: '根據您的可用時間、任務優先級和截止日期自動估算時長並找到最佳時間段',
    schedulingMode: '排程模式',
    startNextDay: '從隔天開始',
    totalEstimatedTime: '預估總時間：{{minutes}} 分鐘（{{hours}} 小時）',
    phaseDistribution: '學習階段分佈'
  },

  // Task Detail Screen
  taskDetail: {
    title: '任務詳情',
    startFocus: '開始專注',
    edit: '編輯',
    delete: '刪除',
    markComplete: '標記為完成',
    markIncomplete: '標記為未完成',
    subtasks: '子任務',
    progress: '進度',
    timeSpent: '已花費時間',
    estimatedTime: '預估時間',
    actualTime: '實際時間',
    notes: '筆記',
    resources: '資源',
    dependencies: '依賴項目',
    schedule: '排程',
    reschedule: '重新排程'
  },
  
  // View modes
  viewMode: {
    day: '日',
    week: '週',
    month: '月'
  },

  // Focus Screen
  focus: {
    title: '專注時間',
    focusSession: '專注時間',
    focusTime: '專注中',
    paused: '已暫停',
    readyToStart: '準備開始',
    loadingTask: '載入任務中...',
    sessionComplete: '完成專注時間！',
    sessionCompleteMessage: '做得很好！您想記錄學到的內容嗎？',
    skipFeedback: '跳過',
    recordLearning: '記錄學習',
    stopSession: '停止專注',
    stopSessionMessage: '您確定要停止這次專注時間嗎？',
    stopAndSave: '停止並儲存',
    resetTimer: '重置計時器',
    resetTimerMessage: '您確定要重置計時器嗎？',
    reset: '重置',
    progress: '進度',
    timeSpent: '已花費時間',
    remaining: '剩餘時間',
    segment: '片段',
  },
  
  // Profile Screen
  profile: {
    title: '個人檔案',
    notifications: '通知',
    notificationsDesc: '啟用通知',
    calendar: '行事曆',
    calendarSync: '同步行事曆',
    studySchedule: '學習時程',
    availableTimeSlots: '可用時間段',
    timeSlotsDesc: '每週已配置 {{hours}} 小時',
    autoScheduling: '自動排程',
    autoSchedulingDesc: '在可用時間段自動安排任務',
    focusTimer: '專注計時器',
    defaultFocusDuration: '預設專注時長',
    defaultBreakDuration: '預設休息時長',
    companion: '陪伴夥伴',
    companionType: '夥伴類型',
    companionTheme: '夥伴主題',
    appearance: '外觀',
    language: '語言',
    languageDesc: '應用程式語言',
    darkMode: '深色模式',
    soundHaptics: '聲音和觸覺回饋',
    soundEffects: '音效',
    vibration: '振動',
    app: '應用程式',
    resetOnboarding: '重置引導',
    version: 'FocusFlow v1.0.0',
    configure: '配置',
    account: '帳戶',
    backup: '備份與同步',
    privacy: '隱私',
    help: '幫助與支援'
  },

  // Language Options
  languages: {
    english: 'English',
    chinese: '繁體中文'
  },

  // Priority Levels
  priority: {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '緊急',
    critical: '關鍵'
  },

  // Difficulty Levels
  difficulty: {
    easy: '簡單',
    medium: '中等',
    hard: '困難',
    expert: '專家'
  },

  // Task Categories
  categories: {
    work: '工作',
    study: '學習',
    personal: '個人',
    health: '健康',
    hobby: '興趣',
    social: '社交',
    finance: '財務',
    home: '家庭'
  },

  // Task Types
  taskTypes: {
    general: '一般任務',
    exam_preparation: '考試準備',
    skill_learning: '技能學習',
    project_completion: '專案完成',
    habit_building: '習慣培養',
    challenge: '挑戰'
  },

  // Learning Phases
  phases: {
    knowledge: '知識',
    practice: '練習',
    application: '應用',
    reflection: '反思',
    output: '輸出',
    review: '複習'
  },
  
  // Companion Types
  companionTypes: {
    plant: '植物',
    animal: '動物',
    landscape: '風景'
  },
  
  // Companion Themes
  companionThemes: {
    forest: '森林',
    ocean: '海洋',
    space: '太空',
    desert: '沙漠'
  },
  
  // Time Durations
  timeUnits: {
    minutes: '{{count}} 分鐘',
    hours: '{{count}} 小時',
    hourMinutes: '{{hours}} 小時 {{minutes}} 分鐘',
    seconds: '{{count}} 秒',
    days: '{{count}} 天',
    weeks: '{{count}} 週'
  },

  // Schedule
  schedule: {
    today: '今天',
    tomorrow: '明天',
    thisWeek: '本週',
    nextWeek: '下週',
    noSchedule: '沒有排程任務',
    reschedule: '重新排程',
    timeSlot: '時間段',
    duration: '時長',
    startTime: '開始時間',
    endTime: '結束時間',
    day: '日',
    week: '週',
    month: '月',
    morning: '上午',
    afternoon: '下午',
    evening: '晚上',
    scheduled: '已排程',
    unscheduled: '未排程',
    hours: '小時'
  },

  // Onboarding
  onboarding: {
    welcome: '歡迎使用 FocusFlow',
    getStarted: '開始使用',
    skip: '跳過',
    next: '下一步',
    complete: '完成設定',
    step1Title: '歡迎使用 FocusFlow',
    step1Desc: '您的 AI 驅動生產力助手，將模糊的任務轉化為清晰、可執行的子任務。',
    step2Title: '建立您的帳戶',
    step2Desc: '設定您的帳戶以個人化您的體驗，並在裝置間安全地同步您的資料。',
    step3Title: '配置學習時程',
    step3Desc: '配置您每天的可用時間段。我們的 AI 將使用這些資訊自動安排您的任務。',
    step4Title: '啟用通知',
    step4Desc: '獲得即將到來的任務、專注時段和休息時間的智能提醒。',
    step5Title: '行事曆整合',
    step5Desc: '連接您的行事曆以分析您的空閒時間並避免排程衝突。',
    step6Title: '準備開始',
    step6Desc: '您的個人化生產力工作區已準備就緒。先建立您的第一個任務開始吧。'
  },

  // Modals
  modals: {
    personalization: {
      title: '幫助我們個人化您的計劃',
      subtitle: '回答幾個問題以獲得針對您需求量身定制的具體、可執行的子任務',
      generatePlan: '生成計劃',
      cancel: '取消',
      required: '必填'
    },
    learningPlan: {
      title: '您的個人化學習計劃',
      subtitle: '基於您的目標和偏好的綜合計劃',
      achievableGoal: '可實現目標',
      recommendedTools: '推薦工具與資源',
      progressCheckpoints: '進度檢查點',
      skillBreakdown: '技能發展計劃',
      generatedSubtasks: '生成的子任務',
      gotIt: '了解！'
    },
    qualityAlert: {
      title: '幫助我們個人化您的計劃',
      message: '為了生成最有效的子任務並進行動態範圍計算，我們需要更多資訊。',
      improve: '幫助我改善',
      skipForNow: '暫時跳過'
    }
  },

  // Messages and Notifications
  messages: {
    taskCreated: '任務建立成功',
    taskUpdated: '任務更新成功',
    taskDeleted: '任務刪除成功',
    taskCompleted: '任務完成！',
    sessionStarted: '專注時段已開始',
    sessionPaused: '時段已暫停',
    sessionCompleted: '時段成功完成',
    breakStarted: '休息時間開始',
    dataSync: '資料已同步',
    errorOccurred: '發生錯誤',
    networkError: '網路連線錯誤',
    retry: '重試',
    dismiss: '關閉'
  },
  
  // Alerts and Dialogs
  alerts: {
    notificationPermission: '通知權限',
    notificationMessage: '請在裝置設定中啟用通知以接收提醒。',
    calendarPermission: '行事曆權限',
    calendarMessage: '請在裝置設定中啟用行事曆存取以同步您的任務。',
    resetOnboardingTitle: '重置引導',
    resetOnboardingMessage: '您確定要重置引導流程嗎？下次開啟應用程式時會再次顯示介紹畫面。',
    deleteTaskTitle: '刪除任務',
    deleteTaskMessage: '您確定要刪除此任務嗎？此操作無法復原。',
    cancel: '取消',
    delete: '刪除',
    reset: '重置',
    confirm: '確認',
    ok: '確定',
    yes: '是',
    no: '否',
    focusDurationTitle: '專注時長',
    focusDurationMessage: '選擇預設專注時長',
    breakDurationTitle: '休息時長',
    breakDurationMessage: '選擇預設休息時長',
    companionTypeTitle: '夥伴類型',
    companionTypeMessage: '選擇您的專注夥伴',
    companionThemeTitle: '夥伴主題',
    companionThemeMessage: '選擇您的夥伴主題',
    languageTitle: '變更語言',
    languageMessage: '選擇您偏好的語言。所有介面和任務內容都將被翻譯。',
    languageChanged: '語言已變更',
    languageChangedMessage: '介面和所有任務內容已翻譯成繁體中文。',
    translationWarning: '翻譯警告',
    translationWarningMessage: '語言已變更，但部分任務內容可能尚未翻譯。請檢查您的任務。',
    restartRequired: '需要重啟',
    restartRequiredMessage: '請重啟應用程式以確保所有內容都正確翻譯為您選擇的語言。',
    autoRestartMessage: '應用程式將自動重啟以完成語言變更。立即重啟？',
    manualRestartMessage: '請手動關閉並重新開啟應用程式以完成語言變更。',
    restartNow: '立即重啟'
  },
  
  // Time Slot Modal
  timeSlotModal: {
    title: '學習時程',
    description: '設定您每週每天的可用學習時間。應用程式將使用這些時間段自動安排您的任務和專注時間。',
    close: '關閉',
    addTimeSlot: '新增時間段',
    removeTimeSlot: '移除時間段',
    copyToAll: '複製到所有天',
    totalHours: '總時數'
  },

  // Days of Week
  days: {
    monday: '星期一',
    tuesday: '星期二',
    wednesday: '星期三',
    thursday: '星期四',
    friday: '星期五',
    saturday: '星期六',
    sunday: '星期日',
    mon: '一',
    tue: '二',
    wed: '三',
    thu: '四',
    fri: '五',
    sat: '六',
    sun: '日'
  },

  // Months
  months: {
    january: '一月',
    february: '二月',
    march: '三月',
    april: '四月',
    may: '五月',
    june: '六月',
    july: '七月',
    august: '八月',
    september: '九月',
    october: '十月',
    november: '十一月',
    december: '十二月',
    jan: '1月',
    feb: '2月',
    mar: '3月',
    apr: '4月',
    may_short: '5月',
    jun: '6月',
    jul: '7月',
    aug: '8月',
    sep: '9月',
    oct: '10月',
    nov: '11月',
    dec: '12月'
  },
  
  // Common
  common: {
    save: '儲存',
    cancel: '取消',
    done: '完成',
    edit: '編輯',
    delete: '刪除',
    add: '新增',
    close: '關閉',
    start: '開始',
    stop: '停止',
    pause: '暫停',
    resume: '繼續',
    continue: '繼續',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    finish: '完成',
    complete: '完成',
    incomplete: '未完成',
    loading: '載入中...',
    error: '錯誤',
    success: '成功',
    warning: '警告',
    info: '資訊',
    search: '搜尋',
    filter: '篩選',
    sort: '排序',
    refresh: '重新整理',
    update: '更新',
    create: '建立',
    select: '選擇',
    clear: '清除',
    apply: '套用',
    reset: '重置',
    settings: '設定',
    help: '幫助',
    about: '關於',
    part: '部分',
    task: '任務'
  },

  // Error Messages
  errors: {
    required: '此欄位為必填',
    invalid: '無效輸入',
    networkError: '網路連線錯誤',
    serverError: '伺服器錯誤',
    timeout: '請求逾時',
    notFound: '找不到',
    unauthorized: '未授權存取',
    forbidden: '存取被禁止',
    validationError: '驗證錯誤',
    unknownError: '發生未知錯誤',
    taskNotFound: '找不到任務',
    taskNotFoundMessage: '找不到所選的任務。',
    timerStartFailed: '無法啟動計時器',
    timerStartFailedMessage: '無法開始專注時間，請重試。',
    startTimerFailed: '啟動失敗',
    startTimerFailedMessage: '無法開始專注時間，請重試。',
    pauseTimerFailed: '暫停失敗',
    pauseTimerFailedMessage: '無法暫停計時器。',
    resumeTimerFailed: '繼續失敗',
    resumeTimerFailedMessage: '無法繼續計時器。',
    stopTimerFailed: '停止失敗',
    stopTimerFailedMessage: '無法停止計時器。',
    resetTimerFailed: '重置失敗',
    resetTimerFailedMessage: '無法重置計時器。',
  }
};

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  }
};

// Async initialization function
const initializeI18n = async () => {
  try {
    // Try to get saved language preference from AsyncStorage
    const savedLanguage = await AsyncStorage.getItem('user-language');
    
    // Determine initial language
    let initialLanguage = 'en';
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
      initialLanguage = savedLanguage;
    } else {
      // Fallback to system locale detection
      const systemLocale = Localization.getLocales()?.[0]?.languageCode || 'en';
      initialLanguage = systemLocale.startsWith('zh') ? 'zh' : 'en';
    }

    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage,
        fallbackLng: ['en'], // Array format as required
        
        interpolation: {
          escapeValue: false
        },
        
        react: {
          useSuspense: false
        }
      });

    console.log('i18n initialized with language:', initialLanguage);
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Fallback initialization if AsyncStorage fails
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: 'en',
        fallbackLng: ['en'],
        
        interpolation: {
          escapeValue: false
        },
        
        react: {
          useSuspense: false
        }
      });
  }
};

// Initialize i18n
initializeI18n();

export default i18n; 