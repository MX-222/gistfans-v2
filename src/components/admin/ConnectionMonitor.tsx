'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Activity, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ConnectionHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'CLEANUP_NEEDED'
  totalConnections: number
  activeConnections: number
  idleConnections: number
  zombieConnections: number
  utilizationPercentage: number
  maxConnections: number
  lastCheck: Date
}

interface CleanupResult {
  terminated_count: number
  idle_threshold: number
  max_allowed: number
  execution_time: string
}

export default function ConnectionMonitor() {
  const [health, setHealth] = useState<ConnectionHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取连接健康状态
  const fetchHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.rpc('monitor_connections')
      
      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const result = data[0]
        setHealth({
          status: result.status,
          totalConnections: result.total_conn,
          activeConnections: result.active_conn,
          idleConnections: result.idle_conn,
          zombieConnections: result.zombie_conn,
          utilizationPercentage: parseFloat(result.utilization_pct),
          maxConnections: result.max_conn,
          lastCheck: new Date()
        })
      }
    } catch (err) {
      console.error('Failed to fetch connection health:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch connection health')
    } finally {
      setLoading(false)
    }
  }

  // 执行连接清理
  const performCleanup = async (idleThreshold: number = 15, maxTerminations: number = 10) => {
    try {
      setCleanupLoading(true)
      setError(null)
      
      const { data, error } = await supabase.rpc('terminate_idle_connections', {
        idle_threshold_minutes: idleThreshold,
        max_terminations: maxTerminations
      })
      
      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        setLastCleanup(data[0])
        // 清理后重新获取健康状态
        setTimeout(fetchHealth, 1000)
      }
    } catch (err) {
      console.error('Failed to perform cleanup:', err)
      setError(err instanceof Error ? err.message : 'Failed to perform cleanup')
    } finally {
      setCleanupLoading(false)
    }
  }

  // 紧急重置
  const emergencyReset = async () => {
    if (!confirm('确定要执行紧急重置吗？这将终止所有空闲连接。')) {
      return
    }
    
    await performCleanup(0, 50)
  }

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000) // 30秒刷新一次
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // 初始加载
  useEffect(() => {
    fetchHealth()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-50'
      case 'WARNING': return 'text-yellow-600 bg-yellow-50'
      case 'CLEANUP_NEEDED': return 'text-orange-600 bg-orange-50'
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="h-4 w-4" />
      case 'WARNING': return <AlertTriangle className="h-4 w-4" />
      case 'CLEANUP_NEEDED': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <XCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">连接池监控</h2>
          <p className="text-muted-foreground">实时监控数据库连接池状态</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {health && (
        <>
          {/* 状态概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>连接池状态</span>
                <Badge className={getStatusColor(health.status)}>
                  {getStatusIcon(health.status)}
                  <span className="ml-1">{health.status}</span>
                </Badge>
              </CardTitle>
              <CardDescription>
                最后检查: {health.lastCheck.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {health.totalConnections}
                  </div>
                  <div className="text-sm text-muted-foreground">总连接数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {health.activeConnections}
                  </div>
                  <div className="text-sm text-muted-foreground">活跃连接</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {health.idleConnections}
                  </div>
                  <div className="text-sm text-muted-foreground">空闲连接</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {health.zombieConnections}
                  </div>
                  <div className="text-sm text-muted-foreground">僵尸连接</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">利用率</span>
                  <span className="text-sm font-medium">
                    {health.utilizationPercentage.toFixed(1)}% 
                    ({health.totalConnections}/{health.maxConnections})
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      health.utilizationPercentage > 90 ? 'bg-red-500' :
                      health.utilizationPercentage > 80 ? 'bg-orange-500' :
                      health.utilizationPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(health.utilizationPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作面板 */}
          <Card>
            <CardHeader>
              <CardTitle>连接管理操作</CardTitle>
              <CardDescription>
                执行连接清理和维护操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => performCleanup(15, 10)}
                  disabled={cleanupLoading}
                  variant="outline"
                >
                  {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  标准清理 (15分钟)
                </Button>
                <Button
                  onClick={() => performCleanup(5, 15)}
                  disabled={cleanupLoading}
                  variant="outline"
                >
                  {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  积极清理 (5分钟)
                </Button>
                <Button
                  onClick={emergencyReset}
                  disabled={cleanupLoading}
                  variant="destructive"
                >
                  {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  紧急重置
                </Button>
              </div>
              
              {lastCleanup && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="text-sm">
                    <strong>最近清理结果:</strong> 终止了 {lastCleanup.terminated_count} 个连接
                    (阈值: {lastCleanup.idle_threshold}分钟, 
                    时间: {new Date(lastCleanup.execution_time).toLocaleString()})
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
