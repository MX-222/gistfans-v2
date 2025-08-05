import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService } from '@/lib/starService'
import { starCacheManager, starStatsCache } from '@/lib/starCache'
import { commentsApi } from '@/lib/apiClient'

// 性能测试API - 验证优化效果
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type') || 'all'
    const postId = searchParams.get('postId') || 'cmd8ked1q000i53lk3wvry3y0'

    const results: any = {
      timestamp: new Date().toISOString(),
      testType,
      postId,
      tests: {}
    }

    // 测试1：Star统计查询性能
    if (testType === 'all' || testType === 'star') {
      console.log('🧪 开始Star统计性能测试...')
      
      // 清除缓存，测试数据库查询性能
      starStatsCache.clearPostCache(postId)
      
      const dbStart = Date.now()
      const dbStats = await starService.getPostStarVotes(postId, false)
      const dbTime = Date.now() - dbStart
      
      // 测试缓存性能
      const cacheStart = Date.now()
      const cacheStats = await starCacheManager.getStarStats(postId, starService)
      const cacheTime = Date.now() - cacheStart
      
      // 再次测试缓存命中
      const cache2Start = Date.now()
      const cache2Stats = await starCacheManager.getStarStats(postId, starService)
      const cache2Time = Date.now() - cache2Start
      
      results.tests.starStats = {
        database: {
          time: dbTime,
          stats: dbStats
        },
        cacheFirst: {
          time: cacheTime,
          stats: cacheStats
        },
        cacheHit: {
          time: cache2Time,
          stats: cache2Stats
        },
        improvement: {
          dbVsCache: `${((dbTime - cache2Time) / dbTime * 100).toFixed(1)}%`,
          speedup: `${(dbTime / cache2Time).toFixed(1)}x`
        }
      }
    }

    // 测试2：批量Star统计性能
    if (testType === 'all' || testType === 'batch') {
      console.log('🧪 开始批量Star统计性能测试...')
      
      const testPostIds = [postId, '1', '2', '3']
      
      // 单个查询性能
      const singleStart = Date.now()
      const singleResults = []
      for (const id of testPostIds) {
        const stats = await starService.getPostStarVotes(id, false)
        singleResults.push({ postId: id, ...stats })
      }
      const singleTime = Date.now() - singleStart
      
      // 批量查询性能
      const batchStart = Date.now()
      const batchResults = await starService.getBatchPostStarVotes(testPostIds)
      const batchTime = Date.now() - batchStart
      
      results.tests.batchStats = {
        single: {
          time: singleTime,
          count: testPostIds.length,
          avgTime: singleTime / testPostIds.length,
          results: singleResults
        },
        batch: {
          time: batchTime,
          count: testPostIds.length,
          avgTime: batchTime / testPostIds.length,
          results: Array.from(batchResults.entries()).map(([postId, stats]) => ({ postId, ...stats }))
        },
        improvement: {
          timeReduction: `${((singleTime - batchTime) / singleTime * 100).toFixed(1)}%`,
          speedup: `${(singleTime / batchTime).toFixed(1)}x`
        }
      }
    }

    // 测试3：缓存统计信息
    if (testType === 'all' || testType === 'cache') {
      console.log('🧪 获取缓存统计信息...')
      
      results.tests.cacheStats = starCacheManager.getCacheStats()
    }

    // 测试4：API响应时间
    if (testType === 'all' || testType === 'api') {
      console.log('🧪 开始API响应时间测试...')
      
      const apiStart = Date.now()
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/stars/vote?postId=${postId}`, {
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        })
        const apiData = await response.json()
        const apiTime = Date.now() - apiStart
        
        results.tests.apiResponse = {
          time: apiTime,
          status: response.status,
          success: apiData.success,
          data: apiData.data
        }
      } catch (error) {
        results.tests.apiResponse = {
          time: Date.now() - apiStart,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // 性能评估
    const evaluation = {
      overall: 'GOOD' as 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT',
      recommendations: [] as string[]
    }

    if (results.tests.starStats) {
      const dbTime = results.tests.starStats.database.time
      const cacheTime = results.tests.starStats.cacheHit.time
      
      if (dbTime > 2000) {
        evaluation.overall = 'NEEDS_IMPROVEMENT'
        evaluation.recommendations.push('数据库查询时间超过2秒，建议优化查询或增加索引')
      }
      
      if (cacheTime > 100) {
        evaluation.overall = 'FAIR'
        evaluation.recommendations.push('缓存响应时间超过100ms，建议优化缓存机制')
      }
      
      if (dbTime / cacheTime < 5) {
        evaluation.recommendations.push('缓存性能提升不明显，建议检查缓存实现')
      }
    }

    if (results.tests.apiResponse) {
      const apiTime = results.tests.apiResponse.time
      
      if (apiTime > 2000) {
        evaluation.overall = 'NEEDS_IMPROVEMENT'
        evaluation.recommendations.push('API响应时间超过2秒，未达到优化目标')
      } else if (apiTime <= 1000) {
        evaluation.recommendations.push('API响应时间优秀，已达到优化目标')
      }
    }

    if (evaluation.recommendations.length === 0) {
      evaluation.recommendations.push('性能表现良好，所有指标都在预期范围内')
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        evaluation
      },
      message: '性能测试完成'
    })

  } catch (error) {
    console.error('性能测试失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '性能测试失败'
    }, { status: 500 })
  }
}
