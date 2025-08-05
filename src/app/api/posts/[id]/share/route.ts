/**
 * 帖子分享API - 支持每日首次分享奖励
 * 
 * 用途：处理帖子分享请求，记录分享数据，发放每日首次分享star奖励
 * 
 * 核心功能：
 * - 验证用户身份和帖子存在性
 * - 记录分享行为到Share表
 * - 每日首次分享获得star奖励（防刷机制）
 * - 发送分享通知给帖子作者
 * 
 * 系统架构位置：帖子互动API层，连接前端分享操作和后端数据处理
 * 
 * 主要依赖：
 * - NextAuth.js - 用户身份验证
 * - StarService - star奖励系统
 * - Prisma - 数据库操作
 * 
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'
import { starService } from '@/lib/starService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('📤 帖子分享API调用')

    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const { id: postId } = await params
    const userId = session.user.id

    // 验证帖子存在性
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        content: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: '帖子不存在' },
        { status: 404 }
      )
    }

    // 获取分享平台信息
    const body = await request.json().catch(() => ({}))
    const { platform = 'web', shareUrl } = body

    console.log(`📤 用户 ${userId} 分享帖子 ${postId} 到 ${platform}`)

    // 创建分享记录
    const share = await prisma.share.create({
      data: {
        userId,
        postId,
        platform,
        shareUrl: shareUrl || `${process.env.NEXTAUTH_URL}/posts/${postId}`,
        createdAt: new Date()
      }
    })

    console.log(`✅ 分享记录创建成功:`, {
      shareId: share.id,
      postId,
      userId,
      platform
    })

    // 尝试发放每日首次分享star奖励
    let starReward = null
    try {
      const starResult = await starService.handleDailyShare(userId, postId)

      if (starResult.success) {
        starReward = {
          earned: starResult.earned,
          message: starResult.message
        }
        console.log(`⭐ 分享Star奖励成功:`, starReward)
      } else {
        console.log(`ℹ️ 分享Star奖励跳过:`, starResult.message)
      }
    } catch (starError) {
      console.warn('⚠️ 分享Star奖励失败:', starError)
      // 不影响分享主流程
    }

    // 发送通知给帖子作者（如果不是自己分享自己的帖子）
    if (post.authorId !== userId) {
      try {
        const { NotificationService } = await import('@/lib/notificationService')
        await NotificationService.sendNotification({
          userId: post.authorId,
          type: 'POST_SHARED',
          title: '帖子被分享',
          content: `${session.user.name || '用户'} 分享了你的帖子`,
          senderId: userId,
          relatedId: postId,
          metadata: {
            postTitle: post.title,
            platform
          }
        })
        console.log('✅ 分享通知已发送给作者')
      } catch (notificationError) {
        console.warn('⚠️ 分享通知发送失败:', notificationError)
        // 不影响分享主流程
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        shareId: share.id,
        postId,
        platform,
        starReward
      },
      message: '分享成功'
    })

  } catch (error) {
    console.error('❌ 帖子分享API失败:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '分享失败'
    }, { status: 500 })
  }
}

// 获取帖子分享统计
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    // 获取分享统计
    const [shareCount, recentShares] = await Promise.all([
      prisma.share.count({
        where: { postId }
      }),
      prisma.share.findMany({
        where: { postId },
        select: {
          id: true,
          platform: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        postId,
        shareCount,
        recentShares
      }
    })

  } catch (error) {
    console.error('❌ 获取分享统计失败:', error)

    return NextResponse.json({
      success: false,
      error: '获取分享统计失败'
    }, { status: 500 })
  }
}
