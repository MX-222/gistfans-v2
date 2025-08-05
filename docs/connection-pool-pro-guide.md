# GistFans Pro 连接池管理系统使用指南

## 🎯 系统概述

基于 Supabase Pro 权限的完整连接池管理解决方案，提供：

- **真实的连接终止能力**：利用 Pro 权限执行 `pg_terminate_backend`
- **数据库级监控**：直接查询 `pg_stat_activity` 获取真实连接状态
- **自动化管理**：Edge Function 提供定时清理和紧急恢复
- **智能查询路由**：根据查询类型自动选择最佳执行方式

## 🚀 快速开始

### 1. 部署系统

```bash
# 设置环境变量
export SUPABASE_URL="your-supabase-url"
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_ANON_KEY="your-anon-key"
export DATABASE_URL="your-database-url"

# 执行部署脚本
chmod +x scripts/deploy-connection-monitor.sh
./scripts/deploy-connection-monitor.sh
```

### 2. 在应用中使用

```typescript
import { 
  executeQuery, 
  executeHighPriorityQuery,
  executeTransaction,
  smartQuery,
  getConnectionHealth 
} from '@/lib/prisma-pro'

// 普通查询（自动路由）
const posts = await executeQuery(
  (client) => client.post.findMany(),
  { queryName: 'get_posts', priority: 'normal' }
)

// 高优先级查询（强制使用 Pro 管理器）
const user = await executeHighPriorityQuery(
  (client) => client.user.findUnique({ where: { id: userId } }),
  { queryName: 'get_user', timeout: 10000 }
)

// 事务操作
const result = await executeTransaction(
  async (tx) => {
    const post = await tx.post.create({ data: postData })
    await tx.user.update({ 
      where: { id: userId }, 
      data: { postCount: { increment: 1 } } 
    })
    return post
  },
  { queryName: 'create_post_transaction' }
)

// 智能查询路由
const data = await smartQuery(
  (client) => client.post.findMany(),
  { queryType: 'read', queryName: 'list_posts' }
)
```

## 📊 监控和管理

### API 端点

#### 应用层 API (`/api/admin/connection-pool-pro`)

```bash
# 获取连接管理器状态
GET /api/admin/connection-pool-pro?action=status

# 获取连接池健康状态
GET /api/admin/connection-pool-pro?action=health

# 执行连接清理
GET /api/admin/connection-pool-pro?action=cleanup&idle_threshold=15&max_terminations=10

# 紧急连接池重置
GET /api/admin/connection-pool-pro?action=emergency

# 自动连接池管理
GET /api/admin/connection-pool-pro?action=auto

# 完整监控信息
GET /api/admin/connection-pool-pro?action=monitor
```

#### Edge Function API

```bash
# 基础监控
curl -X GET "$SUPABASE_URL/functions/v1/connection-monitor?action=monitor" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# 健康检查
curl -X GET "$SUPABASE_URL/functions/v1/connection-monitor?action=health" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# 自动管理
curl -X GET "$SUPABASE_URL/functions/v1/connection-monitor?action=auto" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### 程序化管理

```typescript
import { 
  getConnectionHealth,
  cleanupConnections,
  emergencyConnectionReset,
  autoManageConnections 
} from '@/lib/prisma-pro'

// 检查连接池健康状态
const health = await getConnectionHealth()
console.log('连接池状态:', health.status)
console.log('利用率:', health.utilizationPercentage + '%')

// 执行清理
if (health.zombieConnections > 10) {
  const result = await cleanupConnections(15, 10)
  console.log('清理了', result.terminated_count, '个僵尸连接')
}

// 紧急情况处理
if (health.status === 'CRITICAL') {
  await emergencyConnectionReset()
}

// 自动管理
const autoResult = await autoManageConnections()
console.log('自动管理结果:', autoResult.actions_taken)
```

## 🔧 配置选项

### Pro 连接管理器配置

```typescript
const proManager = getProConnectionManager({
  maxConnections: 100,           // Pro 计划连接限制
  zombieThresholdMinutes: 15,    // 僵尸连接阈值
  healthCheckInterval: 30000,    // 健康检查间隔
  autoCleanupEnabled: true,      // 启用自动清理
  connectionTimeout: 10000,      // 连接超时
  queryTimeout: 30000,           // 查询超时
  retryAttempts: 3,              // 重试次数
  edgeFunctionUrl: 'your-edge-function-url'
})
```

### 查询优先级

- **high**: 关键业务查询，强制使用 Pro 管理器
- **normal**: 普通查询，优先使用标准客户端，失败时降级
- **low**: 批量查询，使用队列管理

### 查询类型路由

- **read**: 读取查询，普通优先级
- **write**: 写入查询，高优先级，更多重试
- **transaction**: 事务查询，高优先级，更长超时
- **batch**: 批量查询，低优先级，队列处理

## 📈 监控指标

### 连接池健康状态

```json
{
  "status": "HEALTHY|WARNING|CRITICAL|CLEANUP_NEEDED",
  "totalConnections": 45,
  "activeConnections": 12,
  "idleConnections": 33,
  "zombieConnections": 2,
  "utilizationPercentage": 45.0,
  "maxConnections": 100,
  "lastCheck": "2025-07-30T10:00:00Z"
}
```

### 告警阈值

- **CRITICAL**: 利用率 > 90% 或状态为 CRITICAL
- **WARNING**: 利用率 > 80% 或僵尸连接 > 20
- **CLEANUP_NEEDED**: 僵尸连接 > 10
- **HEALTHY**: 正常状态

## 🚨 故障处理

### 连接池耗尽

```typescript
// 自动处理
await autoManageConnections()

// 手动处理
if (health.utilizationPercentage > 90) {
  await emergencyConnectionReset()
} else if (health.zombieConnections > 10) {
  await cleanupConnections(10, 15)
}
```

### 查询超时

```typescript
// 增加超时时间
await executeQuery(queryFn, { 
  timeout: 60000,  // 60秒
  retries: 5       // 5次重试
})

// 使用事务查询（更长超时）
await executeTransaction(transactionFn, { 
  timeout: 120000  // 2分钟
})
```

### 连接泄漏检测

```typescript
// 监控连接使用情况
const status = getConnectionManagerStatus()
console.log('队列长度:', status.queueLength)
console.log('处理状态:', status.isProcessingQueue)

// 定期健康检查
setInterval(async () => {
  const health = await getConnectionHealth()
  if (health.utilizationPercentage > 80) {
    console.warn('连接池利用率过高:', health.utilizationPercentage)
  }
}, 60000)
```

## 🔄 定时任务（可选）

在 Supabase 控制台启用 `pg_cron` 扩展后：

```sql
-- 每5分钟检查连接池健康状态
SELECT cron.schedule(
  'connection-health-check', 
  '*/5 * * * *', 
  'SELECT monitor_connections();'
);

-- 每15分钟清理僵尸连接
SELECT cron.schedule(
  'zombie-cleanup', 
  '*/15 * * * *', 
  'SELECT terminate_idle_connections(15, 10);'
);

-- 每小时记录连接池状态
SELECT cron.schedule(
  'connection-logging', 
  '0 * * * *', 
  'INSERT INTO connection_logs (event_type, details) 
   SELECT ''HOURLY_REPORT'', connection_pool_health_check();'
);
```

## 📊 性能优化建议

1. **查询优化**：使用适当的查询类型和优先级
2. **连接复用**：避免创建过多的 PrismaClient 实例
3. **批量处理**：使用 `executeBatchQueries` 处理大量查询
4. **缓存策略**：对频繁查询实施缓存
5. **监控告警**：设置连接池利用率告警

## 🔍 故障排查

### 常见问题

1. **Edge Function 部署失败**
   - 检查 Supabase CLI 版本
   - 确认项目权限
   - 验证环境变量

2. **连接清理无效**
   - 确认 Pro 计划权限
   - 检查数据库函数权限
   - 验证 `pg_terminate_backend` 权限

3. **查询超时**
   - 增加超时时间
   - 检查查询复杂度
   - 优化数据库索引

4. **连接泄漏**
   - 检查应用代码中的连接使用
   - 确认事务正确提交/回滚
   - 监控长时间运行的查询

### 调试模式

```typescript
// 启用详细日志
process.env.NODE_ENV = 'development'

// 监控所有查询
const result = await withConnectionMonitoring(
  () => executeQuery(queryFn),
  'debug_query'
)
```

## 🚀 Edge Function 部署代码

创建 `supabase/functions/connection-monitor/index.ts` 文件，内容如下：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ConnectionMetrics {
  total_conn: number
  active_conn: number
  idle_conn: number
  zombie_conn: number
  long_idle_conn: number
  utilization_pct: number
  max_conn: number
  status: string
}

interface CleanupResult {
  terminated_count: number
  remaining_zombies: number
  details: any
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'monitor'

    console.log(`🔍 Connection Monitor Action: ${action}`)

    switch (action) {
      case 'monitor':
        return await handleMonitor(supabase)
      case 'cleanup':
        return await handleCleanup(supabase, url.searchParams)
      case 'emergency':
        return await handleEmergency(supabase)
      case 'health':
        return await handleHealthCheck(supabase)
      case 'auto':
        return await handleAutoManagement(supabase)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: monitor, cleanup, emergency, health, auto' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('❌ Connection Monitor Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleMonitor(supabase: any) {
  const { data, error } = await supabase.rpc('monitor_connections')
  if (error) throw error

  const metrics = data[0] as ConnectionMetrics
  return new Response(
    JSON.stringify({
      success: true,
      action: 'monitor',
      metrics,
      timestamp: new Date().toISOString(),
      recommendations: getRecommendations(metrics)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCleanup(supabase: any, params: URLSearchParams) {
  const idleThreshold = parseInt(params.get('idle_threshold') || '15')
  const maxTerminations = parseInt(params.get('max_terminations') || '10')

  const { data, error } = await supabase.rpc('terminate_idle_connections', {
    idle_threshold_minutes: idleThreshold,
    max_terminations: maxTerminations
  })

  if (error) throw error

  return new Response(
    JSON.stringify({
      success: true,
      action: 'cleanup',
      result: data[0],
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleEmergency(supabase: any) {
  const { data, error } = await supabase.rpc('emergency_connection_reset')
  if (error) throw error

  return new Response(
    JSON.stringify({
      success: true,
      action: 'emergency',
      results: data,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleHealthCheck(supabase: any) {
  const { data, error } = await supabase.rpc('connection_pool_health_check')
  if (error) throw error

  return new Response(
    JSON.stringify({
      success: true,
      action: 'health',
      health: data,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAutoManagement(supabase: any) {
  const { data: healthData, error: healthError } = await supabase.rpc('connection_pool_health_check')
  if (healthError) throw healthError

  const health = healthData as any
  const status = health.status
  const utilization = health.metrics?.utilization_percentage || 0
  const zombies = health.metrics?.zombie_connections || 0

  const actions = []

  if (status === 'CRITICAL' || utilization > 90) {
    const { data: emergencyData, error: emergencyError } = await supabase.rpc('emergency_connection_reset')
    if (!emergencyError) {
      actions.push({
        action: 'emergency_reset',
        reason: 'Critical utilization > 90%',
        results: emergencyData
      })
    }
  } else if (status === 'CLEANUP_NEEDED' || zombies > 10) {
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('terminate_idle_connections', {
      idle_threshold_minutes: 10,
      max_terminations: 15
    })
    if (!cleanupError) {
      actions.push({
        action: 'zombie_cleanup',
        reason: `${zombies} zombie connections detected`,
        results: cleanupData[0]
      })
    }
  } else if (status === 'WARNING' || utilization > 80) {
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('terminate_idle_connections', {
      idle_threshold_minutes: 15,
      max_terminations: 5
    })
    if (!cleanupError) {
      actions.push({
        action: 'gentle_cleanup',
        reason: `Warning utilization ${utilization}%`,
        results: cleanupData[0]
      })
    }
  } else {
    actions.push({
      action: 'no_action',
      reason: 'System healthy',
      results: null
    })
  }

  const { data: finalHealthData } = await supabase.rpc('connection_pool_health_check')

  return new Response(
    JSON.stringify({
      success: true,
      action: 'auto_management',
      initial_status: status,
      initial_utilization: utilization,
      actions_taken: actions,
      final_health: finalHealthData,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function getRecommendations(metrics: ConnectionMetrics): string[] {
  const recommendations = []

  if (metrics.utilization_pct > 90) {
    recommendations.push('CRITICAL: Execute emergency cleanup immediately')
    recommendations.push('Check for connection leaks in application code')
    recommendations.push('Consider scaling database resources')
  } else if (metrics.utilization_pct > 80) {
    recommendations.push('WARNING: High connection utilization detected')
    recommendations.push('Monitor closely and prepare for cleanup')
  }

  if (metrics.zombie_conn > 10) {
    recommendations.push(`${metrics.zombie_conn} zombie connections detected - cleanup recommended`)
  }

  if (metrics.long_idle_conn > 5) {
    recommendations.push(`${metrics.long_idle_conn} long-idle connections - consider timeout adjustment`)
  }

  if (recommendations.length === 0) {
    recommendations.push('Connection pool is healthy')
  }

  return recommendations
}

console.log('🚀 GistFans Connection Monitor Edge Function started')
```

## 📞 支持

如有问题，请检查：
1. Supabase Pro 计划是否激活
2. 数据库函数是否正确部署
3. Edge Function 是否正常运行
4. 环境变量是否正确配置
