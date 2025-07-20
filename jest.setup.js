// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native modules
jest.mock('react-native', () => ({
  StyleSheet: {
    create: jest.fn(styles => styles),
  },
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

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

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};