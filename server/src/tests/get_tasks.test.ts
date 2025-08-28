import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type GetTasksInput, type CreateTaskInput, type CreateCategoryInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';
import { eq } from 'drizzle-orm';

// Helper function to create a category
const createCategory = async (input: CreateCategoryInput) => {
  const result = await db.insert(categoriesTable)
    .values({
      name: input.name,
      color: input.color
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper function to create a task
const createTask = async (input: CreateTaskInput) => {
  const result = await db.insert(tasksTable)
    .values({
      title: input.title,
      description: input.description,
      status: input.status || 'pending',
      due_date: input.due_date,
      priority: input.priority || 'medium'
    })
    .returning()
    .execute();
  
  const task = result[0];

  // Create category associations if provided
  if (input.category_ids && input.category_ids.length > 0) {
    await db.insert(taskCategoriesTable)
      .values(input.category_ids.map(categoryId => ({
        task_id: task.id,
        category_id: categoryId
      })))
      .execute();
  }

  return task;
};

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    expect(result).toEqual([]);
  });

  it('should return task with empty categories array when task has no categories', async () => {
    await createTask({
      title: 'Task without categories',
      description: 'A simple task',
      status: 'pending',
      priority: 'high',
      due_date: new Date('2024-12-31')
    });

    const result = await getTasks();
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Task without categories');
    expect(result[0].description).toEqual('A simple task');
    expect(result[0].status).toEqual('pending');
    expect(result[0].priority).toEqual('high');
    expect(result[0].due_date).toEqual(new Date('2024-12-31'));
    expect(result[0].categories).toEqual([]);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return task with associated categories', async () => {
    // Create categories first
    const category1 = await createCategory({
      name: 'Work',
      color: '#ff0000'
    });
    const category2 = await createCategory({
      name: 'Personal',
      color: '#00ff00'
    });

    // Create task with categories
    await createTask({
      title: 'Task with categories',
      description: 'A task with multiple categories',
      status: 'completed',
      priority: 'low',
      due_date: null,
      category_ids: [category1.id, category2.id]
    });

    const result = await getTasks();
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Task with categories');
    expect(result[0].categories).toHaveLength(2);
    
    // Check categories are properly included
    const categoryNames = result[0].categories.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Personal', 'Work']);
    
    const workCategory = result[0].categories.find(cat => cat.name === 'Work');
    expect(workCategory).toBeDefined();
    expect(workCategory!.color).toEqual('#ff0000');
    expect(workCategory!.id).toEqual(category1.id);
    expect(workCategory!.created_at).toBeInstanceOf(Date);
  });

  it('should filter tasks by status', async () => {
    await createTask({
      title: 'Pending task',
      status: 'pending',
      description: null,
      priority: 'medium',
      due_date: null
    });
    
    await createTask({
      title: 'Completed task',
      status: 'completed',
      description: null,
      priority: 'medium',
      due_date: null
    });

    const pendingTasks = await getTasks({
      filter: { status: 'pending' },
      sort: 'created_at_desc',
      offset: 0
    });
    
    const completedTasks = await getTasks({
      filter: { status: 'completed' },
      sort: 'created_at_desc',
      offset: 0
    });

    expect(pendingTasks).toHaveLength(1);
    expect(pendingTasks[0].title).toEqual('Pending task');
    expect(pendingTasks[0].status).toEqual('pending');

    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].title).toEqual('Completed task');
    expect(completedTasks[0].status).toEqual('completed');
  });

  it('should filter tasks by priority', async () => {
    await createTask({
      title: 'High priority task',
      priority: 'high',
      status: 'pending',
      description: null,
      due_date: null
    });
    
    await createTask({
      title: 'Low priority task',
      priority: 'low',
      status: 'pending',
      description: null,
      due_date: null
    });

    const highPriorityTasks = await getTasks({
      filter: { priority: 'high' },
      sort: 'created_at_desc',
      offset: 0
    });

    expect(highPriorityTasks).toHaveLength(1);
    expect(highPriorityTasks[0].title).toEqual('High priority task');
    expect(highPriorityTasks[0].priority).toEqual('high');
  });

  it('should filter tasks by category', async () => {
    const workCategory = await createCategory({
      name: 'Work',
      color: null
    });
    
    const personalCategory = await createCategory({
      name: 'Personal',
      color: null
    });

    await createTask({
      title: 'Work task',
      status: 'pending',
      priority: 'medium',
      description: null,
      due_date: null,
      category_ids: [workCategory.id]
    });
    
    await createTask({
      title: 'Personal task',
      status: 'pending',
      priority: 'medium',
      description: null,
      due_date: null,
      category_ids: [personalCategory.id]
    });

    const workTasks = await getTasks({
      filter: { category_id: workCategory.id },
      sort: 'created_at_desc',
      offset: 0
    });

    expect(workTasks).toHaveLength(1);
    expect(workTasks[0].title).toEqual('Work task');
    expect(workTasks[0].categories[0].name).toEqual('Work');
  });

  it('should filter tasks by due date range', async () => {
    const today = new Date('2024-01-15');
    const tomorrow = new Date('2024-01-16');
    const nextWeek = new Date('2024-01-22');

    await createTask({
      title: 'Due today',
      due_date: today,
      status: 'pending',
      priority: 'medium',
      description: null
    });
    
    await createTask({
      title: 'Due tomorrow',
      due_date: tomorrow,
      status: 'pending',
      priority: 'medium',
      description: null
    });
    
    await createTask({
      title: 'Due next week',
      due_date: nextWeek,
      status: 'pending',
      priority: 'medium',
      description: null
    });

    // Filter tasks due before tomorrow (should include today's task)
    const tasksDueBefore = await getTasks({
      filter: { due_before: tomorrow },
      sort: 'created_at_desc',
      offset: 0
    });

    // Filter tasks due after today (should include tomorrow and next week)
    const tasksDueAfter = await getTasks({
      filter: { due_after: today },
      sort: 'created_at_desc',
      offset: 0
    });

    expect(tasksDueBefore).toHaveLength(2); // today and tomorrow
    expect(tasksDueAfter).toHaveLength(3); // today, tomorrow, and next week

    const titlesBefore = tasksDueBefore.map(t => t.title).sort();
    expect(titlesBefore).toEqual(['Due today', 'Due tomorrow']);
  });

  it('should combine multiple filters', async () => {
    const category = await createCategory({
      name: 'Urgent',
      color: '#ff0000'
    });

    await createTask({
      title: 'Urgent pending task',
      status: 'pending',
      priority: 'high',
      due_date: new Date('2024-01-15'),
      description: null,
      category_ids: [category.id]
    });
    
    await createTask({
      title: 'Urgent completed task',
      status: 'completed',
      priority: 'high',
      due_date: new Date('2024-01-15'),
      description: null,
      category_ids: [category.id]
    });

    const result = await getTasks({
      filter: {
        status: 'pending',
        priority: 'high',
        category_id: category.id
      },
      sort: 'created_at_desc',
      offset: 0
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Urgent pending task');
    expect(result[0].status).toEqual('pending');
    expect(result[0].priority).toEqual('high');
  });

  it('should sort tasks by due_date_asc', async () => {
    await createTask({
      title: 'Due later',
      due_date: new Date('2024-01-20'),
      status: 'pending',
      priority: 'medium',
      description: null
    });
    
    await createTask({
      title: 'Due earlier',
      due_date: new Date('2024-01-10'),
      status: 'pending',
      priority: 'medium',
      description: null
    });

    const result = await getTasks({
      sort: 'due_date_asc',
      offset: 0
    });

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Due earlier');
    expect(result[1].title).toEqual('Due later');
  });

  it('should sort tasks by priority_desc', async () => {
    await createTask({
      title: 'Low priority',
      priority: 'low',
      status: 'pending',
      description: null,
      due_date: null
    });
    
    await createTask({
      title: 'High priority',
      priority: 'high',
      status: 'pending',
      description: null,
      due_date: null
    });
    
    await createTask({
      title: 'Medium priority',
      priority: 'medium',
      status: 'pending',
      description: null,
      due_date: null
    });

    const result = await getTasks({
      sort: 'priority_desc',
      offset: 0
    });

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('High priority'); // high is first in desc order
    expect(result[1].title).toEqual('Medium priority');
    expect(result[2].title).toEqual('Low priority');
  });

  it('should apply pagination with limit and offset', async () => {
    // Create 5 tasks
    for (let i = 1; i <= 5; i++) {
      await createTask({
        title: `Task ${i}`,
        status: 'pending',
        priority: 'medium',
        description: null,
        due_date: null
      });
    }

    // Get first 2 tasks
    const page1 = await getTasks({
      limit: 2,
      offset: 0,
      sort: 'created_at_asc'
    });

    // Get next 2 tasks
    const page2 = await getTasks({
      limit: 2,
      offset: 2,
      sort: 'created_at_asc'
    });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    
    expect(page1[0].title).toEqual('Task 1');
    expect(page1[1].title).toEqual('Task 2');
    expect(page2[0].title).toEqual('Task 3');
    expect(page2[1].title).toEqual('Task 4');
  });

  it('should use default sorting when no sort specified', async () => {
    // Wait a bit between creates to ensure different timestamps
    await createTask({
      title: 'First task',
      status: 'pending',
      priority: 'medium',
      description: null,
      due_date: null
    });
    
    // Small delay to ensure different created_at times
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await createTask({
      title: 'Second task',
      status: 'pending',
      priority: 'medium',
      description: null,
      due_date: null
    });

    const result = await getTasks({
      sort: 'created_at_desc',
      offset: 0
    }); // Should use default sorting

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Second task'); // More recent first
    expect(result[1].title).toEqual('First task');
  });

  it('should handle tasks with same category assigned multiple times correctly', async () => {
    const category = await createCategory({
      name: 'Test Category',
      color: '#000000'
    });

    // Create task with category
    const task = await createTask({
      title: 'Test task',
      status: 'pending',
      priority: 'medium',
      description: null,
      due_date: null,
      category_ids: [category.id]
    });

    // Manually add duplicate category relationship (edge case)
    await db.insert(taskCategoriesTable)
      .values({
        task_id: task.id,
        category_id: category.id
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].categories).toHaveLength(1); // Should not have duplicate categories
    expect(result[0].categories[0].name).toEqual('Test Category');
  });
});