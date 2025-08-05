/**
 * 分享按钮组件 - 支持多平台分享和star奖励
 * 
 * 用途：提供帖子分享功能，支持多个社交平台分享，集成每日首次分享star奖励
 * 
 * 核心功能：
 * - 多平台分享支持（微信、微博、Twitter、复制链接等）
 * - 调用分享API记录分享行为
 * - 显示分享成功提示和star奖励信息
 * - 响应式设计和无障碍支持
 * 
 * 系统架构位置：UI组件层，连接用户分享操作和后端分享API
 * 
 * 主要依赖：
 * - React - 组件框架
 * - Lucide React - 图标库
 * - Tailwind CSS - 样式框架
 * 
 * @author GistFans Team
 * @version 1.0
 * @since 2025-08-04
 */

'use client'

import { useState } from 'react'
import { Share2, Copy, MessageCircle, Twitter, Link, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ShareButtonProps {
  postId: string
  postTitle?: string
  postContent?: string
  className?: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
}

export default function ShareButton({
  postId,
  postTitle = '',
  postContent = '',
  className = '',
  variant = 'ghost',
  size = 'sm'
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  // 生成分享URL
  const shareUrl = `${window.location.origin}/posts/${postId}`
  const shareText = postTitle || postContent.substring(0, 100) + '...'

  // 处理分享到指定平台
  const handleShare = async (platform: string, url?: string) => {
    setIsSharing(true)

    try {
      // 调用分享API记录分享行为
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          shareUrl: url || shareUrl
        })
      })

      const data = await response.json()

      if (data.success) {
        // 显示分享成功提示
        let message = '分享成功！'
        
        // 如果获得了star奖励，显示奖励信息
        if (data.data.starReward) {
          message += ` 🌟 获得 ${data.data.starReward.earned} 个Star奖励！`
        }
        
        toast.success(message)

        // 如果有外部URL，打开分享页面
        if (url) {
          window.open(url, '_blank', 'width=600,height=400')
        }
      } else {
        toast.error(data.error || '分享失败')
      }
    } catch (error) {
      console.error('分享失败:', error)
      toast.error('分享失败，请稍后重试')
    } finally {
      setIsSharing(false)
    }
  }

  // 复制链接到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      await handleShare('clipboard')
    } catch (error) {
      console.error('复制失败:', error)
      toast.error('复制失败')
    }
  }

  // 分享到微博
  const shareToWeibo = () => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`
    handleShare('weibo', weiboUrl)
  }

  // 分享到Twitter
  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    handleShare('twitter', twitterUrl)
  }

  // 使用Web Share API（如果支持）
  const useWebShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          url: shareUrl
        })
        await handleShare('web-share-api')
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Web Share API失败:', error)
          toast.error('分享失败')
        }
      }
    }
  }

  // 检查是否支持Web Share API
  const supportsWebShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center space-x-1 ${className}`}
          disabled={isSharing}
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">分享</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {/* Web Share API（移动端优先） */}
        {supportsWebShare && (
          <DropdownMenuItem onClick={useWebShare} className="flex items-center space-x-2">
            <Share2 className="w-4 h-4" />
            <span>系统分享</span>
          </DropdownMenuItem>
        )}

        {/* 复制链接 */}
        <DropdownMenuItem onClick={copyToClipboard} className="flex items-center space-x-2">
          <Copy className="w-4 h-4" />
          <span>复制链接</span>
        </DropdownMenuItem>

        {/* 分享到微博 */}
        <DropdownMenuItem onClick={shareToWeibo} className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <span>分享到微博</span>
        </DropdownMenuItem>

        {/* 分享到Twitter */}
        <DropdownMenuItem onClick={shareToTwitter} className="flex items-center space-x-2">
          <Twitter className="w-4 h-4" />
          <span>分享到Twitter</span>
        </DropdownMenuItem>

        {/* 获取分享链接 */}
        <DropdownMenuItem 
          onClick={() => handleShare('link-generation')} 
          className="flex items-center space-x-2"
        >
          <Link className="w-4 h-4" />
          <span>生成分享链接</span>
        </DropdownMenuItem>

        {/* 分享奖励提示 */}
        <div className="px-2 py-1 text-xs text-gray-500 border-t">
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3" />
            <span>每日首次分享获得1⭐</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
