import React from 'react';
import { 
  Beaker, 
  ShoppingCart, 
  TestTube, 
  FileText, 
  Settings, 
  LogOut,
  User,
  Shield,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'orders', label: 'New Order', icon: ShoppingCart },
    { id: 'tests', label: 'Manage Tests', icon: TestTube }, // Remove adminOnly to allow STAFF access
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'activation', label: 'Activation', icon: Shield, superAdminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.superAdminOnly) {
      return user?.role === 'SUPERADMIN';
    }
    if (item.adminOnly) {
      return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    }
    return true;
  });

  return (
    <div className="bg-white shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">LabSync</h1>
            <p className="text-xs text-gray-600">Lab Management</p>
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};