import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'
import { apiWrapper, handleDatabaseError } from '@/lib/apiErrorHandler'

// 防重复提交的内存缓存
const suggestionLikeCache = new Map<string, { timestamp: number; processing: boolean }>()
const OPERATION_COOLDOWN = 1000 // 1秒冷却时间

// 点赞/取消点赞建议
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiWrapper(async () => {
    // 1. 身份验证 - 与项目统一的错误格式
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('❌ 建议点赞API - 未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const { id: suggestionId } = await params
    const userId = session.user.id
    const operationKey = `suggestion_${userId}_${suggestionId}`
    const now = Date.now()

    console.log('👍 建议点赞API - 处理点赞:', {
      suggestionId,
      userId
    })

    // 🛡️ 防重复提交检查
    const cachedOperation = suggestionLikeCache.get(operationKey)
    if (cachedOperation) {
      if (cachedOperation.processing) {
        return NextResponse.json(
          { success: false, error: '操作正在处理中，请稍候' },
          { status: 429 }
        )
      }

      if (now - cachedOperation.timestamp < OPERATION_COOLDOWN) {
        return NextResponse.json(
          { success: false, error: '操作过于频繁，请稍候再试' },
          { status: 429 }
        )
      }
    }

    // 标记操作正在处理
    suggestionLikeCache.set(operationKey, { timestamp: now, processing: true })

    try {
      // 🎯 使用统一数据库连接池进行事务操作
      const result = await prisma.$transaction(async (tx) => {
          // 2. 检查建议是否存在
          const suggestion = await tx.suggestion.findUnique({
            where: { id: suggestionId }
          })

          if (!suggestion) {
            throw new Error('建议不存在')
          }
            // 3. 检查是否已经点赞
            const existingLike = await tx.suggestionLike.findUnique({
              where: {
                userId_suggestionId: {
                  userId,
                  suggestionId
                }
              }
            })

            let isLiked: boolean

            if (existingLike) {
              // 取消点赞
              await tx.suggestionLike.delete({
                where: {
                  userId_suggestionId: {
                    userId,
                    suggestionId
                  }
                }
              })
              isLiked = false
              console.log('👎 取消点赞建议:', suggestionId)
            } else {
              // 添加点赞
              await tx.suggestionLike.create({
                data: {
                  userId,
                  suggestionId
                }
              })
              isLiked = true
              console.log('👍 点赞建议:', suggestionId)
            }

            // 4. 获取最新的点赞数
            const likeCount = await tx.suggestionLike.count({
              where: { suggestionId }
            })

            return { isLiked, likes: likeCount }
          })

      // 更新缓存状态
      suggestionLikeCache.set(operationKey, { timestamp: now, processing: false })

      console.log('✅ 建议点赞操作成功:', {
        suggestionId,
        isLiked: result.isLiked,
        likes: result.likes
      })

      return {
        success: true,
        isLiked: result.isLiked,
        likes: result.likes
      }

    } finally {
      // 确保清理处理状态
      const cached = suggestionLikeCache.get(operationKey)
      if (cached) {
        suggestionLikeCache.set(operationKey, { ...cached, processing: false })
      }
    }
  }, {
    maxRetries: 2,
    operationType: 'write',
    operationName: 'like_suggestion',
    errorHandler: handleDatabaseError
  })
}

// 定期清理过期的缓存条目
setInterval(() => {
  const now = Date.now()
  const expiredKeys: string[] = []

  for (const [key, value] of suggestionLikeCache.entries()) {
    if (now - value.timestamp > 60000) { // 1分钟过期
      expiredKeys.push(key)
    }
  }

  expiredKeys.forEach(key => suggestionLikeCache.delete(key))

  if (expiredKeys.length > 0) {
    console.log(`🧹 清理了 ${expiredKeys.length} 个过期的建议点赞操作缓存`)
  }
}, 30000) // 每30秒清理一次
