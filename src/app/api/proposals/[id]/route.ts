import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 获取单个提案详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const proposalId = resolvedParams.id
    const session = await getServerSession(authOptions)

    console.log('📡 GET /api/proposals/[id] - 获取提案详情:', proposalId)

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        starVotes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: '提案不存在' },
        { status: 404 }
      )
    }

    // 计算投票统计
    const votes = {
      support: proposal.votes.filter(v => v.voteType === 'support').length,
      against: proposal.votes.filter(v => v.voteType === 'against').length
    }

    const starVotes = {
      support: proposal.starVotes
        .filter(v => v.voteType === 'support')
        .reduce((sum, v) => sum + v.starAmount, 0),
      against: proposal.starVotes
        .filter(v => v.voteType === 'against')
        .reduce((sum, v) => sum + v.starAmount, 0)
    }

    // 检查当前用户的投票状态
    let userVote = null
    let userStarVotes: Array<{
      voteType: string
      starAmount: number
      createdAt: Date
    }> = []
    if (session?.user?.id) {
      userVote = proposal.votes.find(v => v.userId === session.user.id)
      userStarVotes = proposal.starVotes
        .filter(v => v.userId === session.user.id)
        .map(v => ({
          voteType: v.voteType,
          starAmount: v.starAmount,
          createdAt: v.createdAt
        }))
    }

    // 检查是否过期
    const isExpired = new Date() > new Date(proposal.expiresAt)
    const timeRemaining = isExpired ? 0 : Math.max(0, new Date(proposal.expiresAt).getTime() - Date.now())

    // 如果过期且状态仍为active，更新状态
    if (isExpired && proposal.status === 'active') {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'expired' }
      })
    }

    const result = {
      ...proposal,
      status: (isExpired && proposal.status === 'active') ? 'expired' : proposal.status,
      votes,
      starVotes,
      userVote: userVote ? { voteType: userVote.voteType, createdAt: userVote.createdAt } : null,
      userStarVotes: userStarVotes,
      isExpired,
      timeRemaining
    }

    console.log('✅ 提案详情获取成功')

    return NextResponse.json({
      success: true,
      proposal: result
    })
  } catch (error) {
    console.error('❌ 获取提案详情失败:', error)
    return NextResponse.json(
      { success: false, error: '获取提案详情失败' },
      { status: 500 }
    )
  }
}

// 更新提案状态（管理员功能）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 检查管理员权限
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const proposalId = resolvedParams.id
    const body = await request.json()
    const { status, extendHours } = body

    console.log('📝 管理员更新提案状态:', { proposalId, status, extendHours })

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: '提案不存在' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    // 更新状态
    if (status) {
      updateData.status = status
    }

    // 延期功能
    if (extendHours && typeof extendHours === 'number' && extendHours > 0) {
      const newExpiresAt = new Date(proposal.expiresAt.getTime() + extendHours * 60 * 60 * 1000)
      updateData.expiresAt = newExpiresAt
      console.log('⏰ 提案延期:', { 
        originalExpiry: proposal.expiresAt, 
        newExpiry: newExpiresAt,
        extendedHours: extendHours 
      })
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的内容' },
        { status: 400 }
      )
    }

    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    console.log('✅ 提案状态更新成功')

    return NextResponse.json({
      success: true,
      proposal: updatedProposal,
      message: extendHours ? `提案已延期${extendHours}小时` : '提案状态已更新'
    })
  } catch (error) {
    console.error('❌ 更新提案状态失败:', error)
    return NextResponse.json(
      { success: false, error: '更新提案状态失败' },
      { status: 500 }
    )
  }
}
