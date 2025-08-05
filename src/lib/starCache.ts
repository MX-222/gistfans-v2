// Star统计缓存工具 - 使用内存缓存优化性能
interface StarStats {
  totalStars: number
  voterCount: number
}

interface CachedStarStats {
  stats: StarStats
  timestamp: number
  expiresAt: number
}

interface CommentCount {
  count: number
  timestamp: number
  expiresAt: number
}

class StarStatsCache {
  private starStatsCache: Map<string, CachedStarStats> = new Map()
  private commentCountCache: Map<string, CommentCount> = new Map()
  private readonly STAR_CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private readonly COMMENT_CACHE_DURATION = 3 * 60 * 1000 // 3分钟缓存

  // 检查缓存是否有效
  private isValidCache(expiresAt: number): boolean {
    return Date.now() < expiresAt
  }

  // 获取Star统计缓存
  getStarStats(postId: string): StarStats | null {
    const cached = this.starStatsCache.get(postId)
    
    if (cached && this.isValidCache(cached.expiresAt)) {
      console.log('🎯 Star统计缓存命中:', postId)
      return cached.stats
    }
    
    // 清理过期缓存
    if (cached) {
      this.starStatsCache.delete(postId)
      console.log('🗑️ 清理过期Star统计缓存:', postId)
    }
    
    return null
  }

  // 设置Star统计缓存
  setStarStats(postId: string, stats: StarStats): void {
    const now = Date.now()
    
    this.starStatsCache.set(postId, {
      stats,
      timestamp: now,
      expiresAt: now + this.STAR_CACHE_DURATION
    })
    
    console.log('💾 Star统计缓存已更新:', postId, stats)
  }

  // 批量设置Star统计缓存
  setBatchStarStats(statsMap: Map<string, StarStats>): void {
    const now = Date.now()
    
    statsMap.forEach((stats, postId) => {
      this.starStatsCache.set(postId, {
        stats,
        timestamp: now,
        expiresAt: now + this.STAR_CACHE_DURATION
      })
    })
    
    console.log('💾 批量Star统计缓存已更新:', statsMap.size, '个帖子')
  }

  // 获取评论数量缓存
  getCommentCount(postId: string): number | null {
    const cached = this.commentCountCache.get(postId)
    
    if (cached && this.isValidCache(cached.expiresAt)) {
      console.log('🎯 评论数量缓存命中:', postId)
      return cached.count
    }
    
    // 清理过期缓存
    if (cached) {
      this.commentCountCache.delete(postId)
      console.log('🗑️ 清理过期评论数量缓存:', postId)
    }
    
    return null
  }

  // 设置评论数量缓存
  setCommentCount(postId: string, count: number): void {
    const now = Date.now()
    
    this.commentCountCache.set(postId, {
      count,
      timestamp: now,
      expiresAt: now + this.COMMENT_CACHE_DURATION
    })
    
    console.log('💾 评论数量缓存已更新:', postId, count)
  }

  // 清除特定帖子的所有缓存
  clearPostCache(postId: string): void {
    this.starStatsCache.delete(postId)
    this.commentCountCache.delete(postId)
    console.log('🧹 帖子缓存已清除:', postId)
  }

  // 清除所有缓存
  clearAllCache(): void {
    this.starStatsCache.clear()
    this.commentCountCache.clear()
    console.log('🧹 所有缓存已清除')
  }

  // 获取缓存统计信息
  getCacheStats(): {
    starStatsTotal: number
    starStatsValid: number
    commentCountTotal: number
    commentCountValid: number
  } {
    let starStatsValid = 0
    let commentCountValid = 0
    
    for (const cached of this.starStatsCache.values()) {
      if (this.isValidCache(cached.expiresAt)) {
        starStatsValid++
      }
    }
    
    for (const cached of this.commentCountCache.values()) {
      if (this.isValidCache(cached.expiresAt)) {
        commentCountValid++
      }
    }
    
    return {
      starStatsTotal: this.starStatsCache.size,
      starStatsValid,
      commentCountTotal: this.commentCountCache.size,
      commentCountValid
    }
  }

  // 清理所有过期缓存
  cleanup(): void {
    const expiredStarStats: string[] = []
    const expiredCommentCounts: string[] = []
    
    for (const [postId, cached] of this.starStatsCache.entries()) {
      if (!this.isValidCache(cached.expiresAt)) {
        expiredStarStats.push(postId)
      }
    }
    
    for (const [postId, cached] of this.commentCountCache.entries()) {
      if (!this.isValidCache(cached.expiresAt)) {
        expiredCommentCounts.push(postId)
      }
    }
    
    expiredStarStats.forEach(postId => this.starStatsCache.delete(postId))
    expiredCommentCounts.forEach(postId => this.commentCountCache.delete(postId))
    
    if (expiredStarStats.length > 0 || expiredCommentCounts.length > 0) {
      console.log('🧹 清理过期缓存:', {
        starStats: expiredStarStats.length,
        commentCounts: expiredCommentCounts.length
      })
    }
  }

  // 预热缓存 - 批量加载热门帖子的统计数据
  async warmupCache(postIds: string[], starService: any): Promise<void> {
    try {
      console.log('🔥 开始预热缓存:', postIds.length, '个帖子')
      
      // 批量获取Star统计
      const statsMap = await starService.getBatchPostStarVotes(postIds)
      this.setBatchStarStats(statsMap)
      
      console.log('✅ 缓存预热完成')
    } catch (error) {
      console.error('❌ 缓存预热失败:', error)
    }
  }
}

// 创建全局缓存实例
export const starStatsCache = new StarStatsCache()

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    starStatsCache.cleanup()
  }, 2 * 60 * 1000) // 每2分钟清理一次
}

// 缓存管理器
export class StarCacheManager {
  private static instance: StarCacheManager
  private cache = starStatsCache

  static getInstance(): StarCacheManager {
    if (!StarCacheManager.instance) {
      StarCacheManager.instance = new StarCacheManager()
    }
    return StarCacheManager.instance
  }

  // 获取Star统计（优先从缓存）
  async getStarStats(postId: string, starService: any): Promise<StarStats> {
    // 先尝试从缓存获取
    const cached = this.cache.getStarStats(postId)
    if (cached) {
      return cached
    }

    // 缓存未命中，从数据库获取
    try {
      console.log('🔄 从数据库获取Star统计:', postId)
      const stats = await starService.getPostStarVotes(postId)
      
      // 更新缓存
      this.cache.setStarStats(postId, stats)
      return stats
    } catch (error) {
      console.error('❌ 获取Star统计失败:', error)
      return { totalStars: 0, voterCount: 0 }
    }
  }

  // 获取评论数量（优先从缓存）
  async getCommentCount(postId: string, commentsApi: any): Promise<number> {
    // 先尝试从缓存获取
    const cached = this.cache.getCommentCount(postId)
    if (cached !== null) {
      return cached
    }

    // 缓存未命中，从API获取
    try {
      console.log('🔄 从API获取评论数量:', postId)
      const response = await commentsApi.getComments(postId)
      
      if (response.success && response.data?.comments) {
        const count = response.data.comments.length
        // 更新缓存
        this.cache.setCommentCount(postId, count)
        return count
      }
    } catch (error) {
      console.error('❌ 获取评论数量失败:', error)
    }

    return 0
  }

  // 投票后更新缓存
  updateAfterVote(postId: string, amount: number): void {
    const cached = this.cache.getStarStats(postId)
    if (cached) {
      // 更新缓存中的统计数据
      this.cache.setStarStats(postId, {
        totalStars: cached.totalStars + amount,
        voterCount: cached.voterCount + 1
      })
      console.log('🔄 投票后更新缓存:', postId, '+' + amount)
    }
  }

  // 评论后更新缓存
  updateAfterComment(postId: string): void {
    const cached = this.cache.getCommentCount(postId)
    if (cached !== null) {
      // 更新缓存中的评论数量
      this.cache.setCommentCount(postId, cached + 1)
      console.log('🔄 评论后更新缓存:', postId, '+1')
    }
  }

  // 清除帖子缓存
  clearPostCache(postId: string): void {
    this.cache.clearPostCache(postId)
  }

  // 获取缓存统计
  getCacheStats() {
    return this.cache.getCacheStats()
  }
}

// 导出单例实例
export const starCacheManager = StarCacheManager.getInstance()

// 导出类型
export type { StarStats, CachedStarStats, CommentCount }
