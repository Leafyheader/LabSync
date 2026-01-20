import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { ActivationProvider } from './contexts/ActivationContext';
import { useAuth } from './hooks/useAuth';
import { useActivation } from './hooks/useActivation';
import { useDebounce } from './hooks/useDebounce';
import { usePagination } from './hooks/usePagination';
import { useAutoLogout } from './hooks/useAutoLogout';
import { LoginScreen } from './components/LoginScreen';
import { ActivationModal } from './components/ActivationModal';
import { Sidebar } from './components/Sidebar';
import { LabTestCard } from './components/LabTestCard';
import { CustomerForm } from './components/CustomerForm';
import { Receipt } from './components/Receipt';
import { LabTestsManager } from './components/LabTestsManager';
import PrintPreview from './components/PrintPreview';
import { TransactionHistory } from './components/TransactionHistory';
import { ActivationManager } from './components/ActivationManager';
import { UserManagement } from './components/UserManagement';
import { Pagination } from './components/Pagination';
import { labTests } from './data/labTests';
import { LabTest, SelectedTest, Customer, PaymentMethod, Transaction } from './types';
import { calculateTotal, generateReferenceNumber, formatCurrency } from './utils/calculations';
import { api } from './services/api';
import './utils/activationUtils'; // Load activation testing utilities

type AppStep = 'selection' | 'customer' | 'receipt';
type AppPage = 'orders' | 'tests' | 'transactions' | 'users' | 'activation' | 'settings';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const { needsActivation, activateApp, isLoading: activationLoading, error: activationError } = useActivation();
  
  // Auto-logout after 10 minutes of inactivity
  useAutoLogout({ timeoutMinutes: 10 });
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    // Restore the last visited page from localStorage
    const savedPage = localStorage.getItem('currentPage');
    return savedPage && ['orders', 'tests', 'transactions', 'users', 'activation', 'settings'].includes(savedPage) 
      ? savedPage as AppPage 
      : 'orders';
  });
    const [currentStep, setCurrentStep] = useState<AppStep>(() => {
    // Restore the current step from localStorage, but only if we're on the orders page
    const savedPage = localStorage.getItem('currentPage');
    const savedStep = localStorage.getItem('currentStep');
    return savedPage === 'orders' && savedStep && ['selection', 'customer', 'receipt'].includes(savedStep)
      ? savedStep as AppStep
      : 'selection';
  });
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>(() => {
    // Restore selected tests from localStorage
    const savedTests = localStorage.getItem('selectedTests');
    if (savedTests) {
      try {
        return JSON.parse(savedTests);
      } catch (error) {
        console.error('Error parsing saved selected tests:', error);
      }
    }
    return [];
  });
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [availableTests, setAvailableTests] = useState<LabTest[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [testsLoading, setTestsLoading] = useState(false);
  
  // Pagination hook for lab tests (isolated from LabTestsManager)
  const testsPagination = usePagination({ 
    initialPage: 1, 
    initialLimit: 12,
    storageKey: 'labTestCard-pagination'
  });
  
  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  // Simple loading state tracking
  const loadingRef = useRef(false);
  
  // Store pagination functions in ref to avoid dependency issues
  const paginationRef = useRef(testsPagination);
  paginationRef.current = testsPagination;
  
  // Load tests from API with pagination and search
  const loadTests = async (resetPagination = true) => {
    // Prevent multiple concurrent calls
    if (loadingRef.current) {
      console.log('API call already in progress, skipping...');
      return;
    }
    
    loadingRef.current = true;
    
    try {
      setTestsLoading(true);
      console.log('Loading tests from API with pagination...');
      console.log('🔍 LabTestCard Pagination State:', { 
        page: paginationRef.current.page, 
        limit: paginationRef.current.limit, 
        resetPagination 
      });
      
      // Get current pagination values
      const currentPage = resetPagination ? 1 : paginationRef.current.page;
      const currentLimit = paginationRef.current.limit;
      
      if (resetPagination) {
        paginationRef.current.setPage(1);
      }
      
      const params = {
        page: currentPage,
        limit: currentLimit,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      };
      
      console.log('API params:', params);
      
      const response = await api.labTests.getAll(params);
      const { tests: apiTests, total, totalPages } = response;
      
      console.log(`✅ Loaded ${apiTests.length} tests from API`);
      console.log(`📊 Page ${params.page}/${totalPages}, Total: ${total}`);
      console.log('📝 Tests:', apiTests.map(t => t.name));
      
      // Convert API tests to app test format
      const convertedTests: LabTest[] = apiTests.map((apiTest: {
        id: string;
        name: string;
        price: string | number; // API returns Decimal as string
        category: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
      }) => ({
        id: apiTest.id,
        name: apiTest.name,
        price: Number(apiTest.price), // Convert Decimal string to number
        category: apiTest.category,
        description: apiTest.description || ''
      }));
      
      setAvailableTests(convertedTests);
      paginationRef.current.updateTotal(total);
      
      console.log(`✅ Updated state: ${convertedTests.length} tests displayed`);
    } catch (error) {
      console.error('Failed to load tests from API:', error);
      // Fallback to static tests if API fails
      console.log('Falling back to static tests:', labTests.length);
      setAvailableTests(labTests);
      paginationRef.current.updateTotal(labTests.length);
    } finally {
      setTestsLoading(false);
      loadingRef.current = false;
    }
  };

  // Load tests when authentication status changes or when switching to orders page
  useEffect(() => {
    if (!isAuthenticated) {
      // Load local test data when not authenticated
      console.log('User not authenticated, loading local test data:', labTests.length);
      setAvailableTests(labTests);
      paginationRef.current.updateTotal(labTests.length);
    } else {
      // Initial load when authenticated
      console.log('User authenticated, loading tests from API');
      loadTests(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Reload tests when switching to orders page to restore pagination state
  useEffect(() => {
    if (currentPage === 'orders' && isAuthenticated) {
      console.log('🔄 Orders page active, ensuring tests are loaded for pagination');
      // Small delay to ensure forceReset completes first
      const timeoutId = setTimeout(() => {
        loadTests(true);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isAuthenticated]);
  
  // Load tests when search term changes (with delay)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const timeoutId = setTimeout(() => {
      console.log('Search term changed, loading tests');
      loadTests(true); // Reset to first page when searching
    }, 200);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, isAuthenticated]);
  
  // Load tests when page or limit changes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    console.log(`Pagination changed - Page: ${testsPagination.page}, Limit: ${testsPagination.limit}`);
    loadTests(false); // Don't reset pagination when page/limit changes
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testsPagination.page, testsPagination.limit, isAuthenticated]);

  // Load transactions from API
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const { transactions: apiTransactions } = await api.transactions.getAll();
        
        // Convert API transactions to app transaction format
        const convertedTransactions: Transaction[] = apiTransactions.map((apiTx: {
          id: string;
          customer: { id: string; name: string; phone?: string; email?: string };
          transactionTests?: Array<{
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
          selectedTests: apiTx.transactionTests?.map((tt) => ({
            test: tt.labTest,
            quantity: tt.quantity
          })) || [],
          totalCost: Number(apiTx.totalCost), // Convert Decimal string to number
          paymentMethod: apiTx.paymentMethod.toLowerCase() as 'cash' | 'momo',
          date: new Date(apiTx.createdAt),
          referenceNumber: apiTx.referenceNumber
        }));

        setTransactions(convertedTransactions);
      } catch (error) {
        console.error('Failed to load transactions from API:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('lab-transactions');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const transactionsWithDates = parsed.map((t: Transaction) => ({
              ...t,
              date: new Date(t.date)
            }));
            setTransactions(transactionsWithDates);
          } catch (error) {
            console.error('Error loading transactions from localStorage:', error);
          }
        }
      }
    };

    if (isAuthenticated) {
      loadTransactions();
    }
  }, [isAuthenticated]);

  // Save transactions to localStorage for backup whenever transactions change
  useEffect(() => {
    localStorage.setItem('lab-transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Save current page to localStorage for persistence across refreshes
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
    
    // Reset LabTestCard pagination when switching to orders page
    if (currentPage === 'orders') {
      console.log('🔄 Switched to orders page, resetting LabTestCard pagination to limit 12');
      // Force reset to page 1 with limit 12 to ensure correct LabTestCard parameters
      paginationRef.current.forceReset(1, 12);
      // Clear search term when switching to orders (with slight delay)
      setTimeout(() => setSearchTerm(''), 100);
    }
  }, [currentPage]);

  // Save current step to localStorage for persistence across refreshes
  useEffect(() => {
    localStorage.setItem('currentStep', currentStep);
  }, [currentStep]);

  // Save selected tests to localStorage for persistence across refreshes
  useEffect(() => {
    localStorage.setItem('selectedTests', JSON.stringify(selectedTests));
  }, [selectedTests]);

  // Show a loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show activation modal if activation is required (check this first, before authentication)
  if (needsActivation) {
    return <ActivationModal 
      onActivate={activateApp} 
      isLoading={activationLoading} 
      error={activationError} 
    />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleAddTest = (test: LabTest) => {
    setSelectedTests(prev => {
      const existing = prev.find(item => item.test.id === test.id);
      if (existing) {
        return prev.map(item =>
          item.test.id === test.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { test, quantity: 1 }];
    });
  };

  const handleRemoveTest = (testId: string) => {
    setSelectedTests(prev => prev.filter(item => item.test.id !== testId));
  };

  const handleQuantityChange = (testId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveTest(testId);
      return;
    }
    
    setSelectedTests(prev =>
      prev.map(item =>
        item.test.id === testId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleCustomerSubmit = async (customer: Customer, paymentMethod: PaymentMethod) => {
    console.log('🔄 Starting customer submission...', { customer, paymentMethod });
    
    try {
      // First, create or get the customer
      let customerData: { id: string; name: string; phone?: string; email?: string };
      try {
        console.log('🔍 Searching for existing customer...');
        const { customers: existingCustomers } = await api.customers.getAll({ search: customer.name });
        const existingCustomer = existingCustomers.find((c: { name: string; id: string }) => 
          c.name.toLowerCase() === customer.name.toLowerCase()
        );
        
        if (existingCustomer) {
          console.log('✅ Found existing customer:', existingCustomer);
          customerData = existingCustomer;
        } else {
          console.log('➕ Creating new customer...');
          const { customer: newCustomer } = await api.customers.create(customer);
          console.log('✅ Customer created:', newCustomer);
          customerData = newCustomer;
        }
      } catch (error) {
        // If customer creation fails, create the transaction without saving to API
        console.error('❌ Failed to create customer:', error);
        customerData = { ...customer, id: Date.now().toString() };
      }

      // Create the transaction
      console.log('💳 Creating transaction...', { customerData });
      const transactionRequest = {
        customerId: customerData.id,
        selectedTests: selectedTests.map(selectedTest => ({
          testId: selectedTest.test.id,
          quantity: selectedTest.quantity
        })),
        paymentMethod: paymentMethod.toUpperCase() as 'CASH' | 'MOMO'
      };

      try {
        console.log('📝 Transaction request:', transactionRequest);
        const { transaction } = await api.transactions.create(transactionRequest);
        console.log('✅ Transaction created:', transaction);
        
        // Convert API transaction to app transaction format
        const appTransaction: Transaction = {
          id: transaction.id,
          customer: customerData,
          selectedTests,
          totalCost: transaction.totalCost,
          paymentMethod: transaction.paymentMethod.toLowerCase() as PaymentMethod,
          date: new Date(transaction.createdAt),
          referenceNumber: transaction.referenceNumber
        };

        setCurrentTransaction(appTransaction);
        setTransactions(prev => [appTransaction, ...prev]);
        setCurrentStep('receipt');
      } catch (error) {
        console.error('❌ Failed to create transaction:', error);
        
        // Fallback: create local transaction if API fails
        const fallbackTransaction: Transaction = {
          id: Date.now().toString(),
          customer: customerData,
          selectedTests,
          totalCost: calculateTotal(selectedTests),
          paymentMethod,
          date: new Date(),
          referenceNumber: generateReferenceNumber()
        };

        setCurrentTransaction(fallbackTransaction);
        setTransactions(prev => [fallbackTransaction, ...prev]);
        setCurrentStep('receipt');
      }
    } catch (error) {
      console.error('❌ Error processing transaction:', error);
      
      // Ultimate fallback: create completely local transaction
      const localTransaction: Transaction = {
        id: Date.now().toString(),
        customer: { ...customer } as Customer & { id: string },
        selectedTests,
        totalCost: calculateTotal(selectedTests),
        paymentMethod,
        date: new Date(),
        referenceNumber: generateReferenceNumber()
      };

      setCurrentTransaction(localTransaction);
      setTransactions(prev => [localTransaction, ...prev]);
      setCurrentStep('receipt');
    }
  };

  const handleNewOrder = () => {
    setCurrentPage('orders');
    setCurrentStep('selection');
    setSelectedTests([]);
    setCurrentTransaction(null);
    setShowPrintPreview(false);
    // Clear the order-related localStorage when starting a new order
    localStorage.removeItem('selectedTests');
    localStorage.removeItem('customerFormData');
    localStorage.removeItem('paymentMethod');
    localStorage.setItem('currentStep', 'selection');
  };

  const handlePrintPreviewClose = () => {
    setShowPrintPreview(false);
    setCurrentStep('receipt');
  };

  const handlePrintPreviewPrint = () => {
    handlePrint();
  };



  const handlePrint = async () => {
    // Ensure transaction is saved to database before printing
    if (currentTransaction) {
      try {
        // Check if transaction has a proper UUID (indicating it was saved to DB)
        // If the ID is just a timestamp, it means it's a local transaction that wasn't saved
        const isLocalTransaction = /^\d+$/.test(currentTransaction.id);
        
        if (isLocalTransaction) {
          console.log('Saving local transaction to database...');
          
          // Create the transaction in the database
          const transactionRequest = {
            customerId: (currentTransaction.customer as Customer & { id: string }).id,
            selectedTests: currentTransaction.selectedTests.map(selectedTest => ({
              testId: selectedTest.test.id,
              quantity: selectedTest.quantity
            })),
            paymentMethod: currentTransaction.paymentMethod.toUpperCase() as 'CASH' | 'MOMO'
          };

          const { transaction } = await api.transactions.create(transactionRequest);
          
          // Update the current transaction with the saved data
          const updatedTransaction: Transaction = {
            ...currentTransaction,
            id: transaction.id,
            referenceNumber: transaction.referenceNumber,
            totalCost: transaction.totalCost,
            date: new Date(transaction.createdAt)
          };
          
          setCurrentTransaction(updatedTransaction);
          
          // Update the transactions list
          setTransactions(prev => prev.map(t => 
            t.id === currentTransaction.id ? updatedTransaction : t
          ));
          
          console.log('Transaction saved successfully with ID:', transaction.id);
        }
      } catch (error) {
        console.error('Failed to save transaction to database:', error);
        // Continue with printing even if save fails
      }
    }

    // Print the exact visual preview from Receipt component (DOM element with id="receipt-content")
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=900');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Lab Receipt</title>');
        printWindow.document.write('<style>');
        
        // Minimal print styles that preserve the exact inline styles from Receipt component
        printWindow.document.write(`
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: "Courier New", Courier, monospace;
            background: white;
            color: black;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          
          body {
            padding-top: 2mm;
          }
          
          /* Center the receipt content */
          #receipt-content {
            margin: 0 auto !important;
            display: block !important;
          }
          
          /* Preserve all inline styles and grid layouts */
          div[style*="display: grid"] {
            display: grid !important;
          }
          
          div[style*="grid-template-columns"] {
            /* Let inline styles handle this */
          }
          
          img {
            display: block !important;
          }
          
          /* Hide any non-print elements that might be in the receipt */
          .no-print {
            display: none !important;
          }
        `);
        
        printWindow.document.write('</style></head><body>');
        // Copy the exact HTML content including all inline styles
        printWindow.document.write(printContent.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // Set up event listeners to auto-close the window after printing
        printWindow.onbeforeunload = function() {
          printWindow.close();
        };
        
        printWindow.onafterprint = function() {
          printWindow.close();
          // Redirect to lab test selection and clear all data after printing
          handleNewOrder();
        };
        
        // For older browsers, close after a delay and redirect
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
          // Also redirect after timeout to handle browsers that don't support onafterprint
          setTimeout(() => {
            handleNewOrder();
          }, 500);
        }, 1000);
        
        printWindow.print();
      }
    }
  };

  const totalCost = calculateTotal(selectedTests);
  const selectedTestsMap = selectedTests.reduce((acc, item) => {
    acc[item.test.id] = item;
    return acc;
  }, {} as Record<string, SelectedTest>);

  // Use available tests directly since filtering is now done server-side
  const filteredTests = availableTests;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 print-hide">
        <Sidebar currentPage={currentPage} onPageChange={(page) => setCurrentPage(page as AppPage)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {currentPage === 'orders' && currentStep === 'selection' && (
          <div className="print-hide">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Lab Tests</h2>
                <p className="text-gray-600">Select the tests for your patient</p>
              </div>
              
              {selectedTests.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xl font-bold text-blue-600 mb-4">
                    {formatCurrency(totalCost)}
                  </p>
                  <button
                    onClick={() => setCurrentStep('customer')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors duration-200"
                  >
                    Proceed to Checkout ({selectedTests.length})
                  </button>
                </div>
              )}
            </div>

            {/* Search Field */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tests by name, description, or category..."
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {(debouncedSearchTerm || searchTerm) && (
                <p className="mt-2 text-sm text-gray-600">
                  {testsLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      Searching...
                    </span>
                  ) : (
                    <>Found {testsPagination.total} test{testsPagination.total !== 1 ? 's' : ''} matching "{debouncedSearchTerm || searchTerm}"</>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!isAuthenticated ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600">Please log in to view available tests.</p>
                  </div>
                ) : testsLoading ? (
                  <div className="col-span-full text-center py-12">
                    <div className="inline-flex items-center gap-2 text-gray-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      Loading tests...
                    </div>
                  </div>
                ) : filteredTests.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600">
                      {debouncedSearchTerm ? `No tests found matching "${debouncedSearchTerm}"` : 'No tests available.'}
                    </p>
                  </div>
                ) : (
                  filteredTests.map(test => (
                    <LabTestCard
                      key={test.id}
                      test={test}
                      selectedTest={selectedTestsMap[test.id]}
                      onAdd={handleAddTest}
                      onRemove={handleRemoveTest}
                      onQuantityChange={handleQuantityChange}
                    />
                  ))
                )}
              </div>
              

              
              {/* Pagination Debug Info */}
              {isAuthenticated && !testsLoading && (
                <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  Debug: total={testsPagination.total}, totalPages={testsPagination.totalPages}, page={testsPagination.page}, limit={testsPagination.limit}
                </div>
              )}
              
              {/* Pagination */}
              {isAuthenticated && !testsLoading && testsPagination.total > 0 && (
                <Pagination
                  currentPage={testsPagination.page}
                  totalPages={testsPagination.totalPages}
                  onPageChange={testsPagination.setPage}
                  canGoPrev={testsPagination.canGoPrev}
                  canGoNext={testsPagination.canGoNext}
                  onFirstPage={testsPagination.firstPage}
                  onLastPage={testsPagination.lastPage}
                  onPrevPage={testsPagination.prevPage}
                  onNextPage={testsPagination.nextPage}
                  total={testsPagination.total}
                  limit={testsPagination.limit}
                  onLimitChange={testsPagination.setLimit}
                  loading={testsLoading}
                />
              )}
            </div>
          </div>
        )}

        {currentPage === 'orders' && currentStep === 'customer' && (
          <div className="print-hide">
            <CustomerForm
              selectedTests={selectedTests}
              totalCost={totalCost}
              onSubmit={handleCustomerSubmit}
              onBack={() => setCurrentStep('selection')}
            />
          </div>
        )}

        {currentPage === 'orders' && currentStep === 'receipt' && currentTransaction && (
          <Receipt
            transaction={currentTransaction}
            onNewOrder={handleNewOrder}
            onPrint={handlePrint}
          />
        )}

        {currentPage === 'tests' && (
          <div className="print-hide">
            <LabTestsManager
              tests={availableTests}
              onTestsChange={setAvailableTests}
            />
          </div>
        )}

        {currentPage === 'transactions' && (
          <div className="print-hide">
            <TransactionHistory transactions={transactions} />
          </div>
        )}

        {currentPage === 'users' && (
          <div className="print-hide">
            <UserManagement />
          </div>
        )}

        {currentPage === 'activation' && (
          <div className="print-hide">
            <ActivationManager />
          </div>
        )}

        {currentPage === 'settings' && (
          <div className="text-center py-12 print-hide">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings page coming soon...</p>
          </div>
        )}

        {/* Print Preview Modal */}
        {showPrintPreview && currentTransaction && (
          <PrintPreview
            transaction={currentTransaction}
            onClose={handlePrintPreviewClose}
            onPrint={handlePrintPreviewPrint}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ActivationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ActivationProvider>
  );
}

export default App;