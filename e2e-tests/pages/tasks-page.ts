import { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Tasks Page Object Model for FocusFlow E2E tests
 * Represents the tasks management screen
 */
export class TasksPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to tasks page
   */
  async navigate() {
    await super.navigate('/tasks');
  }

  /**
   * Tasks page specific selectors
   */
  get selectors() {
    return {
      ...this.commonSelectors,
      pageTitle: '[data-testid="tasks-page-title"]',
      addTaskButton: '[data-testid="add-task-button"]',
      taskList: '[data-testid="task-list"]',
      taskItem: '[data-testid="task-item"]',
      taskTitle: '[data-testid="task-title"]',
      taskDescription: '[data-testid="task-description"]',
      taskPriority: '[data-testid="task-priority"]',
      taskStatus: '[data-testid="task-status"]',
      taskDueDate: '[data-testid="task-due-date"]',
      taskProgress: '[data-testid="task-progress"]',
      completeTaskButton: '[data-testid="complete-task-button"]',
      editTaskButton: '[data-testid="edit-task-button"]',
      deleteTaskButton: '[data-testid="delete-task-button"]',
      filterButton: '[data-testid="filter-button"]',
      sortButton: '[data-testid="sort-button"]',
      searchInput: '[data-testid="search-input"]',
      emptyState: '[data-testid="empty-state"]',
      filterOptions: '[data-testid="filter-options"]',
      sortOptions: '[data-testid="sort-options"]',
      taskCounter: '[data-testid="task-counter"]',
      subtasksList: '[data-testid="subtasks-list"]',
      subtaskItem: '[data-testid="subtask-item"]',
      addSubtaskButton: '[data-testid="add-subtask-button"]',
      taskDetails: '[data-testid="task-details"]',
      taskModal: '[data-testid="task-modal"]',
      taskForm: '[data-testid="task-form"]',
      taskTitleInput: '[data-testid="task-title-input"]',
      taskDescriptionInput: '[data-testid="task-description-input"]',
      taskPrioritySelect: '[data-testid="task-priority-select"]',
      taskCategorySelect: '[data-testid="task-category-select"]',
      taskDueDateInput: '[data-testid="task-due-date-input"]',
      taskEstimateInput: '[data-testid="task-estimate-input"]',
    };
  }

  /**
   * Click add task button
   */
  async clickAddTask() {
    await this.click(this.selectors.addTaskButton);
  }

  /**
   * Get tasks count
   */
  async getTasksCount(): Promise<number> {
    const taskItems = await this.page.locator(this.selectors.taskItem);
    return await taskItems.count();
  }

  /**
   * Get task by index
   */
  async getTaskByIndex(index: number) {
    const taskItems = await this.page.locator(this.selectors.taskItem);
    return taskItems.nth(index);
  }

  /**
   * Click task by index
   */
  async clickTaskByIndex(index: number) {
    const task = await this.getTaskByIndex(index);
    await task.click();
  }

  /**
   * Get task title by index
   */
  async getTaskTitleByIndex(index: number): Promise<string> {
    const task = await this.getTaskByIndex(index);
    const titleElement = task.locator(this.selectors.taskTitle);
    return await titleElement.textContent() || '';
  }

  /**
   * Get task description by index
   */
  async getTaskDescriptionByIndex(index: number): Promise<string> {
    const task = await this.getTaskByIndex(index);
    const descriptionElement = task.locator(this.selectors.taskDescription);
    return await descriptionElement.textContent() || '';
  }

  /**
   * Get task priority by index
   */
  async getTaskPriorityByIndex(index: number): Promise<string> {
    const task = await this.getTaskByIndex(index);
    const priorityElement = task.locator(this.selectors.taskPriority);
    return await priorityElement.textContent() || '';
  }

  /**
   * Get task status by index
   */
  async getTaskStatusByIndex(index: number): Promise<string> {
    const task = await this.getTaskByIndex(index);
    const statusElement = task.locator(this.selectors.taskStatus);
    return await statusElement.textContent() || '';
  }

  /**
   * Complete task by index
   */
  async completeTaskByIndex(index: number) {
    const task = await this.getTaskByIndex(index);
    const completeButton = task.locator(this.selectors.completeTaskButton);
    await completeButton.click();
  }

  /**
   * Edit task by index
   */
  async editTaskByIndex(index: number) {
    const task = await this.getTaskByIndex(index);
    const editButton = task.locator(this.selectors.editTaskButton);
    await editButton.click();
  }

  /**
   * Delete task by index
   */
  async deleteTaskByIndex(index: number) {
    const task = await this.getTaskByIndex(index);
    const deleteButton = task.locator(this.selectors.deleteTaskButton);
    await deleteButton.click();
  }

  /**
   * Search for tasks
   */
  async searchTasks(query: string) {
    await this.fillInput(this.selectors.searchInput, query);
    await this.page.waitForTimeout(500); // Wait for search to process
  }

  /**
   * Filter tasks
   */
  async filterTasks(filter: 'all' | 'completed' | 'pending' | 'high-priority') {
    await this.click(this.selectors.filterButton);
    await this.click(`[data-testid="filter-${filter}"]`);
  }

  /**
   * Sort tasks
   */
  async sortTasks(sortBy: 'priority' | 'due-date' | 'created' | 'alphabetical') {
    await this.click(this.selectors.sortButton);
    await this.click(`[data-testid="sort-${sortBy}"]`);
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.emptyState);
  }

  /**
   * Get task counter text
   */
  async getTaskCounterText(): Promise<string> {
    return await this.getText(this.selectors.taskCounter);
  }

  /**
   * Wait for tasks to load
   */
  async waitForTasksToLoad() {
    await this.waitForElement(this.selectors.taskList);
    await this.helpers.waitForLoadingComplete();
  }

  /**
   * Create a new task
   */
  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
    dueDate?: string;
    estimate?: number;
  }) {
    await this.clickAddTask();
    await this.waitForElement(this.selectors.taskModal);
    
    // Fill in task details
    await this.fillInput(this.selectors.taskTitleInput, taskData.title);
    
    if (taskData.description) {
      await this.fillInput(this.selectors.taskDescriptionInput, taskData.description);
    }
    
    if (taskData.priority) {
      await this.click(this.selectors.taskPrioritySelect);
      await this.click(`[data-testid="priority-${taskData.priority}"]`);
    }
    
    if (taskData.category) {
      await this.click(this.selectors.taskCategorySelect);
      await this.click(`[data-testid="category-${taskData.category}"]`);
    }
    
    if (taskData.dueDate) {
      await this.fillInput(this.selectors.taskDueDateInput, taskData.dueDate);
    }
    
    if (taskData.estimate) {
      await this.fillInput(this.selectors.taskEstimateInput, taskData.estimate.toString());
    }
    
    // Save the task
    await this.click(this.selectors.saveButton);
    await this.waitForElement(this.selectors.taskModal, 5000); // Wait for modal to close
  }

  /**
   * Get subtasks count for a task
   */
  async getSubtasksCount(taskIndex: number): Promise<number> {
    const task = await this.getTaskByIndex(taskIndex);
    const subtasks = task.locator(this.selectors.subtaskItem);
    return await subtasks.count();
  }

  /**
   * Add subtask to a task
   */
  async addSubtask(taskIndex: number, subtaskTitle: string) {
    const task = await this.getTaskByIndex(taskIndex);
    const addSubtaskButton = task.locator(this.selectors.addSubtaskButton);
    await addSubtaskButton.click();
    
    const subtaskInput = `[data-testid="subtask-input-${taskIndex}"]`;
    await this.fillInput(subtaskInput, subtaskTitle);
    await this.page.press(subtaskInput, 'Enter');
  }

  /**
   * Toggle task details view
   */
  async toggleTaskDetails(taskIndex: number) {
    const task = await this.getTaskByIndex(taskIndex);
    const detailsButton = task.locator('[data-testid="toggle-details-button"]');
    await detailsButton.click();
  }

  /**
   * Assertions specific to tasks page
   */
  async assertTasksPageLoaded() {
    await this.assertPageLoaded();
    await this.assertElementVisible(this.selectors.pageTitle);
    await this.assertElementVisible(this.selectors.addTaskButton);
  }

  async assertTaskExists(taskTitle: string) {
    const tasks = await this.page.locator(this.selectors.taskItem);
    const taskCount = await tasks.count();
    
    for (let i = 0; i < taskCount; i++) {
      const title = await this.getTaskTitleByIndex(i);
      if (title === taskTitle) {
        return; // Task found
      }
    }
    
    throw new Error(`Task with title "${taskTitle}" not found`);
  }

  async assertTaskCount(expectedCount: number) {
    const actualCount = await this.getTasksCount();
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} tasks, but found ${actualCount}`);
    }
  }

  async assertEmptyState() {
    await this.assertElementVisible(this.selectors.emptyState);
  }

  async assertTaskHasPriority(taskIndex: number, expectedPriority: string) {
    const priority = await this.getTaskPriorityByIndex(taskIndex);
    if (priority !== expectedPriority) {
      throw new Error(`Expected priority "${expectedPriority}", but found "${priority}"`);
    }
  }

  async assertTaskHasStatus(taskIndex: number, expectedStatus: string) {
    const status = await this.getTaskStatusByIndex(taskIndex);
    if (status !== expectedStatus) {
      throw new Error(`Expected status "${expectedStatus}", but found "${status}"`);
    }
  }
}