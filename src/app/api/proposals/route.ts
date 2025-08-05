import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, executeQuery } from '@/lib/database/unified-prisma'
import { apiWrapper, handleDatabaseError } from '@/lib/apiErrorHandler'

// 获取提案列表
export async function GET(request: NextRequest) {
  return apiWrapper(async () => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const category = searchParams.get('category') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    console.log('📡 GET /api/proposals - 获取提案列表', {
      status, category, page, limit
    })

    // 构建查询条件
    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }
    if (category !== 'all') {
      where.category = category
    }

    // 获取提案列表
    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          _count: {
            select: {
              votes: true,
              starVotes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.proposal.count({ where })
    ])

    // 计算投票统计
    const proposalsWithStats = await Promise.all(
      proposals.map(async (proposal) => {
        // 获取普通投票统计
        const voteStats = await prisma.proposalVote.groupBy({
          by: ['voteType'],
          where: { proposalId: proposal.id },
          _count: { voteType: true }
        })

        // 获取Star投票统计
        const starVoteStats = await prisma.proposalStarVote.groupBy({
          by: ['voteType'],
          where: { proposalId: proposal.id },
          _sum: { starAmount: true }
        })

        const votes = {
          support: voteStats.find(v => v.voteType === 'support')?._count.voteType || 0,
          against: voteStats.find(v => v.voteType === 'against')?._count.voteType || 0
        }

        const starVotes = {
          support: starVoteStats.find(v => v.voteType === 'support')?._sum.starAmount || 0,
          against: starVoteStats.find(v => v.voteType === 'against')?._sum.starAmount || 0
        }

        // 检查提案是否过期
        const isExpired = new Date() > new Date(proposal.expiresAt)
        const shouldUpdateStatus = isExpired && proposal.status === 'active'

        // 如果过期且状态仍为active，更新为expired
        if (shouldUpdateStatus) {
          await prisma.proposal.update({
            where: { id: proposal.id },
            data: { status: 'expired' }
          })
        }

        return {
          ...proposal,
          status: shouldUpdateStatus ? 'expired' : proposal.status,
          votes,
          starVotes,
          isExpired,
          timeRemaining: isExpired ? 0 : Math.max(0, new Date(proposal.expiresAt).getTime() - Date.now())
        }
      })
    )

    console.log(`✅ 返回 ${proposalsWithStats.length} 个提案`)

    return {
      success: true,
      proposals: proposalsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }, {
    maxRetries: 2,
    operationType: 'read',
    operationName: 'get_proposals',
    errorHandler: handleDatabaseError
  })
}

// 创建提案
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('📝 提案创建API调用 - Session信息:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    if (!session?.user?.id) {
      console.log('❌ 提案API - 未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📝 提案API - 请求体:', body)
    
    const { title, description, category } = body

    if (!title || !description || !category) {
      console.log('❌ 提案API - 缺少必要参数:', { title, description, category })
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 检查用户Star余额（创建提案需要18个Star）
    const PROPOSAL_COST = 18
    const userBalance = await prisma.starBalance.findUnique({
      where: { userId: session.user.id }
    })

    if (!userBalance || userBalance.availableStars < PROPOSAL_COST) {
      return NextResponse.json(
        { success: false, error: `创建提案需要${PROPOSAL_COST}个Star，当前余额不足` },
        { status: 400 }
      )
    }

    // 计算提案截止时间（48小时后）
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    console.log('📝 提案API - 准备创建提案:', {
      authorId: session.user.id,
      title: title.substring(0, 50) + '...',
      category,
      expiresAt
    })

    // 使用事务创建提案并扣除Star
    const proposal = await prisma.$transaction(async (tx) => {
      // 创建提案
      const newProposal = await tx.proposal.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          category,
          authorId: session.user.id,
          expiresAt
        },
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

      // 扣除用户Star
      await tx.starBalance.update({
        where: { userId: session.user.id },
        data: {
          availableStars: userBalance.availableStars - PROPOSAL_COST,
          updatedAt: new Date()
        }
      })

      // 记录Star交易
      await tx.starTransaction.create({
        data: {
          userId: session.user.id,
          amount: -PROPOSAL_COST,
          type: 'SPEND_PROPOSAL',
          action: 'create_proposal',
          description: `创建提案 "${title.substring(0, 50)}"`,
          relatedId: newProposal.id,
          relatedType: 'proposal'
        }
      })

      return newProposal
    })

    console.log('✅ 提案API - 提案创建成功:', proposal.id)

    return NextResponse.json({
      success: true,
      proposal: {
        ...proposal,
        votes: { support: 0, against: 0 },
        starVotes: { support: 0, against: 0 },
        timeRemaining: 48 * 60 * 60 * 1000,
        isExpired: false
      }
    })
  } catch (error) {
    console.error('❌ 提案API - 创建提案失败:', error)
    return NextResponse.json(
      { success: false, error: '创建提案失败' },
      { status: 500 }
    )
  }
}
