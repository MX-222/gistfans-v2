import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface UserProfileData {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  githubUrl: string
  stats: {
    followers: number
    posts: number
    likes: number
    rating: number
    totalStars: number
  }
  subscriptionPlans: unknown[]
  consultationPlans: unknown[]
}

interface UseProfilePreloadReturn {
  profileData: UserProfileData | null
  isLoading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
}

export function useProfilePreload(): UseProfilePreloadReturn {
  const { data: session } = useSession()
  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      // 检查本地缓存
      const cacheKey = `profile-${session.user.id}`
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        // 如果缓存未过期（5分钟），直接使用
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setProfileData(data)
          setIsLoading(false)
          return
        }
      }

      // 并行获取用户数据
      const [profileResponse, statsResponse, postsResponse] = await Promise.all([
        fetch(`/api/user/profile/${session.user.id}`),
        fetch(`/api/user/stats/${session.user.id}`),
        fetch(`/api/posts?userId=${session.user.id}&limit=5`)
      ])

      if (!profileResponse.ok) {
        throw new Error('获取用户资料失败')
      }

      const profile = await profileResponse.json()
      const stats = statsResponse.ok ? await statsResponse.json() : null
      const posts = postsResponse.ok ? await postsResponse.json() : null

      const profileData: UserProfileData = {
        id: profile.id,
        name: profile.name || session.user.name || '用户名',
        email: profile.email || session.user.email || '',
        avatar: profile.image || session.user.image || '',
        bio: profile.bio || '这里是个人简介...',
        githubUrl: profile.githubUrl || '',
        stats: {
          followers: stats?.followers || 0,
          posts: posts?.total || 0,
          likes: stats?.totalLikes || 0,
          rating: stats?.rating || 0,
          totalStars: stats?.totalStars || 0
        },
        subscriptionPlans: profile.subscriptionPlans || [],
        consultationPlans: profile.consultationPlans || []
      }

      setProfileData(profileData)

      // 缓存到本地存储
      localStorage.setItem(cacheKey, JSON.stringify({
        data: profileData,
        timestamp: Date.now()
      }))

    } catch (err) {
      console.error('获取用户资料失败:', err)
      setError(err instanceof Error ? err.message : '获取用户资料失败')
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image])

  const refreshProfile = async () => {
    if (session?.user?.id) {
      // 清除缓存
      localStorage.removeItem(`profile-${session.user.id}`)
      await fetchProfile()
    }
  }

  // 预加载用户资料
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile()
    }
  }, [session?.user?.id, fetchProfile])

  // 监听页面可见性，页面重新可见时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user?.id) {
        const cacheKey = `profile-${session.user.id}`
        const cached = localStorage.getItem(cacheKey)

        if (cached) {
          const { timestamp } = JSON.parse(cached)
          // 如果缓存超过2分钟，刷新数据
          if (Date.now() - timestamp > 2 * 60 * 1000) {
            fetchProfile()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session?.user?.id, fetchProfile])

  return {
    profileData,
    isLoading,
    error,
    refreshProfile
  }
}
