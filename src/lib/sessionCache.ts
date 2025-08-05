// 会话状态缓存工具
import { Session } from 'next-auth'

interface CachedSession {
  session: Session | null
  timestamp: number
  expiresAt: number
}

class SessionCache {
  private cache: Map<string, CachedSession> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 生成缓存键
  private getCacheKey(userId?: string): string {
    return userId || 'anonymous'
  }

  // 检查缓存是否有效
  private isValidCache(cached: CachedSession): boolean {
    return Date.now() < cached.expiresAt
  }

  // 获取缓存的会话
  get(userId?: string): Session | null {
    const key = this.getCacheKey(userId)
    const cached = this.cache.get(key)
    
    if (cached && this.isValidCache(cached)) {
      console.log('🎯 会话缓存命中:', key)
      return cached.session
    }
    
    // 清理过期缓存
    if (cached) {
      this.cache.delete(key)
      console.log('🗑️ 清理过期会话缓存:', key)
    }
    
    return null
  }

  // 设置会话缓存
  set(session: Session | null, userId?: string): void {
    const key = this.getCacheKey(userId)
    const now = Date.now()
    
    this.cache.set(key, {
      session,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    })
    
    console.log('💾 会话缓存已更新:', key, session?.user?.email)
  }

  // 清除特定用户的缓存
  clear(userId?: string): void {
    const key = this.getCacheKey(userId)
    this.cache.delete(key)
    console.log('🧹 会话缓存已清除:', key)
  }

  // 清除所有缓存
  clearAll(): void {
    this.cache.clear()
    console.log('🧹 所有会话缓存已清除')
  }

  // 获取缓存统计信息
  getStats(): {
    totalCached: number
    validCached: number
    expiredCached: number
  } {
    let validCount = 0
    let expiredCount = 0
    
    for (const cached of this.cache.values()) {
      if (this.isValidCache(cached)) {
        validCount++
      } else {
        expiredCount++
      }
    }
    
    return {
      totalCached: this.cache.size,
      validCached: validCount,
      expiredCached: expiredCount
    }
  }

  // 清理所有过期缓存
  cleanup(): void {
    const expiredKeys: string[] = []
    
    for (const [key, cached] of this.cache.entries()) {
      if (!this.isValidCache(cached)) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key))
    
    if (expiredKeys.length > 0) {
      console.log('🧹 清理过期会话缓存:', expiredKeys.length, '个')
    }
  }
}

// 创建全局会话缓存实例
export const sessionCache = new SessionCache()

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    sessionCache.cleanup()
  }, 2 * 60 * 1000) // 每2分钟清理一次
}

// 会话缓存钩子
export function useSessionCache() {
  return {
    get: (userId?: string) => sessionCache.get(userId),
    set: (session: Session | null, userId?: string) => sessionCache.set(session, userId),
    clear: (userId?: string) => sessionCache.clear(userId),
    clearAll: () => sessionCache.clearAll(),
    getStats: () => sessionCache.getStats()
  }
}

// 会话状态管理器
export class SessionManager {
  private static instance: SessionManager
  private cache = sessionCache

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  // 获取会话（优先从缓存）
  async getSession(userId?: string): Promise<Session | null> {
    // 先尝试从缓存获取
    const cached = this.cache.get(userId)
    if (cached) {
      return cached
    }

    // 缓存未命中，从API获取
    try {
      console.log('🔄 从API获取会话:', userId)
      const response = await fetch('/api/auth/session')
      
      if (response.ok) {
        const session = await response.json()
        // 更新缓存
        this.cache.set(session, userId)
        return session
      }
    } catch (error) {
      console.error('❌ 获取会话失败:', error)
    }

    return null
  }

  // 刷新会话
  async refreshSession(userId?: string): Promise<Session | null> {
    // 清除缓存，强制从API获取
    this.cache.clear(userId)
    return this.getSession(userId)
  }

  // 登出时清理
  logout(userId?: string): void {
    this.cache.clear(userId)
    console.log('👋 用户登出，会话缓存已清理:', userId)
  }
}

// 导出单例实例
export const sessionManager = SessionManager.getInstance()
