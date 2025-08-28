import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Category, 
  CreateCategoryInput, 
  UpdateCategoryInput 
} from '../../../server/src/schema';

interface CategoryManagerProps {
  categories: Category[];
  onCategoryCreated: (category: Category) => void;
  onCategoryUpdated: (category: Category) => void;
  onCategoryDeleted: (categoryId: number) => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#84cc16', // lime
  '#f59e0b', // amber
  '#10b981'  // emerald
];

export function CategoryManager({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted
}: CategoryManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    color: string | null;
  }>({
    name: '',
    color: null
  });

  const resetForm = () => {
    setFormData({
      name: '',
      color: null
    });
    setShowCreateForm(false);
    setEditingCategory(null);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsLoading(true);
      const createData: CreateCategoryInput = {
        name: formData.name.trim(),
        color: formData.color
      };
      const newCategory = await trpc.createCategory.mutate(createData);
      onCategoryCreated(newCategory);
      resetForm();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !formData.name.trim()) return;

    try {
      setIsLoading(true);
      const updateData: UpdateCategoryInput = {
        id: editingCategory.id,
        name: formData.name.trim(),
        color: formData.color
      };
      const updatedCategory = await trpc.updateCategory.mutate(updateData);
      onCategoryUpdated(updatedCategory);
      resetForm();
    } catch (error) {
      console.error('Failed to update category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      await trpc.deleteCategory.mutate({ id: categoryId });
      onCategoryDeleted(categoryId);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color
    });
    setShowCreateForm(false);
  };

  const startCreating = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      color: DEFAULT_COLORS[0]
    });
    setShowCreateForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏷️ Category Manager</h2>
          <p className="text-gray-600">Organize your tasks with custom categories</p>
        </div>
        <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
          <Plus size={16} className="mr-2" />
          New Category
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingCategory) && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-lg">
              {editingCategory ? '✏️ Edit Category' : '➕ Create New Category'}
            </CardTitle>
            <CardDescription>
              {editingCategory ? 'Update your category details' : 'Add a new category to organize your tasks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  placeholder="Enter category name..."
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color: string) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-gray-800 scale-110' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      title={color}
                    />
                  ))}
                  <button
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.color === null 
                        ? 'border-gray-800 bg-gray-200' 
                        : 'border-gray-300 hover:border-gray-500 bg-white'
                    }`}
                    onClick={() => setFormData((prev) => ({ ...prev, color: null }))}
                    title="No color"
                  >
                    <X size={12} className="text-gray-500" />
                  </button>
                </div>
                {formData.color && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: formData.color }}
                    />
                    Preview: {formData.color}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    'Saving...'
                  ) : editingCategory ? (
                    <>
                      <Save size={16} className="mr-2" />
                      Update Category
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Create Category
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏷️</div>
            <CardTitle className="text-xl mb-2 text-gray-600">No categories yet</CardTitle>
            <CardDescription className="text-center mb-4">
              Create your first category to start organizing your tasks!
            </CardDescription>
            <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
              <Plus size={16} className="mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category: Category) => (
            <Card key={category.id} className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{
                        backgroundColor: category.color || '#6b7280'
                      }}
                    />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600"
                      onClick={() => startEditing(category)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the category "{category.name}"? 
                            This action cannot be undone. Tasks using this category will no longer be associated with it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">
                    Created: {category.created_at.toLocaleDateString()}
                  </div>
                  <Badge 
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: category.color ? `${category.color}20` : undefined,
                      borderColor: category.color || undefined,
                      color: category.color || undefined
                    }}
                  >
                    {category.color || 'No color'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}