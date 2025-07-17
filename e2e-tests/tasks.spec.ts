import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { TasksPage } from './pages/tasks-page';
import { testTasks, testTimeouts, testApiResponses } from './fixtures/test-data';

/**
 * Task Management Tests for FocusFlow
 * Tests the core task management functionality
 */

test.describe('Task Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    try {
      await page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      console.log('Storage clearing skipped due to security restrictions');
    }
  });

  test('should display empty state when no tasks exist', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    await tasksPage.assertEmptyState();
    await tasksPage.assertNoErrors();
  });

  test('should create a new task successfully', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a new task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Verify task was created
    await tasksPage.assertTaskExists(testTasks.simple.title);
    await tasksPage.assertTaskCount(1);
    
    // Verify task details
    const taskTitle = await tasksPage.getTaskTitleByIndex(0);
    expect(taskTitle).toBe(testTasks.simple.title);
    
    const taskDescription = await tasksPage.getTaskDescriptionByIndex(0);
    expect(taskDescription).toContain(testTasks.simple.description);
  });

  test('should create multiple tasks and display them correctly', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create multiple tasks
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    await tasksPage.createTask(testTasks.highPriority);
    await tasksPage.waitForTasksToLoad();
    
    await tasksPage.createTask(testTasks.learning);
    await tasksPage.waitForTasksToLoad();
    
    // Verify all tasks are displayed
    await tasksPage.assertTaskCount(3);
    await tasksPage.assertTaskExists(testTasks.simple.title);
    await tasksPage.assertTaskExists(testTasks.highPriority.title);
    await tasksPage.assertTaskExists(testTasks.learning.title);
  });

  test('should mark task as completed', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Mark task as completed
    await tasksPage.completeTaskByIndex(0);
    await tasksPage.waitForTasksToLoad();
    
    // Verify task status changed
    const taskStatus = await tasksPage.getTaskStatusByIndex(0);
    expect(taskStatus.toLowerCase()).toContain('completed');
  });

  test('should edit existing task', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Edit the task
    await tasksPage.editTaskByIndex(0);
    await tasksPage.waitForElement(tasksPage.selectors.taskModal);
    
    // Update task title
    const newTitle = 'Updated Task Title';
    await tasksPage.fillInput(tasksPage.selectors.taskTitleInput, newTitle);
    await tasksPage.click(tasksPage.selectors.saveButton);
    await tasksPage.waitForTasksToLoad();
    
    // Verify task was updated
    const updatedTitle = await tasksPage.getTaskTitleByIndex(0);
    expect(updatedTitle).toBe(newTitle);
  });

  test('should delete task', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    await tasksPage.assertTaskCount(1);
    
    // Delete the task
    await tasksPage.deleteTaskByIndex(0);
    await tasksPage.waitForTasksToLoad();
    
    // Verify task was deleted
    await tasksPage.assertTaskCount(0);
    await tasksPage.assertEmptyState();
  });

  test('should filter tasks by priority', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create tasks with different priorities
    await tasksPage.createTask(testTasks.simple); // medium priority
    await tasksPage.createTask(testTasks.highPriority); // high priority
    await tasksPage.waitForTasksToLoad();
    
    // Filter by high priority
    await tasksPage.filterTasks('high-priority');
    await tasksPage.waitForTasksToLoad();
    
    // Verify only high priority task is shown
    await tasksPage.assertTaskCount(1);
    const taskTitle = await tasksPage.getTaskTitleByIndex(0);
    expect(taskTitle).toBe(testTasks.highPriority.title);
  });

  test('should sort tasks by priority', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create tasks with different priorities
    await tasksPage.createTask(testTasks.simple); // medium priority
    await tasksPage.createTask(testTasks.highPriority); // high priority
    await tasksPage.waitForTasksToLoad();
    
    // Sort by priority
    await tasksPage.sortTasks('priority');
    await tasksPage.waitForTasksToLoad();
    
    // Verify high priority task is first
    const firstTaskTitle = await tasksPage.getTaskTitleByIndex(0);
    expect(firstTaskTitle).toBe(testTasks.highPriority.title);
  });

  test('should search tasks', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create multiple tasks
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.createTask(testTasks.learning);
    await tasksPage.waitForTasksToLoad();
    
    // Search for specific task
    await tasksPage.searchTasks('learning');
    await tasksPage.waitForTasksToLoad();
    
    // Verify search results
    await tasksPage.assertTaskCount(1);
    const taskTitle = await tasksPage.getTaskTitleByIndex(0);
    expect(taskTitle).toBe(testTasks.learning.title);
  });

  test('should add subtasks to a task', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.withSubtasks);
    await tasksPage.waitForTasksToLoad();
    
    // Add subtasks
    for (let i = 0; i < testTasks.withSubtasks.subtasks.length; i++) {
      await tasksPage.addSubtask(0, testTasks.withSubtasks.subtasks[i]);
    }
    
    // Verify subtasks were added
    const subtaskCount = await tasksPage.getSubtasksCount(0);
    expect(subtaskCount).toBe(testTasks.withSubtasks.subtasks.length);
  });

  test('should handle AI task analysis', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    // Mock AI API response
    await tasksPage.helpers.mockApiResponse(
      /.*\/api\/ai\/analyze/,
      testApiResponses.taskAnalysis
    );
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task that triggers AI analysis
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Check if AI analysis was applied
    // This depends on the actual implementation
    await tasksPage.waitForElement('[data-testid="ai-analysis"]', testTimeouts.long);
  });

  test('should handle subtask generation via AI', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    // Mock AI API response for subtask generation
    await tasksPage.helpers.mockApiResponse(
      /.*\/api\/ai\/generate-subtasks/,
      testApiResponses.subtaskGeneration
    );
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Trigger AI subtask generation
    await tasksPage.click('[data-testid="generate-subtasks-button"]');
    await tasksPage.waitForElement('[data-testid="ai-subtasks"]', testTimeouts.long);
    
    // Verify subtasks were generated
    const subtaskCount = await tasksPage.getSubtasksCount(0);
    expect(subtaskCount).toBeGreaterThan(0);
  });

  test('should persist tasks across page refreshes', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create tasks
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.createTask(testTasks.highPriority);
    await tasksPage.waitForTasksToLoad();
    
    // Refresh page
    await page.reload();
    await tasksPage.waitForLoad();
    await tasksPage.assertTasksPageLoaded();
    
    // Verify tasks are still there
    await tasksPage.assertTaskCount(2);
    await tasksPage.assertTaskExists(testTasks.simple.title);
    await tasksPage.assertTaskExists(testTasks.highPriority.title);
  });

  test('should validate task form inputs', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Try to create task without required fields
    await tasksPage.clickAddTask();
    await tasksPage.waitForElement(tasksPage.selectors.taskModal);
    
    // Submit without title
    await tasksPage.click(tasksPage.selectors.saveButton);
    
    // Should show validation error
    await tasksPage.waitForElement(tasksPage.selectors.formError);
    const errorMessage = await tasksPage.getText(tasksPage.selectors.formError);
    expect(errorMessage).toContain('required');
  });

  test('should handle task creation with all fields', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create task with all fields
    await tasksPage.createTask({
      title: 'Complete Task',
      description: 'A task with all fields filled',
      priority: 'high',
      category: 'work',
      dueDate: '2024-12-31',
      estimate: 60,
    });
    
    await tasksPage.waitForTasksToLoad();
    
    // Verify task was created with all details
    await tasksPage.assertTaskExists('Complete Task');
    await tasksPage.assertTaskHasPriority(0, 'high');
    
    const taskDescription = await tasksPage.getTaskDescriptionByIndex(0);
    expect(taskDescription).toContain('A task with all fields filled');
  });

  test('should show task details when clicked', async ({ page }) => {
    const tasksPage = new TasksPage(page);
    
    await tasksPage.navigate();
    await tasksPage.assertTasksPageLoaded();
    
    // Create a task
    await tasksPage.createTask(testTasks.simple);
    await tasksPage.waitForTasksToLoad();
    
    // Click on task to show details
    await tasksPage.clickTaskByIndex(0);
    await tasksPage.waitForElement(tasksPage.selectors.taskDetails);
    
    // Verify task details are shown
    const isDetailsVisible = await tasksPage.isVisible(tasksPage.selectors.taskDetails);
    expect(isDetailsVisible).toBe(true);
  });
});