import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 防重复提交的内存缓存
const likeOperationCache = new Map<string, { timestamp: number; processing: boolean }>()
const OPERATION_COOLDOWN = 1000 // 1秒冷却时间

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

    const { id: postId } = await params
    const userId = session.user.id
    const operationKey = `${userId}_${postId}`
    const now = Date.now()

    // 🛡️ 防重复提交检查
    const cachedOperation = likeOperationCache.get(operationKey)
    if (cachedOperation) {
      if (cachedOperation.processing) {
        return NextResponse.json(
          { error: '操作正在处理中，请稍候' },
          { status: 429 }
        )
      }

      if (now - cachedOperation.timestamp < OPERATION_COOLDOWN) {
        return NextResponse.json(
          { error: '操作过于频繁，请稍候再试' },
          { status: 429 }
        )
      }
    }

    // 标记操作正在处理
    likeOperationCache.set(operationKey, { timestamp: now, processing: true })

    try {
      // 🎯 使用智能查询执行器，优化连接使用
      const result = await prisma.$transaction(async (tx) => {
          // 检查帖子是否存在
          const post = await tx.post.findUnique({
            where: { id: postId }
          })

          if (!post) {
            throw new Error('帖子不存在')
          }
            // 检查是否已经点赞
            const existingLike = await tx.like.findUnique({
              where: {
                userId_postId: {
                  userId,
                  postId
                }
              }
            })

            let isLiked: boolean

            if (existingLike) {
              // 取消点赞
              await tx.like.delete({
                where: {
                  userId_postId: {
                    userId,
                    postId
                  }
                }
              })
              isLiked = false
            } else {
              // 添加点赞
              await tx.like.create({
                data: {
                  userId,
                  postId
                }
              })
              isLiked = true
            }

            // 获取最新的点赞数量
            const likesCount = await tx.like.count({
              where: { postId }
            })

            return { isLiked, likesCount }
          })

      // 更新缓存状态
      likeOperationCache.set(operationKey, { timestamp: now, processing: false })

      console.log(`✅ 点赞操作成功: 用户${userId} ${result.isLiked ? '点赞' : '取消点赞'} 帖子${postId}`)

      return NextResponse.json({
        success: true,
        isLiked: result.isLiked,
        likesCount: result.likesCount
      })

    } finally {
      // 确保清理处理状态
      const cached = likeOperationCache.get(operationKey)
      if (cached) {
        likeOperationCache.set(operationKey, { ...cached, processing: false })
      }
    }

  } catch (error) {
    console.error('点赞操作失败:', error)

    // 清理缓存状态
    const session = await getServerSession(authOptions)
    const { id } = await params
    const operationKey = `${session?.user?.id}_${id}`
    likeOperationCache.delete(operationKey)

    if (error instanceof Error && error.message === '帖子不存在') {
      return NextResponse.json(
        { error: '帖子不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '点赞操作失败，请稍后重试' },
      { status: 500 }
    )
  }
}

// 定期清理过期的缓存条目
setInterval(() => {
  const now = Date.now()
  const expiredKeys: string[] = []

  for (const [key, value] of likeOperationCache.entries()) {
    if (now - value.timestamp > 60000) { // 1分钟过期
      expiredKeys.push(key)
    }
  }

  expiredKeys.forEach(key => likeOperationCache.delete(key))

  if (expiredKeys.length > 0) {
    console.log(`🧹 清理了 ${expiredKeys.length} 个过期的点赞操作缓存`)
  }
}, 30000) // 每30秒清理一次
