import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, RefreshCw, Filter } from 'lucide-react';
import { LabTest } from '../types';
import { formatCurrency } from '../utils/calculations';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { usePagination } from '../hooks/usePagination';
import { Pagination } from './Pagination';

interface LabTestsManagerProps {
  tests: LabTest[];
  onTestsChange: (tests: LabTest[]) => void;
}

export const LabTestsManager: React.FC<LabTestsManagerProps> = ({ tests, onTestsChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoadingTests, setIsLoadingTests] = useState(false); // Prevent multiple simultaneous calls

  // Debounced search - wait 500ms after user stops typing
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedCategoryFilter = useDebounce(categoryFilter, 300);

  // Pagination hook
  const pagination = usePagination({ 
    initialPage: 1, 
    initialLimit: 12,
    storageKey: 'labTestsManager-pagination'
  });

  // Load categories from localStorage or use defaults
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const savedCategories = localStorage.getItem('medlab-categories');
      if (savedCategories) {
        return JSON.parse(savedCategories);
      }
    } catch (error) {
      console.error('Failed to load categories from localStorage:', error);
    }
    return [
      'Hematology',
      'Chemistry',
      'Endocrinology',
      'Urinalysis',
      'Parasitology',
      'Serology',
      'Microbiology',
      'Immunology'
    ];
  });

  // Save categories to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('medlab-categories', JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save categories to localStorage:', error);
    }
  }, [categories]);

  // Load tests from API with pagination and search
  const loadTests = async (resetPagination = false) => {
    // Prevent multiple simultaneous calls
    if (isLoadingTests) {
      return;
    }
    
    try {
      setIsLoadingTests(true);
      setLoading(true);
      setErrors({}); // Clear any previous errors
      
      const currentPage = resetPagination ? 1 : pagination.page;
      
      const params = {
        search: debouncedSearchTerm || undefined,
        category: debouncedCategoryFilter || undefined,
        page: currentPage,
        limit: pagination.limit,
      };

      const response = await api.labTests.getAll(params);
      
      // Update pagination with server response
      pagination.updateTotal(response.total);
      if (resetPagination) {
        pagination.setPage(1);
      }
      
      onTestsChange(response.tests);
    } catch (error) {
      console.error('Failed to load tests:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to load tests from server' 
      });
    } finally {
      setLoading(false);
      setIsLoadingTests(false);
    }
  };

  // Load tests when search/filter changes (reset to page 1) - with debounce delay
  useEffect(() => {
    // When debounced filters change, reset to page 1 and let the pagination effect trigger the load
    pagination.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, debouncedCategoryFilter]);

  // Load tests when pagination page changes (keep current page)
  useEffect(() => {
    // Always load the requested page (including page 1 when navigating back)
    loadTests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // Load tests when limit changes (reset to page 1)
  useEffect(() => {
    if (pagination.limit !== 12) {
      loadTests(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.limit]);

  // Initial load only - ensure correct pagination limit
  useEffect(() => {
    console.log('🚀 LabTestsManager initializing with independent pagination:', { page: pagination.page, limit: pagination.limit, storageKey: 'labTestsManager-pagination' });
    // Ensure we're using the correct limit (12) when the component mounts
    if (pagination.limit !== 12) {
      console.log('⚠️ LabTestsManager detected wrong limit, forcing reset to 12');
      pagination.setLimit(12);
    }
    // Initial load is handled by the pagination effect which listens to pagination.page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for manual refresh
  const handleRefresh = () => {
    loadTests(false);
  };

  // Categories logic remains for form dropdown

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Test name is required';
    }
    
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({}); // Clear previous errors
      
      const testData = {
        name: formData.name.trim(),
        price: Number(formData.price),
        category: formData.category.trim(),
        description: formData.description.trim()
      };

      if (editingTest) {
        // Update existing test
        await api.labTests.update(editingTest.id, testData);
        setErrors({ general: 'Test updated successfully!' });
      } else {
        // Add new test
        await api.labTests.create(testData);
        setErrors({ general: 'Test created successfully!' });
      }

      // Reload current page of tests
      await loadTests(false);
      resetForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setErrors({});
      }, 3000);
    } catch (error) {
      console.error('Failed to save test:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to save test. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (test: LabTest) => {
    setEditingTest(test);
    setFormData({
      name: test.name,
      price: test.price.toString(),
      category: test.category,
      description: test.description || ''
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (testId: string) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        setLoading(true);
        setErrors({}); // Clear previous errors
        await api.labTests.delete(testId);
        
        // If this was the last item on the current page and we're not on page 1, go to previous page
        if (tests.length === 1 && pagination.page > 1) {
          pagination.setPage(pagination.page - 1);
        } else {
          await loadTests(false);
        }
        
        setErrors({ general: 'Test deleted successfully!' });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setErrors({});
        }, 3000);
      } catch (error) {
        console.error('Failed to delete test:', error);
        setErrors({ 
          general: error instanceof Error ? error.message : 'Failed to delete test. Please try again.' 
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingTest(null);
    setFormData({
      name: '',
      price: '',
      category: '',
      description: ''
    });
    setErrors({});
  };

  const resetForm = () => {
    setEditingTest(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      price: '',
      category: '',
      description: ''
    });
    setErrors({});
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setErrors({ general: 'Category name cannot be empty.' });
      setTimeout(() => setErrors({}), 3000);
      return;
    }
    
    if (categories.includes(trimmedName)) {
      setErrors({ general: `Category "${trimmedName}" already exists.` });
      setTimeout(() => setErrors({}), 3000);
      return;
    }
    
    const updatedCategories = [...categories, trimmedName].sort();
    setCategories(updatedCategories);
    setFormData(prev => ({ ...prev, category: trimmedName }));
    setNewCategoryName('');
    setIsAddingCategory(false);
    setErrors({ general: `Category "${trimmedName}" added successfully!` });
    setTimeout(() => setErrors({}), 3000);
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    // Don't allow removing categories that are currently in use
    const isInUse = tests.some(test => test.category === categoryToRemove);
    if (isInUse) {
      setErrors({ general: `Cannot remove "${categoryToRemove}" as it's currently being used by existing tests.` });
      setTimeout(() => setErrors({}), 3000);
      return;
    }
    
    if (window.confirm(`Are you sure you want to remove the "${categoryToRemove}" category?`)) {
      setCategories(prev => prev.filter(cat => cat !== categoryToRemove));
      if (formData.category === categoryToRemove) {
        setFormData(prev => ({ ...prev, category: '' }));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lab Tests Management</h2>
          <p className="text-gray-600">Add, edit, and manage laboratory tests</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleAddNew}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add New Test
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tests by name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        
        {(searchTerm || categoryFilter) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Search: "{searchTerm}"
              </span>
            )}
            {categoryFilter && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                Category: {categoryFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
              }}
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Error/Success Display */}
      {errors.general && (
        <div className={`border rounded-lg p-3 ${
          errors.general.includes('successfully') 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`${
            errors.general.includes('successfully') 
              ? 'text-green-700' 
              : 'text-red-700'
          }`}>
            {errors.general}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {(editingTest || isAddingNew) && (
        <div className="bg-white rounded-lg shadow-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingTest ? 'Edit Test' : 'Add New Test'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter test name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (GHS) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter price"
                min="0"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                
                {/* Add New Category Section */}
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                      }}
                      className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add new category
                  </button>
                )}
              </div>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter description (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingTest ? 'Update Test' : 'Add Test'}
            </button>
          </div>
        </div>
      )}

      {/* Category Management Section */}
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => {
            const testsInCategory = tests.filter(test => test.category === category).length;
            return (
              <div
                key={category}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                <span>{category}</span>
                <span className="text-xs bg-blue-200 px-1.5 py-0.5 rounded-full">
                  {testsInCategory}
                </span>
                {testsInCategory === 0 && (
                  <button
                    onClick={() => handleRemoveCategory(category)}
                    className="text-blue-600 hover:text-red-600 ml-1"
                    title="Remove category (only available for unused categories)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Numbers show how many tests are in each category. Only categories with no tests can be removed.
        </p>
      </div>

      {/* Tests List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tests.map(test => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{test.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {test.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(test.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {test.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(test)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {tests.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm || categoryFilter ? 'No tests found matching your filters.' : 'No tests available.'}
              </p>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading tests...
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          canGoPrev={pagination.canGoPrev}
          canGoNext={pagination.canGoNext}
          onFirstPage={pagination.firstPage}
          onLastPage={pagination.lastPage}
          onPrevPage={pagination.prevPage}
          onNextPage={pagination.nextPage}
          total={pagination.total}
          limit={pagination.limit}
          onLimitChange={pagination.setLimit}
          loading={loading}
        />
      </div>
    </div>
  );
};