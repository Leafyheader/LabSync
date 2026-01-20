export interface LabTest {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface SelectedTest {
  test: LabTest;
  quantity: number;
}

export interface Customer {
  name: string;
  phone?: string;
  email?: string;
}

export interface Transaction {
  id: string;
  customer: Customer;
  selectedTests: SelectedTest[];
  totalCost: number;
  paymentMethod: 'momo' | 'cash';
  date: Date;
  referenceNumber: string;
}

export type PaymentMethod = 'momo' | 'cash';

export interface User {
  id: string;
  username: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'STAFF';
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}