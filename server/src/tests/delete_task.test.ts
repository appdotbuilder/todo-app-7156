import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type IdParam } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task for testing deletion',
        status: 'pending',
        priority: 'medium'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: IdParam = { id: taskId };

    // Delete the task
    const result = await deleteTask(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify task no longer exists in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should return false for non-existent task', async () => {
    const input: IdParam = { id: 999 };

    // Try to delete non-existent task
    const result = await deleteTask(input);

    // Should return false since no task was deleted
    expect(result.success).toBe(false);
  });

  it('should cascade delete task-category relationships', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Work',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task with Category',
        description: 'A task with category relationship',
        status: 'pending',
        priority: 'high'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create task-category relationship
    await db.insert(taskCategoriesTable)
      .values({
        task_id: taskId,
        category_id: categoryId
      })
      .execute();

    // Verify relationship exists
    const relationshipsBefore = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, taskId))
      .execute();

    expect(relationshipsBefore).toHaveLength(1);

    // Delete the task
    const input: IdParam = { id: taskId };
    const result = await deleteTask(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify task is deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(0);

    // Verify task-category relationships are cascade deleted
    const relationshipsAfter = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, taskId))
      .execute();

    expect(relationshipsAfter).toHaveLength(0);

    // Verify category still exists (should not be affected)
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should handle multiple category relationships', async () => {
    // Create multiple categories
    const category1Result = await db.insert(categoriesTable)
      .values({
        name: 'Work',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const category2Result = await db.insert(categoriesTable)
      .values({
        name: 'Personal',
        color: '#00ff00'
      })
      .returning()
      .execute();

    const category1Id = category1Result[0].id;
    const category2Id = category2Result[0].id;

    // Create a task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Multi-Category Task',
        description: 'A task with multiple categories',
        status: 'completed',
        priority: 'low'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create multiple task-category relationships
    await db.insert(taskCategoriesTable)
      .values([
        {
          task_id: taskId,
          category_id: category1Id
        },
        {
          task_id: taskId,
          category_id: category2Id
        }
      ])
      .execute();

    // Verify relationships exist
    const relationshipsBefore = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, taskId))
      .execute();

    expect(relationshipsBefore).toHaveLength(2);

    // Delete the task
    const input: IdParam = { id: taskId };
    const result = await deleteTask(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify all task-category relationships are cascade deleted
    const relationshipsAfter = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.task_id, taskId))
      .execute();

    expect(relationshipsAfter).toHaveLength(0);
  });

  it('should delete task with due date and updated timestamp', async () => {
    const dueDate = new Date('2024-12-31T23:59:59.000Z');

    // Create a task with due date
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Task with Due Date',
        description: 'Task that needs to be completed by year end',
        status: 'pending',
        priority: 'high',
        due_date: dueDate
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;
    const input: IdParam = { id: taskId };

    // Verify task exists with due date
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasksBefore).toHaveLength(1);
    expect(tasksBefore[0].due_date).toBeInstanceOf(Date);

    // Delete the task
    const result = await deleteTask(input);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify task is deleted
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasksAfter).toHaveLength(0);
  });
});