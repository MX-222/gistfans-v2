import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    }

    const { userType } = await request.json()

    if (!userType || !['CODER', 'LEARNER'].includes(userType)) {
      return NextResponse.json(
        { error: '无效的用户类型' },
        { status: 400 }
      )
    }

    // 更新用户信息
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        userType: userType,
        onboardingComplete: true,
        updatedAt: new Date()
      },
    })

    return NextResponse.json({
      success: true,
      message: '引导流程完成',
      userType: userType,
      shouldShowAnimation: true // 标记应该显示完成动画
    })

  } catch (error) {
    console.error('完成引导错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
} 