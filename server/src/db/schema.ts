import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for PostgreSQL
export const taskStatusEnum = pgEnum('task_status', ['pending', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'), // Nullable hex color code
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable description
  status: taskStatusEnum('status').notNull().default('pending'),
  due_date: timestamp('due_date'), // Nullable due date
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Junction table for many-to-many relationship between tasks and categories
export const taskCategoriesTable = pgTable('task_categories', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull().references(() => tasksTable.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id, { onDelete: 'cascade' }),
});

// Relations
export const tasksRelations = relations(tasksTable, ({ many }) => ({
  taskCategories: many(taskCategoriesTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  taskCategories: many(taskCategoriesTable),
}));

export const taskCategoriesRelations = relations(taskCategoriesTable, ({ one }) => ({
  task: one(tasksTable, {
    fields: [taskCategoriesTable.task_id],
    references: [tasksTable.id],
  }),
  category: one(categoriesTable, {
    fields: [taskCategoriesTable.category_id],
    references: [categoriesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type TaskCategory = typeof taskCategoriesTable.$inferSelect;
export type NewTaskCategory = typeof taskCategoriesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  tasks: tasksTable,
  categories: categoriesTable,
  taskCategories: taskCategoriesTable,
};

export const tableRelations = {
  tasksRelations,
  categoriesRelations,
  taskCategoriesRelations,
};