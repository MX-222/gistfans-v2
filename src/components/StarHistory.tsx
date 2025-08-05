"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  TrendingUp,
  TrendingDown,
  Calendar,
  MessageSquare,
  Heart,
  UserPlus,
  Edit,
  Vote,
  Loader2
} from 'lucide-react'

interface StarTransaction {
  id: string
  action: string
  amount: number
  description: string
  timestamp: string
  relatedId?: string
  relatedType?: string
  metadata?: any
}

export default function StarHistory() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [starHistory, setStarHistory] = useState<StarTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取真实的star交易历史
  useEffect(() => {
    const fetchStarHistory = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/stars/history?limit=50', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setStarHistory(data.data || [])
          console.log('✅ Star历史记录加载成功:', data.data?.length || 0, '条记录')
        } else {
          throw new Error(data.error || 'Failed to fetch star history')
        }
      } catch (error) {
        console.error('❌ 获取Star历史记录失败:', error)
        setError(error instanceof Error ? error.message : '获取历史记录失败')
      } finally {
        setLoading(false)
      }
    }

    fetchStarHistory()
  }, [session?.user?.id])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'daily_login': return <Calendar size={16} className="text-blue-400" />
      case 'daily_post': return <Edit size={16} className="text-green-400" />
      case 'post_share': return <Edit size={16} className="text-green-400" />
      case 'comment': return <MessageSquare size={16} className="text-purple-400" />
      case 'receive_like': return <Heart size={16} className="text-red-400" />
      case 'follow_user': return <UserPlus size={16} className="text-blue-400" />
      case 'vote_post': return <Vote size={16} className="text-yellow-400" />
      case 'admin_grant': return <Star size={16} className="text-purple-400" />
      case 'system_bonus': return <Star size={16} className="text-green-400" />
      default: return <Star size={16} className="text-gray-400" />
    }
  }

  const getActionText = (action: string) => {
    if (language === 'zh') {
      switch (action) {
        case 'daily_login': return '每日登录'
        case 'daily_post': return '每日发帖'
        case 'post_share': return '分享帖子'
        case 'comment': return '评论帖子'
        case 'receive_like': return '获得点赞'
        case 'follow_user': return '关注用户'
        case 'vote_post': return '投票帖子'
        case 'admin_grant': return '管理员赠送'
        case 'system_bonus': return '系统奖励'
        case 'receive_comment': return '获得评论'
        case 'receive_follow': return '获得关注'
        default: return action
      }
    } else {
      switch (action) {
        case 'daily_login': return 'Daily Login'
        case 'daily_post': return 'Daily Post'
        case 'post_share': return 'Share Post'
        case 'comment': return 'Comment'
        case 'receive_like': return 'Receive Like'
        case 'follow_user': return 'Follow User'
        case 'vote_post': return 'Vote Post'
        case 'admin_grant': return 'Admin Grant'
        case 'system_bonus': return 'System Bonus'
        case 'receive_comment': return 'Receive Comment'
        case 'receive_follow': return 'Receive Follow'
        default: return action
      }
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return language === 'zh' ? '刚刚' : 'Just now'
    } else if (diffInMinutes < 60) {
      return language === 'zh' ? `${diffInMinutes}分钟前` : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return language === 'zh' ? `${diffInHours}小时前` : `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return language === 'zh' ? `${diffInDays}天前` : `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star size={20} className="text-yellow-400" />
          <span>{language === 'zh' ? 'Star 历史记录' : 'Star History'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <Loader2 size={48} className="mx-auto mb-4 text-gray-600 animate-spin" />
            <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">
            <Star size={48} className="mx-auto mb-4 text-red-600" />
            <p>{language === 'zh' ? '加载失败' : 'Failed to load'}</p>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
          </div>
        ) : starHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Star size={48} className="mx-auto mb-4 text-gray-600" />
            <p>{language === 'zh' ? '暂无Star记录' : 'No Star history yet'}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {starHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center space-x-3">
                  {getActionIcon(record.action)}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {getActionText(record.action)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.description}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={record.amount > 0 ? "default" : "destructive"}
                    className={`${
                      record.amount > 0 
                        ? "bg-green-600 text-white" 
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {record.amount > 0 ? (
                      <TrendingUp size={12} className="mr-1" />
                    ) : (
                      <TrendingDown size={12} className="mr-1" />
                    )}
                    {record.amount > 0 ? '+' : ''}{record.amount}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(record.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
 