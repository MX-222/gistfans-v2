import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'
import { requireUserResourceAccess, AuthenticatedRequest } from '@/lib/api-auth-middleware'

async function getUserStatusHandler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestedUserId } = await params

    if (!requestedUserId) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      )
    }

    // 🔒 用户信息已通过认证中间件验证
    console.log('✅ 用户状态API - 处理认证用户请求:', {
      currentUser: request.user?.id,
      requestedUser: requestedUserId
    })

    // 验证用户ID格式（假设使用UUID或数字ID）
    if (!/^[a-zA-Z0-9-_]+$/.test(requestedUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format', code: 'INVALID_USER_ID' },
        { status: 400 }
      )
    }

    // 添加数据库连接健康检查
    try {
      await prisma.user.findFirst({
        select: { id: true },
        take: 1
      })
    } catch (dbError) {
      console.error('❌ 数据库连接失败:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed', code: 'DB_CONNECTION_ERROR' },
        { status: 503 }
      )
    }

    // 查找用户状态 - 移除邀请码相关字段
    const queryPromise = prisma.user.findUnique({
      where: { id: requestedUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userType: true,
        onboardingComplete: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 10000)
    })

    const user = await Promise.race([queryPromise, timeoutPromise]) as any

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 用户状态信息 - 使用数据库中的真实状态
    const userWithStatus = {
      ...user,
      isNewUser: !user.onboardingComplete, // 基于真实的引导完成状态
      needsOnboarding: !user.onboardingComplete // 基于真实的引导完成状态
    }

    return NextResponse.json({
      success: true,
      user: userWithStatus,
      cached: false,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('获取用户状态错误:', error)

    // 详细错误分类和友好提示
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message === 'Query timeout') {
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout, please try again',
            code: 'TIMEOUT_ERROR',
            retryable: true,
            timestamp: new Date().toISOString()
          },
          { status: 408 }
        )
      }

      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database connection error',
            code: 'CONNECTION_ERROR',
            retryable: true,
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        retryable: false,
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

// 🔒 导出使用认证中间件保护的GET函数
export const GET = requireUserResourceAccess(getUserStatusHandler)