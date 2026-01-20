import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Mail, CreditCard, Smartphone } from 'lucide-react';
import { Customer, PaymentMethod, SelectedTest } from '../types';
import { formatCurrency } from '../utils/calculations';
import { api } from '../services/api';

interface CustomerFormProps {
  selectedTests: SelectedTest[];
  totalCost: number;
  onSubmit: (customer: Customer, paymentMethod: PaymentMethod) => void;
  onBack: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  selectedTests,
  totalCost,
  onSubmit,
  onBack
}) => {
  const [customer, setCustomer] = useState<Customer>(() => {
    // Restore customer form data from localStorage
    const savedCustomer = localStorage.getItem('customerFormData');
    if (savedCustomer) {
      try {
        return JSON.parse(savedCustomer);
      } catch (error) {
        console.error('Error parsing saved customer data:', error);
      }
    }
    return {
      name: '',
      phone: '',
      email: ''
    };
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    // Restore payment method from localStorage
    const savedPaymentMethod = localStorage.getItem('paymentMethod');
    return savedPaymentMethod === 'momo' ? 'momo' : 'cash';
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Customer autocomplete state
  const [existingCustomers, setExistingCustomers] = useState<Array<{ id: string; name: string; phone?: string; email?: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Save customer form data to localStorage
  useEffect(() => {
    localStorage.setItem('customerFormData', JSON.stringify(customer));
  }, [customer]);

  // Save payment method to localStorage
  useEffect(() => {
    localStorage.setItem('paymentMethod', paymentMethod);
  }, [paymentMethod]);

  // Search customers with debouncing
  const searchCustomers = async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setExistingCustomers([]);
      setShowDropdown(false);
      return;
    }

    console.log('🔍 Searching for customers with term:', searchTerm);
    setIsSearching(true);
    try {
      const { customers } = await api.customers.getAll({ search: searchTerm });
      console.log('✅ Found customers:', customers);
      setExistingCustomers(customers);
      setShowDropdown(true); // Always show dropdown when search is complete
    } catch (error) {
      console.error('❌ Failed to search customers:', error);
      setExistingCustomers([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle name input change with debouncing
  const handleNameChange = (value: string) => {
    setCustomer(prev => ({ ...prev, name: value }));
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for search
    const timeout = window.setTimeout(() => {
      searchCustomers(value);
    }, 300); // 300ms debounce delay

    setSearchTimeout(timeout);
  };

  // Select an existing customer
  const selectCustomer = (selectedCustomer: { id: string; name: string; phone?: string; email?: string }) => {
    setCustomer({
      name: selectedCustomer.name,
      phone: selectedCustomer.phone || '',
      email: selectedCustomer.email || ''
    });
    setShowDropdown(false);
    setExistingCustomers([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customer.name.trim()) {
      newErrors.name = 'Customer name is required';
    }
    
    if (customer.phone && !/^[+]?[0-9\-\s()]{10,}$/.test(customer.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(customer, paymentMethod);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back to Test Selection
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Information</h2>
        <p className="text-gray-600">Enter customer details to complete the order</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Customer Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Details</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Customer Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => customer.name.length >= 2 && setShowDropdown(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter customer name"
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                )}
                {showDropdown && existingCustomers.length > 0 && (
                  <div 
                    ref={dropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {existingCustomers.map((existingCustomer) => (
                      <div
                        key={existingCustomer.id}
                        onClick={() => selectCustomer(existingCustomer)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{existingCustomer.name}</div>
                        {existingCustomer.phone && (
                          <div className="text-sm text-gray-600">{existingCustomer.phone}</div>
                        )}
                        {existingCustomer.email && (
                          <div className="text-sm text-gray-600">{existingCustomer.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isSearching && customer.name.length >= 2 && existingCustomers.length === 0 && showDropdown && (
                  <div 
                    ref={dropdownRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
                  >
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      No existing customers found. A new customer will be created.
                    </div>
                  </div>
                )}
              </div>
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., +256 700 123456"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="customer@example.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-blue-600 mr-3"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium">Cash Payment</span>
                </label>
                
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="momo"
                    checked={paymentMethod === 'momo'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-blue-600 mr-3"
                  />
                  <Smartphone className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium">Mobile Money (MoMo)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 mt-6"
            >
              Complete Order - {formatCurrency(totalCost)}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h3>
          
          <div className="space-y-4">
            {selectedTests.map(({ test, quantity }) => (
              <div key={test.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{test.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(test.price)} × {quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(test.price * quantity)}
                </p>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};