import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dataAggregationService } from '@/lib/services/DataAggregationService'
import { highPerformanceDB } from '@/lib/database/HighPerformanceConnectionManager'

/**
 * 🚀 优化的用户统计API
 * 使用高性能连接管理器和数据聚合服务
 * 解决API请求过于频繁导致的数据库连接池负担问题
 * 
 * 核心优化：
 * 1. 数据聚合 - 一次请求获取所有数据
 * 2. 智能缓存 - 减少重复数据库查询
 * 3. 连接复用 - 最大化连接池利用率
 * 4. 批量处理 - 合并多个查询操作
 * 5. 性能监控 - 实时监控系统性能
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
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
    const includeDetails = searchParams.get('details') === 'true'
    const useCache = searchParams.get('cache') !== 'false'

    console.log('🚀 使用高性能数据聚合服务获取用户统计:', {
      userId: targetUserId,
      includeDetails,
      useCache
    })

    // 🎯 使用数据聚合服务 - 大幅减少数据库连接使用
    const aggregatedData = await dataAggregationService.getUserAggregatedData(targetUserId, {
      includeRecentPosts: includeDetails,
      includeStarHistory: includeDetails,
      includeSocialData: true,
      useCache,
      cacheTTL: 300000 // 5分钟缓存
    })

    // 🔧 构建优化的响应数据结构
    const responseData = {
      userId: targetUserId,
      profile: {
        name: aggregatedData.profile.name,
        image: aggregatedData.profile.image,
        bio: aggregatedData.profile.bio,
        joinDate: aggregatedData.profile.createdAt
      },
      stats: {
        posts: {
          total: aggregatedData.stats.posts.total,
          published: aggregatedData.stats.posts.published,
          draft: aggregatedData.stats.posts.draft,
          ...(includeDetails && { recent: aggregatedData.stats.posts.recent })
        },
        stars: {
          balance: {
            totalStars: aggregatedData.stats.stars.balance.totalStars,
            availableStars: aggregatedData.stats.stars.balance.availableStars,
            usedStars: aggregatedData.stats.stars.balance.usedStars,
            dailyEarned: aggregatedData.stats.stars.balance.dailyEarned
          },
          received: {
            totalReceived: aggregatedData.stats.stars.received.totalReceived,
            voterCount: aggregatedData.stats.stars.received.voterCount,
            ...(includeDetails && { recentVotes: aggregatedData.stats.stars.received.recentVotes })
          },
          given: {
            totalGiven: aggregatedData.stats.stars.given.totalGiven,
            voteCount: aggregatedData.stats.stars.given.voteCount,
            ...(includeDetails && { recentVotes: aggregatedData.stats.stars.given.recentVotes })
          },
          display: {
            publicTotal: aggregatedData.stats.stars.received.totalReceived,
            ownedTotal: aggregatedData.stats.stars.balance.totalStars,
            activityScore: aggregatedData.stats.social.interactions
          }
        },
        social: {
          followers: aggregatedData.stats.social.followers,
          following: aggregatedData.stats.social.following,
          interactions: aggregatedData.stats.social.interactions
        },
        activity: {
          lastActive: aggregatedData.stats.activity.lastActive,
          weeklyActivity: aggregatedData.stats.activity.weeklyActivity,
          monthlyActivity: aggregatedData.stats.activity.monthlyActivity
        }
      },
      // 🔧 添加汇总信息 - 便于快速访问
      summary: {
        totalPosts: aggregatedData.stats.posts.total,
        totalStars: aggregatedData.stats.stars.balance.totalStars,
        availableStars: aggregatedData.stats.stars.balance.availableStars,
        followers: aggregatedData.stats.social.followers,
        lastActive: aggregatedData.stats.activity.lastActive
      }
    }

    // 📊 获取性能指标
    const dbStatus = highPerformanceDB.getStatus()
    const aggregationStatus = dataAggregationService.getStatus()
    const responseTime = Date.now() - startTime

    console.log('✅ 高性能用户统计数据获取成功:', {
      userId: targetUserId,
      responseTime: `${responseTime}ms`,
      posts: responseData.stats.posts.total,
      stars: responseData.stats.stars.balance.totalStars,
      availableStars: responseData.stats.stars.balance.availableStars,
      performance: {
        cacheHitRate: `${dbStatus.cacheHitRate.toFixed(2)}%`,
        avgResponseTime: `${dbStatus.averageResponseTime.toFixed(2)}ms`,
        activeConnections: dbStatus.activeConnections,
        aggregationCacheSize: aggregationStatus.cacheSize
      }
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        cached: useCache,
        responseTime,
        performance: {
          // 数据库连接池性能
          database: {
            cacheHitRate: dbStatus.cacheHitRate,
            averageResponseTime: dbStatus.averageResponseTime,
            activeConnections: dbStatus.activeConnections,
            idleConnections: dbStatus.idleConnections,
            pendingRequests: dbStatus.pendingRequests
          },
          // 数据聚合服务性能
          aggregation: {
            cacheSize: aggregationStatus.cacheSize,
            pendingAggregations: aggregationStatus.pendingAggregations
          }
        },
        optimizations: [
          '数据聚合 - 一次请求获取所有数据',
          '智能缓存 - 减少重复数据库查询',
          '连接复用 - 最大化连接池利用率',
          '批量处理 - 合并多个查询操作'
        ]
      }
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('❌ 获取用户统计失败:', {
      error: error instanceof Error ? error.message : String(error),
      responseTime: `${responseTime}ms`,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { 
        success: false, 
        error: '获取统计数据失败', 
        details: error instanceof Error ? error.message : String(error),
        meta: {
          responseTime,
          optimizationUsed: true
        }
      },
      { status: 500 }
    )
  }
}

/**
 * 🔧 获取连接池状态API
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

    const dbStatus = highPerformanceDB.getStatus()
    const aggregationStatus = dataAggregationService.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        database: dbStatus,
        aggregation: aggregationStatus,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ 获取性能状态失败:', error)
    return NextResponse.json(
      { success: false, error: '获取性能状态失败' },
      { status: 500 }
    )
  }
}
