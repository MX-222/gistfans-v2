import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'
import { executeWithConnectionPool } from '@/lib/database/connectionPoolManager'
import { starService } from '@/lib/starService'

/**
 * 统一用户统计API
 * 提供准确的用户统计信息，支持实时更新
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || session.user.id

    // 🔧 使用连接池管理器获取统计数据，解决连接池耗尽问题
    const [postStats, unifiedStarStats, socialStats, activityStats] = await executeWithConnectionPool(async (prisma) => {
      return Promise.all([
        getPostStatistics(targetUserId, prisma),
        starService.getUnifiedUserStarStats(targetUserId), // Star服务有自己的连接管理
        getSocialStatistics(targetUserId, prisma),
        getActivityStatistics(targetUserId, prisma)
      ])
    }, '用户统计数据获取')

    console.log('✅ 用户统计数据获取成功:', {
      userId: targetUserId,
      posts: postStats.total,
      starBalance: unifiedStarStats.balance.totalStars,
      starReceived: unifiedStarStats.received.totalReceived,
      starGiven: unifiedStarStats.given.totalGiven
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        posts: postStats,
        stars: {
          // 🔧 使用统一的Star统计数据格式
          balance: unifiedStarStats.balance,
          received: unifiedStarStats.received,
          given: unifiedStarStats.given,
          display: unifiedStarStats.display,
          // 保持向后兼容的字段
          total: unifiedStarStats.balance.totalStars,
          available: unifiedStarStats.balance.availableStars
        },
        social: socialStats,
        activity: activityStats,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 用户统计API失败:', error)
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

/**
 * 获取帖子统计
 */
async function getPostStatistics(userId: string, prismaClient = prisma) {
  try {
    const [totalPosts, publishedPosts, privatePosts, draftPosts] = await Promise.all([
      // 总帖子数（所有状态）
      prismaClient.post.count({
        where: { authorId: userId }
      }),

      // 已发布的公开帖子
      prismaClient.post.count({
        where: {
          authorId: userId,
          status: 'PUBLISHED',
          isPublic: true
        }
      }),

      // 私有帖子
      prismaClient.post.count({
        where: {
          authorId: userId,
          isPublic: false
        }
      }),
      
      // 草稿帖子
      prisma.post.count({
        where: {
          authorId: userId,
          status: 'DRAFT'
        }
      })
    ])

    // 获取帖子的互动统计
    const interactionStats = await prisma.post.aggregate({
      where: {
        authorId: userId,
        status: 'PUBLISHED'
      },
      _sum: {
        likeCount: true,
        commentCount: true,
        viewCount: true,
        shareCount: true
      },
      _avg: {
        likeCount: true,
        commentCount: true,
        viewCount: true
      }
    })

    return {
      total: totalPosts,
      published: publishedPosts,
      private: privatePosts,
      drafts: draftPosts,
      interactions: {
        totalLikes: interactionStats._sum.likeCount || 0,
        totalComments: interactionStats._sum.commentCount || 0,
        totalViews: interactionStats._sum.viewCount || 0,
        totalShares: interactionStats._sum.shareCount || 0,
        avgLikes: Math.round((interactionStats._avg.likeCount || 0) * 100) / 100,
        avgComments: Math.round((interactionStats._avg.commentCount || 0) * 100) / 100,
        avgViews: Math.round((interactionStats._avg.viewCount || 0) * 100) / 100
      }
    }

  } catch (error) {
    console.error('获取帖子统计失败:', error)
    return {
      total: 0,
      published: 0,
      private: 0,
      drafts: 0,
      interactions: {
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        totalShares: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: 0
      }
    }
  }
}

/**
 * 获取Star统计
 */
async function getStarStatistics(userId: string) {
  try {
    // 用户拥有的Star余额
    const balance = await prisma.starBalance.findUnique({
      where: { userId }
    })

    // 用户收到的Star投票统计
    const receivedStats = await prisma.starVote.aggregate({
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

    // 用户投出的Star统计
    const givenStats = await prisma.starVote.aggregate({
      where: { fromUserId: userId }, // 修复：使用fromUserId字段查询用户投出的Star
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    return {
      balance: {
        total: balance?.totalStars || 0,
        available: balance?.availableStars || 0,
        dailyEarned: balance?.dailyEarned || 0,
        maxDaily: balance?.maxDailyBasic || 0
      },
      received: {
        total: receivedStats._sum.amount || 0,
        votes: receivedStats._count.id || 0
      },
      given: {
        total: givenStats._sum.amount || 0,
        votes: givenStats._count.id || 0
      }
    }

  } catch (error) {
    console.error('获取Star统计失败:', error)
    return {
      balance: { total: 0, available: 0, dailyEarned: 0, maxDaily: 0 },
      received: { total: 0, votes: 0 },
      given: { total: 0, votes: 0 }
    }
  }
}

/**
 * 获取社交统计
 */
async function getSocialStatistics(userId: string, prismaClient = prisma) {
  try {
    const [followers, following, comments, likes] = await Promise.all([
      // 关注者数量
      prismaClient.follow.count({
        where: { followingId: userId }
      }),

      // 关注的人数
      prismaClient.follow.count({
        where: { followerId: userId }
      }),

      // 评论数量
      prismaClient.comment.count({
        where: { userId } // 修复：Comment表中用户字段是userId而不是authorId
      }),

      // 点赞数量
      prismaClient.like.count({
        where: { userId }
      })
    ])

    return {
      followers,
      following,
      comments,
      likes
    }

  } catch (error) {
    console.error('获取社交统计失败:', error)
    return {
      followers: 0,
      following: 0,
      comments: 0,
      likes: 0
    }
  }
}

/**
 * 获取活动统计
 */
async function getActivityStatistics(userId: string, prismaClient = prisma) {
  try {
    // 获取最近30天的活动
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [recentPosts, recentComments, recentLikes] = await Promise.all([
      prismaClient.post.count({
        where: {
          authorId: userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),

      prismaClient.comment.count({
        where: {
          userId: userId, // 修复：Comment表中用户字段是userId而不是authorId
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      prismaClient.like.count({
        where: {
          userId,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })
    ])

    return {
      recent30Days: {
        posts: recentPosts,
        comments: recentComments,
        likes: recentLikes,
        total: recentPosts + recentComments + recentLikes
      }
    }

  } catch (error) {
    console.error('获取活动统计失败:', error)
    return {
      recent30Days: {
        posts: 0,
        comments: 0,
        likes: 0,
        total: 0
      }
    }
  }
}
