/**
 * Tests for useTaskForm hook
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { useTaskForm, Task } from '@/hooks/use-task-form'
import { render } from '../utils/test-utils'

// Mock fetch
global.fetch = jest.fn()

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
      },
    },
    status: 'authenticated',
  }),
}))

// Mock error handler
jest.mock('@/lib/error-handler', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}))

// Mock useErrorHandler
jest.mock('@/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    executeWithErrorHandling: jest.fn(async (fn) => {
      try {
        return await fn()
      } catch (error) {
        throw error
      }
    }),
    isLoading: false,
  }),
}))

describe('useTaskForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  const mockEmployees = [
    {
      id: '1',
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
    },
  ]

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: '2024-12-31',
    assigneeId: '1',
    assignee: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  }

  it('initializes with default values when no task provided', () => {
    const { result } = renderHook(() =>
      useTaskForm({
        task: null,
        onSuccess: jest.fn(),
      })
    )

    expect(result.current.formData).toEqual({
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      assigneeId: '',
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('initializes form data from existing task', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockEmployees }),
    })

    const { result } = renderHook(() =>
      useTaskForm({
        task: mockTask,
        onSuccess: jest.fn(),
      })
    )

    // Wait for employees to be fetched and form to be initialized
    await waitFor(() => {
      expect(result.current.formData.title).toBe('Test Task')
    }, { timeout: 3000 })
    
    expect(result.current.formData.description).toBe('Test Description')
    expect(result.current.formData.priority).toBe('HIGH')
    expect(result.current.formData.assigneeId).toBe('1')
  })

  it('fetches employees on mount', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockEmployees }),
    })

    renderHook(() =>
      useTaskForm({
        task: null,
        onSuccess: jest.fn(),
      })
    )

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/employees?limit=100')
    }, { timeout: 3000 })
  })

  it('updates form data when handleChange is called', () => {
    const { result } = renderHook(() =>
      useTaskForm({
        task: null,
        onSuccess: jest.fn(),
      })
    )

    act(() => {
      result.current.handleChange('title', 'New Title')
    })

    expect(result.current.formData.title).toBe('New Title')
  })

  it('handles form submission for new task', async () => {
    const onSuccess = jest.fn()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockEmployees }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Task created successfully',
        }),
      })

    const { result } = renderHook(() =>
      useTaskForm({
        task: null,
        onSuccess,
      })
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    act(() => {
      result.current.handleChange('title', 'New Task')
    })

    const formEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent

    await act(async () => {
      await result.current.handleSubmit(formEvent)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    
    const fetchCalls = (fetch as jest.Mock).mock.calls
    const taskCall = fetchCalls.find(call => call[0] === '/api/tasks')
    expect(taskCall).toBeDefined()
    expect(taskCall[1].method).toBe('POST')
  })

  it('handles form submission for updating existing task', async () => {
    const onSuccess = jest.fn()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockEmployees }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Task updated successfully',
        }),
      })

    const { result } = renderHook(() =>
      useTaskForm({
        task: mockTask,
        onSuccess,
      })
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const formEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent

    await act(async () => {
      await result.current.handleSubmit(formEvent)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
    
    const fetchCalls = (fetch as jest.Mock).mock.calls
    const taskCall = fetchCalls.find(call => call[0]?.includes('/api/tasks/1'))
    expect(taskCall).toBeDefined()
    expect(taskCall[1].method).toBe('PUT')
  })

  it('handles unassigned assignee correctly', async () => {
    const onSuccess = jest.fn()
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockEmployees }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Task created successfully',
        }),
      })

    const { result } = renderHook(() =>
      useTaskForm({
        task: null,
        onSuccess,
      })
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    act(() => {
      result.current.handleChange('assigneeId', 'unassigned')
    })

    const formEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent

    await act(async () => {
      await result.current.handleSubmit(formEvent)
    })

    await waitFor(() => {
      const fetchCalls = (fetch as jest.Mock).mock.calls
      const taskCall = fetchCalls.find(call => call[0] === '/api/tasks')
      if (taskCall) {
        const body = JSON.parse(taskCall[1].body)
        expect(body.assigneeId).toBe(null)
      }
    })
  })
})

