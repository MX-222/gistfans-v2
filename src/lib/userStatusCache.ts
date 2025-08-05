/**
 * 用户状态缓存管理器
 * 用于缓存用户的onboardingComplete状态，减少API调用
 */

export interface UserStatus {
  id: string
  email?: string
  name?: string
  role: string
  userType?: string
  onboardingComplete: boolean
  inviteCode?: string
  invitedById?: string
  isVerified: boolean
  hasUsedInviteCode: boolean
  needsInviteCode: boolean
  isNewUser: boolean
}

export interface CachedUserStatus {
  status: UserStatus
  timestamp: number
  expiresAt: number
}

class UserStatusCache {
  private cache: Map<string, CachedUserStatus> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 生成缓存键
  private getCacheKey(userId: string): string {
    return `user_status_${userId}`
  }

  // 检查缓存是否有效
  private isValidCache(cached: CachedUserStatus): boolean {
    return Date.now() < cached.expiresAt
  }

  // 获取缓存的用户状态
  get(userId: string): UserStatus | null {
    const key = this.getCacheKey(userId)
    const cached = this.cache.get(key)
    
    if (cached && this.isValidCache(cached)) {
      console.log('🎯 用户状态缓存命中:', userId)
      return cached.status
    }
    
    // 清理过期缓存
    if (cached) {
      this.cache.delete(key)
      console.log('🗑️ 清理过期用户状态缓存:', userId)
    }
    
    return null
  }

  // 设置用户状态缓存
  set(userId: string, status: UserStatus): void {
    const key = this.getCacheKey(userId)
    const now = Date.now()
    
    this.cache.set(key, {
      status,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    })
    
    console.log('💾 用户状态缓存已更新:', userId, status.onboardingComplete ? '已完成注册' : '未完成注册')
    
    // 同时更新localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_status_${userId}`, JSON.stringify(status))
      localStorage.setItem(`user_status_${userId}_time`, now.toString())
    }
  }

  // 清除特定用户的缓存
  clear(userId: string): void {
    const key = this.getCacheKey(userId)
    this.cache.delete(key)
    console.log('🧹 用户状态缓存已清除:', userId)
    
    // 同时清除localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`user_status_${userId}`)
      localStorage.removeItem(`user_status_${userId}_time`)
    }
  }

  // 清除所有缓存
  clearAll(): void {
    this.cache.clear()
    console.log('🧹 所有用户状态缓存已清除')
    
    // 清除localStorage中的用户状态缓存
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('user_status_')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  // 从localStorage恢复缓存
  restoreFromLocalStorage(userId: string): UserStatus | null {
    if (typeof window === 'undefined') return null
    
    const statusData = localStorage.getItem(`user_status_${userId}`)
    const timeData = localStorage.getItem(`user_status_${userId}_time`)
    
    if (statusData && timeData) {
      const cacheAge = Date.now() - parseInt(timeData)
      if (cacheAge < this.CACHE_DURATION) {
        try {
          const status = JSON.parse(statusData) as UserStatus
          console.log('📱 从localStorage恢复用户状态:', userId)
          
          // 同时更新内存缓存
          this.set(userId, status)
          return status
        } catch (error) {
          console.error('❌ 解析localStorage用户状态失败:', error)
          localStorage.removeItem(`user_status_${userId}`)
          localStorage.removeItem(`user_status_${userId}_time`)
        }
      } else {
        // 缓存过期，清理
        localStorage.removeItem(`user_status_${userId}`)
        localStorage.removeItem(`user_status_${userId}_time`)
      }
    }
    
    return null
  }

  // 获取缓存统计信息
  getStats(): { total: number; valid: number; expired: number } {
    const now = Date.now()
    let valid = 0
    let expired = 0
    
    this.cache.forEach(cached => {
      if (this.isValidCache(cached)) {
        valid++
      } else {
        expired++
      }
    })
    
    return {
      total: this.cache.size,
      valid,
      expired
    }
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    this.cache.forEach((cached, key) => {
      if (!this.isValidCache(cached)) {
        expiredKeys.push(key)
      }
    })
    
    expiredKeys.forEach(key => {
      this.cache.delete(key)
    })
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 清理了 ${expiredKeys.length} 个过期的用户状态缓存`)
    }
  }
}

// 创建全局用户状态缓存实例
export const userStatusCache = new UserStatusCache()

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    userStatusCache.cleanup()
  }, 2 * 60 * 1000) // 每2分钟清理一次
}

// 用户状态缓存钩子
export function useUserStatusCache() {
  return {
    get: (userId: string) => userStatusCache.get(userId),
    set: (userId: string, status: UserStatus) => userStatusCache.set(userId, status),
    clear: (userId: string) => userStatusCache.clear(userId),
    clearAll: () => userStatusCache.clearAll(),
    restoreFromLocalStorage: (userId: string) => userStatusCache.restoreFromLocalStorage(userId),
    getStats: () => userStatusCache.getStats()
  }
}

// 用户状态检查工具
export async function checkUserStatusWithCache(userId: string): Promise<UserStatus | null> {
  // 先尝试从缓存获取
  const cached = userStatusCache.get(userId)
  if (cached) {
    return cached
  }

  // 尝试从localStorage恢复
  const restored = userStatusCache.restoreFromLocalStorage(userId)
  if (restored) {
    return restored
  }

  // 缓存未命中，从API获取
  try {
    console.log('🔄 从API获取用户状态:', userId)
    const response = await fetch(`/api/user/status/${userId}`, {
      // 🔒 确保包含认证信息 - 浏览器会自动包含cookies
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.user) {
        // 更新缓存
        userStatusCache.set(userId, data.user)
        console.log('✅ 用户状态获取成功并已缓存:', userId)
        return data.user
      } else {
        console.warn('⚠️ API响应格式异常:', data)
      }
    } else {
      // 🔒 处理认证和权限错误
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        console.error('❌ 用户状态获取失败: 需要登录认证', errorData)
        // 可以触发重新登录流程
        if (typeof window !== 'undefined') {
          // 在浏览器环境中可以重定向到登录页面
          console.log('🔄 建议重新登录')
        }
      } else if (response.status === 403) {
        console.error('❌ 用户状态获取失败: 权限不足', errorData)
      } else {
        console.error('❌ 用户状态获取失败:', response.status, errorData)
      }
    }
  } catch (error) {
    console.error('❌ 获取用户状态网络错误:', error)
  }

  return null
}
