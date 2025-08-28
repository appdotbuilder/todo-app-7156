import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

// Test category data
const testCategories: CreateCategoryInput[] = [
  {
    name: 'Work',
    color: '#ff0000'
  },
  {
    name: 'Personal',
    color: '#00ff00'
  },
  {
    name: 'Shopping',
    color: null
  },
  {
    name: 'Health',
    color: '#0000ff'
  }
];

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all categories', async () => {
    // Insert test categories
    for (const category of testCategories) {
      await db.insert(categoriesTable)
        .values({
          name: category.name,
          color: category.color
        })
        .execute();
    }

    const result = await getCategories();

    expect(result).toHaveLength(4);
    expect(result.every(category => category.id !== undefined)).toBe(true);
    expect(result.every(category => category.created_at instanceof Date)).toBe(true);
    
    // Check that all test categories are present
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Work');
    expect(categoryNames).toContain('Personal');
    expect(categoryNames).toContain('Shopping');
    expect(categoryNames).toContain('Health');
  });

  it('should return categories sorted by name', async () => {
    // Insert categories in random order
    const randomOrder = [testCategories[2], testCategories[0], testCategories[3], testCategories[1]];
    
    for (const category of randomOrder) {
      await db.insert(categoriesTable)
        .values({
          name: category.name,
          color: category.color
        })
        .execute();
    }

    const result = await getCategories();

    // Should be sorted alphabetically by name
    const sortedNames = result.map(c => c.name);
    expect(sortedNames).toEqual(['Health', 'Personal', 'Shopping', 'Work']);
  });

  it('should handle categories with null color values', async () => {
    // Insert category with null color
    await db.insert(categoriesTable)
      .values({
        name: 'No Color Category',
        color: null
      })
      .execute();

    // Insert category with color
    await db.insert(categoriesTable)
      .values({
        name: 'Colored Category',
        color: '#ff0000'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    
    const noColorCategory = result.find(c => c.name === 'No Color Category');
    const coloredCategory = result.find(c => c.name === 'Colored Category');
    
    expect(noColorCategory?.color).toBeNull();
    expect(coloredCategory?.color).toBe('#ff0000');
  });

  it('should return categories with correct data types', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        color: '#123456'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];
    
    expect(typeof category.id).toBe('number');
    expect(typeof category.name).toBe('string');
    expect(typeof category.color).toBe('string');
    expect(category.created_at).toBeInstanceOf(Date);
    
    expect(category.name).toBe('Test Category');
    expect(category.color).toBe('#123456');
  });

  it('should handle large number of categories efficiently', async () => {
    // Create 100 categories
    const manyCategories = Array.from({ length: 100 }, (_, i) => ({
      name: `Category ${i.toString().padStart(3, '0')}`,
      color: i % 2 === 0 ? `#${i.toString(16).padStart(6, '0')}` : null
    }));

    for (const category of manyCategories) {
      await db.insert(categoriesTable)
        .values(category)
        .execute();
    }

    const result = await getCategories();

    expect(result).toHaveLength(100);
    
    // Should still be sorted by name
    const names = result.map(c => c.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
    
    // Check first and last items
    expect(result[0].name).toBe('Category 000');
    expect(result[result.length - 1].name).toBe('Category 099');
  });
});