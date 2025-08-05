import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 删除评论
export async function DELETE(
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
    
    // 检查权限（只有评论作者或管理员可以删除）
    if (comment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '无权删除此评论' },
        { status: 403 }
      )
    }

    // 删除评论及其所有回复
    await prisma.comment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }
        ]
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: '评论删除成功' 
    })
  } catch (error) {
    console.error('删除评论失败:', error)
    return NextResponse.json(
      { error: '删除评论失败' },
      { status: 500 }
    )
  }
} 