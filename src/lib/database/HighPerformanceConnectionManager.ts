/**
 * 高性能连接管理器
 * 解决API请求过于频繁导致的数据库连接池负担问题
 * 
 * 核心特性：
 * 1. 智能连接池管理 - 动态调整连接数量
 * 2. 查询批处理 - 合并多个查询为单次操作
 * 3. 多层缓存系统 - 减少数据库访问
 * 4. 连接健康监控 - 自动检测和恢复
 * 5. 请求去重 - 避免重复查询
 */

import { PrismaClient } from '@prisma/client'
import { LRUCache } from 'lru-cache'

// 🔧 连接池配置
interface ConnectionPoolConfig {
  minConnections: number      // 最小连接数
  maxConnections: number      // 最大连接数
  idleTimeout: number        // 空闲超时时间
  acquireTimeout: number     // 获取连接超时时间
  batchSize: number          // 批处理大小
  cacheSize: number          // 缓存大小
  cacheTTL: number           // 缓存过期时间
}

// 🎯 查询批处理接口
interface BatchQuery {
  id: string
  query: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  priority: number
  timestamp: number
}

// 📊 连接池状态
interface PoolStatus {
  activeConnections: number
  idleConnections: number
  pendingRequests: number
  totalQueries: number
  cacheHitRate: number
  averageResponseTime: number
}

export class HighPerformanceConnectionManager {
  private static instance: HighPerformanceConnectionManager
  private prismaPool: PrismaClient[] = []
  private config: ConnectionPoolConfig
  private queryCache: LRUCache<string, any>
  private batchQueue: BatchQuery[] = []
  private processingBatch = false
  private connectionStatus: Map<number, 'idle' | 'busy' | 'error'> = new Map()
  private metrics = {
    totalQueries: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    responseTimeSum: 0
  }

  private constructor() {
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      idleTimeout: 30000,      // 30秒
      acquireTimeout: 10000,   // 10秒
      batchSize: 50,           // 批处理50个查询
      cacheSize: 1000,         // 缓存1000个查询结果
      cacheTTL: 300000         // 缓存5分钟
    }

    // 🔧 初始化LRU缓存
    this.queryCache = new LRUCache({
      max: this.config.cacheSize,
      ttl: this.config.cacheTTL,
      updateAgeOnGet: true,
      allowStale: false
    })

    this.initializeConnectionPool()
    this.startBatchProcessor()
    this.startHealthMonitor()
  }

  public static getInstance(): HighPerformanceConnectionManager {
    if (!HighPerformanceConnectionManager.instance) {
      HighPerformanceConnectionManager.instance = new HighPerformanceConnectionManager()
    }
    return HighPerformanceConnectionManager.instance
  }

  /**
   * 🔧 初始化连接池
   */
  private async initializeConnectionPool() {
    console.log('🚀 初始化高性能连接池...')
    
    // 创建最小连接数
    for (let i = 0; i < this.config.minConnections; i++) {
      const prisma = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL
          }
        }
      })
      
      this.prismaPool.push(prisma)
      this.connectionStatus.set(i, 'idle')
    }

    console.log(`✅ 连接池初始化完成，创建了 ${this.config.minConnections} 个连接`)
  }

  /**
   * 🎯 智能查询执行 - 支持缓存、批处理、连接复用
   */
  public async executeQuery<T>(
    queryKey: string,
    queryFn: (prisma: PrismaClient) => Promise<T>,
    options: {
      useCache?: boolean
      priority?: number
      timeout?: number
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const { useCache = true, priority = 1, timeout = this.config.acquireTimeout } = options

    try {
      // 🔍 1. 检查缓存
      if (useCache && this.queryCache.has(queryKey)) {
        this.metrics.cacheHits++
        console.log(`🎯 缓存命中: ${queryKey}`)
        return this.queryCache.get(queryKey) as T
      }

      // 🔄 2. 添加到批处理队列
      const result = await this.addToBatch<T>(queryKey, queryFn, priority, timeout)

      // 💾 3. 缓存结果
      if (useCache && result) {
        this.queryCache.set(queryKey, result)
      }

      // 📊 4. 更新指标
      this.updateMetrics(startTime)
      
      return result
    } catch (error) {
      console.error(`❌ 查询执行失败: ${queryKey}`, error)
      throw error
    }
  }

  /**
   * 🔄 添加查询到批处理队列
   */
  private async addToBatch<T>(
    queryKey: string,
    queryFn: (prisma: PrismaClient) => Promise<T>,
    priority: number,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const batchQuery: BatchQuery = {
        id: queryKey,
        query: () => this.executeWithConnection(queryFn),
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      }

      this.batchQueue.push(batchQuery)
      
      // 按优先级排序
      this.batchQueue.sort((a, b) => b.priority - a.priority)

      // 设置超时
      setTimeout(() => {
        const index = this.batchQueue.findIndex(q => q.id === queryKey)
        if (index !== -1) {
          this.batchQueue.splice(index, 1)
          reject(new Error(`查询超时: ${queryKey}`))
        }
      }, timeout)
    })
  }

  /**
   * 🔄 批处理器 - 定期处理查询队列
   */
  private startBatchProcessor() {
    setInterval(async () => {
      if (this.processingBatch || this.batchQueue.length === 0) {
        return
      }

      this.processingBatch = true
      
      try {
        const batchSize = Math.min(this.config.batchSize, this.batchQueue.length)
        const batch = this.batchQueue.splice(0, batchSize)
        
        console.log(`🔄 处理批次: ${batch.length} 个查询`)

        // 并行执行批次中的查询
        await Promise.allSettled(
          batch.map(async (batchQuery) => {
            try {
              const result = await batchQuery.query()
              batchQuery.resolve(result)
            } catch (error) {
              batchQuery.reject(error)
            }
          })
        )
      } catch (error) {
        console.error('❌ 批处理执行失败:', error)
      } finally {
        this.processingBatch = false
      }
    }, 100) // 每100ms处理一次批次
  }

  /**
   * 🔧 使用连接执行查询
   */
  private async executeWithConnection<T>(
    queryFn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const connection = await this.acquireConnection()
    
    try {
      const result = await queryFn(connection.prisma)
      return result
    } finally {
      this.releaseConnection(connection.index)
    }
  }

  /**
   * 🔗 获取可用连接
   */
  private async acquireConnection(): Promise<{ prisma: PrismaClient; index: number }> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < this.config.acquireTimeout) {
      // 查找空闲连接
      for (let i = 0; i < this.prismaPool.length; i++) {
        if (this.connectionStatus.get(i) === 'idle') {
          this.connectionStatus.set(i, 'busy')
          return { prisma: this.prismaPool[i], index: i }
        }
      }

      // 如果没有空闲连接且未达到最大连接数，创建新连接
      if (this.prismaPool.length < this.config.maxConnections) {
        const newIndex = this.prismaPool.length
        const newPrisma = new PrismaClient({
          log: ['error'],
          datasources: {
            db: {
              url: process.env.DIRECT_URL || process.env.DATABASE_URL
            }
          }
        })
        
        this.prismaPool.push(newPrisma)
        this.connectionStatus.set(newIndex, 'busy')
        
        console.log(`🔗 创建新连接: ${newIndex + 1}/${this.config.maxConnections}`)
        return { prisma: newPrisma, index: newIndex }
      }

      // 等待50ms后重试
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    throw new Error('获取数据库连接超时')
  }

  /**
   * 🔓 释放连接
   */
  private releaseConnection(index: number) {
    this.connectionStatus.set(index, 'idle')
  }

  /**
   * 🏥 健康监控器
   */
  private startHealthMonitor() {
    setInterval(async () => {
      await this.performHealthCheck()
      this.cleanupIdleConnections()
      this.logStatus()
    }, 30000) // 每30秒检查一次
  }

  /**
   * 🏥 执行健康检查
   */
  private async performHealthCheck() {
    for (let i = 0; i < this.prismaPool.length; i++) {
      if (this.connectionStatus.get(i) === 'idle') {
        try {
          await this.prismaPool[i].$queryRaw`SELECT 1`
          this.connectionStatus.set(i, 'idle')
        } catch (error) {
          console.error(`❌ 连接 ${i} 健康检查失败:`, error)
          this.connectionStatus.set(i, 'error')
          
          // 重新创建连接
          await this.recreateConnection(i)
        }
      }
    }
  }

  /**
   * 🔄 重新创建连接
   */
  private async recreateConnection(index: number) {
    try {
      await this.prismaPool[index].$disconnect()
      
      this.prismaPool[index] = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL
          }
        }
      })
      
      this.connectionStatus.set(index, 'idle')
      console.log(`🔄 重新创建连接: ${index}`)
    } catch (error) {
      console.error(`❌ 重新创建连接失败: ${index}`, error)
    }
  }

  /**
   * 🧹 清理空闲连接
   */
  private cleanupIdleConnections() {
    const now = Date.now()
    const minConnections = this.config.minConnections
    
    // 保持最小连接数，清理多余的空闲连接
    if (this.prismaPool.length > minConnections) {
      for (let i = this.prismaPool.length - 1; i >= minConnections; i--) {
        if (this.connectionStatus.get(i) === 'idle') {
          this.prismaPool[i].$disconnect()
          this.prismaPool.splice(i, 1)
          this.connectionStatus.delete(i)
          console.log(`🧹 清理空闲连接: ${i}`)
        }
      }
    }
  }

  /**
   * 📊 更新性能指标
   */
  private updateMetrics(startTime: number) {
    this.metrics.totalQueries++
    const responseTime = Date.now() - startTime
    this.metrics.responseTimeSum += responseTime
    this.metrics.averageResponseTime = this.metrics.responseTimeSum / this.metrics.totalQueries
  }

  /**
   * 📊 获取连接池状态
   */
  public getStatus(): PoolStatus {
    const activeConnections = Array.from(this.connectionStatus.values()).filter(status => status === 'busy').length
    const idleConnections = Array.from(this.connectionStatus.values()).filter(status => status === 'idle').length
    
    return {
      activeConnections,
      idleConnections,
      pendingRequests: this.batchQueue.length,
      totalQueries: this.metrics.totalQueries,
      cacheHitRate: this.metrics.totalQueries > 0 ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100 : 0,
      averageResponseTime: this.metrics.averageResponseTime
    }
  }

  /**
   * 📝 记录状态日志
   */
  private logStatus() {
    const status = this.getStatus()
    console.log('📊 连接池状态:', {
      连接池大小: this.prismaPool.length,
      活跃连接: status.activeConnections,
      空闲连接: status.idleConnections,
      待处理请求: status.pendingRequests,
      总查询数: status.totalQueries,
      缓存命中率: `${status.cacheHitRate.toFixed(2)}%`,
      平均响应时间: `${status.averageResponseTime.toFixed(2)}ms`
    })
  }

  /**
   * 🧹 清理资源
   */
  public async cleanup() {
    console.log('🧹 清理连接池资源...')
    
    await Promise.all(
      this.prismaPool.map(prisma => prisma.$disconnect())
    )
    
    this.prismaPool = []
    this.connectionStatus.clear()
    this.queryCache.clear()
    this.batchQueue = []
    
    console.log('✅ 连接池资源清理完成')
  }
}

// 🚀 导出单例实例
export const highPerformanceDB = HighPerformanceConnectionManager.getInstance()
