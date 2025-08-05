'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { GistFansSmallLoader } from '@/components/GistFansLoader'
import { Star } from 'lucide-react'

interface StarBalance {
  id: string
  userId: string
  totalStars: number
  availableStars: number
  dailyEarned: number
  maxDailyBasic: number
  lastLoginDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export default function StarDisplay() {
  const { data: session } = useSession()
  const [balance, setBalance] = useState<StarBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance()
    }
  }, [session])

  const fetchBalance = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stars/balance')
      const data = await response.json()

      if (data.success) {
        setBalance(data.data)
        setError(null)
      } else {
        setError(data.error || '获取Star余额失败')
      }
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-800 px-3 py-2 rounded border border-gray-700 flex items-center justify-center">
        <GistFansSmallLoader text="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded border border-gray-700">
        <span className="text-sm text-red-400">⚠️ {error}</span>
      </div>
    )
  }

  const progressPercentage = ((balance?.dailyEarned || 0) / (balance?.maxDailyBasic || 3)) * 100

  return (
    <div className="flex items-center space-x-4 bg-gray-800 px-4 py-2 rounded border border-gray-700">
      {/* 可用Star数 */}
      <div className="flex items-center space-x-2">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span className="font-semibold text-white">
          {balance?.availableStars || 0}
        </span>
        <span className="text-sm text-gray-400">可用</span>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-4 bg-gray-600"></div>

      {/* 总数 */}
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-300">
          总计: {balance?.totalStars || 0}
        </span>
      </div>

      {/* 每日进度 */}
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-400">
          今日: {balance?.dailyEarned || 0}/{balance?.maxDailyBasic || 3}
        </span>
        <div className="w-12 h-1 bg-gray-700 rounded overflow-hidden">
          <div 
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
} 
 