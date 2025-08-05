import { prisma } from '@/lib/database/unified-prisma'
import { Prisma } from '@prisma/client'

export interface CreatePostData {
  authorId: string
  title: string
  content: string
  tags: string[]
  isPrivate: boolean
  excerpt?: string
}

export interface UpdatePostData {
  title?: string
  content?: string
  tags?: string[]
  isPrivate?: boolean
  excerpt?: string
}

export interface PostQueryOptions {
  page: number
  limit: number
  userId?: string
  tag?: string
  search?: string
  sort: 'latest' | 'popular' | 'trending'
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
}

// 帖子数据访问层
export class PostDAL {
  // 创建帖子
  static async createPost(data: CreatePostData) {
    return await prisma.$transaction(async (tx) => {
      // 创建帖子
      const post = await tx.post.create({
        data: {
          authorId: data.authorId,
          title: data.title,
          content: data.content,
          excerpt: data.excerpt || data.content.substring(0, 200),
          tags: data.tags.join(','),
          isPublic: !data.isPrivate,
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
          },
          _count: {
            select: {
              comments: true,
              likes: true,
              starVotes: true
            }
          }
        }
      })

      // 更新用户帖子计数（如果有相关字段）
      // await tx.user.update({
      //   where: { id: data.authorId },
      //   data: { postCount: { increment: 1 } }
      // })

      return post
    })
  }

  // 获取帖子列表
  static async getPosts(options: PostQueryOptions) {
    const { page, limit, userId, tag, search, sort, status } = options
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Prisma.PostWhereInput = {
      status,
      ...(userId && { authorId: userId }),
      ...(tag && { tags: { contains: tag } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    // 构建排序条件
    let orderBy: Prisma.PostOrderByWithRelationInput
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' }
        break
      case 'popular':
        orderBy = { likeCount: 'desc' }
        break
      case 'trending':
        orderBy = { starCount: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    // 并行查询帖子和总数
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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
          _count: {
            select: {
              comments: true,
              likes: true,
              starVotes: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.post.count({ where })
    ])

    return {
      posts,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  // 获取单个帖子
  static async getPostById(id: string) {
    return await prisma.post.findUnique({
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
        _count: {
          select: {
            comments: true,
            likes: true,
            starVotes: true
          }
        }
      }
    })
  }

  // 更新帖子
  static async updatePost(id: string, data: UpdatePostData) {
    return await prisma.post.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.excerpt && { excerpt: data.excerpt }),
        ...(data.tags && { tags: data.tags.join(',') }),
        ...(data.isPrivate !== undefined && { isPublic: !data.isPrivate }),
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
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            starVotes: true
          }
        }
      }
    })
  }

  // 软删除帖子
  static async deletePost(id: string) {
    return await prisma.post.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedAt: new Date()
      }
    })
  }

  // 检查帖子权限
  static async checkPostPermission(postId: string, userId: string): Promise<boolean> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    })

    if (!post) return false

    // 检查是否是作者
    if (post.authorId === userId) return true

    // 检查是否是管理员（需要用户角色信息）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    return user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  }
}
