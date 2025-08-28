import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createTaskInputSchema,
  getTasksInputSchema,
  updateTaskInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  idParamSchema
} from './schema';

// Import handlers
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { getTaskById } from './handlers/get_task_by_id';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { getCategoryById } from './handlers/get_category_by_id';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task procedures
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .input(getTasksInputSchema.optional())
    .query(({ input }) => getTasks(input)),

  getTaskById: publicProcedure
    .input(idParamSchema)
    .query(({ input }) => getTaskById(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(idParamSchema)
    .mutation(({ input }) => deleteTask(input)),

  // Category procedures
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  getCategoryById: publicProcedure
    .input(idParamSchema)
    .query(({ input }) => getCategoryById(input)),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(idParamSchema)
    .mutation(({ input }) => deleteCategory(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();