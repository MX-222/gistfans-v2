"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { 
  Settings, 
  Github, 
  Star, 
  Users, 
  MessageSquare, 
  Heart,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Lock,
  Globe,
  Tag,
  ArrowLeft,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePost } from "@/contexts/PostContext"
import StarHistory from "@/components/StarHistory"
import GistFansLoader from '@/components/GistFansLoader'
import SessionDebugger from '@/components/SessionDebugger'
// 恢复StarHistory组件，但改为按需加载

// 订阅方案类型
interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  isActive: boolean
  description?: string
  duration?: string // 'monthly' | 'hourly' | 'yearly'
  type?: 'subscription' | 'consultation' // 区分订阅和咨询
  consultationDuration?: number // 咨询时长（分钟）
  topics?: string[] // 咨询主题
}

interface ConsultationPlan {
  id: string
  title: string
  description: string
  price: number
  currency: string
  duration: number // in minutes
  isActive: boolean
  topics: string[]
}

// 用户资料类型
interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  githubUrl: string
  subscriptionPlans: SubscriptionPlan[]
  consultationPlans: ConsultationPlan[]
  stats: {
    followers: number
    posts: number
    totalStars: number // 替换likes和rating为totalStars
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { t } = useLanguage()
  const { getUserPosts, deletePost } = usePost()
  // 🔧 移除StarContext依赖，改为使用统一的API数据
  // const { userStars } = useStar() // 已移除，改用userStats.stars
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'posts'>('overview')
  
  // 用户资料状态 - 修复：从API获取真实数据而非硬编码
  const [profile, setProfile] = useState<UserProfile>({
    id: session?.user?.id || "current-user",
    name: session?.user?.name || "加载中...",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "/api/placeholder/150/150",
    bio: "加载中...",
    githubUrl: "",
    subscriptionPlans: [
      {
        id: "basic",
        name: "Basic Plan",
        price: 9,
        currency: "$",
        features: ["Access to basic content", "Join discussions", "Monthly Q&A"],
        isActive: true,
        description: "Perfect for getting started with exclusive content",
        duration: "monthly"
      },
      {
        id: "premium",
        name: "Premium Plan",
        price: 29,
        currency: "$",
        features: ["Access to all content", "Priority support", "1-on-1 monthly consultation", "Code review"],
        isActive: true,
        description: "Full access with personalized support",
        duration: "monthly"
      }
    ],
    consultationPlans: [
      {
        id: "code-review",
        title: "Code Review Session",
        description: "Get your code reviewed by an expert with detailed feedback and suggestions",
        price: 59,
        currency: "$",
        duration: 60,
        isActive: true,
        topics: ["Code Quality", "Best Practices", "Performance", "Security"]
      },
      {
        id: "career-guidance",
        title: "Career Guidance",
        description: "1-on-1 mentoring session for career development and technical growth",
        price: 89,
        currency: "$",
        duration: 90,
        isActive: true,
        topics: ["Career Planning", "Skill Development", "Interview Prep", "Industry Insights"]
      }
    ],
    stats: {
      followers: 0, // 🔧 修复：初始化为0，等待API数据更新
      posts: 0,     // 🔧 修复：初始化为0，等待API数据更新
      totalStars: 0 // 🔧 修复：初始化为0，等待API数据更新
    }
  })

  // 🔧 用户统计数据状态 - 包含star数据
  const [userStats, setUserStats] = useState<{
    stats: {
      stars: {
        balance: {
          totalStars: number
          availableStars: number
          usedStars: number
          dailyEarned: number
        }
        received: any
        given: any
        display: any
      }
      posts: {
        total: number
        published: number
        draft: number
      }
      social: {
        followers: number
        following: number
        interactions: number
      }
      activity: any
    }
  } | null>(null)

  // 🔧 数据加载状态 - 避免显示硬编码数据
  const [isDataLoading, setIsDataLoading] = useState(true)

  // 编辑状态
  const [editForm, setEditForm] = useState({
    name: profile.name,
    bio: profile.bio,
    githubUrl: profile.githubUrl
  })

  // 新订阅方案表单
  const [newPlan, setNewPlan] = useState({
    name: "",
    price: 0,
    currency: "$",
    features: [""],
    description: "",
    duration: "monthly",
    type: "subscription" as 'subscription' | 'consultation',
    consultationDuration: 60,
    topics: [""]
  })
  const [showAddPlan, setShowAddPlan] = useState(false)

  // 新咨询方案表单
  const [newConsultation, setNewConsultation] = useState({
    title: "",
    description: "",
    price: 0,
    duration: 60,
    topics: [""]
  })
  const [showAddConsultation, setShowAddConsultation] = useState(false)
  const [showStarHistory, setShowStarHistory] = useState(false) // 按需加载StarHistory

  // 获取用户的帖子
  const userPosts = getUserPosts(session?.user?.id || "")

  // 从API获取用户资料数据 - 修复头像和用户名缺失问题 + Star数量同步问题
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return

      try {
        console.log('🔄 获取用户资料数据:', session.user.id)
        setIsDataLoading(true) // 🔧 设置加载状态

        // 🚀 使用优化的API - 减少API调用次数，提高性能
        const [profileResponse, userStatsResponse] = await Promise.all([
          fetch(`/api/user/profile/${session.user.id}`),
          fetch(`/api/user/stats-optimized?userId=${session.user.id}&details=true&cache=true`)
        ])

        if (profileResponse.ok) {
          const userData = await profileResponse.json()
          console.log('✅ 用户资料数据获取成功:', userData)

          // 获取统一的用户统计数据
          if (userStatsResponse.ok) {
            const statsData = await userStatsResponse.json()
            const statsResult = statsData.data
            console.log('✅ 用户统计数据获取成功:', statsResult)

            // 🔧 设置userStats状态
            setUserStats(statsResult)

            // 🔧 同时更新profile状态，使用统计数据 - 修复Star显示逻辑
            setProfile(prev => ({
              ...prev,
              id: userData.id,
              name: userData.name || session.user.name || "用户名",
              email: userData.email || session.user.email || "",
              avatar: userData.avatar || session.user.image || "/api/placeholder/150/150",
              bio: userData.bio || "这个用户还没有添加个人简介...",
              githubUrl: userData.githubUrl || "",
              stats: {
                followers: statsResult?.stats?.social?.followers || userData.stats?.subscribers || 0,
                posts: statsResult?.stats?.posts?.total || userData.stats?.posts || 0,
                // 🔧 修复Star数量显示：明确使用用户拥有的Star总数（余额）
                totalStars: statsResult?.stats?.stars?.balance?.totalStars || 0
              }
            }))

            console.log('📊 用户资料更新完成:', {
              followers: statsResult?.stats?.social?.followers || 0,
              posts: statsResult?.stats?.posts?.total || 0,
              totalStars: statsResult?.stats?.stars?.balance?.totalStars || 0,
              availableStars: statsResult?.stats?.stars?.balance?.availableStars || 0
            })
          } else {
            // 如果统计数据获取失败，只更新基础profile信息
            setProfile(prev => ({
              ...prev,
              id: userData.id,
              name: userData.name || session.user.name || "用户名",
              email: userData.email || session.user.email || "",
              avatar: userData.avatar || session.user.image || "/api/placeholder/150/150",
              bio: userData.bio || "这个用户还没有添加个人简介...",
              githubUrl: userData.githubUrl || ""
            }))
          }

          // � 数据加载完成
          setIsDataLoading(false)

          // �🔍 调试：详细打印userStats结构
          console.log('🔍 完整userStats数据:', JSON.stringify(userStats, null, 2))
        } else {
          console.error('❌ 获取用户资料失败:', profileResponse.status)
          // 使用session数据作为备用
          setProfile(prev => ({
            ...prev,
            name: session.user.name || "用户名",
            email: session.user.email || "",
            avatar: session.user.image || "/api/placeholder/150/150"
          }))
        }
      } catch (error) {
        console.error('❌ 获取用户资料异常:', error)
        // 使用session数据作为备用
        setProfile(prev => ({
          ...prev,
          name: session.user.name || "用户名",
          email: session.user.email || "",
          avatar: session.user.image || "/api/placeholder/150/150"
        }))
        setIsDataLoading(false) // 🔧 即使出错也要停止加载状态
      }
    }

    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image])

  // 检查登录状态 - 修复过于严格的检查导致的跳转问题
  useEffect(() => {
    // 只有在明确未认证时才重定向，避免在loading期间重定向
    if (status === 'unauthenticated') {
      console.log('❌ 用户未认证，重定向到登录页面')
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user) {
      console.log('✅ 用户已认证，profile页面正常加载', {
        userId: session.user.id,
        email: session.user.email
      })
    }
  }, [status, session, router])

  // 优化加载状态显示，提升用户体验
  if (status === 'loading') {
    return <GistFansLoader />
  }

  // 显示加载状态或重定向页面
  if (status !== 'authenticated') {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-white">
          {status === 'unauthenticated' ? '正在跳转到登录页面...' : '加载中...'}
        </div>
      </div>
    </div>
  }

  if (!session?.user) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-white">会话信息异常，请重新登录</div>
        <Button
          onClick={() => router.push('/auth/signin')}
          className="mt-4 bg-blue-600 hover:bg-blue-700"
        >
          重新登录
        </Button>
      </div>
    </div>
  }

  // 保存个人资料
  const handleSaveProfile = () => {
    setProfile(prev => ({
      ...prev,
      name: editForm.name,
      bio: editForm.bio,
      githubUrl: editForm.githubUrl
    }))
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditForm({
      name: profile.name,
      bio: profile.bio,
      githubUrl: profile.githubUrl
    })
    setIsEditing(false)
  }

  // 添加订阅方案
  const handleAddPlan = () => {
    if (newPlan.name && newPlan.price > 0) {
      const plan: SubscriptionPlan = {
        id: Date.now().toString(),
        name: newPlan.name,
        price: newPlan.price,
        currency: newPlan.currency,
        features: newPlan.features.filter(f => f.trim() !== ""),
        isActive: true,
        description: newPlan.description,
        duration: newPlan.duration,
        type: newPlan.type,
        consultationDuration: newPlan.type === 'consultation' ? newPlan.consultationDuration : undefined,
        topics: newPlan.type === 'consultation' ? newPlan.topics.filter(t => t.trim() !== "") : undefined
      }
      setProfile(prev => ({
        ...prev,
        subscriptionPlans: [...prev.subscriptionPlans, plan]
      }))
      setNewPlan({ name: "", price: 0, currency: "$", features: [""], description: "", duration: "monthly", type: "subscription", consultationDuration: 60, topics: [""] })
      setShowAddPlan(false)
    }
  }

  // 删除订阅方案
  const handleDeletePlan = (planId: string) => {
    setProfile(prev => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.filter(p => p.id !== planId)
    }))
  }

  // 切换方案状态
  const togglePlanStatus = (planId: string) => {
    setProfile(prev => ({
      ...prev,
      subscriptionPlans: prev.subscriptionPlans.map(p => 
        p.id === planId ? { ...p, isActive: !p.isActive } : p
      )
    }))
  }

  // 添加功能特性
  const addFeature = () => {
    setNewPlan(prev => ({
      ...prev,
      features: [...prev.features, ""]
    }))
  }

  // 更新功能特性
  const updateFeature = (index: number, value: string) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }))
  }

  // 删除功能特性
  const removeFeature = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  // 主题管理函数
  const addTopic = () => {
    setNewPlan(prev => ({
      ...prev,
      topics: [...prev.topics, ""]
    }))
  }

  const updateTopic = (index: number, value: string) => {
    setNewPlan(prev => ({
      ...prev,
      topics: prev.topics.map((t, i) => i === index ? value : t)
    }))
  }

  const removeTopic = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }))
  }

  // 咨询计划管理函数
  const handleAddConsultation = () => {
    if (newConsultation.title && newConsultation.price > 0) {
      const consultation: ConsultationPlan = {
        id: Date.now().toString(),
        title: newConsultation.title,
        description: newConsultation.description,
        price: newConsultation.price,
        currency: "$",
        duration: newConsultation.duration,
        isActive: true,
        topics: newConsultation.topics.filter(t => t.trim() !== "")
      }
      setProfile(prev => ({
        ...prev,
        consultationPlans: [...prev.consultationPlans, consultation]
      }))
      setNewConsultation({ title: "", description: "", price: 0, duration: 60, topics: [""] })
      setShowAddConsultation(false)
    }
  }

  const handleDeleteConsultation = (consultationId: string) => {
    setProfile(prev => ({
      ...prev,
      consultationPlans: prev.consultationPlans.filter(c => c.id !== consultationId)
    }))
  }

  const toggleConsultationStatus = (consultationId: string) => {
    setProfile(prev => ({
      ...prev,
      consultationPlans: prev.consultationPlans.map(c => 
        c.id === consultationId ? { ...c, isActive: !c.isActive } : c
      )
    }))
  }



  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/feed" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                <ArrowLeft size={20} />
                <span>返回首页</span>
              </Link>
              <div className="text-xl font-bold text-white">个人资料</div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="border-gray-600"
              >
                {isEditing ? (
                  <>
                    <X size={16} className="mr-1" />
                    取消
                  </>
                ) : (
                  <>
                    <Edit size={16} className="mr-1" />
                    编辑
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveProfile}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save size={16} className="mr-1" />
                  保存
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：个人信息 */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  </Avatar>
                  
                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-center"
                        placeholder="用户名"
                      />
                      <Textarea
                        value={editForm.bio}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none"
                        rows={4}
                        placeholder="个人简介"
                      />
                      <div className="flex items-center space-x-2">
                        <Github size={20} className="text-gray-400" />
                        <Input
                          value={editForm.githubUrl}
                          onChange={(e) => setEditForm(prev => ({ ...prev, githubUrl: e.target.value }))}
                          className="bg-gray-800 border-gray-700"
                          placeholder="GitHub 链接"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h1 className="text-2xl font-bold">{profile.name}</h1>
                      <p className="text-gray-300 text-sm">{profile.bio}</p>
                      {profile.githubUrl && (
                        <a
                          href={profile.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300"
                        >
                          <Github size={16} />
                          <span>GitHub</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 统计信息 - 简化为核心指标 */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{userPosts.length}</div>
                    <div className="text-sm text-gray-400">发帖总数</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star size={16} className="text-yellow-400 fill-current" />
                      <span className="text-2xl font-bold text-yellow-400">{profile.stats.totalStars}</span>
                    </div>
                    <div className="text-sm text-gray-400">拥有Star</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star size={16} className="text-blue-400 fill-current" />
                      <span className="text-2xl font-bold text-blue-400">{userStats?.stats?.stars?.balance?.availableStars || 0}</span>
                    </div>
                    <div className="text-sm text-gray-400">可用Star</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：主要内容 */}
          <div className="lg:col-span-2">
            {/* 标签页 */}
            <div className="flex space-x-1 mb-6">
                          {[
              { id: 'overview', label: t('account_overview'), icon: Settings },
              { id: 'plans', label: '服务管理', icon: Star },
              { id: 'posts', label: t('my_posts'), icon: Edit }
            ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? "default" : "ghost"}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 ${
                    activeTab === id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Button>
              ))}
            </div>

            {/* 概览标签页 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Star历史按需加载 */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Star历史记录</h3>
                      <Button
                        onClick={() => setShowStarHistory(!showStarHistory)}
                        variant="outline"
                        size="sm"
                        className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
                      >
                        <Star size={16} className="mr-2" />
                        {showStarHistory ? '隐藏历史' : '查看Star历史'}
                      </Button>
                    </div>
                  </CardHeader>
                  {showStarHistory && (
                    <CardContent>
                      <StarHistory />
                    </CardContent>
                  )}
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <h3 className="text-lg font-semibold">账户概览</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageSquare size={20} className="text-green-400" />
                          <span className="font-medium">帖子管理</span>
                        </div>
                        <p className="text-sm text-gray-400">管理您发布的帖子和内容</p>
                        <div className="mt-2 text-2xl font-bold text-green-400">{userPosts.length}</div>
                      </div>
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Star size={20} className="text-purple-400" />
                          <span className="font-medium">服务订阅</span>
                        </div>
                        <p className="text-sm text-gray-400">查看和管理您的服务订阅</p>
                        <div className="mt-2 text-2xl font-bold text-purple-400">即将开放</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 订阅方案标签页 */}
            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">服务管理</h3>
                  <Button
                    onClick={() => setShowAddPlan(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus size={16} className="mr-1" />
                    添加服务
                  </Button>
                </div>

                {/* 添加新方案表单 */}
                {showAddPlan && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <h4 className="font-semibold">添加新服务</h4>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          value={newPlan.name}
                          onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="方案名称"
                          className="bg-gray-800 border-gray-700"
                        />
                        <Input
                          type="number"
                          value={newPlan.price}
                          onChange={(e) => setNewPlan(prev => ({ ...prev, price: Number(e.target.value) }))}
                          placeholder="价格 ($)"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">服务类型</label>
                          <select
                            value={newPlan.type}
                            onChange={(e) => setNewPlan(prev => ({ ...prev, type: e.target.value as 'subscription' | 'consultation' }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                          >
                            <option value="subscription">订阅服务</option>
                            <option value="consultation">1对1咨询</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            {newPlan.type === 'consultation' ? '咨询时长' : '计费周期'}
                          </label>
                          {newPlan.type === 'consultation' ? (
                            <select
                              value={newPlan.consultationDuration}
                              onChange={(e) => setNewPlan(prev => ({ ...prev, consultationDuration: Number(e.target.value) }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                            >
                              <option value={30}>30分钟</option>
                              <option value={60}>60分钟</option>
                              <option value={90}>90分钟</option>
                              <option value={120}>120分钟</option>
                            </select>
                          ) : (
                            <select
                              value={newPlan.duration}
                              onChange={(e) => setNewPlan(prev => ({ ...prev, duration: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                            >
                              <option value="monthly">月度订阅</option>
                              <option value="yearly">年度订阅</option>
                              <option value="hourly">按小时计费</option>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">货币</label>
                          <select
                            value={newPlan.currency || "$"}
                            onChange={(e) => setNewPlan(prev => ({ ...prev, currency: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
                          >
                            <option value="$">美元 ($)</option>
                            <option value="¥">人民币 (¥)</option>
                            <option value="€">欧元 (€)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">方案描述</label>
                        <Textarea
                          value={newPlan.description}
                          onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="详细描述这个订阅方案包含的内容和价值..."
                          className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {newPlan.type === 'consultation' ? '咨询主题' : '功能特性'}
                        </label>
                        {newPlan.type === 'consultation' ? (
                          // 咨询主题管理
                          <>
                            {newPlan.topics.map((topic, index) => (
                              <div key={index} className="flex items-center space-x-2 mb-2">
                                <Input
                                  value={topic}
                                  onChange={(e) => updateTopic(index, e.target.value)}
                                  placeholder="咨询主题"
                                  className="bg-gray-800 border-gray-700"
                                />
                                {newPlan.topics.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTopic(index)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addTopic}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              <Plus size={16} className="mr-1" />
                              添加主题
                            </Button>
                          </>
                        ) : (
                          // 功能特性管理
                          <>
                            {newPlan.features.map((feature, index) => (
                              <div key={index} className="flex items-center space-x-2 mb-2">
                                <Input
                                  value={feature}
                                  onChange={(e) => updateFeature(index, e.target.value)}
                                  placeholder="功能描述"
                                  className="bg-gray-800 border-gray-700"
                                />
                                {newPlan.features.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFeature(index)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X size={16} />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addFeature}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Plus size={16} className="mr-1" />
                              添加功能
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button onClick={handleAddPlan} className="bg-blue-600 hover:bg-blue-700">
                          保存服务
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowAddPlan(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          取消
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 现有订阅方案 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {profile.subscriptionPlans.map((plan) => (
                    <Card key={plan.id} className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-lg">{plan.name}</h4>
                              <Badge variant={plan.type === 'consultation' ? 'destructive' : 'default'} className={
                                plan.type === 'consultation' 
                                  ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' 
                                  : 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                              }>
                                {plan.type === 'consultation' ? '1对1咨询' : '订阅服务'}
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold mt-1" style={{
                              color: plan.type === 'consultation' ? '#c084fc' : '#60a5fa'
                            }}>
                              {plan.currency}{plan.price}
                              <span className="text-sm text-gray-400">
                                {plan.type === 'consultation' 
                                  ? `/${plan.consultationDuration}分钟` 
                                  : plan.duration === 'monthly' ? '/月' : plan.duration === 'yearly' ? '/年' : '/小时'
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={plan.isActive ? "default" : "secondary"}>
                              {plan.isActive ? "启用" : "禁用"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePlanStatus(plan.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              <Settings size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlan(plan.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {plan.description && (
                          <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                        )}
                        
                        {plan.type === 'consultation' && plan.topics ? (
                          <div className="space-y-2 mb-4">
                            <div className="text-sm font-medium">咨询主题:</div>
                            <div className="flex flex-wrap gap-1">
                              {plan.topics.map((topic, index) => (
                                <span key={index} className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <ul className="space-y-2 mb-4">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center space-x-2 text-sm">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        <Link href="/payment">
                          <Button className={`w-full ${
                            plan.type === 'consultation' 
                              ? 'bg-purple-600 hover:bg-purple-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}>
                            {plan.type === 'consultation' 
                              ? `预约咨询 - ${plan.currency}${plan.price}/${plan.consultationDuration}分钟`
                              : `订阅 - ${plan.currency}${plan.price}${plan.duration === 'monthly' ? '/月' : plan.duration === 'yearly' ? '/年' : '/小时'}`
                            }
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}



            {/* 我的帖子标签页 */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">我的帖子 ({userPosts.length})</h3>
                  <Link href="/feed">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus size={16} className="mr-1" />
                      发布新帖
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <Card key={post.id} className="bg-gray-900 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-gray-400">{post.timestamp}</div>
                            {post.isPrivate ? (
                              <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                                <Lock size={12} className="mr-1" />
                                订阅可见
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                                <Globe size={12} className="mr-1" />
                                公开
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('确定要删除这个帖子吗？')) {
                                  deletePost(post.id)
                                }
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-gray-100 mb-4">{post.content}</p>
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag, index) => (
                              <div key={index} className="flex items-center space-x-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full text-xs border border-blue-600/30">
                                <Tag size={10} />
                                <span>{tag}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {post.images && post.images.length > 0 && (
                          <div className="mb-4">
                            <img 
                              src={post.images[0]} 
                              alt="Post content" 
                              className="w-full max-w-md h-48 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Heart size={16} className="text-red-400" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare size={16} />
                            <span>{post.comments}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🐛 Session调试工具 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && <SessionDebugger />}
    </div>
  )
} 