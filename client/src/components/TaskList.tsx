import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Edit2, 
  Trash2, 
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { TaskWithCategories, Category } from '../../../server/src/schema';

interface TaskListProps {
  tasks: TaskWithCategories[];
  categories: Category[];
  isLoading: boolean;
  onToggleStatus: (task: TaskWithCategories) => void;
  onEditTask: (task: TaskWithCategories) => void;
  onDeleteTask: (taskId: number) => void;
}

export function TaskList({
  tasks,
  isLoading,
  onToggleStatus,
  onEditTask,
  onDeleteTask
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const toggleTaskExpansion = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="w-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <CardTitle className="text-xl mb-2 text-gray-600">No tasks found</CardTitle>
          <CardDescription className="text-center">
Get started by creating your first task!
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task: TaskWithCategories) => {
        const isExpanded = expandedTasks.has(task.id);
        const taskIsOverdue = isOverdue(task.due_date);
        const taskIsDueToday = isDueToday(task.due_date);

        return (
          <Card 
            key={task.id} 
            className={`w-full transition-all duration-200 hover:shadow-md ${
              task.status === 'completed' 
                ? 'bg-gray-50 border-gray-200' 
                : taskIsOverdue 
                ? 'border-red-200 bg-red-50' 
                : taskIsDueToday 
                ? 'border-orange-200 bg-orange-50' 
                : 'bg-white border-gray-200'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-0 h-6 w-6 rounded-full ${
                      task.status === 'completed' 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    onClick={() => onToggleStatus(task)}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Circle size={20} />
                    )}
                  </Button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle 
                        className={`text-lg ${
                          task.status === 'completed' 
                            ? 'line-through text-gray-500' 
                            : 'text-gray-800'
                        }`}
                      >
                        {task.title}
                      </CardTitle>
                      <span className="text-lg">
                        {getPriorityIcon(task.priority)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={getPriorityColor(task.priority)}
                      >
                        {task.priority.toUpperCase()}
                      </Badge>
                      
                      {task.due_date && (
                        <Badge 
                          variant="outline" 
                          className={
                            taskIsOverdue 
                              ? 'bg-red-100 text-red-800 border-red-200' 
                              : taskIsDueToday 
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }
                        >
                          <Calendar size={12} className="mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                          {taskIsOverdue && <AlertCircle size={12} className="ml-1" />}
                        </Badge>
                      )}
                      
                      {task.categories.map((category: Category) => (
                        <Badge 
                          key={category.id} 
                          variant="outline"
                          className="bg-purple-100 text-purple-800 border-purple-200"
                          style={{
                            backgroundColor: category.color ? `${category.color}20` : undefined,
                            borderColor: category.color || undefined,
                            color: category.color || undefined
                          }}
                        >
                          🏷️ {category.name}
                        </Badge>
                      ))}
                    </div>
                    
                    {task.description && (
                      <div className="mt-2">
                        {isExpanded ? (
                          <CardDescription className="text-sm">
                            {task.description}
                          </CardDescription>
                        ) : task.description.length > 100 ? (
                          <CardDescription className="text-sm">
                            {task.description.slice(0, 100)}...
                          </CardDescription>
                        ) : (
                          <CardDescription className="text-sm">
                            {task.description}
                          </CardDescription>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  {task.description && task.description.length > 100 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8"
                      onClick={() => toggleTaskExpansion(task.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 text-gray-600 hover:text-blue-600"
                    onClick={() => onEditTask(task)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8 text-gray-600 hover:text-red-600"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Created: {task.created_at.toLocaleDateString()}
                  </span>
                  {task.updated_at.getTime() !== task.created_at.getTime() && (
                    <span className="flex items-center gap-1">
                      <Edit2 size={12} />
                      Updated: {task.updated_at.toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    task.status === 'completed' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }
                >
                  {task.status === 'completed' ? '✅ Complete' : '⏳ Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}