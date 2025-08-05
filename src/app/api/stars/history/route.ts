import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { starService } from '@/lib/starService'

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    // 验证limit参数
    if (limit < 1 || limit > 100) {
      return NextResponse.json({
        success: false,
        error: 'limit参数必须在1-100之间'
      }, { status: 400 })
    }

    // 获取用户Star交易历史
    const history = await starService.getTransactionHistory(session.user.id, limit)

    return NextResponse.json({
      success: true,
      data: history,
      message: 'Star历史记录获取成功'
    })

  } catch (error) {
    console.error('获取Star历史记录失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取Star历史记录失败'
    }, { status: 500 })
  }
} 