import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/unified-prisma'

// 提案投票
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('📝 提案投票API调用 - Session信息:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ 提案投票API - 未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const proposalId = resolvedParams.id
    const body = await request.json()
    
    console.log('📝 提案投票API - 请求体:', body)
    
    const { voteType, starAmount } = body

    // 验证参数
    if (!voteType || !['support', 'against'].includes(voteType)) {
      return NextResponse.json(
        { success: false, error: '无效的投票类型' },
        { status: 400 }
      )
    }

    if (starAmount && (typeof starAmount !== 'number' || starAmount < 1)) {
      return NextResponse.json(
        { success: false, error: '无效的Star数量' },
        { status: 400 }
      )
    }

    // 检查提案是否存在且未过期
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    })

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: '提案不存在' },
        { status: 404 }
      )
    }

    // 检查提案是否已过期或已结束
    const isExpired = new Date() > new Date(proposal.expiresAt)
    if (isExpired || proposal.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '提案已结束，无法投票' },
        { status: 400 }
      )
    }

    // 检查用户是否为提案作者（作者不能为自己的提案投票）
    if (proposal.authorId === session.user.id) {
      return NextResponse.json(
        { success: false, error: '不能为自己的提案投票' },
        { status: 400 }
      )
    }

    console.log('📝 提案投票API - 准备投票:', {
      proposalId,
      userId: session.user.id,
      voteType,
      starAmount: starAmount || 0
    })

    // 使用事务处理投票
    const result = await prisma.$transaction(async (tx) => {
      let normalVoteResult = null
      let starVoteResult = null

      // 处理普通投票
      if (!starAmount) {
        // 检查是否已经投过普通票
        const existingVote = await tx.proposalVote.findUnique({
          where: {
            proposalId_userId: {
              proposalId,
              userId: session.user.id
            }
          }
        })

        if (existingVote) {
          return {
            success: false,
            error: '您已经投过普通票了，每个提案只能投一次普通票'
          }
        }

        // 创建普通投票记录
        normalVoteResult = await tx.proposalVote.create({
          data: {
            proposalId,
            userId: session.user.id,
            voteType
          }
        })

        console.log('✅ 普通投票记录创建成功')
      }

      // 处理Star投票
      if (starAmount && starAmount > 0) {
        // 检查用户Star余额
        const userBalance = await tx.starBalance.findUnique({
          where: { userId: session.user.id }
        })

        if (!userBalance || userBalance.availableStars < starAmount) {
          return {
            success: false,
            error: `Star余额不足，需要${starAmount}个，当前可用${userBalance?.availableStars || 0}个`
          }
        }

        // 创建Star投票记录
        starVoteResult = await tx.proposalStarVote.create({
          data: {
            proposalId,
            userId: session.user.id,
            voteType,
            starAmount
          }
        })

        // 扣除用户Star
        await tx.starBalance.update({
          where: { userId: session.user.id },
          data: {
            availableStars: userBalance.availableStars - starAmount,
            updatedAt: new Date()
          }
        })

        // 记录Star交易
        await tx.starTransaction.create({
          data: {
            userId: session.user.id,
            amount: -starAmount,
            type: 'SPEND_VOTE',
            action: 'vote_proposal',
            description: `为提案投票使用${starAmount}个Star (${voteType === 'support' ? '支持' : '反对'})`,
            relatedId: proposalId,
            relatedType: 'proposal'
          }
        })

        console.log('✅ Star投票记录创建成功，Star已扣除')
      }

      return {
        success: true,
        normalVote: normalVoteResult,
        starVote: starVoteResult
      }
    })

    // 检查事务结果
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    console.log('✅ 提案投票成功')

    // 获取更新后的投票统计
    const [voteStats, starVoteStats] = await Promise.all([
      prisma.proposalVote.groupBy({
        by: ['voteType'],
        where: { proposalId },
        _count: { voteType: true }
      }),
      prisma.proposalStarVote.groupBy({
        by: ['voteType'],
        where: { proposalId },
        _sum: { starAmount: true }
      })
    ])

    const votes = {
      support: voteStats.find(v => v.voteType === 'support')?._count.voteType || 0,
      against: voteStats.find(v => v.voteType === 'against')?._count.voteType || 0
    }

    const starVotes = {
      support: starVoteStats.find(v => v.voteType === 'support')?._sum.starAmount || 0,
      against: starVoteStats.find(v => v.voteType === 'against')?._sum.starAmount || 0
    }

    return NextResponse.json({
      success: true,
      message: starAmount ? 
        `成功投票并使用${starAmount}个Star` : 
        '成功投票',
      votes,
      starVotes,
      voteType,
      starAmount: starAmount || 0
    })
  } catch (error) {
    console.error('❌ 提案投票失败:', error)
    return NextResponse.json(
      { success: false, error: '投票失败' },
      { status: 500 }
    )
  }
}
