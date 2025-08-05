'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { starsApi } from '@/lib/apiClient'
import { starCacheManager } from '@/lib/starCache'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

interface StarVoteButtonProps {
  postId: string
  authorId: string
  className?: string
}

interface PostStarStats {
  totalStars: number
  voterCount: number
}

export default function StarVoteButton({ postId, authorId, className = '' }: StarVoteButtonProps) {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [starStats, setStarStats] = useState<PostStarStats>({ totalStars: 0, voterCount: 0 })
  const [selectedAmount, setSelectedAmount] = useState(1)
  const [isVoting, setIsVoting] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchStarStats()
      fetchUserBalance()
      checkUserVoteStatus()
    }
  }, [session, postId])

  // 定期刷新余额和统计数据
  useEffect(() => {
    if (session?.user?.id) {
      const interval = setInterval(() => {
        fetchUserBalance()
        fetchStarStats()
      }, 30000) // 每30秒刷新一次

      return () => clearInterval(interval)
    }
  }, [session?.user?.id])

  const checkUserVoteStatus = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/stars/vote-status?postId=${postId}&userId=${session.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setHasVoted(data.hasVoted)
      }
    } catch (error) {
      console.error('检查投票状态失败:', error)
    }
  }

  const fetchStarStats = async () => {
    try {
      const response = await starsApi.getVoteStats(postId.toString())
      if (response.success && response.data) {
        const data = response.data as any
        setStarStats({
          totalStars: data.totalStars || 0,
          voterCount: data.voterCount || 0
        })
      }
    } catch (error) {
      console.error('获取Star统计失败:', error)
      // 设置默认值
      setStarStats({ totalStars: 0, voterCount: 0 })
    }
  }

  const fetchUserBalance = async () => {
    try {
      console.log('🔍 StarVoteButton - 获取用户余额...')
      const response = await starsApi.getBalance()
      console.log('🔍 StarVoteButton - 余额响应:', response)

      if (response.success && response.data) {
        const data = response.data as any
        setUserBalance(data.availableStars || 0)
        console.log('✅ StarVoteButton - 用户余额:', data.availableStars)
      } else {
        console.error('❌ StarVoteButton - 获取余额失败:', response.error)
      }
    } catch (error) {
      console.error('❌ StarVoteButton - 获取用户余额异常:', error)
    }
  }

  const handleVote = async () => {
    if (!session?.user?.id || isVoting) return

    setIsVoting(true)
    try {
      console.log('🌟 开始Star投票:', {
        postId: postId.toString(),
        authorId,
        amount: selectedAmount,
        userBalance
      })

      const response = await fetch('/api/stars/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId.toString(), // 确保转换为字符串
          toUserId: authorId,
          amount: selectedAmount,
        }),
      })

      const data = await response.json()
      console.log('🌟 Star投票响应:', data)

      if (data.success) {
        setStarStats(data.data.postStats)
        setUserBalance(data.data.balance.availableStars)
        setHasVoted(true)
        setShowVoteModal(false)
        // 显示成功消息
        alert(`成功投出${selectedAmount}个Star！`)
      } else {
        console.error('❌ Star投票失败:', data.error)
        alert(data.error || '投Star失败')
      }
    } catch (error) {
      console.error('❌ Star投票网络错误:', error)
      alert('网络错误，请重试')
    } finally {
      setIsVoting(false)
    }
  }

  // 如果是自己的帖子，不显示投票按钮
  if (session?.user?.id === authorId) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-yellow-500 text-lg">⭐</span>
        <span className="text-sm text-gray-600">
          {starStats.totalStars} Star{starStats.totalStars !== 1 ? 's' : ''}
        </span>
        {starStats.voterCount > 0 && (
          <span className="text-xs text-gray-500">
            ({starStats.voterCount} {t('voted_count')})
          </span>
        )}
      </div>
    )
  }

  if (!session) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-yellow-500 text-lg">⭐</span>
        <span className="text-sm text-gray-600">
          {starStats.totalStars} Star{starStats.totalStars !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-gray-500">{t('login_to_vote')}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Star统计显示 */}
      <div className="flex items-center space-x-1">
        <span className="text-yellow-500 text-lg">⭐</span>
        <span className="text-sm text-gray-600">
          {starStats.totalStars}
        </span>
        {starStats.voterCount > 0 && (
          <span className="text-xs text-gray-500">
            ({starStats.voterCount})
          </span>
        )}
      </div>

      {/* 投票按钮 */}
      {!hasVoted && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log('🌟 StarVoteButton - 点击投票按钮:', {
              hasVoted,
              userBalance,
              postId,
              authorId,
              sessionUserId: session?.user?.id
            })
            setShowVoteModal(true)
          }}
          disabled={userBalance < 1}
          className="text-xs px-2 py-1 h-6"
        >
          {t('vote_star')}
        </Button>
      )}

      {hasVoted && (
        <span className="text-xs text-green-600">已投票</span>
      )}

      {/* 投票模态框 */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">为这个帖子投Star</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  选择投票数量 (可用: {userBalance} Star)
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 5, 10].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      disabled={amount > userBalance}
                      className={`px-3 py-1 rounded text-sm border ${
                        selectedAmount === amount
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : amount > userBalance
                          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                投出的Star将直接转给帖子作者，鼓励高质量内容创作。
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleVote}
                  disabled={isVoting || selectedAmount > userBalance}
                  className="flex-1"
                >
                  {isVoting ? '投票中...' : `投出${selectedAmount}个Star`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVoteModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 


