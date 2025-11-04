/**
 * Optimized API client with caching and request deduplication
 */

import { cache, CacheKeys, CacheTTL } from './cache';
import { logger } from './logger';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown> | unknown[];
  headers?: Record<string, string>;
  cache?: boolean;
  cacheTTL?: number;
  skipCache?: boolean;
}

// Request deduplication
const pendingRequests = new Map<string, Promise<unknown>>();

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      cache: useCache = true,
      cacheTTL = CacheTTL.MEDIUM,
      skipCache = false,
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${method}_${url}_${JSON.stringify(body || {})}`;

    // Check cache first for GET requests
    if (method === 'GET' && useCache && !skipCache) {
      const cachedData = cache.get<T>(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return cachedData;
      }
    }

    // Check for pending request to avoid duplicates
    if (pendingRequests.has(cacheKey)) {
      logger.debug(`Deduplicating request: ${cacheKey}`);
      return pendingRequests.get(cacheKey)! as Promise<T>;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      
      // Cache successful GET requests
      if (method === 'GET' && useCache && !skipCache) {
        cache.set(cacheKey, data, cacheTTL);
        logger.debug(`Cached: ${cacheKey}`);
      }

      return data;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Optimized API methods
  async getEmployees(limit?: number, skipCache = false) {
    const endpoint = `/employees${limit ? `?limit=${limit}` : ''}`;
    return this.makeRequest(endpoint, {
      cacheTTL: CacheTTL.LONG,
      skipCache,
    });
  }

  async getTasks(filters?: Record<string, string | number | boolean>, skipCache = false) {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/tasks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.makeRequest(endpoint, {
      cacheTTL: CacheTTL.SHORT,
      skipCache,
    });
  }

  async getTaskStats(skipCache = false) {
    return this.makeRequest('/tasks/stats', {
      cacheTTL: CacheTTL.SHORT,
      skipCache,
    });
  }

  async getNotifications(limit = 20, skipCache = false) {
    return this.makeRequest(`/notifications?limit=${limit}`, {
      cacheTTL: CacheTTL.SHORT,
      skipCache,
    });
  }

  async createTask(taskData: Record<string, unknown>) {
    const result = await this.makeRequest('/tasks', {
      method: 'POST',
      body: taskData,
      cache: false,
    });
    
    // Invalidate related caches
    this.invalidateTaskCaches();
    
    return result;
  }

  async updateTask(id: string, taskData: Record<string, unknown>) {
    const result = await this.makeRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: taskData,
      cache: false,
    });
    
    // Invalidate related caches
    this.invalidateTaskCaches();
    
    return result;
  }

  async deleteTask(id: string) {
    const result = await this.makeRequest(`/tasks/${id}`, {
      method: 'DELETE',
      cache: false,
    });
    
    // Invalidate related caches
    this.invalidateTaskCaches();
    
    return result;
  }

  async updateNotification(id: string, data: Record<string, unknown>) {
    const result = await this.makeRequest('/notifications', {
      method: 'PUT',
      body: { id, ...data },
      cache: false,
    });
    
    // Invalidate notification cache
    cache.delete(CacheKeys.notifications());
    
    return result;
  }

  // Cache invalidation methods
  invalidateTaskCaches() {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes('tasks') || key.includes('task_stats')) {
        cache.delete(key);
      }
    });
    console.log('Invalidated task caches');
  }

  invalidateEmployeeCaches() {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes('employees')) {
        cache.delete(key);
      }
    });
    console.log('Invalidated employee caches');
  }

  invalidateAllCaches() {
    cache.clear();
    console.log('Cleared all caches');
  }

  // Debug methods
  getCacheStats() {
    return {
      size: cache.size(),
      keys: cache.keys(),
    };
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse, RequestOptions };
