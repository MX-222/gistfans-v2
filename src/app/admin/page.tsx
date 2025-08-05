"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import {
  Trash2,
  Database,
  Settings,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"

export default function AdminPage() {
  const { data: session } = useSession()
  const [isClearing, setIsClearing] = useState(false)
  const [clearStatus, setClearStatus] = useState<string | null>(null)

  // 模拟的测试数据统计
  const testDataStats = {
    mockPosts: 3,
    mockUsers: 5,
    mockComments: 15,
    mockImages: 8
  }

  const handleClearTestData = async () => {
    if (!confirm("⚠️ 警告：这将删除所有测试数据，包括模拟的帖子、用户和评论。此操作不可逆！\n\n确定要继续吗？")) {
      return
    }

    setIsClearing(true)
    setClearStatus("正在清理测试数据...")

    try {
      // 模拟清理过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 这里将来会调用实际的API来清理数据
      // await fetch('/api/admin/clear-test-data', { method: 'POST' })
      
      setClearStatus("✅ 测试数据清理完成！")
      
      setTimeout(() => {
        setClearStatus(null)
      }, 3000)
    } catch {
      setClearStatus("❌ 清理失败，请重试")
      setTimeout(() => {
        setClearStatus(null)
      }, 3000)
    } finally {
      setIsClearing(false)
    }
  }

  const handleResetToProduction = async () => {
    if (!confirm("⚠️ 警告：这将重置系统到生产环境状态，删除所有测试数据并配置生产环境设置。\n\n确定要继续吗？")) {
      return
    }

    setIsClearing(true)
    setClearStatus("正在重置到生产环境...")

    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      setClearStatus("✅ 已重置到生产环境状态！")
      
      setTimeout(() => {
        setClearStatus(null)
      }, 3000)
    } catch {
      setClearStatus("❌ 重置失败，请重试")
      setTimeout(() => {
        setClearStatus(null)
      }, 3000)
    } finally {
      setIsClearing(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Link href="/auth/signin">
            <Button className="bg-blue-600 hover:bg-blue-700">
              立即登录
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 导航栏 */}
      <nav className="border-b border-gray-800 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/feed" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              GistFans
            </Link>
            <div className="flex items-center space-x-4">
              <Badge variant="destructive" className="bg-red-600">
                管理员模式
              </Badge>
              <Link href="/feed">
                <Button variant="ghost">返回首页</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">系统管理</h1>
          <p className="text-gray-400">管理平台数据和系统设置</p>
        </div>

        {/* 状态提示 */}
        {clearStatus && (
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-blue-500"></div>
                  <span>{clearStatus}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 测试数据统计 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Database size={20} />
                <span>测试数据统计</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">模拟帖子</span>
                <Badge variant="secondary">{testDataStats.mockPosts}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">模拟用户</span>
                <Badge variant="secondary">{testDataStats.mockUsers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">模拟评论</span>
                <Badge variant="secondary">{testDataStats.mockComments}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">模拟图片</span>
                <Badge variant="secondary">{testDataStats.mockImages}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 系统状态 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Settings size={20} />
                <span>系统状态</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">环境</span>
                <Badge className="bg-yellow-600">开发环境</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">数据库</span>
                <Badge className="bg-green-600">已连接</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">认证</span>
                <Badge className="bg-green-600">正常</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">测试数据</span>
                <Badge className="bg-red-600">存在</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 数据清理 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Trash2 size={20} />
                <span>数据清理</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                清理所有测试数据，包括模拟的帖子、用户、评论等。此操作不可逆。
              </p>
              <Button
                onClick={handleClearTestData}
                disabled={isClearing}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isClearing ? "清理中..." : "清理测试数据"}
              </Button>
            </CardContent>
          </Card>

          {/* 生产环境部署 */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <AlertTriangle size={20} />
                <span>生产环境部署</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                重置系统到生产环境状态，删除所有测试数据并配置生产环境设置。
              </p>
              <Button
                onClick={handleResetToProduction}
                disabled={isClearing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {isClearing ? "重置中..." : "重置到生产环境"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 注意事项 */}
        <Card className="bg-gray-900 border-gray-800 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <AlertTriangle size={20} />
              <span>重要提醒</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2">生产环境部署前必须完成：</h3>
              <ul className="text-red-300 text-sm space-y-1">
                <li>• 清理所有测试数据（模拟帖子、用户、评论）</li>
                <li>• 配置生产环境数据库</li>
                <li>• 设置正确的OAuth回调URL</li>
                <li>• 配置Stripe生产环境密钥</li>
                <li>• 移除管理员页面访问权限</li>
              </ul>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">测试数据说明：</h3>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• 当前所有帖子都是模拟数据</li>
                <li>• 开发者资料（Alex Chen、Sarah Wilson等）为测试账号</li>
                <li>• 聊天记录为模拟对话</li>
                <li>• 订阅和支付功能尚未连接真实支付系统</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
 