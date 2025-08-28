import { z } from 'zod';

// Enums for task status and priority
export const taskStatusEnum = z.enum(['pending', 'completed']);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high']);

export type TaskStatus = z.infer<typeof taskStatusEnum>;
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(), // Hex color code for category display
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusEnum,
  due_date: z.coerce.date().nullable(),
  priority: taskPriorityEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Task with categories (for queries that include relations)
export const taskWithCategoriesSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusEnum,
  due_date: z.coerce.date().nullable(),
  priority: taskPriorityEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  categories: z.array(categorySchema)
});

export type TaskWithCategories = z.infer<typeof taskWithCategoriesSchema>;

// Input schemas for creating entities
export const createCategoryInputSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().nullable(),
  status: taskStatusEnum.default('pending'),
  due_date: z.coerce.date().nullable(),
  priority: taskPriorityEnum.default('medium'),
  category_ids: z.array(z.number()).optional() // Array of category IDs to associate with task
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schemas for updating entities
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Category name is required").optional(),
  color: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Task title is required").optional(),
  description: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  due_date: z.coerce.date().nullable().optional(),
  priority: taskPriorityEnum.optional(),
  category_ids: z.array(z.number()).optional() // Array of category IDs to associate with task
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Query/Filter schemas
export const taskFilterSchema = z.object({
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  category_id: z.number().optional(),
  due_before: z.coerce.date().optional(),
  due_after: z.coerce.date().optional()
});

export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const taskSortSchema = z.enum(['due_date_asc', 'due_date_desc', 'priority_asc', 'priority_desc', 'created_at_asc', 'created_at_desc']);

export type TaskSort = z.infer<typeof taskSortSchema>;

export const getTasksInputSchema = z.object({
  filter: taskFilterSchema.optional(),
  sort: taskSortSchema.optional().default('created_at_desc'),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetTasksInput = z.infer<typeof getTasksInputSchema>;

// ID parameter schemas
export const idParamSchema = z.object({
  id: z.number()
});

export type IdParam = z.infer<typeof idParamSchema>;