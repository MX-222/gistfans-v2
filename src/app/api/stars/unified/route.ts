import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService } from '@/lib/starService'

/**
 * 统一Star数据API
 * 整合所有Star相关数据源，提供一致的数据接口
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 🔧 使用新的统一Star统计服务
    const [unifiedStats, transactions] = await Promise.all([
      // 统一的用户Star统计
      starService.getUnifiedUserStarStats(userId),

      // Star交易历史
      starService.getTransactionHistory(userId, 20)
    ])

    console.log('✅ 统一Star数据获取成功:', {
      balance: unifiedStats.balance,
      received: unifiedStats.received,
      given: unifiedStats.given,
      display: unifiedStats.display
    })

    return NextResponse.json({
      success: true,
      data: {
        // 用户拥有的Star（用于投票消费）
        balance: unifiedStats.balance,

        // 用户收到的Star投票（其他用户对该用户帖子的投票）
        received: unifiedStats.received,

        // 用户投出的Star投票（该用户对其他帖子的投票）
        given: unifiedStats.given,

        // 综合显示统计
        display: unifiedStats.display,

        // 最近的Star交易记录
        recentTransactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          action: t.action,
          description: t.description,
          createdAt: t.createdAt,
          relatedId: t.relatedId,
          relatedType: t.relatedType
        })),

        // 数据同步时间戳
        syncTimestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 统一Star数据API失败:', error)
    return NextResponse.json(
      { success: false, error: '获取Star数据失败' },
      { status: 500 }
    )
  }
}

/**
 * 获取用户收到的Star统计
 */
async function getReceivedStarStats(userId: string) {
  try {
    const { prisma } = await import('@/lib/database/unified-prisma')
    
    // 统计用户所有帖子收到的Star投票
    const stats = await prisma.starVote.aggregate({
      where: {
        post: {
          authorId: userId,
          status: 'PUBLISHED'
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    // 获取用户的帖子总数
    const postCount = await prisma.post.count({
      where: {
        authorId: userId,
        status: 'PUBLISHED'
      }
    })

    const totalStars = stats._sum.amount || 0
    const voterCount = stats._count.id || 0
    const averagePerPost = postCount > 0 ? totalStars / postCount : 0

    return {
      totalStars,
      voterCount,
      averagePerPost: Math.round(averagePerPost * 100) / 100 // 保留2位小数
    }

  } catch (error) {
    console.error('获取收到Star统计失败:', error)
    return {
      totalStars: 0,
      voterCount: 0,
      averagePerPost: 0
    }
  }
}

/**
 * 同步Star数据到localStorage
 * POST请求用于强制同步数据
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { forceSync = false } = body

    const userId = session.user.id

    // 获取最新的Star余额数据
    const balance = await starService.getBalance(userId)

    // 构造StarContext需要的数据格式
    const starContextData = {
      userId,
      totalStars: balance.totalStars,
      availableStars: balance.availableStars,
      usedStars: balance.totalStars - balance.availableStars,
      lastRefreshDate: new Date().toDateString(),
      dailyEarned: balance.dailyEarned,
      maxDailyEarn: balance.maxDailyBasic
    }

    return NextResponse.json({
      success: true,
      data: {
        starContextData,
        syncTimestamp: new Date().toISOString(),
        message: forceSync ? '强制同步完成' : '数据同步完成'
      }
    })

  } catch (error) {
    console.error('❌ Star数据同步失败:', error)
    return NextResponse.json(
      { success: false, error: '数据同步失败' },
      { status: 500 }
    )
  }
}
