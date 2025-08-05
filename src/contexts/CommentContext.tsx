"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { commentsApi } from '@/lib/apiClient'

export interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  parentId?: string
  likes: number
  likedBy: string[]
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    image: string
  }
  replies?: Comment[]
}

interface CommentContextType {
  comments: Comment[]
  loading: boolean
  addComment: (postId: string | number, content: string, parentId?: string) => Promise<boolean>
  deleteComment: (commentId: string) => Promise<boolean>
  likeComment: (commentId: string) => Promise<boolean>
  getCommentsByPostId: (postId: string | number) => Promise<Comment[]>
  getCommentCount: (postId: string | number) => Promise<number>
  fetchComments: (postId: string | number) => Promise<Comment[]>
}

const CommentContext = createContext<CommentContextType | undefined>(undefined)

export function CommentProvider({ children }: { children: ReactNode }) {
  const { user: currentUser } = useCurrentUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)

  // 获取评论数据
  const fetchComments = async (postId: string | number) => {
    try {
      setLoading(true)
      const response = await commentsApi.getComments(postId.toString())

      if (response.success && response.data && typeof response.data === 'object' && 'comments' in response.data) {
        return (response.data as any).comments
      } else {
        console.error('评论Context - 获取评论失败:', response.error)
        return []
      }
    } catch (error) {
      console.error('评论Context - 获取评论失败:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const addComment = async (postId: string | number, content: string, parentId?: string) => {
    if (!currentUser) {
      console.log('❌ 评论Context - 用户未登录')
      return false
    }

    console.log('📝 评论Context - 准备添加评论:', {
      postId,
      content: content.trim(),
      parentId,
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email
      }
    })

    try {
      const response = await commentsApi.createComment({
        postId: postId.toString(),
        content: content.trim(),
        parentId
      })

      console.log('📝 评论Context - API响应:', response)

      if (response.success) {
        // 刷新评论列表
        const updatedComments = await fetchComments(postId)
        setComments(updatedComments)
        console.log('✅ 评论Context - 评论添加成功')
        return true
      } else {
        console.error('❌ 评论Context - 添加评论失败:', response.error)
        return false
      }
    } catch (error) {
      console.error('❌ 评论Context - 添加评论异常:', error)
      return false
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!currentUser) return false

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        // 从当前评论列表中移除已删除的评论
        setComments(prevComments => 
          prevComments.filter(comment => comment.id !== commentId)
        )
        return true
      } else {
        console.error('删除评论失败:', data.error)
        return false
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      return false
    }
  }

  const likeComment = async (commentId: string) => {
    if (!currentUser?.id) return false

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        // 更新评论列表中的点赞状态
        setComments(prevComments =>
          prevComments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes: data.comment.likes,
                likedBy: Array.isArray(data.comment.likedBy) ? data.comment.likedBy : []
              }
            }
            return comment
          })
        )
        return true
      } else {
        console.error('点赞评论失败:', data.error)
        return false
      }
    } catch (error) {
      console.error('点赞评论失败:', error)
      return false
    }
  }

  const getCommentsByPostId = async (postId: string | number) => {
    try {
      const postComments = await fetchComments(postId)
      
      // 构建评论树结构
      const commentMap = new Map<string, Comment>()
      const rootComments: Comment[] = []
      
      // 先将所有评论放入map
      postComments.forEach((comment: Comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] })
      })
      
      // 构建树结构
      postComments.forEach((comment: Comment) => {
        if (comment.parentId) {
          const parent = commentMap.get(comment.parentId)
          if (parent) {
            parent.replies = parent.replies || []
            parent.replies.push(commentMap.get(comment.id)!)
          }
        } else {
          rootComments.push(commentMap.get(comment.id)!)
        }
      })
      
      // 按时间排序
      rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      rootComments.forEach(comment => {
        if (comment.replies) {
          comment.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        }
      })
      
      return rootComments
    } catch (error) {
      console.error('获取评论失败:', error)
      return []
    }
  }

  const getCommentCount = async (postId: string | number) => {
    try {
      const postComments = await fetchComments(postId)
      return postComments.length
    } catch (error) {
      console.error('获取评论数量失败:', error)
      return 0
    }
  }

  return (
    <CommentContext.Provider value={{
      comments,
      loading,
      addComment,
      deleteComment,
      likeComment,
      getCommentsByPostId,
      getCommentCount,
      fetchComments
    }}>
      {children}
    </CommentContext.Provider>
  )
}

export function useComment() {
  const context = useContext(CommentContext)
  if (context === undefined) {
    throw new Error('useComment must be used within a CommentProvider')
  }
  return context
} 