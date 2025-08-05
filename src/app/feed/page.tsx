"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Heart, MessageCircle, Share, MoreHorizontal, Search, Home, User, Settings, LogOut, Plus, Edit, Trash2, Lock, Tag, X, Star, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import PostForm from "@/components/PostForm"
import { NotificationBell } from "@/components/NotificationBell"
import LanguageToggle from "@/components/LanguageToggle"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePost } from "@/contexts/PostContext"
import { getTagDisplayText } from "@/utils/tags"
import StarDisplay from "@/components/StarDisplay"
import StarVoteButton from "@/components/StarVoteButton"
import GistFansLoader from '@/components/GistFansLoader'
// import QuickTestButton from "@/components/QuickTestButton" // 已删除
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useComment } from "@/contexts/CommentContext"
import CommentSection from "@/components/comments/CommentSection"
import OAuthRedirectHandler from "@/components/OAuthRedirectHandler"


// 移除功能预告数据，改为简化的建议板入口

export default function FeedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { user: currentUser, isTestMode } = useCurrentUser()
  const { t, language } = useLanguage()
  const { posts: contextPosts, addPost, deletePost, likePost, voteWithStars, refreshPosts } = usePost()
  // Star功能现在通过API处理
  const { getCommentCount } = useComment()
  const [showPostForm, setShowPostForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // 移除commentCounts状态 - 评论懒加载优化：直接使用帖子统计数据
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // 简化的用户认证检查 - 移除邀请码功能
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // 检查用户是否需要完成引导流程
      const checkUserOnboarding = async () => {
        try {
          console.log('🔍 检查用户引导状态')
          const response = await fetch(`/api/user/status/${session.user.id}`)

          if (response.ok) {
            const result = await response.json()
            const userData = result.user || result

            // 如果用户未完成引导，重定向到引导页面
            if (!userData.onboardingComplete) {
              console.log('🔄 用户未完成引导，重定向到引导页面')
              router.push('/auth/onboarding')
              return
            }

            console.log('✅ 用户已完成引导，可以正常使用Feed页面')
          } else if (response.status === 404) {
            // 用户不存在，重定向到引导页面
            console.log('🔄 新用户，重定向到引导页面')
            router.push('/auth/onboarding')
          } else if (response.status === 401) {
            // 认证失败，重定向到登录页面
            console.log('🔄 认证失败，重定向到登录页面')
            router.push('/auth/signin')
          } else {
            // 其他错误，显示提示但允许继续使用
            console.warn('⚠️ 无法获取用户状态，但允许继续使用Feed页面')
          }
        } catch (error) {
          console.error('检查用户状态失败:', error)
          // 网络错误，显示提示但允许继续使用
          console.warn('⚠️ 网络错误，但允许继续使用Feed页面')
        }
      }

      checkUserOnboarding()
    }
  }, [status, session, router])

  // 评论懒加载优化 - 移除初始评论数量查询
  // 使用帖子自带的 _count.comments 统计，避免额外的数据库查询
  const getCommentCountFromPost = (post: any): number => {
    // 优先使用帖子统计中的评论数量
    if (post._count?.comments !== undefined) {
      return post._count.comments
    }
    // 备用：使用帖子对象中的评论数量
    if (post.commentCount !== undefined) {
      return post.commentCount
    }
    // 默认返回0（移除对commentCounts状态的依赖）
    return 0
  }

  // 初始化数据 - 强制刷新确保最新数据
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)

      // 强制刷新帖子数据以确保显示最新内容
      console.log('🔄 Feed页面 - 强制刷新帖子数据')
      await refreshPosts()

      // 使用刷新后的数据
      setPosts(contextPosts)

      // 评论懒加载优化 - 不再预加载评论数量
      // 评论数量将从帖子的 _count.comments 中获取
      console.log('✅ Feed页面 - 跳过评论数量预加载，使用帖子统计数据')

      setIsLoading(false)
    }

    initializeData()
  }, [])

  // 监听contextPosts变化
  useEffect(() => {
    setPosts(contextPosts)
    // 评论懒加载优化 - 移除评论数量预加载
    console.log('✅ Feed页面 - 帖子数据更新，使用内置评论统计')
  }, [contextPosts])

  const handleLike = async (postId: string) => {
    await likePost(postId)
    // 点赞奖励现在通过API处理
  }

  const handleCreatePost = async (postData: { content: string; images: string[]; isPrivate: boolean; tags: string[] }) => {
    console.log('📝 Feed页面 - 处理帖子创建:', postData)

    // 创建帖子
    await addPost(postData)

    // 关闭表单
    setShowPostForm(false)

    // 立即刷新帖子列表以确保新帖子显示
    console.log('🔄 Feed页面 - 帖子创建后刷新列表')
    await refreshPosts()
  }

  const handleDeletePost = (postId: string) => {
    if (confirm(t('delete_post_confirm'))) {
      deletePost(postId)
    }
  }

  const isOwnPost = (post: any) => {
    return post.authorId === currentUser?.id || post.developer.id === currentUser?.id
  }

  // 过滤帖子
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.developer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    
    const matchesTag = !selectedTag || (post.tags && post.tags.includes(selectedTag))
    
    return matchesSearch && matchesTag
  })

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag)
  }

  // 处理帖子展开/收起
  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // 判断帖子内容是否需要截断 - 优化短内容显示
  const shouldTruncatePost = (content: string) => {
    const lines = content.split('\n')
    const hasImage = false // 这里可以检查是否有图片

    // 如果内容很短（少于50字符且少于3行），不截断
    if (content.length <= 50 && lines.length <= 2) {
      return false
    }

    // 短内容帖子：超过100字符或3行就截断
    if (content.length <= 200) {
      return content.length > 100 || lines.length > 3
    }

    // 长内容帖子：超过300字符或6行就截断
    return content.length > 300 || lines.length > 6
  }

  // 获取截断后的内容 - 针对不同长度优化
  const getTruncatedContent = (content: string) => {
    const lines = content.split('\n')

    // 短内容：截断到3行或100字符
    if (content.length <= 200) {
      if (lines.length > 3) {
        return lines.slice(0, 3).join('\n') + '...'
      }
      return content.length > 100 ? content.substring(0, 100) + '...' : content
    }

    // 长内容：截断到6行或300字符
    if (lines.length > 6) {
      return lines.slice(0, 6).join('\n') + '...'
    }
    return content.length > 300 ? content.substring(0, 300) + '...' : content
  }

  // Star投票现在通过StarVoteButton组件处理

  // 修复登录跳转Bug：正确处理session状态
  if (status === 'loading') {
    return <GistFansLoader />
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('please_login')}</h1>
          <Link href="/auth/signin">
            <Button className="bg-blue-600 hover:bg-blue-700">
              {t('login_now')}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* OAuth重定向处理器 */}
      <OAuthRedirectHandler />

      {/* 顶部导航 */}
      <nav className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/feed" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {t('gistfans')}
              </Link>
              <div className="hidden md:flex space-x-6 items-center">
                <Link
                  href="/feed"
                  className="flex items-center space-x-2 text-blue-400 relative z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('🏠 用户点击首页链接')
                  }}
                  title="首页"
                >
                  <Home size={20} />
                  <span>{t('home')}</span>
                </Link>
                <Link
                  href="/explore"
                  className="flex items-center space-x-2 text-gray-400 hover:text-white relative z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('🔍 用户点击探索链接')
                  }}
                  title="探索"
                >
                  <Search size={20} />
                  <span>{t('explore')}</span>
                </Link>
                <Link
                  href="/proposals"
                  className="flex items-center space-x-2 text-gray-400 hover:text-white relative z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('⭐ 用户点击社区提案，跳转到proposals页面')
                  }}
                  title="社区提案"
                >
                  <Star size={20} />
                  <span>{t('community_proposals')}</span>
                </Link>
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Link href="/test-accounts" className="flex items-center space-x-2 text-green-400 hover:text-green-300">
                      <Settings size={20} />
                      <span>{t('test_accounts')}</span>
                    </Link>
                    <Link href="/admin" className="flex items-center space-x-2 text-red-400 hover:text-red-300">
                      <Settings size={20} />
                      <span>{t('admin')}</span>
                    </Link>
                  </>
                )}
                
                {/* 搜索栏 */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none w-64"
                  />
                  <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              {/* {process.env.NODE_ENV === 'development' && <QuickTestButton />} // 已删除 */}
              <NotificationBell />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🚪 用户点击logout按钮')
                  signOut({ callbackUrl: '/auth/signin' })
                }}
                className="text-gray-400 hover:text-white relative z-10"
                title="登出"
              >
                <LogOut size={20} />
              </Button>
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
                  <img
                    src={currentUser?.image || "/default-avatar.png"}
                    alt={currentUser?.name || ""}
                    className="rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/default-avatar.png"
                    }}
                  />
                </Avatar>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主内容区域 */}
          <div className="lg:col-span-3">
            {/* 发帖按钮 */}
            {!showPostForm && (
              <Card className="bg-gray-900 border-gray-800 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <img src={currentUser?.image || ""} alt={currentUser?.name || ""} className="rounded-full" />
                    </Avatar>
                    <Button
                      onClick={() => setShowPostForm(true)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-left justify-start"
                    >
                      {t('share_thoughts')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 发帖表单 */}
            {showPostForm && (
              <Card className="bg-gray-900 border-gray-800 mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('publish_post')}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPostForm(false)}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <PostForm 
                    onSubmit={handleCreatePost} 
                    onCancel={() => setShowPostForm(false)}
                  />
                </CardContent>
              </Card>
            )}

            {/* 搜索和过滤状态 */}
            {(searchQuery || selectedTag) && (
              <Card className="bg-gray-900 border-gray-800 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {searchQuery && (
                        <span className="text-gray-300">
                          {t('search')}: <span className="text-blue-400">"{searchQuery}"</span>
                        </span>
                      )}
                      {selectedTag && (
                        <div className="flex items-center space-x-2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-600/30">
                          <Tag size={12} />
                          <span>{selectedTag}</span>
                        </div>
                      )}
                      <span className="text-gray-500 text-sm">
                        {filteredPosts.length} {t('results_found')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSelectedTag(null)
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={16} className="mr-1" />
                      {t('clear_filters')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className={`bg-gray-900 border-gray-800 ${
                  // 根据内容长度动态调整Card的紧凑程度
                  post.content.length <= 50 ? 'shadow-sm' : 'shadow-md'
                }`}>
                  <CardHeader className={`${
                    post.content.length <= 50 ? 'pb-2 pt-3 px-4' : 'pb-3 pt-4 px-4'
                  }`}>
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/developer/${post.authorId || post.developer.id}`}
                        className="flex items-center space-x-3 hover:bg-gray-800/50 rounded-lg p-1 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log('👤 用户点击头像，跳转到开发者页面:', post.developer.id)
                        }}
                      >
                        <Avatar className="w-12 h-12">
                          <img
                            src={post.developer.avatar || "/default-avatar.png"}
                            alt={post.developer.name}
                            className="rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/default-avatar.png"
                            }}
                          />
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-white">{post.developer.name}</h3>
                            {post.developer.isVerified && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                            {post.isPrivate && (
                              <div className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded-full flex items-center space-x-1">
                                <Lock size={12} />
                                <span>{t('subscribers_only')}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{post.developer.username} • {post.timestamp}</p>
                        </div>
                      </Link>
                      <div className="flex items-center space-x-2">
                        {isOwnPost(post) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal size={20} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className={`${
                    // 动态调整内边距和间距
                    post.content.length <= 50 ? 'py-3 px-4 space-y-2' :
                    post.content.length <= 200 ? 'py-4 px-4 space-y-3' :
                    'py-4 px-4 space-y-4'
                  }`}>
                    {/* 帖子内容 - 支持动态高度和紧凑显示 */}
                    <div className={`text-gray-100 whitespace-pre-line ${
                      post.content.length <= 50 ? 'text-sm leading-relaxed' :
                      post.content.length <= 200 ? 'text-base leading-normal' :
                      'text-base leading-relaxed'
                    }`}>
                      {shouldTruncatePost(post.content) && !expandedPosts.has(post.id) ? (
                        <>
                          {getTruncatedContent(post.content)}
                          <button
                            onClick={() => togglePostExpansion(post.id)}
                            className="block mt-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                          >
                            <div className="flex items-center space-x-1">
                              <ChevronDown size={14} />
                              <span>显示更多</span>
                            </div>
                          </button>
                        </>
                      ) : (
                        <>
                          {post.content}
                          {shouldTruncatePost(post.content) && (
                            <button
                              onClick={() => togglePostExpansion(post.id)}
                              className="block mt-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                            >
                              <div className="flex items-center space-x-1">
                                <ChevronUp size={14} />
                                <span>收起</span>
                              </div>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* 标签显示 */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => handleTagClick(tag)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                              selectedTag === tag
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30'
                            }`}
                          >
                            <Tag size={10} />
                            <span>{getTagDisplayText(tag, language)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* 图片显示 - 只在有实际图片时显示 */}
                    {post.images && post.images.length > 0 && post.images[0] && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <img
                          src={post.images[0]}
                          alt="帖子图片"
                          className="w-full max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            // 图片加载失败时隐藏
                            e.currentTarget.style.display = 'none'
                          }}
                          onClick={() => {
                            // 点击图片放大查看
                            window.open(post.images[0], '_blank')
                          }}
                        />
                      </div>
                    )}
                    
                    <div className={`${
                      post.content.length <= 50 ? 'space-y-2 pt-3' : 'space-y-3 pt-4'
                    } border-t border-gray-800`}>
                      {/* 第一行：常规交互按钮 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center space-x-2 ${post.isLiked ? 'text-red-500' : 'text-gray-400'}`}
                          >
                            <Heart size={20} fill={post.isLiked ? "currentColor" : "none"} />
                            <span>{post.likes}</span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center space-x-2 text-gray-400 hover:text-blue-500 transition-colors"
                            onClick={() => {
                              const isExpanded = expandedComments.has(post.id)
                              if (isExpanded) {
                                setExpandedComments(prev => {
                                  const newSet = new Set(prev)
                                  newSet.delete(post.id)
                                  return newSet
                                })
                              } else {
                                setExpandedComments(prev => new Set(prev).add(post.id))
                              }
                            }}
                          >
                            <MessageCircle size={20} />
                            <span>{getCommentCountFromPost(post)}</span>
                            <span className="text-xs ml-1">
                              {expandedComments.has(post.id) ? '收起' : '展开'}
                            </span>
                          </Button>
                          
                          <Button variant="ghost" size="sm" className="text-gray-400">
                            <Share size={20} />
                          </Button>
                        </div>
                        
                        <Link href={`/developer/${post.developer.id}`}>
                          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                            订阅 ¥{post.developer.subscriptionPrice}/月
                          </Button>
                        </Link>
                      </div>
                      
                      {/* 第二行：Star投票区域 */}
                      <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded p-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium text-white">
                              {post.starVotes || 0}
                            </span>
                            <span className="text-xs text-gray-400">Stars</span>
                          </div>
                          {currentUser?.id && post.userStarVotes && post.userStarVotes[currentUser.id] && (
                            <div className="text-xs text-yellow-400 bg-gray-700 px-2 py-1 rounded">
                              已投票 {post.userStarVotes[currentUser.id]} ⭐
                            </div>
                          )}
                        </div>
                        
                        <StarVoteButton 
                          postId={post.id.toString()} 
                          authorId={post.developer.id}
                          className="ml-2"
                        />
                      </div>
                    </div>
                    
                    {/* 评论区 - 懒加载优化 */}
                    {expandedComments.has(post.id) && (
                      <div className="mt-4 border-t border-gray-700 pt-4">
                        <CommentSection postId={post.id} className="" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 社区建议板 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">💡 社区建议</h3>
                <p className="text-sm text-gray-400">分享你的想法，让我们一起改进</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-300 mb-4">
                    你的每一个建议都很珍贵！无论是新功能想法、改进意见还是使用体验反馈，我们都期待听到你的声音。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-black"
                    onClick={() => router.push('/suggestion-board')}
                  >
                    💬 进入建议板
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 热门话题 */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">{t('hot_tags')}</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 从所有帖子中提取热门标签 */}
                {Array.from(new Set(contextPosts.flatMap(post => post.tags || []))).slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`flex items-center space-x-2 w-full text-left p-2 rounded-lg transition-colors ${
                      selectedTag === tag
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-400 hover:text-blue-300 hover:bg-gray-800'
                    }`}
                  >
                    <Tag size={14} />
                    <span>{getTagDisplayText(tag, language)}</span>
                    <span className="text-xs text-gray-500">
                      ({contextPosts.filter(post => post.tags?.includes(tag)).length})
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 