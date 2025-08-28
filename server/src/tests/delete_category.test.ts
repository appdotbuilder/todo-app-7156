import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, tasksTable, taskCategoriesTable } from '../db/schema';
import { type IdParam } from '../schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing category', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#FF0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;
    const input: IdParam = { id: categoryId };

    // Delete the category
    const result = await deleteCategory(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify category is removed from database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should return false when deleting non-existent category', async () => {
    const input: IdParam = { id: 9999 };

    const result = await deleteCategory(input);

    // Should return false for non-existent category
    expect(result.success).toBe(false);
  });

  it('should cascade delete associated task-category relationships', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#00FF00'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a test task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test description',
        status: 'pending',
        priority: 'medium'
      })
      .returning()
      .execute();

    const taskId = taskResult[0].id;

    // Create task-category association
    await db.insert(taskCategoriesTable)
      .values({
        task_id: taskId,
        category_id: categoryId
      })
      .execute();

    // Verify association exists before deletion
    const associationsBefore = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.category_id, categoryId))
      .execute();

    expect(associationsBefore).toHaveLength(1);

    // Delete the category
    const input: IdParam = { id: categoryId };
    const result = await deleteCategory(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify category is deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);

    // Verify associated task-category relationships are cascade deleted
    const associationsAfter = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.category_id, categoryId))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify task still exists (only the association should be deleted)
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(1);
  });

  it('should handle multiple task-category associations correctly', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Multi-Task Category',
        color: '#0000FF'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple test tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        status: 'pending',
        priority: 'high'
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        status: 'completed',
        priority: 'low'
      })
      .returning()
      .execute();

    const task1Id = task1Result[0].id;
    const task2Id = task2Result[0].id;

    // Create multiple task-category associations
    await db.insert(taskCategoriesTable)
      .values([
        { task_id: task1Id, category_id: categoryId },
        { task_id: task2Id, category_id: categoryId }
      ])
      .execute();

    // Verify associations exist
    const associationsBefore = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.category_id, categoryId))
      .execute();

    expect(associationsBefore).toHaveLength(2);

    // Delete the category
    const input: IdParam = { id: categoryId };
    const result = await deleteCategory(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify all associations are cascade deleted
    const associationsAfter = await db.select()
      .from(taskCategoriesTable)
      .where(eq(taskCategoriesTable.category_id, categoryId))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify both tasks still exist
    const remainingTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(remainingTasks).toHaveLength(2);
    expect(remainingTasks.map(t => t.id).sort()).toEqual([task1Id, task2Id].sort());
  });
});