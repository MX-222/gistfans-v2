import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'
import { verifyAdminAccess, logAdminAction } from '@/lib/admin-auth'
import { starService } from '@/lib/starService'
import { withAdminCache, generateCacheKey } from '@/lib/cache/AdminCache'

export async function GET(request: Request) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        error: authResult.error || '权限不足'
      }, { status: 403 })
    }

    console.log(`🔐 管理员用户搜索 (验证方式: ${authResult.method})`)

    // 获取搜索参数
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: '搜索关键词至少需要2个字符'
      }, { status: 400 })
    }

    const searchTerm = query.trim()
    console.log('🔍 搜索用户:', { query: searchTerm, limit })

    // 记录管理员操作
    if (authResult.adminId) {
      await logAdminAction({
        userId: authResult.adminId,
        action: 'SEARCH_USERS',
        details: { query: searchTerm, limit },
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    // 生成缓存键
    const cacheKey = generateCacheKey('admin:users:search', {
      query: searchTerm,
      limit: Math.min(limit, 50)
    })

    // 使用缓存包装搜索操作
    const users = await withAdminCache(
      cacheKey,
      async () => {
        // 搜索用户 - 支持多字段模糊搜索
        return await prisma.user.findMany({
          where: {
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                githubLogin: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            githubLogin: true,
            role: true,
            isVerified: true,
            createdAt: true
          },
          orderBy: [
            { role: 'desc' }, // 管理员优先
            { isVerified: 'desc' }, // 已验证用户优先
            { createdAt: 'desc' } // 最新注册优先
          ],
          take: Math.min(limit, 50) // 最多返回50个结果
        })
      },
      60000 // 1分钟缓存，用户数据变化不频繁
    )

    // 获取用户的Star余额信息
    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        try {
          const balance = await starService.getBalance(user.id)
          return {
            ...user,
            starBalance: {
              availableStars: balance.availableStars,
              totalStars: balance.totalStars
            }
          }
        } catch (error) {
          console.error(`获取用户${user.id}的Star余额失败:`, error)
          return {
            ...user,
            starBalance: {
              availableStars: 0,
              totalStars: 0
            }
          }
        }
      })
    )

    console.log('✅ 用户搜索完成:', {
      query: searchTerm,
      found: usersWithBalance.length
    })

    return NextResponse.json({
      success: true,
      users: usersWithBalance,
      query: searchTerm,
      total: usersWithBalance.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 用户搜索失败:', error)
    return NextResponse.json({
      error: '用户搜索失败'
    }, { status: 500 })
  }
}
