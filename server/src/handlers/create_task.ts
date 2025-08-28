import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type CreateTaskInput, type TaskWithCategories } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createTask = async (input: CreateTaskInput): Promise<TaskWithCategories> => {
  try {
    // Validate categories exist if category_ids provided
    if (input.category_ids && input.category_ids.length > 0) {
      const existingCategories = await db.select()
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, input.category_ids))
        .execute();

      if (existingCategories.length !== input.category_ids.length) {
        throw new Error('One or more category IDs do not exist');
      }
    }

    // Create the task
    const taskResult = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        status: input.status ?? 'pending',
        due_date: input.due_date,
        priority: input.priority ?? 'medium'
      })
      .returning()
      .execute();

    const task = taskResult[0];

    // Create task-category associations if category_ids provided
    if (input.category_ids && input.category_ids.length > 0) {
      const taskCategoryInserts = input.category_ids.map(categoryId => ({
        task_id: task.id,
        category_id: categoryId
      }));

      await db.insert(taskCategoriesTable)
        .values(taskCategoryInserts)
        .execute();
    }

    // Fetch the task with its categories using proper joins
    const taskWithCategoriesResult = await db.select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      due_date: tasksTable.due_date,
      priority: tasksTable.priority,
      created_at: tasksTable.created_at,
      updated_at: tasksTable.updated_at,
      category_id: categoriesTable.id,
      category_name: categoriesTable.name,
      category_color: categoriesTable.color,
      category_created_at: categoriesTable.created_at
    })
      .from(tasksTable)
      .leftJoin(taskCategoriesTable, eq(tasksTable.id, taskCategoriesTable.task_id))
      .leftJoin(categoriesTable, eq(taskCategoriesTable.category_id, categoriesTable.id))
      .where(eq(tasksTable.id, task.id))
      .execute();

    // Group categories for the task
    const categories = taskWithCategoriesResult
      .filter(row => row.category_id !== null)
      .map(row => ({
        id: row.category_id!,
        name: row.category_name!,
        color: row.category_color,
        created_at: row.category_created_at!
      }));

    // Remove duplicates (shouldn't happen but safety first)
    const uniqueCategories = categories.filter((category, index, self) =>
      index === self.findIndex(c => c.id === category.id)
    );

    const taskData = taskWithCategoriesResult[0];
    
    return {
      id: taskData.id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      due_date: taskData.due_date,
      priority: taskData.priority,
      created_at: taskData.created_at,
      updated_at: taskData.updated_at,
      categories: uniqueCategories
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};