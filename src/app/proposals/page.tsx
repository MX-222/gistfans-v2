"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { proposalsApi } from '@/lib/apiClient'

import Link from 'next/link'
import { 
  Plus, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Calendar,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  Vote
} from 'lucide-react'

// 提案接口定义
interface Proposal {
  id: string
  title: string
  description: string
  category: string
  authorId: string
  status: string
  createdAt: string
  expiresAt: string
  author: {
    id: string
    name: string
    image: string
  }
  votes: {
    support: number
    against: number
  }
  starVotes: {
    support: number
    against: number
  }
  userVote?: {
    voteType: string
    createdAt: string
  }
  userStarVotes?: Array<{
    voteType: string
    starAmount: number
    createdAt: string
  }>
  isExpired: boolean
  timeRemaining: number
}

export default function ProposalsPage() {
  const { data: session, status } = useSession()
  const { t, language } = useLanguage()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'approved' | 'rejected' | 'expired'>('all')
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'feature' as 'feature' | 'policy' | 'community' | 'other'
  })
  const [starBalance, setStarBalance] = useState(0)

  // 加载提案列表
  useEffect(() => {
    loadProposals()
  }, [])

  // 🔧 修复：当session变化时重新加载Star余额
  useEffect(() => {
    loadStarBalance()
  }, [session])

  const loadProposals = async () => {
    try {
      setLoading(true)
      const response = await proposalsApi.getProposals({ status: filter === 'all' ? undefined : filter })
      console.log('🔍 提案API响应:', response)

      if (response.success) {
        // 🔧 修复：API返回的数据结构是 {success: true, data: {proposals: [...]}}
        const proposals = (response as any).data?.proposals || (response as any).proposals || []
        console.log('📋 解析到的提案数据:', proposals)
        setProposals(proposals)
      } else {
        console.error('❌ API返回失败状态:', response)
        setProposals([])
      }
    } catch (error) {
      console.error('❌ 加载提案失败:', error)
      setProposals([])
      // 🔧 添加用户友好的错误提示
      alert('加载提案失败，请刷新页面重试')
    } finally {
      setLoading(false)
    }
  }

  const loadStarBalance = async () => {
    // 🔧 修复：只有用户登录时才加载Star余额
    if (!session?.user?.id) {
      console.log('👤 用户未登录，跳过Star余额加载')
      setStarBalance(0)
      return
    }

    try {
      const response = await fetch('/api/stars/balance')
      const data = await response.json()
      console.log('🔍 Star余额API响应:', data)

      if (data.success) {
        // 🔧 修复：API返回的数据结构是 {success: true, data: {availableStars: number}}
        const availableStars = data.data?.availableStars || data.balance || 0
        console.log('📊 解析到的Star余额:', availableStars)
        setStarBalance(availableStars)
      } else {
        console.error('❌ Star余额API返回失败状态:', data)
        setStarBalance(0)
      }
    } catch (error) {
      console.error('❌ 加载Star余额失败:', error)
      setStarBalance(0)
    }
  }

  const handleCreateProposal = async () => {
    if (!newProposal.title || !newProposal.description) return

    try {
      const response = await proposalsApi.createProposal(newProposal)
      if (response.success) {
        setNewProposal({ title: '', description: '', category: 'feature' })
        setShowCreateForm(false)
        await loadProposals() // 重新加载提案列表
        await loadStarBalance() // 更新Star余额
        alert(language === 'zh' ? '提案创建成功！' : 'Proposal created successfully!')
      } else {
        alert(response.error || (language === 'zh' ? '创建提案失败' : 'Failed to create proposal'))
      }
    } catch (error) {
      console.error('创建提案失败:', error)
      alert(language === 'zh' ? '网络错误，请重试' : 'Network error, please try again')
    }
  }

  const handleVote = async (proposalId: string, voteType: 'support' | 'against', starAmount = 0) => {
    try {
      const response = await proposalsApi.voteOnProposal(proposalId, { voteType, starAmount })
      if (response.success) {
        await loadProposals() // 重新加载提案列表
        if (starAmount > 0) {
          await loadStarBalance() // 更新Star余额
        }
        alert(response.message || (language === 'zh' ? '投票成功！' : 'Vote submitted successfully!'))
      } else {
        alert(response.error || (language === 'zh' ? '投票失败' : 'Failed to vote'))
      }
    } catch (error) {
      console.error('投票失败:', error)
      alert(language === 'zh' ? '网络错误，请重试' : 'Network error, please try again')
    }
  }

  const canCreateProposal = () => {
    return starBalance >= 18 // 创建提案需要18个Star
  }

  const filteredProposals = proposals.filter(proposal => {
    if (filter === 'all') return true
    return proposal.status === filter
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-blue-400" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />
      case 'implemented': return <CheckCircle className="w-4 h-4 text-purple-400" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-600'
      case 'approved': return 'bg-green-600'
      case 'rejected': return 'bg-red-600'
      case 'implemented': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feature': return 'bg-blue-600/20 text-blue-400 border-blue-600/30'
      case 'policy': return 'bg-purple-600/20 text-purple-400 border-purple-600/30'
      case 'community': return 'bg-green-600/20 text-green-400 border-green-600/30'
      case 'other': return 'bg-gray-600/20 text-gray-400 border-gray-600/30'
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Link href="/auth/signin">
            <Button className="bg-blue-600 hover:bg-blue-700">立即登录</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 */}
      <nav className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/feed" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                GistFans
              </Link>
              <div className="flex items-center space-x-6">
                <Link href="/feed" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                  <Home size={20} />
                  <span>{t('home')}</span>
                </Link>
                <div className="flex items-center space-x-2 text-blue-400">
                  <Vote size={20} />
                  <span>{t('community_proposals')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{starBalance}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('community_proposals')}</h1>
            <p className="text-gray-400">{language === 'zh' ? '用户驱动的平台发展，每个声音都很重要' : 'User-driven platform development, every voice matters'}</p>
          </div>
          
          {canCreateProposal() ? (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus size={16} className="mr-2" />
              {t('create_proposal')}
            </Button>
          ) : (
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">
                {t('need_stars_to_create')}
              </div>
              <div className="text-yellow-400 text-sm">
                当前余额: {starBalance} ⭐
              </div>
            </div>
          )}
        </div>

        {/* 创建提案表单 */}
        {showCreateForm && (
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus size={20} className="text-blue-400" />
                <span>{t('create_new_proposal')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('proposal_title')}</label>
                <Input
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                  placeholder={t('proposal_title_placeholder')}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('detailed_description')}</label>
                <textarea
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
                  placeholder={t('description_placeholder')}
                  className="w-full h-32 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('proposal_category')}</label>
                  <select
                    value={newProposal.category}
                    onChange={(e) => setNewProposal({ ...newProposal, category: e.target.value as any })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="feature">{t('feature')}</option>
                    <option value="policy">{t('policy')}</option>
                    <option value="community">{t('community_category')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>⏰ 提案将在创建后48小时内开放投票</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-400">
                  {t('create_proposal_cost')}
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="border-gray-600 text-gray-300"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateProposal}
                    disabled={!newProposal.title || !newProposal.description}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('create_proposal_button')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 筛选器 */}
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-sm text-gray-400">{t('filter')}:</span>
          {(['all', 'active', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className={filter === status ? "bg-blue-600" : "border-gray-600 text-gray-300"}
            >
              {status === 'all' ? t('filter_all') : 
               status === 'active' ? t('filter_active') :
               status === 'approved' ? t('filter_approved') : t('filter_rejected')}
            </Button>
          ))}
        </div>

        {/* 提案列表 */}
        <div className="space-y-6">
          {filteredProposals.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 text-lg">{language === 'zh' ? '暂无提案' : 'No proposals'}</div>
                <div className="text-gray-500 text-sm mt-2">{language === 'zh' ? '成为第一个创建提案的用户吧！' : 'Be the first to create a proposal!'}</div>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => (
              <Card key={proposal.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{proposal.title}</h3>
                        <Badge className={getCategoryColor(proposal.category)}>
                          {proposal.category === 'feature' ? '功能特性' :
                           proposal.category === 'policy' ? '平台政策' :
                           proposal.category === 'community' ? '社区管理' : '其他'}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(proposal.status)}
                          <Badge className={getStatusColor(proposal.status)}>
                            {proposal.status === 'active' ? '进行中' :
                             proposal.status === 'approved' ? '已通过' :
                             proposal.status === 'rejected' ? '已拒绝' : '已实施'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <User size={14} />
                          <span>{proposal.author.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>
                            {proposal.isExpired ?
                              '已过期' :
                              `剩余 ${Math.ceil(proposal.timeRemaining / (1000 * 60 * 60))} 小时`
                            }
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-4">{proposal.description}</p>
                    </div>
                  </div>

                  {/* 投票区域 */}
                  <div className="border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        {/* 普通投票 */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">普通投票:</span>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp size={14} className="text-green-400" />
                            <span className="text-green-400">{proposal.votes.support}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsDown size={14} className="text-red-400" />
                            <span className="text-red-400">{proposal.votes.against}</span>
                          </div>

                        </div>

                        {/* Star投票 */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Star投票:</span>
                          <div className="flex items-center space-x-1">
                            <Star size={14} className="text-yellow-400" />
                            <span className="text-green-400">+{proposal.starVotes.support}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star size={14} className="text-yellow-400" />
                            <span className="text-red-400">-{proposal.starVotes.against}</span>
                          </div>
                        </div>
                      </div>

                      {/* 投票按钮 */}
                      {proposal.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, 'support')}
                            className="border-green-600 text-green-400 hover:bg-green-600/20"
                          >
                            <ThumbsUp size={14} className="mr-1" />
                            支持
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, 'against')}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <ThumbsDown size={14} className="mr-1" />
                            反对
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, 'support', 1)}
                            disabled={starBalance < 1}
                            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
                          >
                            <Star size={14} className="mr-1" />
                            Star支持
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(proposal.id, 'against', 1)}
                            disabled={starBalance < 1}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <Star size={14} className="mr-1" />
                            Star反对
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 