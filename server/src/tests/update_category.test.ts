import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Helper function to create a test category
const createTestCategory = async (data: CreateCategoryInput = { name: 'Test Category', color: '#ff0000' }) => {
  const result = await db.insert(categoriesTable)
    .values(data)
    .returning()
    .execute();
  return result[0];
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.color).toEqual(category.color); // Should remain unchanged
    expect(result.created_at).toEqual(category.created_at); // Should remain unchanged
  });

  it('should update category color', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      color: '#00ff00'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name); // Should remain unchanged
    expect(result.color).toEqual('#00ff00');
    expect(result.created_at).toEqual(category.created_at); // Should remain unchanged
  });

  it('should update both name and color', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'New Name',
      color: '#0000ff'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('New Name');
    expect(result.color).toEqual('#0000ff');
    expect(result.created_at).toEqual(category.created_at); // Should remain unchanged
  });

  it('should set color to null when explicitly provided', async () => {
    // Create a test category with a color first
    const category = await createTestCategory({ name: 'Test Category', color: '#ff0000' });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      color: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name); // Should remain unchanged
    expect(result.color).toBeNull();
    expect(result.created_at).toEqual(category.created_at); // Should remain unchanged
  });

  it('should return unchanged category when no update fields provided', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.color).toEqual(category.color);
    expect(result.created_at).toEqual(category.created_at);
  });

  it('should save changes to database', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Database Updated Name',
      color: '#123456'
    };

    await updateCategory(updateInput);

    // Verify changes were saved to database
    const updatedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(updatedCategory).toHaveLength(1);
    expect(updatedCategory[0].name).toEqual('Database Updated Name');
    expect(updatedCategory[0].color).toEqual('#123456');
    expect(updatedCategory[0].id).toEqual(category.id);
    expect(updatedCategory[0].created_at).toEqual(category.created_at);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should handle category with null color initially', async () => {
    // Create a test category without color
    const category = await createTestCategory({ name: 'No Color Category', color: null });

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      color: '#ffffff'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('No Color Category');
    expect(result.color).toEqual('#ffffff');
    expect(result.created_at).toEqual(category.created_at);
  });

  it('should update category with valid name changes', async () => {
    // Create a test category first
    const category = await createTestCategory();

    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Valid Updated Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Valid Updated Name');
    expect(result.color).toEqual(category.color); // Should remain unchanged
    expect(result.created_at).toEqual(category.created_at);

    // Verify it was saved to database
    const dbCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(dbCategory[0].name).toEqual('Valid Updated Name');
  });
});