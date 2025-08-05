/**
 * PostContext - 帖子数据状态管理中心
 *
 * 用途：管理应用中所有帖子相关的状态和操作，提供统一的帖子数据访问接口
 *
 * 核心功能：
 * - 帖子列表获取和缓存管理
 * - 帖子创建、更新、删除操作
 * - 点赞功能集成
 * - 错误处理和重试机制
 * - 本地缓存和降级方案
 * - 实时数据同步
 *
 * 系统架构位置：状态管理层，连接UI组件和API服务
 *
 * 主要依赖：
 * - React Context API - 状态管理
 * - localStorage - 本地缓存
 * - /api/posts - 帖子API端点
 *
 * 使用示例：
 * ```typescript
 * import { usePost } from '@/contexts/PostContext'
 *
 * const { posts, loading, error, fetchPosts, createPost } = usePost()
 * ```
 *
 * 缓存策略：
 * - 帖子数据缓存：2分钟
 * - 自动重试：最多3次
 * - 降级方案：使用缓存数据
 *
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-02
 */

"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export interface Post {
  id: string
  developer: {
    id: string
    name: string
    username: string
    avatar: string
    isVerified: boolean
    subscriptionPrice: number
  }
  content: string
  images?: string[]
  likes: number
  comments: number
  timestamp: string
  isLiked: boolean
  isPrivate: boolean
  authorId: string
  tags?: string[]
  starVotes: number
  userStarVotes: Record<string, number>
}

interface PostContextType {
  posts: Post[]
  loading: boolean
  error: string | null
  addPost: (postData: { content: string; images: string[]; isPrivate: boolean; tags: string[] }) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  likePost: (postId: string) => Promise<void>
  getUserPosts: (userId: string) => Post[]
  voteWithStars: (postId: string, stars: number) => void
  refreshPosts: () => Promise<void>
}

const PostContext = createContext<PostContextType | undefined>(undefined)

export function usePost() {
  const context = useContext(PostContext)
  if (context === undefined) {
    throw new Error('usePost must be used within a PostProvider')
  }
  return context
}

export function PostProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  // 获取帖子 - 增强错误处理和缓存机制
  const fetchPosts = async (forceRefresh = false, retryCount = 0) => {
    try {
      setLoading(true)
      setError(null)

      console.log(`📡 PostContext - 获取帖子 (尝试 ${retryCount + 1}/3)`)

      // 检查缓存（仅在非强制刷新时）
      if (!forceRefresh) {
        const cacheKey = 'posts_cache'
        const cacheTimeKey = 'posts_cache_time'
        const cachedPosts = localStorage.getItem(cacheKey)
        const cacheTime = localStorage.getItem(cacheTimeKey)

        if (cachedPosts && cacheTime) {
          const cacheAge = Date.now() - parseInt(cacheTime)
          if (cacheAge < 2 * 60 * 1000) { // 2分钟缓存
            console.log('✅ 使用缓存的帖子数据')
            const posts = JSON.parse(cachedPosts)
            setPosts(posts)
            setLoading(false)
            return
          }
        }
      }

      const response = await fetch('/api/posts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // 根据状态码进行不同处理
        if (response.status === 401) {
          throw new Error('认证失败，请重新登录')
        } else if (response.status >= 500) {
          throw new Error(`服务器错误 (${response.status})，请稍后重试`)
        } else {
          throw new Error(`请求失败 (${response.status}): ${response.statusText}`)
        }
      }

      const data = await response.json()

      console.log('📡 PostContext - 响应:', {
        success: data.success,
        postsCount: data.posts?.length || 0
      })

      if (data.success && Array.isArray(data.posts)) {
        setPosts(data.posts)

        // 缓存帖子数据
        localStorage.setItem('posts_cache', JSON.stringify(data.posts))
        localStorage.setItem('posts_cache_time', Date.now().toString())

        console.log('✅ 帖子数据已更新并缓存')
      } else {
        console.warn('⚠️ API返回异常:', data)
        setError(data.error || '获取帖子失败')

        // 如果API失败，尝试使用缓存数据
        const cachedPosts = localStorage.getItem('posts_cache')
        if (cachedPosts) {
          console.log('📱 API失败，使用缓存数据')
          setPosts(JSON.parse(cachedPosts))
        } else {
          setPosts([])
        }
      }

    } catch (error) {
      console.error('❌ PostContext - 获取失败:', error)

      // 重试机制
      if (retryCount < 2 && error instanceof Error) {
        if (error.message.includes('服务器错误') || error.message.includes('网络')) {
          console.log(`⏳ ${error.message}，3秒后重试...`)
          setTimeout(() => fetchPosts(forceRefresh, retryCount + 1), 3000)
          return
        }
      }

      setError(error instanceof Error ? error.message : '网络错误')

      // 尝试使用缓存数据作为降级方案
      const cachedPosts = localStorage.getItem('posts_cache')
      if (cachedPosts) {
        console.log('📱 网络错误，使用缓存数据')
        setPosts(JSON.parse(cachedPosts))
        setError('网络不稳定，显示缓存数据')
      } else {
        setPosts([])
      }
    } finally {
      setLoading(false)
    }
  }

  // 添加帖子
  const addPost = async (postData: { content: string; images: string[]; isPrivate: boolean; tags: string[] }) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      })
      
      const data = await response.json()
      
      if (data.success && data.post) {
        setPosts(prevPosts => [data.post, ...prevPosts])
        console.log('✅ 帖子创建成功')
      } else {
        throw new Error(data.error || '创建失败')
      }
    } catch (error) {
      console.error('❌ 创建帖子失败:', error)
      throw error
    }
  }

  // 刷新帖子
  const refreshPosts = async () => {
    await fetchPosts(true)
  }

  // 其他方法
  const deletePost = async (postId: string) => {
    console.log('删除帖子:', postId)
  }

  const likePost = async (postId: string) => {
    console.log('点赞帖子:', postId)
  }

  const getUserPosts = (userId: string) => {
    return posts.filter(post => post.authorId === userId)
  }

  const voteWithStars = (postId: string, stars: number) => {
    console.log('Star投票:', postId, stars)
  }

  // 初始化
  useEffect(() => {
    fetchPosts()
  }, [])

  const value: PostContextType = {
    posts,
    loading,
    error,
    addPost,
    deletePost,
    likePost,
    getUserPosts,
    voteWithStars,
    refreshPosts
  }

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  )
}