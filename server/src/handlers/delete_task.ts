import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type IdParam } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteTask = async (input: IdParam): Promise<{ success: boolean }> => {
  try {
    // Delete the task by ID - cascade delete will handle task_categories relationships
    const result = await db.delete(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    // Return success if a task was actually deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};