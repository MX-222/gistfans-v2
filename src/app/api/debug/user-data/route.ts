import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

/**
 * 调试API：检查用户的实际数据库数据
 * 用于诊断数据显示不一致的问题
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 🔧 支持查询特定用户名的数据（用于调试）
    const { searchParams } = new URL(request.url)
    const targetUserName = searchParams.get('username')

    let userId = session.user.id

    // 如果指定了用户名，查找该用户
    if (targetUserName) {
      const targetUser = await prisma.user.findFirst({
        where: { name: targetUserName },
        select: { id: true, name: true }
      })

      if (targetUser) {
        userId = targetUser.id
        console.log(`🔍 调试用户数据 - 通过用户名查找:`, { username: targetUserName, userId })
      } else {
        return NextResponse.json(
          { success: false, error: `用户名 "${targetUserName}" 不存在` },
          { status: 404 }
        )
      }
    }
    console.log('🔍 调试用户数据:', userId)

    // 1. 检查用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true
      }
    })

    // 2. 检查Star余额表
    const starBalance = await prisma.starBalance.findUnique({
      where: { userId }
    })

    // 3. 检查用户发布的帖子
    const posts = await prisma.post.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // 4. 检查用户收到的Star投票
    const receivedVotes = await prisma.starVote.findMany({
      where: {
        post: {
          authorId: userId
        }
      },
      select: {
        id: true,
        amount: true,
        fromUserId: true,
        postId: true,
        createdAt: true,
        post: {
          select: {
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 5. 检查用户投出的Star投票
    const givenVotes = await prisma.starVote.findMany({
      where: { fromUserId: userId },
      select: {
        id: true,
        amount: true,
        postId: true,
        createdAt: true,
        post: {
          select: {
            title: true,
            authorId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 6. 统计数据
    const stats = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'PUBLISHED').length,
      draftPosts: posts.filter(p => p.status === 'DRAFT').length,
      totalReceivedVotes: receivedVotes.length,
      totalReceivedStars: receivedVotes.reduce((sum, vote) => sum + vote.amount, 0),
      totalGivenVotes: givenVotes.length,
      totalGivenStars: givenVotes.reduce((sum, vote) => sum + vote.amount, 0)
    }

    const debugData = {
      user,
      starBalance,
      posts: posts.slice(0, 5), // 只返回前5个帖子
      receivedVotes: receivedVotes.slice(0, 10), // 只返回前10个投票
      givenVotes: givenVotes.slice(0, 10), // 只返回前10个投票
      stats,
      timestamp: new Date().toISOString()
    }

    console.log('📊 用户数据调试结果:', {
      userId,
      starBalance: starBalance ? {
        totalStars: starBalance.totalStars,
        availableStars: starBalance.availableStars
      } : null,
      stats
    })

    return NextResponse.json({
      success: true,
      data: debugData
    })

  } catch (error) {
    console.error('❌ 调试API失败:', error)
    return NextResponse.json(
      { success: false, error: '调试失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
