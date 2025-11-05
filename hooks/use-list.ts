/**
 * Reusable Data Fetching Hooks
 * Extracted common patterns for lists, pagination, filtering
 * Following DRY principles and Next.js 15 best practices
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { showErrorToast } from '@/lib/error-handler';
import { logError } from '@/lib/utils/logger';
import { useDebounce } from '@/hooks/use-debounce';
import { BusinessRules } from '@/lib/constants/business-rules';

/**
 * Generic filter type for list queries
 */
export interface ListFilters {
  search?: string;
  [key: string]: string | number | boolean | undefined | Date | { from?: Date; to?: Date };
}

/**
 * Pagination metadata from API response
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Standard API list response format
 */
export interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: PaginationMeta;
  [key: string]: unknown;
}

/**
 * Options for usePaginatedList hook
 */
export interface UsePaginatedListOptions<T> {
  endpoint: string;
  defaultPageSize?: number;
  debounceMs?: number;
  enabled?: boolean;
  initialFilters?: ListFilters;
  transformResponse?: (response: unknown) => ListResponse<T>;
  onError?: (error: unknown) => void;
  onSuccess?: (data: T[]) => void;
}

/**
 * Return type for usePaginatedList hook
 */
export interface UsePaginatedListReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  filters: ListFilters;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: ListFilters | ((prev: ListFilters) => ListFilters)) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching paginated lists with filters and search
 * 
 * @example
 * ```tsx
 * const {
 *   data: employees,
 *   loading,
 *   currentPage,
 *   totalPages,
 *   setPage,
 *   setSearch,
 *   refresh
 * } = usePaginatedList<Employee>({
 *   endpoint: '/api/employees',
 *   defaultPageSize: 10,
 *   initialFilters: { department: 'all' }
 * });
 * ```
 */
export function usePaginatedList<T>(
  options: UsePaginatedListOptions<T>
): UsePaginatedListReturn<T> {
  const {
    endpoint,
    defaultPageSize = BusinessRules.PAGINATION.DEFAULT_LIMIT,
    debounceMs = 500,
    enabled = true,
    initialFilters = {},
    transformResponse,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<ListFilters>(initialFilters);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search term
  const debouncedSearch = useDebounce(
    typeof filters.search === 'string' ? filters.search : '',
    debounceMs
  );

  // Build query parameters from filters
  const buildQueryParams = useCallback((currentFilters: ListFilters, page: number, size: number): URLSearchParams => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: size.toString(),
    });

    // Add search if present
    if (currentFilters.search && typeof currentFilters.search === 'string' && currentFilters.search.trim()) {
      params.set('search', currentFilters.search.trim());
    }

    // Add other filters
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (key === 'search') return; // Already handled
      
      if (value === undefined || value === null || value === '') return;
      
      if (typeof value === 'boolean') {
        params.set(key, value ? 'true' : 'false');
      } else if (typeof value === 'number') {
        params.set(key, value.toString());
      } else if (value instanceof Date) {
        params.set(key, value.toISOString());
      } else if (typeof value === 'object' && 'from' in value && 'to' in value) {
        // Date range
        if (value.from) {
          params.set(`${key}From`, value.from.toISOString());
        }
        if (value.to) {
          params.set(`${key}To`, value.to.toISOString());
        }
      } else if (typeof value === 'string') {
        // Skip "all" values and empty strings
        if (value !== 'all' && value.trim() !== '') {
          params.set(key, value);
        }
      }
    });

    return params;
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Use debounced search in filters
      const effectiveFilters = {
        ...filters,
        search: debouncedSearch,
      };

      const queryParams = buildQueryParams(effectiveFilters, currentPage, pageSize);
      const url = `${endpoint}?${queryParams}`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Transform response if needed
      const transformedResult = transformResponse 
        ? transformResponse(result)
        : result as ListResponse<T>;

      if (transformedResult.success && transformedResult.data) {
        setData(transformedResult.data);
        
        if (transformedResult.meta) {
          setTotalPages(transformedResult.meta.totalPages);
          setTotalItems(transformedResult.meta.total);
        } else {
          // Fallback: estimate from data length
          setTotalPages(Math.ceil(transformedResult.data.length / pageSize));
          setTotalItems(transformedResult.data.length);
        }

        onSuccess?.(transformedResult.data);
      } else {
        const errorMessage = typeof transformedResult.error === 'string' 
          ? transformedResult.error 
          : (transformedResult.error && typeof transformedResult.error === 'object' && 'message' in transformedResult.error && typeof transformedResult.error.message === 'string')
            ? transformedResult.error.message
            : 'Failed to fetch data';
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      logError(err, { context: `usePaginatedList - ${endpoint}` });
      
      if (onError) {
        onError(err);
      } else {
        showErrorToast(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    endpoint,
    filters,
    debouncedSearch,
    currentPage,
    pageSize,
    buildQueryParams,
    transformResponse,
    onError,
    onSuccess,
  ]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Set page handler
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Set page size handler
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Set filters handler
  const handleSetFilters = useCallback((
    newFilters: ListFilters | ((prev: ListFilters) => ListFilters)
  ) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Set search handler
  const handleSetSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setCurrentPage(1); // Reset to first page when search changes
  }, []);

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
    setCurrentPage(1);
  }, [initialFilters]);

  // Refresh handler
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Refetch alias (same as refresh)
  const refetch = refresh;

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    filters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    setFilters: handleSetFilters,
    setSearch: handleSetSearch,
    clearFilters: handleClearFilters,
    refresh,
    refetch,
  };
}

/**
 * Hook for fetching a simple list (no pagination)
 * 
 * @example
 * ```tsx
 * const {
 *   data: departments,
 *   loading,
 *   refresh
 * } = useSimpleList<Department>({
 *   endpoint: '/api/settings/departments'
 * });
 * ```
 */
export interface UseSimpleListOptions<T> {
  endpoint: string;
  enabled?: boolean;
  transformResponse?: (response: unknown) => { success: boolean; data: T[] };
  onError?: (error: unknown) => void;
  onSuccess?: (data: T[]) => void;
}

export interface UseSimpleListReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching simple lists without pagination
 * 
 * @param options - Configuration options
 * @param options.endpoint - API endpoint URL
 * @param options.enabled - Whether to fetch data (default: true)
 * @param options.transformResponse - Optional function to transform API response
 * @param options.onError - Optional error callback
 * @param options.onSuccess - Optional success callback
 * @returns Object with data, loading state, error, and refresh function
 * 
 * @example
 * ```tsx
 * const { data: departments, loading, refresh } = useSimpleList<Department>({
 *   endpoint: '/api/settings/departments'
 * });
 * ```
 */
export function useSimpleList<T>(
  options: UseSimpleListOptions<T>
): UseSimpleListReturn<T> {
  const {
    endpoint,
    enabled = true,
    transformResponse,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      const transformedResult = transformResponse 
        ? transformResponse(result)
        : result as { success: boolean; data: T[] };

      if (transformedResult.success && transformedResult.data) {
        setData(transformedResult.data);
        onSuccess?.(transformedResult.data);
      } else {
        throw new Error((result as { error?: string }).error || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      logError(err, { context: `useSimpleList - ${endpoint}` });
      
      if (onError) {
        onError(err);
      } else {
        showErrorToast(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, enabled, transformResponse, onError, onSuccess]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    refetch: refresh,
  };
}

