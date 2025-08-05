// API类型定义文件

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginationResponse {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// 用户相关类型
export interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  isVerified: boolean
  createdAt: string
}

// 消息相关类型
export interface Message {
  id: string
  content: string
  senderId: string
  conversationId: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    image: string | null
  }
}

export interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  participants: UserProfile[]
  lastMessage?: Message
}

// 管理员操作类型
export interface AdminAction {
  type: 'USER_MANAGEMENT' | 'CONTENT_MODERATION' | 'SYSTEM_CONFIG'
  target: string
  action: string
  reason?: string
  metadata?: Record<string, any>
}

// Star系统类型
export interface StarBalance {
  userId: string
  totalStars: number
  availableStars: number
  dailyEarned: number
  maxDailyBasic: number
  lastLoginDate: string | null
}

export interface StarTransaction {
  id: string
  userId: string
  amount: number
  type: string
  action: string
  description: string
  relatedId?: string
  relatedType?: string
  dailyKey?: string
  adminId?: string
  createdAt: string
}

// 通知类型
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedId?: string
  relatedType?: string
}

// 错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
}

// 错误代码枚举
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT'
}

// 请求参数类型
export interface CreateMessageRequest {
  content: string
  conversationId: string
}

export interface CreateConversationRequest {
  title?: string
  participantIds: string[]
}

export interface AdminActionRequest {
  type: AdminAction['type']
  target: string
  action: string
  reason?: string
  metadata?: Record<string, any>
}

// API响应辅助函数
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

export function createErrorResponse(
  error: string | ApiError,
  code?: ErrorCode
): ApiResponse {
  if (typeof error === 'string') {
    return {
      success: false,
      error,
      message: error
    }
  }

  return {
    success: false,
    error: error.message,
    message: error.message
  }
}

// 重载版本以支持不同的参数顺序
export function createErrorResponseWithCode(
  code: ErrorCode,
  message: string
): ApiResponse {
  return {
    success: false,
    error: message,
    message: message
  }
}
