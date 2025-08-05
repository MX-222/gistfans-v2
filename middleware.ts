/**
 * Next.js 中间件 - 路由保护和认证管理
 *
 * 用途：在请求到达页面组件之前进行认证检查和路由保护
 *
 * 核心功能：
 * - 受保护路由的认证检查
 * - 未认证用户重定向到登录页
 * - 静态资源和API路由的过滤
 * - 认证状态的全局管理
 *
 * 系统架构位置：请求处理层，所有HTTP请求的第一道防线
 *
 * 主要依赖：
 * - NextAuth middleware - 认证中间件
 * - Next.js middleware - 路由中间件
 *
 * 保护的路由：
 * - /feed - 主要内容页面
 * - /proposals - 提案页面
 * - /profile - 用户资料页面
 * - /admin - 管理员页面
 * - /chat - 聊天功能
 * - /developer - 开发者工具
 * - /payment - 支付页面
 * - /remote - 远程功能
 *
 * 使用示例：
 * 中间件自动运行，无需手动调用
 *
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-02
 */

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

// 定义受保护的路由
const protectedRoutes = [
  '/feed',
  '/proposals',
  '/profile',
  '/admin',
  '/admin-dashboard',
  '/chat',
  '/developer',
  '/payment',
  '/remote'
]

// 定义公开路由（不需要认证）
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/register',
  '/auth/error',
  '/auth/verify-request',
  '/auth/simple-login',
  '/secret-admin-portal',
  '/suggestion-board', // 建议板应该是公开的，允许未登录用户查看
  '/api/auth',
  '/api/admin/secure-login'
]



export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // 减少日志输出，避免性能问题
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ Middleware检查:', {
        path: pathname,
        hasToken: !!token
      })
    }

    // API路由特殊处理
    if (pathname.startsWith('/api/')) {
      // 允许认证相关的API路由
      if (pathname.startsWith('/api/auth/')) {
        return NextResponse.next()
      }
      
      // 管理员安全登录API
      if (pathname === '/api/admin/secure-login') {
        return NextResponse.next()
      }
      
      // 其他API路由需要认证
      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ API路由未认证:', pathname)
        }
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      return NextResponse.next()
    }

    // 检查是否为公开路由
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )
    
    if (isPublicRoute) {
      // 如果已登录用户访问登录页面，重定向到feed
      if (token && (pathname === '/auth/signin' || pathname === '/auth/register')) {
        return NextResponse.redirect(new URL('/feed', req.url))
      }
      return NextResponse.next()
    }

    // 检查是否为受保护路由
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )

    if (isProtectedRoute) {
      if (!token) {
        // 重定向到登录页面，并保存原始URL
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      return NextResponse.next()
    }

    // 根路径重定向
    if (pathname === '/') {
      if (token) {
        console.log('✅ 已登录用户从根路径重定向到feed')
        return NextResponse.redirect(new URL('/feed', req.url))
      } else {
        console.log('👤 未登录用户从根路径重定向到登录页')
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    // 默认允许访问
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // API路由的认证在middleware函数中处理
        if (pathname.startsWith('/api/')) {
          return true
        }
        
        // 公开路由始终允许
        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || pathname.startsWith(route + '/')
        )
        if (isPublicRoute) {
          return true
        }
        
        // 受保护路由需要token
        const isProtectedRoute = protectedRoutes.some(route => 
          pathname === route || pathname.startsWith(route + '/')
        )
        if (isProtectedRoute) {
          return !!token
        }
        
        // 其他路径默认允许
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public文件夹中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
