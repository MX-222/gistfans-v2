import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'
import { apiWrapper, handleDatabaseError } from '@/lib/apiErrorHandler'

// 获取建议列表 - 完善版本：添加用户点赞状态查询
export async function GET(request: NextRequest) {
  return apiWrapper(async () => {
    console.log('📡 GET /api/suggestions - 获取建议列表')

    // 获取当前用户信息（可选）
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id

    const suggestions = await prisma.suggestion.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            likes: true
          }
        },
        // 如果用户已登录，查询点赞状态
        ...(currentUserId && {
          likes: {
            where: {
              userId: currentUserId
            },
            select: {
              id: true
            }
          }
        })
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 格式化数据 - 包含真实的点赞状态
    const formattedSuggestions = suggestions.map(suggestion => ({
      id: suggestion.id,
      content: suggestion.content,
      author: suggestion.author,
      likes: suggestion._count.likes,
      isLiked: currentUserId ? suggestion.likes.length > 0 : false,
      createdAt: suggestion.createdAt
    }))

    console.log(`✅ 返回 ${formattedSuggestions.length} 条建议`)

    return {
      success: true,
      suggestions: formattedSuggestions,
      total: formattedSuggestions.length
    }
  }, {
    maxRetries: 2,
    operationType: 'read',
    operationName: 'get_suggestions',
    errorHandler: handleDatabaseError
  })
}

// 创建新建议 - 完善版本：增强验证和错误处理
export async function POST(request: NextRequest) {
  return apiWrapper(async () => {
    // 1. 身份验证 - 与项目统一的错误格式
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log('❌ 建议API - 未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 2. 请求体验证 - 增强版本
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.log('❌ 建议API - 请求体格式错误')
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      )
    }

    console.log('📝 建议API - 请求体:', body)

    const { content } = body

    // 内容验证 - 与其他API保持一致
    if (!content || typeof content !== 'string' || !content.trim()) {
      console.log('❌ 建议API - 内容为空')
      return NextResponse.json(
        { success: false, error: '建议内容不能为空' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length < 5) {
      console.log('❌ 建议API - 内容过短')
      return NextResponse.json(
        { success: false, error: '建议内容至少需要5个字符' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 500) {
      console.log('❌ 建议API - 内容过长')
      return NextResponse.json(
        { success: false, error: '建议内容不能超过500字符' },
        { status: 400 }
      )
    }

    // 3. 防刷验证 - 检查用户最近是否频繁提交
    const recentSuggestions = await prisma.suggestion.count({
      where: {
        authorId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000) // 1分钟内
        }
      }
    })

    if (recentSuggestions >= 3) {
      console.log('❌ 建议API - 提交过于频繁')
      return NextResponse.json(
        { success: false, error: '提交过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    console.log('📝 建议API - 准备创建建议:', {
      authorId: session.user.id,
      content: trimmedContent.substring(0, 50) + '...',
      length: trimmedContent.length
    })

    // 4. 创建建议 - 使用事务确保数据一致性
    const suggestion = await prisma.$transaction(async (tx) => {
      const newSuggestion = await tx.suggestion.create({
        data: {
          authorId: session.user.id,
          content: trimmedContent
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          _count: {
            select: {
              likes: true
            }
          }
        }
      })

      return newSuggestion
    })

    console.log('✅ 建议创建成功:', suggestion.id)

    return {
      success: true,
      suggestion: {
        id: suggestion.id,
        content: suggestion.content,
        author: suggestion.author,
        likes: suggestion._count.likes,
        isLiked: false,
        createdAt: suggestion.createdAt
      },
      message: '建议提交成功'
    }
  }, {
    maxRetries: 2,
    operationType: 'write',
    operationName: 'create_suggestion',
    errorHandler: handleDatabaseError
  })
}
