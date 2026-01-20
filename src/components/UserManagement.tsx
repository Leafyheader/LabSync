import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX,
  Filter,
  ChevronDown,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalUsers: number;
  roleDistribution: {
    SUPERADMIN: number;
    ADMIN: number;
    STAFF: number;
  };
  recentUsers: User[];
}

type UserFormData = {
  username: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
};

type ModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

export const UserManagement: React.FC = () => {
  console.log('🔄 UserManagement component rendering...');
  
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 UserManagement: Component mounted');
    console.log('👤 Current user:', currentUser);
  }, [currentUser]);

  // Early return test
  React.useEffect(() => {
    console.log('🧪 Testing component render...');
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  
  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    name: '',
    role: 'STAFF'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load data
  const loadData = React.useCallback(async () => {
    try {
      console.log('📊 UserManagement: Starting to load user data...');
      console.log('🔍 Search term:', searchTerm, 'Role filter:', roleFilter);
      setLoading(true);
      setError(null);
      
      // Test simple API first
      console.log('🧪 Testing user API endpoint...');
      
      try {
        const testUsers = await api.users.getAll({});
        console.log('✅ Basic user API works:', testUsers);
      } catch (testErr) {
        console.error('❌ Basic user API failed:', testErr);
        throw testErr;
      }

      try {
        const testStats = await api.users.getStats();
        console.log('✅ Stats API works:', testStats);
      } catch (statsErr) {
        console.error('❌ Stats API failed:', statsErr);
        // Continue without stats for now
      }
      
      console.log('🔍 Making full API calls...');
      const [usersResponse, statsResponse] = await Promise.all([
        api.users.getAll({ search: searchTerm, role: roleFilter !== 'ALL' ? roleFilter : undefined }),
        api.users.getStats()
      ]);
      
      console.log('✅ Users loaded:', usersResponse);
      console.log('✅ Stats loaded:', statsResponse);
      
      setUsers(usersResponse.users || []);
      setStats(statsResponse || null);
    } catch (err) {
      console.error('❌ Error loading users:', err);
      setError(`Failed to load user data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('📊 UserManagement: Load complete, setting loading to false');
    }
  }, [searchTerm, roleFilter]);

  // Initial load
  useEffect(() => {
    console.log('🚀 UserManagement: useEffect triggered, calling loadData');
    loadData();
  }, [loadData]);



  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.users.create(formData);
      } else if (modalMode === 'edit' && selectedUser) {
        const updateData: Partial<UserFormData> = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't update password if empty
        }
        await api.users.update(selectedUser.id, updateData);
      }
      
      await loadData();
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${modalMode} user`;
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser || submitting) return;

    setSubmitting(true);
    try {
      await api.users.delete(selectedUser.id);
      await loadData();
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Modal functions
  const openModal = (mode: ModalMode, user?: User) => {
    setModalMode(mode);
    setSelectedUser(user || null);
    setError(null);
    setShowPassword(false);
    
    if (mode === 'create') {
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'STAFF'
      });
    } else if (mode === 'edit' && user) {
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        role: user.role
      });
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'STAFF'
    });
    setShowPassword(false);
    setError(null);
  };

  // Permission checks
  const canCreateUser = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const canEditUser = (user: User) => {
    if (currentUser?.role === 'SUPERADMIN') return true;
    if (currentUser?.role === 'ADMIN') {
      return user.role !== 'SUPERADMIN' && user.id !== currentUser.id;
    }
    return false;
  };
  const canDeleteUser = (user: User) => {
    if (currentUser?.role === 'SUPERADMIN') return user.id !== currentUser.id;
    if (currentUser?.role === 'ADMIN') {
      return user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.id !== currentUser.id;
    }
    return false;
  };

  // Role badge component
  const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const colors = {
      SUPERADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
      ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
      STAFF: 'bg-green-100 text-green-800 border-green-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[role as keyof typeof colors]}`}>
        {role}
      </span>
    );
  };

  // Access denied check
  console.log('🔐 Checking access. Current user:', currentUser);
  if (!currentUser) {
    console.log('❌ No current user found');
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access user management.</p>
        </div>
      </div>
    );
  }
  
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN') {
    console.log('❌ Insufficient permissions. User role:', currentUser.role);
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-600">You need admin or super admin privileges to access user management.</p>
        </div>
      </div>
    );
  }
  
  console.log('✅ Access granted for user:', currentUser.username);

  if (loading) {
    console.log('🔄 UserManagement is in loading state');
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 UserManagement rendering main content. Error state:', !!error);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6" />
              User Management
            </h1>
            <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
          </div>
          {canCreateUser && (
            <button
              onClick={() => openModal('create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Super Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.roleDistribution.SUPERADMIN}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.roleDistribution.ADMIN}</p>
                </div>
                <UserCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Staff</p>
                  <p className="text-2xl font-bold text-green-600">{stats.roleDistribution.STAFF}</p>
                </div>
                <UserX className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowRoleFilter(!showRoleFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <Filter className="w-4 h-4" />
              Role: {roleFilter}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showRoleFilter && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {['ALL', 'SUPERADMIN', 'ADMIN', 'STAFF'].map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setRoleFilter(role);
                      setShowRoleFilter(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${roleFilter === role ? 'bg-blue-50 text-blue-600' : ''}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Username</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        {currentUser?.id === user.id && (
                          <p className="text-xs text-blue-600 font-medium">You</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900 font-mono text-sm">{user.username}</td>
                  <td className="py-3 px-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal('view', user)}
                        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEditUser(user) && (
                        <button
                          onClick={() => openModal('edit', user)}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit User"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDeleteUser(user) && (
                        <button
                          onClick={() => openModal('delete', user)}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' && 'Create New User'}
                  {modalMode === 'edit' && 'Edit User'}
                  {modalMode === 'view' && 'User Details'}
                  {modalMode === 'delete' && 'Delete User'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {modalMode === 'view' && selectedUser && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <p className="text-gray-900 font-mono">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <RoleBadge role={selectedUser.role} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{new Date(selectedUser.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {modalMode === 'delete' && selectedUser && (
                <div>
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-900">Confirm Deletion</h4>
                      <p className="text-red-700 text-sm">This action cannot be undone.</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Are you sure you want to delete user <strong>{selectedUser.name}</strong> ({selectedUser.username})?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={submitting}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      {submitting ? 'Deleting...' : 'Delete User'}
                    </button>
                    <button
                      onClick={closeModal}
                      disabled={submitting}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(modalMode === 'create' || modalMode === 'edit') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {modalMode === 'edit' && '(leave empty to keep current password)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required={modalMode === 'create'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'STAFF' | 'SUPERADMIN' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="STAFF">Staff</option>
                      {currentUser?.role === 'SUPERADMIN' && <option value="ADMIN">Admin</option>}
                      {currentUser?.role === 'SUPERADMIN' && <option value="SUPERADMIN">Super Admin</option>}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {modalMode === 'create' ? 'Creating...' : 'Updating...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {modalMode === 'create' ? 'Create User' : 'Update User'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
