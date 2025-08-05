/**
 * Redis缓存层实现
 * 支持分布式缓存、发布订阅、集群模式
 */

import { Redis } from 'ioredis'
import { CacheItem } from './CacheManager'

// Redis配置接口
export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
  keyPrefix?: string
  cluster?: boolean
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
}

// 缓存键命名空间
export enum CacheNamespace {
  POSTS = 'posts',
  USERS = 'users',
  COMMENTS = 'comments',
  NOTIFICATIONS = 'notifications',
  SESSIONS = 'sessions'
}

/**
 * Redis缓存管理器
 * 实现分布式缓存和实时数据同步
 */
export class RedisCache {
  private redis!: Redis
  private pubClient!: Redis
  private subClient!: Redis
  private isConnected: boolean = false

  constructor(private config: RedisConfig) {
    this.initializeRedis()
  }

  /**
   * 初始化Redis连接
   */
  private initializeRedis(): void {
    const redisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      keyPrefix: this.config.keyPrefix || 'gistfans:',
      retryDelayOnFailover: this.config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
      lazyConnect: true,
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY'
        return err.message.includes(targetError)
      }
    }

    // 主Redis连接
    this.redis = new Redis(redisOptions)
    
    // 发布订阅连接
    this.pubClient = new Redis(redisOptions)
    this.subClient = new Redis(redisOptions)

    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected')
      this.isConnected = true
    })

    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err)
      this.isConnected = false
    })

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed')
      this.isConnected = false
    })
  }

  /**
   * 连接Redis
   */
  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.redis.connect(),
        this.pubClient.connect(),
        this.subClient.connect()
      ])
      console.log('✅ All Redis connections established')
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error)
      throw error
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.disconnect(),
      this.pubClient.disconnect(),
      this.subClient.disconnect()
    ])
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<CacheItem<T> | null> {
    if (!this.isConnected) {
      console.warn('⚠️ Redis not connected, skipping cache get')
      return null
    }

    try {
      const data = await this.redis.get(key)
      if (!data) return null

      const item: CacheItem<T> = JSON.parse(data)
      
      // 检查是否过期
      if (Date.now() - item.timestamp > item.ttl) {
        await this.delete(key)
        return null
      }

      // 更新访问次数
      item.hits++
      await this.redis.set(key, JSON.stringify(item), 'PX', item.ttl)

      return item
    } catch (error) {
      console.error('❌ Redis get error:', error)
      return null
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(
    key: string, 
    item: CacheItem<T>, 
    options?: {
      nx?: boolean  // 仅当键不存在时设置
      xx?: boolean  // 仅当键存在时设置
    }
  ): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('⚠️ Redis not connected, skipping cache set')
      return false
    }

    try {
      const serialized = JSON.stringify(item)

      let result: string | null
      if (options?.nx) {
        result = await this.redis.set(key, serialized, 'PX', item.ttl, 'NX')
      } else if (options?.xx) {
        result = await this.redis.set(key, serialized, 'PX', item.ttl, 'XX')
      } else {
        result = await this.redis.set(key, serialized, 'PX', item.ttl)
      }

      return result === 'OK'
    } catch (error) {
      console.error('❌ Redis set error:', error)
      return false
    }
  }

  /**
   * 删除缓存数据
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) return false

    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      console.error('❌ Redis delete error:', error)
      return false
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected) return 0

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length === 0) return 0

      const result = await this.redis.del(...keys)
      return result
    } catch (error) {
      console.error('❌ Redis delete pattern error:', error)
      return 0
    }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTags(tags: string[]): Promise<number> {
    if (!this.isConnected) return 0

    try {
      let deletedCount = 0
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`
        const keys = await this.redis.smembers(tagKey)
        
        if (keys.length > 0) {
          // 删除实际的缓存键
          const deleteResult = await this.redis.del(...keys)
          deletedCount += deleteResult
          
          // 删除标签集合
          await this.redis.del(tagKey)
        }
      }

      return deletedCount
    } catch (error) {
      console.error('❌ Redis delete by tags error:', error)
      return 0
    }
  }

  /**
   * 为缓存项添加标签
   */
  async addTags(key: string, tags: string[]): Promise<void> {
    if (!this.isConnected || tags.length === 0) return

    try {
      const pipeline = this.redis.pipeline()
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`
        pipeline.sadd(tagKey, key)
        pipeline.expire(tagKey, 3600) // 标签1小时过期
      }

      await pipeline.exec()
    } catch (error) {
      console.error('❌ Redis add tags error:', error)
    }
  }

  /**
   * 发布缓存失效消息
   */
  async publishInvalidation(
    namespace: CacheNamespace, 
    keys: string[], 
    metadata?: any
  ): Promise<void> {
    if (!this.isConnected) return

    try {
      const message = {
        namespace,
        keys,
        timestamp: Date.now(),
        metadata
      }

      const channel = `cache:invalidate:${namespace}`
      await this.pubClient.publish(channel, JSON.stringify(message))
      
      console.log(`📢 Published cache invalidation: ${channel}`, keys)
    } catch (error) {
      console.error('❌ Redis publish error:', error)
    }
  }

  /**
   * 订阅缓存失效消息
   */
  async subscribeToInvalidations(
    namespace: CacheNamespace,
    callback: (keys: string[], metadata?: any) => void
  ): Promise<void> {
    if (!this.isConnected) return

    try {
      const channel = `cache:invalidate:${namespace}`
      
      await this.subClient.subscribe(channel)
      
      this.subClient.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message)
            callback(data.keys, data.metadata)
          } catch (error) {
            console.error('❌ Failed to parse invalidation message:', error)
          }
        }
      })

      console.log(`👂 Subscribed to cache invalidations: ${channel}`)
    } catch (error) {
      console.error('❌ Redis subscribe error:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    keyCount: number
    memoryUsage: string
    hitRate: number
    missRate: number
  }> {
    if (!this.isConnected) {
      return { keyCount: 0, memoryUsage: '0B', hitRate: 0, missRate: 0 }
    }

    try {
      const info = await this.redis.info('stats')
      const keyspace = await this.redis.info('keyspace')
      
      // 解析统计信息
      const stats = this.parseRedisInfo(info)
      const keyCount = this.parseKeyCount(keyspace)
      
      return {
        keyCount,
        memoryUsage: stats.used_memory_human || '0B',
        hitRate: parseFloat(stats.keyspace_hit_rate || '0'),
        missRate: parseFloat(stats.keyspace_miss_rate || '0')
      }
    } catch (error) {
      console.error('❌ Redis stats error:', error)
      return { keyCount: 0, memoryUsage: '0B', hitRate: 0, missRate: 0 }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('❌ Redis health check failed:', error)
      return false
    }
  }

  // ========== 私有方法 ==========

  private parseRedisInfo(info: string): Record<string, string> {
    const stats: Record<string, string> = {}
    const lines = info.split('\r\n')
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':')
        stats[key] = value
      }
    }
    
    return stats
  }

  private parseKeyCount(keyspace: string): number {
    const match = keyspace.match(/keys=(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
}

// 创建Redis缓存实例
export const createRedisCache = (config: RedisConfig): RedisCache => {
  return new RedisCache(config)
}

// 默认Redis配置
export const defaultRedisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'gistfans:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
}
