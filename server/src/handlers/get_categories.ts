import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { asc } from 'drizzle-orm';
import { type Category } from '../schema';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all categories sorted by name for consistent ordering
    const results = await db.select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.name))
      .execute();

    // Return the results as-is since no numeric conversions are needed
    // (all fields are already in the correct format)
    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};