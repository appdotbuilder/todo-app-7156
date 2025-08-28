import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, Plus, Filter } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { TaskList } from '@/components/TaskList';
import { TaskForm } from '@/components/TaskForm';
import { CategoryManager } from '@/components/CategoryManager';
import { TaskFilters } from '@/components/TaskFilters';
import type { 
  TaskWithCategories, 
  Category, 
  CreateTaskInput, 
  UpdateTaskInput,
  TaskFilter, 
  TaskSort, 
  GetTasksInput 
} from '../../server/src/schema';

function App() {
  const [tasks, setTasks] = useState<TaskWithCategories[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithCategories | null>(null);
  
  // Filter and sort state
  const [filter, setFilter] = useState<TaskFilter>({});
  const [sortBy, setSortBy] = useState<TaskSort>('created_at_desc');
  const [showFilters, setShowFilters] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryInput: GetTasksInput = {
        filter,
        sort: sortBy,
        offset: 0
      };
      const result = await trpc.getTasks.query(queryInput);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, sortBy]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateTask = async (taskData: CreateTaskInput) => {
    try {
      setIsLoading(true);
      const newTask = await trpc.createTask.mutate(taskData);
      setTasks((prev: TaskWithCategories[]) => [newTask, ...prev]);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async (taskData: UpdateTaskInput) => {
    try {
      setIsLoading(true);
      const updatedTask = await trpc.updateTask.mutate(taskData);
      setTasks((prev: TaskWithCategories[]) => 
        prev.map((task: TaskWithCategories) => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
      setEditingTask(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate({ id: taskId });
      setTasks((prev: TaskWithCategories[]) => 
        prev.filter((task: TaskWithCategories) => task.id !== taskId)
      );
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleTaskStatus = async (task: TaskWithCategories) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await handleUpdateTask({
      id: task.id,
      status: newStatus
    });
  };

  const handleCategoryCreated = (category: Category) => {
    setCategories((prev: Category[]) => [...prev, category]);
  };

  const handleCategoryUpdated = (updatedCategory: Category) => {
    setCategories((prev: Category[]) =>
      prev.map((cat: Category) => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      )
    );
  };

  const handleCategoryDeleted = (categoryId: number) => {
    setCategories((prev: Category[]) =>
      prev.filter((cat: Category) => cat.id !== categoryId)
    );
  };

  const openTaskForm = (task?: TaskWithCategories) => {
    if (task) {
      setEditingTask(task);
    } else {
      setEditingTask(null);
    }
    setShowTaskForm(true);
  };

  const pendingTasks = tasks.filter((task: TaskWithCategories) => task.status === 'pending');
  const completedTasks = tasks.filter((task: TaskWithCategories) => task.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ✅ TaskFlow
          </h1>
          <p className="text-gray-600">
            Organize your tasks with style and efficiency
          </p>
        </div>

        {/* Stub Warning */}
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-800">
            🚧 <strong>Development Mode:</strong> This app is using stub data handlers. 
            Tasks and categories are simulated and won't persist between sessions.
          </AlertDescription>
        </Alert>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <Circle className="text-orange-500 mr-2" size={20} />
              <div>
                <p className="text-2xl font-bold text-gray-800">{pendingTasks.length}</p>
                <p className="text-sm text-gray-600">Pending Tasks</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <CheckCircle2 className="text-green-500 mr-2" size={20} />
              <div>
                <p className="text-2xl font-bold text-gray-800">{completedTasks.length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center">
              <Badge variant="secondary" className="mr-2">📁</Badge>
              <div>
                <p className="text-2xl font-bold text-gray-800">{categories.length}</p>
                <p className="text-sm text-gray-600">Categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              📋 Tasks
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              🏷️ Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            {/* Task Controls */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => openTaskForm()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} className="mr-2" />
                    New Task
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter size={16} className="mr-2" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t">
                  <TaskFilters
                    filter={filter}
                    sortBy={sortBy}
                    categories={categories}
                    onFilterChange={setFilter}
                    onSortChange={setSortBy}
                  />
                </div>
              )}
            </div>

            {/* Task List */}
            <TaskList
              tasks={tasks}
              categories={categories}
              isLoading={isLoading}
              onToggleStatus={handleToggleTaskStatus}
              onEditTask={openTaskForm}
              onDeleteTask={handleDeleteTask}
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager
              categories={categories}
              onCategoryCreated={handleCategoryCreated}
              onCategoryUpdated={handleCategoryUpdated}
              onCategoryDeleted={handleCategoryDeleted}
            />
          </TabsContent>
        </Tabs>

        {/* Task Form Modal */}
        {showTaskForm && (
          <TaskForm
            task={editingTask}
            categories={categories}
            onSubmit={async (data: CreateTaskInput | UpdateTaskInput) => {
              if (editingTask) {
                await handleUpdateTask(data as UpdateTaskInput);
              } else {
                await handleCreateTask(data as CreateTaskInput);
              }
            }}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default App;