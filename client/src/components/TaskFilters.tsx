import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, X, RotateCcw } from 'lucide-react';
// Date formatting utility
const formatDate = (date: Date, short = false) => {
  if (short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
import { useState } from 'react';
import type { 
  TaskFilter, 
  TaskSort, 
  Category,
  TaskStatus,
  TaskPriority 
} from '../../../server/src/schema';

interface TaskFiltersProps {
  filter: TaskFilter;
  sortBy: TaskSort;
  categories: Category[];
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
}

export function TaskFilters({
  filter,
  sortBy,
  categories,
  onFilterChange,
  onSortChange
}: TaskFiltersProps) {
  const [dueBefore, setDueBefore] = useState<Date | undefined>(
    filter.due_before || undefined
  );
  const [dueAfter, setDueAfter] = useState<Date | undefined>(
    filter.due_after || undefined
  );
  const [isDueBeforeOpen, setIsDueBeforeOpen] = useState(false);
  const [isDueAfterOpen, setIsDueAfterOpen] = useState(false);

  const handleFilterChange = (key: keyof TaskFilter, value: unknown) => {
    const newFilter = { ...filter, [key]: value };
    if (value === undefined || value === null || value === '') {
      delete newFilter[key];
    }
    onFilterChange(newFilter);
  };

  const handleDateFilter = (type: 'due_before' | 'due_after', date: Date | undefined) => {
    if (type === 'due_before') {
      setDueBefore(date);
      setIsDueBeforeOpen(false);
    } else {
      setDueAfter(date);
      setIsDueAfterOpen(false);
    }
    handleFilterChange(type, date);
  };

  const clearAllFilters = () => {
    setDueBefore(undefined);
    setDueAfter(undefined);
    onFilterChange({});
    onSortChange('created_at_desc');
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filter).length;
  };

  const selectedCategory = filter.category_id ? 
    categories.find((cat: Category) => cat.id === filter.category_id) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🔍 Filters & Sort</h3>
        <div className="flex items-center gap-2">
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()} active
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            <RotateCcw size={12} className="mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Status</Label>
          <Select
            value={filter.status || 'all'}
            onValueChange={(value: string) => 
              handleFilterChange('status', value === 'all' ? undefined : value as TaskStatus)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 All Tasks</SelectItem>
              <SelectItem value="pending">⏳ Pending</SelectItem>
              <SelectItem value="completed">✅ Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Priority</Label>
          <Select
            value={filter.priority || 'all'}
            onValueChange={(value: string) => 
              handleFilterChange('priority', value === 'all' ? undefined : value as TaskPriority)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">⚡ All Priorities</SelectItem>
              <SelectItem value="high">🔴 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Category</Label>
          <Select
            value={filter.category_id?.toString() || 'all'}
            onValueChange={(value: string) => 
              handleFilterChange('category_id', value === 'all' ? undefined : parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏷️ All Categories</SelectItem>
              {categories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: category.color || '#6b7280'
                      }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sort By</Label>
          <Select
            value={sortBy}
            onValueChange={(value: TaskSort) => onSortChange(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">📅 Newest First</SelectItem>
              <SelectItem value="created_at_asc">📅 Oldest First</SelectItem>
              <SelectItem value="due_date_asc">⏰ Due Date (Soon)</SelectItem>
              <SelectItem value="due_date_desc">⏰ Due Date (Later)</SelectItem>
              <SelectItem value="priority_desc">🔴 High Priority</SelectItem>
              <SelectItem value="priority_asc">🟢 Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Due After */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Due After</Label>
          <div className="flex gap-2">
            <Popover open={isDueAfterOpen} onOpenChange={setIsDueAfterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal flex-1"
                >
                  <CalendarIcon size={16} className="mr-2" />
                  {dueAfter ? (
                    formatDate(dueAfter)
                  ) : (
                    <span className="text-muted-foreground">Select date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueAfter}
                  onSelect={(date: Date | undefined) => handleDateFilter('due_after', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueAfter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateFilter('due_after', undefined)}
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Due Before */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Due Before</Label>
          <div className="flex gap-2">
            <Popover open={isDueBeforeOpen} onOpenChange={setIsDueBeforeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal flex-1"
                >
                  <CalendarIcon size={16} className="mr-2" />
                  {dueBefore ? (
                    formatDate(dueBefore)
                  ) : (
                    <span className="text-muted-foreground">Select date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueBefore}
                  onSelect={(date: Date | undefined) => handleDateFilter('due_before', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueBefore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateFilter('due_before', undefined)}
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {filter.status && (
              <Badge variant="secondary" className="text-xs">
                Status: {filter.status === 'pending' ? '⏳ Pending' : '✅ Completed'}
              </Badge>
            )}
            {filter.priority && (
              <Badge variant="secondary" className="text-xs">
                Priority: {
                  filter.priority === 'high' ? '🔴 High' :
                  filter.priority === 'medium' ? '🟡 Medium' : '🟢 Low'
                }
              </Badge>
            )}
            {selectedCategory && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{
                  backgroundColor: selectedCategory.color ? `${selectedCategory.color}20` : undefined,
                  borderColor: selectedCategory.color || undefined,
                  color: selectedCategory.color || undefined
                }}
              >
                🏷️ {selectedCategory.name}
              </Badge>
            )}
            {filter.due_after && (
              <Badge variant="secondary" className="text-xs">
                After: {formatDate(filter.due_after, true)}
              </Badge>
            )}
            {filter.due_before && (
              <Badge variant="secondary" className="text-xs">
                Before: {formatDate(filter.due_before, true)}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}