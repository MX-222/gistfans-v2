/**
 * 帖子服务 - 生产级实现
 * 集成多层缓存、实时同步、性能优化
 */

import { prisma } from '@/lib/database/unified-prisma'
import { cacheManager, CacheStrategy, CacheLevel } from '@/lib/cache/CacheManager'
import { RedisCache, CacheNamespace } from '@/lib/cache/RedisCache'
import { RealtimeEventType, realtimeSyncManager } from '@/lib/realtime/RealtimeSync'
import { Post } from '@prisma/client'

// 帖子查询选项
export interface PostQueryOptions {
  limit?: number
  offset?: number
  userId?: string
  tags?: string[]
  status?: string
  sortBy?: 'createdAt' | 'likeCount' | 'commentCount' | 'starCount'
  sortOrder?: 'asc' | 'desc'
  includePrivate?: boolean
}

// 帖子创建数据
export interface CreatePostData {
  authorId: string
  title?: string
  content: string
  tags?: string[]
  images?: string[]
  isPrivate?: boolean
  type?: string
}

// 帖子更新数据
export interface UpdatePostData {
  title?: string
  content?: string
  tags?: string[]
  isPrivate?: boolean
  status?: string
}

/**
 * 帖子服务类
 * 实现高性能的帖子CRUD操作
 */
export class PostService {
  private redisCache: RedisCache | null = null

  constructor(redisCache?: RedisCache) {
    this.redisCache = redisCache || null
  }

  /**
   * 获取帖子列表 - 多层缓存优化
   */
  async getPosts(options: PostQueryOptions = {}): Promise<{
    posts: any[]
    total: number
    hasMore: boolean
  }> {
    const {
      limit = 20,
      offset = 0,
      userId,
      tags,
      status = 'PUBLISHED',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includePrivate = false
    } = options

    // 生成缓存键
    const cacheKey = this.generateCacheKey('posts:list', {
      limit,
      offset,
      userId,
      tags: tags?.join(','),
      status,
      sortBy,
      sortOrder,
      includePrivate
    })

    try {
      // 尝试从缓存获取
      const cached = await cacheManager.get(cacheKey, {
        strategy: CacheStrategy.CACHE_ASIDE,
        ttl: 5 * 60 * 1000, // 5分钟
        enableL1: true,
        enableL2: true,
        tags: ['posts', 'posts:list']
      })

      if (cached) {
        console.log('🎯 Cache hit for posts list')
        return cached as { posts: any[]; total: number; hasMore: boolean }
      }

      // 从数据库查询
      console.log('🔍 Querying posts from database')
      const startTime = Date.now()

      const where: any = {
        status
      }

      if (userId) {
        where.authorId = userId
      }

      if (!includePrivate) {
        where.isPublic = true
      }

      if (tags && tags.length > 0) {
        where.tags = {
          contains: tags.join(',')
        }
      }

      // Feed页面优化：限制最大60条，避免复杂查询延长连接时间
      const optimizedLimit = Math.min(limit, 60)

      // 性能优化：使用生产连接管理器执行查询
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where,
            select: {
              id: true,
              authorId: true,
              title: true,
              content: true,
              excerpt: true,
              tags: true,
              type: true,
              status: true,
              isPublic: true,
              isPinned: true,
              viewCount: true,
              likeCount: true,
              commentCount: true,
              shareCount: true,
              starCount: true,
              supportCount: true,
              createdAt: true,
              updatedAt: true,
              publishedAt: true,
              images: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  githubLogin: true,
                  isVerified: true
                }
              },
              // 点赞API与Post绑定：一次性获取点赞状态
              likes: userId ? {
                where: { userId },
                select: { id: true }
              } : false
            },
            orderBy: {
              [sortBy]: sortOrder
            },
            take: optimizedLimit,
            skip: offset
          }),
        prisma.post.count({ where })
      ])

      // 如果需要实时统计数据，可以选择性地批量获取
      // 为了性能，暂时使用帖子表中的缓存字段
      posts.forEach((post: any) => {
        post._count = {
          comments: post.commentCount || 0,
          likes: post.likeCount || 0,
          starVotes: post.starCount || 0
        }
      })

      const queryTime = Date.now() - startTime
      console.log(`⚡ Database query completed in ${queryTime}ms`)

      // 格式化数据
      const formattedPosts = posts.map(post => this.formatPost(post))
      
      const finalResult = {
        posts: formattedPosts,
        total,
        hasMore: offset + optimizedLimit < total
      }

      // 缓存结果
      await cacheManager.set(cacheKey, finalResult, {
        strategy: CacheStrategy.CACHE_ASIDE,
        ttl: 5 * 60 * 1000,
        tags: ['posts', 'posts:list']
      })

      // 如果有Redis，也缓存到L2
      if (this.redisCache) {
        await this.redisCache.set(cacheKey, {
          data: finalResult,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000,
          version: 1,
          tags: ['posts', 'posts:list'],
          hits: 0
        })
      }

      return finalResult
    } catch (error) {
      console.error('❌ Error getting posts:', error)
      throw error
    }
  }

  /**
   * 获取单个帖子
   */
  async getPost(id: string, userId?: string): Promise<any | null> {
    const cacheKey = `post:${id}`

    try {
      // 尝试从缓存获取
      const cached = await cacheManager.get(cacheKey, {
        strategy: CacheStrategy.CACHE_ASIDE,
        ttl: 10 * 60 * 1000, // 10分钟
        enableL1: true,
        enableL2: true,
        tags: ['posts', `post:${id}`]
      })

      if (cached) {
        console.log(`🎯 Cache hit for post ${id}`)
        return cached
      }

      // 从数据库查询
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              githubLogin: true,
              isVerified: true
            }
          },
          // comments: {
          //   include: {
          //     author: {
          //       select: {
          //         id: true,
          //         name: true,
          //         image: true
          //       }
          //     }
          //   },
          //   orderBy: {
          //     createdAt: 'desc'
          //   }
          // },
          _count: {
            select: {
              comments: true,
              likes: true,
              starVotes: true
            }
          }
        }
      })

      if (!post) {
        return null
      }

      // 增加浏览量
      await this.incrementViewCount(id)

      const formattedPost = this.formatPost(post)

      // 缓存结果
      await cacheManager.set(cacheKey, formattedPost, {
        strategy: CacheStrategy.CACHE_ASIDE,
        ttl: 10 * 60 * 1000,
        tags: ['posts', `post:${id}`]
      })

      return formattedPost
    } catch (error) {
      console.error(`❌ Error getting post ${id}:`, error)
      throw error
    }
  }

  /**
   * 创建帖子 - 写穿透策略
   */
  async createPost(data: CreatePostData): Promise<any> {
    try {
      console.log('📝 Creating new post:', data)
      const startTime = Date.now()

      // 使用事务创建帖子
      const post = await prisma.$transaction(async (tx) => {
        const newPost = await tx.post.create({
          data: {
            authorId: data.authorId,
            title: data.title || data.content.substring(0, 100),
            content: data.content,
            tags: data.tags?.join(',') || '',
            images: data.images || [], // 修复：启用images字段存储
            isPublic: !data.isPrivate,
            type: data.type || 'TEXT',
            status: 'PUBLISHED',
            publishedAt: new Date()
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                githubLogin: true,
                isVerified: true
              }
            }
          }
        })

        // 验证创建结果
        const verification = await tx.post.findUnique({
          where: { id: newPost.id },
          select: { id: true, content: true }
        })

        if (!verification) {
          throw new Error('Post creation verification failed')
        }

        return newPost
      })

      const createTime = Date.now() - startTime
      console.log(`✅ Post created successfully in ${createTime}ms:`, post.id)

      const formattedPost = this.formatPost(post)

      // 立即缓存新帖子
      const cacheKey = `post:${post.id}`
      await cacheManager.set(cacheKey, formattedPost, {
        strategy: CacheStrategy.WRITE_THROUGH,
        ttl: 10 * 60 * 1000,
        tags: ['posts', `post:${post.id}`]
      })

      // 失效相关缓存
      await this.invalidatePostListCaches()

      // 发送实时事件
      await this.broadcastRealtimeEvent(RealtimeEventType.POST_CREATED, {
        post: formattedPost,
        authorId: data.authorId
      })

      return formattedPost
    } catch (error) {
      console.error('❌ Error creating post:', error)
      throw error
    }
  }

  /**
   * 更新帖子
   */
  async updatePost(id: string, data: UpdatePostData, userId: string): Promise<any> {
    try {
      // 验证权限
      const existingPost = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true }
      })

      if (!existingPost || existingPost.authorId !== userId) {
        throw new Error('Unauthorized to update this post')
      }

      // 更新帖子
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          ...data,
          tags: data.tags?.join(','),
          updatedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              githubLogin: true,
              isVerified: true
            }
          }
        }
      })

      const formattedPost = this.formatPost(updatedPost)

      // 更新缓存
      const cacheKey = `post:${id}`
      await cacheManager.set(cacheKey, formattedPost, {
        strategy: CacheStrategy.WRITE_THROUGH,
        ttl: 10 * 60 * 1000,
        tags: ['posts', `post:${id}`]
      })

      // 失效列表缓存
      await this.invalidatePostListCaches()

      // 发送实时事件
      await this.broadcastRealtimeEvent(RealtimeEventType.POST_UPDATED, {
        post: formattedPost,
        authorId: userId
      })

      return formattedPost
    } catch (error) {
      console.error(`❌ Error updating post ${id}:`, error)
      throw error
    }
  }

  /**
   * 删除帖子
   */
  async deletePost(id: string, userId: string): Promise<boolean> {
    try {
      // 验证权限
      const existingPost = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true }
      })

      if (!existingPost || existingPost.authorId !== userId) {
        throw new Error('Unauthorized to delete this post')
      }

      // 删除帖子
      await prisma.post.delete({
        where: { id }
      })

      // 删除缓存
      await cacheManager.delete(`post:${id}`)
      if (this.redisCache) {
        await this.redisCache.delete(`post:${id}`)
      }

      // 失效相关缓存
      await this.invalidatePostListCaches()

      // 发送实时事件
      await this.broadcastRealtimeEvent(RealtimeEventType.POST_DELETED, {
        postId: id,
        authorId: userId
      })

      return true
    } catch (error) {
      console.error(`❌ Error deleting post ${id}:`, error)
      throw error
    }
  }

  // ========== 私有方法 ==========

  private formatPost(post: any): any {
    return {
      id: post.id,
      developer: {
        id: post.author.id,
        name: post.author.name || 'Unknown User',
        username: `@${post.author.githubLogin || post.author.name?.toLowerCase().replace(/\s+/g, '') || 'user'}`,
        avatar: post.author.image || '',
        isVerified: post.author.isVerified,
        subscriptionPrice: 29
      },
      content: post.content,
      images: post.images || [], // 修复：使用真实的images数据
      likes: post._count?.likes || post.likeCount || 0,
      comments: post._count?.comments || post.commentCount || 0,
      timestamp: this.formatTimeAgo(post.createdAt),
      // 点赞API与Post绑定：直接从查询结果获取点赞状态
      isLiked: post.likes && post.likes.length > 0,
      isPrivate: !post.isPublic,
      authorId: post.authorId,
      tags: post.tags ? post.tags.split(',').filter((tag: string) => tag.trim()) : [],
      starVotes: post._count?.starVotes || post.starCount || 0,
      userStarVotes: {},
      viewCount: post.viewCount || 0
    }
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    return `${Math.floor(diffInSeconds / 86400)}天前`
  }

  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .filter(key => params[key] !== undefined)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    
    return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`
  }

  private async invalidatePostListCaches(): Promise<void> {
    console.log('🗑️ PostService - 开始失效帖子列表缓存')

    try {
      // 失效标签相关的缓存
      await cacheManager.invalidateByTags(['posts:list', 'posts'])

      if (this.redisCache) {
        await this.redisCache.deleteByTags(['posts:list', 'posts'])
        await this.redisCache.publishInvalidation(
          CacheNamespace.POSTS,
          ['posts:list', 'posts']
        )
      }

      // 清除浏览器本地缓存
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('posts-') || key.startsWith('feed-')) {
            localStorage.removeItem(key)
            console.log('🗑️ 清除本地缓存:', key)
          }
        })
      }

      console.log('✅ PostService - 缓存失效完成')
    } catch (error) {
      console.error('❌ PostService - 缓存失效失败:', error)
    }
  }

  private async incrementViewCount(postId: string): Promise<void> {
    // 异步增加浏览量，不阻塞主流程
    prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } }
    }).catch(error => {
      console.error('❌ Error incrementing view count:', error)
    })
  }

  private async broadcastRealtimeEvent(
    type: RealtimeEventType,
    data: any
  ): Promise<void> {
    try {
      const event = {
        type,
        data,
        timestamp: Date.now(),
        version: 1
      }

      realtimeSyncManager.broadcast(event)
    } catch (error) {
      console.error('❌ Error broadcasting realtime event:', error)
    }
  }
}

// 创建帖子服务实例
export const postService = new PostService()
