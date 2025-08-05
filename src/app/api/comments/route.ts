import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeQuery } from '@/lib/database/unified-prisma'
import { apiWrapper, handleDatabaseError } from '@/lib/apiErrorHandler'
import { cacheManager, CacheStrategy } from '@/lib/cache/CacheManager'

// 获取评论列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('postId')

  if (!postId) {
    return NextResponse.json(
      { error: '缺少postId参数' },
      { status: 400 }
    )
  }

  return apiWrapper(async () => {
    // 评论缓存优化
    const cacheKey = `comments:${postId}`

    // 尝试从缓存获取
    const cached = await cacheManager.get(cacheKey, {
      strategy: CacheStrategy.CACHE_ASIDE,
      ttl: 3 * 60 * 1000, // 3分钟缓存
      enableL1: true,
      enableL2: true,
      tags: ['comments', `comments:${postId}`]
    })

    if (cached) {
      console.log(`🎯 Cache hit for comments of post ${postId}`)
      return cached
    }

    console.log(`🔍 Querying comments for post ${postId} from database`)
    const comments = await executeQuery(
      async (client) => client.comment.findMany({
        where: {
          postId: postId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      {
        queryName: 'get_comments',
        priority: 'normal',
        timeout: 8000
      }
    )

    // 转换BigInt为字符串以便JSON序列化
    const serializedComments = comments.map(comment => ({
      ...comment,
      postId: comment.postId.toString()
    }))

    const result = { comments: serializedComments }

    // 缓存结果
    await cacheManager.set(cacheKey, result, {
      strategy: CacheStrategy.CACHE_ASIDE,
      ttl: 3 * 60 * 1000,
      tags: ['comments', `comments:${postId}`]
    })

    return result
  }, {
    maxRetries: 2,
    operationType: 'read', // 使用标准读操作超时（15秒）
    operationName: 'get_comments',
    errorHandler: handleDatabaseError
  })
}

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('📝 评论API调用 - Session信息:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name
    })
    
    if (!session?.user?.id) {
      console.log('❌ 评论API - 未授权访问，session:', session)
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📝 评论API - 请求体:', body)
    
    const { postId, content, parentId } = body

    if (!postId || !content || !content.trim()) {
      console.log('❌ 评论API - 缺少必要参数:', { postId, content, parentId })
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 🎯 使用智能查询执行器进行验证
    const validationResult = await executeQuery(
      async (client) => {
        // 使用事务优化连接使用 - 一次性验证所有约束
        return await client.$transaction(async (tx) => {
          // 验证帖子是否存在
          const post = await tx.post.findUnique({
            where: { id: postId.toString() },
            select: { id: true } // 只选择必要字段
          })

          if (!post) {
            throw new Error('帖子不存在')
          }

          // 检查父评论是否存在（如果是回复）
          if (parentId) {
            const parentComment = await tx.comment.findUnique({
              where: { id: parentId },
              select: { id: true, postId: true } // 只选择必要字段
            })

            if (!parentComment) {
              throw new Error('父评论不存在')
            }

            // 验证父评论属于同一个帖子
            if (parentComment.postId !== postId.toString()) {
              throw new Error('父评论不属于当前帖子')
            }
          }

          return { valid: true }
        })
      },
      {
        queryName: 'validate_comment_data',
        priority: 'normal',
        timeout: 5000
      }
    )

    if (!validationResult.valid) {
      console.log('❌ 评论API - 验证失败')
      return NextResponse.json(
        { success: false, error: '数据验证失败' },
        { status: 400 }
      )
    }

    console.log('📝 评论API - 准备创建评论:', {
      postId: postId.toString(),
      userId: session.user.id,
      content: content.trim(),
      parentId: parentId || null,
      postExists: true
    })

    const comment = await executeQuery(
      async (client) => client.comment.create({
        data: {
          postId: postId.toString(), // 确保使用String类型
          userId: session.user.id,
          content: content.trim(),
          parentId: parentId || null
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
      }),
      {
        queryName: 'create_comment',
        priority: 'high', // 写操作使用高优先级
        timeout: 10000
      }
    )

    console.log('✅ 评论API - 评论创建成功:', comment)

    // 清除相关缓存 - 修复建议提交后显示Bug
    const cacheKey = `comments:${postId}`
    await cacheManager.delete(cacheKey)
    console.log('🔄 评论API - 已清除缓存:', cacheKey)

    // 转换BigInt为字符串以便JSON序列化
    const serializedComment = {
      ...comment,
      postId: comment.postId.toString()
    }

    return NextResponse.json({
      success: true,
      comment: serializedComment
    })
  } catch (error) {
    console.error('❌ 评论API - 创建评论失败:', error)
    return NextResponse.json(
      { success: false, error: '创建评论失败' },
      { status: 500 }
    )
  }
} 