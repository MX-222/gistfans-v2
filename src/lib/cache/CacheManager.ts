/**
 * 生产级多层缓存管理器
 * 基于Twitter/Facebook等社交平台的缓存架构最佳实践
 */

import { LRUCache } from 'lru-cache'

// 缓存策略枚举
export enum CacheStrategy {
  CACHE_ASIDE = 'cache-aside',           // 旁路缓存
  WRITE_THROUGH = 'write-through',       // 写穿透
  WRITE_BACK = 'write-back',            // 写回
  WRITE_AROUND = 'write-around'         // 写绕过
}

// 缓存层级
export enum CacheLevel {
  L1_MEMORY = 'l1-memory',              // L1: 内存缓存
  L2_REDIS = 'l2-redis',                // L2: Redis缓存
  L3_DATABASE = 'l3-database'           // L3: 数据库
}

// 缓存配置接口
export interface CacheConfig {
  strategy: CacheStrategy
  ttl: number
  maxSize?: number
  enableL1?: boolean
  enableL2?: boolean
  enableRealtime?: boolean
  tags?: string[]
}

// 缓存项接口
export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: number
  tags: string[]
  hits: number
}

// 缓存事件接口
export interface CacheEvent {
  type: 'set' | 'get' | 'delete' | 'invalidate'
  key: string
  level: CacheLevel
  timestamp: number
  metadata?: any
}

/**
 * 多层缓存管理器
 * 实现L1(内存) + L2(Redis) + L3(数据库)的三层缓存架构
 */
export class CacheManager {
  private l1Cache: LRUCache<string, CacheItem>
  private eventListeners: Map<string, ((event: CacheEvent) => void)[]> = new Map()
  private metrics: Map<string, number> = new Map()

  constructor(private config: {
    l1MaxSize?: number
    l1TTL?: number
    enableMetrics?: boolean
  } = {}) {
    // 初始化L1内存缓存 (LRU)
    this.l1Cache = new LRUCache({
      max: config.l1MaxSize || 1000,
      ttl: config.l1TTL || 5 * 60 * 1000, // 5分钟
      updateAgeOnGet: true,
      allowStale: false
    })

    // 初始化性能指标
    if (config.enableMetrics) {
      this.initMetrics()
    }
  }

  /**
   * 获取缓存数据 - Cache-Aside模式
   */
  async get<T>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    const startTime = Date.now()
    
    try {
      // L1缓存查找
      if (config?.enableL1 !== false) {
        const l1Result = this.getFromL1<T>(key)
        if (l1Result) {
          this.recordMetric('l1_hit')
          this.emitEvent('get', key, CacheLevel.L1_MEMORY)
          return l1Result.data
        }
      }

      // L2缓存查找 (Redis)
      if (config?.enableL2 !== false) {
        const l2Result = await this.getFromL2<T>(key)
        if (l2Result) {
          // 回填L1缓存
          this.setToL1(key, l2Result)
          this.recordMetric('l2_hit')
          this.emitEvent('get', key, CacheLevel.L2_REDIS)
          return l2Result.data
        }
      }

      this.recordMetric('cache_miss')
      return null
    } finally {
      this.recordMetric('get_duration', Date.now() - startTime)
    }
  }

  /**
   * 设置缓存数据 - 支持多种写入策略
   */
  async set<T>(
    key: string, 
    data: T, 
    config: CacheConfig
  ): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      version: this.generateVersion(),
      tags: config.tags || [],
      hits: 0
    }

    switch (config.strategy) {
      case CacheStrategy.WRITE_THROUGH:
        await this.writeThrough(key, cacheItem, config)
        break
      
      case CacheStrategy.WRITE_BACK:
        await this.writeBack(key, cacheItem, config)
        break
      
      case CacheStrategy.WRITE_AROUND:
        await this.writeAround(key, cacheItem, config)
        break
      
      default: // CACHE_ASIDE
        await this.cacheAside(key, cacheItem, config)
    }

    this.emitEvent('set', key, CacheLevel.L1_MEMORY, { strategy: config.strategy })
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    // 从所有层级删除
    this.l1Cache.delete(key)
    await this.deleteFromL2(key)
    
    this.emitEvent('delete', key, CacheLevel.L1_MEMORY)
    this.recordMetric('delete_count')
  }

  /**
   * 按标签批量失效缓存
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToInvalidate: string[] = []
    
    // 扫描L1缓存
    for (const [key, item] of this.l1Cache.entries()) {
      if (item.tags.some(tag => tags.includes(tag))) {
        keysToInvalidate.push(key)
      }
    }

    // 批量删除
    await Promise.all(keysToInvalidate.map(key => this.delete(key)))
    
    this.emitEvent('invalidate', `tags:${tags.join(',')}`, CacheLevel.L1_MEMORY)
    this.recordMetric('tag_invalidation_count')
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    l1Size: number
    l1HitRate: number
    l2HitRate: number
    totalRequests: number
    avgResponseTime: number
  } {
    const l1Hits = this.metrics.get('l1_hit') || 0
    const l2Hits = this.metrics.get('l2_hit') || 0
    const misses = this.metrics.get('cache_miss') || 0
    const totalRequests = l1Hits + l2Hits + misses
    
    return {
      l1Size: this.l1Cache.size,
      l1HitRate: totalRequests > 0 ? l1Hits / totalRequests : 0,
      l2HitRate: totalRequests > 0 ? l2Hits / totalRequests : 0,
      totalRequests,
      avgResponseTime: this.metrics.get('avg_response_time') || 0
    }
  }

  // ========== 私有方法 ==========

  private getFromL1<T>(key: string): CacheItem<T> | null {
    const item = this.l1Cache.get(key) as CacheItem<T>
    if (item && this.isValid(item)) {
      item.hits++
      return item
    }
    return null
  }

  private setToL1<T>(key: string, item: CacheItem<T>): void {
    this.l1Cache.set(key, item)
  }

  private async getFromL2<T>(key: string): Promise<CacheItem<T> | null> {
    // Redis实现将在后续添加
    return null
  }

  private async deleteFromL2(key: string): Promise<void> {
    // Redis实现将在后续添加
  }

  private async writeThrough<T>(
    key: string, 
    item: CacheItem<T>, 
    config: CacheConfig
  ): Promise<void> {
    // 同时写入缓存和数据库
    this.setToL1(key, item)
    // 数据库写入逻辑将在后续添加
  }

  private async writeBack<T>(
    key: string, 
    item: CacheItem<T>, 
    config: CacheConfig
  ): Promise<void> {
    // 只写入缓存，延迟写入数据库
    this.setToL1(key, item)
    // 标记为脏数据，后续批量写入
  }

  private async writeAround<T>(
    key: string, 
    item: CacheItem<T>, 
    config: CacheConfig
  ): Promise<void> {
    // 直接写入数据库，不缓存
    // 数据库写入逻辑将在后续添加
  }

  private async cacheAside<T>(
    key: string, 
    item: CacheItem<T>, 
    config: CacheConfig
  ): Promise<void> {
    // 应用程序负责缓存管理
    this.setToL1(key, item)
  }

  private isValid(item: CacheItem): boolean {
    return Date.now() - item.timestamp < item.ttl
  }

  private generateVersion(): number {
    return Date.now()
  }

  private initMetrics(): void {
    this.metrics.set('l1_hit', 0)
    this.metrics.set('l2_hit', 0)
    this.metrics.set('cache_miss', 0)
    this.metrics.set('delete_count', 0)
    this.metrics.set('tag_invalidation_count', 0)
  }

  private recordMetric(name: string, value: number = 1): void {
    const current = this.metrics.get(name) || 0
    this.metrics.set(name, current + value)
  }

  private emitEvent(
    type: CacheEvent['type'], 
    key: string, 
    level: CacheLevel, 
    metadata?: any
  ): void {
    const event: CacheEvent = {
      type,
      key,
      level,
      timestamp: Date.now(),
      metadata
    }

    const listeners = this.eventListeners.get(type) || []
    listeners.forEach(listener => listener(event))
  }

  /**
   * 添加事件监听器
   */
  on(eventType: CacheEvent['type'], listener: (event: CacheEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || []
    listeners.push(listener)
    this.eventListeners.set(eventType, listeners)
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new CacheManager({
  l1MaxSize: 2000,
  l1TTL: 10 * 60 * 1000, // 10分钟
  enableMetrics: true
})
