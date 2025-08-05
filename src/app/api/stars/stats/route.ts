import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'
import { starService } from '@/lib/starService'
import { requireAuth, AuthenticatedRequest } from '@/lib/api-auth-middleware'

/**
 * 统一的Star统计API - 修复Star数量同步不匹配问题
 * 支持帖子Star统计和用户Star统计
 * 🔒 已修复：使用统一认证中间件，确保安全访问
 */
async function getStarStatsHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const userId = searchParams.get('userId')
    const includeBalance = searchParams.get('includeBalance') === 'true'
    const includeReceived = searchParams.get('includeReceived') === 'true'

    console.log('✅ Star统计API - 认证用户访问:', {
      userId: request.user?.id,
      requestType: postId ? 'post-stats' : 'user-stats',
      postId,
      targetUserId: userId
    })

    // 如果是获取帖子Star统计（原有功能）
    if (postId) {
      console.log('📊 获取帖子Star统计:', postId)
      const stats = await starService.getPostStarVotes(postId, true)
      console.log('✅ 帖子Star统计获取成功:', stats)

      return NextResponse.json({
        success: true,
        data: stats
      })
    }

    // 如果是获取用户Star统计（新功能）
    if (userId) {
      // 🔒 认证检查已在上方完成，这里直接使用session

      console.log('🔍 获取用户Star统计:', { userId, includeBalance, includeReceived })

      // 1. 获取用户Star余额（个人可用的Star数量）
      let starBalance = null
      if (includeBalance) {
        starBalance = await prisma.starBalance.findUnique({
          where: { userId },
          select: {
            totalStars: true,
            availableStars: true,
            dailyEarned: true,
            maxDailyBasic: true,
            lastLoginDate: true
          }
        })

        // 如果没有余额记录，创建默认记录
        if (!starBalance) {
          starBalance = await prisma.starBalance.create({
            data: {
              userId,
              totalStars: 10,
              availableStars: 10,
              dailyEarned: 0,
              maxDailyBasic: 3,
              lastLoginDate: null
            },
            select: {
              totalStars: true,
              availableStars: true,
              dailyEarned: true,
              maxDailyBasic: true,
              lastLoginDate: true
            }
          })
        }
      }

      // 2. 获取用户收到的Star统计（他人对用户帖子的投票）
      let receivedStars = null
      if (includeReceived) {
        const receivedStarStats = await prisma.starVote.aggregate({
          where: {
            toUserId: userId, // 收到Star的用户
            post: {
              status: 'PUBLISHED',
              isPublic: true
            }
          },
          _sum: {
            amount: true
          },
          _count: {
            id: true
          }
        })

        receivedStars = {
          totalReceived: receivedStarStats._sum.amount || 0,
          voteCount: receivedStarStats._count.id || 0
        }
      }

      const result = {
        userId,
        balance: starBalance,
        received: receivedStars,
        // 统一的显示数据 - 确保所有页面使用相同的数据源
        displayStats: {
          // 个人Profile页面显示：用户余额中的总Star数
          personalTotal: starBalance?.totalStars || 0,
          personalAvailable: starBalance?.availableStars || 0,
          // 他人查看Profile时显示：用户收到的Star总数
          publicTotal: receivedStars?.totalReceived || 0,
          publicVotes: receivedStars?.voteCount || 0,
          // 提案区显示：用户收到的Star总数（与publicTotal相同）
          proposalTotal: receivedStars?.totalReceived || 0
        }
      }

      console.log('✅ 用户Star统计获取成功:', result.displayStats)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Star统计获取成功'
      })
    }

    return NextResponse.json({
      success: false,
      error: '缺少postId或userId参数'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ 获取Star统计失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取Star统计失败'
    }, { status: 500 })
  }
}

// 🔒 导出使用认证中间件保护的GET函数
export const GET = requireAuth(getStarStatsHandler)
