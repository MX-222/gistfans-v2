/**
 * 连接池状态监控API
 * 专门用于监控Supabase Pro连接池的健康状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConnectionPoolStatus } from '@/lib/database/connectionPoolManager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 🔒 权限检查：只有管理员可以查看连接池状态
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 简单的管理员检查（可以根据需要调整）
    const isAdmin = session.user.email === 'admin@gistfans.com' || 
                   session.user.email?.endsWith('@gistfans.com')
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    // 🔍 获取连接池状态
    const poolStatus = getConnectionPoolStatus()
    
    // 🔧 计算健康度指标
    const healthMetrics = {
      connectionUtilization: poolStatus.maxConnections > 0 
        ? (poolStatus.currentConnections / poolStatus.maxConnections * 100).toFixed(2) + '%'
        : '0%',
      
      failureRate: poolStatus.totalConnections > 0
        ? (poolStatus.failedConnections / poolStatus.totalConnections * 100).toFixed(2) + '%'
        : '0%',
      
      averageConnectionsPerMinute: poolStatus.totalConnections > 0
        ? Math.round(poolStatus.totalConnections / ((Date.now() - new Date(poolStatus.lastResetTime).getTime()) / 60000))
        : 0,
      
      healthStatus: getHealthStatus(poolStatus)
    }

    // 📊 返回详细状态
    return NextResponse.json({
      success: true,
      data: {
        // 基础状态
        ...poolStatus,
        
        // 健康度指标
        healthMetrics,
        
        // 系统信息
        systemInfo: {
          nodeEnv: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        },
        
        // 建议和警告
        recommendations: getRecommendations(poolStatus, healthMetrics)
      }
    })

  } catch (error) {
    console.error('❌ 获取连接池状态失败:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '获取连接池状态失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * 计算健康状态
 */
function getHealthStatus(poolStatus: any): string {
  const utilizationRate = poolStatus.maxConnections > 0 
    ? poolStatus.currentConnections / poolStatus.maxConnections 
    : 0
  
  const failureRate = poolStatus.totalConnections > 0
    ? poolStatus.failedConnections / poolStatus.totalConnections
    : 0

  if (poolStatus.isShuttingDown) {
    return '🔄 关闭中'
  } else if (failureRate > 0.1) {
    return '❌ 不健康'
  } else if (utilizationRate > 0.8) {
    return '⚠️ 高负载'
  } else if (utilizationRate > 0.5) {
    return '🟡 中等负载'
  } else {
    return '✅ 健康'
  }
}

/**
 * 生成建议和警告
 */
function getRecommendations(poolStatus: any, healthMetrics: any): string[] {
  const recommendations: string[] = []
  
  // 连接利用率检查
  const utilizationRate = poolStatus.maxConnections > 0 
    ? poolStatus.currentConnections / poolStatus.maxConnections 
    : 0
  
  if (utilizationRate > 0.8) {
    recommendations.push('⚠️ 连接池利用率过高，考虑增加最大连接数或优化查询')
  }
  
  // 失败率检查
  const failureRate = poolStatus.totalConnections > 0
    ? poolStatus.failedConnections / poolStatus.totalConnections
    : 0
  
  if (failureRate > 0.05) {
    recommendations.push('❌ 连接失败率过高，检查数据库连接配置和网络状况')
  }
  
  // 活跃连接检查
  if (poolStatus.activeConnections > poolStatus.maxConnections * 0.9) {
    recommendations.push('🔄 活跃连接数接近上限，可能存在连接泄漏')
  }
  
  // 健康检查间隔
  const timeSinceLastCheck = Date.now() - new Date(poolStatus.lastHealthCheck).getTime()
  if (timeSinceLastCheck > 60000) {
    recommendations.push('⏰ 健康检查间隔过长，可能存在监控问题')
  }
  
  // 重置频率检查
  const timeSinceReset = Date.now() - new Date(poolStatus.lastResetTime).getTime()
  if (timeSinceReset < 300000) { // 5分钟内重置过
    recommendations.push('🔄 连接池最近被重置，可能存在稳定性问题')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 连接池运行状态良好')
  }
  
  return recommendations
}

// 🔧 支持CORS（如果需要从前端访问）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
