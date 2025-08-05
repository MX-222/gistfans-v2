/**
 * Supabase Pro连接池管理器
 * 专门解决连接池常年耗尽的问题
 *
 * ⚠️ 仅在服务端使用 - 不能在客户端执行
 */

import { PrismaClient } from '@prisma/client'

// 🔒 服务端检查 - 防止在客户端执行
if (typeof window !== 'undefined') {
  throw new Error('connectionPoolManager只能在服务端使用，不能在客户端执行')
}

// Supabase Pro连接池配置
const SUPABASE_PRO_CONFIG = {
  // Supabase Pro版本连接限制
  maxConnections: 200,        // Pro版本最大连接数
  minConnections: 5,          // 最小保持连接数
  maxIdleTime: 30000,         // 30秒空闲超时
  connectionTimeout: 10000,   // 10秒连接超时
  acquireTimeout: 8000,       // 8秒获取连接超时
  
  // 连接池健康监控
  healthCheckInterval: 15000, // 15秒健康检查
  maxRetries: 3,              // 最大重试次数
  retryDelay: 1000           // 重试延迟
}

// 全局连接池状态
let globalPrisma: PrismaClient | null = null
let connectionCount = 0
let lastHealthCheck = 0
let isShuttingDown = false

// 连接池统计
const poolStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  failedConnections: 0,
  lastResetTime: Date.now()
}

/**
 * 创建优化的Prisma客户端实例
 */
function createOptimizedPrismaClient(): PrismaClient {
  console.log('🔧 创建优化的Prisma客户端 (Supabase Pro配置)')
  
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    
    // 🔧 Supabase Pro优化配置
    __internal: {
      engine: {
        // 连接池配置
        connection_limit: SUPABASE_PRO_CONFIG.maxConnections,
        pool_timeout: SUPABASE_PRO_CONFIG.acquireTimeout,
        
        // 连接超时配置
        connect_timeout: SUPABASE_PRO_CONFIG.connectionTimeout,
        socket_timeout: 60000, // 60秒socket超时
        
        // 优化查询性能
        statement_cache_size: 500,
        prepared_statement_cache_size: 100
      }
    }
  } as any)
}

/**
 * 获取或创建全局Prisma实例
 */
export function getOptimizedPrismaClient(): PrismaClient {
  if (isShuttingDown) {
    throw new Error('数据库连接池正在关闭中')
  }

  if (!globalPrisma) {
    globalPrisma = createOptimizedPrismaClient()
    
    // 连接事件监听 - 暂时注释掉，因为TypeScript类型问题
    // globalPrisma.$on('beforeExit' as any, () => {
    //   console.log('🔄 Prisma客户端即将退出')
    //   connectionCount = Math.max(0, connectionCount - 1)
    //   poolStats.activeConnections = Math.max(0, poolStats.activeConnections - 1)
    // })

    console.log('✅ 全局Prisma客户端已创建')
  }

  connectionCount++
  poolStats.totalConnections++
  poolStats.activeConnections++
  
  return globalPrisma
}

/**
 * 执行数据库操作 - 带连接池优化
 */
export async function executeWithConnectionPool<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  operationName: string = '数据库操作'
): Promise<T> {
  const startTime = Date.now()
  let prisma: PrismaClient | null = null
  
  try {
    // 检查连接池健康状态
    await ensureConnectionPoolHealth()
    
    // 获取连接
    prisma = getOptimizedPrismaClient()
    
    console.log(`🚀 ${operationName} - 开始执行 (活跃连接: ${poolStats.activeConnections})`)
    
    // 执行操作
    const result = await operation(prisma)
    
    const duration = Date.now() - startTime
    console.log(`✅ ${operationName} - 执行成功 (耗时: ${duration}ms)`)
    
    return result
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`❌ ${operationName} - 执行失败 (耗时: ${duration}ms):`, error)
    
    poolStats.failedConnections++
    
    // 分析错误类型
    if (isConnectionPoolError(error)) {
      console.warn('🔄 检测到连接池问题，尝试重置连接池...')
      await resetConnectionPool()
    }
    
    throw error
    
  } finally {
    // 更新连接统计
    poolStats.activeConnections = Math.max(0, poolStats.activeConnections - 1)
    poolStats.idleConnections = poolStats.totalConnections - poolStats.activeConnections
  }
}

/**
 * 确保连接池健康状态
 */
async function ensureConnectionPoolHealth(): Promise<void> {
  const now = Date.now()
  
  // 如果最近检查过，跳过
  if (now - lastHealthCheck < SUPABASE_PRO_CONFIG.healthCheckInterval) {
    return
  }
  
  lastHealthCheck = now
  
  try {
    if (globalPrisma) {
      // 简单的健康检查
      await globalPrisma.$queryRaw`SELECT 1 as health_check`
      console.log('✅ 连接池健康检查通过')
    }
  } catch (error) {
    console.error('❌ 连接池健康检查失败:', error)
    
    // 如果健康检查失败，重置连接池
    await resetConnectionPool()
  }
}

/**
 * 重置连接池
 */
async function resetConnectionPool(): Promise<void> {
  console.log('🔄 重置连接池...')
  
  try {
    if (globalPrisma) {
      await globalPrisma.$disconnect()
      globalPrisma = null
    }
    
    // 重置统计
    connectionCount = 0
    poolStats.activeConnections = 0
    poolStats.idleConnections = 0
    poolStats.lastResetTime = Date.now()
    
    // 短暂等待
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重新创建连接
    globalPrisma = createOptimizedPrismaClient()
    await globalPrisma.$connect()
    
    console.log('✅ 连接池重置完成')
    
  } catch (error) {
    console.error('❌ 连接池重置失败:', error)
    globalPrisma = null
  }
}

/**
 * 检查是否为连接池相关错误
 */
function isConnectionPoolError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString() || ''
  const errorCode = error.code || ''
  
  return (
    errorCode === 'P1001' ||
    errorCode === 'P2024' ||
    errorMessage.includes('Max client connections reached') ||
    errorMessage.includes('too many clients already') ||
    errorMessage.includes('Connection terminated') ||
    errorMessage.includes('connection pool') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('timeout')
  )
}

/**
 * 获取连接池状态
 */
export function getConnectionPoolStatus() {
  return {
    ...poolStats,
    currentConnections: connectionCount,
    maxConnections: SUPABASE_PRO_CONFIG.maxConnections,
    healthCheckInterval: SUPABASE_PRO_CONFIG.healthCheckInterval,
    lastHealthCheck: new Date(lastHealthCheck).toISOString(),
    lastResetTime: new Date(poolStats.lastResetTime).toISOString(),
    isShuttingDown
  }
}

/**
 * 优雅关闭连接池
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('🔄 开始优雅关闭连接池...')
  isShuttingDown = true
  
  try {
    if (globalPrisma) {
      await globalPrisma.$disconnect()
      globalPrisma = null
    }
    
    console.log('✅ 连接池已优雅关闭')
  } catch (error) {
    console.error('❌ 连接池关闭失败:', error)
  }
}

// 进程退出时自动清理
if (typeof process !== 'undefined') {
  process.on('beforeExit', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
}
