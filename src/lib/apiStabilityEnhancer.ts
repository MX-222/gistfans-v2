/**
 * API稳定性增强器
 * 专门解决数据库连接池不稳定和API调用成功率低的问题
 *
 * ⚠️ 仅在服务端使用 - 不能在客户端执行
 */

// 🔒 服务端检查 - 防止在客户端执行
if (typeof window !== 'undefined') {
  throw new Error('apiStabilityEnhancer只能在服务端使用，不能在客户端执行')
}

import { prisma } from '@/lib/database/unified-prisma'

// 连接健康状态缓存
let connectionHealthCache: {
  isHealthy: boolean
  lastCheck: number
  consecutiveFailures: number
} = {
  isHealthy: true,
  lastCheck: 0,
  consecutiveFailures: 0
}

// 健康检查间隔（毫秒）
const HEALTH_CHECK_INTERVAL = 30000 // 30秒
const MAX_CONSECUTIVE_FAILURES = 3

/**
 * 检查数据库连接健康状态
 */
export async function checkConnectionHealth(): Promise<boolean> {
  const now = Date.now()
  
  // 如果最近检查过且状态良好，直接返回缓存结果
  if (connectionHealthCache.isHealthy && 
      (now - connectionHealthCache.lastCheck) < HEALTH_CHECK_INTERVAL) {
    return true
  }

  try {
    // 简单的健康检查查询
    await prisma.$queryRaw`SELECT 1`
    
    connectionHealthCache = {
      isHealthy: true,
      lastCheck: now,
      consecutiveFailures: 0
    }
    
    console.log('✅ 数据库连接健康检查通过')
    return true
  } catch (error) {
    connectionHealthCache.consecutiveFailures++
    connectionHealthCache.lastCheck = now
    connectionHealthCache.isHealthy = connectionHealthCache.consecutiveFailures < MAX_CONSECUTIVE_FAILURES
    
    console.error(`❌ 数据库连接健康检查失败 (${connectionHealthCache.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error)
    return false
  }
}

/**
 * 智能API执行器 - 带连接池优化
 */
export async function executeWithStability<T>(
  operation: () => Promise<T>,
  operationName: string = 'API操作',
  options: {
    maxRetries?: number
    baseDelay?: number
    useHealthCheck?: boolean
    fallbackValue?: T
  } = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 500,
    useHealthCheck = true,
    fallbackValue
  } = options

  // 预检查连接健康状态
  if (useHealthCheck) {
    const isHealthy = await checkConnectionHealth()
    if (!isHealthy) {
      console.warn(`⚠️ ${operationName}: 数据库连接不健康，尝试恢复...`)
      
      // 尝试重新连接
      try {
        await prisma.$disconnect()
        await new Promise(resolve => setTimeout(resolve, 1000))
        await prisma.$connect()
        console.log('🔄 数据库连接已重新建立')
      } catch (reconnectError) {
        console.error('❌ 数据库重连失败:', reconnectError)
        if (fallbackValue !== undefined) {
          console.log('🔄 使用降级数据')
          return fallbackValue
        }
      }
    }
  }

  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🚀 ${operationName} - 尝试 ${attempt + 1}/${maxRetries}`)
      const result = await operation()
      
      if (attempt > 0) {
        console.log(`✅ ${operationName} - 重试成功`)
      }
      
      return result
    } catch (error) {
      lastError = error
      console.error(`❌ ${operationName} - 尝试 ${attempt + 1} 失败:`, error)
      
      // 分析错误类型
      const isConnectionError = isConnectionRelatedError(error)
      const isTimeoutError = isTimeoutRelatedError(error)
      
      if (attempt < maxRetries - 1) {
        // 计算等待时间
        let waitTime = baseDelay * Math.pow(2, attempt)
        
        if (isConnectionError) {
          // 连接错误：更长的等待时间
          waitTime = Math.min(waitTime * 2, 10000) // 最大10秒
          
          // 尝试重置连接
          try {
            console.log('🔄 重置数据库连接...')
            await prisma.$disconnect()
            await new Promise(resolve => setTimeout(resolve, 500))
            await prisma.$connect()
          } catch (resetError) {
            console.warn('⚠️ 连接重置失败:', resetError)
          }
        } else if (isTimeoutError) {
          // 超时错误：中等等待时间
          waitTime = Math.min(waitTime * 1.5, 5000) // 最大5秒
        } else {
          // 其他错误：标准等待时间
          waitTime = Math.min(waitTime, 3000) // 最大3秒
        }
        
        console.log(`⏳ ${operationName} - 等待 ${waitTime}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  // 所有重试都失败了
  console.error(`💥 ${operationName} - 所有重试都失败了`)
  
  // 如果有降级值，使用降级值
  if (fallbackValue !== undefined) {
    console.log(`🔄 ${operationName} - 使用降级数据`)
    return fallbackValue
  }
  
  throw lastError
}

/**
 * 检查是否为连接相关错误
 */
function isConnectionRelatedError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString() || ''
  const errorCode = error.code || ''
  
  return (
    errorCode === 'P1001' ||
    errorMessage.includes('Max client connections reached') ||
    errorMessage.includes('too many clients already') ||
    errorMessage.includes('Connection terminated') ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('connection pool')
  )
}

/**
 * 检查是否为超时相关错误
 */
function isTimeoutRelatedError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString() || ''
  const errorCode = error.code || ''
  
  return (
    errorCode === 'P2024' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('Query timeout') ||
    errorMessage.includes('Connection timeout')
  )
}

/**
 * 获取连接池状态摘要
 */
export function getConnectionStatus() {
  return {
    isHealthy: connectionHealthCache.isHealthy,
    lastCheck: new Date(connectionHealthCache.lastCheck).toISOString(),
    consecutiveFailures: connectionHealthCache.consecutiveFailures,
    maxFailures: MAX_CONSECUTIVE_FAILURES
  }
}

/**
 * 强制重置连接健康状态
 */
export function resetConnectionHealth() {
  connectionHealthCache = {
    isHealthy: true,
    lastCheck: 0,
    consecutiveFailures: 0
  }
  console.log('🔄 连接健康状态已重置')
}
