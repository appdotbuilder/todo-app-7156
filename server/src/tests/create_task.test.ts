import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq, and } from 'drizzle-orm';

// Helper function to create test categories
const createTestCategory = async (name: string, color: string | null = null) => {
  const result = await db.insert(categoriesTable)
    .values({ name, color })
    .returning()
    .execute();
  return result[0];
};

// Basic test input
const basicTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  status: 'pending',
  due_date: new Date('2024-12-31'),
  priority: 'high',
  category_ids: []
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a basic task without categories', async () => {
    const result = await createTask(basicTaskInput);

    // Verify task fields
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.status).toEqual('pending');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.priority).toEqual('high');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.categories).toEqual([]);
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    // Query database to verify task was saved
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].status).toEqual('pending');
    expect(tasks[0].priority).toEqual('high');
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create task with default values when not provided', async () => {
    const minimalInput: CreateTaskInput = {
      title: 'Minimal Task',
      description: null,
      due_date: null,
      status: 'pending',
      priority: 'medium'
    };

    const result = await createTask(minimalInput);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.status).toEqual('pending'); // Default value
    expect(result.priority).toEqual('medium'); // Default value
    expect(result.due_date).toBeNull();
    expect(result.categories).toEqual([]);
  });

  it('should create task with single category', async () => {
    // Create test category first
    const category = await createTestCategory('Work', '#ff0000');

    const input: CreateTaskInput = {
      title: 'Work Task',
      description: 'A work-related task',
      status: 'pending',
      priority: 'medium',
      due_date: null,
      category_ids: [category.id]
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Work Task');
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].id).toEqual(category.id);
    expect(result.categories[0].name).toEqual('Work');
    expect(result.categories[0].color).toEqual('#ff0000');
    expect(result.categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create task with multiple categories', async () => {
    // Create test categories
    const workCategory = await createTestCategory('Work', '#ff0000');
    const urgentCategory = await createTestCategory('Urgent', '#ffff00');
    const personalCategory = await createTestCategory('Personal', null);

    const input: CreateTaskInput = {
      title: 'Multi-Category Task',
      description: 'A task with multiple categories',
      status: 'pending',
      priority: 'high',
      due_date: new Date('2024-06-15'),
      category_ids: [workCategory.id, urgentCategory.id, personalCategory.id]
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Multi-Category Task');
    expect(result.categories).toHaveLength(3);

    // Check that all categories are included
    const categoryIds = result.categories.map(c => c.id).sort();
    const expectedIds = [workCategory.id, urgentCategory.id, personalCategory.id].sort();
    expect(categoryIds).toEqual(expectedIds);

    // Verify specific category details
    const workCat = result.categories.find(c => c.name === 'Work');
    expect(workCat).toBeDefined();
    expect(workCat!.color).toEqual('#ff0000');

    const personalCat = result.categories.find(c => c.name === 'Personal');
    expect(personalCat).toBeDefined();
    expect(personalCat!.color).toBeNull();
  });

  it('should create task-category associations in database', async () => {
    // Create test categories
    const category1 = await createTestCategory('Category 1');
    const category2 = await createTestCategory('Category 2');

    const input: CreateTaskInput = {
      title: 'Associated Task',
      description: null,
      status: 'pending',
      priority: 'low',
      due_date: null,
      category_ids: [category1.id, category2.id]
    };

    const result = await createTask(input);

    // Verify task-category associations exist in database
    const associations = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, result.id))
      .execute();

    expect(associations).toHaveLength(2);
    
    const associatedCategoryIds = associations.map(a => a.category_id).sort();
    const expectedCategoryIds = [category1.id, category2.id].sort();
    expect(associatedCategoryIds).toEqual(expectedCategoryIds);
  });

  it('should handle empty category_ids array', async () => {
    const input: CreateTaskInput = {
      title: 'No Categories Task',
      description: 'A task without categories',
      status: 'completed',
      priority: 'low',
      due_date: new Date('2024-01-01'),
      category_ids: []
    };

    const result = await createTask(input);

    expect(result.title).toEqual('No Categories Task');
    expect(result.categories).toEqual([]);

    // Verify no associations were created
    const associations = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, result.id))
      .execute();

    expect(associations).toHaveLength(0);
  });

  it('should handle undefined category_ids', async () => {
    const input: CreateTaskInput = {
      title: 'Undefined Categories Task',
      description: 'A task with undefined category_ids',
      status: 'pending',
      priority: 'medium',
      due_date: null
      // category_ids is undefined
    };

    const result = await createTask(input);

    expect(result.title).toEqual('Undefined Categories Task');
    expect(result.categories).toEqual([]);
  });

  it('should throw error for non-existent category IDs', async () => {
    const input: CreateTaskInput = {
      title: 'Invalid Categories Task',
      description: 'A task with invalid category IDs',
      status: 'pending',
      priority: 'medium',
      due_date: null,
      category_ids: [999, 1000] // Non-existent IDs
    };

    await expect(createTask(input)).rejects.toThrow(/one or more category ids do not exist/i);
  });

  it('should throw error for partially invalid category IDs', async () => {
    // Create one valid category
    const validCategory = await createTestCategory('Valid Category');

    const input: CreateTaskInput = {
      title: 'Mixed Categories Task',
      description: 'A task with valid and invalid category IDs',
      status: 'pending',
      priority: 'medium',
      due_date: null,
      category_ids: [validCategory.id, 999] // One valid, one invalid
    };

    await expect(createTask(input)).rejects.toThrow(/one or more category ids do not exist/i);
  });

  it('should handle all task status values correctly', async () => {
    const pendingTask = await createTask({
      title: 'Pending Task',
      description: null,
      status: 'pending',
      priority: 'low',
      due_date: null
    });

    const completedTask = await createTask({
      title: 'Completed Task',
      description: null,
      status: 'completed',
      priority: 'low',
      due_date: null
    });

    expect(pendingTask.status).toEqual('pending');
    expect(completedTask.status).toEqual('completed');
  });

  it('should handle all task priority values correctly', async () => {
    const lowTask = await createTask({
      title: 'Low Priority Task',
      description: null,
      status: 'pending',
      priority: 'low',
      due_date: null
    });

    const mediumTask = await createTask({
      title: 'Medium Priority Task',
      description: null,
      status: 'pending',
      priority: 'medium',
      due_date: null
    });

    const highTask = await createTask({
      title: 'High Priority Task',
      description: null,
      status: 'pending',
      priority: 'high',
      due_date: null
    });

    expect(lowTask.priority).toEqual('low');
    expect(mediumTask.priority).toEqual('medium');
    expect(highTask.priority).toEqual('high');
  });
});