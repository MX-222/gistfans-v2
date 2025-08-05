/**
 * Posts API路由 - 帖子数据CRUD操作接口
 *
 * 用途：提供帖子的创建、读取、更新、删除等RESTful API接口
 *
 * 核心功能：
 * - GET: 获取帖子列表（支持分页和排序）
 * - POST: 创建新帖子（需要认证）
 * - 用户认证验证
 * - 数据验证和错误处理
 * - 关联数据查询（作者、评论、点赞）
 *
 * 系统架构位置：API层，连接前端请求和数据库操作
 *
 * 主要依赖：
 * - NextAuth - 用户认证
 * - Prisma - 数据库ORM
 * - unified-prisma - 数据库连接池
 *
 * API端点：
 * - GET /api/posts - 获取帖子列表
 * - POST /api/posts - 创建新帖子
 *
 * 响应格式：
 * ```json
 * {
 *   "success": true,
 *   "posts": [...],
 *   "total": 100
 * }
 * ```
 *
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-02
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 时间格式化
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return '刚刚'
  if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + '分钟前'
  if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + '小时前'
  return Math.floor(diffInSeconds / 86400) + '天前'
}

// 格式化帖子
function formatPost(post: any) {
  return {
    id: post.id,
    developer: {
      id: post.author.id,
      name: post.author.name || 'Unknown User',
      username: '@' + (post.author.githubLogin || 'user'),
      avatar: post.author.image || '',
      isVerified: post.author.isVerified || false,
      subscriptionPrice: 29
    },
    content: post.content,
    images: post.images || [],
    likes: post._count?.likes || 0,
    comments: post._count?.comments || 0,
    timestamp: formatTimeAgo(post.createdAt),
    isLiked: false,
    isPrivate: !post.isPublic,
    authorId: post.authorId,
    tags: post.tags ? post.tags.split(',').filter((tag: string) => tag.trim()) : [],
    starVotes: post._count?.starVotes || 0,
    userStarVotes: {}
  }
}

// 获取帖子列表
export async function GET(request: NextRequest) {
  try {
    console.log('📡 GET /api/posts - 开始处理')

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 添加数据库连接健康检查
    try {
      await prisma.user.findFirst({
        select: { id: true },
        take: 1
      })
    } catch (dbError) {
      console.error('❌ 数据库连接失败:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR'
      }, { status: 503 })
    }

    // 查询数据库 - 添加超时保护
    const queryPromise = Promise.all([
      prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          isPublic: true
        },
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
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.post.count({
        where: {
          status: 'PUBLISHED',
          isPublic: true
        }
      })
    ])

    // 添加15秒超时保护
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 15000)
    })

    const [posts, total] = await Promise.race([queryPromise, timeoutPromise]) as any

    console.log('✅ 查询成功:', posts.length, '条帖子')

    const formattedPosts = posts.map(formatPost)

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      total,
      hasMore: offset + limit < total
    })

  } catch (error) {
    console.error('❌ API错误:', error)

    // 详细错误分类
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message === 'Query timeout') {
        return NextResponse.json({
          success: false,
          error: 'Request timeout, please try again',
          code: 'TIMEOUT_ERROR'
        }, { status: 408 })
      }

      if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({
          success: false,
          error: 'Database connection error',
          code: 'CONNECTION_ERROR'
        }, { status: 503 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '未知错误') : undefined
    }, { status: 500 })
  }
}

// 创建帖子
export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/posts - 开始处理')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: '未授权'
      }, { status: 401 })
    }
    
    const body = await request.json()
    const { content, tags, isPrivate, images } = body
    
    if (!content?.trim()) {
      return NextResponse.json({
        success: false,
        error: '内容不能为空'
      }, { status: 400 })
    }
    
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        title: content.substring(0, 100),
        content: content,
        tags: Array.isArray(tags) ? tags.join(',') : '',
        images: images || [],
        isPublic: !isPrivate,
        type: 'TEXT',
        status: 'PUBLISHED',
        publishedAt: new Date()
      },
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
    
    console.log('✅ 帖子创建成功:', post.id)

    // 尝试发放每日首次发帖star奖励
    let starReward = null
    try {
      const { starService } = await import('@/lib/starService')
      const starResult = await starService.handleDailyPost(session.user.id, post.id)

      if (starResult.success) {
        starReward = {
          earned: starResult.earned,
          message: starResult.message
        }
        console.log(`⭐ 发帖Star奖励成功:`, starReward)
      } else {
        console.log(`ℹ️ 发帖Star奖励跳过:`, starResult.message)
      }
    } catch (starError) {
      console.warn('⚠️ 发帖Star奖励失败:', starError)
      // 不影响发帖主流程
    }

    return NextResponse.json({
      success: true,
      post: formatPost(post),
      starReward
    })
    
  } catch (error) {
    console.error('❌ 创建帖子错误:', error)
    
    return NextResponse.json({
      success: false,
      error: '创建帖子失败',
      debug: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}