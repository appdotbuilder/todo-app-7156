import { db } from '../db';
import { tasksTable, categoriesTable, taskCategoriesTable } from '../db/schema';
import { type GetTasksInput, type TaskWithCategories } from '../schema';
import { eq, and, gte, lte, desc, asc, SQL } from 'drizzle-orm';

export const getTasks = async (input: GetTasksInput = { sort: 'created_at_desc', offset: 0 }): Promise<TaskWithCategories[]> => {
  try {
    // Apply defaults from Zod schema
    const { filter = {}, sort = 'created_at_desc', limit, offset = 0 } = input;

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter.status) {
      conditions.push(eq(tasksTable.status, filter.status));
    }

    if (filter.priority) {
      conditions.push(eq(tasksTable.priority, filter.priority));
    }

    if (filter.category_id) {
      conditions.push(eq(categoriesTable.id, filter.category_id));
    }

    if (filter.due_before) {
      conditions.push(lte(tasksTable.due_date, filter.due_before));
    }

    if (filter.due_after) {
      conditions.push(gte(tasksTable.due_date, filter.due_after));
    }

    // Determine sort column and direction
    let sortColumn;
    let sortDirection;

    switch (sort) {
      case 'due_date_asc':
        sortColumn = tasksTable.due_date;
        sortDirection = asc;
        break;
      case 'due_date_desc':
        sortColumn = tasksTable.due_date;
        sortDirection = desc;
        break;
      case 'priority_asc':
        sortColumn = tasksTable.priority;
        sortDirection = asc;
        break;
      case 'priority_desc':
        sortColumn = tasksTable.priority;
        sortDirection = desc;
        break;
      case 'created_at_asc':
        sortColumn = tasksTable.created_at;
        sortDirection = asc;
        break;
      case 'created_at_desc':
      default:
        sortColumn = tasksTable.created_at;
        sortDirection = desc;
        break;
    }

    // Build the complete query
    const baseQuery = db
      .select({
        // Task fields
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        due_date: tasksTable.due_date,
        priority: tasksTable.priority,
        created_at: tasksTable.created_at,
        updated_at: tasksTable.updated_at,
        // Category fields (will be null if no categories)
        category_id: categoriesTable.id,
        category_name: categoriesTable.name,
        category_color: categoriesTable.color,
        category_created_at: categoriesTable.created_at,
      })
      .from(tasksTable)
      .leftJoin(taskCategoriesTable, eq(tasksTable.id, taskCategoriesTable.task_id))
      .leftJoin(categoriesTable, eq(taskCategoriesTable.category_id, categoriesTable.id));

    // Apply where, order, and pagination in one chain
    let results;

    if (conditions.length > 0) {
      const finalQuery = baseQuery
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(sortDirection(sortColumn))
        .offset(offset);

      if (limit) {
        results = await finalQuery.limit(limit).execute();
      } else {
        results = await finalQuery.execute();
      }
    } else {
      const finalQuery = baseQuery
        .orderBy(sortDirection(sortColumn))
        .offset(offset);

      if (limit) {
        results = await finalQuery.limit(limit).execute();
      } else {
        results = await finalQuery.execute();
      }
    }

    // Group results by task to handle multiple categories per task
    const taskMap = new Map<number, TaskWithCategories>();

    for (const row of results) {
      const taskId = row.id;

      if (!taskMap.has(taskId)) {
        // Initialize task with empty categories array
        taskMap.set(taskId, {
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          due_date: row.due_date,
          priority: row.priority,
          created_at: row.created_at,
          updated_at: row.updated_at,
          categories: []
        });
      }

      const task = taskMap.get(taskId)!;

      // Add category if it exists (not null from left join)
      if (row.category_id && row.category_name) {
        // Check if category already added (avoid duplicates)
        const categoryExists = task.categories.some(cat => cat.id === row.category_id);
        if (!categoryExists) {
          task.categories.push({
            id: row.category_id,
            name: row.category_name,
            color: row.category_color,
            created_at: row.category_created_at!
          });
        }
      }
    }

    return Array.from(taskMap.values());
  } catch (error) {
    console.error('Failed to get tasks:', error);
    throw error;
  }
};