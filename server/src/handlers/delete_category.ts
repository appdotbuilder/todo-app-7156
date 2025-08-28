import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type IdParam } from '../schema';

export const deleteCategory = async (input: IdParam): Promise<{ success: boolean }> => {
  try {
    // Delete the category by ID
    // Associated task-category relationships will be automatically deleted due to cascade delete
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    // Return success status based on whether any rows were affected
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};