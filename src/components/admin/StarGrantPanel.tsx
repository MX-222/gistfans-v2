"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, User, Gift, AlertCircle, CheckCircle } from "lucide-react"
import UserSearchSelect from './UserSearchSelect'

interface UserInfo {
  id: string
  name: string | null
  email: string | null
  githubLogin: string | null
  role: string
  isVerified: boolean
  starBalance?: {
    availableStars: number
    totalStars: number
  }
}

interface StarGrantResult {
  success: boolean
  data?: {
    granted: number
    transactionId: string
    targetBalance: {
      availableStars: number
      totalStars: number
    }
    targetUser: {
      name: string | null
      email: string | null
    }
  }
  message: string
}

export default function StarGrantPanel() {
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [relatedId, setRelatedId] = useState('')
  const [relatedType, setRelatedType] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<StarGrantResult | null>(null)

  const handleGrantStars = async () => {
    if (!selectedUser || !amount || !reason) {
      setResult({
        success: false,
        message: '请选择用户并填写所有必需字段'
      })
      return
    }

    const starAmount = parseInt(amount)
    if (isNaN(starAmount) || starAmount <= 0 || starAmount > 100) {
      setResult({
        success: false,
        message: 'Star数量必须在1-100之间'
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      // 获取管理员令牌
      const adminToken = localStorage.getItem('admin-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-admin': 'true' // 开发模式下的管理员权限
      }

      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`
        headers['x-admin-token'] = adminToken
      }

      const response = await fetch('/api/admin/grant-stars', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          amount: starAmount,
          reason,
          relatedId: relatedId || undefined,
          relatedType: relatedType || undefined
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // 清空表单
        setSelectedUser(null)
        setAmount('')
        setReason('')
        setRelatedId('')
        setRelatedType('')
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : '赠送Star失败'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="h-5 w-5" />
            管理员Star赠送
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 目标用户选择 */}
          <div className="space-y-2">
            <Label className="text-white">
              目标用户 <span className="text-red-400">*</span>
            </Label>
            <UserSearchSelect
              onUserSelect={setSelectedUser}
              selectedUser={selectedUser}
              onClear={() => setSelectedUser(null)}
            />
          </div>

          {/* Star数量 */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">
              Star数量 (1-100) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="输入Star数量"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* 赠送原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-white">
              赠送原因 <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明赠送Star的原因..."
              className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          {/* 关联ID（可选） */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="relatedId" className="text-white">
                关联ID（可选）
              </Label>
              <Input
                id="relatedId"
                value={relatedId}
                onChange={(e) => setRelatedId(e.target.value)}
                placeholder="帖子ID、评论ID等"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relatedType" className="text-white">
                关联类型（可选）
              </Label>
              <Input
                id="relatedType"
                value={relatedType}
                onChange={(e) => setRelatedType(e.target.value)}
                placeholder="post、comment等"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <Button
            onClick={handleGrantStars}
            disabled={isLoading || !selectedUser || !amount || !reason}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                赠送中...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                赠送Star
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 结果显示 */}
      {result && (
        <Alert className={`${result.success ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className={result.success ? 'text-green-400' : 'text-red-400'}>
              {result.message}
            </AlertDescription>
          </div>
          
          {result.success && result.data && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-300">
                <User className="h-4 w-4" />
                <span>用户: {result.data.targetUser.name || result.data.targetUser.email}</span>
              </div>
              <div className="flex items-center gap-2 text-green-300">
                <Star className="h-4 w-4" />
                <span>赠送: {result.data.granted} Star</span>
              </div>
              <div className="flex items-center gap-2 text-green-300">
                <Badge variant="outline" className="text-green-300 border-green-500">
                  新余额: {result.data.targetBalance.availableStars} Star
                </Badge>
              </div>
              <div className="text-xs text-green-400">
                交易ID: {result.data.transactionId}
              </div>
            </div>
          )}
        </Alert>
      )}

      {/* 使用说明 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-2">
          <p>• 管理员可以为任何用户赠送1-100个Star</p>
          <p>• 赠送的Star没有每日限制，但需要详细说明原因</p>
          <p>• 所有赠送操作都会记录在审计日志中</p>
          <p>• 关联ID和类型用于标记赠送与特定内容的关系</p>
        </CardContent>
      </Card>
    </div>
  )
}
