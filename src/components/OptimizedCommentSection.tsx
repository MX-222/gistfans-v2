'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cachedFetch, CACHE_TTL, apiCache } from '@/lib/apiCache'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
    image?: string
  }
  likes: number
  isLiked: boolean
  replies?: Comment[]
}

interface OptimizedCommentSectionProps {
  postId: string
  className?: string
}

export default function OptimizedCommentSection({ postId, className = '' }: OptimizedCommentSectionProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取评论
  const fetchComments = async () => {
    if (!postId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await cachedFetch(`/api/comments?postId=${postId}`, undefined, CACHE_TTL.SHORT)
      
      if (data.success) {
        setComments(data.comments || [])
      } else {
        setError(data.error || '获取评论失败')
      }
    } catch (error) {
      console.error('获取评论失败:', error)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 移除自动加载，改为懒加载
  // useEffect(() => {
  //   fetchComments()
  // }, [postId])

  // 提交评论
  const handleSubmitComment = async () => {
    if (!session) {
      alert('请先登录')
      return
    }

    if (!newComment.trim()) {
      alert('请输入评论内容')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: postId,
          content: newComment.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // 清除相关缓存
        apiCache.delete(`/api/comments?postId=${postId}`)
        
        // 重新获取评论
        await fetchComments()
        
        // 清空输入框
        setNewComment('')
        
        console.log('评论提交成功')
      } else {
        setError(data.error || '评论提交失败')
      }
    } catch (error) {
      console.error('评论提交失败:', error)
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 点赞评论
  const handleLikeComment = async (commentId: string) => {
    if (!session) {
      alert('请先登录')
      return
    }

    // 乐观更新
    setComments(prevComments =>
      prevComments.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
            }
          : comment
      )
    )

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!data.success) {
        // 回滚更新
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId
              ? {
                  ...comment,
                  isLiked: !comment.isLiked,
                  likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
                }
              : comment
          )
        )
        console.error('点赞失败:', data.error)
      }
    } catch (error) {
      // 回滚更新
      setComments(prevComments =>
        prevComments.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
              }
            : comment
        )
      )
      console.error('点赞失败:', error)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComments}
            className="mt-2"
          >
            重试
          </Button>
        </div>
      )}

      {/* 评论输入 */}
      {session && (
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的评论..."
            className="min-h-[80px]"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              size="sm"
            >
              {submitting ? '发布中...' : '发布评论'}
            </Button>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">加载评论中...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无评论，来发表第一条评论吧！
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <img
                  src={comment.user.image || '/default-avatar.png'}
                  alt={comment.user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{comment.user.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
                  <div className="mt-2 flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center space-x-1 text-xs ${
                        comment.isLiked ? 'text-red-500' : 'text-gray-500'
                      } hover:text-red-500 transition-colors`}
                      disabled={!session}
                    >
                      <span>{comment.isLiked ? '❤️' : '🤍'}</span>
                      <span>{comment.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
