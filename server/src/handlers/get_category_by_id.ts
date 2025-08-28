import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type IdParam, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const getCategoryById = async (input: IdParam): Promise<Category | null> => {
  try {
    // Query category by ID
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .execute();

    // Return null if category not found
    if (results.length === 0) {
      return null;
    }

    // Return the first (and only) result
    const category = results[0];
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      created_at: category.created_at
    };
  } catch (error) {
    console.error('Failed to get category by ID:', error);
    throw error;
  }
};