import { prisma } from '@/lib/database/unified-prisma'
import { Prisma } from '@prisma/client'

export interface CreateCommentData {
  postId: string
  userId: string
  content: string
  parentId?: string
}

export interface CommentQueryOptions {
  postId: string
  page: number
  limit: number
  sort: 'latest' | 'oldest' | 'popular'
  parentId?: string
}

// 评论数据访问层
export class CommentDAL {
  // 创建评论
  static async createComment(data: CreateCommentData) {
    return await prisma.$transaction(async (tx) => {
      // 验证帖子存在
      const post = await tx.post.findUnique({
        where: { id: data.postId, status: 'PUBLISHED' }
      })
      
      if (!post) {
        throw new Error('帖子不存在或已删除')
      }

      // 验证父评论（如果是回复）
      let depth = 0
      if (data.parentId) {
        const parentComment = await tx.comment.findUnique({
          where: { id: data.parentId }
        })
        
        if (!parentComment || parentComment.postId !== data.postId) {
          throw new Error('父评论不存在或不属于此帖子')
        }
        
        // 计算深度（最多3级）
        depth = await this.calculateCommentDepth(tx, data.parentId)
        if (depth >= 3) {
          throw new Error('回复层级不能超过3级')
        }
      }

      // 创建评论
      const comment = await tx.comment.create({
        data: {
          postId: data.postId,
          userId: data.userId,
          content: data.content,
          parentId: data.parentId || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isVerified: true
            }
          }
        }
      })

      // 更新父评论回复数量（如果是回复）
      if (data.parentId) {
        await tx.comment.update({
          where: { id: data.parentId },
          data: { likes: { increment: 0 } } // 这里应该有replyCount字段，暂时用likes代替
        })
      }

      // 更新帖子评论数量
      await tx.post.update({
        where: { id: data.postId },
        data: { commentCount: { increment: 1 } }
      })

      return comment
    })
  }

  // 获取评论列表
  static async getComments(options: CommentQueryOptions) {
    const { postId, page, limit, sort, parentId } = options
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: Prisma.CommentWhereInput = {
      postId,
      parentId: parentId || null
    }

    // 构建排序条件
    let orderBy: Prisma.CommentOrderByWithRelationInput
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' }
        break
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'popular':
        orderBy = { likes: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    // 查询评论
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isVerified: true
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  isVerified: true
                }
              }
            },
            orderBy: { createdAt: 'asc' },
            take: 3 // 只返回前3条回复，更多通过单独API获取
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.comment.count({ where })
    ])

    return {
      comments,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  // 获取单个评论
  static async getCommentById(id: string) {
    return await prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isVerified: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                isVerified: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  }

  // 更新评论
  static async updateComment(id: string, content: string) {
    return await prisma.comment.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            isVerified: true
          }
        }
      }
    })
  }

  // 删除评论（软删除）
  static async deleteComment(id: string) {
    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id },
        select: { postId: true, parentId: true }
      })

      if (!comment) {
        throw new Error('评论不存在')
      }

      // 删除评论（这里应该是软删除，但当前模型没有deletedAt字段）
      await tx.comment.delete({
        where: { id }
      })

      // 更新帖子评论数量
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } }
      })

      // 更新父评论回复数量（如果是回复）
      if (comment.parentId) {
        // 这里应该减少父评论的回复数量
      }

      return { success: true }
    })
  }

  // 点赞评论
  static async likeComment(commentId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findUnique({
        where: { id: commentId },
        select: { likes: true, likedBy: true }
      })

      if (!comment) {
        throw new Error('评论不存在')
      }

      const isLiked = comment.likedBy.includes(userId)
      
      if (isLiked) {
        // 取消点赞
        await tx.comment.update({
          where: { id: commentId },
          data: {
            likes: { decrement: 1 },
            likedBy: comment.likedBy.filter(id => id !== userId)
          }
        })
        return { liked: false, likes: comment.likes - 1 }
      } else {
        // 点赞
        await tx.comment.update({
          where: { id: commentId },
          data: {
            likes: { increment: 1 },
            likedBy: [...comment.likedBy, userId]
          }
        })
        return { liked: true, likes: comment.likes + 1 }
      }
    })
  }

  // 检查评论权限
  static async checkCommentPermission(commentId: string, userId: string): Promise<boolean> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { userId: true }
    })

    if (!comment) return false

    // 检查是否是作者
    if (comment.userId === userId) return true

    // 检查是否是管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    return user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  }

  // 计算评论深度
  private static async calculateCommentDepth(tx: any, commentId: string): Promise<number> {
    let depth = 0
    let currentId = commentId

    while (currentId && depth < 10) { // 防止无限循环
      const comment = await tx.comment.findUnique({
        where: { id: currentId },
        select: { parentId: true }
      })

      if (!comment || !comment.parentId) break
      
      depth++
      currentId = comment.parentId
    }

    return depth
  }
}
