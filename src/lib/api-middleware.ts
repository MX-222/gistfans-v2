/**
 * GistFans API 中间件
 * 统一的错误处理、超时保护、数据库连接检查
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'

export interface ApiOptions {
  timeout?: number
  requireAuth?: boolean
  skipDbCheck?: boolean
  retries?: number
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

/**
 * API包装器 - 统一错误处理和超时保护
 */
export async function apiWrapper<T>(
  handler: () => Promise<T>,
  options: ApiOptions = {}
): Promise<NextResponse> {
  const {
    timeout = 15000,
    skipDbCheck = false,
    retries = 1
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 API请求开始 (尝试 ${attempt}/${retries})`)

      // 数据库连接健康检查
      if (!skipDbCheck) {
        try {
          await prisma.user.findFirst({
            select: { id: true },
            take: 1
          })
        } catch (dbError) {
          console.error('❌ 数据库连接失败:', dbError)
          return NextResponse.json({
            success: false,
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          }, { status: 503 })
        }
      }

      // 执行处理器 - 添加超时保护
      const handlerPromise = handler()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      const result = await Promise.race([handlerPromise, timeoutPromise])

      console.log(`✅ API请求成功`)
      return NextResponse.json({
        success: true,
        data: result
      })

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`❌ API请求失败 (尝试 ${attempt}/${retries}):`, lastError.message)

      // 认证错误不应该重试
      if (lastError.message.includes('Unauthorized access') ||
          lastError.message.includes('unauthorized') ||
          lastError.message.includes('未授权')) {
        console.log('🚫 认证错误，跳过重试')
        break
      }

      // 如果是最后一次尝试，返回错误
      if (attempt === retries) {
        break
      }

      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 返回分类错误响应
  return handleApiError(lastError!)
}

/**
 * 统一错误处理
 */
function handleApiError(error: Error): NextResponse {
  console.error('🔥 API错误处理:', error)

  // 超时错误
  if (error.message.includes('timeout') || error.message === 'Request timeout') {
    return NextResponse.json({
      success: false,
      error: 'Request timeout, please try again',
      code: 'TIMEOUT_ERROR'
    }, { status: 408 })
  }

  // 数据库连接错误
  if (error.message.includes('connection') || 
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Max client connections reached') ||
      error.message.includes('too many clients already')) {
    return NextResponse.json({
      success: false,
      error: 'Database connection error',
      code: 'CONNECTION_ERROR'
    }, { status: 503 })
  }

  // Prisma错误
  if (error.message.includes('P1001')) {
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      code: 'DB_CONNECTION_FAILED'
    }, { status: 503 })
  }

  if (error.message.includes('P1008')) {
    return NextResponse.json({
      success: false,
      error: 'Database operation timed out',
      code: 'DB_TIMEOUT'
    }, { status: 408 })
  }

  // 认证错误 - 不应该重试
  if (error.message.includes('unauthorized') ||
      error.message.includes('未授权') ||
      error.message.includes('Unauthorized access')) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized access',
      code: 'UNAUTHORIZED'
    }, { status: 401 })
  }

  // 默认内部服务器错误
  return NextResponse.json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    debug: process.env.NODE_ENV === 'development' ? error.message : undefined
  }, { status: 500 })
}

/**
 * 参数验证中间件
 */
export function validateParams(params: Record<string, any>, required: string[]): string | null {
  for (const field of required) {
    if (!params[field]) {
      return `Missing required parameter: ${field}`
    }
  }
  return null
}

/**
 * ID格式验证
 */
export function validateId(id: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(id) && id.length > 0 && id.length < 100
}

/**
 * 分页参数验证和标准化
 */
export function validatePagination(searchParams: URLSearchParams) {
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  
  return { limit, offset }
}

/**
 * 简化的API包装器 - 用于简单的GET请求
 */
export async function simpleApiWrapper<T>(
  handler: () => Promise<T>,
  timeout: number = 10000
): Promise<NextResponse> {
  return apiWrapper(handler, { timeout, skipDbCheck: false, retries: 1 })
}

/**
 * 高可靠性API包装器 - 用于重要的业务操作
 */
export async function reliableApiWrapper<T>(
  handler: () => Promise<T>,
  timeout: number = 20000
): Promise<NextResponse> {
  return apiWrapper(handler, { timeout, skipDbCheck: false, retries: 3 })
}

/**
 * 认证API包装器 - 专门用于需要认证的API，不进行重试
 */
export async function authApiWrapper<T>(
  handler: () => Promise<T>,
  timeout: number = 10000
): Promise<NextResponse> {
  return apiWrapper(handler, { timeout, skipDbCheck: false, retries: 1 })
}
