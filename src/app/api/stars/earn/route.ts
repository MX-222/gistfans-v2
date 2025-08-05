import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService, StarAction } from '@/lib/starService'

interface EarnStarRequest {
  action: StarAction
  type: 'basic' | 'content' | 'community'
  amount?: number
  description?: string
  relatedId?: string
  relatedType?: string
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 解析请求体
    const body: EarnStarRequest = await request.json()
    const { action, type, amount, description, relatedId, relatedType } = body

    // 验证必需参数
    if (!action || !type) {
      return NextResponse.json({
        success: false,
        error: 'action和type参数是必需的'
      }, { status: 400 })
    }

    let result

    // 根据类型调用不同的方法
    switch (type) {
      case 'basic':
        result = await starService.earnBasicStars(
          session.user.id,
          action,
          description,
          relatedId,
          relatedType
        )
        break
      
      case 'content':
      case 'community':
        result = await starService.earnContentStars(
          session.user.id,
          action,
          amount,
          description,
          relatedId,
          relatedType
        )
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: '无效的type参数'
        }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }

    // 获取更新后的余额
    const balance = await starService.getBalance(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        earned: result.earned,
        balance: balance
      },
      message: result.message
    })

  } catch (error) {
    console.error('获得Star失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获得Star失败'
    }, { status: 500 })
  }
} 