/**
 * GistFans 管理员API缓存系统
 * 减少数据库查询压力，提升响应速度
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  cleanupInterval: number
}

export class AdminCache {
  private cache: Map<string, CacheItem<any>> = new Map()
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 30000,      // 30秒默认TTL
      maxSize: 1000,          // 最大1000个缓存项
      cleanupInterval: 60000, // 1分钟清理一次
      ...config
    }

    this.startCleanup()
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL
    }

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, item)
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    memoryUsage: string
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: 实现命中率统计
      memoryUsage: `${Math.round(this.cache.size * 0.5)}KB`
    }
  }

  /**
   * 淘汰最老的缓存项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    if (keysToDelete.length > 0) {
      console.log(`🧹 AdminCache清理了 ${keysToDelete.length} 个过期缓存项`)
    }
  }

  /**
   * 停止缓存系统
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.cache.clear()
  }
}

// 全局管理员缓存实例
export const adminCache = new AdminCache({
  defaultTTL: 30000,      // 30秒TTL，管理员数据变化不频繁
  maxSize: 500,           // 500个缓存项
  cleanupInterval: 120000 // 2分钟清理一次
})

/**
 * 缓存装饰器 - 用于包装需要缓存的函数
 */
export function withAdminCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // 尝试从缓存获取
      const cached = adminCache.get<T>(key)
      if (cached !== null) {
        console.log(`🎯 AdminCache命中: ${key}`)
        resolve(cached)
        return
      }

      // 缓存未命中，执行操作
      console.log(`🔍 AdminCache未命中，执行查询: ${key}`)
      const result = await operation()
      
      // 存入缓存
      adminCache.set(key, result, ttl)
      resolve(result)
      
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  
  return `${prefix}:${sortedParams}`
}

/**
 * 缓存预热 - 预加载常用数据
 */
export async function warmupAdminCache(): Promise<void> {
  try {
    console.log('🔥 开始管理员缓存预热...')
    
    // 这里可以预加载一些常用的管理员数据
    // 例如：用户统计、系统配置等
    
    console.log('🔥 管理员缓存预热完成')
  } catch (error) {
    console.error('❌ 管理员缓存预热失败:', error)
  }
}

/**
 * 缓存失效策略
 */
export function invalidateAdminCache(pattern: string): void {
  const keysToDelete: string[] = []
  
  for (const key of adminCache['cache'].keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  }
  
  for (const key of keysToDelete) {
    adminCache.delete(key)
  }
  
  if (keysToDelete.length > 0) {
    console.log(`🗑️ 失效了 ${keysToDelete.length} 个匹配 "${pattern}" 的缓存项`)
  }
}
