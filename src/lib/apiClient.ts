// 统一的API客户端工具
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface ApiClientOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
}

export class ApiClient {
  private baseUrl: string
  private defaultOptions: ApiClientOptions

  constructor(baseUrl: string = '', options: ApiClientOptions = {}) {
    this.baseUrl = baseUrl
    this.defaultOptions = {
      timeout: 30000, // 30秒超时
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时 (${timeout}ms)`)
      }
      throw error
    }
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    clientOptions: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const mergedOptions = { ...this.defaultOptions, ...clientOptions }
    const fullUrl = this.baseUrl + url

    let lastError: any
    
    for (let attempt = 0; attempt < mergedOptions.retries!; attempt++) {
      try {
        console.log(`🔄 API请求 (尝试 ${attempt + 1}/${mergedOptions.retries}): ${fullUrl}`)
        
        const response = await this.fetchWithTimeout(
          fullUrl,
          {
            ...options,
            headers: {
              ...mergedOptions.headers,
              ...options.headers
            }
          },
          mergedOptions.timeout!
        )

        const data = await response.json()

        if (!response.ok) {
          // 如果响应包含错误信息，使用它；否则使用HTTP状态
          const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`
          console.error(`❌ API请求失败 (HTTP ${response.status}): ${errorMessage}`)
          return {
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        }

        console.log(`✅ API请求成功: ${fullUrl}`)

        // 如果响应已经包含success字段，直接返回；否则包装为成功响应
        if (typeof data === 'object' && data !== null && 'success' in data) {
          return data
        } else {
          return {
            success: true,
            data: data,
            timestamp: new Date().toISOString()
          }
        }
      } catch (error) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`❌ API请求失败 (尝试 ${attempt + 1}): ${errorMessage}`)
        
        if (attempt < mergedOptions.retries! - 1) {
          const delay = mergedOptions.retryDelay! * Math.pow(1.5, attempt)
          console.log(`⏳ 等待 ${delay}ms 后重试...`)
          await this.delay(delay)
        }
      }
    }

    // 所有重试都失败了
    console.error(`💥 API请求最终失败: ${fullUrl}`, lastError)
    const errorMessage = lastError instanceof Error ? lastError.message : 'API请求失败'
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }
  }

  async get<T>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'GET' }, options)
  }

  async post<T>(
    url: string, 
    data?: any, 
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, options)
  }

  async put<T>(
    url: string,
    data?: any,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, options)
  }

  async patch<T>(
    url: string,
    data?: any,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }, options)
  }

  async delete<T>(url: string, options: ApiClientOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'DELETE' }, options)
  }
}

// 创建默认的API客户端实例
export const apiClient = new ApiClient('/api', {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
})

// 快捷方法
export const api = {
  get: <T>(url: string, options?: ApiClientOptions) => apiClient.get<T>(url, options),
  post: <T>(url: string, data?: any, options?: ApiClientOptions) => apiClient.post<T>(url, data, options),
  put: <T>(url: string, data?: any, options?: ApiClientOptions) => apiClient.put<T>(url, data, options),
  patch: <T>(url: string, data?: any, options?: ApiClientOptions) => apiClient.patch<T>(url, data, options),
  delete: <T>(url: string, options?: ApiClientOptions) => apiClient.delete<T>(url, options)
}

// 专门的API方法
export const postsApi = {
  getPosts: (limit = 20, offset = 0) => 
    api.get(`/posts?limit=${limit}&offset=${offset}`),
  
  getPost: (id: string) => 
    api.get(`/posts/${id}`),
  
  createPost: (data: any) => 
    api.post('/posts', data),
  
  likePost: (id: string) => 
    api.post(`/posts/${id}/like`)
}

export const commentsApi = {
  getComments: (postId: string) => 
    api.get(`/comments?postId=${postId}`),
  
  createComment: (data: { postId: string; content: string; parentId?: string }) => 
    api.post('/comments', data),
  
  deleteComment: (id: string) => 
    api.delete(`/comments/${id}`)
}

export const starsApi = {
  getBalance: () =>
    api.get('/stars/balance'),

  vote: (postId: string, stars: number) =>
    api.post('/stars/vote', { postId, stars }),

  getVoteStats: (postId: string) =>
    api.get(`/stars/stats?postId=${postId}`)
}

export const authApi = {
  getSession: () =>
    api.get('/auth/session'),

  getUserStatus: (userId: string) =>
    api.get(`/user/status/${userId}`)
}

export const proposalsApi = {
  getProposals: (params?: { status?: string; category?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const queryString = searchParams.toString()
    return api.get(`/proposals${queryString ? '?' + queryString : ''}`)
  },

  getProposal: (id: string) =>
    api.get(`/proposals/${id}`),

  createProposal: (data: { title: string; description: string; category: string }) =>
    api.post('/proposals', data),

  voteOnProposal: (id: string, data: { voteType: 'support' | 'against'; starAmount?: number }) =>
    api.post(`/proposals/${id}/vote`, data),

  updateProposalStatus: (id: string, data: { status?: string; extendHours?: number }) =>
    api.patch(`/proposals/${id}`, data)
}
