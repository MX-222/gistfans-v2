import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 检查用户是否已经为帖子投过Star
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
    const userId = searchParams.get('userId')
    
    if (!postId) {
      return NextResponse.json({
        success: false,
        error: 'postId参数是必需的'
      }, { status: 400 })
    }

    // 检查用户是否已经投过Star
    const existingVote = await prisma.starVote.findUnique({
      where: {
        fromUserId_postId: {
          fromUserId: session.user.id,
          postId: postId.toString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      hasVoted: !!existingVote,
      voteAmount: existingVote?.amount || 0
    })

  } catch (error) {
    console.error('检查投票状态失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '检查投票状态失败'
    }, { status: 500 })
  }
}
