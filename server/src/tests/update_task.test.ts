import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput, type CreateCategoryInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (taskData: Partial<CreateTaskInput> = {}) => {
  const defaultTask = {
    title: 'Test Task',
    description: 'A task for testing',
    status: 'pending' as const,
    due_date: new Date('2024-12-31'),
    priority: 'medium' as const
  };

  const taskToCreate = { ...defaultTask, ...taskData };

  const result = await db.insert(tasksTable)
    .values({
      title: taskToCreate.title,
      description: taskToCreate.description,
      status: taskToCreate.status,
      due_date: taskToCreate.due_date,
      priority: taskToCreate.priority
    })
    .returning()
    .execute();

  return result[0];
};

// Helper function to create a test category
const createTestCategory = async (categoryData: Partial<CreateCategoryInput> = {}) => {
  const defaultCategory = {
    name: 'Test Category',
    color: '#ff0000'
  };

  const categoryToCreate = { ...defaultCategory, ...categoryData };

  const result = await db.insert(categoriesTable)
    .values({
      name: categoryToCreate.name,
      color: categoryToCreate.color
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic task fields', async () => {
    // Create test task
    const existingTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Updated Task Title',
      description: 'Updated description',
      status: 'completed',
      priority: 'high',
      due_date: new Date('2025-01-15')
    };

    const result = await updateTask(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(existingTask.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Updated description');
    expect(result.status).toEqual('completed');
    expect(result.priority).toEqual('high');
    expect(result.due_date).toEqual(new Date('2025-01-15'));
    expect(result.created_at).toEqual(existingTask.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(existingTask.updated_at.getTime());
    expect(result.categories).toEqual([]);
  });

  it('should update task in database', async () => {
    // Create test task
    const existingTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Database Updated Task',
      status: 'completed'
    };

    await updateTask(updateInput);

    // Verify task was updated in database
    const updatedTaskFromDB = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, existingTask.id))
      .execute();

    expect(updatedTaskFromDB).toHaveLength(1);
    expect(updatedTaskFromDB[0].title).toEqual('Database Updated Task');
    expect(updatedTaskFromDB[0].status).toEqual('completed');
    expect(updatedTaskFromDB[0].description).toEqual(existingTask.description); // Unchanged
    expect(updatedTaskFromDB[0].priority).toEqual(existingTask.priority); // Unchanged
  });

  it('should update only provided fields', async () => {
    // Create test task with specific values
    const existingTask = await createTestTask({
      title: 'Original Title',
      description: 'Original Description',
      status: 'pending',
      priority: 'low'
    });

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Updated Title Only'
      // Only updating title, other fields should remain unchanged
    };

    const result = await updateTask(updateInput);

    // Verify only title was updated
    expect(result.title).toEqual('Updated Title Only');
    expect(result.description).toEqual('Original Description'); // Unchanged
    expect(result.status).toEqual('pending'); // Unchanged
    expect(result.priority).toEqual('low'); // Unchanged
  });

  it('should update task with categories', async () => {
    // Create test task and categories
    const existingTask = await createTestTask();
    const category1 = await createTestCategory({ name: 'Category 1', color: '#ff0000' });
    const category2 = await createTestCategory({ name: 'Category 2', color: '#00ff00' });

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Task with Categories',
      category_ids: [category1.id, category2.id]
    };

    const result = await updateTask(updateInput);

    // Verify task was updated with categories
    expect(result.title).toEqual('Task with Categories');
    expect(result.categories).toHaveLength(2);
    expect(result.categories.map(c => c.id).sort()).toEqual([category1.id, category2.id].sort());
    expect(result.categories.find(c => c.id === category1.id)?.name).toEqual('Category 1');
    expect(result.categories.find(c => c.id === category2.id)?.name).toEqual('Category 2');

    // Verify associations were created in database
    const associations = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, existingTask.id))
      .execute();

    expect(associations).toHaveLength(2);
    expect(associations.map(a => a.category_id).sort()).toEqual([category1.id, category2.id].sort());
  });

  it('should replace existing categories when updating', async () => {
    // Create test task and categories
    const existingTask = await createTestTask();
    const category1 = await createTestCategory({ name: 'Category 1' });
    const category2 = await createTestCategory({ name: 'Category 2' });
    const category3 = await createTestCategory({ name: 'Category 3' });

    // First, associate task with category1 and category2
    await db.insert(taskCategoriesTable)
      .values([
        { task_id: existingTask.id, category_id: category1.id },
        { task_id: existingTask.id, category_id: category2.id }
      ])
      .execute();

    // Update task to only have category3
    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      category_ids: [category3.id]
    };

    const result = await updateTask(updateInput);

    // Verify only category3 is associated
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].id).toEqual(category3.id);
    expect(result.categories[0].name).toEqual('Category 3');

    // Verify in database
    const associations = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, existingTask.id))
      .execute();

    expect(associations).toHaveLength(1);
    expect(associations[0].category_id).toEqual(category3.id);
  });

  it('should remove all categories when updating with empty array', async () => {
    // Create test task and categories
    const existingTask = await createTestTask();
    const category1 = await createTestCategory();

    // Associate task with category
    await db.insert(taskCategoriesTable)
      .values({ task_id: existingTask.id, category_id: category1.id })
      .execute();

    // Update task to have no categories
    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      category_ids: []
    };

    const result = await updateTask(updateInput);

    // Verify no categories
    expect(result.categories).toEqual([]);

    // Verify associations were removed from database
    const associations = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, existingTask.id))
      .execute();

    expect(associations).toHaveLength(0);
  });

  it('should not modify categories when category_ids not provided', async () => {
    // Create test task and categories
    const existingTask = await createTestTask();
    const category1 = await createTestCategory();

    // Associate task with category
    await db.insert(taskCategoriesTable)
      .values({ task_id: existingTask.id, category_id: category1.id })
      .execute();

    // Update task without specifying category_ids
    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Updated Title'
      // Not providing category_ids - should leave existing associations unchanged
    };

    const result = await updateTask(updateInput);

    // Verify existing categories are preserved
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].id).toEqual(category1.id);
  });

  it('should throw error when task not found', async () => {
    const updateInput: UpdateTaskInput = {
      id: 999, // Non-existent task ID
      title: 'This should fail'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Task with id 999 not found/i);
  });

  it('should throw error when category not found', async () => {
    // Create test task
    const existingTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Task with Invalid Category',
      category_ids: [999] // Non-existent category ID
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should handle null/undefined values correctly', async () => {
    // Create test task with values
    const existingTask = await createTestTask({
      title: 'Original Task',
      description: 'Original Description',
      due_date: new Date('2024-12-31')
    });

    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      description: null, // Setting to null
      due_date: null // Setting to null
    };

    const result = await updateTask(updateInput);

    // Verify null values were set
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Original Task'); // Should remain unchanged
  });

  it('should handle mixed category operations correctly', async () => {
    // Create test task and multiple categories
    const existingTask = await createTestTask();
    const category1 = await createTestCategory({ name: 'Work', color: '#ff0000' });
    const category2 = await createTestCategory({ name: 'Personal', color: '#00ff00' });
    const category3 = await createTestCategory({ name: 'Urgent', color: '#0000ff' });

    // Start with some categories
    await db.insert(taskCategoriesTable)
      .values([
        { task_id: existingTask.id, category_id: category1.id }
      ])
      .execute();

    // Update to different categories
    const updateInput: UpdateTaskInput = {
      id: existingTask.id,
      title: 'Task with Mixed Categories',
      status: 'completed',
      category_ids: [category2.id, category3.id] // Replace category1 with category2 and category3
    };

    const result = await updateTask(updateInput);

    // Verify task updates and category changes
    expect(result.title).toEqual('Task with Mixed Categories');
    expect(result.status).toEqual('completed');
    expect(result.categories).toHaveLength(2);
    
    const categoryIds = result.categories.map(c => c.id).sort();
    expect(categoryIds).toEqual([category2.id, category3.id].sort());
    
    const categoryNames = result.categories.map(c => c.name).sort();
    expect(categoryNames).toEqual(['Personal', 'Urgent'].sort());
  });
});