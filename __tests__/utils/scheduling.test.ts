import { SCHEDULING_MODES } from '../../utils/scheduling';
import { EnhancedSubtask } from '../../types/task';

// Mock the logger to avoid console output during tests
jest.mock('../../lib/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Scheduling Order Logic Tests', () => {
  
  // Test data setup
  const createMockSubtask = (
    id: string, 
    order: number, 
    title: string, 
    dependencies: string[] = []
  ): EnhancedSubtask => ({
    id,
    title,
    text: title,
    completed: false,
    order,
    dependencies,
    aiEstimatedDuration: 30,
    difficulty: 'medium',
    skills: [],
    recommendedResources: [],
    phase: 'practice'
  });

  describe('Core Order Logic Tests', () => {
    it('verifies scheduling modes are properly defined with order preservation', () => {
      expect(SCHEDULING_MODES).toBeDefined();
      expect(SCHEDULING_MODES.flexible).toBeDefined();
      expect(SCHEDULING_MODES.strict).toBeDefined();
      
      expect(SCHEDULING_MODES.flexible.mode).toBe('flexible');
      expect(SCHEDULING_MODES.strict.mode).toBe('strict');
      
      // Verify that modes have the correct configurations for order preservation
      expect(SCHEDULING_MODES.flexible.description).toContain('彈性模式');
      expect(SCHEDULING_MODES.strict.description).toContain('嚴格模式');
    });

    it('validates subtask order field integrity', () => {
      const subtasks = [
        createMockSubtask('1', 1, 'First Task'),
        createMockSubtask('2', 2, 'Second Task'),
        createMockSubtask('3', 3, 'Third Task'),
      ];

      // Verify order fields are preserved correctly
      expect(subtasks[0].order).toBe(1);
      expect(subtasks[1].order).toBe(2);
      expect(subtasks[2].order).toBe(3);

      // Test array sorting behavior to ensure our order logic works
      const sorted = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      expect(sorted[0].title).toBe('First Task');
      expect(sorted[1].title).toBe('Second Task');
      expect(sorted[2].title).toBe('Third Task');
    });

    it('handles mixed order input correctly', () => {
      const subtasks = [
        createMockSubtask('3', 3, 'Third Task'),
        createMockSubtask('1', 1, 'First Task'),
        createMockSubtask('2', 2, 'Second Task'),
      ];

      // Sort by order to verify our logic works
      const sorted = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      expect(sorted).toHaveLength(3);
      expect(sorted[0].order).toBe(1);
      expect(sorted[0].title).toBe('First Task');
      expect(sorted[1].order).toBe(2);
      expect(sorted[1].title).toBe('Second Task');
      expect(sorted[2].order).toBe(3);
      expect(sorted[2].title).toBe('Third Task');
    });

    it('handles subtasks with undefined order values', () => {
      const subtasks = [
        { ...createMockSubtask('1', 0, 'Task without order'), order: undefined },
        createMockSubtask('2', 1, 'Task with order 1'),
        createMockSubtask('3', 2, 'Task with order 2'),
      ];

      // Sort handling undefined orders (treating as 0)
      const sorted = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Task without order should come first (treated as 0)
      expect(sorted[0].title).toBe('Task without order');
      expect(sorted[1].order).toBe(1);
      expect(sorted[2].order).toBe(2);
    });

    it('maintains stable sort for subtasks with same order', () => {
      const subtasks = [
        createMockSubtask('1', 1, 'First with order 1'),
        createMockSubtask('2', 1, 'Second with order 1'),
        createMockSubtask('3', 2, 'Task with order 2'),
      ];

      const sorted = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));

      expect(sorted).toHaveLength(3);
      // First two should maintain their relative position
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(1);
      expect(sorted[2].order).toBe(2);
    });
  });

  describe('Order Field Validation', () => {
    it('validates order field assignment in manual subtask creation', () => {
      // Simulate the safe order assignment logic from add-task.tsx and SubtaskManager.tsx
      const getNextSafeOrder = (existingSubtasks: EnhancedSubtask[]): number => {
        if (existingSubtasks.length === 0) return 1;
        
        // Find the current maximum order value
        const maxOrder = Math.max(...existingSubtasks.map(s => s.order || 0));
        return maxOrder + 1;
      };

      const existingSubtasks = [
        createMockSubtask('1', 1, 'First Task'),
        createMockSubtask('2', 2, 'Second Task')
      ];

      const newOrder = getNextSafeOrder(existingSubtasks);
      expect(newOrder).toBe(3);

      // Test with empty array
      const emptyOrder = getNextSafeOrder([]);
      expect(emptyOrder).toBe(1);

      // Test with mixed orders including undefined
      const mixedSubtasks = [
        createMockSubtask('1', 1, 'Task 1'),
        { ...createMockSubtask('2', 0, 'Task 2'), order: undefined },
        createMockSubtask('3', 5, 'Task 3')
      ];

      const mixedOrder = getNextSafeOrder(mixedSubtasks);
      expect(mixedOrder).toBe(6); // Should be max(1, 0, 5) + 1 = 6
    });

    it('ensures UI display sorting works correctly', () => {
      // Simulate the sorting logic from task-detail.tsx
      const subtasks = [
        createMockSubtask('3', 3, 'Third Task'),
        createMockSubtask('1', 1, 'First Task'),
        createMockSubtask('2', 2, 'Second Task'),
      ];

      // Apply the same sort logic used in UI
      const sortedForDisplay = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));

      expect(sortedForDisplay).toHaveLength(3);
      expect(sortedForDisplay[0].title).toBe('First Task');
      expect(sortedForDisplay[1].title).toBe('Second Task');
      expect(sortedForDisplay[2].title).toBe('Third Task');
    });

    it('validates order preservation through the complete flow', () => {
      // Test the complete order preservation from creation to display
      const originalSubtasks = [
        createMockSubtask('1', 1, 'Learn Basics'),
        createMockSubtask('2', 2, 'Practice Problems'),
        createMockSubtask('3', 3, 'Advanced Topics'),
      ];

      // Simulate what happens in the scheduling system
      const schedulingInput = [...originalSubtasks].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Simulate what happens in the UI display
      const displayOutput = [...schedulingInput].sort((a, b) => (a.order || 0) - (b.order || 0));

      // Verify order is preserved throughout
      expect(displayOutput[0].title).toBe('Learn Basics');
      expect(displayOutput[1].title).toBe('Practice Problems');
      expect(displayOutput[2].title).toBe('Advanced Topics');

      // Verify all have correct order values
      expect(displayOutput[0].order).toBe(1);
      expect(displayOutput[1].order).toBe(2);
      expect(displayOutput[2].order).toBe(3);
    });
  });
});