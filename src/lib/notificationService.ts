import { prisma } from '@/lib/database/unified-prisma'

export interface NotificationData {
  userId: string
  type: string
  title: string
  content: string
  senderId?: string
  relatedId?: string
  metadata?: Record<string, any>
}

export class NotificationService {
  /**
   * 发送Star赠送通知
   */
  static async sendStarGrantNotification(data: {
    recipientId: string
    adminId: string
    amount: number
    reason: string
    transactionId: string
    adminName?: string
    adminEmail?: string
  }) {
    try {
      console.log('📧 发送Star赠送通知:', data)

      // 获取管理员信息
      const admin = await prisma.user.findUnique({
        where: { id: data.adminId },
        select: { name: true, email: true }
      })

      const adminDisplayName = admin?.name || admin?.email || '系统管理员'

      // 创建通知记录
      const notification = await prisma.notification.create({
        data: {
          userId: data.recipientId,
          senderId: data.adminId,
          type: 'STAR_REWARD',
          title: `🌟 您收到了${data.amount}个Star奖励！`,
          content: `管理员 ${adminDisplayName} 向您赠送了 ${data.amount} 个Star。\n\n赠送原因：${data.reason}`,
          relatedId: data.transactionId,
          metadata: JSON.stringify({
            amount: data.amount,
            reason: data.reason,
            adminId: data.adminId,
            adminName: adminDisplayName,
            transactionId: data.transactionId,
            type: 'admin_star_grant'
          }),
          isRead: false
        }
      })

      console.log('✅ Star赠送通知创建成功:', notification.id)
      return { success: true, notificationId: notification.id }

    } catch (error) {
      console.error('❌ 发送Star赠送通知失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '通知发送失败' }
    }
  }

  /**
   * 发送通用通知
   */
  static async sendNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          senderId: data.senderId,
          type: data.type,
          title: data.title,
          content: data.content,
          relatedId: data.relatedId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
          isRead: false
        }
      })

      console.log('✅ 通知发送成功:', notification.id)
      return { success: true, notificationId: notification.id }

    } catch (error) {
      console.error('❌ 通知发送失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '通知发送失败' }
    }
  }

  /**
   * 获取用户未读通知数量
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
      return count
    } catch (error) {
      console.error('❌ 获取未读通知数量失败:', error)
      return 0
    }
  }

  /**
   * 获取用户通知列表
   */
  static async getUserNotifications(userId: string, limit: number = 20) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return { success: true, notifications }
    } catch (error) {
      console.error('❌ 获取用户通知失败:', error)
      return { success: false, notifications: [] }
    }
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId // 确保只能标记自己的通知
        },
        data: {
          isRead: true
        }
      })

      console.log('✅ 通知已标记为已读:', notificationId)
      return { success: true }
    } catch (error) {
      console.error('❌ 标记通知已读失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }

  /**
   * 批量标记通知为已读
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      })

      console.log('✅ 批量标记通知已读成功:', result.count)
      return { success: true, count: result.count }
    } catch (error) {
      console.error('❌ 批量标记通知已读失败:', error)
      return { success: false, error: error instanceof Error ? error.message : '操作失败' }
    }
  }
}

export default NotificationService
