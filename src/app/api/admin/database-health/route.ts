import { NextResponse } from 'next/server'
import { getConnectionHealth, getConnectionMetrics } from '@/lib/database/unified-prisma'
import { verifyAdminAccess, logAdminAction } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        error: authResult.error || '权限不足'
      }, { status: 403 })
    }

    console.log(`🔐 管理员数据库健康检查 (验证方式: ${authResult.method})`)

    // 记录管理员操作
    if (authResult.adminId) {
      await logAdminAction({
        userId: authResult.adminId,
        action: 'DATABASE_HEALTH_CHECK',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    // 获取连接池状态和性能指标
    const poolStatus = await getConnectionHealth()
    const performanceMetrics = await getConnectionMetrics()

    // 生成详细报告
    const report = {
      timestamp: new Date().toISOString(),
      connectionPool: {
        status: poolStatus.healthy ? 'active' : 'inactive',
        health: poolStatus,
        performance: performanceMetrics
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      recommendations: {
        immediate: !poolStatus.healthy ? [
          '传统连接管理器已弃用，请升级到 Pro 连接管理器'
        ] : [],
        longTerm: [
          '定期监控连接池使用率',
          '考虑根据用户增长调整连接池配置'
        ]
      }
    }

    // 根据连接池状态设置HTTP状态码
    const statusCode = poolStatus.healthy ? 200 : 500 // 健康状态返回200，否则500

    return NextResponse.json(report, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('数据库健康检查失败:', error)
    
    return NextResponse.json(
      {
        error: '数据库健康检查失败',
        details: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString(),
        health: {
          status: 'critical',
          connectionPool: {
            activeConnections: 0,
            idleConnections: 0,
            totalConnections: 0,
            maxConnections: 20,
            queuedRequests: 0,
            averageQueryTime: 0,
            errorRate: 100,
            timestamp: Date.now()
          },
          recentErrors: [error instanceof Error ? error.message : '未知错误'],
          recommendations: [
            '数据库连接失败，请立即检查',
            '考虑升级Supabase套餐',
            '检查网络连接和防火墙设置'
          ]
        }
      },
      { status: 503 }
    )
  }
}

// 清除监控历史数据
export async function DELETE(request: Request) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        error: authResult.error || '权限不足'
      }, { status: 403 })
    }

    console.log(`🔐 管理员清除监控数据 (验证方式: ${authResult.method})`)

    // 记录管理员操作
    if (authResult.adminId) {
      await logAdminAction({
        userId: authResult.adminId,
        action: 'DATABASE_CLEAR_HISTORY',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    // 清除历史数据
    // databaseMonitor.clearHistory() // 暂时禁用，等待SmartPrismaClient修复

    return NextResponse.json({
      success: true,
      message: '监控历史数据已清除',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('清除监控数据失败:', error)
    
    return NextResponse.json(
      {
        error: '清除监控数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
