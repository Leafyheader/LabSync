import React, { useState, useEffect } from 'react';
import { Shield, ToggleLeft, ToggleRight, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface ActivationRecord {
  id: string;
  code: string;
  status: 'ON' | 'OFF';
  activateAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivationStatus {
  requiresActivation: boolean;
  activeCount: number;
  lastUpdated: string | null;
}

export const ActivationManager: React.FC = () => {
  const { user } = useAuth();
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState<'ON' | 'OFF'>('OFF');
  const [newActivateAt, setNewActivateAt] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [activationsResponse, statusResponse] = await Promise.all([
        api.activation.getAll(),
        api.activation.checkStatus()
      ]);
      
      setActivations(activationsResponse.activations as ActivationRecord[]);
      setStatus(statusResponse);
    } catch (err) {
      setError('Failed to load activation data');
      console.error('Error loading activation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Only allow superadmin access
  if (!user || user.role !== 'SUPERADMIN') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Super Admin Access Required</h3>
          <p className="text-gray-600">Only super administrators can manage activation settings.</p>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async (activation: ActivationRecord) => {
    try {
      setUpdating(activation.id);
      setError(null);
      
      const newStatus = activation.status === 'ON' ? 'OFF' : 'ON';
      
      await api.activation.manage(activation.code, newStatus);
      await loadData(); // Reload data
      
    } catch (err) {
      setError('Failed to update activation status');
      console.error('Error updating activation:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleCreateActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCode.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Convert datetime-local to ISO string, or null if empty
      const activateAt = newActivateAt ? new Date(newActivateAt).toISOString() : null;
      
      await api.activation.manage(newCode.trim(), newStatus, activateAt);
      setNewCode('');
      setNewStatus('OFF');
      setNewActivateAt('');
      await loadData();
      
    } catch (err) {
      setError('Failed to create activation record');
      console.error('Error creating activation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this activation record? This action cannot be undone.')) {
      return;
    }
    
    try {
      setUpdating(id);
      setError(null);
      
      await api.activation.delete(id);
      await loadData();
      
    } catch (err) {
      setError('Failed to delete activation record');
      console.error('Error deleting activation:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading && activations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading activation settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activation Management</h2>
        <p className="text-gray-600">Control application activation requirements and codes</p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 One-Time Use:</strong> Activation codes are automatically disabled after successful use to prevent reuse.
          </p>
        </div>
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>🔒 Security:</strong> All activation checks use server time only. Client-side date manipulation cannot bypass activation locks.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Status Card */}
      {status && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Status</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {status.requiresActivation ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  )}
                  <span className={`font-medium ${status.requiresActivation ? 'text-orange-700' : 'text-green-700'}`}>
                    {status.requiresActivation ? 'Activation Required' : 'No Activation Required'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {status.activeCount} active code{status.activeCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors duration-200 flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Create New Activation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create Activation Code</h3>
        <form onSubmit={handleCreateActivation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Activation Code
              </label>
              <input
                id="code"
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Enter activation code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Initial Status
              </label>
              <select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'ON' | 'OFF')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OFF">OFF (Disabled)</option>
                <option value="ON">ON (Enabled)</option>
              </select>
            </div>
            <div>
              <label htmlFor="activateAt" className="block text-sm font-medium text-gray-700 mb-1">
                Activation Date (Optional)
              </label>
              <input
                id="activateAt"
                type="datetime-local"
                value={newActivateAt}
                onChange={(e) => setNewActivateAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Leave empty for immediate activation when status is ON"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !newCode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
              >
                Create Code
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Activation Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Activation Codes</h3>
        </div>
        
        {activations.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No activation codes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activation Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activations.map((activation) => (
                  <tr key={activation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm text-gray-900">{activation.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        activation.status === 'ON' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activation.status === 'ON' ? 'ACTIVE' : 'USED/DISABLED'}
                      </span>
                      {activation.status === 'OFF' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(activation.updatedAt).toLocaleDateString() === new Date(activation.createdAt).toLocaleDateString() 
                            ? 'Never used' 
                            : `Used: ${new Date(activation.updatedAt).toLocaleDateString()}`
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activation.activateAt ? (
                        <div className="space-y-1">
                          <div>{new Date(activation.activateAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(activation.activateAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Immediate</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activation.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleToggleStatus(activation)}
                        disabled={updating === activation.id}
                        className={`inline-flex items-center px-3 py-1 rounded-md transition-colors duration-200 ${
                          activation.status === 'ON'
                            ? 'bg-green-100 hover:bg-green-200 text-green-700'
                            : 'bg-red-100 hover:bg-red-200 text-red-700'
                        }`}
                      >
                        {updating === activation.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : activation.status === 'ON' ? (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4 mr-1" />
                            Enable
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteActivation(activation.id)}
                        disabled={updating === activation.id}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
