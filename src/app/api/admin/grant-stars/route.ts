import { NextRequest, NextResponse } from 'next/server'
import { starService } from '@/lib/starService'
import { prisma } from '@/lib/database/unified-prisma'
import { verifyAdminAccess, logAdminAction } from '@/lib/admin-auth'

// 管理员赠送Star
export async function POST(request: NextRequest) {
  try {
    console.log('👑 管理员Star赠送API调用')

    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: 403 })
    }

    console.log(`🔐 管理员Star赠送 (验证方式: ${authResult.method})`)

    const body = await request.json()
    const { targetUserId, amount, reason, relatedId, relatedType } = body

    // 验证必需参数
    if (!targetUserId || !amount || !reason) {
      return NextResponse.json({
        success: false,
        error: '缺少必需参数：targetUserId, amount, reason'
      }, { status: 400 })
    }

    // 验证amount类型
    const starAmount = parseInt(amount)
    if (isNaN(starAmount) || starAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'amount必须是正整数'
      }, { status: 400 })
    }

    // 调用StarService赠送Star
    const result = await starService.adminGrantStars(
      authResult.adminId!,
      targetUserId,
      starAmount,
      reason,
      relatedId,
      relatedType
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }

    // 获取更新后的用户余额
    const updatedBalance = await starService.getBalance(targetUserId)

    // 获取目标用户信息（用于日志）
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, email: true }
    })

    // 记录管理员操作
    if (authResult.adminId) {
      await logAdminAction({
        userId: authResult.adminId,
        action: 'GRANT_STARS',
        targetType: 'USER',
        targetId: targetUserId,
        details: {
          amount: starAmount,
          reason,
          relatedId,
          relatedType,
          transactionId: result.transactionId
        },
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    console.log('✅ 管理员Star赠送成功:', {
      admin: authResult.adminEmail,
      targetUser: targetUser?.email,
      amount: starAmount,
      reason,
      transactionId: result.transactionId,
      newBalance: updatedBalance.availableStars
    })

    return NextResponse.json({
      success: true,
      data: {
        granted: result.earned,
        transactionId: result.transactionId,
        targetBalance: updatedBalance,
        targetUser: {
          name: targetUser?.name,
          email: targetUser?.email
        }
      },
      message: result.message
    })

  } catch (error) {
    console.error('❌ 管理员Star赠送API失败:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '赠送Star失败'
    }, { status: 500 })
  }
}

// 获取Star赠送历史记录
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await verifyAdminAccess(request)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 构建查询条件
    const whereCondition: any = {
      type: 'ADMIN_GRANT'
    }

    if (targetUserId) {
      whereCondition.userId = targetUserId
    }

    // 获取管理员赠送记录
    const transactions = await prisma.starTransaction.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // 获取总数
    const total = await prisma.starTransaction.count({
      where: whereCondition
    })

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      },
      message: '管理员Star赠送记录获取成功'
    })

  } catch (error) {
    console.error('❌ 获取Star赠送记录失败:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取记录失败'
    }, { status: 500 })
  }
}
