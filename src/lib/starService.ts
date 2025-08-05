import { prisma } from '@/lib/database/unified-prisma'
import { starStatsCache } from './starCache'
import {
  getPacificDateString,
  isNewPacificDay,
  generateDailyUniqueKey,
  getPacificTimestamp,
  getPacificTimeInfo
} from './timezone-utils'

// Star获取规则 - 优化版本
export const STAR_RULES = {
  // 每日基础活动（总上限2个，严格防刷）
  BASIC_DAILY_LOGIN: 1,        // 每日首次登录
  BASIC_DAILY_POST: 1,         // 每日首次发帖

  // 高价值内容创作（无上限）
  CONTENT_RECEIVE_STAR_VOTE: 1, // 1:1转换，接收其他用户投的Star
  CONTENT_POST_BOOKMARKED: 1,
  CONTENT_POST_SHARED: 1,
  CONTENT_ANSWER_ADOPTED: 5,
  CONTENT_OPENSOURCE_SHARE: 3,

  // 社区贡献（稀有奖励）
  COMMUNITY_REGISTER: 10,
  COMMUNITY_WEEKLY_LOGIN: 5,
  COMMUNITY_MONTHLY_LOGIN: 20,
  COMMUNITY_VALID_REPORT: 2,

  // 管理员赠送（无上限）
  ADMIN_GRANT: 0, // 数量由管理员指定

  // 消费规则
  SPEND_VOTE_POST: 1, // 最少1个Star
  SPEND_PIN_POST: 5,
  SPEND_HIGHLIGHT_COMMENT: 2,
  SPEND_CREATE_POLL: 3
} as const

export type StarAction = keyof typeof STAR_RULES

export interface StarBalance {
  id: string
  userId: string
  totalStars: number
  availableStars: number
  dailyEarned: number
  maxDailyBasic: number
  lastLoginDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface StarTransaction {
  id: string
  userId: string
  amount: number
  type: string
  action: string
  description: string
  relatedId: string | null
  relatedType: string | null
  createdAt: Date
}

export class StarService {
  
  /**
   * 获取或创建用户Star余额
   */
  async getOrCreateBalance(userId: string): Promise<StarBalance> {
    let balance = await prisma.starBalance.findUnique({
      where: { userId }
    })

    if (!balance) {
      // 先检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error(`用户不存在: ${userId}`)
      }

      // 使用upsert避免并发创建问题
      balance = await prisma.starBalance.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          totalStars: 10, // 新用户初始10个Star
          availableStars: 10,
          dailyEarned: 0,
          maxDailyBasic: 3,
          lastLoginDate: null
        }
      })
    }

    return balance
  }

  /**
   * 检查并重置每日基础活动限制 - 基于美西时间
   */
  async checkDailyReset(userId: string): Promise<void> {
    const balance = await this.getOrCreateBalance(userId)
    const pacificNow = getPacificTimestamp()
    const lastLogin = balance.lastLoginDate

    // 如果是美西时间的新一天，重置每日基础活动获得的Star
    if (isNewPacificDay(lastLogin)) {
      console.log(`🌅 用户 ${userId} 美西时间新一天重置:`, {
        lastLogin: lastLogin?.toISOString(),
        pacificNow: pacificNow.toISOString(),
        pacificDate: getPacificDateString(),
        timeInfo: getPacificTimeInfo()
      })

      await prisma.starBalance.update({
        where: { userId },
        data: {
          dailyEarned: 0,
          lastLoginDate: pacificNow
        }
      })
    }
  }

  /**
   * 获得Star（基础活动）- 优化版本，严格防刷
   */
  async earnBasicStars(
    userId: string,
    action: StarAction,
    description?: string,
    relatedId?: string,
    relatedType?: string
  ): Promise<{ success: boolean; earned: number; message: string }> {
    await this.checkDailyReset(userId)

    const balance = await this.getOrCreateBalance(userId)
    const amount = STAR_RULES[action]

    // 生成防刷的唯一键
    const dailyKey = generateDailyUniqueKey(userId, action)

    // 检查今日是否已经获得过此类型的Star
    const existingTransaction = await prisma.starTransaction.findUnique({
      where: { dailyKey }
    })

    if (existingTransaction) {
      return {
        success: false,
        earned: 0,
        message: `今日已经获得过${action}类型的Star奖励`
      }
    }

    // 检查每日基础活动总限制（2个Star）
    const maxDaily = 2 // 硬编码为2，符合需求
    if (balance.dailyEarned + amount > maxDaily) {
      return {
        success: false,
        earned: 0,
        message: `每日基础活动最多获得${maxDaily}个Star，今日已获得${balance.dailyEarned}个`
      }
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新余额
      await tx.starBalance.update({
        where: { userId },
        data: {
          totalStars: balance.totalStars + amount,
          availableStars: balance.availableStars + amount,
          dailyEarned: balance.dailyEarned + amount,
          updatedAt: getPacificTimestamp()
        }
      })

      // 记录交易（包含防刷键）
      await tx.starTransaction.create({
        data: {
          userId,
          amount,
          type: 'EARN_BASIC',
          action,
          description: description || `基础活动获得${amount}个Star - ${action}`,
          relatedId,
          relatedType,
          dailyKey, // 防刷键
          createdAt: getPacificTimestamp()
        }
      })

      console.log(`✅ 用户 ${userId} 获得基础Star:`, {
        action,
        amount,
        dailyKey,
        newBalance: balance.availableStars + amount,
        dailyEarned: balance.dailyEarned + amount
      })

      return { success: true, earned: amount, message: `成功获得${amount}个Star` }
    })

    return result
  }

  /**
   * 获得Star（高价值内容，无每日限制）
   */
  async earnContentStars(
    userId: string,
    action: StarAction,
    amount?: number,
    description?: string,
    relatedId?: string,
    relatedType?: string
  ): Promise<{ success: boolean; earned: number; message: string }> {
    const balance = await this.getOrCreateBalance(userId)
    const starAmount = amount || STAR_RULES[action]

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新余额
      await tx.starBalance.update({
        where: { userId },
        data: {
          totalStars: balance.totalStars + starAmount,
          availableStars: balance.availableStars + starAmount,
          updatedAt: new Date()
        }
      })

      // 记录交易
      await tx.starTransaction.create({
        data: {
          userId,
          amount: starAmount,
          type: 'EARN_CONTENT',
          action,
          description: description || `高价值内容获得${starAmount}个Star - ${action}`,
          relatedId,
          relatedType,
          createdAt: new Date()
        }
      })

      return { success: true, earned: starAmount, message: `成功获得${starAmount}个Star` }
    })

    return result
  }

  /**
   * 消费Star
   */
  async spendStars(
    userId: string,
    amount: number,
    action: string,
    description: string,
    relatedId?: string,
    relatedType?: string
  ): Promise<{ success: boolean; spent: number; message: string }> {
    const balance = await this.getOrCreateBalance(userId)
    
    if (balance.availableStars < amount) {
      return {
        success: false,
        spent: 0,
        message: `Star余额不足，需要${amount}个，当前可用${balance.availableStars}个`
      }
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新余额
      await tx.starBalance.update({
        where: { userId },
        data: {
          availableStars: balance.availableStars - amount,
          updatedAt: new Date()
        }
      })

      // 记录交易
      await tx.starTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'SPEND_FEATURE',
          action,
          description,
          relatedId,
          relatedType,
          createdAt: new Date()
        }
      })

      return { success: true, spent: amount, message: `成功消费${amount}个Star` }
    })

    return result
  }

  /**
   * 为帖子投Star（Star从投票者转移到帖子作者）
   */
  async voteStarForPost(
    fromUserId: string,
    toUserId: string,
    postId: string,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    // 检查是否已经投过Star
    const existingVote = await prisma.starVote.findUnique({
      where: {
        fromUserId_postId: {
          fromUserId,
          postId: postId
        }
      }
    })

    if (existingVote) {
      return {
        success: false,
        message: '您已经为这个帖子投过Star了'
      }
    }

    const fromBalance = await this.getOrCreateBalance(fromUserId)
    
    if (fromBalance.availableStars < amount) {
      return {
        success: false,
        message: `Star余额不足，需要${amount}个，当前可用${fromBalance.availableStars}个`
      }
    }

    // 使用优化的事务确保数据一致性和性能
    const result = await prisma.$transaction(async (tx) => {
      // 获取接收者余额（在事务内获取最新数据）
      const toBalance = await tx.starBalance.findUnique({
        where: { userId: toUserId }
      })

      if (!toBalance) {
        // 如果接收者没有余额记录，创建一个
        await tx.starBalance.create({
          data: {
            userId: toUserId,
            totalStars: amount,
            availableStars: amount,
            dailyEarned: 0,
            maxDailyBasic: 50,
            lastLoginDate: new Date()
          }
        })
      } else {
        // 更新接收者余额
        await tx.starBalance.update({
          where: { userId: toUserId },
          data: {
            totalStars: toBalance.totalStars + amount,
            availableStars: toBalance.availableStars + amount,
            updatedAt: new Date()
          }
        })
      }

      // 批量操作：同时更新投票者余额和创建记录
      const [, , , starVote] = await Promise.all([
        // 从投票者扣除Star
        tx.starBalance.update({
          where: { userId: fromUserId },
          data: {
            availableStars: fromBalance.availableStars - amount,
            updatedAt: new Date()
          }
        }),

        // 记录投票者的支出
        tx.starTransaction.create({
          data: {
            userId: fromUserId,
            amount: -amount,
            type: 'SPEND_VOTE',
            action: 'vote_post',
            description: `为帖子投${amount}个Star`,
            relatedId: postId,
            relatedType: 'post'
          }
        }),

        // 记录作者的收入
        tx.starTransaction.create({
          data: {
            userId: toUserId,
            amount: amount,
            type: 'EARN_CONTENT',
            action: 'CONTENT_RECEIVE_STAR_VOTE',
            description: `收到${amount}个Star投票`,
            relatedId: postId,
            relatedType: 'post'
          }
        }),

        // 记录投票记录
        tx.starVote.create({
          data: {
            fromUserId,
            toUserId,
            postId: postId,
            amount
          }
        })
      ])

      return { success: true, message: `成功为帖子投${amount}个Star`, voteId: starVote.id }
    })

    // 投票成功后，更新缓存
    if (result.success) {
      const cached = starStatsCache.getStarStats(postId)
      if (cached) {
        starStatsCache.setStarStats(postId, {
          totalStars: cached.totalStars + amount,
          voterCount: cached.voterCount + 1
        })
        console.log('🔄 投票后更新Star统计缓存:', postId, '+' + amount)
      }
    }

    return result
  }

  /**
   * 获取用户Star余额
   */
  async getBalance(userId: string): Promise<StarBalance> {
    try {
      console.log('🔍 StarService.getBalance - 开始获取用户余额:', userId)
      await this.checkDailyReset(userId)
      const balance = await this.getOrCreateBalance(userId)
      console.log('✅ StarService.getBalance - 成功获取余额:', {
        userId,
        totalStars: balance.totalStars,
        availableStars: balance.availableStars,
        dailyEarned: balance.dailyEarned
      })
      return balance
    } catch (error) {
      console.error('❌ StarService.getBalance - 获取余额失败:', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // 🚨 重要：不要静默返回0，而是抛出错误让上层处理
      throw error
    }
  }

  /**
   * 获取用户Star交易历史
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<StarTransaction[]> {
    return await prisma.starTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * 获取帖子的Star投票统计 - 使用PostgreSQL聚合查询优化性能 + 缓存
   */
  async getPostStarVotes(postId: string, useCache: boolean = true): Promise<{ totalStars: number; voterCount: number }> {
    // 优先从缓存获取
    if (useCache) {
      const cached = starStatsCache.getStarStats(postId)
      if (cached) {
        return cached
      }
    }

    // 使用PostgreSQL聚合查询，一次查询获取所有统计数据
    const result = await prisma.starVote.aggregate({
      where: { postId: postId },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    const stats = {
      totalStars: result._sum.amount || 0,
      voterCount: result._count.id || 0
    }

    // 更新缓存
    if (useCache) {
      starStatsCache.setStarStats(postId, stats)
    }

    return stats
  }

  /**
   * 批量获取多个帖子的Star投票统计 - 优化性能
   */
  async getBatchPostStarVotes(postIds: string[]): Promise<Map<string, { totalStars: number; voterCount: number }>> {
    if (postIds.length === 0) {
      return new Map()
    }

    // 使用PostgreSQL的GROUP BY聚合查询，一次获取多个帖子的统计
    const results = await prisma.starVote.groupBy({
      by: ['postId'],
      where: {
        postId: {
          in: postIds
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    const statsMap = new Map<string, { totalStars: number; voterCount: number }>()

    // 初始化所有帖子的统计为0
    postIds.forEach(postId => {
      statsMap.set(postId, { totalStars: 0, voterCount: 0 })
    })

    // 填入实际统计数据
    results.forEach(result => {
      statsMap.set(result.postId, {
        totalStars: result._sum.amount || 0,
        voterCount: result._count.id || 0
      })
    })

    return statsMap
  }

  /**
   * 🔧 统一用户Star统计计算 - 修复数据一致性问题
   * 提供用户所有Star相关数据的统一计算和格式化
   */
  async getUnifiedUserStarStats(userId: string): Promise<{
    // 用户拥有的Star（用于投票消费）
    balance: {
      totalStars: number      // 历史总获得Star数量
      availableStars: number  // 当前可用Star数量
      usedStars: number      // 已使用Star数量
      dailyEarned: number    // 今日获得Star数量
      maxDailyBasic: number  // 每日基础获得上限
    }
    // 用户收到的Star投票（其他用户对该用户帖子的投票）
    received: {
      totalReceived: number   // 收到的Star投票总数
      voterCount: number     // 投票人数
      averagePerPost: number // 平均每帖收到的Star
    }
    // 用户投出的Star投票（该用户对其他帖子的投票）
    given: {
      totalGiven: number     // 投出的Star总数
      voteCount: number      // 投票次数
      averagePerVote: number // 平均每次投票的Star数
    }
    // 综合统计（用于显示）
    display: {
      publicTotal: number    // 公开显示的Star总数（收到的Star投票）
      ownedTotal: number     // 拥有的Star总数（用于投票）
      activityScore: number  // 活跃度评分
    }
  }> {
    try {
      console.log('🔍 StarService.getUnifiedUserStarStats - 开始获取统计:', userId)

      // 并行获取所有相关数据
      const [balance, receivedStats, givenStats, userPosts] = await Promise.all([
        // 用户Star余额
        this.getBalance(userId),

        // 用户收到的Star投票统计
        prisma.starVote.aggregate({
          where: {
            post: {
              authorId: userId,
              status: 'PUBLISHED'
            }
          },
          _sum: { amount: true },
          _count: { id: true }
        }),

        // 用户投出的Star投票统计
        prisma.starVote.aggregate({
          where: { fromUserId: userId },
          _sum: { amount: true },
          _count: { id: true }
        }),

        // 用户发布的帖子数量
        prisma.post.count({
          where: {
            authorId: userId,
            status: 'PUBLISHED'
          }
        })
      ])

      console.log('📊 StarService - 原始数据获取成功:', {
        userId,
        balance: {
          totalStars: balance.totalStars,
          availableStars: balance.availableStars
        },
        receivedStats: {
          sum: receivedStats._sum.amount,
          count: receivedStats._count.id
        },
        givenStats: {
          sum: givenStats._sum.amount,
          count: givenStats._count.id
        },
        userPosts
      })

      const totalReceived = receivedStats._sum.amount || 0
      const voterCount = receivedStats._count.id || 0
      const totalGiven = givenStats._sum.amount || 0
      const voteCount = givenStats._count.id || 0
      const averagePerPost = userPosts > 0 ? totalReceived / userPosts : 0
      const averagePerVote = voteCount > 0 ? totalGiven / voteCount : 0

      return {
        balance: {
          totalStars: balance.totalStars,
          availableStars: balance.availableStars,
          usedStars: balance.totalStars - balance.availableStars,
          dailyEarned: balance.dailyEarned,
          maxDailyBasic: balance.maxDailyBasic
        },
        received: {
          totalReceived,
          voterCount,
          averagePerPost: Math.round(averagePerPost * 100) / 100
        },
        given: {
          totalGiven,
          voteCount,
          averagePerVote: Math.round(averagePerVote * 100) / 100
        },
        display: {
          publicTotal: totalReceived,      // 公开显示用户收到的Star投票
          ownedTotal: balance.totalStars,  // 用户拥有的Star总数
          activityScore: Math.round((totalReceived + totalGiven + voterCount + voteCount) / 4)
        }
      }

    } catch (error) {
      console.error('❌ 获取统一用户Star统计失败:', error)
      return {
        balance: { totalStars: 0, availableStars: 0, usedStars: 0, dailyEarned: 0, maxDailyBasic: 0 },
        received: { totalReceived: 0, voterCount: 0, averagePerPost: 0 },
        given: { totalGiven: 0, voteCount: 0, averagePerVote: 0 },
        display: { publicTotal: 0, ownedTotal: 0, activityScore: 0 }
      }
    }
  }

  /**
   * 检查用户是否可以消费指定数量的Star
   */
  async canSpend(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getOrCreateBalance(userId)
    return balance.availableStars >= amount
  }

  /**
   * 每日登录奖励 - 优化版本，使用美西时间和严格防刷
   */
  async handleDailyLogin(userId: string): Promise<{ success: boolean; earned: number; message: string }> {
    console.log(`🔑 处理用户 ${userId} 每日登录奖励`)

    return await this.earnBasicStars(
      userId,
      'BASIC_DAILY_LOGIN',
      '每日登录奖励',
      userId,
      'user'
    )
  }

  /**
   * 每日发帖奖励 - 新增功能
   */
  async handleDailyPost(userId: string, postId: string): Promise<{ success: boolean; earned: number; message: string }> {
    console.log(`📝 处理用户 ${userId} 每日发帖奖励`)

    return await this.earnBasicStars(
      userId,
      'BASIC_DAILY_POST',
      '每日发帖奖励',
      postId,
      'post'
    )
  }

  /**
   * 每日分享奖励 - 新增功能
   */
  async handleDailyShare(userId: string, postId: string): Promise<{ success: boolean; earned: number; message: string }> {
    console.log(`📤 处理用户 ${userId} 每日分享奖励`)

    return await this.earnBasicStars(
      userId,
      'CONTENT_POST_SHARED',
      '每日分享奖励',
      postId,
      'post'
    )
  }

  /**
   * 管理员赠送Star - 新增功能
   */
  async adminGrantStars(
    adminId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    relatedId?: string,
    relatedType?: string
  ): Promise<{ success: boolean; earned: number; message: string; transactionId: string }> {
    // 验证管理员权限
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, isVerified: true, email: true }
    })

    // 在开发模式下，允许未验证的管理员操作
    const isDevMode = process.env.NODE_ENV === 'development'
    if (!admin || admin.role !== 'ADMIN' || (!admin.isVerified && !isDevMode)) {
      return {
        success: false,
        earned: 0,
        message: '权限不足：只有验证的管理员可以赠送Star',
        transactionId: ''
      }
    }

    // 验证目标用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true }
    })

    if (!targetUser) {
      return {
        success: false,
        earned: 0,
        message: '目标用户不存在',
        transactionId: ''
      }
    }

    // 验证赠送数量
    if (amount <= 0 || amount > 100) {
      return {
        success: false,
        earned: 0,
        message: 'Star数量必须在1-100之间',
        transactionId: ''
      }
    }

    // 获取或创建目标用户的Star余额
    const targetBalance = await this.getOrCreateBalance(targetUserId)

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新目标用户余额
      await tx.starBalance.update({
        where: { userId: targetUserId },
        data: {
          totalStars: targetBalance.totalStars + amount,
          availableStars: targetBalance.availableStars + amount,
          updatedAt: getPacificTimestamp()
        }
      })

      // 记录交易
      const transaction = await tx.starTransaction.create({
        data: {
          userId: targetUserId,
          amount,
          type: 'ADMIN_GRANT',
          action: 'ADMIN_GRANT',
          description: `管理员赠送${amount}个Star - ${reason}`,
          relatedId,
          relatedType,
          adminId, // 记录管理员ID
          createdAt: getPacificTimestamp()
        }
      })

      console.log(`👑 管理员 ${adminId} 赠送Star:`, {
        targetUserId,
        amount,
        reason,
        transactionId: transaction.id,
        newBalance: targetBalance.availableStars + amount
      })

      // 发送通知给用户
      try {
        const { NotificationService } = await import('@/lib/notificationService')
        await NotificationService.sendStarGrantNotification({
          recipientId: targetUserId,
          adminId,
          amount,
          reason,
          transactionId: transaction.id,
          adminName: admin.email || undefined // 临时使用邮箱，后续可以获取名称
        })
        console.log('✅ Star赠送通知已发送')
      } catch (notificationError) {
        console.error('⚠️ Star赠送通知发送失败:', notificationError)
        // 通知失败不影响Star赠送的成功
      }

      return {
        success: true,
        earned: amount,
        message: `管理员成功赠送${amount}个Star`,
        transactionId: transaction.id
      }
    })

    return result
  }
}

export const starService = new StarService() 