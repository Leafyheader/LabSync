import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Calendar, Download, Eye, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePagination } from '../hooks/usePagination';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions: propTransactions }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(propTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Use pagination hook for independent state management
  const pagination = usePagination({ 
    initialPage: 1, 
    initialLimit: 12,
    storageKey: 'transactionHistory-pagination'
  });

  // Store pagination functions in ref to avoid dependency issues
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [todaysOrders, setTodaysOrders] = useState<number>(0);
  const [todaysRevenue, setTodaysRevenue] = useState<number>(0);
  // Period summary stats
  const [periodSummary, setPeriodSummary] = useState<{
    totalTransactions: number;
    totalRevenue: number;
    averageTransaction: number;
    dateRange: string;
  }>({ totalTransactions: 0, totalRevenue: 0, averageTransaction: 0, dateRange: '' });

  // Load statistics (total revenue, today's orders) - called once
  const loadStatistics = useCallback(async () => {
    try {
      console.log('📊 Loading statistics...');
      
      // Get all transactions to calculate total revenue and today's orders
      const allTransactionsResponse = await api.transactions.getAll({
        page: 1,
        limit: 1000 // Large number to get all transactions for stats
      });
      
      const allTransactions = allTransactionsResponse.transactions.map((apiTx: {
        totalCost: string | number;
        createdAt: string;
      }) => ({
        totalCost: Number(apiTx.totalCost),
        date: new Date(apiTx.createdAt)
      }));
      
      // Calculate total revenue
      const revenue = allTransactions.reduce((sum, tx) => sum + tx.totalCost, 0);
      setTotalRevenue(revenue);
      
      // Calculate today's orders
      const today = new Date().toDateString();
      const todayTransactions = allTransactions.filter(tx => 
        tx.date.toDateString() === today
      );
      const todayCount = todayTransactions.length;
      setTodaysOrders(todayCount);
      
      // Calculate today's revenue
      const todayRevenue = todayTransactions.reduce((sum, tx) => sum + tx.totalCost, 0);
      setTodaysRevenue(todayRevenue);
      
      console.log('✅ Statistics loaded:', { revenue, todayCount, todayRevenue });
    } catch (error) {
      console.error('❌ Failed to load statistics:', error);
    }
  }, []);

  // Load transactions from API with pagination and filters
  const loadTransactions = useCallback(async (page = 1, search = '', paymentMethod = '', dateFromParam = '', dateToParam = '') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Loading transactions from API with pagination...', { page, search, paymentMethod, dateFromParam, dateToParam });
      
      const params: Record<string, string> = {
        page: page.toString(),
        limit: paginationRef.current.limit.toString()
      };
      
      if (search.trim()) {
        params.search = search.trim();
      }
      
      if (paymentMethod) {
        params.paymentMethod = paymentMethod;
      }
      
      if (dateFromParam) {
        const fromDate = new Date(dateFromParam);
        params.dateFrom = fromDate.toISOString();
      }
      
      if (dateToParam) {
        const toDate = new Date(dateToParam);
        toDate.setHours(23, 59, 59, 999); // End of day
        params.dateTo = toDate.toISOString();
      }

      // For STAFF users, filter to today's transactions only IF no date filters are set
      if (user?.role === 'STAFF' && !dateFromParam && !dateToParam) {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        params.dateFrom = todayStart.toISOString();
        params.dateTo = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
      }
      
      const response = await api.transactions.getAll(params);
      console.log('✅ Raw API response:', response);
      
      // Convert API transactions to app transaction format
      const convertedTransactions: Transaction[] = response.transactions.map((apiTx: {
        id: string;
        customer: { id: string; name: string; phone?: string; email?: string };
        selectedTests?: Array<{
          labTest: { id: string; name: string; price: number; category: string; description?: string };
          quantity: number;
        }>;
        totalCost: string | number; // API returns Decimal as string
        paymentMethod: string;
        createdAt: string;
        referenceNumber: string;
      }) => ({
        id: apiTx.id,
        customer: apiTx.customer,
        selectedTests: apiTx.selectedTests?.map((tt) => ({
          test: tt.labTest,
          quantity: tt.quantity
        })) || [],
        totalCost: Number(apiTx.totalCost), // Convert Decimal string to number
        paymentMethod: apiTx.paymentMethod.toLowerCase() as 'cash' | 'momo',
        date: new Date(apiTx.createdAt),
        referenceNumber: apiTx.referenceNumber
      }));

      setTransactions(convertedTransactions);
      // Update pagination with server response
      paginationRef.current.updateTotal(response.pagination.total);
      console.log('✅ Converted transactions:', convertedTransactions);
      console.log('✅ Pagination info:', response.pagination);
    } catch (error) {
      console.error('❌ Failed to load transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  // Calculate period summary from current filtered transactions
  const calculatePeriodSummary = useCallback(() => {
    if (transactions.length === 0) {
      setPeriodSummary({ totalTransactions: 0, totalRevenue: 0, averageTransaction: 0, dateRange: '' });
      return;
    }

    const totalTransactions = pagination.total; // Use total from pagination (all filtered results)
    const currentPageRevenue = transactions.reduce((sum, tx) => sum + tx.totalCost, 0);
    
    // For accurate revenue calculation, we need all transactions in the period
    // Since we only have current page, we'll estimate or make another API call
    const estimatedTotalRevenue = currentPageRevenue * (totalTransactions / transactions.length);
    const averageTransaction = totalTransactions > 0 ? estimatedTotalRevenue / totalTransactions : 0;

    // Format date range string
    let dateRange = 'All time';
    if (dateFrom && dateTo) {
      dateRange = `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`;
    } else if (dateFrom) {
      dateRange = `From ${new Date(dateFrom).toLocaleDateString()}`;
    } else if (dateTo) {
      dateRange = `Until ${new Date(dateTo).toLocaleDateString()}`;
    } else if (searchTerm || paymentMethodFilter) {
      dateRange = 'Filtered results';
    }

    setPeriodSummary({
      totalTransactions,
      totalRevenue: estimatedTotalRevenue,
      averageTransaction,
      dateRange
    });
  }, [transactions, pagination.total, dateFrom, dateTo, searchTerm, paymentMethodFilter]);

  // Update period summary when transactions or filters change
  useEffect(() => {
    calculatePeriodSummary();
  }, [calculatePeriodSummary]);

  // Debounced search effect  
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTransactions(1, searchTerm, paymentMethodFilter, dateFrom, dateTo);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [searchTerm, paymentMethodFilter, dateFrom, dateTo, loadTransactions]);

  // Load initial data
  useEffect(() => {
    console.log('🏁 TransactionHistory initializing with independent pagination:', { page: pagination.page, limit: pagination.limit });
    // Initial load is handled by the pagination effect below which listens to pagination.page
    loadStatistics(); // Load statistics once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load transactions when page changes
  useEffect(() => {
    console.log('📄 TransactionHistory page changed:', pagination.page);
    // Always load the page requested (including page 1 when navigating back)
    loadTransactions(pagination.page, searchTerm, paymentMethodFilter, dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // Page change handler
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      pagination.setPage(newPage);
    }
  };

  // Payment method filter change
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethodFilter(method);
    // The useEffect will handle the API call
  };

  // Delete transaction function (Admin only)
  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user || user.role !== 'ADMIN') {
      return;
    }

    if (!window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(transactionId);
      await api.transactions.delete(transactionId);
      
      // Close the modal if the deleted transaction was being viewed
      if (selectedTransaction?.id === transactionId) {
        setSelectedTransaction(null);
      }
      
      // Reload current page to reflect deletion
      await loadTransactions(pagination.page, searchTerm, paymentMethodFilter, dateFrom, dateTo);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setError('Failed to delete transaction. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction History</h2>
        <p className="text-gray-600">View and manage all laboratory test transactions</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-700">{error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Show all stats for ADMIN, only today's stats for STAFF */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today's Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{todaysOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Download className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Summary Card */}
      {(dateFrom || dateTo || searchTerm || paymentMethodFilter) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Period Summary</h3>
            <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
              {periodSummary.dateRange}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                  <p className="text-xl font-bold text-gray-900">{periodSummary.totalTransactions.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(periodSummary.totalRevenue)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Average Transaction</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(periodSummary.averageTransaction)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, reference number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="MOMO">Mobile Money</option>
            </select>
          </div>
          
          {/* Date From - Show for all users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Date To - Show for all users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Clear Filters */}
        {(searchTerm || paymentMethodFilter || dateFrom || dateTo) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setSearchTerm('');
                setPaymentMethodFilter('');
                setDateFrom('');
                setDateTo('');
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction: Transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-sm text-gray-900">
                      {transaction.referenceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{transaction.customer.name}</div>
                      {transaction.customer.phone && (
                        <div className="text-sm text-gray-500">{transaction.customer.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {transaction.selectedTests.length} test{transaction.selectedTests.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {transaction.selectedTests.slice(0, 2).map((item: { test: { name: string }; quantity: number }) => item.test.name).join(', ')}
                      {transaction.selectedTests.length > 2 && '...'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(transaction.totalCost)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.paymentMethod === 'momo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.paymentMethod === 'momo' ? 'Mobile Money' : 'Cash'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {user?.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Transaction"
                        >
                          {deletingId === transaction.id ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm || paymentMethodFilter ? 'No transactions found matching your filters.' : 'No transactions available.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {((pagination.page - 1) * pagination.limit) + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, pagination.page - 2);
                    const pageNumber = startPage + i;
                    
                    if (pageNumber > pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Reference Number</p>
                    <p className="font-mono text-gray-900">{selectedTransaction.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-gray-900">{formatDate(selectedTransaction.date)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Customer Information</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{selectedTransaction.customer.name}</p>
                    {selectedTransaction.customer.phone && (
                      <p className="text-sm text-gray-600">{selectedTransaction.customer.phone}</p>
                    )}
                    {selectedTransaction.customer.email && (
                      <p className="text-sm text-gray-600">{selectedTransaction.customer.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Tests Ordered</p>
                  <div className="space-y-2">
                    {selectedTransaction.selectedTests.map(({ test, quantity }) => (
                      <div key={test.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{test.name}</p>
                          <p className="text-sm text-gray-600">{test.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(test.price)} × {quantity}</p>
                          <p className="text-sm text-gray-600">{formatCurrency(test.price * quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Payment Method:</span>
                    <span className="capitalize">
                      {selectedTransaction.paymentMethod === 'momo' ? 'Mobile Money' : 'Cash'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total Amount:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(selectedTransaction.totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};