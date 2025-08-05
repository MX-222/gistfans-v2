import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

/**
 * 增强的健康检查API
 * 包含数据库连接检查和系统状态监控
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🏥 健康检查API被调用')

    // 1. 数据库连接检查
    let dbStatus = 'unknown'
    let dbLatency = 0
    let dbError = null

    try {
      const dbStartTime = Date.now()

      // 创建一个新的Prisma客户端实例专门用于健康检查
      // 优先使用DIRECT_URL，因为它是直连，更稳定
      const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
      console.log('🔍 使用数据库URL:', dbUrl?.substring(0, 50) + '...')

      const healthCheckPrisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl
          }
        }
      })

      try {
        // 使用简单的表查询
        await healthCheckPrisma.user.findFirst({
          select: { id: true },
          take: 1
        })
        dbLatency = Date.now() - dbStartTime
        dbStatus = 'healthy'
        console.log('✅ 数据库连接正常, 延迟:', dbLatency, 'ms')
      } finally {
        // 确保断开连接
        await healthCheckPrisma.$disconnect()
      }
    } catch (error) {
      dbStatus = 'error'
      dbError = error instanceof Error ? error.message : 'Unknown database error'
      console.error('❌ 数据库连接失败:', dbError)
    }

    const totalLatency = Date.now() - startTime
    const overallHealth = dbStatus === 'healthy' ? 'healthy' : 'degraded'

    const response = {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      latency: {
        total: totalLatency,
        database: dbLatency
      },
      environment: process.env.NODE_ENV || 'unknown',
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown'
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
        error: dbError,
        url_configured: !!process.env.DATABASE_URL,
        direct_url_configured: !!process.env.DIRECT_URL
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        memoryUsage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    }

    console.log('✅ 健康检查完成:', overallHealth, '总延迟:', totalLatency, 'ms')

    const statusCode = overallHealth === 'healthy' ? 200 : 503

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ 健康检查失败:', error)

    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      latency: {
        total: Date.now() - startTime,
        database: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'error',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

/**
 * 简化的健康检查端点（HEAD请求）
 * 仅返回状态码，用于快速检查
 */
export async function HEAD(_request: NextRequest) {
  try {
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
    const healthCheckPrisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      }
    })

    try {
      await healthCheckPrisma.user.findFirst({
        select: { id: true },
        take: 1
      })
      return new NextResponse(null, { status: 200 })
    } finally {
      await healthCheckPrisma.$disconnect()
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
