"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  MessageCircle,
  Star,
  MapPin,
  Calendar,
  Github,
  Globe,
  Users,
  Heart,
  Share,
  MoreHorizontal,
  Lock,
  Code,
  BookOpen,
  Video
} from "lucide-react"
import Link from "next/link"

// 用户资料数据类型
interface UserProfile {
  id: string
  name: string
  username: string
  avatar: string
  bio: string
  location: string
  website: string
  githubUrl: string
  isVerified: boolean
  joinDate: string
  stats: {
    posts: number
    subscribers: number
    totalStars: number
    starVotes: number
    following: number
  }
  recentPosts: Array<{
    id: string
    title: string
    content: string
    createdAt: string
    likes: number
    comments: number
    stars: number
  }>
  subscriptionTiers: Array<{
    id: string
    name: string
    price: number
    popular?: boolean
    description: string
    features: string[]
  }>
}

export default function DeveloperProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("")
  const { data: session } = useSession()
  const [selectedTier, setSelectedTier] = useState("premium")
  const [isFollowing, setIsFollowing] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取路由参数
  useEffect(() => {
    params.then(({ id }) => setId(id))
  }, [params])

  // 获取用户资料数据
  const fetchUserProfile = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/user/profile/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '获取用户资料失败')
      }

      if (data.success && data.user) {
        setUserProfile(data.user)
      } else {
        throw new Error('用户数据格式错误')
      }
    } catch (err) {
      console.error('获取用户资料失败:', err)
      setError(err instanceof Error ? err.message : '获取用户资料失败')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  // 初始加载用户资料
  useEffect(() => {
    if (!id) return
    fetchUserProfile()
  }, [id])

  // 实现1分钟间隔的自动数据刷新
  useEffect(() => {
    if (!id || !userProfile) return

    const refreshInterval = setInterval(() => {
      // 静默刷新，不显示加载状态
      fetchUserProfile(false)
    }, 60000) // 60秒 = 1分钟

    // 清理定时器
    return () => clearInterval(refreshInterval)
  }, [id, userProfile])

  // 页面可见性变化时刷新数据
  useEffect(() => {
    if (!id || !userProfile) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时静默刷新数据
        fetchUserProfile(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [id, userProfile])

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">加载用户资料中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">用户不存在</h1>
          <p className="text-gray-400 mb-4">{error || '找不到指定的用户资料'}</p>
          <Link href="/feed">
            <Button className="bg-blue-600 hover:bg-blue-700">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  // 处理订阅操作
  const handleSubscribe = (tierId: string) => {
    console.log(`订阅 ${tierId} 套餐`)
    alert(`即将跳转到支付页面订阅 ${tierId} 套餐`)
  }

  // 处理聊天操作
  const handleChat = () => {
    alert('🚧 私信功能开发中\n\n该功能正在紧张开发中，敬请期待！\n预计上线时间：2周内')
  }

  // 处理关注操作
  const handleFollow = () => {
    setIsFollowing(!isFollowing)
    // TODO: 调用关注/取消关注API
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 */}
      <nav className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/feed" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              GistFans
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/feed">
                <Button variant="ghost">返回首页</Button>
              </Link>
              {session && (
                <Link
                  href="/profile"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('👤 用户点击头像，跳转到profile页面')
                  }}
                  className="relative z-10"
                  title="个人资料"
                >
                  <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                    <img src={session.user?.image || ""} alt={session.user?.name || ""} className="rounded-full" />
                  </Avatar>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 封面图片 */}
      <div className="relative h-80 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 个人信息区域 */}
        <div className="relative -mt-20 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
            {/* 头像 */}
            <Avatar className="w-32 h-32 border-4 border-gray-800 bg-gray-800">
              <img src={userProfile.avatar} alt={userProfile.name} className="rounded-full" />
            </Avatar>

            {/* 基本信息 */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold">{userProfile.name}</h1>
                    {userProfile.isVerified && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xl text-gray-300 mb-2">{userProfile.username}</p>
                  <p className="text-gray-400 mb-4">{userProfile.bio}</p>
                  
                  {/* 位置和加入时间 */}
                  <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
                    {userProfile.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{userProfile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>加入于 {new Date(userProfile.joinDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</span>
                    </div>
                  </div>
                  
                  {/* 链接 */}
                  <div className="flex items-center space-x-4">
                    {userProfile.website && (
                      <a
                        href={userProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                      >
                        <Globe size={16} />
                        <span>个人网站</span>
                      </a>
                    )}
                    {userProfile.githubUrl && (
                      <a
                        href={userProfile.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
                      >
                        <Github size={16} />
                        <span>GitHub</span>
                      </a>
                    )}
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  <Button
                    onClick={() => setIsFollowing(!isFollowing)}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing ? "border-gray-600 text-gray-300" : "bg-blue-600 hover:bg-blue-700"}
                  >
                    <Users size={16} className="mr-1" />
                    {isFollowing ? "已关注" : "关注"}
                  </Button>
                  
                  <Button
                    onClick={handleChat}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <MessageCircle size={16} className="mr-1" />
                    私信
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <Share size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计信息 - 使用新的统一指标 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{userProfile.stats.subscribers}</div>
            <div className="text-sm text-gray-400">订阅者</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{userProfile.stats.posts}</div>
            <div className="text-sm text-gray-400">发帖总数</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Star size={20} className="text-yellow-400 fill-current" />
              <span className="text-3xl font-bold text-yellow-400">{userProfile.stats.totalStars}</span>
            </div>
            <div className="text-sm text-gray-400">Star总数</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：详细介绍 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 个人介绍 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen size={20} />
                  <span>关于我</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-300 leading-relaxed">
                    {userProfile.bio}
                  </div>

                  {/* 最近帖子 */}
                  {userProfile.recentPosts.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">最近帖子</h3>
                      <div className="space-y-3">
                        {userProfile.recentPosts.slice(0, 3).map((post) => (
                          <div key={post.id} className="p-3 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-300 line-clamp-2">{post.content}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                              <div className="flex items-center space-x-3">
                                <span>❤️ {post.likes}</span>
                                <span>💬 {post.comments}</span>
                                <span>⭐ {post.stars}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：订阅方案 */}
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star size={20} />
                  <span>订阅方案</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile.subscriptionTiers.map((tier) => (
                  <div 
                    key={tier.id}
                    className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      selectedTier === tier.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    } ${tier.popular ? 'ring-2 ring-blue-500/50' : ''}`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{tier.name}</h3>
                      {tier.popular && (
                        <Badge className="bg-blue-600 text-white">推荐</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-blue-400 mb-2">
                      ¥{tier.price}
                      <span className="text-sm text-gray-400">
                        /月
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{tier.description}</p>
                    <ul className="space-y-1 text-sm">
                      {tier.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                
                <Link href="/payment">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3"
                    onClick={() => handleSubscribe(selectedTier)}
                  >
                    立即订阅 - ¥{userProfile.subscriptionTiers.find((t) => t.id === selectedTier)?.price}/月
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}