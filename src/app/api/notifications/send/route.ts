import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

interface SendNotificationRequest {
  userId: string
  type: string
  title: string
  content: string
  relatedId?: string
  metadata?: any
}

// POST /api/notifications/send - 发送通知
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body: SendNotificationRequest = await request.json()
    const { userId, type, title, content, relatedId, metadata } = body

    // 验证必填字段
    if (!userId || !type || !title || !content) {
      return NextResponse.json(
        { error: '缺少必填字段' }, 
        { status: 400 }
      )
    }

    // 验证接收者用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 创建通知
    const notification = await prisma.notification.create({
      data: {
        userId,
        senderId: session.user.id,
        type,
        title,
        content,
        relatedId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      notification
    })

  } catch (error) {
    console.error('发送通知失败:', error)
    return NextResponse.json(
      { error: '发送通知失败' }, 
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 