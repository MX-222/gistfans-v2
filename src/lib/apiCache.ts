// API缓存管理器
interface CacheItem {
  data: any
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

class APICache {
  private cache = new Map<string, CacheItem>()
  private defaultTTL = 5 * 60 * 1000 // 5分钟默认缓存时间

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // 获取缓存统计
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 创建全局缓存实例
export const apiCache = new APICache()

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 60000) // 每分钟清理一次
}

// 缓存键生成器
export const getCacheKey = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return `${endpoint}?${sortedParams}`
}

// 带缓存的fetch函数
export const cachedFetch = async (
  url: string, 
  options?: RequestInit,
  cacheTTL?: number
): Promise<any> => {
  const cacheKey = getCacheKey(url, options?.method === 'GET' ? undefined : { method: options?.method })
  
  // 只缓存GET请求
  if (!options?.method || options.method === 'GET') {
    const cached = apiCache.get(cacheKey)
    if (cached) {
      console.log(`🎯 缓存命中: ${url}`)
      return cached
    }
  }

  console.log(`🌐 API请求: ${url}`)
  const response = await fetch(url, options)
  const data = await response.json()

  // 只缓存成功的GET请求
  if (response.ok && (!options?.method || options.method === 'GET')) {
    apiCache.set(cacheKey, data, cacheTTL)
  }

  return data
}

// 预定义的缓存时间
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1分钟
  MEDIUM: 5 * 60 * 1000,     // 5分钟
  LONG: 15 * 60 * 1000,      // 15分钟
  VERY_LONG: 60 * 60 * 1000  // 1小时
} as const
