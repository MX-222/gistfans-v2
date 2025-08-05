/**
 * GistFans Pro 连接池管理 API
 * 提供完整的连接池监控和管理功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    
    // const connectionManager = getProConnectionManager() // 已删除，使用统一连接池
    const connectionManager = { getStats: () => ({ message: "使用统一连接池" }) }
    
    console.log(`🔧 Pro Connection Pool API - Action: ${action}`)

    switch (action) {
      case 'status':
        return handleStatus(connectionManager)
      
      case 'health':
        return await handleHealth(connectionManager)
      
      case 'cleanup':
        return await handleCleanup(connectionManager, searchParams)
      
      case 'emergency':
        return await handleEmergency(connectionManager)
      
      case 'auto':
        return await handleAutoManage(connectionManager)
      
      case 'monitor':
        return await handleMonitor(connectionManager)
      
      default:
        return NextResponse.json(
          { 
            error: 'Invalid action', 
            availableActions: ['status', 'health', 'cleanup', 'emergency', 'auto', 'monitor']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Pro Connection Pool API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取连接管理器状态
 */
function handleStatus(connectionManager: any) {
  const status = connectionManager.getStatus()
  
  return NextResponse.json({
    success: true,
    action: 'status',
    data: status,
    timestamp: new Date().toISOString()
  })
}

/**
 * 获取连接池健康状态
 */
async function handleHealth(connectionManager: any) {
  try {
    const health = await connectionManager.getConnectionHealth()
    
    return NextResponse.json({
      success: true,
      action: 'health',
      data: health,
      recommendations: generateRecommendations(health),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      action: 'health',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 执行连接清理
 */
async function handleCleanup(connectionManager: any, searchParams: URLSearchParams) {
  try {
    const idleThreshold = parseInt(searchParams.get('idle_threshold') || '15')
    const maxTerminations = parseInt(searchParams.get('max_terminations') || '10')
    
    const result = await connectionManager.cleanupConnections(idleThreshold, maxTerminations)
    
    return NextResponse.json({
      success: true,
      action: 'cleanup',
      data: result,
      parameters: {
        idleThreshold,
        maxTerminations
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      action: 'cleanup',
      error: error instanceof Error ? error.message : 'Cleanup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 执行紧急重置
 */
async function handleEmergency(connectionManager: any) {
  try {
    const result = await connectionManager.emergencyReset()
    
    return NextResponse.json({
      success: true,
      action: 'emergency',
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      action: 'emergency',
      error: error instanceof Error ? error.message : 'Emergency reset failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 执行自动管理
 */
async function handleAutoManage(connectionManager: any) {
  try {
    const result = await connectionManager.autoManage()
    
    return NextResponse.json({
      success: true,
      action: 'auto_manage',
      data: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      action: 'auto_manage',
      error: error instanceof Error ? error.message : 'Auto management failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 执行连接监控
 */
async function handleMonitor(connectionManager: any) {
  try {
    // 获取健康状态
    const health = await connectionManager.getConnectionHealth()
    
    // 获取管理器状态
    const status = connectionManager.getStatus()
    
    // 组合监控数据
    const monitorData = {
      health,
      manager: status,
      alerts: generateAlerts(health),
      recommendations: generateRecommendations(health)
    }
    
    return NextResponse.json({
      success: true,
      action: 'monitor',
      data: monitorData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      action: 'monitor',
      error: error instanceof Error ? error.message : 'Monitoring failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 生成告警信息
 */
function generateAlerts(health: any): string[] {
  const alerts = []
  
  if (health.status === 'CRITICAL') {
    alerts.push('🚨 CRITICAL: Connection pool in critical state')
  }
  
  if (health.utilizationPercentage > 90) {
    alerts.push(`🔥 HIGH UTILIZATION: ${health.utilizationPercentage}% of connections in use`)
  }
  
  if (health.zombieConnections > 20) {
    alerts.push(`🧟 ZOMBIE ALERT: ${health.zombieConnections} zombie connections detected`)
  }
  
  if (health.status === 'WARNING') {
    alerts.push('⚠️ WARNING: Connection pool requires attention')
  }
  
  return alerts
}

/**
 * 生成建议
 */
function generateRecommendations(health: any): string[] {
  const recommendations = []
  
  if (health.status === 'CRITICAL' || health.utilizationPercentage > 90) {
    recommendations.push('Execute emergency reset immediately')
    recommendations.push('Check application for connection leaks')
    recommendations.push('Consider scaling database resources')
  } else if (health.status === 'CLEANUP_NEEDED' || health.zombieConnections > 10) {
    recommendations.push('Run connection cleanup')
    recommendations.push('Review connection timeout settings')
  } else if (health.status === 'WARNING' || health.utilizationPercentage > 80) {
    recommendations.push('Monitor closely')
    recommendations.push('Prepare for potential cleanup')
  } else {
    recommendations.push('Connection pool is healthy')
    recommendations.push('Continue normal monitoring')
  }
  
  // 添加优化建议
  if (health.idleConnections > health.activeConnections * 2) {
    recommendations.push('Consider reducing connection pool size')
  }
  
  if (health.activeConnections > health.maxConnections * 0.8) {
    recommendations.push('Consider increasing connection pool size')
  }
  
  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, parameters = {} } = body
    
    // const connectionManager = getProConnectionManager() // 已删除，使用统一连接池
    const connectionManager = { getStats: () => ({ message: "使用统一连接池" }) }
    
    console.log(`🔧 Pro Connection Pool API POST - Action: ${action}`)

    switch (action) {
      case 'cleanup':
        // const cleanupResult = await connectionManager.cleanupConnections( // 已删除
        const cleanupResult = { message: "使用统一连接池，无需清理" }
        return NextResponse.json({
          success: true,
          action: 'cleanup',
          data: cleanupResult,
          timestamp: new Date().toISOString()
        })
      
      case 'emergency':
        // const emergencyResult = await connectionManager.emergencyReset() // 已删除
        const emergencyResult = { message: "使用统一连接池，无需重置" }
        return NextResponse.json({
          success: true,
          action: 'emergency',
          data: emergencyResult,
          timestamp: new Date().toISOString()
        })
      
      case 'configure':
        // 这里可以添加动态配置更新功能
        return NextResponse.json({
          success: false,
          error: 'Configuration updates not implemented yet',
          timestamp: new Date().toISOString()
        }, { status: 501 })
      
      default:
        return NextResponse.json({
          error: 'Invalid POST action',
          availableActions: ['cleanup', 'emergency', 'configure']
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Pro Connection Pool API POST Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
