"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Star获取规则 - 修复版本：只保留每日基础活动
export const STAR_RULES = {
  DAILY_LOGIN: 1,        // 每日登录奖励
  POST_SHARE: 1,         // 每日发帖奖励（修改为1星）
  PROPOSAL_THRESHOLD: 18 // 提案创建消费和vote star支持获得
  // 移除其他自动获取规则，高质量内容奖励改为管理员手动发放
}

// Star动作类型 - 修复版本：只保留每日基础活动
export type StarAction =
  | 'daily_login'   // 每日登录
  | 'post_share'    // 每日发帖
  | 'vote_post'     // 投票消费（保留用于提案投票）

// Star记录
export interface StarRecord {
  id: string
  userId: string
  action: StarAction
  amount: number
  description: string
  timestamp: string
  relatedId?: string // 相关的帖子ID、用户ID等
}

// 用户Star状态
export interface UserStarStatus {
  userId: string
  totalStars: number
  availableStars: number
  usedStars: number
  lastRefreshDate: string
  dailyEarned: number
  maxDailyEarn: number
}

// 提案类型
export interface Proposal {
  id: string
  title: string
  description: string
  category: 'feature' | 'policy' | 'community' | 'other'
  authorId: string
  authorName: string
  createdAt: string
  status: 'active' | 'approved' | 'rejected' | 'implemented'
  votes: {
    support: number
    against: number
    neutral: number
  }
  starVotes: {
    support: number
    against: number
    neutral: number
  }
  userVotes: Record<string, 'support' | 'against' | 'neutral'>
  starUserVotes: Record<string, { type: 'support' | 'against' | 'neutral', stars: number }>
  requiredStars: number
  deadline: string
}

interface StarContextType {
  userStars: UserStarStatus | null
  starHistory: StarRecord[]
  proposals: Proposal[]
  earnStars: (action: StarAction, amount?: number, description?: string, relatedId?: string) => void
  spendStars: (amount: number, description: string, relatedId?: string) => boolean
  voteOnProposal: (proposalId: string, voteType: 'support' | 'against' | 'neutral', starAmount?: number) => boolean
  createProposal: (proposal: Omit<Proposal, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'votes' | 'starVotes' | 'userVotes' | 'starUserVotes'>) => boolean
  canCreateProposal: () => boolean
  refreshDailyStars: () => void
  getStarBalance: () => number
  getTodayEarned: () => number
}

const StarContext = createContext<StarContextType | undefined>(undefined)

export function StarProvider({ children }: { children: ReactNode }) {
  // const { data: session } = useSession()
  const { user: currentUser } = useCurrentUser() // 使用当前用户hook，支持测试用户
  const [userStars, setUserStars] = useState<UserStarStatus | null>(null)
  const [starHistory, setStarHistory] = useState<StarRecord[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])

  // 初始化用户Star状态
  useEffect(() => {
    if (currentUser?.id) {
      console.log('✅ StarContext - 用户已登录，初始化Star数据:', currentUser.id)
      initializeUserStars(currentUser.id)
      loadStarHistory(currentUser.id)
      loadProposals()
      checkDailyRefresh()
    } else {
      console.log('⚠️ StarContext - 用户未登录，设置默认状态')

      // 🔧 检查是否有过期的本地缓存数据
      const localStorageKeys = Object.keys(localStorage).filter(key =>
        key.includes('star_status_') || key.includes('Star')
      )

      if (localStorageKeys.length > 0) {
        console.log('🧹 StarContext - 检测到过期的本地缓存，清理中...', localStorageKeys)
        localStorageKeys.forEach(key => localStorage.removeItem(key))
        console.log('✅ StarContext - 过期缓存已清理，建议用户重新登录获取最新数据')
      }

      // 🔧 修复：为未登录用户提供默认的Star状态，避免undefined
      const defaultStatus: UserStarStatus = {
        userId: 'guest',
        totalStars: 0,
        availableStars: 0,
        usedStars: 0,
        lastRefreshDate: new Date().toDateString(),
        dailyEarned: 0,
        maxDailyEarn: 0
      }
      setUserStars(defaultStatus)
    }
  }, [currentUser])

  const initializeUserStars = async (userId: string) => {
    try {
      // 首先尝试从数据库获取最新数据
      const response = await fetch('/api/stars/balance', {
        // 🔒 确保包含认证信息
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const dbStatus: UserStarStatus = {
            userId,
            totalStars: data.data.totalStars,
            availableStars: data.data.availableStars,
            usedStars: data.data.totalStars - data.data.availableStars,
            lastRefreshDate: new Date().toDateString(),
            dailyEarned: data.data.dailyEarned,
            maxDailyEarn: data.data.maxDailyBasic
          }
          setUserStars(dbStatus)
          localStorage.setItem(`star_status_${userId}`, JSON.stringify(dbStatus))
          console.log('✅ StarContext - 从数据库同步Star数据:', dbStatus)
          return
        }
      } else if (response.status === 401) {
        // 🔒 处理认证失败
        console.error('❌ StarContext - 认证失败，无法获取Star数据')
        // 清理可能过期的本地缓存
        localStorage.removeItem(`star_status_${userId}`)
        // 🔧 修复：认证失败时也设置默认状态，避免undefined
        const authFailedStatus: UserStarStatus = {
          userId,
          totalStars: 0,
          availableStars: 0,
          usedStars: 0,
          lastRefreshDate: new Date().toDateString(),
          dailyEarned: 0,
          maxDailyEarn: 0
        }
        setUserStars(authFailedStatus)
        console.log('🔄 建议用户重新登录以获取最新Star数据')
        return
      } else {
        console.warn('⚠️ StarContext - API响应异常:', response.status)
      }
    } catch (error) {
      console.warn('⚠️ StarContext - 网络错误，尝试使用本地缓存:', error)
      // 🔧 修复：网络错误时也要确保有默认状态
    }

    // 数据库同步失败，使用localStorage
    const saved = localStorage.getItem(`star_status_${userId}`)
    if (saved) {
      const status = JSON.parse(saved) as UserStarStatus
      setUserStars(status)
      console.log('📱 StarContext - 使用本地缓存数据:', status)
    } else {
      // 🔧 修复：无缓存时创建默认状态，确保不会是undefined
      const newStatus: UserStarStatus = {
        userId,
        totalStars: 0, // 🔧 修复：默认为0，避免给未验证用户错误的Star数量
        availableStars: 0,
        usedStars: 0,
        lastRefreshDate: new Date().toDateString(),
        dailyEarned: 0,
        maxDailyEarn: 0 // 🔧 修复：未登录用户无法获得Star
      }
      setUserStars(newStatus)
      // 🔧 修复：不为未验证用户保存到localStorage，避免数据污染
      console.log('🆕 StarContext - 创建默认Star状态（未登录/网络错误）:', newStatus)
    }
  }

  // 🔧 移除本地存储的star history，现在使用真实API
  const loadStarHistory = (userId: string) => {
    // Star history现在由StarHistory组件直接从API获取
    // 不再使用本地存储的模拟数据
    console.log('ℹ️ StarContext - Star历史记录现在由API提供，不再使用本地存储')
  }

  const loadProposals = () => {
    const saved = localStorage.getItem('community_proposals')
    if (saved) {
      setProposals(JSON.parse(saved))
    }
  }

  const saveUserStars = (status: UserStarStatus) => {
    setUserStars(status)
    localStorage.setItem(`star_status_${status.userId}`, JSON.stringify(status))
  }

  // 🔧 移除本地存储的star history保存，现在使用真实API
  const saveStarHistory = (history: StarRecord[]) => {
    // Star history现在由API管理，不再保存到本地存储
    console.log('ℹ️ StarContext - Star历史记录现在由API管理，不再保存到本地存储')
    // 保留setStarHistory以维持向后兼容性，但实际上StarHistory组件不再使用这个状态
    setStarHistory(history)
  }

  const saveProposals = (proposalList: Proposal[]) => {
    setProposals(proposalList)
    localStorage.setItem('community_proposals', JSON.stringify(proposalList))
  }

  // 检查是否需要每日刷新
  const checkDailyRefresh = useCallback(() => {
    if (userStars && userStars.lastRefreshDate !== new Date().toDateString()) {
      refreshDailyStars()
    }
  }, [userStars])

  // 每日刷新Star数量
  const refreshDailyStars = useCallback(() => {
    if (!userStars) return

    const newStatus: UserStarStatus = {
      ...userStars,
      availableStars: userStars.totalStars, // 重置可用Star为总数
      usedStars: 0,
      lastRefreshDate: new Date().toDateString(),
      dailyEarned: 0
    }
    saveUserStars(newStatus)
  }, [userStars])

  // 获得Star
  const earnStars = (action: StarAction, amount?: number, description?: string, relatedId?: string) => {
    if (!userStars || !currentUser?.id) return

    const starAmount = amount || STAR_RULES[action.toUpperCase() as keyof typeof STAR_RULES] || 1
    
    // 检查每日获得限制
    if (userStars.dailyEarned + starAmount > userStars.maxDailyEarn) {
      console.log('已达到每日Star获得上限')
      return
    }

    const newRecord: StarRecord = {
      id: Date.now().toString(),
      userId: currentUser.id,
      action,
      amount: starAmount,
      description: description || `获得 ${starAmount} 个Star - ${action}`,
      timestamp: new Date().toISOString(),
      relatedId
    }

    const newStatus: UserStarStatus = {
      ...userStars,
      totalStars: userStars.totalStars + starAmount,
      availableStars: userStars.availableStars + starAmount,
      dailyEarned: userStars.dailyEarned + starAmount
    }

    const newHistory = [newRecord, ...starHistory]
    
    saveUserStars(newStatus)
    saveStarHistory(newHistory)
  }

  // 消费Star
  const spendStars = (amount: number, description: string, relatedId?: string): boolean => {
    if (!userStars || !currentUser?.id) return false
    
    if (userStars.availableStars < amount) {
      console.log('Star数量不足')
      return false
    }

    const newRecord: StarRecord = {
      id: Date.now().toString(),
      userId: currentUser.id,
      action: 'vote_post', // 默认为投票动作
      amount: -amount,
      description,
      timestamp: new Date().toISOString(),
      relatedId
    }

    const newStatus: UserStarStatus = {
      ...userStars,
      availableStars: userStars.availableStars - amount,
      usedStars: userStars.usedStars + amount
    }

    const newHistory = [newRecord, ...starHistory]
    
    saveUserStars(newStatus)
    saveStarHistory(newHistory)
    return true
  }

  // 对提案投票
  const voteOnProposal = (proposalId: string, voteType: 'support' | 'against' | 'neutral', starAmount: number = 0): boolean => {
    if (!currentUser?.id) return false

    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) return false

    // 如果使用Star投票，检查Star数量
    if (starAmount > 0) {
      if (!spendStars(starAmount, `为提案 "${proposal.title}" 投票`, proposalId)) {
        return false
      }
    }

    const updatedProposals = proposals.map(p => {
      if (p.id === proposalId) {
        const newProposal = { ...p }
        
        // 移除之前的投票
        if (newProposal.userVotes[currentUser.id]) {
          const oldVote = newProposal.userVotes[currentUser.id]
          newProposal.votes[oldVote]--
        }
        
        if (newProposal.starUserVotes[currentUser.id]) {
          const oldStarVote = newProposal.starUserVotes[currentUser.id]
          newProposal.starVotes[oldStarVote.type] -= oldStarVote.stars
        }

        // 添加新投票
        newProposal.userVotes[currentUser.id] = voteType
        newProposal.votes[voteType]++

        if (starAmount > 0) {
          newProposal.starUserVotes[currentUser.id] = { type: voteType, stars: starAmount }
          newProposal.starVotes[voteType] += starAmount
        }

        return newProposal
      }
      return p
    })

    saveProposals(updatedProposals)
    return true
  }

  // 创建提案
  const createProposal = (proposalData: Omit<Proposal, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'votes' | 'starVotes' | 'userVotes' | 'starUserVotes'>): boolean => {
    if (!currentUser?.id || !canCreateProposal()) return false

    // 消费18个Star
    if (!spendStars(STAR_RULES.PROPOSAL_THRESHOLD, `创建提案 "${proposalData.title}"`)) {
      return false
    }

    const newProposal: Proposal = {
      ...proposalData,
      id: Date.now().toString(),
      authorId: currentUser.id,
      authorName: currentUser.name || 'Anonymous',
      createdAt: new Date().toISOString(),
      votes: { support: 0, against: 0, neutral: 0 },
      starVotes: { support: 0, against: 0, neutral: 0 },
      userVotes: {},
      starUserVotes: {},
      requiredStars: STAR_RULES.PROPOSAL_THRESHOLD
    }

    const updatedProposals = [newProposal, ...proposals]
    saveProposals(updatedProposals)
    return true
  }

  // 检查是否可以创建提案
  const canCreateProposal = (): boolean => {
    return (userStars?.availableStars || 0) >= STAR_RULES.PROPOSAL_THRESHOLD
  }

  // 获取Star余额
  const getStarBalance = (): number => {
    return userStars?.availableStars || 0
  }

  // 获取今日已获得Star数量
  const getTodayEarned = (): number => {
    return userStars?.dailyEarned || 0
  }

  return (
    <StarContext.Provider value={{
      userStars,
      starHistory,
      proposals,
      earnStars,
      spendStars,
      voteOnProposal,
      createProposal,
      canCreateProposal,
      refreshDailyStars,
      getStarBalance,
      getTodayEarned
    }}>
      {children}
    </StarContext.Provider>
  )
}

export function useStar() {
  const context = useContext(StarContext)
  if (context === undefined) {
    throw new Error('useStar must be used within a StarProvider')
  }
  return context
} 
 