import { NextResponse } from 'next/server'
import { prisma } from './database/unified-prisma'

// API错误类型定义
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// 增强的数据库错误处理 - 专门处理连接池问题
export function handleDatabaseError(error: any): ApiError {
  console.error('🔥 数据库错误:', error)

  // Supabase 连接池耗尽错误
  if (error.message?.includes('Max client connections reached') ||
      error.message?.includes('too many clients already')) {
    return {
      code: 'CONNECTION_POOL_EXHAUSTED',
      message: 'Server is busy, please try again later', // Using English directly for API responses
      details: {
        reason: 'Database connection pool is full',
        suggestions: [
          'Wait a few seconds and retry',
          'Avoid frequent page refreshes',
          'Contact administrator if problem persists'
        ]
      },
      timestamp: new Date().toISOString()
    }
  }

  // 连接失败错误
  if (error.code === 'P1001') {
    return {
      code: 'DATABASE_CONNECTION_FAILED',
      message: 'Database connection failed, please try again later',
      details: 'Cannot reach database server',
      timestamp: new Date().toISOString()
    }
  }

  // 连接超时错误
  if (error.code === 'P1008' || error.message?.includes('timeout')) {
    return {
      code: 'DATABASE_TIMEOUT',
      message: 'Database operation timed out, please retry',
      details: 'Database operation timed out',
      timestamp: new Date().toISOString()
    }
  }

  // 唯一约束违反
  if (error.code === 'P2002') {
    return {
      code: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'Data already exists, please check your input',
      details: error.meta,
      timestamp: new Date().toISOString()
    }
  }

  // 外键约束违反
  if (error.code === 'P2003') {
    return {
      code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      message: 'Related data does not exist',
      details: error.meta,
      timestamp: new Date().toISOString()
    }
  }

  return {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    details: error.message,
    timestamp: new Date().toISOString()
  }
}

// NextAuth错误处理
export function handleAuthError(error: any): ApiError {
  console.error('🔐 认证错误:', error)

  if (error.message?.includes('fetch')) {
    return {
      code: 'AUTH_FETCH_ERROR',
      message: 'Authentication service connection failed, please refresh and try again',
      details: 'Network connection issue',
      timestamp: new Date().toISOString()
    }
  }

  return {
    code: 'AUTH_ERROR',
    message: 'Authentication failed, please log in again',
    details: error.message,
    timestamp: new Date().toISOString()
  }
}

// 网络错误处理
export function handleNetworkError(error: any): ApiError {
  console.error('🌐 网络错误:', error)

  return {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed, please check your connection and try again',
    details: error.message,
    timestamp: new Date().toISOString()
  }
}

// 统一错误响应
export function createErrorResponse(error: ApiError, status: number = 500): NextResponse {
  return NextResponse.json({
    success: false,
    error: error.code,
    message: error.message,
    details: error.details,
    timestamp: error.timestamp
  }, { status })
}

// 增强的API重试机制 - 专门优化连接池问题
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5, // 🔧 增加重试次数
  delay: number = 500     // 🔧 减少初始延迟
): Promise<T> {
  let lastError: any

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.error(`🔄 API操作重试 ${i + 1}/${maxRetries}:`, error)

      // 🔧 增强连接池错误检测
      const isConnectionError = error && (
        (typeof error === 'object' && 'code' in error && error.code === 'P1001') ||
        (error instanceof Error && error.message && (
          error.message.includes('Max client connections reached') ||
          error.message.includes('too many clients already') ||
          error.message.includes('Connection terminated') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('timeout')
        )) ||
        (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && (
          error.message.includes('Max client connections reached') ||
          error.message.includes('too many clients already') ||
          error.message.includes('Connection terminated') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('timeout')
        ))
      )

      if (isConnectionError) {
        console.log('🔄 检测到连接池问题，尝试重新连接...')
        try {
          await prisma.$disconnect()
          await new Promise(resolve => setTimeout(resolve, 200)) // 短暂等待
          await prisma.$connect()
        } catch (reconnectError) {
          console.warn('⚠️ 重新连接失败:', reconnectError)
        }
      }

      if (i < maxRetries - 1) {
        // 🔧 智能退避策略
        let waitTime = delay
        if (isConnectionError) {
          // 连接错误使用更长的等待时间
          waitTime = Math.min(delay * Math.pow(2, i), 5000) // 最大5秒
        } else {
          // 其他错误使用标准指数退避
          waitTime = delay * Math.pow(1.5, i)
        }

        console.log(`⏳ 等待 ${waitTime}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

// API超时处理
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`操作超时 (${timeoutMs}ms)`))
      }, timeoutMs)
    })
  ])
}

// 增强的API包装器 - 分层超时策略
export async function apiWrapper<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    timeout?: number
    errorHandler?: (error: any) => ApiError
    enableConnectionMonitoring?: boolean
    operationName?: string
    operationType?: 'read' | 'write' | 'feed' | 'quick'
  } = {}
): Promise<NextResponse> {
  const {
    maxRetries = 3,
    timeout = getTimeoutForOperation(options.operationType || 'read'),
    errorHandler = handleDatabaseError
  } = options

  try {
    let result: T

    // 🚫 旧连接池监控已禁用，使用智能连接池
    result = await withTimeout(
      withRetry(operation, maxRetries),
      timeout
    )

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    // 特殊处理连接池相关错误
    if (error instanceof Error && error.message.includes('Max client connections reached')) {
      console.error('🚨 连接池耗尽检测到！')

      // 🚫 旧连接池监控已禁用
      try {
        console.error('📊 智能连接池将自动处理连接问题')
      } catch (monitorError) {
        console.warn('⚠️ 无法获取连接池状态:', monitorError)
      }
    }

    const apiError = errorHandler(error)
    return createErrorResponse(apiError, getStatusCodeForError(apiError))
  }
}

// 分层超时策略 - 根据操作类型设置不同超时时间
function getTimeoutForOperation(operationType: 'read' | 'write' | 'feed' | 'quick'): number {
  switch (operationType) {
    case 'quick':
      return 5000   // 5秒 - 快速操作（用户状态、简单查询）
    case 'read':
      return 15000  // 15秒 - 一般读操作（单个帖子、评论）
    case 'write':
      return 10000  // 10秒 - 写操作（创建、更新、删除）
    case 'feed':
      return 30000  // 30秒 - Feed页面复杂查询（不限时）
    default:
      return 15000  // 默认15秒
  }
}

// 根据错误类型返回适当的HTTP状态码
function getStatusCodeForError(error: ApiError): number {
  switch (error.code) {
    case 'CONNECTION_POOL_EXHAUSTED':
    case 'DATABASE_CONNECTION_FAILED':
      return 503 // Service Unavailable
    case 'DATABASE_TIMEOUT':
      return 504 // Gateway Timeout
    case 'UNIQUE_CONSTRAINT_VIOLATION':
    case 'FOREIGN_KEY_CONSTRAINT_VIOLATION':
      return 409 // Conflict
    case 'AUTH_ERROR':
      return 401 // Unauthorized
    case 'NETWORK_ERROR':
      return 502 // Bad Gateway
    default:
      return 500 // Internal Server Error
  }
}
