import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'
import { verifyAdminAccess, logAdminAction } from '@/lib/admin-auth'
import { withAdminCache } from '@/lib/cache/AdminCache'

export async function GET(request: Request) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        error: authResult.error || '权限不足'
      }, { status: 403 })
    }

    console.log(`🔐 管理员用户列表访问 (验证方式: ${authResult.method})`)

    // 记录管理员操作
    if (authResult.userId) {
      await logAdminAction({
        userId: authResult.userId,
        action: 'GET_USERS_LIST',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    // 使用缓存获取所有用户数据
    const users = await withAdminCache(
      'admin:users:list',
      async () => {
        return await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isVerified: true,
            githubLogin: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                generatedInviteCodes: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
      },
      120000 // 2分钟缓存，用户列表变化不频繁
    )

    // 统计信息
    const stats = {
      total: users.length,
      admins: users.filter(user => user.role === 'ADMIN').length,
      verified: users.filter(user => user.isVerified).length,
      github: users.filter(user => user.githubLogin).length
    }

    return NextResponse.json({
      success: true,
      users,
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 获取用户列表失败:', error)
    return NextResponse.json({
      error: '获取用户数据失败'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        error: authResult.error || '权限不足'
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, role, isVerified } = body

    console.log(`🔐 管理员用户操作 (验证方式: ${authResult.method})`, { action, userId })

    // 记录管理员操作
    if (authResult.adminId) {
      await logAdminAction({
        userId: authResult.adminId,
        action: `USER_${action.toUpperCase()}`,
        targetType: 'USER',
        targetId: userId,
        details: { action, role, isVerified },
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    switch (action) {
      case 'updateRole':
        if (!['USER', 'ADMIN'].includes(role)) {
          return NextResponse.json({
            error: '无效的角色类型'
          }, { status: 400 })
        }

        await prisma.user.update({
          where: { id: userId },
          data: { role }
        })

        console.log('✅ 用户角色更新成功:', { userId, role })
        return NextResponse.json({
          success: true,
          message: `用户角色已更新为 ${role}`
        })

      case 'updateVerification':
        if (typeof isVerified !== 'boolean') {
          return NextResponse.json({
            error: '无效的验证状态'
          }, { status: 400 })
        }

        await prisma.user.update({
          where: { id: userId },
          data: { isVerified }
        })

        console.log('✅ 用户验证状态更新成功:', { userId, isVerified })
        return NextResponse.json({
          success: true,
          message: `用户验证状态已${isVerified ? '启用' : '禁用'}`
        })

      default:
        return NextResponse.json({
          error: '不支持的操作类型'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ 用户操作失败:', error)
    return NextResponse.json({
      error: '用户操作失败'
    }, { status: 500 })
  }
}