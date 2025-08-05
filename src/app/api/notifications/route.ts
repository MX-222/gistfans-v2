import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// GET /api/notifications - 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') // 通知类型过滤
    const isRead = searchParams.get('isRead') // 已读状态过滤
    
    const skip = (page - 1) * limit

    // 构建where条件
    const where: any = {
      userId: session.user.id
    }
    
    if (type) {
      where.type = type
    }
    
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true'
    }

    // 获取通知列表
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
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

    // 获取总数
    const total = await prisma.notification.count({
      where
    })

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('获取通知列表失败:', error)
    return NextResponse.json(
      { error: '获取通知列表失败' }, 
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 