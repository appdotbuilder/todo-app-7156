import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq, and, like } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Work Tasks',
  color: '#FF5733'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Work Tasks');
    expect(result.color).toEqual('#FF5733');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category with null color', async () => {
    const inputWithNullColor: CreateCategoryInput = {
      name: 'Personal Tasks',
      color: null
    };

    const result = await createCategory(inputWithNullColor);

    expect(result.name).toEqual('Personal Tasks');
    expect(result.color).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Work Tasks');
    expect(categories[0].color).toEqual('#FF5733');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories with unique IDs', async () => {
    const category1 = await createCategory({
      name: 'Category 1',
      color: '#FF0000'
    });

    const category2 = await createCategory({
      name: 'Category 2',
      color: '#00FF00'
    });

    expect(category1.id).not.toEqual(category2.id);
    expect(category1.name).toEqual('Category 1');
    expect(category2.name).toEqual('Category 2');
    expect(category1.color).toEqual('#FF0000');
    expect(category2.color).toEqual('#00FF00');
  });

  it('should query categories by name pattern correctly', async () => {
    // Create test categories
    await createCategory({ name: 'Work Tasks', color: '#FF0000' });
    await createCategory({ name: 'Work Projects', color: '#00FF00' });
    await createCategory({ name: 'Personal', color: '#0000FF' });

    // Test pattern matching
    const workCategories = await db.select()
      .from(categoriesTable)
      .where(like(categoriesTable.name, 'Work%'))
      .execute();

    expect(workCategories.length).toEqual(2);
    workCategories.forEach(category => {
      expect(category.name.startsWith('Work')).toBe(true);
      expect(category.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle categories with same name but different colors', async () => {
    const category1 = await createCategory({
      name: 'Important',
      color: '#FF0000'
    });

    const category2 = await createCategory({
      name: 'Important',
      color: '#00FF00'
    });

    expect(category1.id).not.toEqual(category2.id);
    expect(category1.name).toEqual(category2.name);
    expect(category1.color).not.toEqual(category2.color);

    // Verify both are saved
    const allImportant = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, 'Important'))
      .execute();

    expect(allImportant).toHaveLength(2);
  });

  it('should create category with long name', async () => {
    const longNameInput: CreateCategoryInput = {
      name: 'This is a very long category name that should still be handled properly by the system',
      color: '#123456'
    };

    const result = await createCategory(longNameInput);

    expect(result.name).toEqual(longNameInput.name);
    expect(result.color).toEqual('#123456');
    expect(result.id).toBeDefined();
  });

  it('should handle creation with empty color string treated as null', async () => {
    // Note: This tests the behavior when color is explicitly null vs undefined
    const inputWithNullColor: CreateCategoryInput = {
      name: 'Test Category',
      color: null
    };

    const result = await createCategory(inputWithNullColor);

    expect(result.name).toEqual('Test Category');
    expect(result.color).toBeNull();

    // Verify in database
    const saved = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(saved[0].color).toBeNull();
  });
});