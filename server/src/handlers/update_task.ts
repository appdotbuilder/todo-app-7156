import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type UpdateTaskInput, type TaskWithCategories } from '../schema';
import { eq, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<TaskWithCategories> => {
  try {
    // First, check if the task exists
    const existingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTask.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    // If category_ids are provided, verify all categories exist
    if (input.category_ids !== undefined && input.category_ids.length > 0) {
      const existingCategories = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_ids[0]))
        .execute();

      // Check each category ID exists
      for (const categoryId of input.category_ids) {
        const categoryExists = await db.select()
          .from(categoriesTable)
          .where(eq(categoriesTable.id, categoryId))
          .execute();
        
        if (categoryExists.length === 0) {
          throw new Error(`Category with id ${categoryId} not found`);
        }
      }
    }

    // Build update object only with provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.priority !== undefined) updateData.priority = input.priority;

    // Update the task
    await db.update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, input.id))
      .execute();

    // Handle category associations if provided
    if (input.category_ids !== undefined) {
      // Remove existing category associations
      await db.delete(taskCategoriesTable)
        .where(eq(taskCategoriesTable.task_id, input.id))
        .execute();

      // Add new category associations
      if (input.category_ids.length > 0) {
        const categoryAssociations = input.category_ids.map(categoryId => ({
          task_id: input.id,
          category_id: categoryId
        }));

        await db.insert(taskCategoriesTable)
          .values(categoryAssociations)
          .execute();
      }
    }

    // Fetch the updated task with categories
    const updatedTaskResults = await db.select({
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
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (updatedTaskResults.length === 0) {
      throw new Error(`Task with id ${input.id} not found after update`);
    }

    // Transform the joined results into the expected format
    const task = updatedTaskResults[0];
    const categories = updatedTaskResults
      .filter(result => result.category_id !== null)
      .map(result => ({
        id: result.category_id!,
        name: result.category_name!,
        color: result.category_color,
        created_at: result.category_created_at!
      }));

    // Remove duplicates (in case of multiple joins)
    const uniqueCategories = categories.filter((category, index, self) => 
      index === self.findIndex(c => c.id === category.id)
    );

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date,
      priority: task.priority,
      created_at: task.created_at,
      updated_at: task.updated_at,
      categories: uniqueCategories
    };
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};