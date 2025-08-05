import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService } from '@/lib/starService'
import { authApiWrapper } from '@/lib/api-middleware'

export async function GET(_request: NextRequest) {
  return authApiWrapper(async () => {
    console.log('📊 获取Star余额请求')

    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error('Unauthorized access')
    }

    console.log('👤 用户已认证:', session.user.id)

    try {
      // 获取用户Star余额
      const balance = await starService.getBalance(session.user.id)

      console.log('✅ Star余额获取成功:', balance)
      return {
        success: true,
        data: {
          userId: session.user.id,
          totalStars: balance.totalStars,
          availableStars: balance.availableStars,
          dailyEarned: balance.dailyEarned,
          maxDailyBasic: balance.maxDailyBasic,
          lastLoginDate: balance.lastLoginDate
        },
        // 🔧 添加向后兼容字段
        balance: balance.availableStars,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ 获取Star余额失败:', error)
      return {
        success: false,
        error: 'Failed to get star balance',
        data: {
          userId: session.user.id,
          totalStars: 0,
          availableStars: 0,
          dailyEarned: 0,
          maxDailyBasic: 3,
          lastLoginDate: null
        },
        timestamp: new Date().toISOString()
      }
    }
  }, 10000) // 10秒超时，认证API不需要太长时间
}