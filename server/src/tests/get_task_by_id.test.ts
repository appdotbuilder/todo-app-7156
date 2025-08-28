import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type IdParam } from '../schema';
import { getTaskById } from '../handlers/get_task_by_id';

// Test data setup
const testCategory1 = {
  name: 'Work',
  color: '#FF5733'
};

const testCategory2 = {
  name: 'Personal',
  color: '#33C3FF'
};

const testTask = {
  title: 'Test Task',
  description: 'A task for testing',
  status: 'pending' as const,
  due_date: new Date('2024-12-31'),
  priority: 'high' as const
};

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a task with categories', async () => {
    // Create categories first
    const categoryResults = await db.insert(categoriesTable)
      .values([testCategory1, testCategory2])
      .returning()
      .execute();

    const category1 = categoryResults[0];
    const category2 = categoryResults[1];

    // Create task
    const taskResults = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const task = taskResults[0];

    // Associate task with categories
    await db.insert(taskCategoriesTable)
      .values([
        { task_id: task.id, category_id: category1.id },
        { task_id: task.id, category_id: category2.id }
      ])
      .execute();

    // Test the handler
    const input: IdParam = { id: task.id };
    const result = await getTaskById(input);

    // Verify task data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(task.id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.description).toEqual('A task for testing');
    expect(result!.status).toEqual('pending');
    expect(result!.due_date).toEqual(new Date('2024-12-31'));
    expect(result!.priority).toEqual('high');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify categories
    expect(result!.categories).toHaveLength(2);
    
    const categoryNames = result!.categories.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Personal', 'Work']);
    
    const workCategory = result!.categories.find(cat => cat.name === 'Work');
    expect(workCategory).toBeDefined();
    expect(workCategory!.color).toEqual('#FF5733');
    expect(workCategory!.created_at).toBeInstanceOf(Date);

    const personalCategory = result!.categories.find(cat => cat.name === 'Personal');
    expect(personalCategory).toBeDefined();
    expect(personalCategory!.color).toEqual('#33C3FF');
    expect(personalCategory!.created_at).toBeInstanceOf(Date);
  });

  it('should return a task with no categories', async () => {
    // Create task without any category associations
    const taskResults = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const task = taskResults[0];

    const input: IdParam = { id: task.id };
    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(task.id);
    expect(result!.title).toEqual('Test Task');
    expect(result!.categories).toHaveLength(0);
  });

  it('should return null when task does not exist', async () => {
    const input: IdParam = { id: 999 }; // Non-existent ID
    const result = await getTaskById(input);

    expect(result).toBeNull();
  });

  it('should handle tasks with null optional fields', async () => {
    // Create task with null optional fields
    const minimalTask = {
      title: 'Minimal Task',
      description: null,
      status: 'completed' as const,
      due_date: null,
      priority: 'low' as const
    };

    const taskResults = await db.insert(tasksTable)
      .values(minimalTask)
      .returning()
      .execute();

    const task = taskResults[0];

    const input: IdParam = { id: task.id };
    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Minimal Task');
    expect(result!.description).toBeNull();
    expect(result!.status).toEqual('completed');
    expect(result!.due_date).toBeNull();
    expect(result!.priority).toEqual('low');
    expect(result!.categories).toHaveLength(0);
  });

  it('should handle categories with null color', async () => {
    // Create category with null color
    const categoryWithNullColor = {
      name: 'No Color Category',
      color: null
    };

    const categoryResults = await db.insert(categoriesTable)
      .values(categoryWithNullColor)
      .returning()
      .execute();

    const category = categoryResults[0];

    // Create task
    const taskResults = await db.insert(tasksTable)
      .values(testTask)
      .returning()
      .execute();

    const task = taskResults[0];

    // Associate task with category
    await db.insert(taskCategoriesTable)
      .values({ task_id: task.id, category_id: category.id })
      .execute();

    const input: IdParam = { id: task.id };
    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.categories).toHaveLength(1);
    expect(result!.categories[0].name).toEqual('No Color Category');
    expect(result!.categories[0].color).toBeNull();
  });

  it('should preserve date types correctly', async () => {
    const specificDate = new Date('2024-01-15T10:30:00Z');
    
    const taskWithSpecificDate = {
      title: 'Date Test Task',
      description: 'Testing date handling',
      status: 'pending' as const,
      due_date: specificDate,
      priority: 'medium' as const
    };

    const taskResults = await db.insert(tasksTable)
      .values(taskWithSpecificDate)
      .returning()
      .execute();

    const task = taskResults[0];

    const input: IdParam = { id: task.id };
    const result = await getTaskById(input);

    expect(result).not.toBeNull();
    expect(result!.due_date).toBeInstanceOf(Date);
    expect(result!.due_date!.toISOString()).toEqual(specificDate.toISOString());
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});