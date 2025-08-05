import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createErrorResponseWithCode,
  ErrorCode
} from '@/lib/api-types'

// 获取用户的会话列表
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        createErrorResponseWithCode(ErrorCode.UNAUTHORIZED, '未授权访问'),
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const type = searchParams.get('type') // PRIVATE, GROUP, SYSTEM

    // TODO: 开发者D实现
    // 1. 查询用户参与的所有会话
    // 2. 按最后活动时间排序
    // 3. 包含最后一条消息预览
    // 4. 包含未读消息计数
    // 5. 支持按会话类型过滤

    const duration = Date.now() - startTime

    return NextResponse.json(
      createSuccessResponse(
        {
          conversations: [
            // 示例数据结构
            // {
            //   id: 'conv123',
            //   type: 'PRIVATE',
            //   title: null,
            //   participants: [
            //     {
            //       id: 'user123',
            //       name: '用户名',
            //       image: '头像URL',
            //       isOnline: true
            //     }
            //   ],
            //   lastMessage: {
            //     id: 'msg456',
            //     content: '最后一条消息内容',
            //     senderId: 'user123',
            //     createdAt: '2025-07-20T10:00:00Z'
            //   },
            //   unreadCount: 3,
            //   lastActivity: '2025-07-20T10:00:00Z',
            //   createdAt: '2025-07-19T10:00:00Z'
            // }
          ],
          totalUnread: 0,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          duration
        }
      )
    )
  } catch (error) {
    console.error('❌ 获取会话列表失败:', error)
    return NextResponse.json(
      createErrorResponse(
        '获取会话列表失败: ' + (error instanceof Error ? error.message : '未知错误'),
        ErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    )
  }
}

// 创建新会话
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        createErrorResponseWithCode(ErrorCode.UNAUTHORIZED, '未授权访问'),
        { status: 401 }
      )
    }

    const body = await request.json()
    const { participantIds, type = 'PRIVATE', title } = body

    // 验证参数
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        createErrorResponseWithCode(ErrorCode.VALIDATION_ERROR, '参与者列表不能为空'),
        { status: 400 }
      )
    }

    if (type === 'PRIVATE' && participantIds.length !== 1) {
      return NextResponse.json(
        createErrorResponseWithCode(ErrorCode.VALIDATION_ERROR, '私人会话只能有一个参与者'),
        { status: 400 }
      )
    }

    if (type === 'GROUP' && (!title || title.trim().length === 0)) {
      return NextResponse.json(
        createErrorResponseWithCode(ErrorCode.VALIDATION_ERROR, '群组会话必须有标题'),
        { status: 400 }
      )
    }

    // TODO: 开发者D实现
    // 1. 验证所有参与者存在
    // 2. 检查是否已存在相同的会话（私人会话）
    // 3. 创建会话记录
    // 4. 添加参与者记录
    // 5. 发送会话创建通知

    const duration = Date.now() - startTime

    return NextResponse.json(
      createSuccessResponse(
        {
          conversation: {
            id: 'new-conversation-id',
            type,
            title,
            participants: [], // 待实现
            messageCount: 0,
            unreadCount: 0,
            lastActivity: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          duration
        }
      )
    )
  } catch (error) {
    console.error('❌ 创建会话失败:', error)
    return NextResponse.json(
      createErrorResponse(
        '创建会话失败: ' + (error instanceof Error ? error.message : '未知错误'),
        ErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    )
  }
}
