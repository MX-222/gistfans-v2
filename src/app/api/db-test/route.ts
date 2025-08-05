import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'

/**
 * 数据库测试API - 简单的数据库连接测试
 * 用于验证Prisma连接状态
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 数据库测试API被调用')
    
    const startTime = Date.now()
    
    // 简单的数据库查询
    const result = await prisma.$queryRaw`SELECT 1 as test, now() as current_time`
    
    const responseTime = Date.now() - startTime
    
    // 获取帖子数量
    const postCount = await prisma.post.count()
    
    const response = {
      status: 'success',
      database: {
        connected: true,
        response_time_ms: responseTime,
        test_query: result,
        post_count: postCount
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    console.log('✅ 数据库测试成功:', response)
    
    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error)
    
    const response = {
      status: 'error',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    return NextResponse.json(response, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
