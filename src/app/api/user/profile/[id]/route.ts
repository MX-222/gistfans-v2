import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/unified-prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      )
    }

    // 查找用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        githubLogin: true,
        isVerified: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        _count: {
          select: {
            posts: true, // 修复：统计所有帖子，不限制状态
            followers: true,
            following: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取用户的Star统计
    const starStats = await prisma.starVote.aggregate({
      where: {
        post: {
          authorId: userId,
          status: 'PUBLISHED'
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        amount: true
      }
    })

    // 获取用户最近的帖子
    const recentPosts = await prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
        isPublic: true
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            starVotes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // 格式化用户资料数据
    const profileData = {
      id: user.id,
      name: user.name || 'Unknown User',
      username: `@${user.githubLogin || user.name?.toLowerCase().replace(/\s+/g, '') || 'user'}`,
      avatar: user.image || '',
      bio: user.bio || '这个用户还没有添加个人简介...',
      location: user.location || '',
      website: user.website || '',
      githubUrl: user.githubLogin ? `https://github.com/${user.githubLogin}` : '',
      isVerified: user.isVerified,
      joinDate: user.createdAt,
      stats: {
        posts: user._count.posts,
        subscribers: user._count.followers, // 订阅者数量
        totalStars: starStats._sum.amount || 0, // Star总数
        starVotes: starStats._count.amount || 0, // Star投票次数
        following: user._count.following
      },
      recentPosts: recentPosts.map(post => ({
        id: post.id,
        title: post.title || post.content.substring(0, 50) + '...',
        content: post.content,
        createdAt: post.createdAt,
        likes: post._count.likes,
        comments: post._count.comments,
        stars: post._count.starVotes
      })),
      // 模拟订阅套餐数据（将来可以从数据库获取）
      subscriptionTiers: [
        {
          id: "basic",
          name: "基础订阅",
          price: 19,
          description: "获取基础内容和社区访问权限",
          features: [
            "每周技术文章",
            "社区讨论参与",
            "基础代码示例",
            "月度答疑直播"
          ]
        },
        {
          id: "premium", 
          name: "高级订阅",
          price: 29,
          popular: true,
          description: "完整的学习体验和1对1指导",
          features: [
            "所有基础功能",
            "1对1技术指导",
            "项目代码审查",
            "优先技术支持",
            "独家学习资源",
            "职业发展建议"
          ]
        }
      ]
    }

    return NextResponse.json({
      success: true,
      user: profileData
    })

  } catch (error) {
    console.error('获取用户资料错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
