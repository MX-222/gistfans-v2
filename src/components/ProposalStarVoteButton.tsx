'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react'

interface ProposalStarVoteButtonProps {
  proposalId: string
  authorId: string
  voteType: 'support' | 'against'
  starAmount?: number
  disabled?: boolean
  onVoteSuccess?: () => void
  className?: string
}

/**
 * 提案Star投票按钮组件
 * 专门用于提案的Star投票功能，与帖子Star投票分离
 */
export default function ProposalStarVoteButton({
  proposalId,
  authorId,
  voteType,
  starAmount = 1,
  disabled = false,
  onVoteSuccess,
  className = ''
}: ProposalStarVoteButtonProps) {
  const { data: session } = useSession()
  const [isVoting, setIsVoting] = useState(false)
  const [userBalance, setUserBalance] = useState(0)

  // 加载用户Star余额
  useEffect(() => {
    if (session?.user?.id) {
      loadUserBalance()
    }
  }, [session])

  const loadUserBalance = async () => {
    try {
      const response = await fetch('/api/stars/balance')
      const data = await response.json()
      
      if (data.success) {
        setUserBalance(data.data?.availableStars || 0)
      }
    } catch (error) {
      console.error('❌ 加载用户Star余额失败:', error)
    }
  }

  const handleVote = async () => {
    if (!session?.user?.id) {
      alert('请先登录')
      return
    }

    if (session.user.id === authorId) {
      alert('不能为自己的提案投票')
      return
    }

    if (starAmount > 0 && userBalance < starAmount) {
      alert(`Star余额不足，需要${starAmount}个，当前可用${userBalance}个`)
      return
    }

    setIsVoting(true)
    try {
      console.log('🌟 开始提案Star投票:', {
        proposalId,
        authorId,
        voteType,
        starAmount,
        userBalance
      })

      const response = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voteType,
          starAmount: starAmount > 0 ? starAmount : undefined
        }),
      })

      const data = await response.json()
      console.log('🌟 提案Star投票响应:', data)

      if (data.success) {
        // 更新用户余额
        if (starAmount > 0) {
          setUserBalance(prev => prev - starAmount)
        }
        
        // 显示成功消息
        const message = starAmount > 0 
          ? `成功投出${starAmount}个Star${voteType === 'support' ? '支持' : '反对'}！`
          : `投票${voteType === 'support' ? '支持' : '反对'}成功！`
        alert(message)
        
        // 调用成功回调
        onVoteSuccess?.()
      } else {
        console.error('❌ 提案Star投票失败:', data.error)
        alert(data.error || '投票失败')
      }
    } catch (error) {
      console.error('❌ 提案Star投票网络错误:', error)
      alert('网络错误，请重试')
    } finally {
      setIsVoting(false)
    }
  }

  // 确定按钮样式和图标
  const getButtonConfig = () => {
    if (starAmount > 0) {
      // Star投票按钮
      return {
        icon: <Star size={14} className="mr-1" />,
        text: voteType === 'support' ? 'Star支持' : 'Star反对',
        className: voteType === 'support' 
          ? 'border-yellow-600 text-yellow-400 hover:bg-yellow-600/20'
          : 'border-red-600 text-red-400 hover:bg-red-600/20'
      }
    } else {
      // 普通投票按钮
      return {
        icon: voteType === 'support' 
          ? <ThumbsUp size={14} className="mr-1" />
          : <ThumbsDown size={14} className="mr-1" />,
        text: voteType === 'support' ? '支持' : '反对',
        className: voteType === 'support'
          ? 'border-green-600 text-green-400 hover:bg-green-600/20'
          : 'border-red-600 text-red-400 hover:bg-red-600/20'
      }
    }
  }

  const buttonConfig = getButtonConfig()
  const isDisabled = disabled || isVoting || (starAmount > 0 && userBalance < starAmount)

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleVote}
      disabled={isDisabled}
      className={`${buttonConfig.className} ${className}`}
    >
      {buttonConfig.icon}
      {isVoting ? '投票中...' : buttonConfig.text}
    </Button>
  )
}
