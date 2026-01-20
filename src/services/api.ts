// Check if running in Electron and get API base URL
const electronApiBase = typeof window !== 'undefined' && (window as { ELECTRON_API_BASE?: string }).ELECTRON_API_BASE;

// Use relative path for web (Apache proxy), absolute for Electron
const API_BASE_URL = electronApiBase || '/api';

// API Response Types
interface ApiUser {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
  createdAt: string;
  updatedAt: string;
}

interface ApiLabTest {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiTransaction {
  id: string;
  referenceNumber: string;
  totalCost: number;
  paymentMethod: 'CASH' | 'MOMO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  customer: ApiCustomer;
  transactionTests?: Array<{
    id: string;
    quantity: number;
    labTest: ApiLabTest;
  }>;
}

// Get token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth-token');
};

// Set token in localStorage
const setAuthToken = (token: string): void => {
  localStorage.setItem('auth-token', token);
};

// Remove token from localStorage
const removeAuthToken = (): void => {
  localStorage.removeItem('auth-token');
};

// Create headers with authorization
const createHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic API request function (with authentication)
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...createHeaders(),
      ...options.headers,
    },
  };

  try {
    // Add a small delay to prevent rapid-fire requests
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Authentication required. Please login again.');
      }

      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Public API request function (no authentication required)
const publicApiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Try to parse JSON error body for richer errors
      let errorBody: unknown = null;
      try {
        const text = await response.text();
        try {
          errorBody = text ? JSON.parse(text) as unknown : null;
        } catch {
          errorBody = text || null;
        }
      } catch {
        errorBody = null;
      }

      const err = new Error(`API Error: ${response.status} ${response.statusText}`) as Error & { status?: number; body?: unknown };
      err.status = response.status;
      err.body = errorBody;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.error('Public API Request failed:', error);
    throw error;
  }
};

export const api = {
  // Auth endpoints
  auth: {
    login: async (credentials: { username: string; password: string }) => {
      const response = await publicApiRequest<{ user: ApiUser; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (response.token) {
        setAuthToken(response.token);
      }
      
      return response;
    },

    logout: () => {
      removeAuthToken();
    },

    getCurrentUser: async () => {
      return apiRequest<{ user: ApiUser }>('/auth/me');
    },

    register: async (userData: {
      username: string;
      password: string;
      name: string;
      role?: 'ADMIN' | 'STAFF';
    }) => {
      return apiRequest<{ user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
  },

  // Lab tests endpoints
  labTests: {
    getAll: async (params?: { 
      search?: string; 
      category?: string; 
      page?: number; 
      limit?: number;
    }) => {
      const queryString = params ? `?${new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString()}` : '';
      return apiRequest<{ 
        tests: ApiLabTest[]; 
        total: number; 
        page: number; 
        limit: number; 
        totalPages: number; 
      }>(`/lab-tests${queryString}`);
    },

    getById: async (id: string) => {
      return apiRequest<{ test: ApiLabTest }>(`/lab-tests/${id}`);
    },

    create: async (testData: {
      name: string;
      price: number;
      category: string;
      description?: string;
    }) => {
      return apiRequest<{ test: ApiLabTest }>('/lab-tests', {
        method: 'POST',
        body: JSON.stringify(testData),
      });
    },

    update: async (id: string, testData: Partial<{
      name: string;
      price: number;
      category: string;
      description: string;
    }>) => {
      return apiRequest<{ test: ApiLabTest }>(`/lab-tests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(testData),
      });
    },

    delete: async (id: string) => {
      return apiRequest<{ message: string }>(`/lab-tests/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Customers endpoints
  customers: {
    getAll: async (params?: { search?: string }) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest<{ customers: ApiCustomer[] }>(`/customers${queryString}`);
    },

    getById: async (id: string) => {
      return apiRequest<{ customer: ApiCustomer }>(`/customers/${id}`);
    },

    create: async (customerData: {
      name: string;
      phone?: string;
      email?: string;
    }) => {
      return apiRequest<{ customer: ApiCustomer }>('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      });
    },

    update: async (id: string, customerData: Partial<{
      name: string;
      phone: string;
      email: string;
    }>) => {
      return apiRequest<{ customer: ApiCustomer }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(customerData),
      });
    },
  },

  // Transactions endpoints
  transactions: {
    getAll: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      paymentMethod?: string;
      search?: string;
    }) => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
      return apiRequest<{
        transactions: ApiTransaction[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`/transactions${queryString}`);
    },

    getById: async (id: string) => {
      return apiRequest<{ transaction: ApiTransaction }>(`/transactions/${id}`);
    },

    create: async (transactionData: {
      customerId?: string;
      customer?: {
        name: string;
        phone?: string;
        email?: string;
      };
      selectedTests: {
        testId: string;
        quantity: number;
      }[];
      paymentMethod: 'CASH' | 'MOMO';
    }) => {
      return apiRequest<{ transaction: ApiTransaction }>('/transactions', {
        method: 'POST',
        body: JSON.stringify(transactionData),
      });
    },

    updateStatus: async (id: string, status: 'PENDING' | 'COMPLETED' | 'CANCELLED') => {
      return apiRequest<{ transaction: ApiTransaction }>(`/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    delete: async (id: string) => {
      return apiRequest<{ message: string }>(`/transactions/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Activation endpoints
  activation: {
    checkStatus: async () => {
      return publicApiRequest<{
        requiresActivation: boolean;
        activeCount: number;
        lastUpdated: string | null;
        serverTime: string;
      }>('/activation/status');
    },

    validateCode: async (code: string) => {
      return publicApiRequest<{
        valid: boolean;
        requiresActivation: boolean;
        message: string;
        serverTime: string;
      }>('/activation/check', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },

    // Admin only methods
    manage: async (code: string, status: 'ON' | 'OFF', activateAt?: string | null) => {
      return apiRequest<{
        activation: {
          id: string;
          code: string;
          status: string;
          activateAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        message: string;
      }>('/activation/manage', {
        method: 'POST',
        body: JSON.stringify({ code, status, activateAt }),
      });
    },

    getAll: async () => {
      return apiRequest<{
        activations: Array<{
          id: string;
          code: string;
          status: string;
          activateAt: string | null;
          createdAt: string;
          updatedAt: string;
        }>;
      }>('/activation/');
    },

    delete: async (id: string) => {
      return apiRequest<{ message: string }>(`/activation/${id}`, {
        method: 'DELETE',
      });
    },

    // Get server time for validation
    getServerTime: async () => {
      return publicApiRequest<{
        serverTime: string;
        timestamp: number;
        timezone: string;
      }>('/activation/time');
    },
  },

  // User Management (Admin/SuperAdmin only)
  users: {
    // Get all users
    getAll: async (params?: { search?: string; role?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.role) searchParams.append('role', params.role);
      
      const queryString = searchParams.toString();
      return apiRequest<{ users: ApiUser[] }>(
        `/users${queryString ? `?${queryString}` : ''}`
      );
    },

    // Get user by ID
    getById: async (id: string) => {
      return apiRequest<{ user: ApiUser }>(`/users/${id}`);
    },

    // Create new user
    create: async (data: {
      username: string;
      password: string;
      name: string;
      role: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
    }) => {
      return apiRequest<{ user: ApiUser }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Update user
    update: async (id: string, data: {
      username?: string;
      password?: string;
      name?: string;
      role?: 'ADMIN' | 'STAFF' | 'SUPERADMIN';
    }) => {
      return apiRequest<{ user: ApiUser }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    // Delete user
    delete: async (id: string) => {
      return apiRequest<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      });
    },

    // Get user statistics
    getStats: async () => {
      return apiRequest<{
        totalUsers: number;
        roleDistribution: {
          SUPERADMIN: number;
          ADMIN: number;
          STAFF: number;
        };
        recentUsers: ApiUser[];
      }>('/users/stats/overview');
    },
  },
};

export { getAuthToken, setAuthToken, removeAuthToken };