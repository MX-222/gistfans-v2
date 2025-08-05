import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess } from '@/lib/admin-auth'
import { prisma, getConnectionHealth, getConnectionMetrics } from '@/lib/database/unified-prisma'

/**
 * GistFans Production Connection Pool Management API - Simplified
 * Basic monitoring without complex diagnostics
 */

// GET /api/admin/connection-pool - 获取连接池状态
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: '权限不足，仅限管理员访问' },
        { status: 403 }
      )
    }

    console.log('🔍 Connection Pool Status Check - Simplified')

    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        const health = await getConnectionHealth()
        return NextResponse.json({
          success: true,
          data: health
        })

      case 'metrics':
        const metrics = await getConnectionMetrics()
        return NextResponse.json({
          success: true,
          data: metrics
        })

      case 'health':
        const poolStatus = await getConnectionHealth()
        return NextResponse.json({
          success: true,
          data: {
            isHealthy: poolStatus.healthy,
            status: poolStatus.status,
            message: poolStatus.healthy 
              ? '连接池状态正常'
              : '连接池状态异常'
          }
        })

      case 'full':
      default:
        // 获取完整状态
        const fullHealth = await getConnectionHealth()
        const fullMetrics = await getConnectionMetrics()

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          version: 'v6.0-simplified',
          connectionPool: {
            health: fullHealth,
            metrics: fullMetrics,
            config: {
              databaseUrl: process.env.DATABASE_URL?.replace(/password=[^&]+/, 'password=***'),
              directUrl: process.env.DIRECT_URL?.replace(/password=[^&]+/, 'password=***'),
              nodeEnv: process.env.NODE_ENV
            }
          }
        })
    }

  } catch (error) {
    console.error('❌ Connection Pool API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST /api/admin/connection-pool - 连接池管理操作
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: '权限不足，仅限管理员访问' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'health_check'

    console.log(`🔧 Connection Pool Management - Action: ${action}`)

    switch (action) {
      case 'health_check':
        const healthStatus = await getConnectionHealth()
        console.log('🔍 连接池健康检查')

        return NextResponse.json({
          success: true,
          message: '健康检查完成',
          data: healthStatus,
          timestamp: new Date().toISOString()
        })

      case 'force_shutdown':
        // 优雅关闭连接池（谨慎使用）
        console.log('🛑 强制关闭连接池')
        await prisma.$disconnect()

        return NextResponse.json({
          success: true,
          message: '连接池已关闭',
          warning: '请重启应用程序以恢复正常服务',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: '无效的操作类型' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Connection Pool Management Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
