import React from 'react';
import { render } from '@testing-library/react-native';
import AddTaskScreen from '../app/add-task';

// Mock the API utils
jest.mock('../utils/api', () => ({
  getDynamicQuestions: jest.fn(),
  generateEnhancedSubtasks: jest.fn(),
  generatePlan: jest.fn(),
  generateUnifiedLearningPlan: jest.fn(),
  convertUnifiedPlanToAppFormat: jest.fn(),
  evaluateInputQualitySafely: jest.fn(),
  estimateTaskDuration: jest.fn(),
  estimateSubtaskDuration: jest.fn(),
}));

// Mock the scheduling utils
jest.mock('../utils/scheduling', () => ({
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

// Mock the time utils
jest.mock('../utils/timeUtils', () => ({
  calculateDaysUntil: jest.fn(() => 7),
  getTimeConstraintLevel: jest.fn(() => 'moderate'),
  getTimeConstraintMessage: jest.fn(() => 'You have 7 days to complete this task'),
}));

describe('AddTaskScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByText, getByTestId } = render(<AddTaskScreen />);
    
    // Check if basic elements are rendered
    expect(getByText('Subtasks')).toBeTruthy();
    expect(getByTestId('smart-generate-button')).toBeTruthy();
  });

  it('displays difficulty options', () => {
    const { getByText } = render(<AddTaskScreen />);
    
    // These are translation keys, so they should match what t() returns
    expect(getByText('difficulty.easy')).toBeTruthy();
    expect(getByText('difficulty.medium')).toBeTruthy();
    expect(getByText('difficulty.hard')).toBeTruthy();
  });

  it('displays priority options', () => {
    const { getByText } = render(<AddTaskScreen />);
    
    expect(getByText('priority.low')).toBeTruthy();
    expect(getByText('priority.medium')).toBeTruthy();
    expect(getByText('priority.high')).toBeTruthy();
  });

  it('shows auto-schedule option when enabled', () => {
    const { getByText } = render(<AddTaskScreen />);
    
    expect(getByText('AI Auto-Schedule')).toBeTruthy();
  });
});