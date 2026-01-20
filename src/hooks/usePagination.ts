import { useState, useCallback, useEffect } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  storageKey?: string; // Unique key for localStorage persistence
}

interface UsePaginationResult extends PaginationState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  updateTotal: (total: number) => void;
  reset: () => void;
  forceReset: (page?: number, limit?: number) => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, initialLimit = 10, storageKey } = options;
  
  const [pagination, setPagination] = useState<PaginationState>(() => {
    // Try to restore from localStorage if storageKey is provided
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`pagination-${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            page: parsed.page || initialPage,
            limit: parsed.limit || initialLimit,
            total: 0, // Always reset total - it comes from API
            totalPages: 0, // Always reset totalPages - it's calculated
          };
        }
      } catch (error) {
        console.warn(`Failed to restore pagination for ${storageKey}:`, error);
      }
    }
    
    return {
      page: initialPage,
      limit: initialLimit,
      total: 0,
      totalPages: 0,
    };
  });

  const setPage = useCallback((page: number) => {
    setPagination(prev => {
      const newPage = Math.max(1, Math.min(page, prev.totalPages || 1));
      return {
        ...prev,
        page: newPage
      };
    });
  }, []);

  const setLimit = useCallback((limit: number) => {
    setPagination(prev => {
      const newTotalPages = Math.ceil(prev.total / limit);
      return {
        ...prev,
        limit,
        totalPages: newTotalPages,
        page: Math.min(prev.page, newTotalPages || 1)
      };
    });
  }, []);

  const nextPage = useCallback(() => {
    setPage(pagination.page + 1);
  }, [pagination.page, setPage]);

  const prevPage = useCallback(() => {
    setPage(pagination.page - 1);
  }, [pagination.page, setPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(pagination.totalPages);
  }, [pagination.totalPages, setPage]);

  const updateTotal = useCallback((total: number) => {
    setPagination(prev => {
      const newTotalPages = Math.ceil(total / prev.limit);
      return {
        ...prev,
        total,
        totalPages: newTotalPages,
        page: Math.min(prev.page, newTotalPages || 1)
      };
    });
  }, []);

  const reset = useCallback(() => {
    setPagination({
      page: initialPage,
      limit: initialLimit,
      total: 0,
      totalPages: 0,
    });
  }, [initialPage, initialLimit]);

  const forceReset = useCallback((page?: number, limit?: number) => {
    const newState = {
      page: page || initialPage,
      limit: limit || initialLimit,
      total: 0,
      totalPages: 0,
    };
    setPagination(newState);
    
    // Also update localStorage immediately with the new values
    if (storageKey) {
      try {
        const toSave = {
          page: newState.page,
          limit: newState.limit,
        };
        localStorage.setItem(`pagination-${storageKey}`, JSON.stringify(toSave));
      } catch (error) {
        console.warn(`Failed to save pagination for ${storageKey} during forceReset:`, error);
      }
    }
  }, [initialPage, initialLimit, storageKey]);

  // Persist pagination state to localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const toSave = {
          page: pagination.page,
          limit: pagination.limit,
        };
        localStorage.setItem(`pagination-${storageKey}`, JSON.stringify(toSave));
      } catch (error) {
        console.warn(`Failed to save pagination for ${storageKey}:`, error);
      }
    }
  }, [pagination.page, pagination.limit, storageKey]);

  const canGoNext = pagination.page < pagination.totalPages;
  const canGoPrev = pagination.page > 1;

  return {
    ...pagination,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    canGoNext,
    canGoPrev,
    updateTotal,
    reset,
    forceReset,
  };
}
