import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 删除帖子
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

    const { id: postId } = await params
    const userId = session.user.id

    // 检查帖子是否存在且属于当前用户
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { error: '帖子不存在' },
        { status: 404 }
      )
    }

    if (post.authorId !== userId) {
      return NextResponse.json(
        { error: '无权删除此帖子' },
        { status: 403 }
      )
    }

    // 删除帖子（级联删除相关的评论、点赞等）
    await prisma.post.delete({
      where: { id: postId }
    })

    return NextResponse.json({
      success: true,
      message: '帖子删除成功'
    })
  } catch (error) {
    console.error('删除帖子失败:', error)
    return NextResponse.json(
      { error: '删除帖子失败' },
      { status: 500 }
    )
  }
}

// 获取单个帖子
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            githubLogin: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            starVotes: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: '帖子不存在' },
        { status: 404 }
      )
    }

    // 格式化返回数据
    const formattedPost = {
      id: post.id,
      developer: {
        id: post.author.id,
        name: post.author.name || 'Unknown User',
        username: `@${post.author.githubLogin || post.author.name?.toLowerCase().replace(/\s+/g, '') || 'user'}`,
        avatar: post.author.image || '',
        isVerified: post.author.isVerified,
        subscriptionPrice: 29
      },
      content: post.content,
      images: post.images || [], // 修复：返回实际的图片数据
      likes: post._count.likes,
      comments: post._count.comments,
      timestamp: formatTimeAgo(post.createdAt),
      isLiked: false, // 需要根据当前用户查询
      isPrivate: !post.isPublic,
      authorId: post.authorId,
      tags: post.tags ? post.tags.split(',').filter(tag => tag.trim()) : [],
      starVotes: post._count.starVotes,
      userStarVotes: {}
    }

    return NextResponse.json({
      success: true,
      post: formattedPost
    })
  } catch (error) {
    console.error('获取帖子失败:', error)
    return NextResponse.json(
      { error: '获取帖子失败' },
      { status: 500 }
    )
  }
}

// 时间格式化函数
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return '刚刚'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}分钟前`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}小时前`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}天前`
  }
}
