"use client"

import { useState, useEffect } from 'react'
import { useComment } from '@/contexts/CommentContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { MessageCircle, Send, Heart, Reply, Trash2, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface CommentSectionProps {
  postId: string
  className?: string
}

export default function CommentSection({ postId, className = "" }: CommentSectionProps) {
  const { user: currentUser } = useCurrentUser()
  const { t, language } = useLanguage()
  const { 
    addComment, 
    deleteComment, 
    likeComment, 
    getCommentsByPostId, 
    getCommentCount,
    loading
  } = useComment()
  
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  // 移除showComments，使用isExpanded替代
  const [comments, setComments] = useState<any[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // 评论懒加载体系：用户点击评论按钮后才执行查询
  const handleToggleComments = async () => {
    if (!isExpanded) {
      setIsExpanded(true)
      if (!isLoaded) {
        await loadComments()
      }
    } else {
      setIsExpanded(false)
    }
  }

  const loadComments = async () => {
    if (isLoaded) return // 避免重复加载

    try {
      console.log(`🔄 CommentSection - 懒加载帖子 ${postId} 的评论`)

      // 先检查本地缓存
      const cacheKey = `comments_${postId}`
      const cached = localStorage.getItem(cacheKey)

      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        // 缓存5分钟有效
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log('📦 使用缓存的评论数据:', postId)
          setComments(data.comments || [])
          setCommentCount(data.count || 0)
          setIsLoaded(true)
          return
        }
      }

      const [commentsData, count] = await Promise.all([
        getCommentsByPostId(postId),
        getCommentCount(postId)
      ])

      setComments(commentsData)
      setCommentCount(count)
      setIsLoaded(true)

      // 更新缓存
      localStorage.setItem(cacheKey, JSON.stringify({
        data: { comments: commentsData, count },
        timestamp: Date.now()
      }))

      console.log('✅ 评论数据懒加载完成并缓存:', postId)
    } catch (error) {
      console.error('懒加载评论失败:', error)
      setIsLoaded(true)
    }
  }

  const handleSubmitComment = async () => {
    if (!currentUser) {
      alert(language === 'zh' ? '请先登录后再评论' : 'Please login to comment')
      return
    }

    if (!newComment.trim()) {
      alert(language === 'zh' ? '请输入评论内容' : 'Please enter comment content')
      return
    }

    console.log('📝 CommentSection - 提交评论:', {
      postId,
      content: newComment.trim(),
      userEmail: currentUser.email
    })

    try {
      const success = await addComment(postId, newComment)
      if (success) {
        setNewComment('')

        // 清除缓存并重新加载评论
        const cacheKey = `comments_${postId}`
        localStorage.removeItem(cacheKey)
        setIsLoaded(false)

        await loadComments() // 重新加载评论
        console.log('✅ CommentSection - 评论提交成功')
      } else {
        console.error('❌ CommentSection - 评论提交失败')
        alert(language === 'zh' ? '评论提交失败，请重试' : 'Failed to submit comment, please try again')
      }
    } catch (error) {
      console.error('❌ CommentSection - 评论提交异常:', error)
      alert(language === 'zh' ? '网络错误，请重试' : 'Network error, please try again')
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!currentUser) {
      alert(language === 'zh' ? '请先登录后再回复' : 'Please login to reply')
      return
    }

    if (!replyContent.trim()) {
      alert(language === 'zh' ? '请输入回复内容' : 'Please enter reply content')
      return
    }

    console.log('📝 CommentSection - 提交回复:', {
      postId,
      parentId,
      content: replyContent.trim(),
      userEmail: currentUser.email
    })

    try {
      const success = await addComment(postId, replyContent, parentId)
      if (success) {
        setReplyContent('')
        setReplyingTo(null)
        await loadComments() // 重新加载评论
        console.log('✅ CommentSection - 回复提交成功')
      } else {
        console.error('❌ CommentSection - 回复提交失败')
        alert(language === 'zh' ? '回复提交失败，请重试' : 'Failed to submit reply, please try again')
      }
    } catch (error) {
      console.error('❌ CommentSection - 回复提交异常:', error)
      alert(language === 'zh' ? '网络错误，请重试' : 'Network error, please try again')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (confirm(language === 'zh' ? '确定要删除这条评论吗？' : 'Are you sure you want to delete this comment?')) {
      const success = await deleteComment(commentId)
      if (success) {
        loadComments() // 重新加载评论
      }
    }
  }

  const handleLikeComment = async (commentId: string) => {
    const success = await likeComment(commentId)
    if (success) {
      loadComments() // 重新加载评论
    }
  }

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'zh' ? zhCN : undefined
    })
  }

  const CommentItem = ({ comment, isReply = false }: { comment: any, isReply?: boolean }) => {
    const isOwner = comment.userId === currentUser?.id
    const isLiked = comment.likedBy.includes(currentUser?.id || '')

    return (
      <div className={`${isReply ? 'ml-12 mt-3' : 'mt-4'} first:mt-0`}>
        <div className="flex space-x-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <img 
              src={comment.user.image || ""} 
              alt={comment.user.name || ""} 
              className="rounded-full" 
            />
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-100 text-sm">
                {comment.user.name}
              </span>
              <span className="text-gray-500 text-xs">
                {formatTime(comment.createdAt)}
              </span>
            </div>
            
            <p className="mt-1 text-gray-200 text-sm leading-relaxed">
              {comment.content}
            </p>
            
            <div className="flex items-center space-x-4 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeComment(comment.id)}
                className={`flex items-center space-x-1 text-xs h-6 px-2 ${
                  isLiked ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                <span>{comment.likes}</span>
              </Button>
              
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center space-x-1 text-xs h-6 px-2 text-gray-400"
                >
                  <Reply size={14} />
                  <span>{language === 'zh' ? '回复' : 'Reply'}</span>
                </Button>
              )}
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="flex items-center space-x-1 text-xs h-6 px-2 text-red-400"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
            
            {/* 回复输入框 */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={language === 'zh' ? '写下你的回复...' : 'Write your reply...'}
                  className="w-full p-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                  rows={2}
                  maxLength={500}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent('')
                    }}
                    className="text-xs"
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyContent.trim()}
                    className="text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    <Send size={12} className="mr-1" />
                    {language === 'zh' ? '回复' : 'Reply'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* 子评论 */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply: any) => (
                  <CommentItem key={reply.id} comment={reply} isReply={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* 评论懒加载触发按钮 */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={handleToggleComments}
          className="flex items-center space-x-2 text-gray-400 hover:text-gray-200"
        >
          <MessageCircle size={20} />
          <span>
            {isLoaded ? commentCount : '?'} {language === 'zh' ? '条评论' : 'comments'}
            {!isExpanded && ' (点击加载)'}
          </span>
        </Button>
      </div>

      {isExpanded && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">
              {language === 'zh' ? '评论' : 'Comments'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 评论输入框 */}
            {currentUser ? (
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <img 
                    src={currentUser.image || ""} 
                    alt={currentUser.name || ""} 
                    className="rounded-full" 
                  />
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={language === 'zh' ? '写下你的评论...' : 'Write a comment...'}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                    rows={3}
                    maxLength={1000}
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {newComment.length}/1000
                    </span>
                    
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      size="sm"
                    >
                      <Send size={14} className="mr-1" />
                      {language === 'zh' ? '发表评论' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                {language === 'zh' ? '请先登录后发表评论' : 'Please login to post comments'}
              </div>
            )}
            
            {/* 评论列表 */}
            {comments.length > 0 ? (
              <div className="space-y-4 pt-4 border-t border-gray-800">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
                <p>{language === 'zh' ? '还没有评论，来发表第一条评论吧！' : 'No comments yet. Be the first to comment!'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 