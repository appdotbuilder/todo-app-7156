import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type IdParam, type CreateCategoryInput } from '../schema';
import { getCategoryById } from '../handlers/get_category_by_id';

// Test inputs
const testCategoryInput: CreateCategoryInput = {
  name: 'Work',
  color: '#ff5722'
};

const testCategoryInputWithoutColor: CreateCategoryInput = {
  name: 'Personal',
  color: null
};

describe('getCategoryById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return category when found', async () => {
    // Create a test category
    const insertResult = await db.insert(categoriesTable)
      .values({
        name: testCategoryInput.name,
        color: testCategoryInput.color
      })
      .returning()
      .execute();

    const createdCategory = insertResult[0];

    // Test the handler
    const input: IdParam = { id: createdCategory.id };
    const result = await getCategoryById(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCategory.id);
    expect(result!.name).toEqual('Work');
    expect(result!.color).toEqual('#ff5722');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle category with null color', async () => {
    // Create a test category with null color
    const insertResult = await db.insert(categoriesTable)
      .values({
        name: testCategoryInputWithoutColor.name,
        color: testCategoryInputWithoutColor.color
      })
      .returning()
      .execute();

    const createdCategory = insertResult[0];

    // Test the handler
    const input: IdParam = { id: createdCategory.id };
    const result = await getCategoryById(input);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCategory.id);
    expect(result!.name).toEqual('Personal');
    expect(result!.color).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when category not found', async () => {
    const input: IdParam = { id: 999999 }; // Non-existent ID
    const result = await getCategoryById(input);

    expect(result).toBeNull();
  });

  it('should return correct category when multiple categories exist', async () => {
    // Create multiple test categories
    const category1 = await db.insert(categoriesTable)
      .values({
        name: 'Category 1',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const category2 = await db.insert(categoriesTable)
      .values({
        name: 'Category 2',
        color: '#00ff00'
      })
      .returning()
      .execute();

    const category3 = await db.insert(categoriesTable)
      .values({
        name: 'Category 3',
        color: '#0000ff'
      })
      .returning()
      .execute();

    // Test getting the middle category
    const input: IdParam = { id: category2[0].id };
    const result = await getCategoryById(input);

    // Verify we get the correct category
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(category2[0].id);
    expect(result!.name).toEqual('Category 2');
    expect(result!.color).toEqual('#00ff00');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should maintain data integrity across multiple queries', async () => {
    // Create a test category
    const insertResult = await db.insert(categoriesTable)
      .values({
        name: 'Persistent Category',
        color: '#purple'
      })
      .returning()
      .execute();

    const createdCategory = insertResult[0];
    const input: IdParam = { id: createdCategory.id };

    // Query multiple times to ensure consistency
    const result1 = await getCategoryById(input);
    const result2 = await getCategoryById(input);
    const result3 = await getCategoryById(input);

    // All results should be identical
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
    expect(result1!.name).toEqual('Persistent Category');
    expect(result1!.color).toEqual('#purple');
  });
});