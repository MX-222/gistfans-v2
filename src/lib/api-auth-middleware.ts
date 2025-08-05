/**
 * 🔒 API认证中间件
 * 统一的API认证和权限控制中间件，防止安全漏洞
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email?: string
    name?: string
    role?: string
  }
}

export interface AuthMiddlewareOptions {
  // 是否需要认证（默认true）
  requireAuth?: boolean
  // 允许的角色列表
  allowedRoles?: string[]
  // 是否允许用户访问自己的资源
  allowSelfAccess?: boolean
  // 管理员邮箱（特殊权限）
  adminEmails?: string[]
  // 自定义权限检查函数
  customPermissionCheck?: (user: any, request: NextRequest) => boolean
}

/**
 * 🔒 API认证装饰器
 * 为API路由添加统一的认证和权限控制
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async function authenticatedHandler(
    request: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> {
    const {
      requireAuth = true,
      allowedRoles = [],
      allowSelfAccess = false,
      adminEmails = ['cmbdlobefxijuf@gmail.com'],
      customPermissionCheck
    } = options

    // 如果不需要认证，直接执行处理函数
    if (!requireAuth) {
      return handler(request as AuthenticatedRequest, ...args)
    }

    try {
      // 🔒 获取用户会话
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        console.log('❌ API认证中间件 - 未授权访问被阻止:', request.url)
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED_ACCESS',
            message: '此API需要登录认证'
          },
          { status: 401 }
        )
      }

      // 🔒 角色权限检查
      if (allowedRoles.length > 0) {
        const userRole = session.user.role || 'USER'
        const isAdmin = adminEmails.includes(session.user.email || '')
        
        if (!allowedRoles.includes(userRole) && !isAdmin) {
          console.log('❌ API认证中间件 - 角色权限不足:', {
            userRole,
            requiredRoles: allowedRoles,
            isAdmin
          })
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              message: '权限不足，无法访问此资源'
            },
            { status: 403 }
          )
        }
      }

      // 🔒 自定义权限检查
      if (customPermissionCheck) {
        const hasPermission = customPermissionCheck(session.user, request)
        if (!hasPermission) {
          console.log('❌ API认证中间件 - 自定义权限检查失败')
          return NextResponse.json(
            {
              success: false,
              error: 'Access denied',
              code: 'ACCESS_DENIED',
              message: '访问被拒绝'
            },
            { status: 403 }
          )
        }
      }

      // 🔒 自访问权限检查（用于用户只能访问自己资源的场景）
      if (allowSelfAccess) {
        // 从URL路径中提取用户ID（假设格式为 /api/user/[id]/...）
        const pathParts = request.nextUrl.pathname.split('/')
        const userIdIndex = pathParts.findIndex(part => part === 'user') + 1
        const requestedUserId = pathParts[userIdIndex]
        
        if (requestedUserId && requestedUserId !== session.user.id) {
          const isAdmin = adminEmails.includes(session.user.email || '')
          
          if (!isAdmin) {
            console.log('❌ API认证中间件 - 跨用户访问被阻止:', {
              currentUser: session.user.id,
              requestedUser: requestedUserId
            })
            return NextResponse.json(
              {
                success: false,
                error: 'Access denied: You can only access your own resources',
                code: 'CROSS_USER_ACCESS_DENIED',
                message: '您只能访问自己的资源'
              },
              { status: 403 }
            )
          }
        }
      }

      // 🔒 认证成功，添加用户信息到请求对象
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        id: session.user.id,
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        role: session.user.role || 'USER'
      }

      console.log('✅ API认证中间件 - 认证和权限检查通过:', {
        userId: session.user.id,
        path: request.nextUrl.pathname
      })

      // 执行原始处理函数
      return handler(authenticatedRequest, ...args)

    } catch (error) {
      console.error('❌ API认证中间件错误:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR',
          message: '认证服务错误，请稍后重试'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 🔒 快捷认证装饰器
 */
export const requireAuth = (handler: any) => withAuth(handler, { requireAuth: true })
export const requireAdmin = (handler: any) => withAuth(handler, { allowedRoles: ['ADMIN'] })
export const requireSelfAccess = (handler: any) => withAuth(handler, { allowSelfAccess: true })

/**
 * 🔒 用户资源访问装饰器
 * 用户只能访问自己的资源，管理员可以访问所有资源
 */
export const requireUserResourceAccess = (handler: any) => 
  withAuth(handler, { 
    requireAuth: true, 
    allowSelfAccess: true 
  })
