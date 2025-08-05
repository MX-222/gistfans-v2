import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService } from '@/lib/starService'
import { starCacheManager } from '@/lib/starCache'
import { prisma } from '@/lib/database/unified-prisma'

interface VoteStarRequest {
  postId: string
  toUserId: string
  amount: number
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Star投票API - 未授权访问')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 解析请求体
    const body: VoteStarRequest = await request.json()
    const { postId, toUserId, amount } = body

    console.log('🌟 Star投票API请求:', {
      fromUserId: session.user.id,
      postId,
      toUserId,
      amount,
      userEmail: session.user.email
    })

    // 验证必需参数
    if (!postId || !toUserId || !amount) {
      console.log('❌ Star投票API - 缺少必需参数:', { postId, toUserId, amount })
      return NextResponse.json({
        success: false,
        error: 'postId、toUserId和amount参数是必需的'
      }, { status: 400 })
    }

    // 验证amount参数
    if (amount < 1 || amount > 10) {
      console.log('❌ Star投票API - amount参数无效:', amount)
      return NextResponse.json({
        success: false,
        error: 'Star数量必须在1-10之间'
      }, { status: 400 })
    }

    // 不能给自己投Star
    if (session.user.id === toUserId) {
      console.log('❌ Star投票API - 不能给自己投Star')
      return NextResponse.json({
        success: false,
        error: '不能为自己的帖子投Star'
      }, { status: 400 })
    }

    // 验证帖子是否存在
    const post = await prisma.post.findUnique({
      where: { id: postId.toString() }
    })

    if (!post) {
      console.log('❌ Star投票API - 帖子不存在:', postId)
      return NextResponse.json({
        success: false,
        error: '帖子不存在'
      }, { status: 404 })
    }

    // 投Star
    const result = await starService.voteStarForPost(
      session.user.id,
      toUserId,
      postId.toString(),
      amount
    )

    if (!result.success) {
      console.log('❌ Star投票服务失败:', result.message)
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }

    // 获取更新后的余额和帖子Star统计 - 使用缓存优化性能
    const [balance, postStats] = await Promise.all([
      starService.getBalance(session.user.id),
      starCacheManager.getStarStats(postId.toString(), starService)
    ])

    console.log('✅ Star投票成功:', {
      voted: amount,
      newBalance: balance.availableStars,
      postStats
    })

    return NextResponse.json({
      success: true,
      data: {
        voted: amount,
        balance: balance,
        postStats: postStats
      },
      message: result.message
    })

  } catch (error) {
    console.error('❌ Star投票API失败:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '投Star失败'
    }, { status: 500 })
  }
}

// 获取帖子的Star统计
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    
    if (!postId) {
      return NextResponse.json({
        success: false,
        error: 'postId参数是必需的'
      }, { status: 400 })
    }

    // 获取帖子Star统计 - 使用缓存优化性能
    const postStats = await starCacheManager.getStarStats(postId, starService)

    return NextResponse.json({
      success: true,
      data: postStats,
      message: '帖子Star统计获取成功'
    })

  } catch (error) {
    console.error('获取帖子Star统计失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取帖子Star统计失败'
    }, { status: 500 })
  }
} 