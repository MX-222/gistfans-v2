import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// GET /api/notifications/unread-count - 获取未读通知数量
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取未读通知数量
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false
      }
    })

    return NextResponse.json({ unreadCount })

  } catch (error) {
    console.error('获取未读通知数量失败:', error)
    return NextResponse.json(
      { error: '获取未读通知数量失败' }, 
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 