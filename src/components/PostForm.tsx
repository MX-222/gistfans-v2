"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"
import { getAvailableTags } from '@/utils/tags'
import { useStar } from '@/contexts/StarContext'
import { 
  Image, 
  Lock, 
  Globe, 
  X,
  Upload,
  Tag,
  Plus
} from "lucide-react"

interface PostFormProps {
  onSubmit: (post: {
    content: string
    images: string[]
    isPrivate: boolean
    tags: string[]
  }) => void
  onCancel: () => void
}

export default function PostForm({ onSubmit, onCancel }: PostFormProps) {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const { earnStars } = useStar()
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const availableTags = getAvailableTags(language)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      images,
      isPrivate,
      tags: selectedTags
    })

    // 发帖获得Star奖励
    earnStars('post_share', undefined, '发布帖子获得Star奖励')

    // 重置表单
    setContent("")
    setImages([])
    setIsPrivate(false)
    setImageUrl("")
    setSelectedTags([])
    setShowTagSelector(false)
  }

  const handleAddImage = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()])
      setImageUrl("")
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型，请上传 JPG、PNG、GIF 或 WebP 格式的图片')
      return
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('文件大小不能超过 5MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '上传失败')
      }

      if (result.success && result.data.url) {
        setImages([...images, result.data.url])
        setUploadProgress(100)

        // 清空文件输入
        event.target.value = ''
      } else {
        throw new Error('上传失败，请重试')
      }

    } catch (error) {
      console.error('图片上传失败:', error)
      alert(error instanceof Error ? error.message : '图片上传失败，请重试')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e)
    }
  }

  // 处理粘贴事件
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 检查是否是图片
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()

        const file = item.getAsFile()
        if (!file) continue

        // 验证文件大小
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
          alert('粘贴的图片大小不能超过 5MB')
          continue
        }

        setIsUploading(true)
        setUploadProgress(0)

        try {
          const formData = new FormData()
          formData.append('file', file)

          const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || '上传失败')
          }

          if (result.success && result.data.url) {
            setImages([...images, result.data.url])
            setUploadProgress(100)

            // 显示成功提示
            console.log('图片粘贴上传成功')
          } else {
            throw new Error('上传失败，请重试')
          }

        } catch (error) {
          console.error('粘贴图片上传失败:', error)
          alert(error instanceof Error ? error.message : '粘贴图片上传失败，请重试')
        } finally {
          setIsUploading(false)
          setUploadProgress(0)
        }

        break // 只处理第一张图片
      }
    }
  }

  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleTagRemove = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <Card className="bg-gray-900 border-gray-800 mb-6 transform transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10 ring-2 ring-blue-500/20 transition-all duration-200">
            <img 
              src={session?.user?.image || ""} 
              alt={session?.user?.name || ""} 
              className="rounded-full" 
            />
          </Avatar>
          <div>
            <CardTitle className="text-white text-lg flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              <span>{t('publish_post')}</span>
            </CardTitle>
            <p className="text-sm text-gray-400">{t('share_thoughts')}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 内容输入 */}
          <div>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                placeholder={`${t('post_content')} (支持直接粘贴图片)`}
                className="w-full min-h-[120px] p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                maxLength={2000}
              />
              {content.length > 0 && (
                <div className="absolute top-2 right-2 opacity-50">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-sm transition-colors ${
                content.length > 1800 ? 'text-red-400' : 
                content.length > 1500 ? 'text-yellow-400' : 
                'text-gray-500'
              }`}>
                {content.length}/2000 {t('character_count')}
              </span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                Ctrl + Enter {t('publish_post')}
              </span>
            </div>
          </div>

          {/* 图片添加 */}
          <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Upload size={16} className="text-blue-400" />
                <span>添加图片</span>
              </div>
              <span className="text-xs text-blue-400">📎 支持直接粘贴</span>
            </div>

            {/* 文件上传按钮 */}
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all duration-200 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload size={16} />
                <span>{isUploading ? '上传中...' : '选择图片文件'}</span>
              </label>
              <span className="text-xs text-gray-400">
                支持 JPG、PNG、GIF、WebP，最大 5MB
              </span>
            </div>

            {/* 上传进度 */}
            {isUploading && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {/* URL输入方式 */}
            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-400 mb-2">或者输入图片链接：</div>
              <div className="flex items-center space-x-2">
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('image_url')}
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
                <Button
                  type="button"
                  onClick={handleAddImage}
                  disabled={!imageUrl.trim()}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 transition-all duration-200 hover:border-blue-500"
                >
                  <Upload size={16} className="mr-1" />
                  {t('add_image')}
                </Button>
              </div>
            </div>

            {/* 图片预览 */}
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>已添加 {images.length} 张图片</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img, index) => (
                    <div key={index} className="relative group transform transition-all duration-200 hover:scale-105">
                      <img 
                        src={img} 
                        alt={`预览 ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 标签选择 */}
          <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag size={16} className="text-purple-400" />
                <span className="text-sm text-gray-300">{t('select_tags')}：</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTagSelector(!showTagSelector)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 transition-all duration-200 hover:border-purple-500"
              >
                <Tag size={16} className="mr-1" />
                {showTagSelector ? t('close') : t('select_tags')}
              </Button>
            </div>

            {/* 已选择的标签 */}
            {selectedTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>已选择 {selectedTags.length}/3 个标签</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm transform transition-all duration-200 hover:scale-105">
                      <Tag size={12} />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-all duration-200"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 标签选择器 */}
            {showTagSelector && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagSelect(tag)}
                      disabled={selectedTags.length >= 3 && !selectedTags.includes(tag)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 transform hover:scale-105 ${
                        selectedTags.includes(tag)
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : selectedTags.length >= 3
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length >= 3 && (
                  <p className="text-yellow-400 text-xs mt-2 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>{t('max_tags_reached')}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 可见性设置 */}
          <div className="flex items-center space-x-4 p-3 bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-300">{t('post_visibility')}：</span>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={!isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center space-x-2 ${
                  !isPrivate 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                                  <Globe size={16} />
                  <span>{t('public')}</span>
              </Button>
              <Button
                type="button"
                variant={isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center space-x-2 ${
                  isPrivate 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                                  <Lock size={16} />
                  <span>{t('subscribers_only')}</span>
              </Button>
            </div>
          </div>

          {/* 可见性说明 */}
          <div className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
            {isPrivate ? (
              <div className="flex items-center space-x-2">
                <Lock size={14} className="text-yellow-500" />
                <span>只有订阅了你的用户才能看到这个帖子</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Globe size={14} className="text-green-500" />
                <span>所有用户都可以看到这个帖子</span>
              </div>
            )}
          </div>

          {/* 贡献提示 */}
          <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 font-medium">
                💡 每一次发布都是一次贡献
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              {language === 'zh' 
                ? '您的知识分享将帮助更多开发者成长，感谢您为社区做出的贡献！'
                : 'Your knowledge sharing helps more developers grow. Thank you for contributing to our community!'
              }
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!content.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
            >
              {t('publish_post')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 
 