import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type IdParam, type TaskWithCategories } from '../schema';
import { eq } from 'drizzle-orm';

export const getTaskById = async (input: IdParam): Promise<TaskWithCategories | null> => {
  try {
    // First, get the task data
    const taskResults = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (taskResults.length === 0) {
      return null;
    }

    const task = taskResults[0];

    // Get associated categories through the junction table
    const categoryResults = await db.select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      color: categoriesTable.color,
      created_at: categoriesTable.created_at,
    })
      .from(categoriesTable)
      .innerJoin(taskCategoriesTable, eq(categoriesTable.id, taskCategoriesTable.category_id))
      .where(eq(taskCategoriesTable.task_id, input.id))
      .execute();

    // Return the task with its categories
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date,
      priority: task.priority,
      created_at: task.created_at,
      updated_at: task.updated_at,
      categories: categoryResults
    };
  } catch (error) {
    console.error('Failed to get task by ID:', error);
    throw error;
  }
};