import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 点赞/取消点赞评论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const commentId = resolvedParams.id
    const userId = session.user.id
    
    // 检查评论是否存在
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })
    
    if (!comment) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否已经点赞
    const likedByArray = Array.isArray(comment.likedBy) ? comment.likedBy : []
    const isLiked = likedByArray.includes(userId)

    let newLikedBy: string[]
    let newLikes: number

    if (isLiked) {
      // 取消点赞
      newLikedBy = likedByArray.filter(id => id !== userId)
      newLikes = Math.max(0, comment.likes - 1)
    } else {
      // 添加点赞
      newLikedBy = [...likedByArray, userId]
      newLikes = comment.likes + 1
    }

    // 更新评论
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        likes: newLikes,
        likedBy: newLikedBy
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      comment: updatedComment,
      isLiked: !isLiked
    })
  } catch (error) {
    console.error('点赞评论失败:', error)
    return NextResponse.json(
      { error: '点赞评论失败' },
      { status: 500 }
    )
  }
} 