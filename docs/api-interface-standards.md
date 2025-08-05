# GistFans API接口统一标准
**创建时间**: 2025-01-08  
**版本**: v1.0  
**维护者**: GistFans开发团队  

## 🎯 接口设计原则

### 核心原则
1. **一致性优先**: 所有API接口遵循统一的响应格式和命名规范
2. **类型安全**: 使用TypeScript确保接口类型的严格定义
3. **向后兼容**: 新版本接口保持对旧版本的兼容性
4. **错误友好**: 提供清晰的错误信息和状态码

## 📋 统一响应格式

### 标准响应结构
```typescript
interface ApiResponse<T = any> {
  success: boolean          // 操作是否成功
  data?: T                 // 成功时返回的数据
  error?: string           // 错误信息
  message?: string         // 附加说明信息
  timestamp?: string       // 响应时间戳
  requestId?: string       // 请求追踪ID
}

// 分页响应格式
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number           // 当前页码
    limit: number          // 每页数量
    total: number          // 总记录数
    totalPages: number     // 总页数
    hasNext: boolean       // 是否有下一页
    hasPrev: boolean       // 是否有上一页
  }
}
```

### HTTP状态码规范
- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 资源冲突
- `429` - 请求过于频繁
- `500` - 服务器内部错误

## 🔧 核心接口定义

### 用户相关接口

#### 用户统计数据 (标准格式)
```typescript
// GET /api/user/stats-optimized
interface UserStatsResponse {
  stats: {
    stars: {
      balance: {
        totalStars: number      // 用户拥有的Star总数
        availableStars: number  // 可用Star数量
        usedStars: number       // 已使用Star数量
        dailyEarned: number     // 今日获得Star数量
      }
      received: {
        total: number           // 收到的Star投票总数
        thisMonth: number       // 本月收到的Star数量
        thisWeek: number        // 本周收到的Star数量
      }
      given: {
        total: number           // 投出的Star总数
        thisMonth: number       // 本月投出的Star数量
        thisWeek: number        // 本周投出的Star数量
      }
    }
    posts: {
      total: number             // 帖子总数
      published: number         // 已发布帖子数
      draft: number             // 草稿数量
      thisMonth: number         // 本月发布数量
    }
    social: {
      followers: number         // 关注者数量
      following: number         // 关注数量
      interactions: number      // 互动总数
    }
    activity: {
      lastActive: string        // 最后活跃时间
      loginStreak: number       // 连续登录天数
      totalSessions: number     // 总会话数
    }
  }
}
```

#### 用户资料接口
```typescript
// GET /api/user/profile/[id]
interface UserProfileResponse {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    bio: string | null
    githubUrl: string | null
    createdAt: string
    updatedAt: string
    role: 'USER' | 'ADMIN' | 'MODERATOR'
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  }
  stats: UserStatsResponse['stats']  // 复用统计数据结构
}
```

### Star系统接口

#### Star余额查询
```typescript
// GET /api/stars/balance
interface StarBalanceResponse {
  balance: {
    totalStars: number
    availableStars: number
    usedStars: number
    dailyEarned: number
    dailyLimit: number
    nextRefreshAt: string
  }
  history: {
    recent: StarTransaction[]
    summary: {
      earnedThisWeek: number
      spentThisWeek: number
      earnedThisMonth: number
      spentThisMonth: number
    }
  }
}

interface StarTransaction {
  id: string
  type: 'EARNED' | 'SPENT' | 'GRANTED'
  amount: number
  reason: string
  relatedPostId?: string
  createdAt: string
}
```

#### Star投票接口
```typescript
// POST /api/stars/vote
interface StarVoteRequest {
  postId: string
  amount: number  // 投票Star数量 (1-5)
}

interface StarVoteResponse {
  vote: {
    id: string
    postId: string
    amount: number
    createdAt: string
  }
  updatedBalance: {
    availableStars: number
    usedStars: number
  }
  postStats: {
    totalStars: number
    voteCount: number
  }
}
```

### 帖子相关接口

#### 帖子列表
```typescript
// GET /api/posts
interface PostListResponse extends PaginatedResponse<PostSummary> {}

interface PostSummary {
  id: string
  title: string
  excerpt: string
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    image: string | null
  }
  stats: {
    starCount: number
    commentCount: number
    viewCount: number
    likeCount: number
  }
  tags: string[]
}
```

#### 帖子详情
```typescript
// GET /api/posts/[id]
interface PostDetailResponse {
  post: {
    id: string
    title: string
    content: string
    excerpt: string
    status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
    createdAt: string
    updatedAt: string
    author: {
      id: string
      name: string | null
      image: string | null
      bio: string | null
    }
    stats: {
      starCount: number
      commentCount: number
      viewCount: number
      likeCount: number
    }
    tags: string[]
    metadata: {
      readingTime: number  // 预估阅读时间(分钟)
      wordCount: number    // 字数统计
    }
  }
  userInteraction?: {
    hasStarred: boolean
    starAmount: number
    hasLiked: boolean
    hasBookmarked: boolean
  }
}
```

## 🔍 调试和监控接口

### 系统健康检查
```typescript
// GET /api/health
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: {
      status: 'up' | 'down'
      responseTime: number
      connectionCount: number
    }
    cache: {
      status: 'up' | 'down'
      hitRate: number
      memoryUsage: number
    }
    auth: {
      status: 'up' | 'down'
      activeSessions: number
    }
  }
  performance: {
    uptime: number
    memoryUsage: {
      used: number
      total: number
      percentage: number
    }
    cpuUsage: number
  }
}
```

### 连接池监控
```typescript
// GET /api/admin/connection-pool-monitor
interface ConnectionPoolStatus {
  pool: {
    total: number
    active: number
    idle: number
    waiting: number
    maxConnections: number
  }
  performance: {
    averageResponseTime: number
    queryCount: number
    errorRate: number
    cacheHitRate: number
  }
  health: {
    status: 'healthy' | 'warning' | 'critical'
    lastCheck: string
    issues: string[]
    recommendations: string[]
  }
}
```

## 🚨 错误处理标准

### 错误响应格式
```typescript
interface ErrorResponse {
  success: false
  error: string           // 用户友好的错误信息
  code?: string          // 错误代码
  details?: any          // 详细错误信息(开发环境)
  timestamp: string
  requestId: string
}

// 常见错误代码
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

### 验证错误格式
```typescript
interface ValidationErrorResponse extends ErrorResponse {
  code: 'VALIDATION_ERROR'
  validationErrors: {
    field: string
    message: string
    value?: any
  }[]
}
```

## 📝 接口版本管理

### 版本控制策略
- **URL版本控制**: `/api/v1/posts`, `/api/v2/posts`
- **向后兼容**: 保持至少2个版本的兼容性
- **废弃通知**: 在响应头中添加废弃警告

### 版本响应头
```
API-Version: v1
Deprecated: false
Sunset: 2025-12-31  // 废弃日期
```

## 🔧 实现建议

### TypeScript类型导出
```typescript
// src/types/api.ts
export * from './user-types'
export * from './post-types'
export * from './star-types'
export * from './common-types'
```

### API客户端封装
```typescript
// src/lib/apiClient.ts
class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>>
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
  async delete<T>(endpoint: string): Promise<ApiResponse<T>>
}
```

---

**重要**: 所有新接口都必须遵循此标准，现有接口的修改需要保持向后兼容性。如有疑问，请参考现有的`/api/user/stats-optimized`接口实现。
