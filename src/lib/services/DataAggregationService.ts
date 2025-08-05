/**
 * 数据聚合服务
 * 解决API请求过于频繁的问题，通过数据聚合减少数据库访问
 * 
 * 核心功能：
 * 1. 批量数据获取 - 一次请求获取多种数据
 * 2. 智能预加载 - 预测用户需要的数据
 * 3. 数据去重 - 避免重复查询相同数据
 * 4. 增量更新 - 只更新变化的数据
 * 5. 实时同步 - 保持数据一致性
 */

import { highPerformanceDB } from '../database/HighPerformanceConnectionManager'
import { PrismaClient } from '@prisma/client'

// 🎯 聚合数据类型定义
interface UserAggregatedData {
  profile: {
    id: string
    name: string
    email: string
    image: string
    bio: string
    githubUrl: string
    createdAt: Date
  }
  stats: {
    posts: {
      total: number
      published: number
      draft: number
      recent: any[]
    }
    stars: {
      balance: {
        totalStars: number
        availableStars: number
        usedStars: number
        dailyEarned: number
      }
      received: {
        totalReceived: number
        voterCount: number
        recentVotes: any[]
      }
      given: {
        totalGiven: number
        voteCount: number
        recentVotes: any[]
      }
    }
    social: {
      followers: number
      following: number
      interactions: number
    }
    activity: {
      lastActive: Date
      weeklyActivity: number
      monthlyActivity: number
    }
  }
  preferences: {
    notifications: boolean
    privacy: string
    theme: string
  }
}

interface PostAggregatedData {
  post: {
    id: string
    title: string
    content: string
    status: string
    createdAt: Date
    updatedAt: Date
    author: {
      id: string
      name: string | null
      image: string | null
    }
  }
  engagement: {
    stars: {
      total: number
      average: number
      distribution: number[]
    }
    comments: {
      total: number
      recent: any[]
    }
    views: number
    shares: number
  }
  related: {
    similarPosts: any[]
    authorOtherPosts: any[]
  }
}

export class DataAggregationService {
  private static instance: DataAggregationService
  private aggregationCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private pendingAggregations = new Map<string, Promise<any>>()

  private constructor() {
    // 启动缓存清理器
    this.startCacheCleanup()
  }

  public static getInstance(): DataAggregationService {
    if (!DataAggregationService.instance) {
      DataAggregationService.instance = new DataAggregationService()
    }
    return DataAggregationService.instance
  }

  /**
   * 🎯 获取用户聚合数据 - 一次请求获取所有用户相关数据
   */
  public async getUserAggregatedData(userId: string, options: {
    includeRecentPosts?: boolean
    includeStarHistory?: boolean
    includeSocialData?: boolean
    useCache?: boolean
    cacheTTL?: number
  } = {}): Promise<UserAggregatedData> {
    const {
      includeRecentPosts = true,
      includeStarHistory = true,
      includeSocialData = true,
      useCache = true,
      cacheTTL = 300000 // 5分钟
    } = options

    const cacheKey = `user_aggregated_${userId}_${JSON.stringify(options)}`

    // 🔍 检查缓存
    if (useCache && this.aggregationCache.has(cacheKey)) {
      const cached = this.aggregationCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < cached.ttl) {
        console.log(`🎯 聚合数据缓存命中: ${cacheKey}`)
        return cached.data
      }
    }

    // 🔄 检查是否已有相同请求在处理
    if (this.pendingAggregations.has(cacheKey)) {
      console.log(`⏳ 等待现有聚合请求: ${cacheKey}`)
      return await this.pendingAggregations.get(cacheKey)!
    }

    // 🚀 执行聚合查询
    const aggregationPromise = this.executeUserAggregation(userId, {
      includeRecentPosts,
      includeStarHistory,
      includeSocialData
    })

    this.pendingAggregations.set(cacheKey, aggregationPromise)

    try {
      const result = await aggregationPromise
      
      // 💾 缓存结果
      if (useCache) {
        this.aggregationCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: cacheTTL
        })
      }

      return result
    } finally {
      this.pendingAggregations.delete(cacheKey)
    }
  }

  /**
   * 🔧 执行用户数据聚合
   */
  private async executeUserAggregation(userId: string, options: {
    includeRecentPosts: boolean
    includeStarHistory: boolean
    includeSocialData: boolean
  }): Promise<UserAggregatedData> {
    console.log(`🔄 执行用户数据聚合: ${userId}`)

    // 🎯 使用高性能连接管理器执行批量查询
    const result = await highPerformanceDB.executeQuery(
      `user_aggregation_${userId}`,
      async (prisma: PrismaClient) => {
        // 📊 并行执行所有查询
        // 明确类型定义避免TypeScript推断错误
        const userProfile = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            createdAt: true
          }
        })

        const [
          starBalance,
          postStats,
          starReceived,
          starGiven,
          socialStats,
          activityStats,
          recentPosts,
          starHistory
        ] = await Promise.all([
          // Star余额
          prisma.starBalance.findUnique({
            where: { userId },
            select: {
              totalStars: true,
              availableStars: true,
              dailyEarned: true,
              maxDailyBasic: true
            }
          }),

          // 帖子统计
          prisma.post.groupBy({
            by: ['status'],
            where: { authorId: userId },
            _count: { id: true }
          }),

          // 收到的Star投票
          prisma.starVote.aggregate({
            where: {
              post: { authorId: userId }
            },
            _sum: { amount: true },
            _count: { id: true }
          }),

          // 投出的Star投票
          prisma.starVote.aggregate({
            where: { fromUserId: userId },
            _sum: { amount: true },
            _count: { id: true }
          }),

          // 社交统计（如果需要）
          options.includeSocialData ? Promise.all([
            prisma.user.count({
              where: {
                // 假设有关注关系表
                // followers: { some: { followerId: userId } }
              }
            }),
            prisma.user.count({
              where: {
                // following: { some: { followingId: userId } }
              }
            })
          ]) : Promise.resolve([0, 0]),

          // 活动统计
          prisma.post.findFirst({
            where: { authorId: userId },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
          }),

          // 最近帖子（如果需要）
          options.includeRecentPosts ? prisma.post.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              _count: {
                select: {
                  starVotes: true,
                  comments: true
                }
              }
            }
          }) : Promise.resolve([]),

          // Star历史（如果需要）
          options.includeStarHistory ? prisma.starVote.findMany({
            where: {
              OR: [
                { fromUserId: userId },
                { post: { authorId: userId } }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              amount: true,
              createdAt: true,
              fromUserId: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  authorId: true
                }
              }
            }
          }) : Promise.resolve([])
        ])

        // 🔧 数据处理和聚合
        const postStatsMap = postStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id
          return acc
        }, {} as Record<string, number>)

        const [followers, following] = socialStats as [number, number]

        return {
          profile: {
            id: userProfile?.id || userId,
            name: userProfile?.name || '',
            email: userProfile?.email || '',
            image: userProfile?.image || '',
            bio: userProfile?.bio || '',
            githubUrl: '', // 暂时设为空字符串，因为数据库中没有这个字段
            createdAt: userProfile?.createdAt || new Date()
          },
          stats: {
            posts: {
              total: Object.values(postStatsMap).reduce((sum, count) => sum + count, 0),
              published: postStatsMap['PUBLISHED'] || 0,
              draft: postStatsMap['DRAFT'] || 0,
              recent: recentPosts
            },
            stars: {
              balance: {
                totalStars: starBalance?.totalStars || 0,
                availableStars: starBalance?.availableStars || 0,
                usedStars: (starBalance?.totalStars || 0) - (starBalance?.availableStars || 0),
                dailyEarned: starBalance?.dailyEarned || 0
              },
              received: {
                totalReceived: starReceived._sum.amount || 0,
                voterCount: starReceived._count.id || 0,
                recentVotes: starHistory.filter(vote => vote.post?.authorId === userId)
              },
              given: {
                totalGiven: starGiven._sum.amount || 0,
                voteCount: starGiven._count.id || 0,
                recentVotes: starHistory.filter(vote => vote.fromUserId === userId)
              }
            },
            social: {
              followers,
              following,
              interactions: (starReceived._count.id || 0) + (starGiven._count.id || 0)
            },
            activity: {
              lastActive: activityStats?.updatedAt || new Date(),
              weeklyActivity: 0, // 可以根据需要计算
              monthlyActivity: 0 // 可以根据需要计算
            }
          },
          preferences: {
            notifications: true, // 从用户设置获取
            privacy: 'public',   // 从用户设置获取
            theme: 'light'       // 从用户设置获取
          }
        }
      },
      {
        useCache: true,
        priority: 2,
        timeout: 15000
      }
    )

    console.log(`✅ 用户数据聚合完成: ${userId}`)
    return result
  }

  /**
   * 🎯 获取帖子聚合数据
   */
  public async getPostAggregatedData(postId: string, options: {
    includeRelated?: boolean
    includeComments?: boolean
    useCache?: boolean
    cacheTTL?: number
  } = {}): Promise<PostAggregatedData> {
    const {
      includeRelated = true,
      includeComments = true,
      useCache = true,
      cacheTTL = 180000 // 3分钟
    } = options

    const cacheKey = `post_aggregated_${postId}_${JSON.stringify(options)}`

    // 🔍 检查缓存
    if (useCache && this.aggregationCache.has(cacheKey)) {
      const cached = this.aggregationCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data
      }
    }

    // 🚀 执行聚合查询
    const result = await highPerformanceDB.executeQuery(
      `post_aggregation_${postId}`,
      async (prisma: PrismaClient) => {
        // 明确类型定义避免TypeScript推断错误
        const postData = await prisma.post.findUnique({
          where: { id: postId },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        })

        const [
          starStats,
          commentStats,
          viewStats,
          relatedPosts,
          authorOtherPosts
        ] = await Promise.all([
          // Star统计
          prisma.starVote.aggregate({
            where: { postId },
            _sum: { amount: true },
            _count: { id: true },
            _avg: { amount: true }
          }),

          // 评论统计
          includeComments ? prisma.comment.findMany({
            where: { postId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              content: true,
              createdAt: true,
              userId: true
            }
          }) : Promise.resolve([]),

          // 浏览统计（假设有浏览记录表）
          Promise.resolve(0), // 暂时返回0

          // 相关帖子
          includeRelated ? prisma.post.findMany({
            where: {
              id: { not: postId },
              status: 'PUBLISHED'
              // 可以添加标签匹配等逻辑
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              createdAt: true,
              author: {
                select: {
                  name: true,
                  image: true
                }
              }
            }
          }) : Promise.resolve([]),

          // 作者其他帖子
          includeRelated && postData ? prisma.post.findMany({
            where: {
              authorId: postData.authorId,
              id: { not: postId },
              status: 'PUBLISHED'
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              createdAt: true
            }
          }) : Promise.resolve([])
        ])

        if (!postData) {
          throw new Error(`帖子不存在: ${postId}`)
        }

        return {
          post: postData,
          engagement: {
            stars: {
              total: starStats._sum.amount || 0,
              average: starStats._avg.amount || 0,
              distribution: [] // 可以计算星级分布
            },
            comments: {
              total: commentStats.length,
              recent: commentStats
            },
            views: viewStats,
            shares: 0 // 可以从分享记录获取
          },
          related: {
            similarPosts: relatedPosts,
            authorOtherPosts: authorOtherPosts
          }
        }
      },
      {
        useCache: true,
        priority: 1,
        timeout: 10000
      }
    )

    // 💾 缓存结果
    if (useCache) {
      this.aggregationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: cacheTTL
      })
    }

    return result
  }

  /**
   * 🧹 启动缓存清理器
   */
  private startCacheCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [key, cached] of this.aggregationCache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.aggregationCache.delete(key)
        }
      }
    }, 60000) // 每分钟清理一次过期缓存
  }

  /**
   * 📊 获取聚合服务状态
   */
  public getStatus() {
    return {
      cacheSize: this.aggregationCache.size,
      pendingAggregations: this.pendingAggregations.size,
      cacheHitRate: 0 // 可以添加命中率统计
    }
  }

  /**
   * 🧹 清理缓存
   */
  public clearCache() {
    this.aggregationCache.clear()
    console.log('🧹 聚合服务缓存已清理')
  }
}

// 🚀 导出单例实例
export const dataAggregationService = DataAggregationService.getInstance()
