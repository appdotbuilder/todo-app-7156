import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { X, Calendar as CalendarIcon } from 'lucide-react';
// Date formatting utility
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
import type { 
  TaskWithCategories, 
  Category, 
  CreateTaskInput, 
  UpdateTaskInput,
  TaskStatus,
  TaskPriority 
} from '../../../server/src/schema';

interface TaskFormProps {
  task?: TaskWithCategories | null;
  categories: Category[];
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function TaskForm({ task, categories, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [formData, setFormData] = useState<{
    title: string;
    description: string | null;
    status: TaskStatus;
    due_date: Date | null;
    priority: TaskPriority;
    category_ids: number[];
  }>({
    title: '',
    description: null,
    status: 'pending',
    due_date: null,
    priority: 'medium',
    category_ids: []
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        due_date: task.due_date,
        priority: task.priority,
        category_ids: task.categories.map((cat: Category) => cat.id)
      });
      setSelectedDate(task.due_date || undefined);
    } else {
      setFormData({
        title: '',
        description: null,
        status: 'pending',
        due_date: null,
        priority: 'medium',
        category_ids: []
      });
      setSelectedDate(undefined);
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (task) {
      // Update existing task
      const updateData: UpdateTaskInput = {
        id: task.id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        due_date: formData.due_date,
        priority: formData.priority,
        category_ids: formData.category_ids
      };
      await onSubmit(updateData);
    } else {
      // Create new task
      const createData: CreateTaskInput = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        due_date: formData.due_date,
        priority: formData.priority,
        category_ids: formData.category_ids
      };
      await onSubmit(createData);
    }
  };

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      category_ids: checked
        ? [...prev.category_ids, categoryId]
        : prev.category_ids.filter((id: number) => id !== categoryId)
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setFormData((prev) => ({
      ...prev,
      due_date: date || null
    }));
    setIsDatePickerOpen(false);
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setFormData((prev) => ({
      ...prev,
      due_date: null
    }));
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {task ? '✏️ Edit Task' : '➕ Create New Task'}
                </CardTitle>
                <CardDescription>
                  {task ? 'Update your task details' : 'Add a new task to your list'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Task Title *
              </Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter task description (optional)..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={3}
                className="w-full"
              />
            </div>

            {/* Status and Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={formData.status || 'pending'}
                  onValueChange={(value: TaskStatus) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select
                  value={formData.priority || 'medium'}
                  onValueChange={(value: TaskPriority) =>
                    setFormData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        🟢 Low
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        🟡 Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        🔴 High
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <div className="flex gap-2">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start text-left font-normal flex-1"
                    >
                      <CalendarIcon size={16} className="mr-2" />
                      {selectedDate ? (
                        formatDate(selectedDate)
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearDate}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Categories</Label>
              {categories.length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-200 rounded-md">
                  No categories available. Create some categories first!
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {categories.map((category: Category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={formData.category_ids.includes(category.id)}
                        onCheckedChange={(checked: boolean) =>
                          handleCategoryToggle(category.id, checked)
                        }
                      />
                      <Label
                        htmlFor={`category-${category.id}`}
                        className="text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: category.color || '#6b7280'
                          }}
                        />
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.category_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.category_ids.map((categoryId: number) => {
                    const category = categories.find((cat: Category) => cat.id === categoryId);
                    if (!category) return null;
                    return (
                      <Badge
                        key={categoryId}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: category.color ? `${category.color}20` : undefined,
                          borderColor: category.color || undefined,
                          color: category.color || undefined
                        }}
                      >
                        🏷️ {category.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>Loading...</>
              ) : task ? (
                <>💾 Update Task</>
              ) : (
                <>➕ Create Task</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}